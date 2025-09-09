import { useState, useEffect, useRef } from "react";
import styles from "./css/explorer.module.css";
import {
  FolderPlus,
  FilePlus2,
  Trash,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
import { getFileIcon } from "../utils/getFileIcon";

const CreatorInput = ({ type, onCancel, onCreate }) => {
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      onCreate(e.target.value);
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

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
      <input
        ref={inputRef}
        type="text"
        onKeyDown={handleKeyDown}
        onBlur={onCancel}
        className={styles.createInput}
      />
    </div>
  );
};

const FolderItem = ({
  item,
  onFileClick,
  onDelete,
  onStartCreate,
  isCreating,
  openFolders,
  toggleFolder,
  activeTab,
}) => {
  const isOpen = openFolders[item.path] || false;

  return (
    <div className={styles["folder-item"]}>
      <div className={styles["folder-tab"]}>
        <div
          onClick={() => toggleFolder(item.path)}
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
          <span className={styles["folder-tab-name"]}>{item.name}</span>
        </div>
        <div className={styles["folder-tab-options"]}>
          <div onClick={() => onStartCreate("file", item.path)}>
            <FilePlus2 size={16} className={styles["folder-tab-icons"]} />
          </div>
          <div onClick={() => onStartCreate("folder", item.path)}>
            <FolderPlus size={16} className={styles["folder-tab-icons"]} />
          </div>
          {item.name !== "/" ? (
            <div onClick={() => onDelete(item.path)}>
              <Trash size={16} className={styles["folder-tab-icons"]} />
            </div>
          ) : (
            <div onClick={() => onDelete(item.path)}>
              <MoreHorizontal
                size={16}
                className={styles["folder-tab-icons"]}
              />
            </div>
          )}
        </div>
      </div>
      {isOpen && (
        <div className={styles["subfolders"]}>
          <FileExplorer
            items={item.children || []}
            onFileClick={onFileClick}
            onDelete={onDelete}
            onStartCreate={onStartCreate}
            parentPath={item.path}
            isCreating={isCreating}
            openFolders={openFolders}
            toggleFolder={toggleFolder}
            activeTab={activeTab}
          />
        </div>
      )}
    </div>
  );
};

const FileItem = ({ item, onFileClick, onDelete, activeTab }) => {
  const iconSrc = getFileIcon(item.name);
  return (
    <div
      className={`${styles["folder-tab"]} ${
        activeTab == item.path ? styles.activeFile : ""
      }`}
    >
      <div
        onClick={() => onFileClick(item)}
        className={styles["folder-tab-header"]}
      >
        <div></div>
        <img src={iconSrc} alt="file" className={styles["folder-tab-icons"]} />
        <span className={styles["folder-tab-name"]}>{item.name}</span>
      </div>
      <div
        onClick={() => onDelete(item.path)}
        className={styles["folder-tab-options"]}
      >
        <Trash size={16} className={styles["folder-tab-icons"]} />
      </div>
    </div>
  );
};

const FileExplorer = ({
  items,
  onFileClick,
  onDelete,
  onStartCreate,
  parentPath,
  isCreating,
  openFolders,
  toggleFolder,
  activeTab,
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
            isCreating={isCreating}
            openFolders={openFolders}
            toggleFolder={toggleFolder}
            activeTab={activeTab}
          />
        ) : (
          <FileItem
            key={item.path}
            item={item}
            onFileClick={onFileClick}
            onDelete={onDelete}
            activeTab={activeTab}
          />
        )
      )}
      {isCreating && isCreating.parentPath === parentPath && (
        <CreatorInput {...isCreating} />
      )}
    </>
  );
};

export default function Explorer({
  fileSystem,
  handleFileClick,
  handleDelete,
  handleStartCreate,
  isCreating,
  activeTab,
}) {
  const [openFolders, setOpenFolders] = useState({});

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
        <div>
          <MoreHorizontal size={16} className={styles["main-header-icon"]} />
        </div>
      </div>
      <div>
        <FileExplorer
          items={fileSystem}
          onFileClick={handleFileClick}
          onDelete={handleDelete}
          onStartCreate={handleStartCreateAndOpen}
          parentPath={null}
          isCreating={isCreating}
          openFolders={openFolders}
          toggleFolder={toggleFolder}
          activeTab={activeTab} // <-- pass it down
        />
      </div>
    </div>
  );
}
