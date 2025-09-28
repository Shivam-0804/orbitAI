const fs = require("fs-extra");
const path = require("path");
const { spawn, exec } = require("child_process");
const os = require("os");

// Helper to recursively write the file structure
const writeFiles = async (basePath, files) => {
  for (const file of files) {
    const fullPath = path.join(basePath, file.name);
    if (file.type === "folder") {
      await fs.ensureDir(fullPath);
      if (file.children) {
        await writeFiles(fullPath, file.children);
      }
    } else {
      await fs.writeFile(fullPath, file.content || "");
    }
  }
};

async function runCode(options) {
  const { fileSystem, entryPath, onStdout, onStderr, onExit } = options;
  const isStreaming = typeof onStdout === "function";

  const sessionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const tempDir = path.join(os.tmpdir(), sessionId);

  const cleanup = () => {
    fs.remove(tempDir).catch((err) =>
      console.error(`Cleanup failed for ${tempDir}:`, err)
    );
  };

  await fs.ensureDir(tempDir);
  if (fileSystem && fileSystem[0] && fileSystem[0].children) {
    await writeFiles(tempDir, fileSystem[0].children);
  }

  const entryFile = path.join(tempDir, entryPath.startsWith('/') ? entryPath.substring(1) : entryPath);
  const fileExtension = path.extname(entryFile);
  const baseName = path.basename(entryFile, fileExtension);

  return new Promise((resolve, reject) => {
    let output = "";

    const runProcess = (command, args = []) => {
      const childProcess = spawn(command, args, { cwd: tempDir, shell: true });

      childProcess.stdout.on("data", (data) => {
        const chunk = data.toString();
        if (isStreaming) onStdout(chunk);
        output += chunk;
      });

      childProcess.stderr.on("data", (data) => {
        const chunk = data.toString();
        if (isStreaming) onStderr(chunk);
        output += chunk;
      });

      childProcess.on("close", (code) => {
        cleanup();
        if (isStreaming) onExit(code);
        if (code === 0) {
            resolve(isStreaming ? { childProcess, cleanup } : output);
        } else {
            reject(new Error(output || `Process exited with code ${code}`));
        }
      });
      
      childProcess.on("error", (err) => {
        cleanup();
        reject(err);
      });

      if (isStreaming) {
        resolve({ childProcess, cleanup });
      }
    };

    const compileAndRun = (compileCmd, runCmd, runArgs) => {
      exec(compileCmd, { cwd: tempDir }, (error, stdout, stderr) => {
        if (error) {
          cleanup();
          const errorMessage = stderr || stdout || error.message;
          if (isStreaming) {
            onStderr(errorMessage);
            onExit(1);
          }
          return reject(new Error(errorMessage));
        }
        runProcess(runCmd, runArgs);
      });
    };

    switch (fileExtension) {
      case ".js":
        runProcess("node", [entryFile]);
        break;
      case ".py":
        runProcess("python", ["-u", entryFile]); // -u for unbuffered output
        break;
      case ".go":
        runProcess("go", ["run", entryFile]);
        break;
      case ".cpp": {
        const executablePathCpp = path.join(tempDir, baseName);
        compileAndRun(`g++ "${entryFile}" -o "${executablePathCpp}"`, executablePathCpp);
        break;
      }
      case ".java":
        compileAndRun(`javac "${entryFile}"`, "java", [baseName]);
        break;
      default:
        cleanup();
        reject(new Error(`Unsupported file type '${fileExtension}'`));
    }
  });
}

// Default export -> WebSocket mode
function executor(wss) {
  wss.on("connection", (ws) => {
    console.log("Client connected to execution server");
    let childProcess = null;
    let cleanup = () => {};

    ws.on("message", async (message) => {
      const data = JSON.parse(message);

      if (data.type === "execute") {
        if (childProcess) {
          childProcess.kill(); // Kill previous process if any
        }
        
        const { fileSystem, entryPath } = data;

        try {
          const result = await runCode({
            fileSystem,
            entryPath,
            onStdout: (chunk) => ws.send(JSON.stringify({ type: "stdout", data: chunk })),
            onStderr: (chunk) => ws.send(JSON.stringify({ type: "stderr", data: chunk })),
            onExit: (code) => ws.send(JSON.stringify({ type: "exit", code })),
          });
          childProcess = result.childProcess;
          cleanup = result.cleanup;

        } catch (err) {
          ws.send(JSON.stringify({ type: "stderr", data: err.message }));
          ws.send(JSON.stringify({ type: "exit", code: 1 }));
        }

      } else if (data.type === "stdin" && childProcess) {
        if (childProcess.stdin.writable) {
          childProcess.stdin.write(data.data);
        }
      }
    });

    ws.on("close", () => {
      console.log("Client disconnected");
      if (childProcess) {
        childProcess.kill();
        cleanup();
      }
    });
  });
}

module.exports = executor;
module.exports.runCode = (fileSystem, entryPath) => runCode({ fileSystem, entryPath });