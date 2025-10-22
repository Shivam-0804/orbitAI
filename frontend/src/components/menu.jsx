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

function MenuOption({
  title,
  subOptions,
  activeMenu,
  setActiveMenu,
  type,
  selectedOptions,
  handleOptionSelect,
}) {
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
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (type === "checkboxGroup") {
                    handleOptionSelect(groupIdx, item.label);
                  } else {
                    handleItemClick(e, item.action);
                  }
                }}
              >
                {type === "checkboxGroup" ? (
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={selectedOptions[groupIdx] === item.label}
                      onChange={() => handleOptionSelect(groupIdx, item.label)}
                    />
                    {item.label}
                  </label>
                ) : (
                  <>
                    {item.label}
                    {item.shortcut && (
                      <span style={{ color: "#ccc" }}>{item.shortcut}</span>
                    )}
                    {item.icon && <item.icon size={14} color="#ccc" />}
                  </>
                )}
                {item.subCat && type !== "checkboxGroup" && (
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

export default function Menu({
  fileSystem,
  setFileSystem,
  showTerminal,
  setShowTerminal,
  activeTab,
  terminalApiRef,
}) {
  const [activeMenu, setActiveMenu] = useState(null);
  const [commandToRun, setCommandToRun] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({
    0: "Client-Side Execution",
  });
  const fileInputRef = useRef(null);

  const handleOpenFileClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const newFile = {
        type: "file",
        name: file.name,
        path: `/${file.name}`,
        content: content,
        status: "?",
      };

      setFileSystem((prevFileSystem) => {
        const newFileSystem = JSON.parse(JSON.stringify(prevFileSystem));
        const root = newFileSystem.find((node) => node.path === "/");

        if (root && root.children) {
          const existingFileIndex = root.children.findIndex(
            (child) => child.path === newFile.path
          );
          if (existingFileIndex !== -1) {
            root.children[existingFileIndex] = newFile;
          } else {
            root.children.push(newFile);
          }
        }
        return newFileSystem;
      });
    };
    reader.readAsText(file);
    event.target.value = null;
  };

  const menuItems = (setShowTerminal) => [
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
            action: handleOpenFileClick,
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
        [{ label: "Export", action: () => exportProject(fileSystem) }],
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
    {
      title: "Run",
      subOptions: [
        [
          { label: "Run", shortcut: "Ctrl+Shift" },
          { label: "Debug", shortcut: "F4" },
        ],
      ],
    },
    {
      title: "Options",
      type: "checkboxGroup",
      subOptions: [
        [
          { label: "Server-Side Execution" },
          { label: "Client-Side Execution" },
        ],
      ],
    },
    {
      title: "Help",
      subOptions: [
        [
          { label: "Show all Shortcuts" },
          { label: "All Commands", shortcut: "F1" },
          { label: "Documentation" },
        ],
        [{ label: "Github" }],
        [{ label: "Feedback" }],
        [{ label: "About" }],
      ],
    },
  ];

  const handleOptionSelect = (groupIdx, label) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [groupIdx]: label,
    }));
  };

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

  useEffect(() => {
    if (commandToRun && showTerminal && terminalApiRef?.current) {
      terminalApiRef.current.runCommand(commandToRun);
      setCommandToRun(null);
    }
  }, [commandToRun, showTerminal, terminalApiRef]);

  const handleRun = () => {
    const runMode = selectedOptions[0];
    if (!activeTab) {
      alert("No active file to run.");
      return;
    }
    const extension = activeTab.split(".").pop();
    let command = "";

    if (runMode === "Server-Side Execution") {
      command = `run ${activeTab}`;
    } else {
      switch (extension) {
        case "py":
          command = `python ${activeTab}`;
          break;
        case "cpp":
          command = `cpp ${activeTab}`;
          break;
        case "c":
          command = `c ${activeTab}`;
          break;
        case "java":
          command = `java ${activeTab}`;
          break;
        case "js":
          alert("JavaScript files can only be run via Server-Side Execution.");
          return;
        default:
          alert(
            `Running ".${extension}" files on the client-side is not supported.`
          );
          return;
      }
    }

    setCommandToRun(command);
    if (!showTerminal) {
      setShowTerminal(true);
    }
  };

  return (
    <div className={styles.mainMenu}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      <div className={styles.menu}>
        {menuItems(setShowTerminal).map((item, idx) => (
          <MenuOption
            key={idx}
            title={item.title}
            subOptions={item.subOptions}
            activeMenu={activeMenu}
            setActiveMenu={setActiveMenu}
            type={item.type}
            selectedOptions={selectedOptions}
            handleOptionSelect={handleOptionSelect}
          />
        ))}
      </div>
      <div className={styles.moreOptions}>
        <div title={activeTab ? "Run" : "No active file to run"}>
          <Play
            className={`${styles.run} ${!activeTab ? styles.disabled : ""}`}
            onClick={handleRun}
          />
        </div>
        <MoreHorizontal className={styles.otherOptions} />
      </div>
    </div>
  );
}
