import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

export default function TreeSitterPage() {
  const [code, setCode] = useState(``);
  const [language, setLanguage] = useState("auto");
  const [tree, setTree] = useState("");
  const [errorRange, setErrorRange] = useState(null);
  const [status, setStatus] = useState("idle");
  const [backendUrl, setBackendUrl] = useState("http://localhost:5000/parse");

  const timerRef = useRef(null);
  const preRef = useRef(null);
  const taRef = useRef(null);

  // debounce parse requests
  useEffect(() => {
    // don't parse if empty
    if (code === "") {
      setTree("");
      setStatus("idle");
      return;
    }

    setStatus("waiting");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      doParse();
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, language, backendUrl]);

  async function doParse() {
    setStatus("parsing");
    try {
      const res = await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language: language === "auto" ? null : language }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      const data = await res.json();
        if (data.error) {
          setTree(`Error: ${data.error}`);
          setErrorRange(null);
          setStatus("error");
        } else if (data.tree) {
          // If the tree contains an ERROR line, show only the first ERROR line.
          // Example error line: "ERROR  [Point(row=1, column=0) - Point(row=1, column=3)]  'b ='"
          const lines = String(data.tree).split(/\r?\n/);
          const errLine = lines.find((ln) => /^\s*ERROR\b/.test(ln));
          if (errLine) {
            setTree(errLine.trim());
            // try to parse start/end coordinates
            const coordRe = /Point\(row=(\d+),\s*column=(\d+)\)\s*-\s*Point\(row=(\d+),\s*column=(\d+)\)/;
            const m = coordRe.exec(errLine);
            if (m) {
              const sRow = parseInt(m[1], 10) - 1;
              const sCol = parseInt(m[2], 10);
              const eRow = parseInt(m[3], 10) - 1;
              const eCol = parseInt(m[4], 10);
              setErrorRange({ start: { row: sRow, column: sCol }, end: { row: eRow, column: eCol } });
            } else {
              setErrorRange(null);
            }
            setStatus("error");
          } else {
            setTree(data.tree);
            setErrorRange(null);
            setStatus("ok");
          }
        } else {
          setTree(JSON.stringify(data, null, 2));
          setErrorRange(null);
          setStatus("ok");
        }
    } catch (err) {
      setTree(String(err));
      setStatus("error");
    }
  }

  // build highlighted HTML for the background pre element with the error span
  function buildHighlightedHTML(codeText, range) {
    const rawLines = codeText.split(/\r?\n/);
    if (!range) return rawLines.map(escapeHtml).join("\n");
    const escLines = rawLines.map(escapeHtml);
    const { start, end } = range;

    // normalize bounds
    const sRow = Math.max(0, Math.min(start.row, rawLines.length - 1));
    const eRow = Math.max(0, Math.min(end.row, rawLines.length - 1));

    if (sRow === eRow) {
      const line = rawLines[sRow] || "";
      const before = line.slice(0, start.column);
      const err = line.slice(start.column, end.column);
      const after = line.slice(end.column);
      escLines[sRow] = escapeHtml(before) + `<span class="squiggle">` + escapeHtml(err) + `</span>` + escapeHtml(after);
    } else {
      const first = rawLines[sRow] || "";
      const last = rawLines[eRow] || "";
      const before = first.slice(0, start.column);
      const after = last.slice(end.column);
      escLines[sRow] = escapeHtml(before) + `<span class="squiggle">` + escapeHtml(first.slice(start.column));
      for (let i = sRow + 1; i < eRow; i++) escLines[i] = escapeHtml(rawLines[i]);
      escLines[eRow] = escapeHtml((rawLines[eRow] || "").slice(0, end.column)) + `</span>` + escapeHtml(after);
    }

    return escLines.join("\n");
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\t/g, "    ");
  }

  function escapeHtmlLineBreak(line) {
    return line.replace(/\n/g, "\n");
  }

  // sync scroll of pre with textarea
  function onTaScroll() {
    if (!taRef.current || !preRef.current) return;
    preRef.current.scrollTop = taRef.current.scrollTop;
    preRef.current.scrollLeft = taRef.current.scrollLeft;
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/">← Home</Link>
      </div>

      <h2>Tree-sitter Live Playground</h2>
      <style>{`
        .squiggle { text-decoration-line: underline; text-decoration-color: #ff4d4f; text-decoration-style: wavy; }
      `}</style>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 320 }}>
          <div style={{ marginBottom: 8 }}>
            <label style={{ marginRight: 8 }}>Backend URL:</label>
            <input
              style={{ width: "70%" }}
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ marginRight: 8 }}>Language:</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="auto">Auto-detect</option>
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="c">C</option>
              <option value="cpp">C++</option>
            </select>
          </div>

          <div style={{ position: "relative" }}>
            <pre
              ref={preRef}
              aria-hidden
              style={{
                margin: 0,
                pointerEvents: "none",
                color: "#d6f8ff",
                fontFamily: "monospace",
                fontSize: 14,
                lineHeight: "1.4",
                whiteSpace: "pre-wrap",
                wordWrap: "break-word",
                width: "100%",
                minHeight: 400,
                padding: 8,
              }}
              dangerouslySetInnerHTML={{ __html: buildHighlightedHTML(code, errorRange) }}
            />

            <textarea
              ref={taRef}
              placeholder="Type code here..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onScroll={onTaScroll}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: 400,
                resize: "none",
                background: "transparent",
                color: "transparent",
                textShadow: "0 0 0 #d6f8ff",
                caretColor: "#d6f8ff",
                fontFamily: "monospace",
                fontSize: 14,
                lineHeight: "1.4",
                border: "1px solid rgba(255,255,255,0.04)",
                padding: 8,
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        <div style={{ width: 480, maxWidth: "45%" }}>
          <div style={{ marginBottom: 6 }}>
            <strong>Parse tree</strong> — status: {status}
          </div>
          <pre
            style={{
              background: "#0f1724",
              color: "#d6f8ff",
              padding: 12,
              height: 460,
              overflow: "auto",
              whiteSpace: "pre-wrap",
              fontFamily: "monospace",
              fontSize: 13,
            }}
          >
            {tree || "(no parse yet)"}
          </pre>
        </div>
      </div>
    </div>
  );
}
