/* eslint-disable no-unused-vars */
/* eslint-disable no-case-declarations */
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

// Git imports
import git from "isomorphic-git";
import LightningFS from "@isomorphic-git/lightning-fs";
import originalHttp from "isomorphic-git/http/web";

const http = {
  ...originalHttp,
  async request(req) {
    req.url = `https://cors.isomorphic-git.org/${req.url}`;
    return originalHttp.request(req);
  },
};

//  Setup LightningFS
const lfs = new LightningFS("orbitGitFS", { wipe: true });
const pfs = lfs.promises;

export default function TerminalWindow({
  fileSystem,
  setFileSystem,
  showTerminal,
  setShowTerminal,
  resetTerminalRef,
  terminalApiRef,
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
  const [installedPackages, setInstalledPackages] = useState(new Set());
  const [credentials, setCredentials] = useState(null);

  const pyodide = usePyodide({
    fileSystem,
    onPackageInstall: (pkg) =>
      setInstalledPackages((prev) => new Set(prev).add(pkg)),
  });
  const cppCompiler = useCppCompiler({ fileSystem });

  const activeTerminalCwd =
    terminals.find((t) => t.id === activeTerminalId)?.cwd || "/";

  const safeWrite = (term, data) => {
    if (term && !term.isDisposed) term.write(data);
  };
  const safeWriteln = (term, data = "") => {
    if (term && !term.isDisposed) term.writeln(data);
  };
  const colorText = (text, color) => {
    const colors = {
      red: "\x1b[91m", green: "\x1b[92m", yellow: "\x1b[93m", blue: "\x1b[94m", magenta: "\x1b[95m", cyan: "\x1b[96m", white: "\x1b[97m", reset: "\x1b[0m",
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

  const onOutputCallback = useCallback((data) => {
    const term = xtermInstances.current[activeTerminalIdRef.current]?.term;
    if (term) safeWrite(term, data);
  }, []);

  const onExecutionEndCallback = useCallback(() => {
    printPrompt(activeTerminalIdRef.current);
  }, [printPrompt]);

  const {
    runFile: runWSFile, sendInput: sendWSInput, isExecuting: isWSExecuting, killWS,
  } = useServerCompiler(
    fileSystem,
    activeTerminalCwd,
    onOutputCallback,
    onExecutionEndCallback,
    Array.from(installedPackages)
  );

  const isAnyExecuting = useCallback(
    () =>
      isWSExecuting || pyodide.isExecuting || pyodide.isInstalling || cppCompiler.isExecuting,
    [isWSExecuting, pyodide.isExecuting, pyodide.isInstalling, cppCompiler.isExecuting]
  );

  const updateFileSystemGitStatus = useCallback(
    async (dir) => {
      const statusMap = {};
      let isRepo = false;
      try {
        await pfs.stat(`${dir}/.git`);
        isRepo = true;
        const matrix = await git.statusMatrix({ fs: lfs, dir });
        for (const [filepath, head, workdir, stage] of matrix) {
          const path = normalizePath(`${dir}/${filepath}`);
          if (head === 0 && workdir === 2 && stage === 2) statusMap[path] = "A";
          else if (head > 0 && workdir === 2 && stage === 2) statusMap[path] = "M";
          else if (head > 0 && workdir === 2 && stage === 1) statusMap[path] = "M";
          else if (head === 0 && workdir === 2 && stage === 0) statusMap[path] = "?";
          else if (head > 0 && workdir === 0) statusMap[path] = "D";
        }
      } catch (e) { /* Not a git repo */ }

      setFileSystem((currentFileSystem) => {
        let needsUpdate = false;
        const checkAndUpdateStatuses = (nodes) => {
          return nodes.map((node) => {
            const newStatus = statusMap[node.path] || (isRepo ? "" : null);
            if (node.status !== newStatus) needsUpdate = true;
            const newNode = { ...node, status: newStatus };
            if (node.children) newNode.children = checkAndUpdateStatuses(node.children);
            return newNode;
          });
        };
        const newFileSystem = checkAndUpdateStatuses(currentFileSystem);
        return needsUpdate ? newFileSystem : currentFileSystem;
      });
    },
    [setFileSystem]
  );

  const handleCommand = useCallback(async (cmd) => {
      const activeId = activeTerminalIdRef.current;
      const term = xtermInstances.current[activeId]?.term;
      if (!term) return;

      const [base, ...args] = cmd.trim().split(/\s+/);
      if (!base) return printPrompt(activeId);
      safeWriteln(term);
      const printAndReset = () => printPrompt(activeId);
      const currentCwd = terminals.find((t) => t.id === activeId)?.cwd || "/";
      const targetPath = (arg) => normalizePath(arg.startsWith("/") ? arg : `${currentCwd}/${arg}`);

      const readLfsToStateNode = async (dirPath) => {
        const name = dirPath.split("/").pop() || "/";
        const stats = await pfs.stat(dirPath);
        if (stats.isDirectory()) {
          const children = await pfs.readdir(dirPath);
          const childNodes = await Promise.all(
            children
              .filter((child) => child !== ".git")
              .map((child) => readLfsToStateNode(normalizePath(`${dirPath}/${child}`)))
          );
          return { type: "folder", name, path: dirPath, children: childNodes, status: "" };
        } else {
          const content = await pfs.readFile(dirPath, "utf8");
          return { type: "file", name, path: dirPath, content, status: "" };
        }
      };

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
        ls: () => findNodeByPath(fileSystem, currentCwd)?.children?.map((f) => f.type === "folder" ? colorText(f.name, "blue") : colorText(f.name, "cyan")).join("  ") || "",
        pwd: () => colorText(currentCwd, "blue"),
        cd: () => {
          if (!args[0]) return "";
          const newPath = targetPath(args[0]);
          const folder = findNodeByPath(fileSystem, newPath);
          if (folder && folder.type === "folder") {
            setTerminals((prev) => prev.map((t) => t.id === activeId ? { ...t, cwd: newPath } : t));
          } else {
            return colorText(`cd: no such directory: ${args[0]}`, "red");
          }
          return "";
        },
        mkdir: async () => {
          if (!args[0]) return;
          const newFolderPath = targetPath(args[0]);
          await pfs.mkdir(newFolderPath);
          setFileSystem((fs) => addNodeByPath(fs, currentCwd, { type: "folder", name: args[0], path: newFolderPath, children: [], status: "" }));
        },
        touch: async () => {
          if (!args[0]) return;
          const newFilePath = targetPath(args[0]);
          await pfs.writeFile(newFilePath, "", "utf8");
          setFileSystem((fs) => addNodeByPath(fs, currentCwd, { type: "file", name: args[0], path: newFilePath, content: "", status: "" }));
        },
        rm: async () => {
          if (!args[0]) return;
          const path = targetPath(args[0]);
          const node = findNodeByPath(fileSystem, path);
          if (!node) {
            return colorText(`rm: cannot remove '${args[0]}': No such file or directory`, "red");
          }
          if (node.type === "file") {
            await pfs.unlink(path);
          } else if (node.type === "folder") {
            try { await pfs.rmdir(path); } catch (e) { return colorText(`rm: cannot remove '${args[0]}': Directory not empty`, "red"); }
          }
          setFileSystem((fs) => deleteNodeByPath(fs, path));
        },
        cat: () => {
          if (!args[0]) return;
          const file = findNodeByPath(fileSystem, targetPath(args[0]));
          return file?.content ?? colorText("File not found", "red");
        },
        clear: () => term.clear(),
        login: () => {
          const username = prompt("Enter your username (e.g., on GitHub):");
          const token = prompt("Enter your Personal Access Token (PAT):");
          if (username && token) {
            setCredentials({ username, token });
            safeWriteln(term, colorText("Credentials saved for this session.", "green"));
          } else {
            safeWriteln(term, colorText("Login cancelled.", "yellow"));
          }
        },
        git: async () => {
          if (!args[0]) {
            safeWriteln(term, "Usage: git <command> [options]");
            return;
          }
          const gitCmd = args[0];
          const onAuth = () => {
            if (!credentials) {
              safeWriteln(term, colorText("Authentication required. Run 'login'", "yellow"));
              return;
            }
            return { username: credentials.username, password: credentials.token };
          };
          const isRepo = await (async () => {
            try { await pfs.stat(`${currentCwd}/.git`); return true; } catch (e) { return false; }
          })();
          if (!["init", "clone"].includes(gitCmd) && !isRepo) {
            safeWriteln(term, colorText(`fatal: not a git repository`, "red"));
            return;
          }

          try {
            switch (gitCmd) {
              case "clone":
                if (!args[1]) {
                  safeWriteln(term, "Usage: git clone <url> [directory]");
                  break;
                }
                const dir = `/${args[2] || args[1].split("/").pop().replace(".git", "")}`;
                safeWriteln(term, `Cloning into '${dir}'...`);
                await git.clone({ fs: lfs, http, dir, url: args[1], onAuth });
                safeWriteln(term, colorText("Clone complete. Syncing file system...", "green"));
                const newNode = await readLfsToStateNode(dir);
                setFileSystem((fs) => addNodeByPath(fs, "/", newNode));
                break;
              case "init":
                await git.init({ fs: lfs, dir: currentCwd });
                safeWriteln(term, `Initialized empty Git repository in ${currentCwd}/.git/`);
                break;
              case "status": {
                const statusResult = await git.statusMatrix({ fs: lfs, dir: currentCwd });
                const staged = [], modified = [], untracked = [];
                for (const [filepath, head, workdir, stage] of statusResult) {
                  if (stage === 2 && workdir === 2) staged.push({ file: filepath, type: "new" });
                  else if (stage === 1 && workdir === 2) modified.push({ file: filepath, type: "modified" });
                  else if (stage === 0 && workdir === 2) untracked.push(filepath);
                }
                if (!staged.length && !modified.length && !untracked.length) {
                  const branch = await git.currentBranch({ fs: lfs, dir: currentCwd, fullname: false });
                  safeWriteln(term, `On branch ${branch || "main"}`);
                  safeWriteln(term, "nothing to commit, working tree clean");
                  break;
                }
                if (staged.length) {
                  safeWriteln(term, "\r\nChanges to be committed:");
                  staged.forEach((s) => safeWriteln(term, `\t${colorText(`${s.type}:       ${s.file}`, "green")}`));
                }
                if (modified.length) {
                  safeWriteln(term, "\r\nChanges not staged for commit:");
                  modified.forEach((m) => safeWriteln(term, `\t${colorText(`${m.type}:   ${m.file}`, "red")}`));
                }
                if (untracked.length) {
                  safeWriteln(term, "\r\nUntracked files:");
                  untracked.forEach((u) => safeWriteln(term, `\t${colorText(u, "red")}`));
                }
                break;
              }
              case "add":
                if (args.length < 2) {
                  safeWriteln(term, colorText("Nothing specified, nothing added.", "red"));
                  break;
                }
                for (let i = 1; i < args.length; i++) {
                  await git.add({ fs: lfs, dir: currentCwd, filepath: args[i] });
                }
                break;
              case "commit": {
                const msgIndex = args.findIndex((a) => a === "-m");
                if (msgIndex === -1 || !args[msgIndex + 1]) {
                  safeWriteln(term, colorText('Usage: git commit -m "message"', "red"));
                } else {
                  const message = args.slice(msgIndex + 1).join(" ").replace(/"/g, "");
                  const sha = await git.commit({ fs: lfs, dir: currentCwd, message, author: { name: "OrbitAI", email: "orbit@ide.com" } });
                  safeWriteln(term, `[main ${sha.substring(0, 7)}] ${message}`);
                }
                break;
              }
              case "branch": {
                const M_flag_index = args.findIndex((a) => a === "-M");
                if (M_flag_index !== -1 && args[M_flag_index + 1]) {
                  const newBranch = args[M_flag_index + 1];
                  const oldBranch = await git.currentBranch({ fs: lfs, dir: currentCwd });
                  await git.branch({ fs: lfs, dir: currentCwd, ref: newBranch, checkout: true });
                  if (oldBranch && oldBranch !== newBranch) {
                    await git.deleteBranch({ fs: lfs, dir: currentCwd, ref: oldBranch });
                  }
                  safeWriteln(term, `Renamed branch ${oldBranch} to ${newBranch}`);
                } else if (args[1] === "-d" || args[1] === "--delete") {
                  if (!args[2]) {
                    safeWriteln(term, "Usage: git branch -d <branch-name>");
                    break;
                  }
                  await git.deleteBranch({ fs: lfs, dir: currentCwd, ref: args[2] });
                  safeWriteln(term, `Deleted branch ${args[2]}.`);
                } else if (args[1]) {
                  await git.branch({ fs: lfs, dir: currentCwd, ref: args[1] });
                  safeWriteln(term, `Created branch ${args[1]}.`);
                } else {
                  const branches = await git.listBranches({ fs: lfs, dir: currentCwd });
                  const current = await git.currentBranch({ fs: lfs, dir: currentCwd });
                  branches.forEach((b) => safeWriteln(term, `${b === current ? "* " : "  "}${colorText(b, "green")}`));
                }
                break;
              }
              case "checkout":
                if (!args[1]) {
                  safeWriteln(term, "Usage: git checkout <branch-name>");
                  break;
                }
                await git.checkout({ fs: lfs, dir: currentCwd, ref: args[1] });
                safeWriteln(term, `Switched to branch '${args[1]}'`);
                break;
              case "fetch":
                safeWriteln(term, "Fetching from remote...");
                await git.fetch({ fs: lfs, http, dir: currentCwd, onAuth, remote: args[1] || "origin" });
                safeWriteln(term, colorText("Fetch complete.", "green"));
                break;
              case "merge":
                if (!args[1]) {
                  safeWriteln(term, "Usage: git merge <branch-name>");
                  break;
                }
                const mergeResult = await git.merge({ fs: lfs, dir: currentCwd, theirs: args[1], author: { name: "OrbitAI", email: "orbit@ide.com" } });
                if (mergeResult.conflicts) {
                  safeWriteln(term, colorText("Automatic merge failed; fix conflicts and then commit the result.", "red"));
                } else {
                  safeWriteln(term, "Merge successful.");
                }
                break;
              case "rebase":
                if (!args[1]) {
                  safeWriteln(term, "Usage: git rebase <branch-name>");
                  break;
                }
                safeWriteln(term, `Rebasing current branch onto '${args[1]}'`);
                await git.rebase({ fs: lfs, dir: currentCwd, onto: args[1], author: { name: "OrbitAI", email: "orbit@ide.com" } });
                safeWriteln(term, colorText("Rebase successful.", "green"));
                break;
              case "reset":
                if (!args[1]) {
                  safeWriteln(term, "Usage: git reset [--hard|soft|mixed] <commit-sha>");
                  break;
                }
                let mode = "mixed";
                let ref = args[1];
                if (["--hard", "--soft", "--mixed"].includes(args[1])) {
                  mode = args[1].substring(2);
                  ref = args[2];
                }
                if (!ref) {
                  safeWriteln(term, "Error: missing commit reference for reset.");
                  break;
                }
                await git.reset({ fs: lfs, dir: currentCwd, mode, ref });
                safeWriteln(term, `HEAD is now at ${ref.substring(0, 7)}`);
                break;
              case "log": {
                const oneline = args.includes("--oneline");
                const commits = await git.log({ fs: lfs, dir: currentCwd });
                commits.forEach((c) => {
                  if (oneline) {
                    safeWriteln(term, `${colorText(c.oid.substring(0, 7), "yellow")} ${c.commit.message.split("\n")[0]}`);
                  } else {
                    safeWriteln(term, `\r\n${colorText(`commit ${c.oid}`, "yellow")}`);
                    safeWriteln(term, `Author: ${c.commit.author.name} <${c.commit.author.email}>`);
                    safeWriteln(term, `Date:   ${new Date(c.commit.author.timestamp * 1000).toUTCString()}`);
                    safeWriteln(term, `\r\n\t${c.commit.message}`);
                  }
                });
                break;
              }
              case "remote":
                if (args[1] === "add" && args[2] && args[3]) {
                  await git.addRemote({ fs: lfs, dir: currentCwd, remote: args[2], url: args[3] });
                  safeWriteln(term, `Remote '${args[2]}' added.`);
                } else {
                  safeWriteln(term, `Usage: git remote add <name> <url>`);
                }
                break;
              case "pull":
                safeWriteln(term, `Pulling from remote...`);
                await git.pull({ fs: lfs, http, dir: currentCwd, author: { name: "OrbitAI", email: "orbit@ide.com" }, onAuth });
                safeWriteln(term, colorText("Pull complete. Syncing file system...", "green"));
                const pulledNode = await readLfsToStateNode(currentCwd);
                setFileSystem((currentFs) => {
                  if (currentCwd === "/") return [pulledNode];
                  const parentPath = currentCwd.substring(0, currentCwd.lastIndexOf("/")) || "/";
                  const parentNode = findNodeByPath(currentFs, parentPath);
                  if (parentNode && parentNode.children) {
                    const newChildren = parentNode.children.filter((c) => c.path !== currentCwd);
                    newChildren.push(pulledNode);
                    parentNode.children = newChildren;
                  }
                  return [...currentFs];
                });
                break;
              case "push": {
                const u_flag_index = args.findIndex((a) => a === "-u" || a === "--set-upstream");
                let remote = "origin";
                let branch = await git.currentBranch({ fs: lfs, dir: currentCwd });
                let setUpstream = u_flag_index !== -1;
                if (u_flag_index !== -1) {
                  remote = args[u_flag_index + 1] || remote;
                  branch = args[u_flag_index + 2] || branch;
                } else if (args[1]) {
                  remote = args[1];
                  branch = args[2] || branch;
                }
                safeWriteln(term, `Pushing to ${remote}...`);
                const result = await git.push({ fs: lfs, http, dir: currentCwd, onAuth, remote, ref: branch, setUpstream });
                if (result.ok) {
                  safeWriteln(term, colorText("Push successful.", "green"));
                } else {
                  safeWriteln(term, colorText(`Push failed: ${result.errors ? result.errors.join(", ") : "Unknown error"}`, "red"));
                }
                break;
              }
              default:
                safeWriteln(term, colorText(`git: '${gitCmd}' is not a git command.`, "red"));
                break;
            }
            if (isRepo || gitCmd === "init" || gitCmd === "clone") {
              await updateFileSystemGitStatus(currentCwd);
            }
          } catch (err) {
            safeWriteln(term, colorText(err.message, "red"));
          }
        },
      };

      const commandFn = localCommands[base];
      if (commandFn) {
        const output = await commandFn();
        if (output) safeWriteln(term, output);
      } else if (!["python", "cpp", "run", "pip", "git"].includes(base)) {
        safeWriteln(term, colorText(`Command not found: ${base}`, "red"));
      }
      
      if (!["python", "cpp", "run", "pip"].includes(base)) {
        printPrompt(activeId);
      }
    },
    [ terminals, fileSystem, setFileSystem, printPrompt, setTerminals, pyodide, cppCompiler, runWSFile, credentials, updateFileSystemGitStatus ]
  );

  useEffect(() => {
    const syncToLfs = async () => {
      const rootNode = fileSystem.find((f) => f.path === "/");
      if (!rootNode) return;
      const syncNode = async (node) => {
        if (node.type === "folder") {
          await pfs.mkdir(node.path).catch(() => {});
          for (const child of node.children) await syncNode(child);
        } else if (node.type === "file") {
          const existingContent = await pfs.readFile(node.path, "utf8").catch(() => null);
          if (existingContent !== (node.content || "")) {
            await pfs.writeFile(node.path, node.content || "", "utf8");
          }
        }
      };
      await syncNode(rootNode);
    };
    syncToLfs();
    updateFileSystemGitStatus("/");
  }, [fileSystem, updateFileSystemGitStatus]);

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
    if (activeTerminalId === idToKill) setActiveTerminalId(newTerminals[0]?.id || null);
  };
  const handleResetTerminal = useCallback(() => {
    resetTerminalState({
      setTerminals, setActiveTerminalId, setActiveView, setInstalledPackages, xtermInstancesRef: xtermInstances, inputBuffersRef: inputBuffers, commandBuffersRef: commandBuffers, nextIdRef: nextId,
    });
  }, []);

  useEffect(() => {
    if (resetTerminalRef) resetTerminalRef.current = { reset: handleResetTerminal };
  }, [resetTerminalRef, handleResetTerminal]);

  useEffect(() => {
    if (terminalApiRef) {
      terminalApiRef.current = {
        runCommand: async (command) => {
          if (!command) return;
          const activeId = activeTerminalIdRef.current;
          const term = xtermInstances.current[activeId]?.term;
          if (term && !term.isDisposed) {
            term.write(command);
            await handleCommand(command);
          }
        },
      };
    }
  }, [terminalApiRef, handleCommand]);

  useEffect(() => {
    const container = terminalContainerRef.current;
    if (!container) return;
    const resizeObserver = new ResizeObserver(() => {
      const activeId = activeTerminalIdRef.current;
      const activeInstance = xtermInstances.current[activeId];
      if (activeInstance?.fitAddon) {
        try { activeInstance.fitAddon.fit(); } catch (e) { console.error(e); }
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
          cursorBlink: true, fontSize: 14, theme: { background: "#181818", foreground: "#ffffff" }, scrollback: 1000, convertEol: true,
        });
        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(termContainer);
        xtermInstances.current[id] = { term, fitAddon, container: termContainer };
        if (id === 1 && term.buffer.active.length === 0) safeWriteln(term, "Welcome to the Orbit terminal!");
        printPrompt(id);
        setTimeout(() => fitAddon.fit(), 10);
      }
    });

    Object.entries(xtermInstances.current).forEach(([id, instance]) => {
      if (instance?.container)
        instance.container.style.display = Number(id) === activeTerminalId ? "block" : "none";
    });
    const activeInstance = xtermInstances.current[activeTerminalId];
    if (activeInstance) {
      setTimeout(() => { if (activeInstance.fitAddon) activeInstance.fitAddon.fit(); }, 10);
    }
  }, [terminals, activeTerminalId, printPrompt]);

  useEffect(() => {
    activeTerminalIdRef.current = activeTerminalId;
  }, [activeTerminalId]);

  useEffect(() => {
    if (!activeTerminalId || !xtermInstances.current[activeTerminalId]) return;
    const { term } = xtermInstances.current[activeTerminalId];
    if (term.isDisposed) return;

    const onDataDisposable = term.onData(async (data) => {
      const code = data.charCodeAt(0);

      if (code === 3) { // Ctrl+C
        if (isAnyExecuting()) {
          if (isWSExecuting) killWS();
          if (pyodide.isExecuting) pyodide.interruptExecution();
          if (cppCompiler.isExecuting) cppCompiler.killExecution();
        }
        commandBuffers.current[activeTerminalId] = "";
        inputBuffers.current[activeTerminalId] = "";
        safeWriteln(term, "^C");
        printPrompt(activeTerminalId);
        return;
      }

      let currentCommand = commandBuffers.current[activeTerminalId] || "";
      let currentInput = inputBuffers.current[activeTerminalId] || "";

      if (isAnyExecuting()) {
        if (data === "\r") {
          safeWriteln(term);
          if (isWSExecuting) sendWSInput(currentInput + "\n");
          else if (pyodide.isExecuting) pyodide.sendInput(currentInput + "\n");
          else if (cppCompiler.isExecuting) cppCompiler.sendInput(currentInput + "\n");
          inputBuffers.current[activeTerminalId] = "";
        } else if (data === "\x7F") {
          if (currentInput.length > 0) {
            inputBuffers.current[activeTerminalId] = currentInput.slice(0, -1);
            term.write("\b \b");
          }
        } else {
          inputBuffers.current[activeTerminalId] += data;
          safeWrite(term, data);
        }
      } else {
        if (data === "\r") {
          await handleCommand(currentCommand);
        } else if (data === "\x7F") {
          if (currentCommand.length > 0) {
            commandBuffers.current[activeTerminalId] = currentCommand.slice(0, -1);
            term.write("\b \b");
          }
        } else {
          commandBuffers.current[activeTerminalId] += data;
          term.write(data);
        }
      }
    });

    return () => onDataDisposable.dispose();
  }, [activeTerminalId, isAnyExecuting, killWS, printPrompt, handleCommand, isWSExecuting, pyodide, cppCompiler, sendWSInput]);

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
            <span key={view} className={`${styles.viewTab} ${activeView === view ? styles.activeViewTab : ""}`} onClick={() => setActiveView(view)}>
              {view}
            </span>
          ))}
        </div>
        <div className={styles.headerRight}>
          {activeView === "TERMINAL" && (
            <>
              <Plus size={18} className={styles.actionIcon} onClick={handleNewTerminal} title="New Terminal" />
              <RotateCcw size={16} className={styles.actionIcon} onClick={handleResetTerminal} title="Reset Terminal" />
              <Trash2 size={16} className={styles.actionIcon} onClick={() => handleKillTerminal(activeTerminalId)} title="Kill Terminal" />
            </>
          )}
          <X size={18} className={styles.actionIcon} onClick={() => setShowTerminal(false)} title="Close Panel" />
        </div>
      </header>
      <div className={styles.terminalContent} style={{ display: activeView === "TERMINAL" ? "flex" : "none" }}>
        <div className={styles.terminalTabs}>
          {terminals.map((t) => (
            <div key={t.id} className={`${styles.terminalTab} ${activeTerminalId === t.id ? styles.activeTerminalTab : ""}`} onClick={() => setActiveTerminalId(t.id)}>
              <span>{t.name}</span>
              {terminals.length > 1 && (
                <X size={14} className={styles.closeTabIcon} onClick={(e) => { e.stopPropagation(); handleKillTerminal(t.id); }} />
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