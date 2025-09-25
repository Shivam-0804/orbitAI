export const getFileIcon = (fileName) => {
  const extension = fileName.split('.').pop().toLowerCase();

  const iconMap = {
    py: '/icons/python.svg',
    jsx: '/icons/react.svg',
    js: '/icons/js.svg',
    cpp: '/icons/cpp.svg',
    c: '/icons/c.svg',
    java: '/icons/java.svg',
    html: '/icons/html.svg',
    css: '/icons/css.svg',
    json: '/icons/json.png'
  };

  return iconMap[extension] || '/icons/file.svg';
};