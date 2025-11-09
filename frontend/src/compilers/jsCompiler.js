import { useState, useEffect, useRef } from "react";
import { getQuickJS } from "quickjs-emscripten";

const wasmUrl = "https://cdn.jsdelivr.net/npm/quickjs-emscripten@latest/quickjs.wasm";

export default function useQuickJS({ fileSystem }) {
  const quickjsRef = useRef(null);
  const [isJsRuntimeReady, setIsJsRuntimeReady] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const quickjs = await getQuickJS({ wasmBinaryURL: wasmUrl });
        quickjsRef.current = quickjs;
        setIsJsRuntimeReady(true);
      } catch (error) {
        console.error("QuickJS Load Failed:", error);
      }
    })();
  }, []);

  const runJavaScript = async (filePath, { stdout, stderr, onExit }) => {
    if (!isJsRuntimeReady || isExecuting) return;
    setIsExecuting(true);

    try {
      const root = Array.isArray(fileSystem) ? fileSystem[0] : fileSystem;
      const fileNode = findNodeByPath(root, filePath);

      if (!fileNode || fileNode.type !== "file") {
        stderr(`js: cannot open '${filePath}': No such file\n`);
        setIsExecuting(false);
        return onExit();
      }

      const quickjs = quickjsRef.current;
      const ctx = quickjs.newContext();

      // ---- console.log ----
      const consoleObj = ctx.newObject();
      const logFn = ctx.newFunction("log", (val) => {
        let output;
        try {
          const jsVal = ctx.dump(val); // ✅ convert QuickJS → JS
          if (typeof jsVal === "object") {
            output = JSON.stringify(jsVal, null, 2);
          } else {
            output = String(jsVal);
          }
        } catch {
          output = String(val);
        }
        stdout(output + "\n");
        return ctx.undefined;
      });
      ctx.setProp(consoleObj, "log", logFn);
      ctx.setProp(ctx.global, "console", consoleObj);

      // ---- input() sync placeholder ----
      const inputFn = ctx.newFunction("input", () => ctx.newString(""));
      ctx.setProp(ctx.global, "input", inputFn);

      // ---- Execute user code ----
      const result = ctx.evalCode(fileNode.content);
      if (result.error) {
        stderr(result.error.toString() + "\n");
        result.error.dispose();
      } else {
        result.value.dispose();
      }

      logFn.dispose();
      inputFn.dispose();
      consoleObj.dispose();
      ctx.dispose();

    } catch (err) {
      stderr(err.toString() + "\n");
    } finally {
      setIsExecuting(false);
      onExit();
    }
  };

  return { runJavaScript, isExecuting, isJsRuntimeReady };
}

function findNodeByPath(rootNode, path) {
  if (!rootNode) return null;
  if (path === "/") return rootNode;
  return path.split("/").filter(Boolean).reduce((current, part) =>
    current?.children?.find((c) => c.name === part), rootNode);
}
