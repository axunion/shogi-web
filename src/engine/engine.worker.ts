import type { YaneuraOuModule } from "@mizarjp/yaneuraou.k-p/lib/yaneuraou.module";
import type { MainToWorkerMessage, WorkerToMainMessage } from "./messages";

// The npm package is CJS/UMD and its wasm sibling asset can't be resolved
// reliably through Vite's bundler-mode module graph, so the engine files are
// copied into public/engine/ and evaluated here directly (importScripts
// isn't available in module workers, and Vite's dev server doesn't serve
// classic workers as plain scripts), which defines this global.
declare const YaneuraOu_K_P: (
  moduleOverrides?: Partial<YaneuraOuModule>,
) => Promise<YaneuraOuModule>;

const ENGINE_BASE_URL = "/engine/";

function post(message: WorkerToMainMessage): void {
  self.postMessage(message);
}

async function loadEngineScript(): Promise<void> {
  const response = await fetch(`${ENGINE_BASE_URL}yaneuraou.k-p.js`);
  const code = await response.text();
  // Indirect eval (calling eval through a reference rather than directly)
  // runs in global scope, so the script's top-level `var YaneuraOu_K_P = ...`
  // becomes a global, the same effect importScripts has in a classic worker.
  const globalEval = self.eval;
  globalEval(code);
}

async function init(): Promise<void> {
  try {
    await loadEngineScript();
    // mainScriptUrlOrBlob isn't in @types/emscripten, but the engine needs it
    // to bootstrap pthread workers: it can't infer its own script location
    // since the script was loaded via fetch+eval rather than a <script> tag.
    const overrides = {
      locateFile: (path: string) => `${ENGINE_BASE_URL}${path}`,
      mainScriptUrlOrBlob: `${ENGINE_BASE_URL}yaneuraou.k-p.js`,
    } as Partial<YaneuraOuModule>;
    const engine = await YaneuraOu_K_P(overrides);
    engine.addMessageListener((line) => post({ type: "line", line }));
    self.onmessage = (event: MessageEvent<MainToWorkerMessage>) => {
      if (event.data.type === "send") engine.postMessage(event.data.line);
    };
    post({ type: "ready" });
  } catch (error) {
    post({
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

self.onmessage = (event: MessageEvent<MainToWorkerMessage>) => {
  if (event.data.type === "init") init();
};
