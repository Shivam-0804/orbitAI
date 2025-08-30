import React, { useState, useRef, useEffect } from 'react';

// --- DUMMY DATA ---
const initialFileSystem = [
  {
    type: 'folder',
    name: 'src',
    path: '/src',
    children: [
      {
        type: 'folder',
        name: 'components',
        path: '/src/components',
        children: [
          { type: 'file', name: 'Button.jsx', path: '/src/components/Button.jsx', content: 'export default function Button() {\n  return <button>Click Me</button>;\n}' },
          { type: 'file', name: 'Header.jsx', path: '/src/components/Header.jsx', content: 'export default function Header() {\n  return <h1>My App</h1>;\n}' },
        ],
      },
      { type: 'file', name: 'App.jsx', path: '/src/App.jsx', content: 'import React from "react";\n\nfunction App() {\n  return <div>Hello World</div>;\n}\n\nexport default App;' },
    ],
  },
  { type: 'file', name: 'package.json', path: '/package.json', content: '{ "name": "react-app" }' },
];

// --- SVG ICONS ---
const FolderIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path></svg>;
const FileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"></path></svg>;
const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"></path></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" x2="10" y1="11" y2="17"></line><line x1="14" x2="14" y1="11" y2="17"></line></svg>;
const FilePlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" x2="12" y1="18" y2="12"></line><line x1="9" x2="15" y1="15" y2="15"></line></svg>;
const FolderPlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path><line x1="12" x2="12" y1="10" y2="16"></line><line x1="9" x2="15" y1="13" y2="13"></line></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line></svg>;


// --- CREATOR INPUT COMPONENT ---
const CreatorInput = ({ type, onCancel, onCreate }) => {
    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            onCreate(e.target.value);
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    return (
        <div className="flex items-center gap-2 p-1.5">
            {type === 'folder' ? <FolderIcon /> : <FileIcon />}
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


// --- FOLDER COMPONENT ---
const FolderItem = ({ item, onFileClick, onDelete, onStartCreate, isCreating }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="w-full">
      <div className="flex items-center group w-full pr-2">
        <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 flex-grow w-full text-left hover:bg-gray-700 rounded-md p-1.5">
          {isOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
          <FolderIcon />
          <span className="truncate">{item.name}</span>
        </button>
        <div className="flex items-center opacity-0 group-hover:opacity-100">
            <button onClick={() => onStartCreate('file', item.path)} className="p-1 rounded hover:bg-gray-600"><FilePlusIcon /></button>
            <button onClick={() => onStartCreate('folder', item.path)} className="p-1 rounded hover:bg-gray-600"><FolderPlusIcon /></button>
            <button onClick={() => onDelete(item.path)} className="p-1 rounded hover:bg-gray-600"><TrashIcon /></button>
        </div>
      </div>
      {isOpen && (
        <div className="pl-4 border-l border-gray-700 ml-2">
          <FileExplorer
            items={item.children}
            onFileClick={onFileClick}
            onDelete={onDelete}
            onStartCreate={onStartCreate}
            isCreating={isCreating}
            parentPath={item.path}
          />
        </div>
      )}
    </div>
  );
};

// --- FILE COMPONENT ---
const FileItem = ({ item, onFileClick, onDelete }) => {
  return (
    <div className="flex items-center group w-full pr-2">
      <button onClick={() => onFileClick(item)} className="flex items-center gap-2 flex-grow w-full text-left hover:bg-gray-700 rounded-md p-1.5">
        <div className="w-4 shrink-0"></div>
        <FileIcon />
        <span className="truncate">{item.name}</span>
      </button>
      <button onClick={() => onDelete(item.path)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-600"><TrashIcon /></button>
    </div>
  );
};

// --- RECURSIVE FILE EXPLORER COMPONENT ---
const FileExplorer = ({ items, onFileClick, onDelete, onStartCreate, isCreating, parentPath }) => {
  return (
    <>
      {items.map(item => (
        <div key={item.path} className="text-sm my-1">
          {item.type === 'folder' ? (
            <FolderItem
              item={item}
              onFileClick={onFileClick}
              onDelete={onDelete}
              onStartCreate={onStartCreate}
              isCreating={isCreating}
            />
          ) : (
            <FileItem item={item} onFileClick={onFileClick} onDelete={onDelete} />
          )}
        </div>
      ))}
      {isCreating && isCreating.parentPath === parentPath && (
        <CreatorInput {...isCreating} />
      )}
    </>
  );
};



export default function Tree() {
  const [fileSystem, setFileSystem] = useState(initialFileSystem);
  const [openTabs, setOpenTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [isCreating, setIsCreating] = useState(null);

  const addNodeByPath = (nodes, parentPath, newNode) => {
    return nodes.map(node => {
      if (node.path === parentPath) {
        return { ...node, children: [...(node.children || []), newNode] };
      }
      if (node.type === 'folder' && node.children) {
        return { ...node, children: addNodeByPath(node.children, parentPath, newNode) };
      }
      return node;
    });
  };

  const deleteNodeByPath = (nodes, path) => {
    return nodes.filter(node => {
      if (node.path === path) return false;
      if (node.type === 'folder' && node.children) {
        node.children = deleteNodeByPath(node.children, path);
      }
      return true;
    });
  };

  const updateNodeContentByPath = (nodes, path, newContent) => {
    return nodes.map(node => {
      if (node.path === path) {
        return { ...node, content: newContent };
      }
      if (node.type === 'folder' && node.children) {
        return { ...node, children: updateNodeContentByPath(node.children, path, newContent) };
      }
      return node;
    });
  };

  const handleStartCreate = (type, parentPath) => {
    const handleCreate = (name) => {
      if (!name || name.trim() === '') {
        setIsCreating(null);
        return;
      }

      const newPath = parentPath ? `${parentPath}/${name}` : `/${name}`;
      const newNode = { type, name, path: newPath };

      if (type === 'folder') {
        newNode.children = [];
      } else {
        newNode.content = ``;
      }

      if (parentPath === null) {
        setFileSystem(fs => [...fs, newNode]);
      } else {
        setFileSystem(fs => addNodeByPath(fs, parentPath, newNode));
      }
      setIsCreating(null);
    };
    
    setIsCreating({ type, parentPath, onCancel: () => setIsCreating(null), onCreate: handleCreate });
  };

  const handleDelete = (path) => {
    setFileSystem(currentFileSystem => deleteNodeByPath(currentFileSystem, path));
    handleCloseTab(path);
  };

  const handleContentChange = (path, newContent) => {
    setOpenTabs(tabs =>
      tabs.map(tab =>
        tab.path === path ? { ...tab, content: newContent } : tab
      )
    );
    setFileSystem(currentFileSystem =>
      updateNodeContentByPath(currentFileSystem, path, newContent)
    );
  };

  const handleFileClick = (file) => {
    const isAlreadyOpen = openTabs.some(tab => tab.path === file.path);
    if (!isAlreadyOpen) {
      setOpenTabs(tabs => [...tabs, file]);
    }
    setActiveTab(file.path);
  };

  const handleCloseTab = (path) => {
    const tabIndex = openTabs.findIndex(tab => tab.path === path);
    if (tabIndex === -1) return;

    const newTabs = openTabs.filter(tab => tab.path !== path);
    setOpenTabs(newTabs);

    if (activeTab === path) {
      if (newTabs.length > 0) {
        const newActiveIndex = Math.max(0, tabIndex - 1);
        setActiveTab(newTabs[newActiveIndex].path);
      } else {
        setActiveTab(null);
      }
    }
  };

  const activeFile = openTabs.find(tab => tab.path === activeTab);

  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans">
      {/* Left Panel: File Explorer */}
      <div className="w-64 border-r border-gray-700 p-2 flex flex-col">
        <div className="flex items-center justify-between p-2">
            <h2 className="text-lg font-semibold">Explorer</h2>
            <div>
                <button onClick={() => handleStartCreate('file', null)} className="p-1 rounded hover:bg-gray-700"><FilePlusIcon /></button>
                <button onClick={() => handleStartCreate('folder', null)} className="p-1 rounded hover:bg-gray-700"><FolderPlusIcon /></button>
            </div>
        </div>
        <div className="flex-grow overflow-y-auto">
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

      {/* Right Panel: Editor with Tabs */}
      <div className="flex-1 flex flex-col">
        {/* Tab Bar */}
        <div className="flex border-b border-gray-700">
            {openTabs.map(tab => (
                <div 
                    key={tab.path}
                    onClick={() => setActiveTab(tab.path)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm cursor-pointer border-r border-gray-700 ${activeTab === tab.path ? 'bg-gray-800' : 'bg-gray-900 hover:bg-gray-800'}`}
                >
                    <FileIcon />
                    <span>{tab.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); handleCloseTab(tab.path); }} className="p-1 rounded-full hover:bg-gray-600">
                        <CloseIcon />
                    </button>
                </div>
            ))}
        </div>
        {/* Content Display */}
        <div className="flex-1 bg-gray-800">
          {activeFile ? (
            <textarea
              key={activeFile.path}
              value={activeFile.content}
              onChange={(e) => handleContentChange(activeFile.path, e.target.value)}
              className="w-full h-full bg-gray-800 text-gray-300 p-8 outline-none resize-none font-mono"
              spellCheck="false"
            />
          ) : (
            <div className="p-8">
                <p className="text-gray-400">Select a file to begin editing or open a tab.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
