import type { MainToWorkerMessage, WorkerToMainMessage } from "./messages";

const SEARCH_TIMEOUT_MS = 30_000;

export class UsiEngine {
  private worker: Worker | null = null;
  private readonly bestmoveListeners = new Set<(line: string) => void>();

  launch(): Promise<void> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        new URL("./engine.worker.ts", import.meta.url),
        { type: "module" },
      );
      this.worker = worker;

      let usiokReceived = false;

      worker.onerror = (event: ErrorEvent) => {
        reject(new Error(event.message));
      };

      worker.onmessage = (event: MessageEvent<WorkerToMainMessage>) => {
        const message = event.data;
        if (message.type === "ready") {
          this.send("usi");
          return;
        }
        if (message.type === "error") {
          reject(new Error(message.message));
          return;
        }

        console.debug(`< ${message.line}`);
        for (const listener of this.bestmoveListeners) listener(message.line);

        if (!usiokReceived && message.line === "usiok") {
          usiokReceived = true;
          this.send("isready");
        } else if (usiokReceived && message.line === "readyok") {
          resolve();
        }
      };

      this.postToWorker({ type: "init" });
    });
  }

  newGame(): void {
    this.send("usinewgame");
  }

  search(usiPosition: string, movetimeMs: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.bestmoveListeners.delete(listener);
        reject(new Error("Engine search timed out"));
      }, SEARCH_TIMEOUT_MS);

      const listener = (line: string) => {
        if (!line.startsWith("bestmove")) return;
        clearTimeout(timeout);
        this.bestmoveListeners.delete(listener);
        const [, move] = line.split(" ");
        resolve(move);
      };
      this.bestmoveListeners.add(listener);

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
