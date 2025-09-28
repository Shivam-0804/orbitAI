/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef, useCallback } from "react";
import styles from "./css/chatWindow.module.css";

const getAIResponseStream = async (chatHistory, settings) => {
  const { model, apiKey } = settings;

  const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
  const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:streamGenerateContent?key=${apiKey}`;
  const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

  const formatMessages = (provider) => {
    const history = chatHistory.slice(0, -1);
    const lastMessage = chatHistory[chatHistory.length - 1];

    if (provider === "gemini") {
      return {
        contents: history
          .map((msg) => ({
            role: msg.sender === "user" ? "user" : "model",
            parts: [{ text: msg.text }],
          }))
          .concat({
            role: "user",
            parts: [{ text: lastMessage.text }],
          }),
      };
    }

    return {
      messages: chatHistory.map((msg) => ({
        role: msg.sender === "assistant" ? "assistant" : "user",
        content: msg.text,
      })),
    };
  };

  let apiURL, requestOptions;

  switch (model) {
    case "gpt-3.5-turbo":
    case "gpt-4-turbo":
      apiURL = OPENAI_API_URL;
      requestOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          ...formatMessages("openai"),
          stream: true,
        }),
      };
      break;

    case "gemini-pro":
      apiURL = GEMINI_API_URL;
      requestOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formatMessages("gemini")),
      };
      break;

    case "claude-3-opus":
      apiURL = ANTHROPIC_API_URL;
      requestOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-opus-20240229",
          max_tokens: 4096,
          ...formatMessages("anthropic"),
          stream: true,
        }),
      };
      break;

    case "grok":
      throw new Error(
        "Grok API is not publicly available for this type of integration yet."
      );

    default:
      throw new Error(`Unsupported model selected: ${model}`);
  }

  const response = await fetch(apiURL, requestOptions);
  if (!response.ok) {
    const errorBody = await response.json();
    throw new Error(
      `API Error (${response.status}): ${errorBody.error?.message || response.statusText}`
    );
  }
  return response.body.getReader();
};

// --- Helper Components ---
const flattenFileSystem = (nodes) => {
  let flat = {};
  function recurse(node, parentPath = null) {
    if (!node) return;
    const currentPath = parentPath
      ? `${parentPath}/${node.name}`.replace("//", "/")
      : node.name;
    node.path = currentPath;

    if (node.path) {
      flat[node.path] = { ...node };
    }
    if (node.type === "folder" && node.children) {
      node.children.forEach((child) => recurse(child, node.path));
    }
  }
  nodes.forEach((node) => recurse(node));
  return flat;
};

const apiKeyLinks = {
  "gpt-3.5-turbo": "https://platform.openai.com/api-keys",
  "gpt-4-turbo": "https://platform.openai.com/api-keys",
  "gemini-pro": "https://aistudio.google.com/app/apikey",
  "claude-3-opus": "https://console.anthropic.com/settings/keys",
  grok: "#",
};

const SettingsModal = ({ onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContainer}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Settings</h2>
          <button className={styles.modalCloseBtn} onClick={onClose}>
            &times;
          </button>
        </header>
        <div className={styles.modalBody}>
          <div className={styles.settingsFormGroup}>
            <label className={styles.settingsLabel} htmlFor="model-select">
              AI Model
            </label>
            <select
              id="model-select"
              className={styles.settingsSelect}
              value={localSettings.model}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, model: e.target.value })
              }
            >
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gemini-pro">Gemini Pro</option>
              <option value="claude-3-opus">Claude 3 Opus</option>
              <option value="grok" disabled>
                Grok (Not yet available)
              </option>
            </select>
          </div>
          <div className={styles.settingsFormGroup}>
            <label className={styles.settingsLabel} htmlFor="api-key-input">
              API Key
            </label>
            <input
              id="api-key-input"
              type="password"
              className={styles.settingsInput}
              placeholder="Enter your API key"
              value={localSettings.apiKey}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, apiKey: e.target.value })
              }
            />
            <a
              href={apiKeyLinks[localSettings.model]}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.apiKeyLink}
            >
              Get your {localSettings.model.split("-")[0]} API key here
            </a>
          </div>
        </div>
        <footer className={styles.modalFooter}>
          <button className={styles.btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.btnPrimary} onClick={handleSave}>
            Save
          </button>
        </footer>
      </div>
    </div>
  );
};

const FilePicker = ({ onClose, onFilesSelected, fileSystem }) => {
  const [currentPath, setCurrentPath] = useState("/");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const localFileInputRef = useRef(null);

  const currentDirectoryNode = fileSystem[currentPath];
  const childrenNodes =
    currentDirectoryNode?.children
      ?.map((child) => fileSystem[child.path])
      .filter(Boolean) || [];
  const parentPath =
    currentPath === "/"
      ? null
      : currentPath.substring(0, currentPath.lastIndexOf("/")) || "/";

  const handleFileToggle = (path) =>
    setSelectedFiles((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );

  const handleLocalFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      onFilesSelected([`local:${file.name}`]);
    }
    e.target.value = null;
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={`${styles.modalContainer} ${styles.filePickerModal}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Attach Files</h2>
          <button className={styles.modalCloseBtn} onClick={onClose}>
            &times;
          </button>
        </header>
        <div className={styles.filePickerUploadArea}>
          <input
            type="file"
            ref={localFileInputRef}
            onChange={handleLocalFileUpload}
            style={{ display: "none" }}
          />
          <button
            className={styles.uploadButton}
            onClick={() => localFileInputRef.current.click()}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M17 8L12 3L7 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M12 3V15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Upload from System</span>
          </button>
        </div>
        <div className={styles.filePickerPath}>
          {parentPath !== null && (
            <button
              className={styles.controlButton}
              onClick={() => setCurrentPath(parentPath)}
              title="Go back"
            >
              &larr;
            </button>
          )}
          <span>{currentPath}</span>
        </div>
        <div className={styles.filePickerBody}>
          <ul className={styles.filePickerList}>
            {childrenNodes.map((childNode) => {
              if (!childNode) return null;
              const isFolder = childNode.type === "folder";
              return (
                <li
                  key={childNode.path}
                  className={styles.filePickerItem}
                  onClick={() => isFolder && setCurrentPath(childNode.path)}
                >
                  <div className={styles.filePickerItemIcon}>
                    {isFolder ? "📁" : "📄"}
                  </div>
                  {isFolder ? (
                    <span>{childNode.name}</span>
                  ) : (
                    <label
                      className={styles.customCheckbox}
                      style={{ width: "100%" }}
                    >
                      <span>{childNode.name}</span>
                      <input
                        type="checkbox"
                        checked={selectedFiles.includes(childNode.path)}
                        onChange={() => handleFileToggle(childNode.path)}
                      />
                      <span className={styles.checkmark}></span>
                    </label>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
        <footer className={styles.modalFooter}>
          <button className={styles.btnSecondary} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.btnPrimary}
            disabled={selectedFiles.length === 0}
            onClick={() => onFilesSelected(selectedFiles)}
          >
            Attach {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ""}
          </button>
        </footer>
      </div>
    </div>
  );
};

const CopyButton = ({ code }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  return (
    <button onClick={handleCopy} className={styles.copyButton}>
      {isCopied ? "Copied!" : "Copy"}
    </button>
  );
};

const CopyMessageButton = ({ message }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className={styles.copyMessageButton}
      title="Copy message"
    >
      {isCopied ? (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M20 6L9 17L4 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect
            x="8"
            y="2"
            width="8"
            height="4"
            rx="1"
            ry="1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
};

const FormattedMessage = ({ text }) => {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return (
    <div className={styles.aiMessageContent}>
      {parts.map((part, i) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const code = part.slice(3, -3).trim();
          const langMatch = code.match(/^[a-z]+\n/);
          const lang = langMatch ? langMatch[0].trim() : "";
          const finalCode = langMatch
            ? code.substring(langMatch[0].length)
            : code;
          return (
            <div key={i} className={styles.codeBlock}>
              <div className={styles.codeBlockHeader}>
                <span>{lang || "code"}</span>
                <CopyButton code={finalCode} />
              </div>
              <pre>
                <code>{finalCode}</code>
              </pre>
            </div>
          );
        }
        return (
          <p key={i} style={{ margin: 0 }}>
            {part}
          </p>
        );
      })}
    </div>
  );
};

// --- Main Chat Window Component ---
export default function AIChatWindow({ fileSystemData }) {
  const [messages, setMessages] = useState(() => {
    try {
      const savedMessages = localStorage.getItem("orbit-chat-history");
      return savedMessages ? JSON.parse(savedMessages) : [];
    } catch (error) {
      console.error("Failed to parse chat history from localStorage", error);
      return [];
    }
  });
  const [inputValue, setInputValue] = useState("");
  const [dimensions, setDimensions] = useState({
    width: 450,
    height: 650,
    x: null,
    y: null,
  });
  const [isPinned, setIsPinned] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isHalfScreen, setIsHalfScreen] = useState(false);
  const [isFilePickerOpen, setIsFilePickerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({
    model: "gpt-4-turbo",
    apiKey: "",
  });
  const [fileSystem, setFileSystem] = useState({});
  const [stagedFiles, setStagedFiles] = useState([]);

  const chatBodyRef = useRef(null);
  const operationInfo = useRef({});
  const prevDimensionsRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("orbit-chat-history", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (fileSystemData) setFileSystem(flattenFileSystem(fileSystemData));
  }, [fileSystemData]);

  useEffect(() => {
    const initialX = window.innerWidth - dimensions.width - 20;
    const initialY = (window.innerHeight - dimensions.height) / 2;
    setDimensions((d) => ({
      ...d,
      x: Math.max(0, initialX),
      y: Math.max(0, initialY),
    }));
  }, []);

  useEffect(() => {
    if (chatBodyRef.current)
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
  }, [messages, isLoading]);

  const handleRefreshChat = () => {
    setMessages([]);
    localStorage.removeItem("orbit-chat-history");
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (isLoading || (inputValue.trim() === "" && stagedFiles.length === 0))
      return;

    if (!settings.apiKey) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: "API Key is missing. Please add it in Settings.",
          sender: "ai",
          type: "error",
        },
      ]);
      return;
    }

    let fullPrompt = inputValue;
    if (stagedFiles.length > 0) {
      const fileContext = stagedFiles
        .map(
          (file) =>
            `--- FILE: ${file.path} ---\n${file.content || ""}\n--- END FILE ---\n`
        )
        .join("\n");
      fullPrompt = `The user has attached the following files:\n\n${fileContext}\nUser's message:\n${inputValue}`;
    }

    const userMessage = { id: Date.now(), text: fullPrompt, sender: "user" };
    const currentMessages = [...messages, userMessage];

    setMessages(currentMessages);
    setInputValue("");
    setStagedFiles([]);
    setIsLoading(true);

    const assistantMessageId = Date.now() + 1;
    setMessages((prev) => [
      ...prev,
      { id: assistantMessageId, text: "", sender: "assistant" },
    ]);

    try {
      const reader = await getAIResponseStream(currentMessages, settings);
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n").filter((line) => line.trim());

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.substring(6);
            if (jsonStr === "[DONE]") continue;

            const data = JSON.parse(jsonStr);
            let textChunk = "";

            if (data.choices && data.choices[0].delta) {
              textChunk = data.choices[0].delta.content || "";
            } else if (data.type === "content_block_delta") {
              textChunk = data.delta.text || "";
            }

            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, text: msg.text + textChunk }
                  : msg
              )
            );
          } else {
            try {
              const data = JSON.parse(line);
              const textChunk = data.candidates[0].content.parts[0].text;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, text: msg.text + textChunk }
                    : msg
                )
              );
            } catch (e) {
              console.warn("Could not parse Gemini chunk:", line);
            }
          }
        }
      }
    } catch (error) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, text: error.message, type: "error" }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilesSelected = (selectedPaths) => {
    const files = selectedPaths.map((path) => fileSystem[path]).filter(Boolean);
    setStagedFiles((prev) => {
      const newFiles = files.filter(
        (f) => !prev.some((pf) => pf.path === f.path)
      );
      return [...prev, ...newFiles];
    });
    setIsFilePickerOpen(false);
  };

  const removeStagedFile = (pathToRemove) =>
    setStagedFiles((prev) => prev.filter((file) => file.path !== pathToRemove));

  const handleMouseDown = (e, opType, handle = null) => {
    if (opType === "drag" && e.target.closest(`.${styles.controlButton}`))
      return;
    operationInfo.current = {
      opType,
      handle,
      isActive: true,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: dimensions.width,
      startHeight: dimensions.height,
      startXPos: dimensions.x,
      startYPos: dimensions.y,
    };
    e.preventDefault();
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!operationInfo.current.isActive) return;

      const {
        opType,
        handle,
        startX,
        startY,
        startWidth,
        startHeight,
        startXPos,
        startYPos,
      } = operationInfo.current;
      let newDimensions = { ...dimensions };
      const minWidth = 320,
        minHeight = 400;

      if (opType === "drag") {
        let newX = startXPos + e.clientX - startX;
        let newY = startYPos + e.clientY - startY;
        newDimensions.x = Math.max(
          0,
          Math.min(newX, window.innerWidth - newDimensions.width)
        );
        newDimensions.y = Math.max(
          0,
          Math.min(newY, window.innerHeight - newDimensions.height)
        );
      } else if (opType === "resize") {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if (handle.includes("right"))
          newDimensions.width = Math.max(minWidth, startWidth + dx);
        if (handle.includes("bottom"))
          newDimensions.height = Math.max(minHeight, startHeight + dy);

        if (handle.includes("left")) {
          const calculatedWidth = startWidth - dx;
          if (calculatedWidth > minWidth) {
            newDimensions.width = calculatedWidth;
            newDimensions.x = startXPos + dx;
          } else {
            newDimensions.width = minWidth;
            newDimensions.x = startXPos + startWidth - minWidth;
          }
        }
        if (handle.includes("top")) {
          const calculatedHeight = startHeight - dy;
          if (calculatedHeight > minHeight) {
            newDimensions.height = calculatedHeight;
            newDimensions.y = startYPos + dy;
          } else {
            newDimensions.height = minHeight;
            newDimensions.y = startYPos + startHeight - minHeight;
          }
        }
      }

      requestAnimationFrame(() => setDimensions(newDimensions));
    },
    [dimensions]
  );

  const handleMouseUp = useCallback(() => (operationInfo.current = {}), []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleToggleSize = () => {
    if (isHalfScreen) {
      setDimensions(prevDimensionsRef.current);
    } else {
      prevDimensionsRef.current = dimensions;
      const newWidth = window.innerWidth * 0.5;
      const newHeight = window.innerHeight * 0.5;
      setDimensions({
        width: newWidth,
        height: newHeight,
        x: (window.innerWidth - newWidth) / 2,
        y: (window.innerHeight - newHeight) / 2,
      });
    }
    setIsHalfScreen(!isHalfScreen);
  };

  const resizeHandles = [
    "top",
    "bottom",
    "left",
    "right",
    "topLeft",
    "topRight",
    "bottomLeft",
    "bottomRight",
  ];

  if (dimensions.x === null) return null;

  return (
    <div className={styles.chatWindowWrapper}>
      {isFilePickerOpen && (
        <FilePicker
          onClose={() => setIsFilePickerOpen(false)}
          onFilesSelected={handleFilesSelected}
          fileSystem={fileSystem}
        />
      )}
      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onSave={setSettings}
        />
      )}

      <div
        className={`${styles.aiChatContainer} ${isPinned ? styles.pinned : ""} ${isMinimized ? styles.minimized : ""}`}
        style={{
          transform: `translate(${dimensions.x}px, ${dimensions.y}px)`,
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
        }}
      >
        {resizeHandles.map((handle) => (
          <div
            key={handle}
            className={`${styles.resizeHandle} ${styles[handle]}`}
            onMouseDown={(e) => handleMouseDown(e, "resize", handle)}
          />
        ))}
        <header
          className={styles.chatHeader}
          onMouseDown={(e) => handleMouseDown(e, "drag")}
        >
          <span className={styles.chatHeaderTitle}>OrbitAI</span>
          <div className={styles.headerControls}>
            <button
              className={styles.controlButton}
              onClick={handleToggleSize}
              title={isHalfScreen ? "Restore Size" : "Set to Half Screen"}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M9.5 2.5H13.5V6.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M2.5 9.5V13.5H6.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M13.5 9.5L8.5 4.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M7.5 11.5L2.5 6.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              className={styles.controlButton}
              onClick={() => setIsSettingsOpen(true)}
              title="Settings"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  clipRule="evenodd"
                  fillRule="evenodd"
                  d="M16.623 2.383a.9.9 0 011.272 0l3.722 3.723a.9.9 0 010 1.272l-1.428 1.428a.9.9 0 01-1.272 0l-3.723-3.722a.9.9 0 010-1.272L16.623 2.383zM4.01 14.155L12.898 5.26l4.995 4.995L9.005 19.15H4.01v-4.995zM2.91 20.255a.9.9 0 01.9-.9h16.38a.9.9 0 110 1.8H3.81a.9.9 0 01-.9-.9z"
                  fill="currentColor"
                />
              </svg>
            </button>
            <button
              className={styles.controlButton}
              onClick={handleRefreshChat}
              title="Refresh Chat"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M1 4V10H7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M3.51 15C4.56279 17.5032 6.48981 19.5113 9.00002 20.44C11.5102 21.3688 14.3468 21.1329 16.78 19.82C19.2132 18.5071 20.9778 16.2617 21.65 13.55C22.3222 10.8383 21.83 7.97415 20.31 5.68001C18.79 3.38585 16.3868 1.88474 13.68 1.55001C10.9732 1.21527 8.24317 2.08373 6.18002 3.9L1 10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              className={`${styles.controlButton} ${isPinned ? styles.active : ""}`}
              onClick={() => setIsPinned(!isPinned)}
              title={isPinned ? "Unpin" : "Always on top"}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M9.5 3.5L9.5 9.5M8.5 2.5L12.5 3.5L11.5 7.5L8.5 6.5M6.5 12.5L3.5 13.5L2.5 9.5L5.5 8.5L9.5 9.5M6.5 12.5L9.5 9.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              className={styles.controlButton}
              onClick={() => setIsMinimized(true)}
              title="Minimize"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2.5 8.5H13.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </header>
        <div className={styles.chatBody} ref={chatBodyRef}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`${styles.chatMessageWrapper} ${msg.sender === "user" ? styles.user : styles.assistant}`}
            >
              <div
                className={`${styles.chatMessage} ${styles[msg.type] || ""}`}
              >
                {msg.type === "error" ? (
                  msg.text
                ) : msg.sender === "assistant" ? (
                  <FormattedMessage text={msg.text} />
                ) : (
                  msg.text
                )}
              </div>
              <CopyMessageButton message={msg.text} />
            </div>
          ))}
          {isLoading && (
            <div className={styles.typingIndicator}>
              <span />
              <span />
              <span />
            </div>
          )}
        </div>
        <footer className={styles.chatFooter}>
          {stagedFiles.length > 0 && (
            <div className={styles.stagedFilesContainer}>
              {stagedFiles.map((file) => (
                <div key={file.path} className={styles.stagedFile}>
                  <span>{file.name}</span>
                  <button
                    className={styles.removeStagedFile}
                    onClick={() => removeStagedFile(file.path)}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}
          <form className={styles.chatInputForm} onSubmit={handleSendMessage}>
            <button
              type="button"
              className={styles.controlButton}
              onClick={() => setIsFilePickerOpen(true)}
              title="Attach file"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M14.5 7C13.837 7 13.1935 6.80429 12.6788 6.44661C12.1642 6.08893 11.8087 5.58983 11.666 5C11.1921 5.01186 10.7324 5.16688 10.3462 5.44473C9.96001 5.72258 9.66697 6.11189 9.5 6.56M16 12.5C14.86 14.59 12.44 15.93 9.77 15.65C7.1 15.37 4.88 13.5 3.74 11.41C2.6 9.32 2.81 6.78 4.26 4.88C5.71 2.98 8.12 2 10.5 2C12.88 2 15.29 2.98 16.74 4.88C18.19 6.78 18.4 9.32 17.26 11.41L12.5 19.5C12.1952 20.0135 11.7486 20.4357 11.2133 20.7221C10.6781 21.0084 10.0768 21.1472 9.47175 21.1215C8.8667 21.0958 8.27787 20.9067 7.76928 20.5735C7.26068 20.2403 6.85243 19.7768 6.59 19.25"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <input
              type="text"
              className={styles.chatInput}
              placeholder="Ask me anything..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <button
              type="submit"
              className={styles.sendButton}
              disabled={
                isLoading || (!inputValue.trim() && stagedFiles.length === 0)
              }
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M1.50002 14.5L14.5 1.5M1.50002 1.5L8.50002 8.5L14.5 1.5"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </form>
        </footer>
      </div>
      <button
        className={`${styles.restoreButton} ${isMinimized ? styles.visible : ""}`}
        onClick={() => setIsMinimized(false)}
        title="Restore Chat"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4.5 12.5L11.5 5.5M4.5 5.5L11.5 12.5"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
