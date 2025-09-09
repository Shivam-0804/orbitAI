const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");
const fs = require("fs-extra");
const path = require("path");
const { spawn, exec } = require("child_process");
const os = require("os");

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = 3001;

// Helper to recursively write the file structure received from the client
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

wss.on("connection", (ws) => {
  console.log("Client connected to execution server");
  let childProcess = null; // Keep track of the running process for this connection

  ws.on("message", async (message) => {
    const data = JSON.parse(message);

    // Handles the 'execute' command from the client
    if (data.type === "execute") {
      const { fileSystem, entryPath } = data;
      const sessionId = `exec-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const tempDir = path.join(os.tmpdir(), sessionId);

      try {
        // 1. Create a temporary directory and write all files to it
        await fs.ensureDir(tempDir);
        await writeFiles(tempDir, fileSystem[0].children);

        const entryFile = path.join(tempDir, entryPath.substring(1)); // Remove leading '/'
        const fileExtension = path.extname(entryFile);
        const baseName = path.basename(entryFile, fileExtension);

        // Helper to run a command and stream I/O
        const runProcess = (command, args = []) => {
          childProcess = spawn(command, args, { cwd: tempDir, shell: true });

          childProcess.stdout.on("data", (d) =>
            ws.send(JSON.stringify({ type: "stdout", data: d.toString() }))
          );
          childProcess.stderr.on("data", (d) =>
            ws.send(JSON.stringify({ type: "stderr", data: d.toString() }))
          );

          childProcess.on("close", (code) => {
            ws.send(JSON.stringify({ type: "exit", code }));
            childProcess = null;
            fs.remove(tempDir).catch((err) =>
              console.error(`Cleanup failed for ${tempDir}:`, err)
            );
          });
        };

        // Helper for compiled languages
        const compileAndRun = (compileCmd, runCmd, runArgs) => {
          exec(compileCmd, { cwd: tempDir }, (error, stdout, stderr) => {
            if (error) {
              ws.send(
                JSON.stringify({ type: "stderr", data: stderr || stdout })
              );
              ws.send(JSON.stringify({ type: "exit", code: 1 }));
              fs.remove(tempDir).catch((err) =>
                console.error(`Cleanup failed for ${tempDir}:`, err)
              );
            } else {
              runProcess(runCmd, runArgs);
            }
          });
        };

        // 2. Determine the correct runtime based on file extension
        switch (fileExtension) {
          case ".js":
            runProcess("node", [entryFile]);
            break;

          case ".py":
            runProcess("python", [entryFile]);
            break;

          case ".go":
            runProcess("go", ["run", entryFile]);
            break;

          case ".cpp":
            const executablePathCpp = path.join(tempDir, baseName);
            compileAndRun(
              `g++ "${entryFile}" -o "${executablePathCpp}"`,
              executablePathCpp
            );
            break;

          case ".java":
            compileAndRun(`javac "${entryFile}"`, "java", [baseName]);
            break;

          default:
            const errorMsg = `Error: Unsupported file type ('${fileExtension}'). Cannot execute.`;
            ws.send(JSON.stringify({ type: "stderr", data: errorMsg }));
            ws.send(JSON.stringify({ type: "exit", code: 1 }));
            fs.remove(tempDir).catch((err) =>
              console.error(`Cleanup failed for ${tempDir}:`, err)
            );
        }
      } catch (error) {
        ws.send(
          JSON.stringify({
            type: "stderr",
            data: `Server execution failed: ${error.message}`,
          })
        );
        ws.send(JSON.stringify({ type: "exit", code: 1 }));
        if (tempDir) await fs.remove(tempDir);
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
    }
  });
});

server.listen(PORT, () => {
  console.log(
    `Multi-language execution server listening on http://localhost:${PORT}`
  );
});
