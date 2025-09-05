import { Resizable } from "re-resizable";
import { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import styles from "./css/terminal.module.css";

export default function TerminalWindow({ fileSystem, setFileSystem, onClose }) {
  const [isResizing, setIsResizing] = useState(false);
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddon = useRef(new FitAddon());
  const cwdRef = useRef("/");

  // ---------------- Helper Functions ----------------
  const normalizePath = (path) => {
    const parts = path.split("/").filter(Boolean);
    const stack = [];
    for (let part of parts) {
      if (part === "..") stack.pop();
      else if (part !== ".") stack.push(part);
    }
    return "/" + stack.join("/");
  };

  const findNodeByPath = useCallback((nodes, path) => {
    for (let node of nodes) {
      if (node.path === path) return node;
      if (node.type === "folder" && node.children) {
        const found = findNodeByPath(node.children, path);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const addNodeByPath = useCallback((nodes, parentPath, newNode) => {
    return nodes.map((node) => {
      if (node.path === parentPath) {
        return { ...node, children: [...(node.children || []), newNode] };
      }
      if (node.type === "folder" && node.children) {
        return {
          ...node,
          children: addNodeByPath(node.children, parentPath, newNode),
        };
      }
      return node;
    });
  }, []);

  const deleteNodeByPath = useCallback((nodes, path) => {
    return nodes.filter((node) => {
      if (node.path === path) return false;
      if (node.type === "folder" && node.children) {
        node.children = deleteNodeByPath(node.children, path);
      }
      return true;
    });
  }, []);

  const listFiles = useCallback(
    (path) => {
      const folder = findNodeByPath(fileSystem, path);
      if (!folder || folder.type !== "folder") return [];
      return folder.children.map((f) => f.name);
    },
    [fileSystem, findNodeByPath]
  );

  const changeDirectory = useCallback(
    (path) => {
      const folder = findNodeByPath(fileSystem, path);
      if (folder && folder.type === "folder") cwdRef.current = path;
    },
    [fileSystem, findNodeByPath]
  );

  const printPrompt = useCallback(() => {
    xtermRef.current.write(`\r\n${cwdRef.current} $ `);
  }, []);

  // ---------------- Command Handling ----------------
  useEffect(() => {
    xtermRef.current = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      theme: { background: "#181818", foreground: "#ffffff" },
      scrollback: 1000,
    });
    xtermRef.current.loadAddon(fitAddon.current);

    if (terminalRef.current) {
      xtermRef.current.open(terminalRef.current);
      fitAddon.current.fit();
      printPrompt();
    }

    let command = "";

    const handleCommand = (cmd) => {
      const [base, ...args] = cmd.trim().split(" ");
      switch (base) {
        case "ls":
          xtermRef.current.writeln(listFiles(cwdRef.current).join("  "));
          break;
        case "pwd":
          xtermRef.current.writeln(cwdRef.current);
          break;
        case "cd":
          if (args[0]) {
            let targetPath = args[0].startsWith("/")
              ? args[0]
              : cwdRef.current + "/" + args[0];
            targetPath = normalizePath(targetPath);
            changeDirectory(targetPath);
          }
          break;
        case "cat":
          if (args[0]) {
            let filePath = args[0].startsWith("/")
              ? args[0]
              : cwdRef.current + "/" + args[0];
            filePath = normalizePath(filePath);
            const file = findNodeByPath(fileSystem, filePath);
            if (file && file.type === "file")
              xtermRef.current.writeln(file.content);
            else xtermRef.current.writeln("File not found");
          }
          break;
        case "mkdir":
          if (args[0]) {
            const newFolder = {
              type: "folder",
              name: args[0],
              path: normalizePath(cwdRef.current + "/" + args[0]),
              children: [],
            };
            setFileSystem((fs) => addNodeByPath(fs, cwdRef.current, newFolder));
          }
          break;
        case "touch":
          if (args[0]) {
            const newFile = {
              type: "file",
              name: args[0],
              path: normalizePath(cwdRef.current + "/" + args[0]),
              content: "",
            };
            setFileSystem((fs) => addNodeByPath(fs, cwdRef.current, newFile));
          }
          break;
        case "rm":
          if (args[0]) {
            let pathToDelete = args[0].startsWith("/")
              ? args[0]
              : cwdRef.current + "/" + args[0];
            pathToDelete = normalizePath(pathToDelete);
            setFileSystem((fs) => deleteNodeByPath(fs, pathToDelete));
          }
          break;
        case "clear":
          xtermRef.current.clear();
          break;
        default:
          if (cmd.trim() !== "")
            xtermRef.current.writeln(`Command not found: ${cmd}`);
      }
      printPrompt();
    };

    xtermRef.current.onKey(({ key, domEvent }) => {
      if (domEvent.key === "Enter") {
        xtermRef.current.writeln("");
        handleCommand(command.trim());
        command = "";
      } else if (domEvent.key === "Backspace") {
        if (command.length > 0) {
          command = command.slice(0, -1);
          xtermRef.current.write("\b \b");
        }
      } else if (!domEvent.ctrlKey && !domEvent.altKey) {
        command += key;
        xtermRef.current.write(key);
      }
    });

    const handleWindowResize = () => {
      fitAddon.current.fit(); // Only on window resize
    };
    window.addEventListener("resize", handleWindowResize);

    return () => {
      window.removeEventListener("resize", handleWindowResize);
      xtermRef.current.dispose();
    };
  }, [
    fileSystem,
    addNodeByPath,
    deleteNodeByPath,
    listFiles,
    changeDirectory,
    findNodeByPath,
    printPrompt,
    setFileSystem,
  ]);

  return (
    <Resizable
      defaultSize={{ width: "100%", height: "30%" }}
      minHeight="5%"
      maxHeight="90%"
      enable={{ top: true }}
      onResizeStart={() => setIsResizing(true)}
      onResizeStop={() => {
        setIsResizing(false);
        fitAddon.current.fit();
      }}
      style={{
        borderTop: isResizing ? "4px solid #4051b5" : "",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#1a1a1a",
      }}
    >
      {/* Terminal Header */}
      <div className={styles["terminal-header"]}>
        <span className={styles["terminal-header-options"]}>Terminal</span>
        <div
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "#fff",
          }}
        >
          <X size={16} />
        </div>
      </div>

      {/* Terminal Container */}
      <div
        ref={terminalRef}
        className={styles["terminal-container"]}
        style={{
          flex: 1,
          overflow: "hidden",
        }}
      ></div>
    </Resizable>
  );
}
