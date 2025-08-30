import { useState } from "react";
import { Resizable } from "re-resizable";
import Explorer from "./explorer";

function Filetab({
  option,
  fileSystem,
  handleFileClick,
  handleDelete,
  handleStartCreate,
  isCreating,
}) {
  const [isResizing, setIsResizing] = useState(false);

  return (
    <>
      {option !== -1 ? (
        <Resizable
          defaultSize={{ width: "18%", height: "100%" }}
          minWidth="10%"
          maxWidth="50%"
          enable={{ right: true }}
          style={{
            borderRight: isResizing
              ? "2px solid #4051b5"
              : "0.1px solid #4d4d4d",
            height: "100%",
            boxSizing: "border-box",
            backgroundColor: "#181818",
            flexShrink: 0,
          }}
          onResizeStart={() => setIsResizing(true)}
          onResizeStop={() => setIsResizing(false)}
        >
          <Explorer
            fileSystem={fileSystem}
            handleFileClick={handleFileClick}
            handleDelete={handleDelete}
            handleStartCreate={handleStartCreate}
            isCreating={isCreating}
          />
        </Resizable>
      ) : null}
    </>
  );
}
export default Filetab;

