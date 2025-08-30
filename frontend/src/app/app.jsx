import Header from "../components/header.jsx";
import Options from "../components/options.jsx";
import FileTab from "../components/file-tab.jsx";
import Terminal from "../components/terminal.jsx";
import EditorWindow from "../components/editor.jsx";
import Menu from "../components/menu.jsx";
import Footer from "../components/footer.jsx";

import "./global.css";

import { useState } from "react";

// App.jsx
export default function App() {
  const [option, setOption] = useState(0);

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
        <FileTab option={option} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            minHeight: 0,
            minWidth: 0,
          }}
        >
          <EditorWindow />
          <Terminal />
        </div>
      </div>
      <Footer />
    </div>
  );
}
