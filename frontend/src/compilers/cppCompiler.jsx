import { useState, useEffect, useRef } from "react";
import { WASI } from "@bjorn3/browser_wasi_shim";
import untar from "js-untar";
import ClangWasm from "clang-wasm";

const CLANG_URL = "/clang-assets/clang-wasm@20.1.3-c/dist/clang.wasm";
const LLD_URL = "/clang-assets/clang-wasm@20.1.3-c/dist/lld.wasm";
const SYSROOT_URL = "/clang-assets/clang-wasm@20.1.3-c/dist/sysroot.tar";

export default function useCppCompiler({ fileSystem }) {
  const [isReady, setIsReady] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [initError, setInitError] = useState(null);
  const clangRef = useRef(null);
  const inputResolveRef = useRef(null);

  useEffect(() => {
    async function initializeCompiler() {
      try {
        const [clangResp, lldResp, sysrootResp] = await Promise.all([
          fetch(CLANG_URL),
          fetch(LLD_URL),
          fetch(SYSROOT_URL),
        ]);

        const clangBytes = new Uint8Array(await clangResp.arrayBuffer());
        const lldBytes = new Uint8Array(await lldResp.arrayBuffer());

        // Initialize clang-wasm correctly
        const clang = await ClangWasm({ clangBytes, lldBytes });

        const sysroot = await sysrootResp.arrayBuffer();
        const extractedFiles = await untar(sysroot);

        extractedFiles.forEach((file) => {
          try {
            const dir = file.name.substring(0, file.name.lastIndexOf("/"));
            if (dir) clang.fs.mkdirp(dir);
            clang.fs.writeFile(file.name, file.buffer);
          } catch (e) { /* ignore errors */ }
        });

        clangRef.current = clang;
        setIsReady(true);
        console.log("C++ Compiler (Clang) loaded and ready.");
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
        { // stdin
          read: (buf, offset, length) => {
            if (!inputBuffer || inputBuffer.length === 0) {
              const promise = new Promise(resolve => {
                inputResolveRef.current = (data) => {
                  inputBuffer = textEncoder.encode(data + "\n");
                  resolve();
                };
              });
              return { promise, nread: 0 };
            }
            const nread = Math.min(length, inputBuffer.length);
            buf.set(inputBuffer.subarray(0, nread), offset);
            inputBuffer = inputBuffer.subarray(nread);
            return { nread };
          }
        },
        { write: (buf) => { stdout(textDecoder.decode(buf, { stream: true })); return buf.length; } }, // stdout
        { write: (buf) => { stderr(textDecoder.decode(buf, { stream: true })); return buf.length; } }, // stderr
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
