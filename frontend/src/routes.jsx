import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/home";
import Access from "./pages/access";
import Orbit from "./pages/orbit";

export default function PageRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/access" element={<Access />} />
        <Route path="/orbit" element={<Orbit />} />
      </Routes>
    </BrowserRouter>
  );
}
