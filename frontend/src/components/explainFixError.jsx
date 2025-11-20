import React, { useState, useRef } from "react";
import { useWebLLM } from "../model/modelFunctions";
import styles from "./css/terminal.module.css";

export default function ExplainFixPanel({ codeToFix, errorMessage }) {
  const { fixError, modelStatus, stop } = useWebLLM();
  const [output, setOutput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const stopRef = useRef(false);

  // Prepare the combined input for the AI
  const fullInput = `
CODE:
${codeToFix}

ERROR MESSAGE:
${errorMessage || "No specific error message provided. Analyze for potential bugs."}
`;

  const handleAnalyze = async () => {
    if (modelStatus !== "ready") return alert("Model is loading...");

    setIsGenerating(true);
    setOutput("");
    stopRef.current = false;

    try {
      await fixError(fullInput, (streamedText) => {
        if (stopRef.current) return;
        setOutput(streamedText);
      });
    } catch (err) {
      if (!stopRef.current) setOutput("Error: " + err.message);
    } finally {
      if (!stopRef.current) setIsGenerating(false);
    }
  };

  const handleStop = () => {
    stopRef.current = true;
    stop();
    setIsGenerating(false);
  };

  const handleCopySolution = (text) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const parts = output.split("[SOLUTION]");
  const causeText = parts[0]?.replace("[CAUSE]", "").trim();
  const solutionText = parts[1]?.trim();

  return (
    <div className={styles["panel-container"]}>
      {/* --- Header --- */}
      <div className={styles["panel-header"]}>
        <h3 className={styles["panel-title"]}>
          <span className={styles["icon-orange"]}></span> Explain & Fix
        </h3>

        {!isGenerating ? (
          <button
            onClick={handleAnalyze}
            disabled={modelStatus !== "ready"}
            className={styles["generate-btn"]}
          >
            Analyze Error
          </button>
        ) : (
          <button
            onClick={handleStop}
            className={`${styles["generate-btn"]} ${styles["stop-btn"]}`}
          >
            <span>■</span> Stop
          </button>
        )}
      </div>

      {/* --- Content --- */}
      <div className={styles["content-container"]}>
        {!output && !isGenerating && (
          <div className={styles["placeholder-state"]}>
            <div className={styles["placeholder-icon"]}></div>
            <p>Paste broken code or select an error to start debugging.</p>
          </div>
        )}

        {/* Render Cause */}
        {causeText && (
          <div className={styles["section-card"]}>
            <div className={styles["section-title"]}>Diagnosis</div>
            <div className={styles["section-text"]}>{causeText}</div>
          </div>
        )}

        {/* Render Solution */}
        {solutionText && (
          <div className={styles["section-card"]}>
            <div className={styles["section-title"]}>
              Suggested Fix
              <button
                className={`${styles["copy-btn"]} ${isCopied ? styles["copied"] : ""}`}
                onClick={() => handleCopySolution(solutionText)}
              >
                {isCopied ? "✓ Copied" : "Copy Code"}
              </button>
            </div>
            <pre className={styles["code-block"]}>{solutionText}</pre>
          </div>
        )}

        {/* Fallback: If AI didn't follow format, just show raw output */}
        {output && !solutionText && !causeText.includes("[CAUSE]") && (
          <div className={styles["section-card"]}>
            <div className={styles["section-title"]}>Explaination</div>
            <pre className={styles["section-text"]}>{output}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
