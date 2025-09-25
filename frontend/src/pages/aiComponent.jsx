import React from "react";
import styles from "./css/ai.module.css";
import { Link } from "react-router-dom";

export default function AIComponent() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.left}>
          <span className={styles.aiTag}>AI POWERED</span>
          <h1 className={styles.title}>
            Build with <span className={styles.highlight}>OrbitAI</span>
          </h1>
          <p className={styles.description}>
            Work quickly and efficiently with OrbitAI. Leverage modern AI tools
            to streamline your development workflow — from debugging and testing
            to inline code explanation, refactoring, and documentation. OrbitAI
            interacts seamlessly with your codebase and assists you in real
            time, helping you move faster and with more confidence. Choose the
            built-in AI or integrate your preferred models for maximum
            flexibility.
          </p>
          <p className={styles.description}>
            OrbitAI Code Assist empower developers with everything from error
            detection to automated fixes and intelligent recommendations. Sign
            up now to get early access and experience the future of AI-powered
            coding with OrbitAI.
          </p>
          <Link to="/access" className={styles.cta}>
            Get Started
          </Link>
        </div>
        <div className={styles.right}>
          <div className={styles.chat}>
            <div className={styles.userMessage}>
              I’m getting a runtime error when fetching data, any idea why?
            </div>
            <div className={styles.botMessage}>
              <p>
                The error happens because there’s no error boundary wrapping
                your fetch logic. This means when the request fails, the whole
                component crashes.
              </p>
              <div className={styles.codeBox}>
                <span className={styles.codeTitle}>
                  Suggested fix: Wrap with an error boundary
                </span>
                <span className={styles.codeFile}>
                  src/components/DataFetcher.tsx
                </span>
                <pre>
                  {`try {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Request failed");
  const data = await response.json();
  setData(data);
} catch (error) {
  setError(error.message);
}`}
                </pre>
              </div>
              <p>
                This way, your component will show an error state instead of
                crashing when the fetch fails.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
