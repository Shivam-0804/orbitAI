import { useState, useEffect, useRef } from "react";
import { WASI } from "@bjorn3/browser_wasi_shim";
import untar from "js-untar";

/**
 * useCppCompiler - In-browser C++ compilation using a WASI-targeted clang.wasm + sysroot.
 *
 * Requirements (frontend/public):
 * - /clang-assets/wasi-sdk/clang.wasm  (clang built for wasm32-wasi)
 * - /clang-assets/wasi-sdk/sysroot.tar (tar containing headers + libs for wasi)
 *
 * NOTE: The actual clang.wasm must be a WASI program that understands argv and writes
 * files into the WASI filesystem. The WASI shim must support preopens and fd wiring.
 */
const WASM_CLANG_URL = "/clang-assets/wasi-sdk/clang.wasm";
const SYSROOT_URL = "/clang-assets/wasi-sdk/sysroot.tar";

export default function useCppCompiler({ fileSystem }) {
  const [isReady, setIsReady] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [initError, setInitError] = useState(null);
  const clangRef = useRef(null);       // holds compiled clang module / instance wrapper
  const inputResolveRef = useRef(null);

  // A tiny binary-friendly in-memory FS that stores Uint8Array for files
  const makeFs = () => {
    const files = new Map(); // path -> Uint8Array
    return {
      writeFile(path, content) {
        if (typeof content === "string") content = new TextEncoder().encode(content);
        files.set(path, content);
      },
      readFile(path) {
        return files.has(path) ? files.get(path) : null;
      },
      mkdirp(path) {
        // no-op for map-based storage; keep directories implicit
      },
      listFiles() {
        return Array.from(files.keys());
      },
      exists(path) {
        return files.has(path);
      },
      delete(path) {
        files.delete(path);
      },
      // helper: produce a simple file listing for debugging
      dump() {
        const out = {};
        for (const [k, v] of files.entries()) out[k] = v.byteLength;
        return out;
      },
    };
  };

  useEffect(() => {
    async function initializeCompiler() {
      try {
        const [clangResp, sysrootResp] = await Promise.all([
          fetch(WASM_CLANG_URL),
          fetch(SYSROOT_URL),
        ]);
        if (!clangResp.ok) throw new Error(`Failed to fetch clang.wasm: ${clangResp.status}`);
        if (!sysrootResp.ok) throw new Error(`Failed to fetch sysroot.tar: ${sysrootResp.status}`);

        const clangBytes = new Uint8Array(await clangResp.arrayBuffer());
        const sysrootBuffer = await sysrootResp.arrayBuffer();
        const extractedFiles = await untar(sysrootBuffer); // gives entries with .name and .buffer

        // Build a JS-side virtual filesystem and populate with sysroot
        const virtualFs = makeFs();
        extractedFiles.forEach((entry) => {
          // entry.buffer is Uint8Array
          const cleanName = entry.name.startsWith("/") ? entry.name : `/${entry.name}`;
          virtualFs.mkdirp(cleanName.substring(0, cleanName.lastIndexOf("/")));
          virtualFs.writeFile(cleanName, entry.buffer);
        });

        // We'll create a "clang runner" object that can be invoked to run clang with argv.
        // clangRef.current.compile(args) -> runs clang.wasm as a WASI program with args.
        clangRef.current = {
          fs: virtualFs,
          clangBytes,
          // compile: run clang with argv array (like ['clang', 'main.cpp', '-o', 'a.wasm', '--target=wasm32-wasi'])
          async compile(argv = []) {
            // Prepare in-memory stdin/stdout/stderr capture
            const stdoutBuf = [];
            const stderrBuf = [];

            // Setup fds for the WASI runtime. index 0 = stdin, 1 = stdout, 2 = stderr.
            const fds = [
              // stdin (read) - we return nread=0 meaning EOF unless sendInput sets inputResolveRef
              {
                read: (buf, offset, length) => {
                  return { nread: 0 }; // empty stdin by default
                },
              },
              // stdout (write)
              {
                write: (buf) => {
                  stdoutBuf.push(new Uint8Array(buf));
                  return buf.length;
                },
              },
              // stderr (write)
              {
                write: (buf) => {
                  stderrBuf.push(new Uint8Array(buf));
                  return buf.length;
                },
              },
            ];

            // Prepare WASI args and env
            const args = argv;
            const env = {};

            // Prepare preopens - map host path -> WASI path that clang will see.
            // We'll expose the root "/" of WASI to our virtual FS. The shim needs to support this.
            const preopens = { "/": "/" };

            // Instantiate the clang.wasm as a WASI program.
            // NOTE: The WASI shim constructor below is assumed to accept (args, env, fds, { preopens })
            // If your shim's signature differs, adapt accordingly.
            const wasi = new WASI(args, env, fds, { preopens });

            // compile the module (needs the module before getImports)
            const wasmModule = await WebAssembly.compile(clangRef.current.clangBytes);
            const importObject = wasi.getImports(wasmModule);

            // IMPORTANT: We must provide the host-side WASI filesystem functions so clang can interact with files.
            // The @bjorn3 shim typically wires common WASI syscalls via the importObject; we still must
            // ensure the shim can read/write files from our JS virtual FS. If the shim exposes hooks to
            // provide a file-provider (or we must use BrowserFS / a different FS), adapt here.
            //
            // For the simplest case, the shim handles WASI syscalls internally; it will maintain its own WASI FS,
            // BUT we need to push the content of our virtualFs into that WASI FS prior to start.
            // Many shims expose `wasi.initializeFileSystem` or you can emulate by writing files into a
            // memory-backed FS that the wasm module uses. Below we attempt to call `wasi.writeFile` if present.
            if (typeof wasi.writeFile === "function") {
              // copy all files into runtime FS if the shim supports it
              for (const path of virtualFs.listFiles()) {
                const data = virtualFs.readFile(path);
                // wasm-side path should be same as path (e.g. "/usr/include/...")
                await wasi.writeFile(path, data);
              }
            } else {
              // fallback: if shim doesn't provide writeFile, attempt to pass files via a user-exported "host_fs" import
              // This is shim-specific; if your shim requires a different mechanism, implement that bridge here.
              // For now we proceed; many wasm-wasi clang builds look up /usr/include etc from the preopened dir.
            }

            const instance = await WebAssembly.instantiate(wasmModule, importObject);

            // Start the WASI program (clang will run and exit)
            try {
              await wasi.start(instance);
            } catch (e) {
              // clang returns non-zero on compilation errors; we still need to capture stderr
              // store or continue
            }

            // After clang runs, the runtime FS should contain output files like a.wasm, a.o, etc.
            // Try to read the intended output from the shim if it exposes readFile:
            let outBytes = null;
            if (typeof wasi.readFile === "function") {
              try {
                outBytes = await wasi.readFile("/" + (argv[argv.length - 1] || "a.wasm")); // naive
              } catch (e) {
                // ignore
              }
            } else {
              // If the shim doesn't expose readFile, attempt to read from virtualFs map (if clang wrote there).
              // clang executed inside WASI runtime may not write into our JS virtualFs automatically.
              // This is the hardest cross-boundary part; if your runtime can't share FS, prefer a shim
              // that supports writeFile/readFile hooks or use BrowserFS with a WASI adapter.
              const outName = argv[argv.length - 1] || "a.wasm";
              if (virtualFs.exists("/" + outName)) outBytes = virtualFs.readFile("/" + outName);
            }

            // Collate stdout/stderr buffers
            const joinBuf = (arr) => {
              if (arr.length === 0) return "";
              const total = arr.reduce((s, b) => s + b.length, 0);
              const combined = new Uint8Array(total);
              let off = 0;
              for (const b of arr) {
                combined.set(b, off);
                off += b.length;
              }
              return new TextDecoder().decode(combined);
            };

            return {
              ok: !!outBytes,
              stderr: joinBuf(stderrBuf),
              stdout: joinBuf(stdoutBuf),
              output: outBytes,
            };
          },
        };

        setIsReady(true);
        console.log("C++ Compiler (WASI SDK) loaded and ready.");
      } catch (err) {
        console.error("Failed to initialize C++ compiler:", err);
        setInitError(err.message || String(err));
      }
    }

    initializeCompiler();
  }, []);

  // Helper to sync your editor's fileTree into the clangRef.current.fs
  const syncFileSystem = (clang, node, currentPath) => {
    if (!clang) return;
    if (node && node.children) {
      node.children.forEach((child) => {
        const childPath = `${currentPath === "/" ? "" : currentPath}/${child.name}`;
        if (child.type === "folder") {
          clang.fs.mkdirp(childPath);
          syncFileSystem(clang, child, childPath);
        } else if (child.type === "file") {
          // ensure leading slash
          const p = childPath.startsWith("/") ? childPath : `/${childPath}`;
          clang.fs.writeFile(p, child.content || "");
        }
      });
    }
  };

  const runCpp = async (filePath, { stdout, stderr, onExit }) => {
    if (!isReady) { stderr("C++ Compiler is not ready.\n"); onExit(); return; }
    if (isExecuting) { stderr("Another process is already running.\n"); onExit(); return; }

    setIsExecuting(true);
    const clang = clangRef.current;
    const outputFileName = "main.wasm";

    try {
      stdout("Compiling C++ code...\n");

      // Sync project files into compiler FS
      const root = Array.isArray(fileSystem) ? fileSystem[0] : fileSystem;
      syncFileSystem(clang, root, "");

      // Example argv for producing a wasm + link for wasi
      // - target should be wasm32-wasi (clang must be configured to emit wasm modules)
      const args = [
        "clang",                 // argv[0] - program name
        `/${filePath.replace(/^\/*/, "")}`, // input path in WASI FS (ensure leading '/')
        "-O2",
        "-std=c++17",
        "--target=wasm32-wasi",
        "-o",
        `/${outputFileName}`,
      ];

      const compileResult = await clang.compile(args);

      // print any stdout/stderr
      if (compileResult.stdout) stdout(compileResult.stdout + "\n");
      if (compileResult.stderr) stderr(compileResult.stderr + "\n");

      if (!compileResult.ok) {
        stderr("Compilation failed (no output wasm).\n");
        throw new Error("Compilation failed.");
      }

      stdout("Compilation successful.\n---\n");

      // compiled wasm bytes (Uint8Array) in compileResult.output
      const compiledWasm = compileResult.output;
      if (!compiledWasm) throw new Error("No compiled wasm emitted by clang.");

      // Run compiled wasm using WASI runtime
      const textDecoder = new TextDecoder();
      const textEncoder = new TextEncoder();

      let inputBuffer = null;

      const fds = [
        {
          read: (buf, offset, length) => {
            if (!inputBuffer || inputBuffer.length === 0) {
              return { nread: 0 };
            }
            const nread = Math.min(length, inputBuffer.length);
            buf.set(inputBuffer.subarray(0, nread), offset);
            inputBuffer = inputBuffer.subarray(nread);
            return { nread };
          },
        },
        { write: (buf) => { stdout(textDecoder.decode(buf, { stream: true })); return buf.length; } },
        { write: (buf) => { stderr(textDecoder.decode(buf, { stream: true })); return buf.length; } },
      ];

      const wasiRun = new WASI([], {}, fds, { preopens: { "/": "/" } });
      const wasmModuleRun = await WebAssembly.compile(compiledWasm);
      const instanceRun = await WebAssembly.instantiate(wasmModuleRun, wasiRun.getImports(wasmModuleRun));
      await wasiRun.start(instanceRun);

    } catch (err) {
      stderr(`\n--- C++ Execution Error ---\n${err.message}\n`);
    } finally {
      setIsExecuting(false);
      inputResolveRef.current = null;
      onExit();
    }
  };

  const sendInput = (data) => {
    if (inputResolveRef.current) {
      inputResolveRef.current(data);
      inputResolveRef.current = null;
    }
  };

  return { runCpp, sendInput, isExecuting, isReady, initError };
}
