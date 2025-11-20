import { useState, lazy, Suspense, useRef } from "react";
import { loader } from "@monaco-editor/react";
import Header from "../components/header.jsx";
import Options from "../components/options.jsx";
import FileTab from "../components/file-tab.jsx";
import TerminalWindow from "../components/terminal.jsx";
import Menu from "../components/menu.jsx";
import Footer from "../components/footer.jsx";
import LoadAnimation from "../ui/loadingAnimation.jsx";
// import AIWindow from "../components/chatWindow.jsx";

import { WebLLMProvider } from "../model/modelFunctions";
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
    status: "",
    children: [
      {
        type: "folder",
        name: "frontend",
        path: "/frontend",
        status: "",
        children: [
          {
            type: "file",
            name: "index.html",
            path: "/src/index.html",
            content: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Bubble Sort Demo</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div class="card" role="application" aria-label="Bubble sort demo">
    <div class="left">
      <h1>Bubble Sort — interactive demo</h1>
      <p class="muted">Enter numbers separated by spaces or commas, then press <strong>Sort</strong>. Use <em>Animate</em> to watch swaps.</p>

      <div class="controls" aria-hidden="false">
        <input id="inputNumbers" type="text" placeholder="e.g. 5 2 9 1 3" aria-label="Numbers input" />
        <button id="sortBtn">Sort</button>
        <button id="animateBtn" class="small">Animate</button>
        <button id="resetBtn" class="small">Reset</button>
      </div>

      <div>
        <label><input id="descending" type="checkbox" /> <span style="color:var(--muted)">Sort descending</span></label>
      </div>

      <div style="margin-top:10px;">
        <div><strong>Original:</strong></div>
        <div id="original" class="resultBox arrayRow" aria-live="polite"></div>

        <div style="margin-top:12px;"><strong>Sorted:</strong></div>
        <div id="sorted" class="resultBox arrayRow" aria-live="polite"></div>
      </div>
    </div>

    <div class="right">
      <div>
        <strong>Steps / Log</strong>
        <div id="log" class="log" aria-live="polite"></div>
      </div>

      <div>
        <strong>Controls</strong>
        <p class="muted" style="margin:6px 0 0 0;">Animation speed (ms): 
          <input id="speed" type="range" min="50" max="1000" value="300" /> 
          <span id="speedVal">300</span>ms
        </p>
      </div>
    </div>

    <div class="footer">
      <div>Simple educational demo • Bubble sort complexity: O(n²)</div>
      <div>Tip: use spaces or commas between numbers</div>
    </div>
  </div>

  <script src="script.js"></script>
</body>
</html>
`,
            status: "", // 'A' indicates the file is new and has been Added (staged)
          },
          {
            type: "file",
            name: "style.css",
            path: "/style.css",
            content: `:root{
  --bg:#0f1724; --card:#0b1220; --accent:#4f46e5; --text:#e6eef8;
  --muted:#9aa7bf;
}

body{
  margin:0; font-family:Inter,system-ui,Segoe UI,Roboto,"Helvetica Neue",Arial;
  background:linear-gradient(180deg,#071028 0%, #07142a 100%);
  color:var(--text); min-height:100vh; display:flex; align-items:center; justify-content:center;
  padding:28px;
}

.card{
  width:900px; max-width:100%; background:linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
  border-radius:12px; box-shadow:0 10px 30px rgba(2,6,23,0.6); padding:20px;
  display:grid; grid-template-columns: 1fr 320px; gap:18px;
}

h1{ margin:0 0 10px 0; font-size:20px; letter-spacing:0.2px; }
p.muted{ color:var(--muted); margin:0 0 12px 0; font-size:13px; }

.controls { display:flex; gap:8px; margin-bottom:12px; align-items:center; }

input[type="text"]{
  flex:1; padding:10px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.06);
  background:transparent; color:var(--text); outline:none; font-size:14px;
}

button{
  background:var(--accent); color:white; border:0; padding:10px 12px; border-radius:8px;
  cursor:pointer; font-weight:600;
}

.small {
  padding:8px 10px; font-size:13px; 
  background:transparent; border:1px solid rgba(255,255,255,0.06); color:var(--text);
}

.resultBox { margin-top:10px; background:rgba(255,255,255,0.02); padding:12px; border-radius:8px; min-height:56px; }

.arrayRow { display:flex; gap:8px; flex-wrap:wrap; }

.item {
  min-width:40px; height:40px; background:rgba(255,255,255,0.03); display:flex; align-items:center; justify-content:center;
  border-radius:8px; font-weight:700; color:var(--text); border:1px solid rgba(255,255,255,0.03);
  transition: transform .18s ease, background-color .18s ease, border-color .18s ease;
}

.item.active { background: rgba(80, 102, 255, 0.95); transform: translateY(-6px); }
.item.swap { background: rgba(244, 63, 94, 0.95); transform: translateY(-6px); }

.right { border-left:1px solid rgba(255,255,255,0.03); padding-left:16px; display:flex; flex-direction:column; gap:10px;}

.log { font-family: ui-monospace, monospace; font-size:13px; color:var(--muted); overflow:auto; max-height:300px; padding:8px; border-radius:8px; background:rgba(255,255,255,0.012); border:1px solid rgba(255,255,255,0.02); }

.footer { grid-column:1/-1; display:flex; justify-content:space-between; align-items:center; margin-top:10px; color:var(--muted); font-size:13px; }

label { font-size:13px; color:var(--muted); display:flex; gap:6px; align-items:center; }
`,
            status: "", // An empty status means the file is tracked and unmodified
          },
          {
            type: "file",
            name: "script.js",
            path: "/script.js",
            content: `
const input = document.getElementById('inputNumbers');
const sortBtn = document.getElementById('sortBtn');
const animateBtn = document.getElementById('animateBtn');
const resetBtn = document.getElementById('resetBtn');
const originalBox = document.getElementById('original');
const sortedBox = document.getElementById('sorted');
const logBox = document.getElementById('log');
const speed = document.getElementById('speed');
const speedVal = document.getElementById('speedVal');
const descendingCheckbox = document.getElementById('descending');

let arr = [];
let steps = [];
let animating = false;
let animTimer = null;

function parseInput(text) {
  if (!text) return [];
  return text.split(/[\\s,]+/).filter(s => s.trim().length).map(Number);
}

function renderArray(container, array, highlight = {}) {
  container.innerHTML = '';
  array.forEach((v, i) => {
    const el = document.createElement('div');
    el.className = 'item';
    if (highlight.active && (i === highlight.active[0] || i === highlight.active[1])) el.classList.add('active');
    if (highlight.swap && (i === highlight.swap[0] || i === highlight.swap[1])) el.classList.add('swap');
    el.textContent = v;
    container.appendChild(el);
  });
}

function bubbleSortWithSteps(a, desc=false) {
  const arrCopy = a.slice();
  const stepsLocal = [];

  for (let i = 0; i < arrCopy.length - 1; i++) {
    for (let j = 0; j < arrCopy.length - i - 1; j++) {
      stepsLocal.push({ type:'compare', i:j, j:j+1, array: arrCopy.slice() });

      const shouldSwap = desc ? arrCopy[j] < arrCopy[j+1] : arrCopy[j] > arrCopy[j+1];
      if (shouldSwap) {
        [arrCopy[j], arrCopy[j+1]] = [arrCopy[j+1], arrCopy[j]];
        stepsLocal.push({ type:'swap', i:j, j:j+1, array: arrCopy.slice() });
      }
    }
  }
  return { sorted: arrCopy, steps: stepsLocal };
}

function log(msg) {
  const line = document.createElement('div');
  line.textContent = msg;
  logBox.appendChild(line);
  logBox.scrollTop = logBox.scrollHeight;
}

function startAnimation(stepsArr) {
  if (!stepsArr || !stepsArr.length) return;
  let idx = 0;
  animating = true;
  animateBtn.textContent = 'Stop';

  animTimer = setInterval(() => {
    if (idx >= stepsArr.length) {
      stopAnimation();
      renderArray(sortedBox, stepsArr[stepsArr.length-1].array);
      return;
    }

    const step = stepsArr[idx++];
    renderArray(originalBox, step.array, { 
      active: [step.i, step.j], 
      swap: step.type === 'swap' ? [step.i, step.j] : null 
    });

    if (step.type === 'compare') log("Compare index " + step.i + " and " + step.j);
    else if (step.type === 'swap') log("Swap index " + step.i + " and " + step.j);
  }, Number(speed.value));
}

function stopAnimation() {
  animating = false;
  animateBtn.textContent = 'Animate';
  clearInterval(animTimer);
  animTimer = null;
}

sortBtn.addEventListener('click', () => {
  stopAnimation();
  logBox.innerHTML = '';

  arr = parseInput(input.value);
  if (!arr.length) return alert("Enter some numbers!");

  const result = bubbleSortWithSteps(arr, descendingCheckbox.checked);

  renderArray(originalBox, arr);
  renderArray(sortedBox, result.sorted);

  log("Sorted: [" + result.sorted.join(', ') + "]");

  steps = result.steps;
});

animateBtn.addEventListener('click', () => {
  if (animating) return stopAnimation();

  if (!steps.length) {
    arr = parseInput(input.value);
    if (!arr.length) return alert("Enter numbers first!");
    const result = bubbleSortWithSteps(arr, descendingCheckbox.checked);
    steps = result.steps;
    renderArray(sortedBox, result.sorted);
  }

  logBox.innerHTML = '';
  startAnimation(steps);
});

resetBtn.addEventListener('click', () => {
  stopAnimation();
  arr = [];
  steps = [];
  input.value = '';
  originalBox.innerHTML = '';
  sortedBox.innerHTML = '';
  logBox.innerHTML = '';
});

speed.addEventListener('input', () => {
  speedVal.textContent = speed.value;
  if (animating) {
    const s = steps.slice();
    stopAnimation();
    startAnimation(s);
  }
});

input.value = "5 1 4 2 8";
`,
            status: "", // An empty status means the file is tracked and unmodified
          },
        ],
      },
      {
        type: "folder",
        name: "test case",
        path: "/test case",
        status: "",
        children: [
          {
            type: "file",
            name: "test1.py",
            path: "/test1.py",
            content: `import random

adjectives = [
    "Swift", "Mighty", "Silent", "Brave", "Lucky",
    "Crazy", "Rapid", "Shadow", "Electric", "Golden"
]

nouns = [
    "Tiger", "Eagle", "Wizard", "Panther", "Knight",
    "Ninja", "Falcon", "Coder", "Samurai", "Wolf"
]

def generate_nickname(name):
    adj = random.choice(adjectives)
    noun = random.choice(nouns)
    return f"{adj} {noun} {name}"

def main():
    print("=== Nickname Generator ===")
    user_name = input("Enter your name: ")
    
    print("\nGenerating a random nickname for you...")
    nickname = generate_nickname(user_name)
    print(f"Your nickname: {nickname}")

if __name__ == "__main__":
    main()
`,
            status: "", // '?' indicates the file is Untracked
          },
          {
            type: "file",
            name: "test2.py",
            path: "/test2.py",
            content: `import datetime

def get_int(prompt):
    while True:
        try:
            return int(input(prompt))
        except ValueError:
            print("Invalid integer! Please try again.")

def get_float(prompt):
    while True:
        try:
            return float(input(prompt))
        except ValueError:
            print("Invalid float! Please try again.")

def calculate_tax(salary, tax_rate):
    return salary * (tax_rate / 100)

def save_record(name, salary, tax_rate, tax_amount):
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    with open("salary_tax_log.txt", "a") as f:
        f.write(
            f"{timestamp} | Name: {name} | Salary: {salary} | "
            f"Tax Rate: {tax_rate}% | Tax Amount: {tax_amount}\n"
        )

def main():
    print("=== Salary Tax Calculator ===")
    
    name = input("Enter employee name: ")
    salary = get_int("Enter monthly salary (integer): ")
    tax_rate = get_float("Enter tax rate (float): ")

    tax_amount = calculate_tax(salary, tax_rate)

    print("\n--- Result ---")
    print(f"Employee: {name}")
    print(f"Salary: ₹{salary}")
    print(f"Tax Rate: {tax_rate}%")
    print(f"Tax Amount: ₹{tax_amount}")

    save_record(name, salary, tax_rate, tax_amount)

if __name__ == "__main__":
    main()
`,
            // status: "?", // '?' indicates the file is Untracked
          },
        ],
      },
      {
        type: "file",
        name: "main.py",
        path: "/main.py",
        content: `import random

adjectives = [
    "Swift", "Mighty", "Silent", "Brave", "Lucky",
    "Crazy", "Rapid", "Shadow", "Electric", "Golden"
]

nouns = [
    "Tiger", "Eagle", "Wizard", "Panther", "Knight",
    "Ninja", "Falcon", "Coder", "Samurai", "Wolf"
]

def generate_nickname(name):
    adj = random.choice(adjectives)
    noun = random.choice(nouns)
    return f"{adj} {noun} {name}"

def main():
    print("=== Nickname Generator ===")
    user_name = input("Enter your name: ")
    
    print("\nGenerating a random nickname for you...")
    nickname = generate_nickname(user_name)
    print(f"Your nickname: {nickname}")

if __name__ == "__main__":
    main()
`,
        status: "",
      },
      {
        type: "file",
        name: "scripts.js",
        path: "/scripts.js",
        content: `console.log("hello world")`,
        status: "", // '?' indicates the file is Untracked
      },
      {
        type: "file",
        name: "package.json",
        path: "/package.json",
        content: '{ "name": "my-app" }',
        status: "",
      },
      // {
      //   type: "file",
      //   name: "config.js",
      //   path: "/config.js",
      //   content: "export default {};",
      //   status: "?", // '?' indicates the file is Untracked
      // },
    ],
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
  const [showTerminal, setShowTerminal] = useState(false);
  const [showOptions, setShowOPtions] = useState(0);
  const terminalApiRef = useRef(null);

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
    return children.map((child) => {
      const newPath = child.path.replace(oldParentPath, newParentPath);
      const updatedChild = {
        ...child,
        path: newPath,
        parentPath: newParentPath,
      };
      if (child.type === "folder" && child.children?.length > 0) {
        updatedChild.children = updateChildrenPaths(
          child.children,
          child.path,
          newPath
        );
      }
      return updatedChild;
    });
  };

  const renameNodeByPath = (nodes, path, newName, parentPath) => {
    return nodes.map((node) => {
      if (node.path === path) {
        const newPath =
          parentPath === "/" ? `/${newName}` : `${parentPath}/${newName}`;
        const updatedNode = { ...node, name: newName, path: newPath };
        if (node.type === "folder" && node.children?.length > 0) {
          updatedNode.children = updateChildrenPaths(
            node.children,
            node.path,
            newPath
          );
        }
        return updatedNode;
      }
      if (node.type === "folder" && node.children) {
        return {
          ...node,
          children: renameNodeByPath(node.children, path, newName, node.path),
        };
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
      const newPath =
        effectiveParentPath === "/"
          ? `/${name}`
          : `${effectiveParentPath}/${name}`;
      const newNode = {
        type,
        name,
        path: newPath,
        parentPath: effectiveParentPath,
      };

      if (type === "folder") newNode.children = [];
      else newNode.content = "";

      setFileSystem((fs) => addNodeByPath(fs, effectiveParentPath, newNode));
      setIsCreating(null);

      if (type === "file") {
        setOpenTabs((tabs) => [...tabs, newNode]);
        setActiveTab(newNode.path);
      }
    };

    setIsCreating({
      type,
      parentPath,
      onCancel: () => {
        setIsCreating(null);
        setError(false);
      },
      onCreate: handleCreate,
    });
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

      if (
        siblings.some(
          (child) => child.name === newName && child.path !== node.path
        )
      ) {
        setError(true);
        return;
      }

      setError(false);
      const oldPath = node.path;
      const newPath =
        effectiveParentPath === "/"
          ? `/${newName}`
          : `${effectiveParentPath}/${newName}`;

      setFileSystem((fs) =>
        renameNodeByPath(fs, oldPath, newName, effectiveParentPath)
      );

      setOpenTabs((tabs) =>
        tabs.map((tab) => {
          if (tab.path.startsWith(`${oldPath}/`)) {
            return {
              ...tab,
              path: newPath + tab.path.substring(oldPath.length),
            };
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

    setIsRenaming({
      node,
      parentPath,
      onCancel: () => {
        setIsRenaming(null);
        setError(false);
      },
      onRename: handleRename,
    });
  };

  const handleDelete = (path) => {
    setFileSystem((fs) => deleteNodeByPath(fs, path));
    handleCloseTab(path, true);
  };

  const handleContentChange = (path, newContent) => {
    setOpenTabs((tabs) =>
      tabs.map((tab) =>
        tab.path === path ? { ...tab, content: newContent } : tab
      )
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
    const newTabs = openTabs.filter((tab) =>
      isDeleting ? !tab.path.startsWith(path) : tab.path !== path
    );
    setOpenTabs(newTabs);

    if (activeTab === path || (isDeleting && activeTab?.startsWith(path))) {
      if (newTabs.length > 0) {
        const tabIndex = openTabs.findIndex((tab) => tab.path === path);
        const newActiveIndex = Math.max(0, tabIndex - 1);
        setActiveTab(newTabs[newActiveIndex]?.path || null);
      } else {
        setActiveTab(null);
      }
    }
  };

  return (
    <>
      <WebLLMProvider>
        <div
          style={{ height: "100vh", display: "flex", flexDirection: "column" }}
        >
          <Header />
          <Menu
            setFileSystem={setFileSystem}
            initialFileSystem={initialFileSystem}
            showTerminal={showTerminal}
            activeTab={activeTab}
            setShowTerminal={setShowTerminal}
            terminalApiRef={terminalApiRef}
          />
          <div
            style={{ display: "flex", flexGrow: 1, minHeight: 0, minWidth: 0 }}
          >
            <Options
              option={option}
              setOption={setOption}
              showOptions={showOptions}
              setShowOPtions={setShowOPtions}
            />
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
              showOptions={showOptions}
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
                <Suspense
                  fallback={
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                        width: "100%",
                      }}
                    >
                      <LoadAnimation />
                    </div>
                  }
                >
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
                openTabs={openTabs}
                activeTab={activeTab}
                fileSystem={fileSystem}
                setFileSystem={setFileSystem}
                showTerminal={showTerminal}
                setShowTerminal={setShowTerminal}
                terminalApiRef={terminalApiRef}
              />
            </div>
          </div>
          <Footer
            showTerminal={showTerminal}
            setShowTerminal={setShowTerminal}
          />
        </div>
      </WebLLMProvider>
    </>
  );
}
