import { useState } from "react";

export default function usePip({ pyodide, isPyodideReady }) {
  const [isInstalling, setIsInstalling] = useState(false);

  const install = async (packageName, { stdout, stderr, onExit }) => {
    if (!isPyodideReady) {
      stderr("Pyodide is not ready. Cannot install packages.\n");
      onExit();
      return;
    }
    if (isInstalling) {
      stderr("Another installation is already in progress.\n");
      onExit();
      return;
    }
    if (!packageName) {
      stderr("Usage: pip install <package_name>\n");
      onExit();
      return;
    }

    setIsInstalling(true);
    
    try {
      await pyodide.loadPackage(packageName, {
        messageCallback: (msg) => stdout(msg + "\n"),
      });
      stdout(`\nSuccessfully installed ${packageName}.\n`);
    } catch (err) {
      stderr(`\nFailed to install package ${packageName}: ${err}\n`);
    } finally {
      setIsInstalling(false);
      onExit();
    }
  };

  return { install, isInstalling };
}