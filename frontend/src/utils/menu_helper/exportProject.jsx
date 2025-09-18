import JSZip from "jszip";

export const exportProject = async (initialFileSystem) => {
  const zip = new JSZip();

  const addToZip = (node, folderRef) => {
    if (node.type === "file") {
      folderRef.file(node.name, node.content || "");
    } else if (node.type === "folder") {
      const newFolder = folderRef.folder(node.name === "/" ? "" : node.name);
      node.children?.forEach((child) => addToZip(child, newFolder));
    }
  };

  initialFileSystem.forEach((node) => addToZip(node, zip));

  const blob = await zip.generateAsync({ type: "blob" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "project.zip";
  link.click();

  URL.revokeObjectURL(link.href);
};
