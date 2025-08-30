import { useState } from "react";
import Header from "../components/header.jsx";
import Options from "../components/options.jsx";
import FileTab from "../components/file-tab.jsx";
import TerminalWindow from "../components/terminal.jsx";
import EditorWindow from "../components/editor.jsx";
import Menu from "../components/menu.jsx";
import Footer from "../components/footer.jsx";

import "./global.css";

const initialFileSystem = [
  {
    type: "folder",
    name: "/",
    path: "/",
    children: [
      {
        type: "folder",
        name: "src",
        path: "/src",
        children: [
          {
            type: "folder",
            name: "components",
            path: "/src/components",
            children: [
              {
                type: "file",
                name: "Button.jsx",
                path: "/src/components/Button.jsx",
                content:
                  "export default function Button() {\n  return <button>Click Me</button>;\n}",
              },
              {
                type: "file",
                name: "Header.jsx",
                path: "/src/components/Header.jsx",
                content:
                  "export default function Header() {\n  return <h1>My App</h1>;\n}",
              },
            ],
          },
          {
            type: "file",
            name: "App.jsx",
            path: "/src/App.jsx",
            content:
              'import React from "react";\n\nfunction App() {\n  return <div>Hello World</div>;\n}\n\nexport default App;',
          },
        ],
      },
      { 
        type: "file",
        name: "package.json",
        path: "/package.json",
        content: '{ "name": "react-app" }',
      },
    ],
  },
];

export default function App() {
  const [option, setOption] = useState(0);

  const [fileSystem, setFileSystem] = useState(initialFileSystem);
  const [openTabs, setOpenTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [isCreating, setIsCreating] = useState(null);

  const addNodeByPath = (nodes, parentPath, newNode) => {
    return nodes.map((node) => {
      if (node.path === parentPath) {
        return { ...node, children: [...(node.children || []), newNode] };
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
    return nodes.filter((node) => {
      if (node.path === path) return false;
      if (node.type === "folder" && node.children) {
        node.children = deleteNodeByPath(node.children, path);
      }
      return true;
    });
  };

  const updateNodeContentByPath = (nodes, path, newContent) => {
    return nodes.map((node) => {
      if (node.path === path) {
        return { ...node, content: newContent };
      }
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
        return;
      }

      const newPath = parentPath ? `${parentPath}/${name}` : `/${name}`;
      const newNode = { type, name, path: newPath };

      if (type === "folder") {
        newNode.children = [];
      } else {
        newNode.content = ``;
      }

      if (parentPath === null) {
        setFileSystem((fs) => [...fs, newNode]);
      } else {
        setFileSystem((fs) => addNodeByPath(fs, parentPath, newNode));
      }
      setIsCreating(null);
    };

    setIsCreating({
      type,
      parentPath,
      onCancel: () => setIsCreating(null),
      onCreate: handleCreate,
    });
  };

  const handleDelete = (path) => {
    setFileSystem((currentFileSystem) =>
      deleteNodeByPath(currentFileSystem, path)
    );
    handleCloseTab(path);
  };

  const handleContentChange = (path, newContent) => {
    setOpenTabs((tabs) =>
      tabs.map((tab) =>
        tab.path === path ? { ...tab, content: newContent } : tab
      )
    );
    setFileSystem((currentFileSystem) =>
      updateNodeContentByPath(currentFileSystem, path, newContent)
    );
  };

  const handleFileClick = (file) => {
    const isAlreadyOpen = openTabs.some((tab) => tab.path === file.path);
    if (!isAlreadyOpen) {
      setOpenTabs((tabs) => [...tabs, file]);
    }
    setActiveTab(file.path);
  };

  const handleCloseTab = (path) => {
    const tabIndex = openTabs.findIndex((tab) => tab.path === path);
    if (tabIndex === -1) return;

    const newTabs = openTabs.filter((tab) => tab.path !== path);
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

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />
      <Menu />
      <div
        style={{
          display: "flex",
          flexGrow: 1,
          minHeight: 0,
          minWidth: 0,
        }}
      >
        <Options option={option} setOption={setOption} />
        <FileTab
          option={option}
          fileSystem={fileSystem}
          handleFileClick={handleFileClick}
          handleDelete={handleDelete}
          handleStartCreate={handleStartCreate}
          isCreating={isCreating}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            minHeight: 0,
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              flexGrow: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <EditorWindow
              openTabs={openTabs}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              handleCloseTab={handleCloseTab}
              handleContentChange={handleContentChange}
            />
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
