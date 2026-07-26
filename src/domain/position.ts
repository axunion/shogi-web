import { demotedType, findKing, isSquareAttacked, promotedType } from "./moves";
import { parseSfen, squareIndex } from "./sfen";
import type { Color, Move, Position } from "./types";

const INITIAL_SFEN =
  "lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1";

export function createInitialPosition(): Position {
  return parseSfen(INITIAL_SFEN);
}

export function isInCheck(position: Position, color: Color): boolean {
  const kingSquare = findKing(position.board, color);
  if (!kingSquare) return false;
  return isSquareAttacked(
    position.board,
    kingSquare,
    color === "black" ? "white" : "black",
  );
}

export function applyMove(position: Position, move: Move): Position {
  const board = position.board.slice();
  const hands: Position["hands"] = {
    black: { ...position.hands.black },
    white: { ...position.hands.white },
  };
  const color = position.sideToMove;

  if (move.kind === "move") {
    const fromIndex = squareIndex(move.from.file, move.from.rank);
    const toIndex = squareIndex(move.to.file, move.to.rank);
    const piece = board[fromIndex];
    if (!piece) throw new Error(`No piece at ${JSON.stringify(move.from)}`);

    const captured = board[toIndex];
    if (captured) {
      const baseType = demotedType(captured.type);
      hands[color][baseType] = (hands[color][baseType] ?? 0) + 1;
    }

    board[fromIndex] = null;
    board[toIndex] = {
      type: move.promote ? promotedType(piece.type) : piece.type,
      color,
    };
  } else {
    board[squareIndex(move.to.file, move.to.rank)] = {
      type: move.piece,
      color,
    };
    hands[color][move.piece] = (hands[color][move.piece] ?? 0) - 1;
  }

  return {
    board,
    hands,
    sideToMove: color === "black" ? "white" : "black",
    moveNumber: position.moveNumber + 1,
  };
}
