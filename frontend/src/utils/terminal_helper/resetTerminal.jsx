export function resetTerminalState({
  setTerminals,
  setActiveTerminalId,
  setActiveView,
  setInstalledPackages,
  xtermInstancesRef,
  inputBuffersRef,
  commandBuffersRef,
  nextIdRef,
}) {
  Object.values(xtermInstancesRef.current).forEach((instance) => {
    if (instance && instance.term && !instance.term.isDisposed) {
      instance.term.dispose();
    }
    if (instance && instance.container && instance.container.parentElement) {
      instance.container.parentElement.removeChild(instance.container);
    }
  });

  xtermInstancesRef.current = {};
  inputBuffersRef.current = {};
  commandBuffersRef.current = {};
  nextIdRef.current = 2;

  setTerminals([{ id: 1, name: "orbit 1", cwd: "/" }]);
  setActiveTerminalId(1);
  setActiveView("TERMINAL");
  setInstalledPackages(new Set());
}
