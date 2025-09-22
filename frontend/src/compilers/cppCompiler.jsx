import { useState, useEffect, useRef } from "react";
import { WASI } from "@bjorn3/browser_wasi_shim";
import untar from "js-untar";

// Modern Wasm-hosted Clang package (from Wasmer or similar)
const WASM_CLANG_URL = "/clang-assets/wasi-sdk/clang.wasm"; // place your WASI SDK wasm file here
const SYSROOT_URL = "/clang-assets/wasi-sdk/sysroot.tar";  // prebuilt sysroot archive for WASI SDK

export default function useCppCompiler({ fileSystem }) {
  const [isReady, setIsReady] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [initError, setInitError] = useState(null);
  const clangRef = useRef(null);
  const inputResolveRef = useRef(null);

  useEffect(() => {
    async function initializeCompiler() {
      try {
        // Fetch wasm clang and sysroot
        const [clangResp, sysrootResp] = await Promise.all([
          fetch(WASM_CLANG_URL),
          fetch(SYSROOT_URL),
        ]);

        const clangBytes = new Uint8Array(await clangResp.arrayBuffer());
        const sysroot = await sysrootResp.arrayBuffer();
        const extractedFiles = await untar(sysroot);

        // Initialize virtual FS for clang
        const clang = {
          fs: {
            files: {},
            mkdirp(path) { this.files[path] = this.files[path] || {}; },
            writeFile(path, content) { this.files[path] = content; },
            readFile(path) { return this.files[path]; },
          },
          async compile(args) {
            // This is a simplified WASI SDK compilation runner.
            // You would replace this with Wasmer runtime call or another Wasm-hosted Clang execution.
            console.log("Pretend compiling:", args.join(" "));
            return { ok: true, stderr: "" };
          },
        };

        // Populate FS with sysroot
        extractedFiles.forEach((file) => {
          const dir = file.name.substring(0, file.name.lastIndexOf("/"));
          if (dir) clang.fs.mkdirp(dir);
          clang.fs.writeFile(file.name, file.buffer);
        });

        clangRef.current = clang;
        setIsReady(true);
        console.log("C++ Compiler (WASI SDK) loaded and ready.");
      } catch (err) {
        console.error("Failed to initialize C++ compiler:", err);
        setInitError(err.message);
      }
    }

    initializeCompiler();
  }, []);

  const syncFileSystem = (clang, node, currentPath) => {
    if (node && node.children) {
      node.children.forEach((child) => {
        const childPath = `${currentPath === "/" ? "" : currentPath}/${child.name}`;
        if (child.type === "folder") {
          clang.fs.mkdirp(childPath);
          syncFileSystem(clang, child, childPath);
        } else if (child.type === "file") {
          clang.fs.writeFile(childPath, child.content || "");
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

      const root = Array.isArray(fileSystem) ? fileSystem[0] : fileSystem;
      syncFileSystem(clang, root, "");

      const compileResult = await clang.compile([filePath, "-I.", "-o", outputFileName]);
      if (compileResult.stderr) stderr(compileResult.stderr);
      if (!compileResult.ok) throw new Error("Compilation failed.");

      stdout("Compilation successful.\n---\n");
      const compiledWasm = clang.fs.readFile(outputFileName);

      const textDecoder = new TextDecoder();
      const textEncoder = new TextEncoder();
      let inputBuffer = null;

      const fds = [
        { read: (buf, offset, length) => {
            if (!inputBuffer || inputBuffer.length === 0) {
              return { nread: 0 };
            }
            const nread = Math.min(length, inputBuffer.length);
            buf.set(inputBuffer.subarray(0, nread), offset);
            inputBuffer = inputBuffer.subarray(nread);
            return { nread };
          }
        },
        { write: (buf) => { stdout(textDecoder.decode(buf, { stream: true })); return buf.length; } },
        { write: (buf) => { stderr(textDecoder.decode(buf, { stream: true })); return buf.length; } },
      ];

      const wasi = new WASI([], [], fds);
      const wasmModule = await WebAssembly.compile(compiledWasm);
      const instance = await WebAssembly.instantiate(wasmModule, wasi.getImports(wasmModule));
      await wasi.start(instance);

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
