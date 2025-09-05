import { useState, useEffect, useRef } from "react";
import styles from "./css/explorer.module.css";
import {
  FolderPlus,
  FilePlus2,
  Trash,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { getFileIcon } from "../utils/getFileIcon";

// --- Creator Input ---
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

// --- Folder Item ---
const FolderItem = ({
  item,
  onFileClick,
  onDelete,
  onStartCreate,
  isCreating,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className={styles["folder-item"]}>
      <div className={styles["folder-tab"]}>
        <div
          onClick={() => setIsOpen(!isOpen)}
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
          {/* <Folder size={16} className={styles["folder-tab-icons"]} /> */}
          <span className={styles["folder-tab-name"]}>{item.name}</span>
        </div>

        {/* Hover Options */}
        <div className={styles["folder-tab-options"]}>
          <div onClick={() => onStartCreate("file", item.path)}>
            <FilePlus2 size={16} className={styles["folder-tab-icons"]} />
          </div>
          <div onClick={() => onStartCreate("folder", item.path)}>
            <FolderPlus size={16} className={styles["folder-tab-icons"]} />
          </div>
          <div onClick={() => onDelete(item.path)}>
            <Trash size={16} className={styles["folder-tab-icons"]} />
          </div>
        </div>
      </div>

      {isOpen && item.children?.length > 0 && (
        <div className={styles["subfolders"]}>
          <FileExplorer
            items={item.children}
            onFileClick={onFileClick}
            onDelete={onDelete}
            onStartCreate={onStartCreate}
            parentPath={item.path}
            isCreating={isCreating}
          />
        </div>
      )}
    </div>
  );
};

// --- File Item ---
const FileItem = ({ item, onFileClick, onDelete }) => {
  const iconSrc = getFileIcon(item.name);
  return (
    <div className={styles["folder-tab"]}>
      <div
        onClick={() => onFileClick(item)}
        className={styles["folder-tab-header"]}
      >
        <div></div> {/* Spacer */}
        <img src={iconSrc} alt="file" className={styles["folder-tab-icons"]} />
        {/* <File size={16} className={styles["folder-tab-icons"]} /> */}
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

// --- Recursive File Explorer ---
const FileExplorer = ({
  items,
  onFileClick,
  onDelete,
  onStartCreate,
  parentPath,
  isCreating,
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
          />
        ) : (
          <FileItem
            key={item.path}
            item={item}
            onFileClick={onFileClick}
            onDelete={onDelete}
          />
        )
      )}
      {isCreating && isCreating.parentPath === parentPath && (
        <CreatorInput {...isCreating} />
      )}
    </>
  );
};

// --- Main Explorer Component ---
export default function Explorer({
  fileSystem,
  handleFileClick,
  handleDelete,
  handleStartCreate,
  isCreating,
}) {
  return (
    <div className={styles["main-tab-window"]}>
      <div className={styles["main-header"]}>
        <h2 className={styles["main-header-text"]}>Explorer</h2>
        <div className={styles["main-header-icons"]}>
          <div onClick={() => handleStartCreate("file", null)}>
            <FilePlus2 size={16} className={styles["main-header-icon"]} />
          </div>
          <div onClick={() => handleStartCreate("folder", null)}>
            <FolderPlus size={16} className={styles["main-header-icon"]} />
          </div>
        </div>
      </div>
      <div>
        <FileExplorer
          items={fileSystem}
          onFileClick={handleFileClick}
          onDelete={handleDelete}
          onStartCreate={handleStartCreate}
          parentPath={null}
          isCreating={isCreating}
        />
      </div>
    </div>
  );
}
