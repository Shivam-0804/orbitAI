import { useState, useRef } from "react";

const findNodeByPath = (rootNode, path) => {
  if (!rootNode) return null;
  if (path === "/") return rootNode;
  const parts = path.split("/").filter(Boolean);
  let currentNode = rootNode;
  for (const part of parts) {
    if (!currentNode.children) return null;
    const found = currentNode.children.find((child) => child.name === part);
    if (!found) return null;
    currentNode = found;
  }
  return currentNode;
};
export default function usePythonCompiler({ pyodide, isPyodideReady, fileSystem }) {
  const [isExecuting, setIsExecuting] = useState(false);
  const inputResolveRef = useRef(null);

  const syncFileSystem = (node, currentPath) => {
    if (node && node.children) {
      node.children.forEach((child) => {
        const childPath = `${currentPath === "/" ? "" : currentPath}/${child.name}`;
        if (child.type === "folder") {
          try {
            pyodide.FS.mkdir(childPath);
            syncFileSystem(child, childPath);
          } catch (e) {
            if (e.code !== "EEXIST") console.error(e);
          }
        } else if (child.type === "file") {
          pyodide.FS.writeFile(childPath, child.content || "", {
            encoding: "utf8",
          });
        }
      });
    }
  };

  const runFile = async (filePath, { stdout, stderr, onExit }) => {
    if (!isPyodideReady) {
      stderr("Pyodide is not ready. Please wait a moment.\n");
      onExit();
      return;
    }
    if (isExecuting) {
      stderr("Another process is already running.\n");
      onExit();
      return;
    }

    setIsExecuting(true);
    const root = Array.isArray(fileSystem) ? fileSystem[0] : null;

    if (!root) {
      stderr("Error: File system is not available or invalid.\n");
      setIsExecuting(false);
      onExit();
      return;
    }
    
    try {
      const fileNode = findNodeByPath(root, filePath);
      if (!fileNode || fileNode.type !== "file") {
        stderr(`python: can't open file '${filePath}': No such file or directory\n`);
        return;
      }
      
      pyodide.FS.mkdir("/working_dir");
      pyodide.FS.mount(pyodide.FS.filesystems.MEMFS, { root: "/" }, "/working_dir");
      pyodide.FS.chdir("/working_dir");
      syncFileSystem(root, "");

      pyodide.setStdout({ batched: (msg) => stdout(msg + "\n") });
      pyodide.setStderr({ batched: (msg) => stderr(msg + "\n") });
      
      const jsInput = (prompt) => {
        stdout(prompt);
        return new Promise((resolve) => {
          inputResolveRef.current = resolve;
        });
      };
      pyodide.globals.set("js_input", jsInput);
      await pyodide.runPythonAsync(`
        import builtins, asyncio
        async def custom_input(prompt=""):
          return await js_input(prompt)
        builtins.input = lambda prompt="": asyncio.run(custom_input(prompt))
      `);

      await pyodide.runPythonAsync(`
        import sys
        if "/" not in sys.path:
          sys.path.append("/")
      `);

      await pyodide.runPythonAsync(fileNode.content);

    } catch (err) {
      stderr(err.toString() + "\n");
    } finally {
      pyodide.FS.chdir("/"); 
      try {
        pyodide.FS.unmount("/working_dir");
        pyodide.FS.rmdir("/working_dir");
      // eslint-disable-next-line no-unused-vars, no-empty
      } catch(e) {}
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

  return { runFile, sendInput, isExecuting };
}