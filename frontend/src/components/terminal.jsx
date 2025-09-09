import { Resizable } from "re-resizable";
import { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import styles from "./css/terminal.module.css";

const WEBSOCKET_URL = "ws://localhost:3001";

export default function TerminalWindow({ fileSystem, setFileSystem, onClose }) {
  const [isResizing, setIsResizing] = useState(false);
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(new FitAddon());
  const cwdRef = useRef("/");

  const wsRef = useRef(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const commandRef = useRef("");

  // --- Helper Functions (remain unchanged) ---
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

  const printPrompt = useCallback(() => {
    commandRef.current = "";
    if (xtermRef.current) {
      xtermRef.current.write(`\r\n${cwdRef.current} $ `);
    }
  }, []);

  useEffect(() => {
    // Initialize Terminal on first render
    if (!xtermRef.current && terminalRef.current) {
      const term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        theme: { background: "#181818", foreground: "#ffffff" },
        scrollback: 1000,
        convertEol: true,
      });
      term.loadAddon(fitAddonRef.current);
      term.open(terminalRef.current);
      
      xtermRef.current = term; 
      
      fitAddonRef.current.fit();
      printPrompt();
    }

    // Initialize WebSocket connection
    if (!wsRef.current) {
      wsRef.current = new WebSocket(WEBSOCKET_URL);
      wsRef.current.onopen = () => {
        // xtermRef.current?.writeln("Connected to execution server.");
      }
      wsRef.current.onclose = () => {
        // xtermRef.current?.writeln(
        //   "\r\n\x1b[31mDisconnected from execution server.\x1b[0m"
        // );
      }
      wsRef.current.onerror = () =>
        xtermRef.current?.writeln(
          "\r\n\x1b[31mConnection to execution server failed.\x1b[0m"
        );

      wsRef.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        switch (message.type) {
          case "stdout":
            // The 'convertEol' option handles the \n to \r\n conversion.
            xtermRef.current?.write(message.data);
            break;
          case "stderr":
            xtermRef.current?.write(`\x1b[31m${message.data}\x1b[0m`);
            break;
          case "exit":
            setIsExecuting(false);
            printPrompt();
            break;
          default:
            console.warn("Unknown message:", message);
        }
      };
    }

    // --- Command Handling ---
    const handleCommand = (cmd) => {
      const [base, ...args] = cmd.trim().split(" ");
      if (!base) {
        printPrompt();
        return;
      }

      if (base === "run") {
        if (!args[0]) {
          xtermRef.current.writeln("Usage: run <filename>");
          printPrompt();
          return;
        }
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
          xtermRef.current.writeln(
            "\x1b[31mNot connected to execution server.\x1b[0m"
          );
          printPrompt();
          return;
        }
        const targetPath = normalizePath(
          args[0].startsWith("/") ? args[0] : `${cwdRef.current}/${args[0]}`
        );
        setIsExecuting(true);
        xtermRef.current.writeln("");
        wsRef.current.send(
          JSON.stringify({ type: "execute", entryPath: targetPath, fileSystem })
        );
        return;
      }

      // --- Handle all other local commands (ls, cd, etc.) ---
      const localCommands = {
        ls: () => {
          const folder = findNodeByPath(fileSystem, cwdRef.current);
          return folder && folder.children
            ? folder.children.map((f) => f.name).join("  ")
            : "";
        },
        pwd: () => cwdRef.current,
        cd: () => {
          if (!args[0]) return "";
          const targetPath = normalizePath(
            args[0].startsWith("/") ? args[0] : `${cwdRef.current}/${args[0]}`
          );
          const folder = findNodeByPath(fileSystem, targetPath);
          if (folder && folder.type === "folder") {
            cwdRef.current = targetPath;
          } else {
            return `cd: no such file or directory: ${args[0]}`;
          }
          return "";
        },
        mkdir: () => {
          if (args[0]) {
            const newFolder = {
              type: "folder",
              name: args[0],
              path: normalizePath(`${cwdRef.current}/${args[0]}`),
              children: [],
            };
            setFileSystem((fs) => addNodeByPath(fs, cwdRef.current, newFolder));
          }
        },
        touch: () => {
          if (args[0]) {
            const newFile = {
              type: "file",
              name: args[0],
              path: normalizePath(`${cwdRef.current}/${args[0]}`),
              content: "",
            };
            setFileSystem((fs) => addNodeByPath(fs, cwdRef.current, newFile));
          }
        },
        rm: () => {
          if (args[0]) {
            const pathToDelete = normalizePath(
              args[0].startsWith("/") ? args[0] : `${cwdRef.current}/${args[0]}`
            );
            setFileSystem((fs) => deleteNodeByPath(fs, pathToDelete));
          }
        },
        cat: () => {
          if (args[0]) {
            const filePath = normalizePath(
              args[0].startsWith("/") ? args[0] : `${cwdRef.current}/${args[0]}`
            );
            const file = findNodeByPath(fileSystem, filePath);
            return file && file.type === "file"
              ? file.content
              : "File not found";
          }
        },
        clear: () => xtermRef.current.clear(),
      };

      if (localCommands[base]) {
        const output = localCommands[base]();
        if (output) xtermRef.current.writeln(output);
      } else {
        xtermRef.current.writeln(`Command not found: ${base}`);
      }
      printPrompt();
    };

    const onKeyDisposable = xtermRef.current.onKey(({ key, domEvent }) => {
      const term = xtermRef.current;
      if (isExecuting) {
        if (domEvent.key === "Enter") {
          term.write("\r\n");
          wsRef.current?.send(JSON.stringify({ type: "stdin", data: "\n" }));
        } else if (domEvent.key === "Backspace") {
          if (term.buffer.active.cursorX > 0) {
            term.write("\b \b");
          }
        } else if (!domEvent.ctrlKey && !domEvent.altKey && !domEvent.metaKey) {
          term.write(key);
          wsRef.current?.send(JSON.stringify({ type: "stdin", data: key }));
        }
      } else {
        // --- Command mode: Build and handle local commands ---
        if (domEvent.key === "Enter") {
          handleCommand(commandRef.current);
        } else if (domEvent.key === "Backspace") {
          if (commandRef.current.length > 0) {
            commandRef.current = commandRef.current.slice(0, -1);
            term.write("\b \b");
          }
        } else if (!domEvent.ctrlKey && !domEvent.altKey && !domEvent.metaKey) {
          commandRef.current += key;
          term.write(key);
        }
      }
    });

    const handleResize = () => fitAddonRef.current?.fit();
    window.addEventListener("resize", handleResize);

    return () => {
      onKeyDisposable.dispose();
      window.removeEventListener("resize", handleResize);
    };
  }, [
    isExecuting,
    fileSystem,
    setFileSystem,
    printPrompt,
    findNodeByPath,
    addNodeByPath,
    deleteNodeByPath,
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
        fitAddonRef.current.fit();
      }}
      style={{
        borderTop: isResizing ? "4px solid #4051b5" : "1px solid #333",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#1a1a1a",
      }}
    >
      <div className={styles["terminal-header"]}>
        <span className={styles["terminal-header-options"]}>Terminal</span>
        <div onClick={onClose} style={{ cursor: "pointer" }}>
          {" "}
          <X size={16} />{" "}
        </div>
      </div>
      <div
        ref={terminalRef}
        className={styles["terminal-container"]}
        style={{ flex: 1, overflow: "hidden" }}
      ></div>
    </Resizable>
  );
}