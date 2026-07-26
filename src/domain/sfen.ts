import type { Color, Move, Piece, PieceType, Position, Square } from "./types";

const BOARD_SIZE = 9;

export function squareIndex(file: number, rank: number): number {
  return (rank - 1) * BOARD_SIZE + (BOARD_SIZE - file);
}

const HAND_ORDER: PieceType[] = ["R", "B", "G", "S", "N", "L", "P"];

function pieceLetter(type: PieceType): string {
  return type.startsWith("+") ? type.slice(1) : type;
}

function isPromotedType(type: PieceType): boolean {
  return type.startsWith("+");
}

export function parseSfen(sfen: string): Position {
  const [boardPart, sidePart, handPart, moveNumberPart] = sfen
    .trim()
    .split(/\s+/);
  if (!boardPart || !sidePart || !handPart || !moveNumberPart) {
    throw new Error(`Invalid SFEN: ${sfen}`);
  }

  const board: (Piece | null)[] = new Array(BOARD_SIZE * BOARD_SIZE).fill(null);
  const ranks = boardPart.split("/");
  if (ranks.length !== BOARD_SIZE) {
    throw new Error(`Invalid SFEN board: ${boardPart}`);
  }

  for (let rankIndex = 0; rankIndex < ranks.length; rankIndex++) {
    const rank = rankIndex + 1;
    let file = BOARD_SIZE;
    const rankStr = ranks[rankIndex] ?? "";
    let i = 0;
    while (i < rankStr.length) {
      const ch = rankStr[i];
      if (ch >= "1" && ch <= "9") {
        file -= Number(ch);
        i++;
        continue;
      }
      const promoted = ch === "+";
      const letter = promoted ? rankStr[++i] : ch;
      const color: Color = letter === letter.toUpperCase() ? "black" : "white";
      const type = (
        promoted ? `+${letter.toUpperCase()}` : letter.toUpperCase()
      ) as PieceType;
      board[squareIndex(file, rank)] = { type, color };
      file -= 1;
      i++;
    }
  }

  const sideToMove: Color = sidePart === "b" ? "black" : "white";

  const hands: Position["hands"] = { black: {}, white: {} };
  if (handPart !== "-") {
    let i = 0;
    while (i < handPart.length) {
      let countStr = "";
      while (handPart[i] >= "0" && handPart[i] <= "9") {
        countStr += handPart[i];
        i++;
      }
      const letter = handPart[i];
      i++;
      const count = countStr ? Number(countStr) : 1;
      const color: Color = letter === letter.toUpperCase() ? "black" : "white";
      const type = letter.toUpperCase() as PieceType;
      hands[color][type] = (hands[color][type] ?? 0) + count;
    }
  }

  const moveNumber = Number(moveNumberPart);

  return { board, hands, sideToMove, moveNumber };
}

export function positionToSfen(position: Position): string {
  const rankStrings: string[] = [];
  for (let rank = 1; rank <= BOARD_SIZE; rank++) {
    let rankStr = "";
    let emptyCount = 0;
    for (let file = BOARD_SIZE; file >= 1; file--) {
      const piece = position.board[squareIndex(file, rank)];
      if (!piece) {
        emptyCount++;
        continue;
      }
      if (emptyCount > 0) {
        rankStr += String(emptyCount);
        emptyCount = 0;
      }
      const letter = pieceLetter(piece.type);
      const cased = piece.color === "black" ? letter : letter.toLowerCase();
      rankStr += isPromotedType(piece.type) ? `+${cased}` : cased;
    }
    if (emptyCount > 0) {
      rankStr += String(emptyCount);
    }
    rankStrings.push(rankStr);
  }
  const boardPart = rankStrings.join("/");

  const sidePart = position.sideToMove === "black" ? "b" : "w";

  const handParts: string[] = [];
  for (const type of HAND_ORDER) {
    const blackCount = position.hands.black[type] ?? 0;
    if (blackCount > 0) {
      handParts.push(blackCount > 1 ? `${blackCount}${type}` : type);
    }
  }
  for (const type of HAND_ORDER) {
    const whiteCount = position.hands.white[type] ?? 0;
    if (whiteCount > 0) {
      handParts.push(
        whiteCount > 1
          ? `${whiteCount}${type.toLowerCase()}`
          : type.toLowerCase(),
      );
    }
  }
  const handPart = handParts.length > 0 ? handParts.join("") : "-";

  return `${boardPart} ${sidePart} ${handPart} ${position.moveNumber}`;
}

function squareToUsi(square: Square): string {
  return `${square.file}${String.fromCharCode("a".charCodeAt(0) + square.rank - 1)}`;
}

function squareFromUsi(usi: string): Square {
  return {
    file: Number(usi[0]),
    rank: usi.charCodeAt(1) - "a".charCodeAt(0) + 1,
  };
}

export function moveToUsi(move: Move): string {
  if (move.kind === "drop") {
    return `${move.piece}*${squareToUsi(move.to)}`;
  }
  return `${squareToUsi(move.from)}${squareToUsi(move.to)}${move.promote ? "+" : ""}`;
}

export function usiToMove(usi: string): Move {
  if (usi.includes("*")) {
    const [piece, to] = usi.split("*");
    return { kind: "drop", piece: piece as PieceType, to: squareFromUsi(to) };
  }
  return {
    kind: "move",
    from: squareFromUsi(usi.slice(0, 2)),
    to: squareFromUsi(usi.slice(2, 4)),
    promote: usi.endsWith("+"),
  };
}
