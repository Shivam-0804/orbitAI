import { Resizable } from "re-resizable";
import { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import styles from "./css/terminal.module.css";
import {
  normalizePath,
  addNodeByPath,
  deleteNodeByPath,
  findNodeByPath,
} from "../utils/terminal_helper/curd";


import usePyodide from "../compilers/pythonCompiler";
import useServerCompiler from "../compilers/serverCompiler";

export default function TerminalWindow({ fileSystem, setFileSystem, onClose }) {
  const [isResizing, setIsResizing] = useState(false);
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const fitAddonRef = useRef(new FitAddon());
  const cwdRef = useRef("/");

  const inputBuffer = useRef("");
  const commandRef = useRef("");

  const [installedPackages, setInstalledPackages] = useState(new Set());
  const pyodide = usePyodide({
    fileSystem,
    onPackageInstall: (packageName) => {
      setInstalledPackages(prev => new Set(prev).add(packageName));
    }
  });

  const {
    runFile: runWSFile,
    sendInput: sendWSInput,
    isExecuting: isWSExecuting,
  } = useServerCompiler(
    fileSystem,
    cwdRef.current,
    (data) => xtermRef.current?.write(`${data}`),
    () => printPrompt(),
    Array.from(installedPackages)
  );

  const isAnyExecuting = () =>
    isWSExecuting || pyodide.isExecuting || pyodide.isInstalling;

  const colorText = (text, color) => {
    const colors = {
      red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m",
      blue: "\x1b[34m", magenta: "\x1b[35m", cyan: "\x1b[36m",
      white: "\x1b[37m", reset: "\x1b[0m",
    };
    return `${colors[color] || ""}${text}${colors.reset}`;
  };

  const printPrompt = useCallback(() => {
    commandRef.current = "";
    if (xtermRef.current) {
      const user = colorText("orbit", "green");
      const sep = colorText(" / ", "magenta");
      const dollar = colorText("$ ", "white");
      xtermRef.current.write(`\r\n${user}${sep}${dollar}`);
    }
  }, []);

  useEffect(() => {
    if (xtermRef.current) return;
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
    term.writeln("Welcome to the Orbit terminal!");
    printPrompt();
  }, [printPrompt]);

  useEffect(() => {
    if (!xtermRef.current) return; 

    const handleCommand = (cmd) => {
      const [base, ...args] = cmd.trim().split(" ");
      if (!base) return printPrompt();
      xtermRef.current.writeln("");

      if (base === 'pip') {
        if (args[0] === 'install' && args[1]) {
          pyodide.installPackage(args[1], {
            stdout: (data) => xtermRef.current.write(data),
            stderr: (data) => xtermRef.current.write(colorText(data, "red")),
            onExit: printPrompt,
          });
        } else {
            xtermRef.current.writeln("Usage: pip install <package_name>");
            printPrompt();
        }
        return;
      }

      if (base === 'python') {
        if (!args[0]) {
            xtermRef.current.writeln("Usage: python <filename>");
            return printPrompt();
        }
        const targetPath = normalizePath(
          args[0].startsWith("/") ? args[0] : `${cwdRef.current}/${args[0]}`
        );
        pyodide.runPython(targetPath, {
          stdout: (data) => xtermRef.current.write(data),
          stderr: (data) => xtermRef.current.write(colorText(data, "red")),
          onExit: printPrompt,
        });
        return;
      }

      if (base === "run") {
        if (!args[0]) {
          xtermRef.current.writeln("Usage: run <filename>");
          return printPrompt();
        }
        const targetPath = normalizePath(
          args[0].startsWith("/") ? args[0] : `${cwdRef.current}/${args[0]}`
        );
        runWSFile(targetPath, {
          stdout: (data) => xtermRef.current.write(data),
          stderr: (data) => xtermRef.current.write(colorText(data, "red")),
          onExit: printPrompt,
        });
        return;
      }

      const localCommands = {
        ls: () => {
          const folder = findNodeByPath(fileSystem, cwdRef.current);
          if (!folder || !folder.children) return "";
          return folder.children.map((f) => f.type === "folder" ? colorText(f.name, "blue") : colorText(f.name, "cyan")).join("  ");
        },
        pwd: () => colorText(cwdRef.current, "blue"),
        cd: () => {
          if (!args[0]) return "";
          const targetPath = normalizePath(args[0].startsWith("/") ? args[0] : `${cwdRef.current}/${args[0]}`);
          const folder = findNodeByPath(fileSystem, targetPath);
          if (folder && folder.type === "folder") {
            cwdRef.current = targetPath;
          } else {
            return colorText(`cd: no such file or directory: ${args[0]}`, "red");
          }
          return "";
        },
        mkdir: () => {
          if (args[0]) {
            const newFolder = { type: "folder", name: args[0], path: normalizePath(`${cwdRef.current}/${args[0]}`), children: [] };
            setFileSystem((fs) => addNodeByPath(fs, cwdRef.current, newFolder));
          }
        },
        touch: () => {
          if (args[0]) {
            const newFile = { type: "file", name: args[0], path: normalizePath(`${cwdRef.current}/${args[0]}`), content: "" };
            setFileSystem((fs) => addNodeByPath(fs, cwdRef.current, newFile));
          }
        },
        rm: () => {
          if (args[0]) {
            const pathToDelete = normalizePath(args[0].startsWith("/") ? args[0] : `${cwdRef.current}/${args[0]}`);
            setFileSystem((fs) => deleteNodeByPath(fs, pathToDelete));
          }
        },
        cat: () => {
          if (args[0]) {
            const filePath = normalizePath(args[0].startsWith("/") ? args[0] : `${cwdRef.current}/${args[0]}`);
            const file = findNodeByPath(fileSystem, filePath);
            return file && file.type === "file" ? file.content : colorText("File not found", "red");
          }
        },
        clear: () => xtermRef.current.clear(),
      };

      if (localCommands[base]) {
        const output = localCommands[base]();
        if (output) xtermRef.current.write(output);
      } else {
        xtermRef.current.write(colorText(`Command not found: ${base}`, "red"));
      }
      printPrompt();
    };

    const onKeyDisposable = xtermRef.current.onKey(({ key, domEvent }) => {
      const term = xtermRef.current;
      if (isAnyExecuting()) {
        if (domEvent.key === "Enter") {
          domEvent.preventDefault();
          domEvent.stopPropagation();
          term.write("\r\n");
          if (isWSExecuting) sendWSInput(inputBuffer.current + "\n");
          else if (pyodide.isExecuting) pyodide.sendInput(inputBuffer.current);
          inputBuffer.current = "";
        } else if (domEvent.key === "Backspace") {
          if (inputBuffer.current.length > 0) {
            inputBuffer.current = inputBuffer.current.slice(0, -1);
            term.write("\b \b");
          }
        } else if (!domEvent.ctrlKey && !domEvent.altKey && !domEvent.metaKey) {
          inputBuffer.current += key;
          term.write(key);
        }
      } else {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileSystem, setFileSystem, printPrompt, pyodide, runWSFile, sendWSInput, isWSExecuting]);

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
          <X size={16} />
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