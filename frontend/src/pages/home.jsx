import HomePage from "./homePage";
import Features from "./featurePage";
import AIComponent from "./aiComponent";
import About from "./about";

import { Buffer } from "buffer";
window.Buffer = Buffer;


export default function Home() {
  return (
    <>
      <HomePage />
      <Features />
      <AIComponent />
      <About />
    </>
  );
}
