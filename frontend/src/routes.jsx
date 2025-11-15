import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/home";
import Access from "./pages/access";
import Orbit from "./pages/orbit";
import TreeSitterPage from "./pages/treesitter";

export default function PageRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/access" element={<Access />} />
        <Route path="/orbit" element={<Orbit />} />
        <Route path="/treesitter" element={<TreeSitterPage />} />
      </Routes>
    </BrowserRouter>
  );
}
