const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");

const executor = require("./executor");
const userRoutes = require("./routes/userRoutes");

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = 3001;

app.use(express.json());

// Attach WebSocket handling
executor(wss);

// HTTP route for running code directly
app.post("/run", async (req, res) => {
  const { fileSystem, entryPath } = req.body;

  if (!fileSystem || !entryPath) {
    return res
      .status(400)
      .json({ error: "fileSystem and entryPath are required" });
  }

  try {
    if (typeof executor.runCode !== "function") {
      throw new Error(
        "executor.runCode is not defined. Export it from executor.js"
      );
    }

    const output = await executor.runCode(fileSystem, entryPath);
    res.json({ success: true, output });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.route("/user", userRoutes);

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
