import { createMemo } from "solid-js";
import { createStore } from "solid-js/store";
import {
  findKing,
  generateLegalMoves,
  hasAnyLegalMoves,
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
import { UsiEngine } from "../engine/usiEngine";
import { rewind } from "./rewind";

export type GameStatus =
  | "loading" // engine starting up
  | "playerTurn"
  | "thinking"
  | "engineResigned" // player wins: engine resigned
  | "engineMated" // player wins: engine is checkmated
  | "playerMated" // player loses: player is checkmated
  | "playerResigned" // player loses: player resigned
  | "engineDeclaredWin" // bestmove win
  | "error";

export function isGameOver(status: GameStatus): boolean {
  return (
    status === "engineResigned" ||
    status === "engineMated" ||
    status === "playerMated" ||
    status === "playerResigned" ||
    status === "engineDeclaredWin"
  );
}

type Selection =
  | { kind: "square"; square: Square }
  | { kind: "hand"; piece: PieceType };

interface PendingPromotion {
  from: Square;
  to: Square;
}

interface Settings {
  movetimeMs: number;
  soundEnabled: boolean;
}

interface LastMove {
  from: Square | null;
  to: Square;
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

const DEFAULT_SETTINGS: Settings = {
  movetimeMs: 1000,
  soundEnabled: true,
};

function sameSquare(a: Square, b: Square): boolean {
  return a.file === b.file && a.rank === b.rank;
}

function lastMoveOf(move: Move): LastMove {
  return move.kind === "move"
    ? { from: move.from, to: move.to }
    : { from: null, to: move.to };
}

/** Plies to drop for a single "undo": 2 for a completed player+engine pair,
 * 1 while only the player's move is recorded (engine still thinking), 0 if empty. */
function undoPlies(recordCount: number): number {
  if (recordCount === 0) return 0;
  return recordCount % 2 === 0 ? 2 : 1;
}

function createGameStore() {
  const engine = new UsiEngine();
  let generation = 0;

  const [state, setState] = createStore<GameState>({
    position: createInitialPosition(),
    records: [],
    lastMove: null,
    selection: null,
    legalTargets: [],
    pendingPromotion: null,
    status: "loading",
    errorMessage: null,
    settings: { ...DEFAULT_SETTINGS },
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
    try {
      const token = await engine.search(
        usiPositionCommand(),
        state.settings.movetimeMs,
      );
      if (generation !== startGeneration) return;

      if (token === "resign") {
        setState({ status: "engineResigned" });
        return;
      }
      if (token === "win") {
        setState({ status: "engineDeclaredWin" });
        return;
      }

      const move = usiToMove(token);
      const positionBefore = state.position;
      const position = applyMove(positionBefore, move);
      const record: MoveRecord = { usi: token, move, positionBefore };
      setState({
        position,
        records: [...state.records, record],
        lastMove: lastMoveOf(move),
        status: hasAnyLegalMoves(position) ? "playerTurn" : "playerMated",
      });
    } catch (error) {
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

    if (!hasAnyLegalMoves(position)) {
      setState({
        position,
        records,
        lastMove: lastMoveOf(move),
        selection: null,
        legalTargets: [],
        pendingPromotion: null,
        status: "engineMated",
      });
      return;
    }

    setState({
      position,
      records,
      lastMove: lastMoveOf(move),
      selection: null,
      legalTargets: [],
      pendingPromotion: null,
      status: "thinking",
    });
    void requestEngineMove();
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
    generation++;
    engine.newGame();
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
  }

  function resign(): void {
    if (state.status !== "playerTurn") return;
    setState({ status: "playerResigned" });
  }

  function undo(): void {
    const result = rewind(state.records, undoPlies(state.records.length));
    if (!result) return;

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
  }

  function setSettings(patch: Partial<Settings>): void {
    setState("settings", patch);
  }

  async function startEngine(): Promise<void> {
    try {
      await engine.launch();
      engine.newGame();
      setState({ status: "playerTurn" });
    } catch (error) {
      setState({
        status: "error",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
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
