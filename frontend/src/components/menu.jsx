import styles from "./css/menu.module.css";
import { MoreHorizontal, Play } from "lucide-react";
import { exportProject } from "../utils/menu_helper/exportProject";

function handleSubOptionClick(menu, option) {
  alert(`${option} clicked in ${menu}`);
}

const menuItems = (initialFileSystem) => [
  {
    title: "File",
    subOptions: [
      [
        { label: "New File", action: () => handleSubOptionClick("File", "New File") },
        { label: "Open File", action: () => handleSubOptionClick("File", "Open File") },
        { label: "Save", action: () => handleSubOptionClick("File", "Save") },
        { label: "Save As", action: () => handleSubOptionClick("File", "Save As") },
      ],
      [
        { label: "Export", action: () => exportProject(initialFileSystem) },
      ],
    ],
  },
];

function MenuOption({ title, subOptions }) {
  return (
    <div className={styles.options}>
      <h3 className={styles.optionsHeader}>{title}</h3>
      <div className={styles.suboptions}>
        {subOptions.map((group, groupIdx) => (
          <ul className={styles.list} key={groupIdx}>
            {group.map((item, idx) => (
              <li key={idx} onClick={item.action}>
                {item.label}
              </li>
            ))}
            {groupIdx < subOptions.length - 1 && <hr className={styles.divider} />}
          </ul>
        ))}
      </div>
    </div>
  );
}


export default function Menu({ initialFileSystem }) {
  return (
    <div className={styles.mainMenu}>
      {/* Left menu */}
      <div className={styles.menu}>
        {menuItems(initialFileSystem).map((item, idx) => (
          <MenuOption key={idx} title={item.title} subOptions={item.subOptions} />
        ))}
      </div>

      {/* Right side controls */}
      <div className={styles.moreOptions}>
        <Play className={styles.run} />
        <MoreHorizontal className={styles.otherOptions} />
      </div>
    </div>
  );
}
