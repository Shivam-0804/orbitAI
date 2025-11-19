import React, { useState, useRef } from "react";
import { useWebLLM } from "../model/modelFunctions";
import styles from "./css/terminal.module.css";

export default function TestCasePanel({ codeToTest }) {
  const { generateTests, modelStatus } = useWebLLM();
  const [output, setOutput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const [copiedIndex, setCopiedIndex] = useState(null);
  const [isGlobalCopied, setIsGlobalCopied] = useState(false);

  // Ref to track if the user requested to stop
  const stopRef = useRef(false);

  const handleGenerate = async () => {
    if (!generateTests) return;
    if (modelStatus !== "ready") return alert("Model is still loading...");

    setIsGenerating(true);
    setOutput("");
    setCopiedIndex(null);
    stopRef.current = false; // Reset stop flag on new run

    try {
      await generateTests(codeToTest, (streamedText) => {
        // If the user clicked stop, ignore incoming updates
        if (stopRef.current) return;
        setOutput(streamedText);
      });
    } catch (err) {
      if (!stopRef.current) {
        setOutput("Error: " + err.message);
      }
    } finally {
      // Only finalize state if we haven't already manually stopped
      if (!stopRef.current) {
        setIsGenerating(false);
      }
    }
  };

  const handleStop = () => {
    stopRef.current = true; // Signal the callback to ignore data
    setIsGenerating(false); // Immediately update UI to "Ready" state
  };

  const handleCopyLine = (text, index) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyAll = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setIsGlobalCopied(true);
    setTimeout(() => setIsGlobalCopied(false), 2000);
  };

  const outputLines = output
    ? output.split("\n").filter((line) => line.trim() !== "")
    : [];

  return (
    <div className={styles["test-panel-container"]}>
      {/* --- Header --- */}
      <div className={styles["test-panel-header"]}>
        <h3 className={styles["test-panel-title"]}>
          <span className={styles["icon-purple"]}></span> Test Case Generator
        </h3>

        {/* Conditional Button Rendering */}
        {!isGenerating ? (
          <button
            onClick={handleGenerate}
            disabled={modelStatus !== "ready"}
            className={styles["generate-btn"]}
          >
            Generate Test Cases
          </button>
        ) : (
          <button
            onClick={handleStop}
            className={styles["generate-btn"]}
            style={{
              backgroundColor: "#ff4d4f", // Red color for stop action
              borderColor: "#ff4d4f",
              color: "white",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "1.2em", lineHeight: "0" }}>■</span> Stop
            Generating
          </button>
        )}
      </div>

      {/* --- Output Area --- */}
      <div className={styles["output-container"]}>
        {/* Toolbar */}
        <div className={styles["output-header"]}>
          <span>
            {outputLines.length > 0
              ? `${outputLines.length} Test Cases Generated`
              : "Output Console"}
          </span>

          {/* Global Copy Button */}
          {output && (
            <button
              onClick={handleCopyAll}
              className={`${styles["copy-btn"]} ${
                isGlobalCopied ? styles["copied"] : ""
              }`}
              title="Copy All"
            >
              {isGlobalCopied ? <>✓ Copied All</> : <>Copy All</>}
            </button>
          )}
        </div>

        {/* Content: List of Individual Items */}
        <div className={styles["output-content-wrapper"]}>
          {outputLines.length > 0 ? (
            <div className={styles["test-case-list"]}>
              {outputLines.map((line, index) => {
                const isThisCopied = copiedIndex === index;

                return (
                  <div key={index} className={styles["test-case-item"]}>
                    <span className={styles["test-case-text"]}>{line}</span>

                    <button
                      onClick={() => handleCopyLine(line, index)}
                      className={`${styles["item-copy-btn"]} ${
                        isThisCopied ? styles["item-copied"] : ""
                      }`}
                      title="Copy this line"
                    >
                      {isThisCopied ? (
                        <span
                          style={{ fontSize: "1.2rem", fontWeight: "bold" }}
                        >
                          ✓
                        </span>
                      ) : (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect
                            x="9"
                            y="9"
                            width="13"
                            height="13"
                            rx="2"
                            ry="2"
                          ></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                      )}
                    </button>
                  </div>
                );
              })}
              {/* Extra padding at bottom for comfortable scrolling */}
              <div style={{ height: "40px" }}></div>
            </div>
          ) : (
            <div className={styles["placeholder-state"]}>
              <div className={styles["placeholder-icon"]}>⚡</div>
              <p>Ready to generate tests for your code.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}