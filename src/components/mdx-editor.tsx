//src/components/mdx-editor.tsx
"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type * as monaco from "monaco-editor";
import type { VimMode } from "monaco-vim";

// Lazy-load Monaco Editor for client only
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

type MdxEditorProps = {
  initialCode?: string;
  height?: string | number;
};

export default function MdxEditor({
  initialCode = `# MDX Editor Terminal

Type 'help', 'vim', or 'novim', then press Enter!
Or use the button below to toggle Vim mode.
`,
  height = "400px",
}: MdxEditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const vimStatusBarRef = useRef<HTMLDivElement | null>(null);
  const vimModeRef = useRef<VimMode | null>(null);
  const [vimEnabled, setVimEnabled] = useState(false);
  const [monacoVim, setMonacoVim] = useState<{
    initVimMode: typeof import("monaco-vim").initVimMode;
  } | null>(null);

  // Load monaco-vim on mount (only in browser)
  useEffect(() => {
    if (typeof window !== "undefined" && !monacoVim) {
      import("monaco-vim").then((vim) => setMonacoVim(vim));
    }
  }, [monacoVim]);

  // Cleanup Vim mode
  const cleanupVim = useCallback(() => {
    if (vimModeRef.current) {
      vimModeRef.current.dispose();
      vimModeRef.current = null;
    }
    if (vimStatusBarRef.current) {
      vimStatusBarRef.current.innerHTML = "";
    }
  }, []);

  // Enable Vim mode
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
  }, [cleanupVim, monacoVim]);

  // Disable Vim mode
  const disableVim = useCallback(() => {
    cleanupVim();
    setVimEnabled(false);
  }, [cleanupVim]);

  // Handle commands (run on Enter key)
  const handleEditorDidMount = (
    editor: monaco.editor.IStandaloneCodeEditor,
    monacoInstance: typeof monaco
  ) => {
    editorRef.current = editor;

    // Add Link Provider for clickable URLs (optional)
    monacoInstance.languages.registerLinkProvider("markdown", {
      provideLinks(model) {
        const links: monaco.languages.ILink[] = [];
        const regex = /https?:\/\/[^\s)]+/g;
        const lines = model.getLinesContent();
        lines.forEach((line, i) => {
          let match;
          while ((match = regex.exec(line))) {
            links.push({
              range: new monacoInstance.Range(
                i + 1,
                match.index + 1,
                i + 1,
                match.index + match[0].length + 1
              ),
              url: match[0],
            });
          }
        });
        return { links };
      },
    });

    // Inside handleEditorDidMount, after editor.focus();
    setTimeout(() => {
      editor.focus();

      const model = editor.getModel();
      if (model) {
        let lastLine = model.getLineCount();

        // Check if the last line is empty, if not, add a new line
        if (model.getLineContent(lastLine).trim() !== "") {
          model.pushEditOperations(
            [],
            [
              {
                range: new monacoInstance.Range(
                  lastLine + 1,
                  1,
                  lastLine + 1,
                  1
                ),
                text: "\n",
                forceMoveMarkers: true,
              },
            ],
            () => null
          );
          lastLine += 1;
        }

        editor.setPosition({
          lineNumber: lastLine,
          column: 1,
        });
      }
    }, 0);

    // Custom Enter key handler
    editor.addCommand(
      monacoInstance.KeyCode.Enter,
      async () => {
        if (!editorRef.current) return;
        const position = editorRef.current.getPosition();
        if (!position) return;
        const model = editorRef.current.getModel();
        if (!model) return;

        // Get current line content
        const lineContent = model
          .getLineContent(position.lineNumber)
          .trim()
          .toLowerCase();

        // Command handling
        if (lineContent === "clear") {
          editorRef.current.setValue("");
          return;
        }
        if (lineContent === "vim") {
          await enableVim();
        }
        if (lineContent === "novim" || lineContent === "no vim") {
          disableVim();
        }
        const output = COMMANDS[lineContent];
        if (output) {
          // Insert output after current line
          const edits = [
            {
              range: new monacoInstance.Range(
                position.lineNumber + 1,
                1,
                position.lineNumber + 1,
                1
              ),
              text: output + "\n",
              forceMoveMarkers: true,
            },
          ];
          model.pushEditOperations([], edits, () => null);

          // Move cursor to the line after the output
          const linesInserted = output.split("\n").length;
          editorRef.current.setPosition({
            lineNumber: position.lineNumber + linesInserted + 1,
            column: 1,
          });
        } else {
          // Default: just insert newline
          editorRef.current.trigger("keyboard", "type", { text: "\n" });
        }
      },
      ""
    );
  };

  // Cleanup Vim on unmount
  useEffect(() => {
    return () => {
      cleanupVim();
    };
  }, [cleanupVim]);

  return (
    <div>
      <div style={{ height, marginBottom: 8 }}>
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
    </div>
  );
}
