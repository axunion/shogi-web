import { createMemo } from "solid-js";
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

export type GameStatus =
  | "loading" // engine starting up
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
  settings: Settings;
}

function matedStatus(position: Position, mode: GameMode): GameStatus {
  if (mode === "human") {
    return position.sideToMove === "black" ? "blackMated" : "whiteMated";
  }
  return position.sideToMove === "black" ? "playerMated" : "engineMated";
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
  // Extracted so startEngine's closure (part of the store's permanent,
  // module-lifetime API) doesn't keep the whole savedGame object — including
  // its full usiMoves array, already consumed by resolveInitialState above —
  // reachable for the rest of the session.
  const resumedResignedBy = savedGame?.resigned;

  const [state, setState] = createStore<GameState>({
    position: initial.position,
    records: initial.records,
    lastMove: initial.lastMove,
    selection: null,
    legalTargets: [],
    pendingPromotion: null,
    status: "loading",
    errorMessage: null,
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

  function newGame(): void {
    cancelPendingSearch();
    generation++;
    if (state.settings.mode === "engine") {
      engine.configure(difficultyLevelById(state.settings.difficultyLevel));
      engine.newGame();
    }
    setState({
      position: createInitialPosition(),
      records: [],
      lastMove: null,
      selection: null,
      legalTargets: [],
      pendingPromotion: null,
      status: "playerTurn",
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
    setState({
      position: result.position,
      records: result.records,
      lastMove: lastRecord ? lastMoveOf(lastRecord.move) : null,
      selection: null,
      legalTargets: [],
      pendingPromotion: null,
      status: "playerTurn",
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
    // the session, and that switch never retries a launch), but a launch
    // failure must not discard the settings/saved game already restored
    // synchronously above: the failure only turns into a visible error if
    // the restored mode needs the engine.
    let launchError: unknown = null;
    try {
      await engine.launch();
    } catch (error) {
      launchError = error;
    }

    const mode = state.settings.mode;

    if (mode === "engine" && launchError) {
      setState({
        status: "error",
        errorMessage:
          launchError instanceof Error
            ? launchError.message
            : String(launchError),
      });
      return;
    }

    if (mode === "engine") {
      engine.configure(difficultyLevelById(state.settings.difficultyLevel));
      engine.newGame();
    }

    if (!hasReplayedGame) {
      setState({ status: "playerTurn" });
      return;
    }

    if (resumedResignedBy) {
      setState({ status: RESIGNED_STATUS[resumedResignedBy] });
      return;
    }

    if (!hasAnyLegalMoves(state.position)) {
      setState({ status: matedStatus(state.position, mode) });
      return;
    }

    if (mode === "engine" && state.position.sideToMove === "white") {
      setState({ status: "thinking" });
      void requestEngineMove();
      return;
    }

    setState({ status: "playerTurn" });
  }

  return {
    state,
    usiMoves,
    checkedKingSquare,
    startEngine,
    selectSquare,
    selectHandPiece,
    confirmPromotion,
    newGame,
    resign,
    undo,
    setSettings,
  };
}

export const gameStore = createGameStore();
