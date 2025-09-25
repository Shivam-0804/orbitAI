/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import styles from "./css/animated.module.css";

export default function AnimatedTerminal() {
  const commands = [
    { text: "pnpm dlx create-orbit-app orbit", type: "code" },
    { text: "✔ Creating project in orbit folder", type: "output" },
    { text: "✔ Installing dependencies...", type: "output" },
    { text: "✔ Setup complete!", type: "success" },
    { text: "", type: "output" },
    { text: "// Move into project folder", type: "comment" },
    { text: "cd orbit", type: "code" },
    { text: "", type: "output" },
    { text: "// Start the dev server", type: "comment" },
    { text: "npm run dev", type: "code" },
    { text: "", type: "output" },
    { text: "VITE v5.2.0  ready in 1800 ms", type: "success" },
    { text: "➜  Local:   http://localhost:5173/", type: "output" },
    { text: "➜  Network: use --host to expose", type: "output" },
    { text: "", type: "output" },
    { text: "Orbit server started successfully ", type: "success" },
    { text: "", type: "output" },
    { text: "~/orbit  3s", type: "prompt" },
  ];

  const [lines, setLines] = useState([]);
  const [currentLine, setCurrentLine] = useState("");
  const [commandIndex, setCommandIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    if (commandIndex < commands.length) {
      if (charIndex < commands[commandIndex].text.length) {
        const timeout = setTimeout(() => {
          setCurrentLine(
            (prev) => prev + commands[commandIndex].text[charIndex]
          );
          setCharIndex((c) => c + 1);
        }, 15); // typing speed
        return () => clearTimeout(timeout);
      } else {
        const timeout = setTimeout(() => {
          setLines((prev) => [
            ...prev,
            { text: currentLine, type: commands[commandIndex].type },
          ]);
          setCurrentLine("");
          setCharIndex(0);
          setCommandIndex((i) => i + 1);
        }, 200); // pause between lines
        return () => clearTimeout(timeout);
      }
    } else {
      const timeout = setTimeout(() => {
        setLines([]);
        setCurrentLine("");
        setCommandIndex(0);
        setCharIndex(0);
      }, 3000); // restart after 3s
      return () => clearTimeout(timeout);
    }
  }, [charIndex, commandIndex, commands]);

  return (
    <div className={styles.terminalContainer}>
      <div className={styles.terminalHeader}>Orbit terminal</div>
      <div className={styles.terminalBody}>
        {lines.map((line, i) => (
          <div key={i} className={`${styles.line} ${styles[line.type]}`}>
            {line.text}
          </div>
        ))}
        {commandIndex < commands.length && (
          <div
            className={`${styles.line} ${styles[commands[commandIndex].type]}`}
          >
            {currentLine}
            <span className={styles.cursor}></span>
          </div>
        )}
      </div>
    </div>
  );
}
