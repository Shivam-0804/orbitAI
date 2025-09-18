import { useState, lazy, Suspense } from "react";
import { loader } from "@monaco-editor/react";
import Header from "../components/header.jsx";
import Options from "../components/options.jsx";
import FileTab from "../components/file-tab.jsx";
import TerminalWindow from "../components/terminal.jsx";
import Menu from "../components/menu.jsx";
import Footer from "../components/footer.jsx";

import "../global.css";

const EditorWindow = lazy(() => import("../components/editor.jsx"));

loader.config({
  paths: {
    vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.41.0/min/vs",
  },
});

const initialFileSystem = [
  {
    type: "folder",
    name: "/",
    path: "/",
    parentPath: null,
    children: [],
  },
];

const sorter = (a, b) => {
  if (a.type === "folder" && b.type !== "folder") return -1;
  if (a.type !== "folder" && b.type === "folder") return 1;
  return a.name.localeCompare(b.name);
};

export default function Orbit() {
  const [option, setOption] = useState(0);
  const [fileSystem, setFileSystem] = useState(initialFileSystem);
  const [openTabs, setOpenTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [isCreating, setIsCreating] = useState(null);
  const [isRenaming, setIsRenaming] = useState(null);
  const [error, setError] = useState(false);

  const findNodeByPath = (nodes, path) => {
    for (const node of nodes) {
      if (node.path === path) return node;
      if (node.type === "folder" && node.children) {
        const result = findNodeByPath(node.children, path);
        if (result) return result;
      }
    }
    return null;
  };

  const addNodeByPath = (nodes, parentPath, newNode) => {
    return nodes.map((node) => {
      if (node.path === parentPath) {
        return { ...node, children: [...node.children, newNode].sort(sorter) };
      }
      if (node.type === "folder" && node.children) {
        return {
          ...node,
          children: addNodeByPath(node.children, parentPath, newNode),
        };
      }
      return node;
    });
  };

  const deleteNodeByPath = (nodes, path) => {
    return nodes.reduce((acc, node) => {
      if (node.path === path) return acc;
      if (node.type === "folder" && node.children) {
        node.children = deleteNodeByPath(node.children, path);
      }
      acc.push(node);
      return acc;
    }, []);
  };
  
  const updateChildrenPaths = (children, oldParentPath, newParentPath) => {
      return children.map(child => {
          const newPath = child.path.replace(oldParentPath, newParentPath);
          const updatedChild = { ...child, path: newPath, parentPath: newParentPath };
          if (child.type === 'folder' && child.children?.length > 0) {
              updatedChild.children = updateChildrenPaths(child.children, child.path, newPath);
          }
          return updatedChild;
      });
  };
  
  const renameNodeByPath = (nodes, path, newName, parentPath) => {
      return nodes.map((node) => {
        if (node.path === path) {
          const newPath = parentPath === '/' ? `/${newName}` : `${parentPath}/${newName}`;
          const updatedNode = { ...node, name: newName, path: newPath };
          if (node.type === "folder" && node.children?.length > 0) {
            updatedNode.children = updateChildrenPaths(node.children, node.path, newPath);
          }
          return updatedNode;
        }
        if (node.type === "folder" && node.children) {
          return { ...node, children: renameNodeByPath(node.children, path, newName, node.path) };
        }
        return node;
      });
  };

  const updateNodeContentByPath = (nodes, path, newContent) => {
    return nodes.map((node) => {
      if (node.path === path) return { ...node, content: newContent };
      if (node.type === "folder" && node.children) {
        return {
          ...node,
          children: updateNodeContentByPath(node.children, path, newContent),
        };
      }
      return node;
    });
  };


  const handleStartCreate = (type, parentPath) => {
    const handleCreate = (name) => {
      if (!name || name.trim() === "") {
        setIsCreating(null);
        setError(false);
        return;
      }

      const effectiveParentPath = parentPath || "/";
      const parentNode = findNodeByPath(fileSystem, effectiveParentPath);
      const siblings = parentNode ? parentNode.children : [];

      if (siblings.some((child) => child.name === name)) {
        setError(true);
        return;
      }

      setError(false);
      const newPath = effectiveParentPath === '/' ? `/${name}` : `${effectiveParentPath}/${name}`;
      const newNode = { type, name, path: newPath, parentPath: effectiveParentPath };

      if (type === "folder") newNode.children = [];
      else newNode.content = "";
      
      setFileSystem((fs) => addNodeByPath(fs, effectiveParentPath, newNode));
      setIsCreating(null);

      if (type === "file") {
        setOpenTabs((tabs) => [...tabs, newNode]);
        setActiveTab(newNode.path);
      }
    };

    setIsCreating({ type, parentPath, onCancel: () => { setIsCreating(null); setError(false); }, onCreate: handleCreate });
  };

  const handleStartRename = (node, parentPath) => {
    const handleRename = (newName) => {
      if (!newName || newName.trim() === "" || newName === node.name) {
        setIsRenaming(null);
        setError(false);
        return;
      }

      const effectiveParentPath = parentPath || "/";
      const parentNode = findNodeByPath(fileSystem, effectiveParentPath);
      const siblings = parentNode ? parentNode.children : [];

      if (siblings.some((child) => child.name === newName && child.path !== node.path)) {
        setError(true);
        return;
      }

      setError(false);
      const oldPath = node.path;
      const newPath = effectiveParentPath === '/' ? `/${newName}` : `${effectiveParentPath}/${newName}`;

      setFileSystem((fs) => renameNodeByPath(fs, oldPath, newName, effectiveParentPath));

      setOpenTabs((tabs) => tabs.map((tab) => {
          if (tab.path.startsWith(`${oldPath}/`)) {
              return { ...tab, path: newPath + tab.path.substring(oldPath.length) };
          }
          if (tab.path === oldPath) {
              return { ...tab, name: newName, path: newPath };
          }
          return tab;
        })
      );
      
      if (activeTab && activeTab.startsWith(oldPath)) {
        setActiveTab(newPath + activeTab.substring(oldPath.length));
      }

      setIsRenaming(null);
    };

    setIsRenaming({ node, parentPath, onCancel: () => { setIsRenaming(null); setError(false); }, onRename: handleRename });
  };

  const handleDelete = (path) => {
    setFileSystem((fs) => deleteNodeByPath(fs, path));
    handleCloseTab(path, true);
  };

  const handleContentChange = (path, newContent) => {
    setOpenTabs((tabs) =>
      tabs.map((tab) => tab.path === path ? { ...tab, content: newContent } : tab)
    );
    setFileSystem((fs) => updateNodeContentByPath(fs, path, newContent));
  };

  const handleFileClick = (file) => {
    if (!openTabs.some((tab) => tab.path === file.path)) {
      setOpenTabs((tabs) => [...tabs, file]);
    }
    setActiveTab(file.path);
  };

  const handleCloseTab = (path, isDeleting = false) => {
    const newTabs = openTabs.filter(tab => isDeleting ? !tab.path.startsWith(path) : tab.path !== path);
    setOpenTabs(newTabs);

    if (activeTab === path || (isDeleting && activeTab?.startsWith(path))) {
        if(newTabs.length > 0) {
            const tabIndex = openTabs.findIndex((tab) => tab.path === path);
            const newActiveIndex = Math.max(0, tabIndex - 1);
            setActiveTab(newTabs[newActiveIndex]?.path || null);
        } else {
            setActiveTab(null);
        }
    }
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />
      <Menu initialFileSystem={initialFileSystem} />
      <div style={{ display: "flex", flexGrow: 1, minHeight: 0, minWidth: 0 }}>
        <Options option={option} setOption={setOption} />
        <FileTab
          option={option}
          fileSystem={fileSystem[0]?.children || []}
          handleFileClick={handleFileClick}
          handleDelete={handleDelete}
          handleStartCreate={handleStartCreate}
          handleStartRename={handleStartRename}
          isCreating={isCreating}
          isRenaming={isRenaming}
          activeTab={activeTab}
          error={error}
          setError={setError}
        />
        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, minHeight: 0, minWidth: 0, overflow: "hidden" }}>
          <div style={{ flexGrow: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <Suspense fallback={<div className="center-flex" style={{backgroundColor: "#1e1e1e", color: "white"}}>Loading Editor...</div>}>
              <EditorWindow
                openTabs={openTabs}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                handleCloseTab={handleCloseTab}
                handleContentChange={handleContentChange}
              />
            </Suspense>
          </div>
          <TerminalWindow
            fileSystem={fileSystem}
            setFileSystem={setFileSystem}
            onClose={() => console.log("Close terminal")}
          />
        </div>
      </div>
      <Footer />
    </div>
  );
}
