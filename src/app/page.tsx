"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type * as monaco from "monaco-editor";
import type { VimMode } from "monaco-vim";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

const COMMANDS: Record<string, string> = {
  help: `Available commands:
help     Show help info
clear    Clear the editor
vim      Enable Vim mode
novim    Disable Vim mode
explain  Explain the code
fix      Suggest a fix
doc      Generate documentation
`,
  explain: "AI: Here's an explanation of your code (placeholder).",
  fix: "AI: Here's a suggested fix (placeholder).",
  doc: "AI: Here's generated documentation (placeholder).",
  vim: "Vim mode enabled!",
  novim: "Vim mode disabled!",
  "no vim": "Vim mode disabled!",
};

export default function HomePage() {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const vimStatusBarRef = useRef<HTMLDivElement | null>(null);
  const vimModeRef = useRef<VimMode | null>(null);
  const [vimEnabled, setVimEnabled] = useState(false);
  const [monacoVim, setMonacoVim] = useState<{
    initVimMode: typeof import("monaco-vim").initVimMode;
  } | null>(null);

  // Load monaco-vim on mount
  useEffect(() => {
    if (typeof window !== "undefined" && !monacoVim) {
      import("monaco-vim").then((vim) => {
        setMonacoVim(vim);
      });
    }
  }, [monacoVim]);

  // Always clean up Vim mode before enabling/disabling
  const cleanupVim = () => {
    if (vimModeRef.current) {
      vimModeRef.current.dispose();
      vimModeRef.current = null;
    }
    if (vimStatusBarRef.current) {
      vimStatusBarRef.current.innerHTML = "";
    }
  };

  // Enable Vim mode (safe)
  const enableVim = useCallback(async () => {
    cleanupVim();
    if (editorRef.current && vimStatusBarRef.current) {
      let vim = monacoVim;
      if (!vim) {
        vim = await import("monaco-vim");
        setMonacoVim(vim);
      }
      vimModeRef.current = vim.initVimMode(
        editorRef.current,
        vimStatusBarRef.current
      );
      setVimEnabled(true);
    }
  }, [monacoVim]);

  // Disable Vim mode (safe)
  const disableVim = useCallback(() => {
    cleanupVim();
    setVimEnabled(false);
  }, []);

  // Handle commands, with robust Vim/novim switching
  const handleEditorDidMount = (
    editor: monaco.editor.IStandaloneCodeEditor,
    monacoInstance: typeof monaco
  ) => {
    editorRef.current = editor;

    setTimeout(() => {
      editor.focus();
    }, 0);

    editor.addCommand(
      monacoInstance.KeyCode.Enter,
      async () => {
        if (!editorRef.current) return;
        const value = editorRef.current.getValue();
        const lines = value.split("\n");
        const lastLine = lines[lines.length - 1].trim().toLowerCase();

        if (lastLine === "clear") {
          editorRef.current.setValue("");
          return;
        }

        if (lastLine === "vim") {
          await enableVim();
        }
        if (lastLine === "novim" || lastLine === "no vim") {
          disableVim();
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupVim();
    };
  }, []);

  const initialCode = `# MDX Editor Terminal

Type 'help', 'vim', or 'novim', then press Enter!
Or use the button below to toggle Vim mode.
`;

  return (
    <main
      style={{ padding: 24 }}
      className="bg-neutral-900 text-white h-screen"
    >
      <h2 className="text-2xl font-bold text-white mb-4">
        MDX Editor (Monaco + Vim Toggle)
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
          marginBottom: 12,
          display: vimEnabled ? "block" : "none",
        }}
      />
      <button
        className={`px-4 py-2 rounded font-semibold mt-2 ${
          vimEnabled ? "bg-green-700 text-white" : "bg-gray-700 text-gray-200"
        }`}
        style={{
          border: 0,
          outline: 0,
          cursor: "pointer",
        }}
        onClick={vimEnabled ? disableVim : enableVim}
        disabled={false}
      >
        {vimEnabled ? "Disable Vim Mode" : "Enable Vim Mode"}
      </button>
      <div className="text-sm mt-2" style={{ opacity: 0.7 }}>
        Vim mode is <b>{vimEnabled ? "ON" : "OFF"}</b>
      </div>
    </main>
  );
}
