import { useState, useEffect, useRef, useCallback } from "react";
import styles from "./css/explorer.module.css";
import { FolderPlus, FilePlus2, ChevronDown, ChevronRight } from "lucide-react";
import { getFileIcon } from "../utils/getFileIcon";
import { exportProject } from "../utils/menu_helper/exportProject";
import { downloadFile } from "../utils/menu_helper/downloadFile";

const InputField = ({ initialName = "", onCancel, onSubmit, error }) => {
  const inputRef = useRef(null);
  const [value, setValue] = useState(initialName);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      onSubmit(value.trim());
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={onCancel}
      className={`${styles.createInput} ${error ? styles.errorInput : ""}`}
      onClick={(e) => e.stopPropagation()}
    />
  );
};

const CreatorInput = ({ type, onCancel, onCreate, error }) => {
  return (
    <div className={styles.create}>
      {type === "folder" ? (
        <img
          src="/icons/folder.svg"
          alt="folder"
          className={styles["folder-tab-icons"]}
        />
      ) : (
        <img
          src="/icons/file.svg"
          alt="file"
          className={styles["folder-tab-icons"]}
        />
      )}
      <InputField onCancel={onCancel} onSubmit={onCreate} error={error} />
    </div>
  );
};

const FolderItem = ({
  item,
  onFileClick,
  onDelete,
  onStartCreate,
  onStartRename,
  isCreating,
  isRenaming,
  openFolders,
  toggleFolder,
  activeTab,
  error,
  setError,
  active,
  setActive,
}) => {
  const isOpen = openFolders[item.path] || false;
  const isRenamingThis = isRenaming?.node?.path === item.path;

  const [menu, setMenu] = useState({ visible: false, x: 0, y: 0 });
  const menuRef = useRef(null);

  const handleContextMenu = (e) => {
    e.preventDefault();
    setMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
    });
  };
  const handleCopyPath = useCallback(async (path) => {
    await navigator.clipboard.writeText(path);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenu({ ...menu, visible: false });
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [menu]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (active === item.path) {
        if (e.key === "F2") {
          e.preventDefault();
          onStartRename(item, item.parentPath);
        }

        if (e.key === "Delete") {
          e.preventDefault();
          onDelete(item.path);
        }
        if (e.key.toLowerCase() === "c" && e.shiftKey && e.altKey) {
          e.preventDefault();
          handleCopyPath(item.path);
        }
        if (e.key.toLowerCase() === "n" && e.altKey && e.ctrlKey) {
          e.preventDefault();
          onStartCreate("file", item.path);
        }
        if (e.key.toLowerCase() === "f" && e.altKey && e.ctrlKey) {
          e.preventDefault();
          onStartCreate("folder", item.path);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [active, item, onStartRename, onDelete, handleCopyPath, onStartCreate]);

  return (
    <div
      className={`${styles["folder-item"]}`}
      onContextMenu={handleContextMenu}
      ref={menuRef}
      onClick={() => setActive(item.path)}
    >
      <div className={styles["folder-tab"]}>
        <div
          onClick={() => !isRenamingThis && toggleFolder(item.path)}
          className={styles["folder-tab-header"]}
        >
          {isOpen ? (
            <ChevronDown size={16} className={styles["folder-tab-icons"]} />
          ) : (
            <ChevronRight size={16} className={styles["folder-tab-icons"]} />
          )}
          <img
            src="/icons/folder.svg"
            alt="folder"
            className={styles["folder-tab-icons"]}
          />
          {isRenamingThis ? (
            <InputField
              initialName={item.name}
              onCancel={isRenaming.onCancel}
              onSubmit={isRenaming.onRename}
              error={error}
            />
          ) : (
            <span
              className={`${styles["folder-tab-name"]} ${styles[item.status]}`}
            >
              {item.name}
            </span>
          )}
        </div>
        <div className={styles["folder-tab-options"]}>
          <div
            onClick={() => onStartCreate("file", item.path)}
            title="New File"
          >
            <FilePlus2 size={16} className={styles["folder-tab-icons"]} />
          </div>
          <div
            onClick={() => onStartCreate("folder", item.path)}
            title="New Folder"
          >
            <FolderPlus size={16} className={styles["folder-tab-icons"]} />
          </div>
          <div className={styles[item.status]}>
            {item.status == "M"
              ? "M"
              : item.status == "A"
                ? "A"
                : item.status == "?"
                  ? "U"
                  : null}
          </div>
        </div>
      </div>
      {isOpen && !isRenamingThis && (
        <div className={styles["subfolders"]}>
          <FileExplorer
            items={item.children || []}
            onFileClick={onFileClick}
            onDelete={onDelete}
            onStartCreate={onStartCreate}
            onStartRename={onStartRename}
            parentPath={item.path}
            isCreating={isCreating}
            isRenaming={isRenaming}
            openFolders={openFolders}
            toggleFolder={toggleFolder}
            activeTab={activeTab}
            error={error}
            setError={setError}
          />
        </div>
      )}
      {menu.visible && (
        <div
          ref={menuRef}
          className={styles.fileOptions}
          style={{
            position: "fixed",
            top: `${menu.y}px`,
            left: `${menu.x}px`,
            background: "#222222",
            border: "0.1px solid #5d5d5dff",
            borderRadius: "6px",
            zIndex: 1000,
          }}
        >
          <div
            className={styles.optionItem}
            onClick={() => onStartCreate("file", item.path)}
          >
            New File
            <span className={styles.shortcut}>Alt+Ctrl+N</span>
          </div>
          <div
            className={styles.optionItem}
            onClick={() => onStartCreate("folder", item.path)}
          >
            New Folder
            <span className={styles.shortcut}>Alt+Ctrl+F</span>
          </div>
          <hr className={styles.line} />
          <div
            className={styles.optionItem}
            onClick={() => {
              exportProject([item]);
              setMenu({ ...menu, visible: false });
            }}
          >
            Export
          </div>
          <hr className={styles.line} />
          <div
            className={styles.optionItem}
            onClick={() => {
              handleCopyPath(item.path);
              setMenu({ ...menu, visible: false });
            }}
          >
            Copy Path
            <span className={styles.shortcut}>Alt+Shift+C</span>
          </div>
          <hr className={styles.line} />
          <div
            onClick={() => {
              onStartRename(item, item.parentPath);
              setMenu({ ...menu, visible: false });
            }}
            className={styles.optionItem}
          >
            Rename
            <span className={styles.shortcut}>F2</span>
          </div>
          <div
            onClick={() => {
              onDelete(item.path);
              setMenu({ ...menu, visible: false });
            }}
            className={styles.optionItem}
          >
            Delete
            <span className={styles.shortcut}>Delete</span>
          </div>
        </div>
      )}
    </div>
  );
};

const FileItem = ({
  item,
  onStartRename,
  onFileClick,
  onDelete,
  activeTab,
  isRenaming,
  error,
  setActive,
}) => {
  const iconSrc = getFileIcon(item.name);
  const isRenamingThis = isRenaming?.node?.path === item.path;

  const [menu, setMenu] = useState({ visible: false, x: 0, y: 0 });
  const menuRef = useRef(null);

  const handleCopyPath = useCallback(async (path) => {
    await navigator.clipboard.writeText(path);
  }, []);

  const handleContextMenu = (e) => {
    e.preventDefault();
    setMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
    });
  };
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenu({ ...menu, visible: false });
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [menu]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (activeTab === item.path) {
        if (e.key === "F2") {
          e.preventDefault();
          onStartRename(item, item.parentPath);
        }

        if (e.key === "Delete") {
          e.preventDefault();
          onDelete(item.path);
        }
        if (e.key.toLowerCase() === "c" && e.shiftKey && e.altKey) {
          e.preventDefault();
          handleCopyPath(item.path);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, item, onStartRename, onDelete, handleCopyPath]);

  return (
    <div
      className={`${styles["folder-tab"]} ${
        activeTab === item.path ? styles.activeFile : ""
      }`}
      onContextMenu={handleContextMenu}
      onClick={() => {
        !isRenamingThis && onFileClick(item);
        setActive(item.path);
      }}
    >
      {/* File Header */}
      <div className={`${styles["folder-tab-header"]}`}>
        <img src={iconSrc} alt="file" className={styles["folder-tab-icons"]} />
        {isRenamingThis ? (
          <InputField
            initialName={item.name}
            onCancel={isRenaming.onCancel}
            onSubmit={isRenaming.onRename}
            error={error}
          />
        ) : (
          <span
            className={`${styles["folder-tab-name"]} ${styles[item.status]}`}
          >
            {item.name}
          </span>
        )}
      </div>
      <div className={styles[item.status]}>
        {item.status == "M"
          ? "M"
          : item.status == "A"
            ? "A"
            : item.status == "?"
              ? "U"
              : null}
      </div>
      {/* Right-Click Menu */}
      {menu.visible && (
        <div
          ref={menuRef}
          className={styles.fileOptions}
          style={{
            position: "fixed",
            top: `${menu.y}px`,
            left: `${menu.x}px`,
            background: "#222222",
            border: "0.1px solid #5d5d5dff",
            borderRadius: "6px",
            zIndex: 1000,
          }}
        >
          <div className={styles.optionItem}>
            Run Code
            <span className={styles.shortcut}>Ctrl+Alt+R</span>
          </div>
          <hr className={styles.line} />
          <div
            className={styles.optionItem}
            onClick={() => {
              downloadFile(item.name, item.content);
              setMenu({ ...menu, visible: false });
            }}
          >
            Download File
          </div>
          <div
            className={styles.optionItem}
            onClick={() => {
              exportProject([item]);
              setMenu({ ...menu, visible: false });
            }}
          >
            Export
          </div>
          <hr className={styles.line} />
          <div
            className={styles.optionItem}
            onClick={() => {
              handleCopyPath(item.path);
              setMenu({ ...menu, visible: false });
            }}
          >
            Copy Path
            <span className={styles.shortcut}>Alt+Shift+C</span>
          </div>
          <hr className={styles.line} />
          <div
            onClick={() => {
              onStartRename(item, item.parentPath);
              setMenu({ ...menu, visible: false });
            }}
            className={styles.optionItem}
          >
            Rename
            <span className={styles.shortcut}>F2</span>
          </div>
          <div
            onClick={() => {
              onDelete(item.path);
              setMenu({ ...menu, visible: false });
            }}
            className={styles.optionItem}
          >
            Delete
            <span className={styles.shortcut}>Delete</span>
          </div>
        </div>
      )}
    </div>
  );
};

const FileExplorer = ({
  items,
  onFileClick,
  onDelete,
  onStartCreate,
  onStartRename,
  parentPath,
  isCreating,
  isRenaming,
  openFolders,
  toggleFolder,
  activeTab,
  error,
  setError,
  active,
  setActive,
}) => {
  return (
    <>
      {items.map((item) =>
        item.type === "folder" ? (
          <FolderItem
            key={item.path}
            item={item}
            onFileClick={onFileClick}
            onDelete={onDelete}
            onStartCreate={onStartCreate}
            onStartRename={onStartRename}
            isCreating={isCreating}
            isRenaming={isRenaming}
            openFolders={openFolders}
            toggleFolder={toggleFolder}
            activeTab={activeTab}
            error={error}
            setError={setError}
            active={active}
            setActive={setActive}
          />
        ) : (
          <FileItem
            key={item.path}
            item={item}
            onStartRename={onStartRename}
            onFileClick={onFileClick}
            onDelete={onDelete}
            activeTab={activeTab}
            isRenaming={isRenaming}
            error={error}
            active={active}
            setActive={setActive}
          />
        )
      )}
      {isCreating && isCreating.parentPath === parentPath && (
        <CreatorInput {...isCreating} error={error} />
      )}
    </>
  );
};

export default function Explorer({
  fileSystem,
  handleFileClick,
  handleDelete,
  handleStartCreate,
  handleStartRename,
  isCreating,
  isRenaming,
  activeTab,
  error,
  setError,
}) {
  const [openFolders, setOpenFolders] = useState({ "/": true });
  const [active, setActive] = useState("");

  const toggleFolder = (path) => {
    setOpenFolders((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const handleStartCreateAndOpen = (type, parentPath) => {
    if (parentPath) {
      setOpenFolders((prev) => ({
        ...prev,
        [parentPath]: true,
      }));
    }
    handleStartCreate(type, parentPath);
  };

  return (
    <div className={styles["main-tab-window"]}>
      <div className={styles["main-header"]}>
        <h2 className={styles["main-header-text"]}>Explorer</h2>
        <div className={styles["main-header-icons"]}>
          <div
            onClick={() => handleStartCreateAndOpen("file", "/")}
            title="New File"
          >
            <FilePlus2 size={16} className={styles["folder-tab-icons"]} />
          </div>
          <div
            onClick={() => handleStartCreateAndOpen("folder", "/")}
            title="New Folder"
          >
            <FolderPlus size={16} className={styles["folder-tab-icons"]} />
          </div>
        </div>
      </div>
      <div>
        <FileExplorer
          items={fileSystem}
          onFileClick={handleFileClick}
          onDelete={handleDelete}
          onStartCreate={handleStartCreateAndOpen}
          onStartRename={handleStartRename}
          parentPath={"/"}
          isCreating={isCreating}
          isRenaming={isRenaming}
          openFolders={openFolders}
          toggleFolder={toggleFolder}
          activeTab={activeTab}
          error={error}
          setError={setError}
          active={active}
          setActive={setActive}
        />
      </div>
    </div>
  );
}
