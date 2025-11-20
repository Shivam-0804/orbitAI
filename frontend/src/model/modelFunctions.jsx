/* eslint-disable react-refresh/only-export-components */
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { CreateMLCEngine } from "https://esm.run/@mlc-ai/web-llm";

// 1. CONFIGURATION
const MODEL_ID = "Llama-3.2-1B-Instruct-q4f16_1-MLC";

const SYSTEM_PROMPTS = {
  code: "You are a strict code generator. Output COMPLETE, RUNNABLE code with all necessary imports. Output ONLY the code. Do not write explanations. Do not use Markdown backticks.",
  test: "You are a Test Case generator for a given code. Analyze the code logic to determine the input type. Generate exactly 10 distinct test input values. Do not write explanation just give the test cases.",
  fix: "You are a Senior Debugger. Analyze the error. Output exactly two sections: \n1. CAUSE: Single sentence.\n2. SOLUTION: Corrected code.\nNo filler text.",
  chat: "You are a helpful, concise technical assistant. Answer directly.",
};

// 2. CREATE CONTEXT
const WebLLMContext = createContext(null);

export const WebLLMProvider = ({ children }) => {
  const engineRef = useRef(null);
  const [modelStatus, setModelStatus] = useState("idle");
  const [initProgress, setInitProgress] = useState("");

  // 3. INITIALIZE ENGINE ON MOUNT
  useEffect(() => {
    const loadEngine = async () => {
      if (engineRef.current) return;

      setModelStatus("loading");
      try {
        engineRef.current = await CreateMLCEngine(MODEL_ID, {
          initProgressCallback: (report) => {
            setInitProgress(report.text);
          },
        });
        setModelStatus("ready");
        console.log("WebLLM Engine Loaded Successfully");
      } catch (err) {
        console.error("WebLLM Load Error:", err);
        setModelStatus("error");
        setInitProgress("Error loading model: " + err.message);
      }
    };

    loadEngine();
  }, []);

  // 4. CORE GENERATION FUNCTION
  const runAI = async (mode, input, onStreamUpdate) => {
    if (!engineRef.current || modelStatus !== "ready") {
      throw new Error("Model is not ready yet.");
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPTS[mode] },
      { role: "user", content: input },
    ];

    const chunks = await engineRef.current.chat.completions.create({
      messages,
      temperature: 0.1, // Keep low for consistent formatting
      stream: true,
    });

    let fullText = "";
    for await (const chunk of chunks) {
      const delta = chunk.choices[0]?.delta?.content || "";
      fullText += delta;
      // Send the accumulated text back to the UI component
      if (onStreamUpdate) onStreamUpdate(fullText);
    }
    return fullText;
  };

  // 5. EXPOSED HELPER FUNCTIONS
  const generateCode = (input, onUpdate) => runAI("code", input, onUpdate);
  const generateTests = (input, onUpdate) => runAI("test", input, onUpdate);
  const fixError = (input, onUpdate) => runAI("fix", input, onUpdate);
  const chat = (input, onUpdate) => runAI("chat", input, onUpdate);
  const explainCode = (input, onUpdate) => runAI("explain", input, onUpdate);

  // 6. VALUE EXPOSED TO APP
  const value = {
    modelStatus,
    initProgress,
    generateCode,
    generateTests,
    fixError,
    explainCode,
    chat,
  };

  return (
    <WebLLMContext.Provider value={value}>{children}</WebLLMContext.Provider>
  );
};

// 7. CUSTOM HOOK FOR COMPONENTS
export const useWebLLM = () => {
  return useContext(WebLLMContext);
};
