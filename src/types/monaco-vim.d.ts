declare module "monaco-vim" {
  import * as monaco from "monaco-editor";
  export function initVimMode(
    editor: monaco.editor.IStandaloneCodeEditor,
    statusBar: HTMLElement
  ): { dispose(): void };
  export type VimMode = ReturnType<typeof initVimMode>;
  // Optionally, export any other relevant types here if needed in the future
}
