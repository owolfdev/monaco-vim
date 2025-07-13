// app/page.tsx
"use client";

import React, { useRef, useEffect } from "react";
import MonacoEditor, { OnMount } from "@monaco-editor/react";
import type * as monaco from "monaco-editor";
import { initVimMode, VimMode } from "monaco-vim";

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
  const vimModeRef = useRef<VimMode | null>(null);

  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;
    if (vimStatusBarRef.current) {
      vimModeRef.current = initVimMode(editor, vimStatusBarRef.current);
    }
    editor.addCommand(
      monacoInstance.KeyCode.Enter,
      () => {
        if (!editorRef.current) return;
        const value = editorRef.current.getValue();
        const lines = value.split("\n");
        const lastLine = lines[lines.length - 1].trim();

        if (lastLine === "clear") {
          // Clear the editor!
          editorRef.current.setValue("");
          return;
        }

        const output = COMMANDS[lastLine];
        if (output) {
          editorRef.current.setValue(value + "\n" + output + "\n");
          // Move cursor to end
          const model = editorRef.current.getModel();
          if (model) {
            const lineCount = model.getLineCount();
            editorRef.current.setPosition({
              lineNumber: lineCount + 1,
              column: 1,
            });
          }
        } else {
          // Default: insert newline
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
    <main style={{ padding: 24 }}>
      <h2>MDX Editor (Monaco + Vim + Clear Command)</h2>
      <div style={{ height: 400, marginBottom: 16 }}>
        <MonacoEditor
          height="100%"
          defaultLanguage="markdown"
          defaultValue={initialCode}
          theme="vs-dark"
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: false },
            wordWrap: "on",
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
