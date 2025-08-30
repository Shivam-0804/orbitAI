import { useState, useEffect, useRef } from "react";
import { FolderPlus, FilePlus2 } from "lucide-react";

// --- Icon Components ---
const FolderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" > <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path> </svg>
);
const FileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" > <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path> <polyline points="14 2 14 8 20 8"></polyline> </svg>
);
const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" > <path d="m9 18 6-6-6-6"></path> </svg>
);
const ChevronDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" > <path d="m6 9 6 6 6-6"></path> </svg>
);
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" > <path d="M3 6h18"></path> <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path> <line x1="10" x2="10" y1="11" y2="17"></line> <line x1="14" x2="14" y1="11" y2="17"></line> </svg>
);

// --- Component for user input when creating a new file/folder ---
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
    <div className="flex items-center gap-2 py-1 pl-5">
      {type === "folder" ? <FolderIcon /> : <FileIcon />}
      <input
        ref={inputRef}
        type="text"
        onKeyDown={handleKeyDown}
        onBlur={onCancel}
        className="bg-gray-800 text-white text-sm rounded px-1 flex-grow outline-none"
      />
    </div>
  );
};

// --- Component for a single folder item ---
const FolderItem = ({ item, onFileClick, onDelete, onStartCreate }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="flex flex-col">
      <div
        className="flex items-center justify-between rounded hover:bg-gray-700 cursor-pointer pr-2"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 p-1 flex-grow text-left"
        >
          {isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
          <FolderIcon />
          <span className="truncate">{item.name}</span>
        </button>
        <div
          className={`flex gap-1 transition-opacity duration-200 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
        >
          <button onClick={() => onStartCreate("file", item.path)} className="p-1 rounded hover:bg-gray-600" > <FilePlus2 size={14} /> </button>
          <button onClick={() => onStartCreate("folder", item.path)} className="p-1 rounded hover:bg-gray-600" > <FolderPlus size={14} /> </button>
          <button onClick={() => onDelete(item.path)} className="p-1 rounded hover:bg-gray-600" > <TrashIcon /> </button>
        </div>
      </div>
      {isOpen && (
        <div className="pl-4 border-l border-gray-600 ml-2">
          <FileExplorer
            items={item.children}
            onFileClick={onFileClick}
            onDelete={onDelete}
            onStartCreate={onStartCreate}
            parentPath={item.path}
          />
        </div>
      )}
    </div>
  );
};

// --- Component for a single file item ---
const FileItem = ({ item, onFileClick, onDelete }) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      className="flex items-center justify-between rounded hover:bg-gray-700 cursor-pointer pr-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        onClick={() => onFileClick(item)}
        className="flex items-center gap-2 p-1 flex-grow text-left"
      >
        <div className="w-4 shrink-0"></div> {/* Spacer */}
        <FileIcon />
        <span className="truncate">{item.name}</span>
      </button>
      <button
        onClick={() => onDelete(item.path)}
        className={`p-1 rounded hover:bg-gray-600 transition-opacity duration-200 ${isHovered ? "opacity-100" : "opacity-0"}`}
      >
        <TrashIcon />
      </button>
    </div>
  );
};

// --- Recursive component to render the file tree ---
const FileExplorer = ({ items, onFileClick, onDelete, onStartCreate, parentPath, isCreating }) => {
  return (
    <>
      {items.map((item) => (
        <div key={item.path} className="text-sm my-0.5">
          {item.type === "folder" ? (
            <FolderItem
              item={item}
              onFileClick={onFileClick}
              onDelete={onDelete}
              onStartCreate={onStartCreate}
            />
          ) : (
            <FileItem
              item={item}
              onFileClick={onFileClick}
              onDelete={onDelete}
            />
          )}
        </div>
      ))}
      {isCreating && isCreating.parentPath === parentPath && (
        <CreatorInput {...isCreating} />
      )}
    </>
  );
};

// --- Main Explorer component ---
export default function Explorer({ fileSystem, handleFileClick, handleDelete, handleStartCreate, isCreating }) {
  return (
    <div className="bg-[#212121] text-white flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b border-gray-700">
        <h2 className="text-sm font-bold">Explorer</h2>
        <div className="flex gap-2">
          <button onClick={() => handleStartCreate("file", null)} className="p-1 hover:bg-gray-700 rounded" > <FilePlus2 size={16} /> </button>
          <button onClick={() => handleStartCreate("folder", null)} className="p-1 hover:bg-gray-700 rounded" > <FolderPlus size={16} /> </button>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto p-1">
        <FileExplorer
          items={fileSystem}
          onFileClick={handleFileClick}
          onDelete={handleDelete}
          onStartCreate={handleStartCreate}
          isCreating={isCreating}
          parentPath={null}
        />
      </div>
    </div>
  );
}

