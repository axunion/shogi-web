export type MainToWorkerMessage =
  | { type: "init" }
  | { type: "send"; line: string };

export type WorkerToMainMessage =
  | { type: "ready" }
  | { type: "line"; line: string }
  | { type: "error"; message: string };
