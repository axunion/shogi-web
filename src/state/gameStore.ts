import { createStore } from "solid-js/store";
import { generateLegalMoves } from "../domain/moves";
import { applyMove, createInitialPosition } from "../domain/position";
import { squareIndex } from "../domain/sfen";
import type { Move, PieceType, Position, Square } from "../domain/types";

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
}

function sameSquare(a: Square, b: Square): boolean {
  return a.file === b.file && a.rank === b.rank;
}

function createGameStore() {
  const [state, setState] = createStore<GameState>({
    position: createInitialPosition(),
    selection: null,
    legalTargets: [],
    pendingPromotion: null,
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

  function applyAndAdvance(move: Move) {
    setState({
      position: applyMove(state.position, move),
      selection: null,
      legalTargets: [],
    });
  }

  function commitMove(candidates: Move[], to: Square) {
    if (candidates.length === 1) {
      applyAndAdvance(candidates[0]);
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
    applyAndAdvance({
      kind: "move",
      from: pending.from,
      to: pending.to,
      promote,
    });
    setState({ pendingPromotion: null });
  }

  return { state, selectSquare, selectHandPiece, confirmPromotion };
}

export const gameStore = createGameStore();
