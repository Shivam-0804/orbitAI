import { useRef, useState } from "react";

export default function useServerCompiler(fileSystem, cwd, onOutput, onExecutionEnd) {
  const wsRef = useRef(null);
  const [isExecuting, setIsExecuting] = useState(false);

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

  const runFile = (entryPath) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      wsRef.current = new WebSocket("ws://localhost:3001");

      wsRef.current.onopen = () => {
        setIsExecuting(true);
        wsRef.current.send(
          JSON.stringify({ type: "execute", entryPath, fileSystem })
        );
      };

      wsRef.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        switch (message.type) {
          case "stdout":
            onOutput(message.data);
            break;
          case "stderr":
            onOutput(colorText(message.data, "red"));
            break;
          case "exit":
            setIsExecuting(false);
            onExecutionEnd();
            break;
          default:
            console.warn("Unknown message:", message);
        }
      };

      wsRef.current.onerror = () => {
        onOutput(colorText("\r\nConnection failed", "red"));
        setIsExecuting(false);
      };

      wsRef.current.onclose = () => setIsExecuting(false);
    } else {
      setIsExecuting(true);
      wsRef.current.send(
        JSON.stringify({ type: "execute", entryPath, fileSystem })
      );
    }
  };

  const sendInput = (data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "stdin", data }));
    }
  };

  return { runFile, sendInput, isExecuting };
}
