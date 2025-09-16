import usePythonCompiler from "./pythonCompiler";
import useCppCompiler from "./cppCompiler";

export default function useCompilerRegistry(fileSystem) {
  return {
    python: usePythonCompiler(fileSystem),
    cpp: useCppCompiler(fileSystem),
    // c: useCCompiler(fileSystem),
    // java: useJavaCompiler(fileSystem),
  };
}
