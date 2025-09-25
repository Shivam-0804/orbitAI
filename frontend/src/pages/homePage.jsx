import styles from "./css/home.module.css";
import { BringToFront, MoveRight, Grip } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AnimatedTerminal from "../ui/terminal_animation";
import WelcomeTerminal from "../ui/terminal_welcome";

export default function HomePage() {
  const [showTools, setShowTools] = useState(false);
  const toolsRef = useRef(null);
  useEffect(() => {
    function handleClickOutside(event) {
      if (toolsRef.current && !toolsRef.current.contains(event.target)) {
        setShowTools(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  return (
    <div className={styles.parent_container}>
      <div className={styles.nav_bar}>
        <div className={styles.nav_left}>
          <Link to="/">
            <img src="./white_logo.svg" alt="" className={styles.logo} />
          </Link>
          <div className={styles.options}>
            <Link className={styles.options_item}>Docs</Link>
            <a href="#about" className={styles.options_item}>About</a>
          </div>
        </div>

        <div className={styles.nav_right}>
          <div className={styles.tools_tab}>
            <Grip
              className={styles.tools}
              onClick={() => setShowTools((showTools) => !showTools)}
              ref={toolsRef}
            />
            <div
              className={`${styles.tools_container} ${
                showTools ? styles.show : ""
              }`}
            ></div>
          </div>

          <Link to="/access" className={styles.explore}>
            <p>Expore</p>
            <MoveRight style={{ height: "18px", width: "auto" }} />
          </Link>
        </div>
      </div>
      <section className={styles.container}>
        <div className={styles.container_left}>
          <div className={styles.content}>
            <hgroup className={styles.headings}>
              <h1 className={styles.mainHeading}>Instant Development</h1>
              <h2 className={styles.subHeading}>Environment</h2>
            </hgroup>
            <p className={styles.description}>
              Just open a tab to a consistent, powerful, and ready-to-use
              workspace, and focus purely on your code.
            </p>
            <Link to="/access" className={styles.ctaButton}>
              <span>Try Now</span>
              <MoveRight size={18} />
            </Link>
          </div>
        </div>

        <div className={styles.imageContainer}>
          <div className={styles.animatedTerminal}><AnimatedTerminal /></div>
          <div className={styles.welcomeTerminal}><WelcomeTerminal /></div>
        </div>
      </section>
    </div>
  );
}
