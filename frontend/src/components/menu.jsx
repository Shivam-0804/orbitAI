import { useState, useEffect, useRef } from "react";
import styles from "./css/menu.module.css";
import {
  MoreHorizontal,
  Play,
  Github,
  HardDriveUpload,
  ChevronRight,
} from "lucide-react";
import { exportProject } from "../utils/menu_helper/exportProject";

function handleSubOptionClick(menu, option) {
  alert(`${option} clicked in ${menu}`);
}

const menuItems = (initialFileSystem, setShowTerminal) => [
  {
    title: "File",
    subOptions: [
      [
        {
          label: "New File",
          action: () => handleSubOptionClick("File", "New File"),
        },
        {
          label: "Open File",
          action: () => handleSubOptionClick("File", "Open File"),
        },
      ],
      [
        { label: "Save", action: () => handleSubOptionClick("File", "Save") },
        {
          label: "Save To",
          icon: ChevronRight,
          action: null,
          subCat: [
            [
              {
                label: "Google Drive",
                action: () => handleSubOptionClick("File", "Google Drive"),
                icon: HardDriveUpload,
              },
            ],
            [
              {
                label: "GitHub",
                action: () => handleSubOptionClick("File", "GitHub"),
                icon: Github,
              },
            ],
          ],
        },
      ],
      [{ label: "Export", action: () => exportProject(initialFileSystem) }],
    ],
  },
  {
    title: "Terminal",
    subOptions: [
      [
        {
          label: "Open Terminal",
          action: () => setShowTerminal(true),
          shortcut: "Ctrl+Alt+T",
        },
        {
          label: "New Terminal",
          action: () => setShowTerminal(true),
          shortcut: "Ctrl+Alt+N",
        },
      ],
      [
        {
          label: "Close Terminal",
          action: () => setShowTerminal(false),
          shortcut: "Ctrl+Alt+X",
        },
      ],
    ],
  },
];

function MenuOption({ title, subOptions, activeMenu, setActiveMenu }) {
  const menuRef = useRef();
  const isActive = activeMenu === title;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setActiveMenu]);

  const handleItemClick = (e, action) => {
    e.preventDefault();
    if (action) {
      action();
    }
    setActiveMenu(null);
  };

  return (
    <div
      className={styles.options}
      ref={menuRef}
      {...(activeMenu !== null
        ? { onMouseEnter: () => setActiveMenu(title) }
        : {})}
    >
      <h3
        className={styles.optionsHeader}
        onClick={() => setActiveMenu(isActive ? null : title)}
      >
        {title}
      </h3>
      <div
        className={`${styles.suboptions} ${isActive ? styles.displayOptions : ""}`}
      >
        {subOptions.map((group, groupIdx) => (
          <ul className={styles.list} key={groupIdx}>
            {group.map((item, idx) => (
              <li
                key={idx}
                className={styles.listItems}
                onMouseDown={(e) => handleItemClick(e, item.action)}
              >
                {item.label}
                {item.shortcut && (
                  <span style={{ color: "#ccc" }}>{item.shortcut}</span>
                )}
                {item.icon && <item.icon size={14} color="#ccc" />}
                {item.subCat && (
                  <div className={styles.subCatWrapper}>
                    {item.subCat.map((innerArray, outerIndex) => (
                      <ul key={outerIndex} className={styles.subCat}>
                        {innerArray.map((subItem, innerIndex) => (
                          <li
                            key={innerIndex}
                            className={styles.listItems}
                            onMouseDown={(e) =>
                              handleItemClick(e, subItem.action)
                            }
                          >
                            {subItem.label}
                            {subItem.icon && (
                              <subItem.icon size={14} color="#ccc" />
                            )}
                          </li>
                        ))}
                        {outerIndex < item.subCat.length - 1 && (
                          <hr className={styles.divider} />
                        )}
                      </ul>
                    ))}
                  </div>
                )}
              </li>
            ))}
            {groupIdx < subOptions.length - 1 && (
              <hr className={styles.divider} />
            )}
          </ul>
        ))}
      </div>
    </div>
  );
}

export default function Menu({ initialFileSystem, setShowTerminal }) {
  const [activeMenu, setActiveMenu] = useState(null);
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && e.ctrlKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        setShowTerminal(true);
      }
      if (e.altKey && e.ctrlKey && e.key.toLowerCase() === "x") {
        e.preventDefault();
        setShowTerminal(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [setShowTerminal]);
  return (
    <div className={styles.mainMenu}>
      {/* Left menu */}
      <div className={styles.menu}>
        {menuItems(initialFileSystem, setShowTerminal).map((item, idx) => (
          <MenuOption
            key={idx}
            title={item.title}
            subOptions={item.subOptions}
            activeMenu={activeMenu}
            setActiveMenu={setActiveMenu}
          />
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