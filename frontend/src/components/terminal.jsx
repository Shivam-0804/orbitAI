import { Resizable } from "re-resizable";
import { useState, useEffect, useRef, useCallback } from "react";
import { X, Plus, Trash2, RotateCcw } from "lucide-react";
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
import { resetTerminalState } from "../utils/terminal_helper/resetTerminal";
import usePyodide from "../compilers/pythonCompiler";
import useServerCompiler from "../compilers/serverCompiler";
import useCppCompiler from "../compilers/cppCompiler";

export default function TerminalWindow({
  fileSystem,
  setFileSystem,
  showTerminal,
  setShowTerminal,
  resetTerminalRef,
}) {
  const [isResizing, setIsResizing] = useState(false);
  const xtermInstances = useRef({});
  const terminalContainerRef = useRef(null);
  const nextId = useRef(2);
  const [activeView, setActiveView] = useState("TERMINAL");
  const [terminals, setTerminals] = useState([
    { id: 1, name: "orbit 1", cwd: "/" },
  ]);
  const [activeTerminalId, setActiveTerminalId] = useState(1);
  const activeTerminalIdRef = useRef(activeTerminalId);
  const inputBuffers = useRef({});
  const commandBuffers = useRef({});

  useEffect(() => {
    activeTerminalIdRef.current = activeTerminalId;
  }, [activeTerminalId]);

  const handleResetTerminal = useCallback(() => {
    resetTerminalState({
      setTerminals,
      setActiveTerminalId,
      setActiveView,
      setInstalledPackages,
      xtermInstancesRef: xtermInstances,
      inputBuffersRef: inputBuffers,
      commandBuffersRef: commandBuffers,
      nextIdRef: nextId,
    });
  }, []);

  useEffect(() => {
    if (resetTerminalRef) {
      resetTerminalRef.current = { reset: handleResetTerminal };
    }
  }, [resetTerminalRef, handleResetTerminal]);

  const [installedPackages, setInstalledPackages] = useState(new Set());
  const pyodide = usePyodide({
    fileSystem,
    onPackageInstall: (packageName) =>
      setInstalledPackages((prev) => new Set(prev).add(packageName)),
  });
  const cppCompiler = useCppCompiler({ fileSystem });
  const activeTerminalCwd =
    terminals.find((t) => t.id === activeTerminalId)?.cwd || "/";
  const {
    runFile: runWSFile,
    sendInput: sendWSInput,
    isExecuting: isWSExecuting,
    killWS,
  } = useServerCompiler(
    fileSystem,
    activeTerminalCwd,
    (data) => {
      const term = xtermInstances.current[activeTerminalIdRef.current]?.term;
      if (term) safeWrite(term, data);
    },
    () => printPrompt(activeTerminalIdRef.current),
    Array.from(installedPackages)
  );

  const isAnyExecuting = useCallback(() => {
    return (
      isWSExecuting ||
      pyodide.isExecuting ||
      pyodide.isInstalling ||
      cppCompiler.isExecuting
    );
  }, [
    isWSExecuting,
    pyodide.isExecuting,
    pyodide.isInstalling,
    cppCompiler.isExecuting,
  ]);

  const safeWrite = (term, data) => {
    if (term && !term.isDisposed) term.write(data);
  };
  const safeWriteln = (term, data = "") => {
    if (term && !term.isDisposed) term.writeln(data);
  };

  const colorText = (text, color) => {
    const colors = {
      red: "\x1b[31m",
      green: "\x1b[32m",
      yellow: "\x1b[33m",
      blue: "\x1b[34m",
      magenta: "\x1b[35m",
      cyan: "\x1b[36m",
      white: "\x1b[37m",
      reset: "\x1b[0m",
    };
    return `${colors[color] || ""}${text}${colors.reset}`;
  };

  const printPrompt = useCallback(
    (terminalId) => {
      const termState = terminals.find((t) => t.id === terminalId);
      const termInstance = xtermInstances.current[terminalId]?.term;
      if (!termState || !termInstance || termInstance.isDisposed) return;
      commandBuffers.current[terminalId] = "";
      inputBuffers.current[terminalId] = "";
      const user = colorText("orbit", "green");
      const sep = colorText(` ${termState.cwd}`, "magenta");
      const dollar = colorText(" $ ", "white");
      safeWrite(termInstance, `\r\n${user}${sep}${dollar}`);
    },
    [terminals]
  );

  const handleNewTerminal = () => {
    const newIdVal = nextId.current++;
    const newTerminal = { id: newIdVal, name: `orbit ${newIdVal}`, cwd: "/" };
    setTerminals((prev) => [...prev, newTerminal]);
    setActiveTerminalId(newIdVal);
  };

  const handleKillTerminal = (idToKill) => {
    if (terminals.length <= 1) return;
    const instance = xtermInstances.current[idToKill];
    if (instance) {
      instance.term.dispose();
      instance.container.remove();
      delete xtermInstances.current[idToKill];
    }
    delete commandBuffers.current[idToKill];
    delete inputBuffers.current[idToKill];
    const newTerminals = terminals.filter((t) => t.id !== idToKill);
    setTerminals(newTerminals);
    if (activeTerminalId === idToKill)
      setActiveTerminalId(newTerminals[0]?.id || null);
  };

  useEffect(() => {
    const container = terminalContainerRef.current;
    if (!container) return;
    const resizeObserver = new ResizeObserver(() => {
      const activeId = activeTerminalIdRef.current;
      const activeInstance = xtermInstances.current[activeId];
      if (activeInstance?.fitAddon)
        try {
          activeInstance.fitAddon.fit();
        } catch (e) {
          console.error(e);
        }
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    terminals.forEach(({ id }) => {
      if (!xtermInstances.current[id] && terminalContainerRef.current) {
        const termContainer = document.createElement("div");
        termContainer.className = styles.terminalInstance;
        terminalContainerRef.current.appendChild(termContainer);
        const term = new Terminal({
          cursorBlink: true,
          fontSize: 14,
          theme: { background: "#181818", foreground: "#ffffff" },
          scrollback: 1000,
          convertEol: true,
        });
        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(termContainer);
        xtermInstances.current[id] = {
          term,
          fitAddon,
          container: termContainer,
        };
        if (id === 1 && term.buffer.active.length === 0)
          safeWriteln(term, "Welcome to the Orbit terminal!");
        printPrompt(id);
        setTimeout(() => fitAddon.fit(), 10);
      }
    });
    Object.entries(xtermInstances.current).forEach(([id, instance]) => {
      if (instance?.container)
        instance.container.style.display =
          Number(id) === activeTerminalId ? "block" : "none";
    });
    const activeInstance = xtermInstances.current[activeTerminalId];
    if (activeInstance)
      setTimeout(() => {
        if (activeInstance.fitAddon) activeInstance.fitAddon.fit();
      }, 10);
  }, [terminals, activeTerminalId, printPrompt]);

  useEffect(() => {
    if (!activeTerminalId || !xtermInstances.current[activeTerminalId]) return;
    const { term } = xtermInstances.current[activeTerminalId];
    if (term.isDisposed) return;
    const activeTerminalState = terminals.find(
      (t) => t.id === activeTerminalId
    );
    const onKeyDisposable = term.onKey(({ key, domEvent }) => {
      if (domEvent.ctrlKey && domEvent.key === "c") {
        if (isWSExecuting) killWS();
        if (pyodide.isExecuting) pyodide.interruptExecution();
        if (cppCompiler.isExecuting) cppCompiler.killExecution();
        commandBuffers.current[activeTerminalId] = "";
        inputBuffers.current[activeTerminalId] = "";
        safeWriteln(term, "^C");
        printPrompt(activeTerminalId);
        return;
      }
      let currentCommand = commandBuffers.current[activeTerminalId] || "";
      let currentInput = inputBuffers.current[activeTerminalId] || "";
      const handleCommand = (cmd) => {
        const [base, ...args] = cmd.trim().split(" ");
        if (!base) return printPrompt(activeTerminalId);
        safeWriteln(term);
        const printAndReset = () => printPrompt(activeTerminalId);
        const currentCwd = activeTerminalState.cwd;
        const targetPath = (arg) =>
          normalizePath(arg.startsWith("/") ? arg : `${currentCwd}/${arg}`);
        if (["python", "cpp", "run"].includes(base)) {
          if (!args[0]) {
            safeWriteln(term, `Usage: ${base} <filename>`);
            return printAndReset();
          }
          const path = targetPath(args[0]);
          const callbacks = {
            stdout: (data) => safeWrite(term, data),
            stderr: (data) => safeWrite(term, colorText(data, "red")),
            onExit: printAndReset,
          };
          if (base === "python") pyodide.runPython(path, callbacks);
          else if (base === "cpp") cppCompiler.runCpp(path, callbacks);
          else if (base === "run") runWSFile(path, callbacks);
          return;
        }
        if (base === "pip") {
          if (args[0] === "install" && args[1]) {
            pyodide.installPackage(args[1], {
              stdout: (data) => safeWrite(term, data),
              stderr: (data) => safeWrite(term, colorText(data, "red")),
              onExit: printAndReset,
            });
          } else {
            safeWriteln(term, "Usage: pip install <package_name>");
            printAndReset();
          }
          return;
        }
        const localCommands = {
          ls: () =>
            findNodeByPath(fileSystem, currentCwd)
              ?.children?.map((f) =>
                f.type === "folder"
                  ? colorText(f.name, "blue")
                  : colorText(f.name, "cyan")
              )
              .join("  ") || "",
          pwd: () => colorText(currentCwd, "blue"),
          cd: () => {
            if (!args[0]) return "";
            const newPath = targetPath(args[0]);
            const folder = findNodeByPath(fileSystem, newPath);
            if (folder && folder.type === "folder") {
              setTerminals((prev) =>
                prev.map((t) =>
                  t.id === activeTerminalId ? { ...t, cwd: newPath } : t
                )
              );
            } else {
              return colorText(`cd: no such directory: ${args[0]}`, "red");
            }
            return "";
          },
          mkdir: () => {
            if (!args[0]) return;
            const newFolder = {
              type: "folder",
              name: args[0],
              path: targetPath(args[0]),
              children: [],
            };
            setFileSystem((fs) => addNodeByPath(fs, currentCwd, newFolder));
          },
          touch: () => {
            if (!args[0]) return;
            const newFile = {
              type: "file",
              name: args[0],
              path: targetPath(args[0]),
              content: "",
            };
            setFileSystem((fs) => addNodeByPath(fs, currentCwd, newFile));
          },
          rm: () => {
            if (args[0])
              setFileSystem((fs) => deleteNodeByPath(fs, targetPath(args[0])));
          },
          cat: () => {
            if (!args[0]) return;
            const file = findNodeByPath(fileSystem, targetPath(args[0]));
            return file?.content ?? colorText("File not found", "red");
          },
          clear: () => term.clear(),
        };
        const output = localCommands[base]?.();
        if (output) safeWriteln(term, output);
        else if (!localCommands[base])
          safeWriteln(term, colorText(`Command not found: ${base}`, "red"));
        printPrompt(activeTerminalId);
      };
      if (isAnyExecuting()) {
        if (domEvent.key === "Enter") {
          safeWriteln(term);
          if (isWSExecuting) sendWSInput(currentInput + "\n");
          else if (pyodide.isExecuting) pyodide.sendInput(currentInput);
          else if (cppCompiler.isExecuting) cppCompiler.sendInput(currentInput);
          inputBuffers.current[activeTerminalId] = "";
        } else if (domEvent.key === "Backspace") {
          if (currentInput.length > 0) {
            inputBuffers.current[activeTerminalId] = currentInput.slice(0, -1);
            term.write("\b \b");
          }
        } else if (!domEvent.ctrlKey && !domEvent.altKey && !domEvent.metaKey) {
          inputBuffers.current[activeTerminalId] = currentInput + key;
          term.write(key);
        }
      } else {
        if (domEvent.key === "Enter") handleCommand(currentCommand);
        else if (domEvent.key === "Backspace") {
          if (currentCommand.length > 0) {
            commandBuffers.current[activeTerminalId] = currentCommand.slice(
              0,
              -1
            );
            term.write("\b \b");
          }
        } else if (!domEvent.ctrlKey && !domEvent.altKey && !domEvent.metaKey) {
          commandBuffers.current[activeTerminalId] = currentCommand + key;
          term.write(key);
        }
      }
    });
    return () => onKeyDisposable.dispose();
  }, [
    activeTerminalId,
    fileSystem,
    terminals,
    cppCompiler,
    isWSExecuting,
    pyodide,
    runWSFile,
    sendWSInput,
    setFileSystem,
    printPrompt,
    isAnyExecuting,
    killWS,
  ]);

  return (
    <Resizable
      defaultSize={{ width: "100%", height: "30%" }}
      minHeight="5%"
      maxHeight="90%"
      enable={{ top: true }}
      onResizeStart={() => setIsResizing(true)}
      onResizeStop={() => setIsResizing(false)}
      style={{
        borderTop: isResizing ? "4px solid #4051b5" : "1px solid #333",
        display: showTerminal ? "flex" : "none",
        flexDirection: "column",
        backgroundColor: "#1a1a1a",
      }}
    >
      <header className={styles.terminalHeader}>
        <div className={styles.headerLeft}>
          {["PROBLEMS", "TERMINAL", "DEBUG"].map((view) => (
            <span
              key={view}
              className={`${styles.viewTab} ${activeView === view ? styles.activeViewTab : ""}`}
              onClick={() => setActiveView(view)}
            >
              {view}
            </span>
          ))}
        </div>
        <div className={styles.headerRight}>
          {activeView === "TERMINAL" && (
            <>
              <Plus
                size={18}
                className={styles.actionIcon}
                onClick={handleNewTerminal}
                title="New Terminal"
              />
              <RotateCcw
                size={16}
                className={styles.actionIcon}
                onClick={handleResetTerminal}
                title="Reset Terminal"
              />
              <Trash2
                size={16}
                className={styles.actionIcon}
                onClick={() => handleKillTerminal(activeTerminalId)}
                title="Kill Terminal"
              />
            </>
          )}
          <X
            size={18}
            className={styles.actionIcon}
            onClick={() => setShowTerminal(false)}
            title="Close Panel"
          />
        </div>
      </header>
      <div
        className={styles.terminalContent}
        style={{ display: activeView === "TERMINAL" ? "flex" : "none" }}
      >
        <div className={styles.terminalTabs}>
          {terminals.map((t) => (
            <div
              key={t.id}
              className={`${styles.terminalTab} ${activeTerminalId === t.id ? styles.activeTerminalTab : ""}`}
              onClick={() => setActiveTerminalId(t.id)}
            >
              <span>{t.name}</span>
              {terminals.length > 1 && (
                <X
                  size={14}
                  className={styles.closeTabIcon}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleKillTerminal(t.id);
                  }}
                />
              )}
            </div>
          ))}
        </div>
        <div ref={terminalContainerRef} className={styles.terminalsContainer} />
      </div>
      {activeView !== "TERMINAL" && (
        <div className={styles.placeholderView}>
          <p>{activeView} view is not implemented yet.</p>
        </div>
      )}
    </Resizable>
  );
}
