export function normalizePath(path) {
    const parts = path.split("/").filter(Boolean);
    const stack = [];
    for (let part of parts) {
      if (part === "..") stack.pop();
      else if (part !== ".") stack.push(part);
    }
    return "/" + stack.join("/");
  };

export function addNodeByPath(nodes, parentPath, newNode) {
  return nodes.map((node) => {
    if (node.path === parentPath) {
      return { ...node, children: [...(node.children || []), newNode] };
    }
    if (node.type === "folder" && node.children) {
      return {
        ...node,
        children: addNodeByPath(node.children, parentPath, newNode),
      };
    }
    return node;
  });
}

export function deleteNodeByPath(nodes, path) {
  return nodes
    .map((node) => {
      if (node.type === "folder" && node.children) {
        node.children = deleteNodeByPath(node.children, path);
      }
      return node;
    })
    .filter((node) => node.path !== path);
}

export function findNodeByPath(nodes, path) {
  for (let node of nodes) {
    if (node.path === path) return node;
    if (node.type === "folder" && node.children) {
      const found = findNodeByPath(node.children, path);
      if (found) return found;
    }
  }
  return null;
}
