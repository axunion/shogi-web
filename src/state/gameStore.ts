import { createStore } from "solid-js/store";
import { generateLegalMoves, hasAnyLegalMoves } from "../domain/moves";
import { applyMove, createInitialPosition } from "../domain/position";
import { moveToUsi, squareIndex, usiToMove } from "../domain/sfen";
import type { Move, PieceType, Position, Square } from "../domain/types";
import { UsiEngine } from "../engine/usiEngine";

const MOVETIME_MS = 1000;

export type GameStatus =
  | "loading"
  | "playerTurn"
  | "thinking"
  | "playerWin"
  | "playerLose"
  | "error";

type Selection =
  | { kind: "square"; square: Square }
  | { kind: "hand"; piece: PieceType };

interface PendingPromotion {
  from: Square;
  to: Square;
}

interface GameState {
  position: Position;
  selection: Selection | null;
  legalTargets: Square[];
  pendingPromotion: PendingPromotion | null;
  status: GameStatus;
  errorMessage: string | null;
  usiHistory: string[];
}

function sameSquare(a: Square, b: Square): boolean {
  return a.file === b.file && a.rank === b.rank;
}

function createGameStore() {
  const engine = new UsiEngine();

  const [state, setState] = createStore<GameState>({
    position: createInitialPosition(),
    selection: null,
    legalTargets: [],
    pendingPromotion: null,
    status: "loading",
    errorMessage: null,
    usiHistory: [],
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
    return state.usiHistory.length > 0
      ? `position startpos moves ${state.usiHistory.join(" ")}`
      : "position startpos";
  }

  async function requestEngineMove() {
    try {
      const token = await engine.search(usiPositionCommand(), MOVETIME_MS);

      if (token === "resign") {
        setState({ status: "playerWin" });
        return;
      }
      if (token === "win") {
        setState({ status: "playerLose" });
        return;
      }

      const move = usiToMove(token);
      const position = applyMove(state.position, move);
      setState({
        position,
        usiHistory: [...state.usiHistory, token],
        status: hasAnyLegalMoves(position) ? "playerTurn" : "playerLose",
      });
    } catch (error) {
      setState({
        status: "error",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function applyPlayerMove(move: Move) {
    setState({
      position: applyMove(state.position, move),
      selection: null,
      legalTargets: [],
      pendingPromotion: null,
      usiHistory: [...state.usiHistory, moveToUsi(move)],
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

  async function init() {
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

  void init();

  return { state, selectSquare, selectHandPiece, confirmPromotion };
}

export const gameStore = createGameStore();
