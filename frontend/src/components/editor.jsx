import Editor from "@monaco-editor/react";
import styles from "./css/explorer.module.css";
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
    <div className="flex flex-col h-full bg-gray-900 text-white flex-grow">
      {/* Tab Bar */}
      <div className="flex border-b border-gray-700 bg-[#212121]">
        {openTabs.map((tab) => (
          <div
            key={tab.path}
            onClick={() => setActiveTab(tab.path)}
            className={`flex items-center gap-2 px-4 py-2 text-sm cursor-pointer border-r border-gray-700 ${
              activeTab === tab.path
                ? "bg-[#2c2c2c]"
                : "bg-[#212121] hover:bg-[#2c2c2c]"
            }`}
          >
            <File />
            <span className="select-none">{tab.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCloseTab(tab.path);
              }}
              className="p-1 rounded-full hover:bg-gray-600"
            >
              <X />
            </button>
          </div>
        ))}
      </div>

      {/* Editor Content */}
      <div className="">
        {activeFile ? (
          <Editor
            key={activeFile.path}
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
            <div className={styles["empty-text"]}>fjaslfj;s</div>
          </div>
        )}
      </div>
    </div>
  );
}
