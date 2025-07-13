//src/app/page.tsx
"use client";

import React, { useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import type * as monaco from "monaco-editor";

// Dynamically import MonacoEditor (ssr: false!)
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

const COMMANDS: Record<string, string> = {
  help: `Available commands:
help     Show help info
clear    Clear the editor
explain  Explain the code
fix      Suggest a fix
doc      Generate documentation
`,
  explain: "AI: Here's an explanation of your code (placeholder).",
  fix: "AI: Here's a suggested fix (placeholder).",
  doc: "AI: Here's generated documentation (placeholder).",
};

export default function HomePage() {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const vimStatusBarRef = useRef<HTMLDivElement | null>(null);
  // monaco-vim only loaded client-side
  type VimMode = { dispose(): void };

  const vimModeRef = useRef<VimMode | null>(null);

  // Only set up Vim mode after editor and DOM are ready
  const handleEditorDidMount = async (
    editor: monaco.editor.IStandaloneCodeEditor,
    monacoInstance: typeof monaco
  ) => {
    editorRef.current = editor;

    // Focus the editor as soon as it mounts
    setTimeout(() => {
      editor.focus();
    }, 0);

    // Dynamically import monaco-vim on client
    if (typeof window !== "undefined" && vimStatusBarRef.current) {
      const monacoVim = await import("monaco-vim");
      vimModeRef.current = monacoVim.initVimMode(
        editor,
        vimStatusBarRef.current
      );
    }

    editor.addCommand(
      monacoInstance.KeyCode.Enter,
      () => {
        if (!editorRef.current) return;
        const value = editorRef.current.getValue();
        const lines = value.split("\n");
        const lastLine = lines[lines.length - 1].trim();

        if (lastLine === "clear") {
          editorRef.current.setValue("");
          return;
        }

        const output = COMMANDS[lastLine];
        if (output) {
          editorRef.current.setValue(value + "\n" + output + "\n");
          const model = editorRef.current.getModel();
          if (model) {
            const lineCount = model.getLineCount();
            editorRef.current.setPosition({
              lineNumber: lineCount + 1,
              column: 1,
            });
          }
        } else {
          editorRef.current.trigger("keyboard", "type", { text: "\n" });
        }
      },
      ""
    );
  };

  useEffect(() => {
    return () => {
      if (vimModeRef.current) {
        vimModeRef.current.dispose();
      }
    };
  }, []);

  const initialCode = `# MDX Editor Terminal

Type 'help' or 'clear', then press Enter!
`;

  return (
    <main
      style={{ padding: 24 }}
      className="bg-neutral-900 text-white h-screen"
    >
      <h2 className="text-2xl font-bold text-white mb-4">
        MDX Editor (Monaco + Vim + Clear Command)
      </h2>
      <div className="h-10/12 mb-4">
        <MonacoEditor
          height="100%"
          defaultLanguage="markdown"
          defaultValue={initialCode}
          theme="vs-dark"
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            wordWrap: "on",
            fontSize: 16,
            fontFamily: "monospace",
            renderLineHighlight: "none",
          }}
        />
      </div>
      <div
        ref={vimStatusBarRef}
        style={{
          height: 24,
          background: "#222",
          color: "#fff",
          padding: "2px 10px",
          fontFamily: "monospace",
          fontSize: "14px",
        }}
      />
    </main>
  );
}
