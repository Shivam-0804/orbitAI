import Header from "../components/header.jsx";
import Options from "../components/options.jsx";
import FileTab from "../components/file-tab.jsx";
import Terminal from "../components/terminal.jsx";
import Editor from "../components/editor.jsx";
import Menu from "../components/menu.jsx";
import Footer from "../components/footer.jsx";

import "./global.css";

import { useState } from "react";

export default function App() {
  const [option, setOption] = useState(0);
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />
      <Menu />
      <div style={{ display: "flex", flexGrow: 1 }}>
        <Options option={option} setOption={setOption} />
        <FileTab option={option} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
          }}
        >
          <div style={{ flexGrow: 1 }}>
            <Editor />
          </div>
          <Terminal />
        </div>
      </div>
      <Footer />
    </div>
  );
}
