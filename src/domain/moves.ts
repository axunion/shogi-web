import { squareIndex } from "./sfen";
import type { Color, Move, Piece, PieceType, Position, Square } from "./types";

const BOARD_SIZE = 9;

type Board = (Piece | null)[];
type Offset = [number, number];

function inBounds(square: Square): boolean {
  return (
    square.file >= 1 &&
    square.file <= BOARD_SIZE &&
    square.rank >= 1 &&
    square.rank <= BOARD_SIZE
  );
}

function pieceAt(board: Board, square: Square): Piece | null {
  return board[squareIndex(square.file, square.rank)];
}

function squareFromIndex(index: number): Square {
  return {
    file: BOARD_SIZE - (index % BOARD_SIZE),
    rank: Math.floor(index / BOARD_SIZE) + 1,
  };
}

function sameSquare(a: Square, b: Square): boolean {
  return a.file === b.file && a.rank === b.rank;
}

function forwardSign(color: Color): number {
  return color === "black" ? -1 : 1;
}

// Offsets below are expressed as [dFile, forwardSteps]; forwardSteps is converted
// to an absolute rank delta via forwardSign so "forward" always means "toward the
// opponent's side" regardless of color.
function toAbsolute(offset: Offset, color: Color): Offset {
  const [dFile, forward] = offset;
  return [dFile, forward * forwardSign(color)];
}

const GOLD_OFFSETS: Offset[] = [
  [-1, 1],
  [0, 1],
  [1, 1],
  [-1, 0],
  [1, 0],
  [0, -1],
];

const SILVER_OFFSETS: Offset[] = [
  [-1, 1],
  [0, 1],
  [1, 1],
  [-1, -1],
  [1, -1],
];

const KING_OFFSETS: Offset[] = [
  [-1, 1],
  [0, 1],
  [1, 1],
  [-1, 0],
  [1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

const KNIGHT_OFFSETS: Offset[] = [
  [-1, 2],
  [1, 2],
];

const PAWN_OFFSETS: Offset[] = [[0, 1]];

// Rook/bishop directions are the same for both colors, so they are used as-is.
const ROOK_DIRECTIONS: Offset[] = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
];

const BISHOP_DIRECTIONS: Offset[] = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

function stepDestinations(
  board: Board,
  from: Square,
  piece: Piece,
  offsets: Offset[],
  colorRelative: boolean,
): Square[] {
  const destinations: Square[] = [];
  for (const offset of offsets) {
    const [dFile, dRank] = colorRelative
      ? toAbsolute(offset, piece.color)
      : offset;
    const to: Square = { file: from.file + dFile, rank: from.rank + dRank };
    if (!inBounds(to)) continue;
    const occupant = pieceAt(board, to);
    if (occupant && occupant.color === piece.color) continue;
    destinations.push(to);
  }
  return destinations;
}

function slideDestinations(
  board: Board,
  from: Square,
  piece: Piece,
  directions: Offset[],
  colorRelative: boolean,
): Square[] {
  const destinations: Square[] = [];
  for (const direction of directions) {
    const [dFile, dRank] = colorRelative
      ? toAbsolute(direction, piece.color)
      : direction;
    let to: Square = { file: from.file + dFile, rank: from.rank + dRank };
    while (inBounds(to)) {
      const occupant = pieceAt(board, to);
      if (occupant) {
        if (occupant.color !== piece.color) destinations.push(to);
        break;
      }
      destinations.push(to);
      to = { file: to.file + dFile, rank: to.rank + dRank };
    }
  }
  return destinations;
}

function generateDestinations(
  board: Board,
  from: Square,
  piece: Piece,
): Square[] {
  switch (piece.type) {
    case "K":
      return stepDestinations(board, from, piece, KING_OFFSETS, false);
    case "G":
    case "+S":
    case "+N":
    case "+L":
    case "+P":
      return stepDestinations(board, from, piece, GOLD_OFFSETS, true);
    case "S":
      return stepDestinations(board, from, piece, SILVER_OFFSETS, true);
    case "N":
      return stepDestinations(board, from, piece, KNIGHT_OFFSETS, true);
    case "P":
      return stepDestinations(board, from, piece, PAWN_OFFSETS, true);
    case "L":
      return slideDestinations(board, from, piece, [[0, 1]], true);
    case "R":
      return slideDestinations(board, from, piece, ROOK_DIRECTIONS, false);
    case "B":
      return slideDestinations(board, from, piece, BISHOP_DIRECTIONS, false);
    case "+R":
      return [
        ...slideDestinations(board, from, piece, ROOK_DIRECTIONS, false),
        ...stepDestinations(board, from, piece, BISHOP_DIRECTIONS, false),
      ];
    case "+B":
      return [
        ...slideDestinations(board, from, piece, BISHOP_DIRECTIONS, false),
        ...stepDestinations(board, from, piece, ROOK_DIRECTIONS, false),
      ];
  }
}

function isPromotionZone(color: Color, rank: number): boolean {
  return color === "black" ? rank <= 3 : rank >= 7;
}

const PROMOTABLE_TYPES: PieceType[] = ["R", "B", "S", "N", "L", "P"];

export function canPromote(piece: Piece, from: Square, to: Square): boolean {
  if (!PROMOTABLE_TYPES.includes(piece.type)) return false;
  return (
    isPromotionZone(piece.color, from.rank) ||
    isPromotionZone(piece.color, to.rank)
  );
}

export function mustPromote(piece: Piece, to: Square): boolean {
  const lastRank = piece.color === "black" ? 1 : 9;
  const secondLastRank = piece.color === "black" ? 2 : 8;
  if (piece.type === "P" || piece.type === "L") return to.rank === lastRank;
  if (piece.type === "N")
    return to.rank === lastRank || to.rank === secondLastRank;
  return false;
}

export function promotedType(type: PieceType): PieceType {
  return type.startsWith("+") ? type : (`+${type}` as PieceType);
}

export function demotedType(type: PieceType): PieceType {
  return type.startsWith("+") ? (type.slice(1) as PieceType) : type;
}

export function findKing(board: Board, color: Color): Square | null {
  for (let index = 0; index < board.length; index++) {
    const piece = board[index];
    if (piece && piece.type === "K" && piece.color === color) {
      return squareFromIndex(index);
    }
  }
  return null;
}

export function isSquareAttacked(
  board: Board,
  target: Square,
  attackerColor: Color,
): boolean {
  for (let index = 0; index < board.length; index++) {
    const piece = board[index];
    if (!piece || piece.color !== attackerColor) continue;
    const from = squareFromIndex(index);
    const destinations = generateDestinations(board, from, piece);
    if (destinations.some((square) => sameSquare(square, target))) return true;
  }
  return false;
}

function applyMoveToBoardOnly(board: Board, move: Move, color: Color): Board {
  const next = board.slice();
  if (move.kind === "move") {
    const piece = next[squareIndex(move.from.file, move.from.rank)];
    if (!piece) throw new Error(`No piece at ${JSON.stringify(move.from)}`);
    next[squareIndex(move.from.file, move.from.rank)] = null;
    next[squareIndex(move.to.file, move.to.rank)] = {
      type: move.promote ? promotedType(piece.type) : piece.type,
      color,
    };
  } else {
    next[squareIndex(move.to.file, move.to.rank)] = { type: move.piece, color };
  }
  return next;
}

function wouldExposeKing(board: Board, move: Move, color: Color): boolean {
  const nextBoard = applyMoveToBoardOnly(board, move, color);
  const kingSquare = findKing(nextBoard, color);
  if (!kingSquare) return false;
  return isSquareAttacked(
    nextBoard,
    kingSquare,
    color === "black" ? "white" : "black",
  );
}

function generateLegalBoardMoves(position: Position, from: Square): Move[] {
  const piece = pieceAt(position.board, from);
  if (!piece || piece.color !== position.sideToMove) return [];

  const moves: Move[] = [];
  for (const to of generateDestinations(position.board, from, piece)) {
    if (mustPromote(piece, to)) {
      moves.push({ kind: "move", from, to, promote: true });
      continue;
    }
    moves.push({ kind: "move", from, to, promote: false });
    if (canPromote(piece, from, to)) {
      moves.push({ kind: "move", from, to, promote: true });
    }
  }

  return moves.filter(
    (move) => !wouldExposeKing(position.board, move, piece.color),
  );
}

function hasPawnOnFile(board: Board, color: Color, file: number): boolean {
  for (let rank = 1; rank <= BOARD_SIZE; rank++) {
    const piece = board[squareIndex(file, rank)];
    if (piece && piece.type === "P" && piece.color === color) return true;
  }
  return false;
}

function generateLegalDrops(position: Position, pieceType: PieceType): Move[] {
  const color = position.sideToMove;
  const available = position.hands[color][pieceType] ?? 0;
  if (available <= 0) return [];

  const moves: Move[] = [];
  for (let file = 1; file <= BOARD_SIZE; file++) {
    if (pieceType === "P" && hasPawnOnFile(position.board, color, file))
      continue;
    for (let rank = 1; rank <= BOARD_SIZE; rank++) {
      const to: Square = { file, rank };
      if (pieceAt(position.board, to)) continue;
      if (mustPromote({ type: pieceType, color }, to)) continue;
      moves.push({ kind: "drop", piece: pieceType, to });
    }
  }

  return moves.filter((move) => !wouldExposeKing(position.board, move, color));
}

export function generateLegalMoves(
  position: Position,
  source: Square | PieceType,
): Move[] {
  return typeof source === "string"
    ? generateLegalDrops(position, source)
    : generateLegalBoardMoves(position, source);
}

export function hasAnyLegalMoves(position: Position): boolean {
  const color = position.sideToMove;
  for (let index = 0; index < position.board.length; index++) {
    const piece = position.board[index];
    if (
      piece &&
      piece.color === color &&
      generateLegalBoardMoves(position, squareFromIndex(index)).length > 0
    ) {
      return true;
    }
  }
  for (const type of Object.keys(position.hands[color]) as PieceType[]) {
    if (generateLegalDrops(position, type).length > 0) return true;
  }
  return false;
}
