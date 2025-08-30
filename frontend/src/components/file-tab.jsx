import { useState } from "react";
import { Resizable } from "re-resizable";
import styles from "./css/filetab.module.css";

import Tree from "./tree";
function Filetab({ option }) {
  const [isResizing, setIsResizing] = useState(false);

  return (
    <>
      {option !== -1 ? (
        <Resizable
          defaultSize={{ width: "15%", height: "100%" }}
          minWidth="10%"
          maxWidth="50%"
          enable={{ right: true }}
          style={{
            borderRight: isResizing ? "6px solid #4051b5" : "0.1px solid #a09f9f",
            padding: "10px",
            height: "100%",
            boxSizing: "border-box",
            backgroundColor: "#212121",
            flexShrink: 0,
          }}
          onResizeStart={() => setIsResizing(true)}
          onResizeStop={() => setIsResizing(false)}
        >
          <div className={styles.tab}>
            <Tree />
          </div>
        </Resizable>
      ) : null}
    </>
  );
}
export default Filetab;
