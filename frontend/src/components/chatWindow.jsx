import React, { useState, useEffect, useRef, useCallback } from 'react';

// STYLES: Normally, this would be in a separate AIChatWindow.module.css file.
// Due to the single-file requirement, it's included here.
const ChatWindowStyles = () => (
  <style>{`
    :root {
      --chat-bg: #212121;
      --chat-header-bg: #1a1a1a;
      --chat-text: #e0e0e0;
      --chat-border: #424242;
      --chat-input-bg: #303030;
      --chat-accent: #3f52b5;
      --chat-accent-hover: #4d63d1;
      --user-bubble-bg: #3f52b5;
      --ai-bubble-bg: #333333;
      --error-bubble-bg: #4a2525;
      --error-bubble-border: #a83232;
      --error-bubble-text: #ffc4c4;
      --welcome-text: #666;
      --code-bg: #111;
    }

    .chat-window-wrapper {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        box-sizing: border-box;
    }
    
    .chat-window-wrapper *,
    .chat-window-wrapper *::before,
    .chat-window-wrapper *::after {
        box-sizing: border-box;
    }

    .ai-chat-container {
      position: fixed;
      z-index: 10000;
      background-color: var(--chat-bg);
      border: 1px solid var(--chat-border);
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      color: var(--chat-text);
      transition: opacity 0.3s ease, transform 0.3s ease;
      user-select: none;
    }

    .ai-chat-container.pinned { z-index: 99999; }
    .ai-chat-container.minimized {
      opacity: 0;
      transform: scale(0.8) translateY(200px);
      pointer-events: none;
    }
    
    .restore-button {
      position: fixed; bottom: 20px; right: 20px; background-color: var(--chat-accent); color: white;
      border: none; border-radius: 50%; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center;
      cursor: pointer; box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
      transition: transform 0.2s ease, background-color 0.2s ease;
      z-index: 10000; opacity: 0; transform: scale(0);
    }
    .restore-button.visible { opacity: 1; transform: scale(1); }
    .restore-button:hover { background-color: var(--chat-accent-hover); transform: scale(1.1); }

    .chat-header {
      background-color: var(--chat-header-bg); padding: 8px 12px; cursor: grab; display: flex;
      align-items: center; justify-content: space-between; border-bottom: 1px solid var(--chat-border); flex-shrink: 0;
    }
    .chat-header:active { cursor: grabbing; }

    .chat-header-title { font-weight: 600; font-size: 1rem; }
    .header-controls { display: flex; gap: 8px; }

    .control-button {
      background: none; border: none; color: #ccc; cursor: pointer; padding: 4px; border-radius: 5px;
      display: flex; align-items: center; justify-content: center; transition: background-color 0.2s ease, color 0.2s ease;
    }
    .control-button:hover { background-color: rgba(255, 255, 255, 0.1); }
    .control-button.active { color: var(--chat-accent); }
    
    .chat-body {
      flex-grow: 1; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px;
    }
    .chat-body-welcome {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      height: 100%; text-align: center; color: var(--welcome-text);
    }
    .welcome-logo { font-size: 2.5rem; margin-bottom: 8px; }
    .welcome-title { font-size: 1.2rem; font-weight: 600; color: #999; }
    .welcome-subtitle { font-size: 0.9rem; }

    .chat-body::-webkit-scrollbar { width: 6px; }
    .chat-body::-webkit-scrollbar-track { background: var(--chat-header-bg); }
    .chat-body::-webkit-scrollbar-thumb { background-color: var(--chat-border); border-radius: 10px; }

    .chat-message { max-width: 80%; padding: 10px 14px; border-radius: 18px; line-height: 1.5; font-size: 0.95rem; word-wrap: break-word; }
    .chat-message.user { background-color: var(--user-bubble-bg); align-self: flex-end; border-bottom-right-radius: 4px; color: white; }
    .chat-message.ai { background-color: var(--ai-bubble-bg); align-self: flex-start; border-bottom-left-radius: 4px; padding: 0; overflow: hidden; }
    .ai-message-content { padding: 10px 14px; }
    .chat-message.attachment-info { 
        background-color: transparent; border: 1px solid var(--chat-border);
        color: #ccc; align-self: flex-end; font-size: 0.85rem; font-style: italic;
    }
    .chat-message.error {
        background-color: var(--error-bubble-bg);
        border: 1px solid var(--error-bubble-border);
        color: var(--error-bubble-text);
        align-self: flex-start;
        border-bottom-left-radius: 4px;
    }
    
    .code-block { background-color: var(--code-bg); font-family: 'Fira Code', monospace; font-size: 0.9rem; margin: 10px 0; border-radius: 8px; overflow: hidden; }
    .code-block-header { background-color: #333; padding: 6px 12px; font-size: 0.8rem; color: #ccc; }
    .code-block pre { margin: 0; padding: 12px; overflow-x: auto; }
    .code-block code { white-space: pre-wrap; }

    .typing-indicator { align-self: flex-start; display: flex; gap: 4px; padding: 10px 14px; background-color: var(--ai-bubble-bg); border-radius: 18px; border-bottom-left-radius: 4px; }
    .typing-indicator span { width: 8px; height: 8px; background-color: #888; border-radius: 50%; animation: bounce 1.4s infinite ease-in-out both; }
    .typing-indicator span:nth-of-type(1) { animation-delay: -0.32s; }
    .typing-indicator span:nth-of-type(2) { animation-delay: -0.16s; }
    @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1.0); } }

    .chat-footer { padding: 12px; border-top: 1px solid var(--chat-border); flex-shrink: 0; }
    .chat-input-form { display: flex; align-items: center; gap: 10px; }
    .chat-input {
      flex-grow: 1; background-color: var(--chat-input-bg); border: 1px solid var(--chat-border); color: var(--chat-text);
      border-radius: 8px; padding: 10px 14px; font-size: 1rem; resize: none; transition: border-color 0.2s ease;
    }
    .chat-input:focus { outline: none; border-color: var(--chat-accent); }

    .send-button {
      background-color: var(--chat-accent); border: none; color: white; border-radius: 8px; padding: 10px;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: background-color 0.2s ease;
    }
    .send-button:hover { background-color: var(--chat-accent-hover); }
    .send-button:disabled { background-color: var(--user-bubble-bg); opacity: 0.5; cursor: not-allowed; }

    .staged-files-container {
        display: flex; flex-wrap: wrap; gap: 8px; padding: 0 0 10px;
    }
    .staged-file {
        background-color: var(--chat-input-bg); border: 1px solid var(--chat-border);
        border-radius: 15px; padding: 4px 10px; font-size: 0.8rem;
        display: flex; align-items: center; gap: 6px;
    }
    .remove-staged-file {
        background: none; border: none; color: #999; cursor: pointer;
        padding: 0; line-height: 1; font-size: 1.2rem;
    }
    .remove-staged-file:hover { color: white; }

    .resize-handle { position: absolute; z-index: 10; }
    .resize-handle.top, .resize-handle.bottom { height: 10px; left: 10px; right: 10px; cursor: ns-resize; }
    .resize-handle.top { top: -5px; } .resize-handle.bottom { bottom: -5px; }
    .resize-handle.left, .resize-handle.right { width: 10px; top: 10px; bottom: 10px; cursor: ew-resize; }
    .resize-handle.left { left: -5px; } .resize-handle.right { right: -5px; }
    .resize-handle.top-left { width: 15px; height: 15px; top: -7px; left: -7px; cursor: nwse-resize; }
    .resize-handle.top-right { width: 15px; height: 15px; top: -7px; right: -7px; cursor: nesw-resize; }
    .resize-handle.bottom-left { width: 15px; height: 15px; bottom: -7px; left: -7px; cursor: nesw-resize; }
    .resize-handle.bottom-right { width: 15px; height: 15px; bottom: -7px; right: -7px; cursor: nwse-resize; }
    
    .modal-overlay {
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background-color: rgba(0,0,0,0.6); backdrop-filter: blur(5px);
        display: flex; align-items: center; justify-content: center; z-index: 10001;
    }
    .modal-container {
        background-color: var(--chat-bg); border: 1px solid var(--chat-border); border-radius: 12px;
        width: 90%; max-width: 550px;
        display: flex; flex-direction: column; box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    .modal-header {
        padding: 16px; border-bottom: 1px solid var(--chat-border); display: flex; align-items: center; justify-content: space-between;
        color: var(--chat-text); flex-shrink: 0;
    }
    .modal-title { font-size: 1.1rem; font-weight: 600; }
    .modal-close-btn { background: none; border: none; color: #ccc; cursor: pointer; font-size: 1.5rem; }
    .modal-body { padding: 20px; }
    .modal-footer {
        padding: 12px 16px; border-top: 1px solid var(--chat-border); display: flex; justify-content: flex-end; gap: 10px; flex-shrink: 0;
    }
    .modal-footer button {
        padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;
        transition: background-color 0.2s;
    }
    .btn-secondary { background-color: var(--chat-border); color: white; }
    .btn-secondary:hover { background-color: #555; }
    .btn-primary { background-color: var(--chat-accent); color: white; }
    .btn-primary:hover { background-color: var(--chat-accent-hover); }
    .btn-primary:disabled { background-color: var(--chat-border); opacity: 0.6; cursor: not-allowed; }

    /* File Picker Modal Specifics */
    .file-picker-modal { max-height: 75vh; }
    .file-picker-upload-area { padding: 16px; border-bottom: 1px solid var(--chat-border); flex-shrink: 0; }
    .upload-button {
        width: 100%; padding: 12px; background-color: var(--chat-input-bg);
        border: 2px dashed var(--chat-border); color: #ccc; border-radius: 8px; cursor: pointer;
        display: flex; align-items: center; justify-content: center; gap: 10px; font-weight: 500;
        transition: background-color 0.2s, border-color 0.2s;
    }
    .upload-button:hover { background-color: #383838; border-color: var(--chat-accent); }
    .file-picker-body { flex-grow: 1; overflow-y: auto; padding: 8px; }
    .file-picker-list { list-style: none; padding: 0; margin: 0; }
    .file-picker-item {
        display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 6px;
        cursor: pointer; transition: background-color 0.2s ease; color: var(--chat-text); font-size: 0.95rem;
    }
    .file-picker-item:hover { background-color: var(--chat-input-bg); }
    .file-picker-item-icon { color: #ccc; flex-shrink: 0; }
    .file-picker-path { padding: 8px 16px; font-size: 0.9rem; color: #888; display: flex; align-items: center; gap: 8px; }

    /* Settings Modal Specifics */
    .settings-form-group { margin-bottom: 20px; }
    .settings-label { display: block; margin-bottom: 8px; font-weight: 500; font-size: 0.9rem; color: #ccc; }
    .settings-select, .settings-input {
      width: 100%; background-color: var(--chat-input-bg); border: 1px solid var(--chat-border); color: var(--chat-text);
      border-radius: 6px; padding: 10px; font-size: 1rem;
    }
    .settings-select:focus, .settings-input:focus { outline: none; border-color: var(--chat-accent); }
    
    /* Custom Checkbox */
    .custom-checkbox { display: block; position: relative; padding-left: 28px; cursor: pointer; user-select: none; }
    .custom-checkbox input { position: absolute; opacity: 0; cursor: pointer; height: 0; width: 0; }
    .checkmark {
        position: absolute; top: -3px; left: 0; height: 20px; width: 20px;
        background-color: var(--chat-input-bg); border: 1px solid var(--chat-border); border-radius: 4px;
        transition: background-color 0.2s, border-color 0.2s;
    }
    .custom-checkbox:hover input ~ .checkmark { border-color: var(--chat-accent); }
    .custom-checkbox input:checked ~ .checkmark { background-color: var(--chat-accent); border-color: var(--chat-accent); }
    .checkmark:after {
        content: ""; position: absolute; display: none; left: 6px; top: 2px; width: 5px; height: 10px;
        border: solid white; border-width: 0 3px 3px 0; transform: rotate(45deg);
    }
    .custom-checkbox input:checked ~ .checkmark:after { display: block; }
  `}</style>
);

// --- HELPER FUNCTION to flatten the provided file system structure ---
const flattenFileSystem = (nodes) => {
    let flat = {};
    function recurse(node) {
        if (!node) return;
        if (node.path) {
            flat[node.path] = { ...node };
        }
        if (node.type === 'folder' && node.children) {
            node.children.forEach(recurse);
        }
    }
    nodes.forEach(recurse);
    return flat;
};

const SettingsModal = ({ onClose, settings, onSave }) => {
    const [localSettings, setLocalSettings] = useState(settings);

    const handleSave = () => {
        onSave(localSettings);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <h2 className="modal-title">Settings</h2>
                    <button className="modal-close-btn" onClick={onClose}>&times;</button>
                </header>
                <div className="modal-body">
                    <div className="settings-form-group">
                        <label className="settings-label" htmlFor="model-select">AI Model</label>
                        <select
                            id="model-select"
                            className="settings-select"
                            value={localSettings.model}
                            onChange={e => setLocalSettings({ ...localSettings, model: e.target.value })}
                        >
                            <option>Orbit-GPT 4.0</option>
                            <option>Gemini Pro</option>
                            <option>Claude 3</option>
                        </select>
                    </div>
                    <div className="settings-form-group">
                        <label className="settings-label" htmlFor="api-key-input">API Key</label>
                        <input
                            id="api-key-input"
                            type="password"
                            className="settings-input"
                            placeholder="Enter your API key"
                            value={localSettings.apiKey}
                            onChange={e => setLocalSettings({ ...localSettings, apiKey: e.target.value })}
                        />
                    </div>
                </div>
                <footer className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn-primary" onClick={handleSave}>Save</button>
                </footer>
            </div>
        </div>
    );
};

const FilePicker = ({ onClose, onFilesSelected, fileSystem }) => {
    const [currentPath, setCurrentPath] = useState('/');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const localFileInputRef = useRef(null);

    const currentDirectoryNode = fileSystem[currentPath];
    const parentPath = currentPath === '/' ? null : currentPath.substring(0, currentPath.lastIndexOf('/')) || '/';
    
    const handleFileToggle = (path) => setSelectedFiles(prev => prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]);
    
    const handleLocalFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            // We can't actually read local file content easily, so we just pass the name
            onFilesSelected([`local:${file.name}`]);
        }
        e.target.value = null;
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container file-picker-modal" onClick={(e) => e.stopPropagation()}>
                <header className="modal-header">
                    <h2 className="modal-title">Attach Files</h2>
                    <button className="modal-close-btn" onClick={onClose}>&times;</button>
                </header>
                 <div className="file-picker-upload-area">
                    <input type="file" ref={localFileInputRef} onChange={handleLocalFileUpload} style={{ display: 'none' }} />
                    <button className="upload-button" onClick={() => localFileInputRef.current.click()}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M17 8L12 3L7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        <span>Upload from System</span>
                    </button>
                </div>
                 <div className="file-picker-path">
                    {parentPath !== null && <button className="control-button" onClick={() => setCurrentPath(parentPath)} title="Go back">&larr;</button>}
                    <span>{currentPath}</span>
                </div>
                <div className="file-picker-body">
                    <ul className="file-picker-list">
                        {currentDirectoryNode?.children?.map(childNode => {
                            if (!childNode) return null;
                            const isFolder = childNode.type === 'folder';
                            return (
                                <li key={childNode.path} className="file-picker-item" onClick={() => isFolder && setCurrentPath(childNode.path)}>
                                    <div className="file-picker-item-icon">{isFolder ? '📁' : '📄'}</div>
                                    {isFolder ? (<span>{childNode.name}</span>) : (
                                        <label className="custom-checkbox" style={{width: '100%'}}>
                                            <span>{childNode.name}</span>
                                            <input type="checkbox" checked={selectedFiles.includes(childNode.path)} onChange={() => handleFileToggle(childNode.path)} />
                                            <span className="checkmark"></span>
                                        </label>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
                <footer className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn-primary" disabled={selectedFiles.length === 0} onClick={() => onFilesSelected(selectedFiles)}>
                        Attach {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}
                    </button>
                </footer>
            </div>
        </div>
    );
};

const FormattedMessage = ({ text }) => {
    const parts = text.split(/(```[\s\S]*?```)/g);
    return (
        <div className="ai-message-content">
            {parts.map((part, i) => {
                if (part.startsWith('```') && part.endsWith('```')) {
                    const code = part.slice(3, -3).trim();
                    const lang = code.match(/^[a-z]+\n/)?.[0].trim() || '';
                    const finalCode = code.replace(/^[a-z]+\n/, '');
                    return (
                        <div key={i} className="code-block">
                            {lang && <div className="code-block-header">{lang}</div>}
                            <pre><code>{finalCode}</code></pre>
                        </div>
                    );
                }
                return <p key={i} style={{margin: 0}}>{part}</p>;
            })}
        </div>
    );
};


const AIChatWindow = ({ fileSystemData }) => {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [position, setPosition] = useState(null);
    const [size, setSize] = useState({ width: 450, height: 650 });
    const [isPinned, setIsPinned] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isFilePickerOpen, setIsFilePickerOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [settings, setSettings] = useState({ model: 'Orbit-GPT 4.0', apiKey: '' });
    const [fileSystem, setFileSystem] = useState({});
    const [stagedFiles, setStagedFiles] = useState([]);

    const chatBodyRef = useRef(null);
    const animationFrame = useRef(null);
    
    useEffect(() => {
        if (fileSystemData) setFileSystem(flattenFileSystem(fileSystemData));
    }, [fileSystemData]);

    useEffect(() => {
        const initialX = window.innerWidth - size.width - 20;
        const initialY = (window.innerHeight - size.height) / 2;
        setPosition({ x: Math.max(0, initialX), y: Math.max(0, initialY) });
    }, [size.width, size.height]);

    useEffect(() => {
        if(chatBodyRef.current) chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }, [messages, isLoading]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (isLoading || (inputValue.trim() === '' && stagedFiles.length === 0)) return;

        const newMessages = [];
        
        if (stagedFiles.length > 0) {
            stagedFiles.forEach(file => {
                newMessages.push({
                    id: Date.now() + Math.random(),
                    text: `Attached file: ${file.name}`,
                    sender: 'user', type: 'attachment-info'
                });
            });
        }
        
        if (inputValue.trim() !== '') {
            newMessages.push({ id: Date.now(), text: inputValue, sender: 'user' });
        }
        
        setMessages(prev => [...prev, ...newMessages]);
        setInputValue('');
        setStagedFiles([]);
        setIsLoading(true);

        setTimeout(() => {
            if (Math.random() < 0.2) { // 20% chance of error
                 setMessages(prev => [...prev, {
                    id: Date.now() + 1,
                    text: 'Oops! An error occurred. Please check your connection and API key, then try again.',
                    sender: 'ai', type: 'error'
                 }]);
            } else {
                const aiResponseText = `This is a simulated response based on your input${stagedFiles.length > 0 ? ' and attached files' : ''}.`;
                const aiResponse = { 
                    id: Date.now() + 1, text: aiResponseText, sender: 'ai' 
                };
                setMessages(prev => [...prev, aiResponse]);
            }
            setIsLoading(false);
        }, 2000);
    };

    const handleFilesSelected = (selectedPaths) => {
        const files = selectedPaths.map(path => fileSystem[path]).filter(Boolean);
        setStagedFiles(prev => {
            const newFiles = files.filter(f => !prev.some(pf => pf.path === f.path));
            return [...prev, ...newFiles];
        });
        setIsFilePickerOpen(false);
    };
    
    const removeStagedFile = (pathToRemove) => {
        setStagedFiles(prev => prev.filter(file => file.path !== pathToRemove));
    }

    const dragInfo = useRef({}); const resizeInfo = useRef({});
    const handleMouseDownDrag = (e) => { if (!e.target.closest('.control-button')) { dragInfo.current = { isDragging: true, offsetX: e.clientX - position.x, offsetY: e.clientY - position.y }; e.preventDefault(); }};
    const handleMouseDownResize = (e, handle) => { resizeInfo.current = { isResizing: true, handle, startX: e.clientX, startY: e.clientY, startWidth: size.width, startHeight: size.height, startXPos: position.x, startYPos: position.y }; e.preventDefault(); };
    const handleMouseMove = useCallback((e) => {
        if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
        animationFrame.current = requestAnimationFrame(() => {
            if (dragInfo.current.isDragging) { let newX = e.clientX - dragInfo.current.offsetX, newY = e.clientY - dragInfo.current.offsetY; const maxWidth = window.innerWidth - size.width, maxHeight = window.innerHeight - size.height; setPosition({ x: Math.max(0, Math.min(newX, maxWidth)), y: Math.max(0, Math.min(newY, maxHeight)) }); }
            if (resizeInfo.current.isResizing) { const { handle, startX, startY, startWidth, startHeight, startXPos, startYPos } = resizeInfo.current; let newWidth = startWidth, newHeight = startHeight, newX = startXPos, newY = startYPos; const minWidth = 320, minHeight = 400; const dx = e.clientX - startX, dy = e.clientY - startY; if (handle.includes('right')) newWidth = Math.max(minWidth, startWidth + dx); if (handle.includes('bottom')) newHeight = Math.max(minHeight, startHeight + dy); if (handle.includes('left')) { const calcWidth = startWidth - dx; if(calcWidth > minWidth) { newWidth = calcWidth; newX = startXPos + dx; } } if (handle.includes('top')) { const calcHeight = startHeight - dy; if(calcHeight > minHeight) { newHeight = calcHeight; newY = startYPos + dy; } } if (newX < 0) { newWidth += newX; newX = 0; } if (newY < 0) { newHeight += newY; newY = 0; } if (newX + newWidth > window.innerWidth) { newWidth = window.innerWidth - newX; } if (newY + newHeight > window.innerHeight) { newHeight = window.innerHeight - newY; } setSize({ width: newWidth, height: newHeight }); setPosition({ x: newX, y: newY }); }
        });
    }, [size.width, size.height]);
    const handleMouseUp = useCallback(() => {
        dragInfo.current.isDragging = false; resizeInfo.current.isResizing = false;
        if (animationFrame.current) { cancelAnimationFrame(animationFrame.current); animationFrame.current = null; }
    }, []);
    useEffect(() => { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); }; }, [handleMouseMove, handleMouseUp]);
    
    const resizeHandles = ['top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];

    if (!position) return null;

    return (
        <div className="chat-window-wrapper">
             {isFilePickerOpen && <FilePicker onClose={() => setIsFilePickerOpen(false)} onFilesSelected={handleFilesSelected} fileSystem={fileSystem} />}
             {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} settings={settings} onSave={setSettings} />}
             <div className={`ai-chat-container ${isPinned ? 'pinned' : ''} ${isMinimized ? 'minimized' : ''}`} style={{ transform: `translate(${position.x}px, ${position.y}px)`, width: `${size.width}px`, height: `${size.height}px` }}>
                {resizeHandles.map(handle => <div key={handle} className={`resize-handle ${handle}`} onMouseDown={(e) => handleMouseDownResize(e, handle)} />)}
                <header className="chat-header" onMouseDown={handleMouseDownDrag}>
                    <span className="chat-header-title">OrbitAI</span>
                    <div className="header-controls">
                        <button className="control-button" onClick={() => setIsSettingsOpen(true)} title="Settings"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.22 2H11.78C11.36 4.75 9.15 6.58 6.5 6.58C3.85 6.58 1.64 4.75 1.22 2H0.78C0.34 4.75 2.55 6.58 5.2 6.58C7.85 6.58 10.06 4.75 10.48 2H9.52C9.94 4.75 12.15 6.58 14.8 6.58C17.45 6.58 19.66 4.75 20.08 2H19.12C18.7 4.75 16.49 6.58 13.84 6.58C11.19 6.58 8.98 4.75 8.56 2H9.22C9.64 4.75 11.85 6.58 14.5 6.58C17.15 6.58 19.36 4.75 19.78 2H20.22C19.78 4.75 17.57 6.58 14.88 6.58C12.19 6.58 9.98 4.75 9.56 2H10.22C10.64 4.75 12.85 6.58 15.5 6.58C18.15 6.58 20.36 4.75 20.78 2H21.22C20.78 4.75 18.57 6.58 15.88 6.58C13.19 6.58 10.98 4.75 10.56 2H11.22C11.64 4.75 13.85 6.58 16.5 6.58C19.15 6.58 21.36 4.75 21.78 2H22.22C21.78 4.75 19.57 6.58 16.88 6.58C14.19 6.58 11.98 4.75 11.56 2H12.22V2Z" fill="currentColor"/><path d="M12.22 2H11.78C11.36 4.75 9.15 6.58 6.5 6.58C3.85 6.58 1.64 4.75 1.22 2H0.78C0.34 4.75 2.55 6.58 5.2 6.58C7.85 6.58 10.06 4.75 10.48 2H9.52C9.94 4.75 12.15 6.58 14.8 6.58C17.45 6.58 19.66 4.75 20.08 2H19.12C18.7 4.75 16.49 6.58 13.84 6.58C11.19 6.58 8.98 4.75 8.56 2H9.22C9.64 4.75 11.85 6.58 14.5 6.58C17.15 6.58 19.36 4.75 19.78 2H20.22C19.78 4.75 17.57 6.58 14.88 6.58C12.19 6.58 9.98 4.75 9.56 2H10.22C10.64 4.75 12.85 6.58 15.5 6.58C18.15 6.58 20.36 4.75 20.78 2H21.22C20.78 4.75 18.57 6.58 15.88 6.58C13.19 6.58 10.98 4.75 10.56 2H11.22C11.64 4.75 13.85 6.58 16.5 6.58C19.15 6.58 21.36 4.75 21.78 2H22.22C21.78 4.75 19.57 6.58 16.88 6.58C14.19 6.58 11.98 4.75 11.56 2H12.22V2Z" transform="translate(0 7)" fill="currentColor"/><path d="M12.22 2H11.78C11.36 4.75 9.15 6.58 6.5 6.58C3.85 6.58 1.64 4.75 1.22 2H0.78C0.34 4.75 2.55 6.58 5.2 6.58C7.85 6.58 10.06 4.75 10.48 2H9.52C9.94 4.75 12.15 6.58 14.8 6.58C17.45 6.58 19.66 4.75 20.08 2H19.12C18.7 4.75 16.49 6.58 13.84 6.58C11.19 6.58 8.98 4.75 8.56 2H9.22C9.64 4.75 11.85 6.58 14.5 6.58C17.15 6.58 19.36 4.75 19.78 2H20.22C19.78 4.75 17.57 6.58 14.88 6.58C12.19 6.58 9.98 4.75 9.56 2H10.22C10.64 4.75 12.85 6.58 15.5 6.58C18.15 6.58 20.36 4.75 20.78 2H21.22C20.78 4.75 18.57 6.58 15.88 6.58C13.19 6.58 10.98 4.75 10.56 2H11.22C11.64 4.75 13.85 6.58 16.5 6.58C19.15 6.58 21.36 4.75 21.78 2H22.22C21.78 4.75 19.57 6.58 16.88 6.58C14.19 6.58 11.98 4.75 11.56 2H12.22V2Z" transform="translate(0 14)" fill="currentColor"/></svg></button>
                        <button className="control-button" onClick={() => setMessages([])} title="Refresh Chat"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 4V10H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3.51 15C4.56279 17.5032 6.48981 19.5113 9.00002 20.44C11.5102 21.3688 14.3468 21.1329 16.78 19.82C19.2132 18.5071 20.9778 16.2617 21.65 13.55C22.3222 10.8383 21.83 7.97415 20.31 5.68001C18.79 3.38585 16.3868 1.88474 13.68 1.55001C10.9732 1.21527 8.24317 2.08373 6.18002 3.9L1 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                        <button className={`control-button ${isPinned ? 'active' : ''}`} onClick={() => setIsPinned(!isPinned)} title={isPinned ? 'Unpin' : 'Always on top'}><svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.5 3.5L9.5 9.5M8.5 2.5L12.5 3.5L11.5 7.5L8.5 6.5M6.5 12.5L3.5 13.5L2.5 9.5L5.5 8.5L9.5 9.5M6.5 12.5L9.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                        <button className="control-button" onClick={() => setIsMinimized(true)} title="Minimize"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 8.5H13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                    </div>
                </header>
                <div className="chat-body" ref={chatBodyRef}>
                    {messages.length === 0 ? (<div className="chat-body-welcome"><div className="welcome-logo">🚀</div><div className="welcome-title">Welcome to OrbitAI</div><div className="welcome-subtitle">Your instant working environment</div></div>) 
                    : (messages.map((msg) => (<div key={msg.id} className={`chat-message ${msg.sender} ${msg.type || ''}`}>{msg.type === 'error' ? msg.text : msg.sender === 'ai' ? <FormattedMessage text={msg.text} /> : msg.text}</div>)))}
                    {isLoading && <div className="typing-indicator"><span/><span/><span/></div>}
                </div>
                <footer className="chat-footer">
                    {stagedFiles.length > 0 && (
                        <div className="staged-files-container">
                            {stagedFiles.map(file => (
                                <div key={file.path} className="staged-file">
                                    <span>{file.name}</span>
                                    <button className="remove-staged-file" onClick={() => removeStagedFile(file.path)}>&times;</button>
                                </div>
                            ))}
                        </div>
                    )}
                    <form className="chat-input-form" onSubmit={handleSendMessage}>
                        <button type="button" className="control-button" onClick={() => setIsFilePickerOpen(true)} title="Attach file"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.5 7C13.837 7 13.1935 6.80429 12.6788 6.44661C12.1642 6.08893 11.8087 5.58983 11.666 5C11.1921 5.01186 10.7324 5.16688 10.3462 5.44473C9.96001 5.72258 9.66697 6.11189 9.5 6.56M16 12.5C14.86 14.59 12.44 15.93 9.77 15.65C7.1 15.37 4.88 13.5 3.74 11.41C2.6 9.32 2.81 6.78 4.26 4.88C5.71 2.98 8.12 2 10.5 2C12.88 2 15.29 2.98 16.74 4.88C18.19 6.78 18.4 9.32 17.26 11.41L12.5 19.5C12.1952 20.0135 11.7486 20.4357 11.2133 20.7221C10.6781 21.0084 10.0768 21.1472 9.47175 21.1215C8.8667 21.0958 8.27787 20.9067 7.76928 20.5735C7.26068 20.2403 6.85243 19.7768 6.59 19.25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                        <input type="text" className="chat-input" placeholder="Ask me anything..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
                        <button type="submit" className="send-button" disabled={isLoading || (!inputValue.trim() && stagedFiles.length === 0)}><svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.50002 14.5L14.5 1.5M1.50002 1.5L8.50002 8.5L14.5 1.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                    </form>
                </footer>
            </div>
            <button className={`restore-button ${isMinimized ? 'visible' : ''}`} onClick={() => setIsMinimized(false)} title="Restore Chat"><svg width="24" height="24" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.5 12.5L11.5 5.5M4.5 5.5L11.5 12.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
        </div>
    );
};

export default function App() {
  const initialFileSystem = [ { type: "folder", name: "/", path: "/", parentPath: null, children: [ { type: "folder", name: "src", path: "/src", parentPath: "/", children: [ { type: "file", name: "index.js", path: "/src/index.js", parentPath: "/src", content: `console.log("Hello World!");`, }, { type: "file", name: "App.jsx", path: "/src/App.jsx", parentPath: "/src", content: `import React from "react";\n\nexport default function App() {\n  return <h1>My React App</h1>;\n}`, }, { type: "folder", name: "components", path: "/src/components", parentPath: "/src", children: [ { type: "file", name: "Header.jsx", path: "/src/components/Header.jsx", parentPath: "/src/components", content: `import React from "react";\n\nexport default function Header() {\n  return <header>Header Component</header>;\n}`, }, ], }, ], }, { type: "folder", name: "public", path: "/public", parentPath: "/", children: [ { type: "file", name: "index.html", path: "/public/index.html", parentPath: "/public", content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <title>My App</title>\n</head>\n<body>\n  <div id="root"></div>\n</body>\n</html>`, }, ], }, { type: "file", name: "package.json", path: "/package.json", parentPath: "/", content: `{\n  "name": "my-project",\n  "version": "1.0.0",\n  "dependencies": {}\n}`, }, ], }, ];

  return (
    <>
      <ChatWindowStyles />
      <AIChatWindow fileSystemData={initialFileSystem} />
    </>
  );
}

