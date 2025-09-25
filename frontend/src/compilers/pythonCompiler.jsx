/* eslint-disable no-unused-vars */

import { useState, useEffect, useRef } from "react";
import { loadPyodide } from "pyodide";

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

export default function usePyodide({ fileSystem, onPackageInstall }) {
  const pyodideRef = useRef(null);
  const [isPyodideReady, setIsPyodideReady] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const inputResolveRef = useRef(null);

  useEffect(() => {
    async function initializePyodide() {
      try {
        const pyodide = await loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.28.2/full/",
        });
        pyodideRef.current = pyodide;
        setIsPyodideReady(true);
      } catch (error) {
        console.error("Failed to load Pyodide:", error);
      }
    }
    initializePyodide();
  }, []);

  const syncFileSystem = (pyodide, node, currentPath) => {
    if (node && node.children) {
      node.children.forEach((child) => {
        const childPath = `${currentPath === "/" ? "" : currentPath}/${
          child.name
        }`;
        if (child.type === "folder") {
          try {
            pyodide.FS.mkdir(childPath);
            syncFileSystem(pyodide, child, childPath);
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

  //'pip install' logic
  const installPackage = async (packageName, { stdout, stderr, onExit }) => {
    if (!isPyodideReady) {
      return;
    }
    if (isInstalling || isExecuting) {
      return;
    }

    setIsInstalling(true);
    const pyodide = pyodideRef.current;

    try {
      await pyodide.loadPackage(packageName, {
        messageCallback: (msg) => stdout(msg + "\n"),
      });
      stdout(`\nSuccessfully installed ${packageName}.\n`);
      if (onPackageInstall) {
        onPackageInstall(packageName);
      }
    } catch (err) {
      stderr(`\nFailed to install package ${packageName}: ${err}\n`);
    } finally {
      setIsInstalling(false);
      onExit();
    }
  };

  //execution logic
  const runPython = async (filePath, { stdout, stderr, onExit }) => {
    if (!isPyodideReady) {
      return;
    }
    if (isExecuting || isInstalling) {
      return;
    }

    setIsExecuting(true);
    const pyodide = pyodideRef.current;
    const root = Array.isArray(fileSystem) ? fileSystem[0] : fileSystem;

    try {
      const fileNode = findNodeByPath(root, filePath);
      if (!fileNode || fileNode.type !== "file") {
        stderr(
          `python: can't open file '${filePath}': No such file or directory\n`
        );
        return;
      }

      pyodide.FS.mkdir("/working_dir");
      pyodide.FS.mount(
        pyodide.FS.filesystems.MEMFS,
        { root: "/" },
        "/working_dir"
      );
      pyodide.FS.chdir("/working_dir");
      syncFileSystem(pyodide, root, "");

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
          result = await js_input(prompt)
          return result.strip()
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
      } catch (e) {
        /* Ignore cleanup errors */
      }
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

  return {
    runPython,
    installPackage,
    sendInput,
    isExecuting,
    isInstalling,
    isPyodideReady,
  };
}
