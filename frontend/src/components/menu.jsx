import styles from "./css/menu.module.css";
import { MoreHorizontal, Play } from "lucide-react";

function handleSubOptionClick(menu, option) {
  alert(`${option} clicked in ${menu}`);
}

// Menu data: each menu has a title and its own suboptions with action callbacks
const menuItems = [
  {
    title: "File",
    subOptions: [
      { label: "New File", action: () => handleSubOptionClick("File", "New File") },
      { label: "Open File", action: () => handleSubOptionClick("File", "Open File") },
      { label: "Save", action: () => handleSubOptionClick("File", "Save") },
      { label: "Save As", action: () => handleSubOptionClick("File", "Save As") },
    ],
  },
  {
    title: "Edit",
    subOptions: [
      { label: "Undo", action: () => handleSubOptionClick("Edit", "Undo") },
      { label: "Redo", action: () => handleSubOptionClick("Edit", "Redo") },
      { label: "Cut", action: () => handleSubOptionClick("Edit", "Cut") },
      { label: "Copy", action: () => handleSubOptionClick("Edit", "Copy") },
      { label: "Paste", action: () => handleSubOptionClick("Edit", "Paste") },
    ],
  },
  {
    title: "Terminal",
    subOptions: [
      { label: "New Terminal", action: () => handleSubOptionClick("Terminal", "New Terminal") },
      { label: "Split Terminal", action: () => handleSubOptionClick("Terminal", "Split Terminal") },
      { label: "Close Terminal", action: () => handleSubOptionClick("Terminal", "Close Terminal") },
    ],
  },
  {
    title: "Run",
    subOptions: [
      { label: "Run File", action: () => handleSubOptionClick("Run", "Run File") },
      { label: "Debug", action: () => handleSubOptionClick("Run", "Debug") },
      { label: "Stop", action: () => handleSubOptionClick("Run", "Stop") },
    ],
  },
  {
    title: "Help",
    subOptions: [
      { label: "Documentation", action: () => handleSubOptionClick("Help", "Documentation") },
      { label: "Check for Updates", action: () => handleSubOptionClick("Help", "Check for Updates") },
      { label: "About", action: () => handleSubOptionClick("Help", "About") },
    ],
  },
];

// Reusable MenuOption component
function MenuOption({ title, subOptions }) {
  return (
    <div className={styles.options}>
      <h3 className={styles.optionsHeader}>{title}</h3>
      <div className={styles.suboptions}>
        <ul className={styles.list}>
          {subOptions.map((item, idx) => (
            <li key={idx} onClick={item.action}>
              {item.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Main Menu component
export default function Menu() {
  return (
    <div className={styles.mainMenu}>
      {/* Top menu */}
      <div className={styles.menu}>
        {menuItems.map((item, idx) => (
          <MenuOption key={idx} title={item.title} subOptions={item.subOptions} />
        ))}
      </div>

      {/* Right-side controls */}
      <div className={styles.moreOptions}>
        <Play className={styles.run} />
        <MoreHorizontal className={styles.otherOptions} />
      </div>
    </div>
  );
}
