import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DifficultyLevel } from "./difficulty";
import type { MainToWorkerMessage, WorkerToMainMessage } from "./messages";
import { UsiEngine } from "./usiEngine";

class MockWorker {
  onmessage: ((event: MessageEvent<WorkerToMainMessage>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  readonly postMessage = vi.fn((message: MainToWorkerMessage) => {
    if (message.type === "init") {
      this.emit({ type: "ready" });
    } else if (message.type === "send" && message.line === "usi") {
      this.emit({ type: "line", line: "usiok" });
    } else if (message.type === "send" && message.line === "isready") {
      this.emit({ type: "line", line: "readyok" });
    }
  });

  emit(message: WorkerToMainMessage): void {
    this.onmessage?.({ data: message } as MessageEvent<WorkerToMainMessage>);
  }
}

let lastWorker: MockWorker | null = null;

beforeEach(() => {
  lastWorker = null;
  vi.stubGlobal(
    "Worker",
    vi.fn(function MockWorkerConstructor() {
      lastWorker = new MockWorker();
      return lastWorker;
    }),
  );
});

describe("UsiEngine.configure", () => {
  it("sends explicit setoption commands for SkillLevel and NodesLimit", async () => {
    const engine = new UsiEngine();
    await engine.launch();
    const worker = lastWorker;
    if (!worker) throw new Error("worker was not created");
    worker.postMessage.mockClear();

    const level: DifficultyLevel = {
      label: "test",
      skillLevel: 4,
      nodesLimit: 8_000,
      movetimeMs: 800,
    };
    engine.configure(level);

    expect(worker.postMessage).toHaveBeenNthCalledWith(1, {
      type: "send",
      line: "setoption name SkillLevel value 4",
    });
    expect(worker.postMessage).toHaveBeenNthCalledWith(2, {
      type: "send",
      line: "setoption name NodesLimit value 8000",
    });
  });
});
