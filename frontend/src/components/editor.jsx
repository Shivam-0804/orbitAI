import Editor from "@monaco-editor/react";
import styles from "./css/editor.module.css";
import { File, X } from "lucide-react";

export default function EditorWindow({
  openTabs,
  activeTab,
  setActiveTab,
  handleCloseTab,
  handleContentChange,
}) {
  const activeFile = openTabs.find((tab) => tab.path === activeTab);

  const getLanguage = (fileName) => {
    if (!fileName) return "plaintext";
    const extension = fileName.split(".").pop();
    switch (extension) {
      case "js":
      case "jsx":
        return "javascript";
      case "css":
        return "css";
      case "json":
        return "json";
      case "html":
        return "html";
      case "md":
        return "markdown";
      default:
        return "plaintext";
    }
  };

  return (
    <>
      {/* activeTab === tab.path */}
      {/* Tab Bar */}
      <div className={styles.tabs}>
        {openTabs.map((tab) => (
          <div
            key={tab.path}
            onClick={() => setActiveTab(tab.path)}
            className={`${styles.subtabs} ${
              activeTab === tab.path ? styles.active : ""
            }`}
          >
            <File className={styles["subtabs-icons"]} />
            <span className="select-none">{tab.name}</span>
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleCloseTab(tab.path);
              }}
            >
              <X className={styles["subtabs-close"]} />
            </div>
          </div>
        ))}
      </div>

      {/* Editor Content */}
      <div className={styles.editor}>
        {activeFile ? (
          <Editor
            height="100%"
            width="100%"
            language={getLanguage(activeFile.name)}
            value={activeFile.content}
            onChange={(value) =>
              handleContentChange(activeFile.path, value || "")
            }
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: "on",
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        ) : (
          <div className={styles["empty-bg"]}>
            <img src="./empty.svg" className={styles["empty-img"]}></img>
            <h1 className={styles.tagline}>
              Your Instant Development Environment
            </h1>
            <p className={styles.para}>
              Just open a tab to a consistent, powerful, and ready-to-use
              workspace, and focus purely on your code.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
