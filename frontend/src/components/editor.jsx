import Editor, { useMonaco } from "@monaco-editor/react";
import styles from "./css/editor.module.css";
import { File, X } from "lucide-react";
import { useEffect, useRef } from "react";

// Prettier doesn't support C/C++/Java in standalone mode easily.
// We only include languages that have readily available standalone plugins.
const FORMATTABLE_LANGUAGES = ["javascript", "typescript", "css", "scss", "html", "json", "markdown", "python"];
const SUGGESTION_LANGUAGES = ["javascript", "python", "css", "html", "c", "cpp", "java"];


export default function EditorWindow({
  openTabs,
  activeTab,
  setActiveTab,
  handleCloseTab,
  handleContentChange,
  setProblems,
}) {
  const activeFile = openTabs.find((tab) => tab.path === activeTab);
  const monaco = useMonaco();
  const suggestionTimeout = useRef(null);

  useEffect(() => {
    if (monaco && monaco.languages.python) {
      monaco.languages.python.pythonDefaults.setDiagnosticsOptions({
        validate: true,
        completion: true,
        format: true,
        hover: true,
        lint: {
            args: [],
        },
      });
    }
  }, [monaco]);


  useEffect(() => {
    if (monaco) {
      const formattingProvider = monaco.languages.registerDocumentFormattingEditProvider(
        FORMATTABLE_LANGUAGES,
        {
          async provideDocumentFormattingEdits(model) {
            const prettier = await import("prettier/standalone");
            const parsers = {
              javascript: await import("prettier/plugins/babel"),
              css: await import("prettier/plugins/postcss"),
              html: await import("prettier/plugins/html"),
              markdown: await import("prettier/plugins/markdown"),
            };
            
            const text = model.getValue();
            const language = model.getLanguageId();

            if (!parsers[language]) {
                console.warn(`Prettier parser for language "${language}" not found.`);
                return [];
            }
            
            try {
              const formattedText = await prettier.format(text, {
                parser: language,
                plugins: Object.values(parsers),
                tabWidth: 2,
                useTabs: false,
                singleQuote: true,
                semi: true,
              });

              return [{
                range: model.getFullModelRange(),
                text: formattedText,
              }];
            } catch (error) {
              console.warn("Prettier formatting failed:", error);
              return [];
            }
          },
        }
      );
      return () => formattingProvider.dispose();
    }
  }, [monaco]);
  
  useEffect(() => {
    if (monaco) {
      const suggestionProvider = monaco.languages.registerInlineCompletionsProvider(
        SUGGESTION_LANGUAGES,
        {
          provideInlineCompletions: (model, position) => {
            return new Promise((resolve) => {
              clearTimeout(suggestionTimeout.current);
              suggestionTimeout.current = setTimeout(async () => {
                const textUntilPosition = model.getValueInRange({
                  startLineNumber: 1,
                  startColumn: 1,
                  endLineNumber: position.lineNumber,
                  endColumn: position.column,
                });
                const suggestions = await getSuggestions(textUntilPosition, model.getLanguageId());
                resolve({ items: suggestions });
              }, 300);
            });
          },
        }
      );
      return () => suggestionProvider.dispose();
    }
  }, [monaco]);


  const getSuggestions = async (text, language) => {
    const trimmedText = text.trim();
    switch (language) {
      case "javascript":
        if (trimmedText.endsWith("console.log(")) return [{ insertText: "'Hello, World!');" }];
        break;
      case "python":
        if (trimmedText.endsWith("print(")) return [{ insertText: "'Hello, Python!')" }];
        break;
      case "css":
        if (trimmedText.endsWith("color:")) return [{ insertText: " #3366ff;" }];
        break;
      case "cpp":
         if (trimmedText.endsWith("std::cout <<")) return [{ insertText: ' "Hello, C++!";' }];
         break;
      case "java":
        if (trimmedText.endsWith("System.out.println(")) return [{ insertText: '"Hello, Java!");' }];
        break;
      case "c":
         if (trimmedText.endsWith("printf(")) return [{ insertText: '"Hello, C!");' }];
         break;
      default:
        return [];
    }
    return [];
  };

  const handleEditorDidMount = (editor, monacoInstance) => {
    editor.addAction({
      id: "format-document-on-save",
      label: "Format Document",
      keybindings: [monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS],
      run: async (editor) => {
        await editor.getAction("editor.action.formatDocument").run();
      },
      precondition: null,
      keybindingContext: null,
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.5,
    });
  };

  const getLanguage = (fileName) => {
    if (!fileName) return "plaintext";
    const extension = fileName.split(".").pop();
    switch (extension) {
      case "js": case "jsx": return "javascript";
      case "ts": case "tsx": return "typescript";
      case "css": return "css";
      case "scss": return "scss";
      case "json": return "json";
      case "html": return "html";
      case "md": return "markdown";
      case "py": return "python";
      case "java": return "java";
      case "c": return "c";
      case "cpp": return "cpp";
      default: return "plaintext";
    }
  };

  return (
    <>
      {/* Tab Bar */}
      <div className={styles.tabs}>
        {openTabs.map((tab) => (
          <div
            key={tab.path}
            onClick={() => setActiveTab(tab.path)}
            className={`${styles.subtabs} ${
              activeTab === tab.path ? styles.active : ""
            }`}
          >
            <File className={styles["subtabs-icons"]} />
            <span className="select-none">{tab.name}</span>
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleCloseTab(tab.path);
              }}
            >
              <X className={styles["subtabs-close"]} />
            </div>
          </div>
        ))}
      </div>

      {/* Editor Content */}
      <div className={styles.editor}>
        {activeFile ? (
          <Editor
            height="100%"
            width="100%"
            path={activeFile.path}
            language={getLanguage(activeFile.name)}
            value={activeFile.content}
            onChange={(value) => handleContentChange(activeFile.path, value || "")}
            onMount={handleEditorDidMount}
            onValidate={setProblems}
            theme="vs-dark"
            options={{
              fontSize: 14,
              wordWrap: "on",
              minimap: { enabled: true, autohide: true },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              formatOnPaste: true,
              formatOnType: true,
              bracketPairColorization: { enabled: true },
              inlineSuggest: { enabled: true },
              quickSuggestions: { other: "on", comments: "on", strings: "on" },
              acceptSuggestionOnEnter: "on",
              suggestOnTriggerCharacters: true,
              mouseWheelZoom: true,
              smoothScrolling: true,
              cursorSmoothCaretAnimation: 'on',
              selectOnLineNumbers: true,
              roundedSelection: false,
            }}
          />
        ) : (
          <div className={styles["empty-bg"]}>
            <img src="./empty.svg" alt="Empty editor" className={styles["empty-img"]}></img>
            <h1 className={styles.tagline}>
              Your Instant Development Environment
            </h1>
            <p className={styles.para}>
              Just open a tab to a consistent, powerful, and ready-to-use
              workspace, and focus purely on your code.
            </p>
          </div>
        )}
      </div>
    </>
  );
}