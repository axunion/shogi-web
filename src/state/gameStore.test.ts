import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface LoadOptions {
  settings?: Record<string, unknown>;
  usiMoves?: string[];
  resigned?: string;
  // Defaults to an engine that never finishes booting, so the store is
  // observed in the state it's in before the WASM engine is ready.
  launch?: () => Promise<void>;
}

// gameStore is a module-level singleton that reads localStorage on import, so
// each test seeds storage and imports a fresh copy with its own engine stub.
async function loadStore(options: LoadOptions = {}) {
  localStorage.clear();
  if (options.settings) {
    localStorage.setItem(
      "shogi-web:settings",
      JSON.stringify(options.settings),
    );
  }
  if (options.usiMoves) {
    localStorage.setItem(
      "shogi-web:game",
      JSON.stringify({
        version: 1,
        usiMoves: options.usiMoves,
        savedAt: new Date().toISOString(),
        ...(options.resigned ? { resigned: options.resigned } : {}),
      }),
    );
  }
  const launch = options.launch ?? (() => new Promise<void>(() => {}));
  vi.resetModules();
  vi.doMock("../engine/usiEngine", () => ({
    UsiEngine: class {
      launch = launch;
      configure() {}
      newGame() {}
      search() {
        return new Promise<string>(() => {});
      }
    },
  }));
  const { gameStore } = await import("./gameStore");
  return gameStore;
}

beforeEach(() => {
  // Launch failures are logged; keep the test output clean.
  vi.spyOn(console, "error").mockImplementation(() => {});
});

// A launch the test settles by hand, to act while the engine is booting.
function deferredLaunch() {
  let resolve = () => {};
  let reject: (error: Error) => void = () => {};
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {
    launch: () => promise,
    resolve: () => resolve(),
    reject: (error: Error) => reject(error),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.doUnmock("../engine/usiEngine");
  localStorage.clear();
});

// After 7g7f 3c3d, the bishop on 8h can capture on 2b with a choice to promote.
const BISHOP_EXCHANGE_READY = ["7g7f", "3c3d"];

describe("promotion prompt", () => {
  it("keeps the move unplayed and the piece selected when dismissed", async () => {
    const store = await loadStore({
      settings: { mode: "human" },
      usiMoves: BISHOP_EXCHANGE_READY,
    });

    store.selectSquare({ file: 8, rank: 8 });
    store.selectSquare({ file: 2, rank: 2 });
    expect(store.state.pendingPromotion).not.toBeNull();

    store.cancelPromotion();

    expect(store.state.pendingPromotion).toBeNull();
    expect(store.state.records).toHaveLength(2);
    expect(store.state.selection).toEqual({
      kind: "square",
      square: { file: 8, rank: 8 },
    });
    expect(store.state.legalTargets).toContainEqual({ file: 2, rank: 2 });
  });

  it("plays the chosen move when confirmed", async () => {
    const store = await loadStore({
      settings: { mode: "human" },
      usiMoves: BISHOP_EXCHANGE_READY,
    });

    store.selectSquare({ file: 8, rank: 8 });
    store.selectSquare({ file: 2, rank: 2 });
    store.confirmPromotion(true);

    expect(store.usiMoves()).toEqual([...BISHOP_EXCHANGE_READY, "8h2b+"]);
  });
});

describe("resuming before the engine is ready", () => {
  it("lets a resumed face-to-face game be played while the engine boots", async () => {
    const store = await loadStore({
      settings: { mode: "human" },
      usiMoves: ["7g7f"],
    });

    expect(store.state.status).toBe("playerTurn");
    store.selectSquare({ file: 3, rank: 3 });
    store.selectSquare({ file: 3, rank: 4 });

    expect(store.usiMoves()).toEqual(["7g7f", "3c3d"]);
  });

  it("keeps a resumed engine game waiting until the engine is ready", async () => {
    const boot = deferredLaunch();
    const store = await loadStore({
      settings: { mode: "engine" },
      usiMoves: ["7g7f", "3c3d"],
      launch: boot.launch,
    });

    expect(store.state.status).toBe("loading");
    expect(store.state.engine).toBe("booting");
    const started = store.startEngine();
    boot.resolve();
    await started;

    expect(store.state.engine).toBe("ready");
    expect(store.state.status).toBe("playerTurn");
  });

  it("keeps an engine game undone during boot waiting for the engine", async () => {
    const boot = deferredLaunch();
    const store = await loadStore({
      settings: { mode: "engine" },
      usiMoves: ["7g7f", "3c3d"],
      launch: boot.launch,
    });

    const started = store.startEngine();
    store.undo();
    expect(store.usiMoves()).toEqual([]);
    expect(store.state.status).toBe("loading");

    boot.resolve();
    await started;
    expect(store.state.status).toBe("playerTurn");
  });

  it("keeps an engine game restarted during boot waiting for the engine", async () => {
    const boot = deferredLaunch();
    const store = await loadStore({
      settings: { mode: "engine" },
      usiMoves: ["7g7f", "3c3d"],
      launch: boot.launch,
    });

    const started = store.startEngine();
    store.newGame();
    expect(store.usiMoves()).toEqual([]);
    expect(store.state.status).toBe("loading");

    boot.resolve();
    await started;
    expect(store.state.status).toBe("playerTurn");
  });

  it("blocks an engine game undone during boot when the launch then fails", async () => {
    const boot = deferredLaunch();
    const store = await loadStore({
      settings: { mode: "engine" },
      usiMoves: ["7g7f", "3c3d"],
      launch: boot.launch,
    });

    const started = store.startEngine();
    store.undo();
    boot.reject(new Error("boom"));
    await started;

    expect(store.state.status).toBe("error");
  });

  it("does not overwrite a resignation made while the engine boots", async () => {
    const boot = deferredLaunch();
    const store = await loadStore({
      settings: { mode: "human" },
      usiMoves: ["7g7f"],
      launch: boot.launch,
    });

    const started = store.startEngine();
    store.resign();
    boot.resolve();
    await started;

    expect(store.state.status).toBe("whiteResigned");
  });

  it("keeps a face-to-face game playable when the engine fails to launch", async () => {
    const store = await loadStore({
      settings: { mode: "human" },
      usiMoves: ["7g7f"],
      launch: () => Promise.reject(new Error("boom")),
    });
    await store.startEngine();

    expect(store.state.status).toBe("playerTurn");
    expect(store.state.engine).toBe("failed");
  });

  it("blocks a resumed engine game when the engine fails to launch", async () => {
    const store = await loadStore({
      settings: { mode: "engine" },
      usiMoves: ["7g7f", "3c3d"],
      launch: () => Promise.reject(new Error("boom")),
    });
    await store.startEngine();

    expect(store.state.status).toBe("error");
    expect(store.state.errorMessage).toBe("エンジンを起動できませんでした");
  });
});
