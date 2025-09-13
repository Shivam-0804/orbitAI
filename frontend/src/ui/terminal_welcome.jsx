import { useState, useEffect } from "react";
import styles from "./css/welcome.module.css";

export default function WelcomeTerminal({ className }) {
  const prompt = "orbit://user>> ";
  const message = "Welcome to Orbit!";

  const [displayedMessage, setDisplayedMessage] = useState("");
  const [charIndex, setCharIndex] = useState(0);

  useEffect(() => {
    const typingSpeed = 100;
    let timeout;

    if (charIndex < message.length) {
      timeout = setTimeout(() => {
        setDisplayedMessage((prev) => prev + message[charIndex]);
        setCharIndex((i) => i + 1);
      }, typingSpeed);
    } else {
      timeout = setTimeout(() => {
        setDisplayedMessage("");
        setCharIndex(0);
      }, 2000);
    }

    return () => clearTimeout(timeout);
  }, [charIndex, message]);

  return (
    <div className={`${className} ${styles.terminalContainer}`}>
      <div className={styles.terminalHeader}>Main</div>
      <div className={styles.terminalBody}>
        <div className={`${styles.line} ${styles.success}`}>
          {prompt}
          {displayedMessage}
          <span className={styles.cursor}>|</span>
        </div>
      </div>
    </div>
  );
}
