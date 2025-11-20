import React, { useState, useRef } from "react";
import { useWebLLM } from "../model/modelFunctions";
import styles from "./css/terminal.module.css";

export default function ExplainCodePanel({ codeToExplain }) {
  const { explainCode, modelStatus, stop } = useWebLLM();
  const [output, setOutput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const stopRef = useRef(false);

  const handleExplain = async () => {
    if (modelStatus !== "ready") return alert("Model is loading...");

    setIsGenerating(true);
    setOutput("");
    stopRef.current = false;

    try {
      await explainCode(
        codeToExplain || "No code provided.",
        (streamedText) => {
          if (stopRef.current) return;
          setOutput(streamedText);
        }
      );
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

  // Parser: Splits the AI output into two sections
  const parts = output.split("[IMPROVEMENTS]");
  const explanationText = parts[0]?.replace("[EXPLANATION]", "").trim();
  const improvementText = parts[1]?.trim();

  return (
    <div className={styles["panel-container"]}>
      {/* --- Header --- */}
      <div className={styles["panel-header"]}>
        <h3 className={styles["panel-title"]}>
          <span className={styles["icon-blue"]}></span> Code Explainer
        </h3>

        {!isGenerating ? (
          <button
            onClick={handleExplain}
            disabled={modelStatus !== "ready"}
            className={styles["generate-btn"]}
          >
            Explain Code
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
          </div>
        )}

        {/* Explanation Section */}
        {explanationText && (
          <div className={styles["section-card"]}>
            <div className={styles["section-title"]}>Logic Breakdown</div>
            <div className={styles["section-text"]}>{explanationText}</div>
          </div>
        )}

        {/* Improvement Section */}
        {improvementText && (
          <div className={styles["section-card"]}>
            <div className={styles["section-title"]}>Suggestions</div>
            <div className={styles["section-text"]}>{improvementText}</div>
          </div>
        )}

        {/* Fallback for Raw Output */}
        {output &&
          !improvementText &&
          !explanationText.includes("[EXPLANATION]") && (
            <div className={styles["section-card"]}>
              <div className={styles["section-title"]}>Analysis</div>
              <pre className={styles["section-text"]}>{output}</pre>
            </div>
          )}
      </div>
    </div>
  );
}
