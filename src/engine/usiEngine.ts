import type { MainToWorkerMessage, WorkerToMainMessage } from "./messages";

const SEARCH_TIMEOUT_MS = 30_000;
const LAUNCH_TIMEOUT_MS = 30_000;

export class UsiEngine {
  private worker: Worker | null = null;
  private readonly bestmoveListeners = new Set<(line: string) => void>();
  // Incremented when a search is aborted before its bestmove arrives: the
  // engine still replies to "stop" with a bestmove for the aborted search,
  // and that line must be swallowed here rather than dispatched to whatever
  // listener happens to be registered by the time it shows up (bestmoveListeners
  // carries no per-search tag, so a later, unrelated search's listener would
  // otherwise resolve with a stale move).
  private pendingStaleBestmoves = 0;

  launch(): Promise<void> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        new URL("./engine.worker.ts", import.meta.url),
        { type: "module" },
      );
      this.worker = worker;

      let usiokReceived = false;

      const timeout = setTimeout(() => {
        reject(new Error("Engine launch timed out"));
      }, LAUNCH_TIMEOUT_MS);

      worker.onerror = (event: ErrorEvent) => {
        clearTimeout(timeout);
        reject(new Error(event.message));
      };

      worker.onmessage = (event: MessageEvent<WorkerToMainMessage>) => {
        const message = event.data;
        if (message.type === "ready") {
          this.send("usi");
          return;
        }
        if (message.type === "error") {
          clearTimeout(timeout);
          reject(new Error(message.message));
          return;
        }

        console.debug(`< ${message.line}`);
        if (
          this.pendingStaleBestmoves > 0 &&
          message.line.startsWith("bestmove")
        ) {
          this.pendingStaleBestmoves--;
          return;
        }
        for (const listener of this.bestmoveListeners) listener(message.line);

        if (!usiokReceived && message.line === "usiok") {
          usiokReceived = true;
          this.send("isready");
        } else if (usiokReceived && message.line === "readyok") {
          clearTimeout(timeout);
          resolve();
        }
      };

      this.postToWorker({ type: "init" });
    });
  }

  newGame(): void {
    this.send("usinewgame");
  }

  /**
   * Runs a search. If `signal` aborts before a bestmove arrives, the pending
   * listener is removed immediately and "stop" is sent so the engine actually
   * halts instead of burning CPU in the background. The engine still replies
   * to "stop" with a bestmove for the aborted search; `pendingStaleBestmoves`
   * ensures that reply is swallowed instead of resolving a later search.
   */
  search(
    usiPosition: string,
    movetimeMs: number,
    signal?: AbortSignal,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new Error("Search aborted"));
        return;
      }

      const cleanup = () => {
        clearTimeout(timeout);
        this.bestmoveListeners.delete(listener);
        signal?.removeEventListener("abort", onAbort);
      };

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Engine search timed out"));
      }, SEARCH_TIMEOUT_MS);

      const listener = (line: string) => {
        if (!line.startsWith("bestmove")) return;
        cleanup();
        const [, move] = line.split(" ");
        resolve(move);
      };

      const onAbort = () => {
        cleanup();
        this.pendingStaleBestmoves++;
        this.send("stop");
        reject(new Error("Search aborted"));
      };

      this.bestmoveListeners.add(listener);
      signal?.addEventListener("abort", onAbort);

      this.send(usiPosition);
      this.send(`go movetime ${movetimeMs}`);
    });
  }

  private send(line: string): void {
    console.debug(`> ${line}`);
    this.postToWorker({ type: "send", line });
  }

  private postToWorker(message: MainToWorkerMessage): void {
    this.worker?.postMessage(message);
  }
}
