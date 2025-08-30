import { Resizable } from "re-resizable";
import { useState } from "react";
import styles from "./css/terminal.module.css";

export default function Terminal() {
  const [isResizing, setIsResizing] = useState(false);
  return (
    <Resizable
      defaultSize={{ width: "100%", height: "50%" }}
      minHeight={"10%"}
      maxHeight={"90%"}
      enable={{
        top: true,
      }}
      style={{
        borderTop: isResizing ? "6px solid #4051b5" : "1px solid #a09f9f",
        padding: "10px",
        height: "100vh",
        boxSizing: "border-box",
        backgroundColor: "#212121",
      }}
      onResizeStart={() => setIsResizing(true)}
      onResizeStop={() => setIsResizing(false)}
      className={styles.terminal}
    ></Resizable>
  );
}
