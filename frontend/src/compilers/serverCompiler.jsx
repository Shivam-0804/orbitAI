import { useRef, useState, useCallback } from "react";

export default function useServerCompiler(
  fileSystem,
  cwd,
  onOutput,
  onExecutionEnd
) {
  const wsRef = useRef(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const colorText = useCallback((text, color) => {
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
  }, []);

  const runWSFile = useCallback(
    (entryPath) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        const WS_URL = import.meta.env.VITE_WS_URL;
        wsRef.current = new WebSocket(WS_URL);

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
    },
    [fileSystem, onOutput, onExecutionEnd, colorText]
  );

  const runHTTPFile = useCallback(
    async (entryPath) => {
      try {
        setIsExecuting(true);
        const API_URL = import.meta.env.VITE_API_URL;
        const res = await fetch(`${API_URL}/api/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entryPath, fileSystem }),
        });
        const result = await res.json();
        if (result.success) onOutput(result.output);
        else onOutput(colorText(result.error || "Execution failed", "red"));
      } catch (err) {
        onOutput(colorText(`Request failed: ${err.message}`, "red"));
      } finally {
        setIsExecuting(false);
        onExecutionEnd();
      }
    },
    [fileSystem, onOutput, onExecutionEnd, colorText]
  );

  const sendInput = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "stdin", data }));
    }
  }, []);

  const killWS = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setIsExecuting(false);
    }
  }, []);

  // For compatibility: alias runFile to runWSFile
  return {
    runFile: runWSFile,
    runWSFile,
    runHTTPFile,
    sendInput,
    isExecuting,
    killWS,
  };
}
