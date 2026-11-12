import { createMemo, createRoot } from "solid-js";
import { createStore } from "solid-js/store";
import {
  findKing,
  generateLegalMoves,
  hasAnyLegalMoves,
  sameSquare,
} from "../domain/moves";
import {
  applyMove,
  createInitialPosition,
  isInCheck,
} from "../domain/position";
import { moveToUsi, squareIndex, usiToMove } from "../domain/sfen";
import type {
  Move,
  MoveRecord,
  PieceType,
  Position,
  Square,
} from "../domain/types";
import { difficultyLevelById } from "../engine/difficulty";
import { UsiEngine } from "../engine/usiEngine";
import { type LastMove, lastMoveOf, resolveInitialState } from "./restore";
import { rewind, undoPlies } from "./rewind";
import type { ResignedBy } from "./storage";
import {
  clearGame,
  loadGame,
  loadSettings,
  saveGame,
  saveSettings,
} from "./storage";

export type { LastMove };

export type GameMode = "engine" | "human";

export type EngineState = "booting" | "ready" | "failed";

export const ENGINE_LAUNCH_FAILED_MESSAGE = "エンジンを起動できませんでした";

export type GameStatus =
  | "loading" // a resumed engine game waiting for the engine to boot
  | "playerTurn"
  | "thinking"
  | "engineResigned" // player wins: engine resigned
  | "engineMated" // player wins: engine is checkmated
  | "playerMated" // player loses: player is checkmated
  | "playerResigned" // player loses: player resigned
  | "engineDeclaredWin" // bestmove win
  | "blackMated" // human mode: black is checkmated
  | "whiteMated" // human mode: white is checkmated
  | "blackResigned" // human mode: black resigned
  | "whiteResigned" // human mode: white resigned
  | "error";

const RESIGNED_STATUS: Record<ResignedBy, GameStatus> = {
  player: "playerResigned",
  black: "blackResigned",
  white: "whiteResigned",
  engine: "engineResigned",
  engineWin: "engineDeclaredWin",
};

export function isGameOver(status: GameStatus): boolean {
  return (
    status === "engineResigned" ||
    status === "engineMated" ||
    status === "playerMated" ||
    status === "playerResigned" ||
    status === "engineDeclaredWin" ||
    status === "blackMated" ||
    status === "whiteMated" ||
    status === "blackResigned" ||
    status === "whiteResigned"
  );
}

type Selection =
  | { kind: "square"; square: Square }
  | { kind: "hand"; piece: PieceType };

interface PendingPromotion {
  from: Square;
  to: Square;
}

export interface Settings {
  difficultyLevel: number;
  soundEnabled: boolean;
  mode: GameMode;
  boardFlip: boolean;
  pieceTheme: string;
  colorScheme: "system" | "light" | "dark";
}

interface GameState {
  position: Position;
  records: MoveRecord[];
  lastMove: LastMove | null;
  selection: Selection | null;
  legalTargets: Square[];
  pendingPromotion: PendingPromotion | null;
  status: GameStatus;
  errorMessage: string | null;
  // Tracked apart from status so a game that doesn't need the engine (human
  // mode) is playable while it's still booting. "failed" lasts for the rest
  // of the session — the launch is never retried, so the title screen keeps
  // warning even after an unrelated game clears the per-game errorMessage.
  engine: EngineState;
  settings: Settings;
}

function matedStatus(position: Position, mode: GameMode): GameStatus {
  if (mode === "human") {
    return position.sideToMove === "black" ? "blackMated" : "whiteMated";
  }
  return position.sideToMove === "black" ? "playerMated" : "engineMated";
}

// A resumed game may already be over (resigned or mated). An ongoing engine
// game waits in "loading" until startEngine's boot finishes; an ongoing human
// game is playable straight away.
function resumedGameStatus(
  position: Position,
  mode: GameMode,
  resignedBy: ResignedBy | undefined,
): GameStatus {
  if (resignedBy) return RESIGNED_STATUS[resignedBy];
  if (!hasAnyLegalMoves(position)) return matedStatus(position, mode);
  return mode === "engine" ? "loading" : "playerTurn";
}

function createGameStore() {
  const engine = new UsiEngine();
  let generation = 0;
  let pendingSearch: AbortController | null = null;

  /** Aborts any in-flight engine search so its bestmove can never resolve a later one. */
  function cancelPendingSearch(): void {
    pendingSearch?.abort();
    pendingSearch = null;
  }

  // Settings and any saved game are restored synchronously (before the engine
  // launches) so screens reading them (e.g. the title screen) never see a
  // flash of defaults while the WASM engine boots.
  const savedGame = loadGame();
  const initial = resolveInitialState(loadSettings(), savedGame);
  if (initial.invalidSavedGame) clearGame();
  const hasReplayedGame = savedGame !== null && !initial.invalidSavedGame;
  // Resolved synchronously so the title screen's resume-vs-start-new prompt
  // (shown from 対局を始める) never offers to resume a finished game. With no
  // saved game the status is unused until newGame() sets it.
  const initialStatus: GameStatus = hasReplayedGame
    ? resumedGameStatus(
        initial.position,
        initial.settings.mode,
        savedGame?.resigned,
      )
    : "playerTurn";

  const [state, setState] = createStore<GameState>({
    position: initial.position,
    records: initial.records,
    lastMove: initial.lastMove,
    selection: null,
    legalTargets: [],
    pendingPromotion: null,
    status: initialStatus,
    errorMessage: null,
    engine: "booting",
    settings: initial.settings,
  });

  const usiMoves = createMemo(() => state.records.map((record) => record.usi));

  const checkedKingSquare = createMemo<Square | null>(() => {
    const color = state.position.sideToMove;
    if (!isInCheck(state.position, color)) return null;
    return findKing(state.position.board, color);
  });

  function movesFromSelection(selection: Selection): Move[] {
    const source =
      selection.kind === "square" ? selection.square : selection.piece;
    return generateLegalMoves(state.position, source);
  }

  function legalTargetsFor(selection: Selection): Square[] {
    return movesFromSelection(selection).map((move) => move.to);
  }

  function movesTo(square: Square): Move[] {
    if (!state.selection) return [];
    return movesFromSelection(state.selection).filter((move) =>
      sameSquare(move.to, square),
    );
  }

  function clearSelection() {
    setState({ selection: null, legalTargets: [] });
  }

  function selectOwnSquare(square: Square) {
    const selection: Selection = { kind: "square", square };
    setState({ selection, legalTargets: legalTargetsFor(selection) });
  }

  function usiPositionCommand(): string {
    const moves = usiMoves();
    return moves.length > 0
      ? `position startpos moves ${moves.join(" ")}`
      : "position startpos";
  }

  async function requestEngineMove() {
    const startGeneration = generation;
    const controller = new AbortController();
    pendingSearch = controller;
    try {
      const token = await engine.search(
        usiPositionCommand(),
        difficultyLevelById(state.settings.difficultyLevel).movetimeMs,
        controller.signal,
      );
      if (pendingSearch === controller) pendingSearch = null;
      if (generation !== startGeneration) return;

      if (token === "resign") {
        setState({ status: "engineResigned" });
        saveGame(usiMoves(), "engine");
        return;
      }
      if (token === "win") {
        setState({ status: "engineDeclaredWin" });
        saveGame(usiMoves(), "engineWin");
        return;
      }

      const move = usiToMove(token);
      const positionBefore = state.position;
      const position = applyMove(positionBefore, move);
      const record: MoveRecord = { usi: token, move, positionBefore };
      const records = [...state.records, record];
      setState({
        position,
        records,
        lastMove: lastMoveOf(move),
        status: hasAnyLegalMoves(position) ? "playerTurn" : "playerMated",
      });
      saveGame(records.map((r) => r.usi));
    } catch (error) {
      if (pendingSearch === controller) pendingSearch = null;
      if (generation !== startGeneration) return;
      setState({
        status: "error",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function applyPlayerMove(move: Move) {
    const positionBefore = state.position;
    const position = applyMove(positionBefore, move);
    const record: MoveRecord = { usi: moveToUsi(move), move, positionBefore };
    const records = [...state.records, record];
    saveGame(records.map((r) => r.usi));

    if (!hasAnyLegalMoves(position)) {
      setState({
        position,
        records,
        lastMove: lastMoveOf(move),
        selection: null,
        legalTargets: [],
        pendingPromotion: null,
        status: matedStatus(position, state.settings.mode),
      });
      return;
    }

    const isHuman = state.settings.mode === "human";
    setState({
      position,
      records,
      lastMove: lastMoveOf(move),
      selection: null,
      legalTargets: [],
      pendingPromotion: null,
      status: isHuman ? "playerTurn" : "thinking",
    });
    if (!isHuman) void requestEngineMove();
  }

  function commitMove(candidates: Move[], to: Square) {
    if (candidates.length === 1) {
      applyPlayerMove(candidates[0]);
      return;
    }
    if (state.selection?.kind === "square") {
      setState({
        pendingPromotion: { from: state.selection.square, to },
        selection: null,
        legalTargets: [],
      });
    }
  }

  function selectSquare(square: Square) {
    if (state.status !== "playerTurn") return;

    const piece = state.position.board[squareIndex(square.file, square.rank)];

    if (
      state.selection?.kind === "square" &&
      sameSquare(state.selection.square, square)
    ) {
      clearSelection();
      return;
    }

    if (state.selection) {
      const candidates = movesTo(square);
      if (candidates.length > 0) {
        commitMove(candidates, square);
        return;
      }
      if (piece && piece.color === state.position.sideToMove) {
        selectOwnSquare(square);
      }
      return;
    }

    if (piece && piece.color === state.position.sideToMove) {
      selectOwnSquare(square);
    }
  }

  function selectHandPiece(piece: PieceType) {
    if (state.status !== "playerTurn") return;

    const count = state.position.hands[state.position.sideToMove][piece] ?? 0;
    if (count <= 0) return;

    if (state.selection?.kind === "hand" && state.selection.piece === piece) {
      clearSelection();
      return;
    }

    const selection: Selection = { kind: "hand", piece };
    setState({ selection, legalTargets: legalTargetsFor(selection) });
  }

  function confirmPromotion(promote: boolean) {
    const pending = state.pendingPromotion;
    if (!pending) return;
    applyPlayerMove({
      kind: "move",
      from: pending.from,
      to: pending.to,
      promote,
    });
  }

  // Dismissing the promotion prompt takes the move back rather than playing
  // it unpromoted, leaving the piece selected so another target can be picked.
  function cancelPromotion() {
    const pending = state.pendingPromotion;
    if (!pending) return;
    setState({ pendingPromotion: null });
    selectOwnSquare(pending.from);
  }

  function newGame(): void {
    cancelPendingSearch();
    generation++;
    if (state.settings.mode === "engine") {
      engine.configure(difficultyLevelById(state.settings.difficultyLevel));
      engine.newGame();
    }
    // An engine game started while the engine is still booting waits in
    // "loading" so startEngine picks it up once the boot settles, instead of
    // letting a move reach an engine that can't answer.
    const awaitingEngine =
      state.settings.mode === "engine" && state.engine === "booting";
    setState({
      position: createInitialPosition(),
      records: [],
      lastMove: null,
      selection: null,
      legalTargets: [],
      pendingPromotion: null,
      status: awaitingEngine ? "loading" : "playerTurn",
      errorMessage: null,
    });
    saveGame([]);
  }

  function resign(): void {
    if (state.status !== "playerTurn") return;
    if (state.settings.mode === "human") {
      const side = state.position.sideToMove;
      setState({
        status: side === "black" ? "blackResigned" : "whiteResigned",
      });
      saveGame(usiMoves(), side);
      return;
    }
    setState({ status: "playerResigned" });
    saveGame(usiMoves(), "player");
  }

  function undo(): void {
    const result = rewind(
      state.records,
      undoPlies(state.records.length, state.settings.mode),
    );
    if (!result) return;

    cancelPendingSearch();
    generation++;
    const lastRecord = result.records[result.records.length - 1];
    // Same boot wait as newGame().
    const awaitingEngine =
      state.settings.mode === "engine" && state.engine === "booting";
    setState({
      position: result.position,
      records: result.records,
      lastMove: lastRecord ? lastMoveOf(lastRecord.move) : null,
      selection: null,
      legalTargets: [],
      pendingPromotion: null,
      status: awaitingEngine ? "loading" : "playerTurn",
      errorMessage: null,
    });
    saveGame(result.records.map((r) => r.usi));
  }

  function setSettings(patch: Partial<Settings>): void {
    setState("settings", patch);
    saveSettings({ ...state.settings });
  }

  async function startEngine(): Promise<void> {
    // The engine is always launched (mode may switch to "engine" later in
    // the session, and that switch never retries a launch). A launch failure
    // only blocks the current game if that game is waiting on the engine.
    let launchError: unknown = null;
    try {
      await engine.launch();
    } catch (error) {
      launchError = error;
    }

    if (launchError) {
      // The UI only shows a generic Japanese message, so the cause (e.g.
      // missing cross-origin isolation headers) goes to the console.
      console.error("Engine launch failed:", launchError);
      setState({ engine: "failed" });
      if (state.status === "loading") {
        setState({
          status: "error",
          errorMessage: ENGINE_LAUNCH_FAILED_MESSAGE,
        });
      }
      return;
    }

    setState({ engine: "ready" });
    if (state.settings.mode === "engine") {
      engine.configure(difficultyLevelById(state.settings.difficultyLevel));
      engine.newGame();
    }

    // Only a resumed engine game waits on the boot; any other status was set
    // by the player in the meantime and must not be overwritten.
    if (state.status !== "loading") return;

    if (state.position.sideToMove === "white") {
      setState({ status: "thinking" });
      void requestEngineMove();
      return;
    }

    setState({ status: "playerTurn" });
  }

  return {
    state,
    // Whether a saved game (possibly with zero moves) was restored, so App can
    // put the player back on the game screen they reloaded from.
    resumedFromSave: hasReplayedGame,
    usiMoves,
    checkedKingSquare,
    startEngine,
    selectSquare,
    selectHandPiece,
    confirmPromotion,
    cancelPromotion,
    newGame,
    resign,
    undo,
    setSettings,
  };
}

// createRoot gives the store's internal createMemo calls a disposal owner;
// the store is a permanent, whole-app-lifetime singleton, so it's never
// actually disposed, but without this Solid's dev build logs a "computations
// created outside a createRoot" warning at startup.
export const gameStore = createRoot(() => createGameStore());
