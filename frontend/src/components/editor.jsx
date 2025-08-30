import Editor from "@monaco-editor/react";
import styles from "./css/editor.module.css";

export default function EditorWindow() {
  return (
    <div className={styles["editor-window"]}>
      <div className={styles.tab}>tab</div>
      <div className={styles["editor-content"]}>
        <Editor
          height="100%"
          width="100%"
          defaultLanguage="javascript"
          defaultValue="// Start typing your code here..."
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            renderLineHighlight: "none",
          }}
          className="!border-none !outline-none"
        />
      </div>
    </div>
  );
}
