/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from "react";
import styles from "./css/preview.module.css";

export default function PreviewWindow({ fileSystem }) {
  const iframeRef = useRef(null);
  const [consoleLogs, setConsoleLogs] = useState([]);
  const [showConsole, setShowConsole] = useState(false);

  const pushLog = (msg) => setConsoleLogs((prev) => [...prev, msg]);

  function collectFiles(nodes, ext, collected = []) {
    for (const node of nodes) {
      if (node.type === "file" && node.name.endsWith(ext)) {
        collected.push(node);
      } else if (node.type === "folder") {
        collectFiles(node.children || [], ext, collected);
      }
    }
    return collected;
  }

  function getIndexHTML(nodes) {
    const htmlFiles = collectFiles(nodes, ".html");
    return htmlFiles.length > 0
      ? htmlFiles[0].content
      : "<h3>No index.html found</h3>";
  }

  function createBlobURL(code, mime) {
    return URL.createObjectURL(new Blob([code], { type: mime }));
  }

  useEffect(() => {
    if (!iframeRef.current) return;

    const timeout = setTimeout(() => {
      setConsoleLogs([]);

      const htmlContent = getIndexHTML(fileSystem);
      const cssFiles = collectFiles(fileSystem, ".css");
      const jsFiles = collectFiles(fileSystem, ".js");

      const cssLinks = cssFiles
        .map(
          (file) =>
            `<link rel="stylesheet" href="${createBlobURL(
              file.content,
              "text/css"
            )}">`
        )
        .join("\n");

      const jsScripts = jsFiles
        .map(
          (file) =>
            `<script src="${createBlobURL(
              file.content,
              "application/javascript"
            )}"></script>`
        )
        .join("\n");

      const wrappedHtml = `
        <html>
          <head>
            ${cssLinks}
            <script>
              (function() {
                const send = (type, args) => parent.postMessage({ type, args }, "*");
                console.log = (...args) => send("log", args);
                console.warn = (...args) => send("warn", args);
                console.error = (...args) => send("error", args);
                window.onerror = function(message, source, lineno, colno, error) {
                  send("error", [message + " @ " + lineno + ":" + colno]);
                };
              })();
            </script>
          </head>
          <body>
            ${htmlContent}
            ${jsScripts}
          </body>
        </html>
      `;

      iframeRef.current.srcdoc = wrappedHtml;
    }, 300);

    return () => clearTimeout(timeout);
  }, [fileSystem]);

  useEffect(() => {
    const handleMessage = (e) => {
      if (!e.data || !e.data.type) return;
      const { type, args } = e.data;

      if (type === "log") pushLog(args.join(" "));
      if (type === "warn") pushLog("⚠️ " + args.join(" "));
      if (type === "error") pushLog("❌ " + args.join(" "));
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <div className={styles.previewWrapper}>
      {/* Header Tabs */}
      <div className={styles.previewHeader}>
        <span
          className={!showConsole ? styles.activeTab : styles.inactiveTab}
          onClick={() => setShowConsole(false)}
        >
          Output
        </span>
        <span
          className={showConsole ? styles.activeTab : styles.inactiveTab}
          onClick={() => setShowConsole(true)}
        >
          Console
        </span>
      </div>

      {/* Iframe preview */}
      <div
        className={styles.previewArea}
        style={{ height: showConsole ? "70%" : "100%" }}
      >
        <iframe
          ref={iframeRef}
          className={styles.previewIframe}
          sandbox="allow-scripts allow-same-origin"
        />
      </div>

      {/* Console */}
      {showConsole && (
        <div className={styles.consoleArea}>
          {consoleLogs.length === 0 ? (
            <div className={styles.consoleEmpty}>No console output yet…</div>
          ) : (
            consoleLogs.map((log, i) => (
              <div key={i} className={styles.consoleLine}>
                {log}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
