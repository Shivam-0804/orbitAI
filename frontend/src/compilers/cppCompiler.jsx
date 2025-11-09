// compilers/cppCompiler.js
import { useState, useEffect, useRef } from "react";

export default function useCppCompiler({ fileSystem }) {
  const [isReady, setIsReady] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [initError, setInitError] = useState(null);
  const vmRef = useRef(null);

  /**
   * Wait until WebVM global object is available.
   * More robust than previous version which failed early.
   */
  function waitForWebVM() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const timer = setInterval(() => {
        if (window.WebVM && typeof window.WebVM.boot === "function") {
          clearInterval(timer);
          return resolve(window.WebVM);
        }
        if (attempts++ > 300) { // ~15 seconds
          clearInterval(timer);
          return reject(new Error("WebVM failed to load (boot.js missing or blocked)"));
        }
      }, 50);
    });
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const WebVM = await waitForWebVM();

        // Boot a Linux VM
        const vm = await WebVM.boot({
          memory: 1024,
          cpu: 2
        });
        if (!mounted) return;

        vmRef.current = vm;

        // Prepare workspace directory
        await exec(vm, ["mkdir", "-p", "/workspace"]);

        setIsReady(true);
      } catch (err) {
        console.error("WebVM init failed:", err);
        setInitError(err.message || String(err));
      }
    })();
    return () => (mounted = false);
  }, []);

  /**
   * Execute a command inside WebVM
   */
  const exec = (vm, argv, handlers = {}) => {
    const run = vm.exec ?? vm.run;
    return run.call(vm, argv, {
      stdout: (c) => handlers.onStdout?.(decode(c)),
      stderr: (c) => handlers.onStderr?.(decode(c)),
      stdin: handlers.stdin
    });
  };

  const decode = (chunk) =>
    typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk);

  /**
   * Write file to VM using safe here-doc
   */
  async function writeFile(vm, absPath, contents) {
    await exec(vm, [
      "/bin/sh",
      "-lc",
      `cat > '${absPath.replace(/'/g, "'\\''")}' << 'EOF'\n${contents}\nEOF`
    ]);
  }

  /**
   * Recursively sync user project file tree into /workspace
   */
  async function syncToWorkspace(vm, node, base = "/workspace") {
    const target = base + "/" + node.name;
    if (node.type === "folder") {
      await exec(vm, ["mkdir", "-p", target]);
      for (const child of node.children) await syncToWorkspace(vm, child, target);
    } else if (node.type === "file") {
      await writeFile(vm, target, node.content ?? "");
    }
  }

  /**
   * Public API: compile + run
   */
  const runCpp = async (filePath, { stdout, stderr, onExit }) => {
    if (!isReady) {
      stderr?.("⚠️ C++ Compiler is still loading...\nTry again in a few seconds.\n");
      onExit?.();
      return;
    }

    setIsExecuting(true);
    const vm = vmRef.current;

    try {
      stdout("Syncing project into VM...\n");

      if (Array.isArray(fileSystem)) {
        for (const item of fileSystem) await syncToWorkspace(vm, item);
      } else {
        await syncToWorkspace(vm, fileSystem);
      }

      const insidePath = "/workspace/" + filePath.replace(/^\//, "");

      stdout(`Compiling: ${insidePath}\n`);

      await exec(vm, [
        "g++",
        insidePath,
        "-std=c++17",
        "-O2",
        "-o",
        "/workspace/a.out"
      ], {
        onStdout: stdout,
        onStderr: stderr
      });

      stdout("✅ Compilation successful.\n--- Running program ---\n");

      await exec(vm, ["/workspace/a.out"], {
        onStdout: stdout,
        onStderr: stderr
      });

    } catch (err) {
      stderr(`\n❌ Execution Error: ${err.message}\n`);
    } finally {
      setIsExecuting(false);
      onExit?.();
    }
  };

  // Terminal integration compatibility
  const sendInput = () => {}; 
  const killExecution = () => {}; 

  return {
    runCpp,
    sendInput,
    killExecution,
    isExecuting,
    isReady,
    initError
  };
}
