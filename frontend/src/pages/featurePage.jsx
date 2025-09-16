import Tiles from "../ui/tiles";
import styles from "./css/featurePage.module.css";

import {
  BrainCircuit,
  Cpu,
  UsersRound,
  FolderCode,
  Zap,
  Shield,
} from "lucide-react";
const info = [
  {
    icon: BrainCircuit,
    title: "AI-Powered Coding",
    desc: "Inline code explanations, auto test-case generation, and instant documentation powered by AI — making development smarter and faster.",
  },
  {
    icon: Cpu,
    title: "Hybrid Execution",
    desc: "Run code seamlessly in the browser (WebContainers, Pyodide, WASM) or use backend execution for heavy languages like Java.",
  },
  {
    icon: UsersRound,
    title: "Real-Time Collaboration",
    desc: "Work together like Google Docs with shared cursors, inline comments, and even built-in voice/video chat.",
  },
  {
    icon: FolderCode,
    title: "Smart Project Handling",
    desc: "Drag & drop projects, instant setup, GitHub/GitLab integration, and inline PR reviews — streamlined workflows from start to finish.",
  },
  {
    icon: Zap,
    title: "Performance",
    desc: "A blazing-fast, distraction-free IDE with PWA support that works smoothly, even without internet.",
  },
  {
    icon: Shield,
    title: "Self-Hosted & Secure",
    desc: "Host Orbit on your own infrastructure or embed it into workflows for full control, customization, and data security.",
  },
];
export default function Features() {
  return (
    <div className={styles.container}>
      <div className={styles.heading}>Features</div>
      <div className={styles.cards_container}>
        <div className={styles.cards}>
          {info.map((ele, idx) => {
            const Icon = ele.icon;
            return (
              <div className={styles.card} key={idx}>
                <Tiles className={styles.tile} />
                <div className={styles.content}>
                  <Icon className={styles.card_icon} />
                  <h3 className={styles.card_heading}>{ele.title}</h3>
                  <p className={styles.card_desc}>{ele.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
