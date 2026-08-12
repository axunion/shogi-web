import { createEffect, createSignal, For, Show } from "solid-js";
import { sameSquare } from "../../domain/moves";
import { colorLabel, RANK_KANJI } from "../../domain/notation";
import { squareIndex } from "../../domain/sfen";
import type { Piece, Position, Square } from "../../domain/types";
import type { LastMove } from "../../state/gameStore";
import { kanjiLabel } from "../../theme/kanjiLabels";
import type { PieceTheme } from "../../theme/types";
import styles from "./Board.module.css";
import { PieceView } from "./PieceView";

const FILES = [9, 8, 7, 6, 5, 4, 3, 2, 1];
const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const STAR_POINT_FILES = [3, 7];
const STAR_POINT_RANKS = [4, 6];

interface BoardProps {
  position: Position;
  theme: PieceTheme;
  selectedSquare?: Square | null;
  legalTargets?: Square[];
  lastMove?: LastMove | null;
  checkSquare?: Square | null;
  flipped?: boolean;
  onSquareClick?: (square: Square) => void;
}

// Board-flip mode keeps the coordinate bands fixed on screen (top/right) so
// flipping never shifts layout; only the square order and piece orientation
// reverse to represent "my side at the bottom" for the current mover.
function pieceRotated(piece: Piece, flipped: boolean): boolean {
  return flipped ? piece.color === "black" : piece.color === "white";
}

function isStarPoint(square: Square): boolean {
  return (
    STAR_POINT_FILES.includes(square.file) &&
    STAR_POINT_RANKS.includes(square.rank)
  );
}

// Screen-space column/row index for a file/rank, accounting for the
// orderedFiles/orderedRanks reversal under board-flip. Column 0 is
// leftmost, row 0 is topmost.
function colIndex(file: number, flipped: boolean): number {
  return flipped ? file - 1 : 9 - file;
}

function rowIndex(rank: number, flipped: boolean): number {
  return flipped ? 9 - rank : rank - 1;
}

// Cell-unit offset a piece must start at (relative to its resting square)
// to visually originate from `from`. PieceView turns this into pixels via
// calc(cols * (--square-size + --board-line-width)). The standalone
// `translate` property moves the element in plain screen coordinates
// regardless of any `transform: rotate()` also applied to it (verified
// empirically — rotation does NOT negate translate), so no sign flip is
// needed for rotated (gote, or sente-when-flipped) pieces.
function slideCellDelta(
  from: Square,
  to: Square,
  flipped: boolean,
): { cols: number; rows: number } {
  return {
    cols: colIndex(from.file, flipped) - colIndex(to.file, flipped),
    rows: rowIndex(from.rank, flipped) - rowIndex(to.rank, flipped),
  };
}

function squareAriaLabel(square: Square, piece: Piece | null): string {
  const position = `${square.file}${RANK_KANJI[square.rank - 1]}`;
  if (!piece) return `${position} 空`;
  return `${position} ${colorLabel(piece.color)} ${kanjiLabel(piece)}`;
}

export function Board(props: BoardProps) {
  const orderedFiles = () => (props.flipped ? [...FILES].reverse() : FILES);
  const orderedRanks = () => (props.flipped ? [...RANKS].reverse() : RANKS);

  return (
    <div class={styles.wrapper}>
      <div class={styles.fileLabels}>
        <For each={orderedFiles()}>
          {(file) => <div class={styles.fileLabel}>{file}</div>}
        </For>
      </div>
      <div class={styles.cornerCell} />
      <div class={styles.board}>
        <For each={orderedRanks()}>
          {(rank) => (
            <For each={orderedFiles()}>
              {(file) => {
                const square: Square = { file, rank };
                const piece = () =>
                  props.position.board[squareIndex(file, rank)];
                // Tracks the piece that just occupied this square before a
                // capture, so it can be shown fading out underneath the
                // capturing piece's slide-in instead of vanishing instantly.
                const [capturedGhost, setCapturedGhost] =
                  createSignal<Piece | null>(null);
                let previousPiece: Piece | null = null;
                createEffect(() => {
                  const current = piece();
                  if (previousPiece && current && previousPiece !== current) {
                    setCapturedGhost(previousPiece);
                  }
                  previousPiece = current;
                });
                const selected = () =>
                  !!props.selectedSquare &&
                  sameSquare(props.selectedSquare, square);
                const isLegalTarget = () =>
                  !!props.legalTargets?.some((target) =>
                    sameSquare(target, square),
                  );
                const isLastMoveFrom = () =>
                  !!props.lastMove?.from &&
                  sameSquare(props.lastMove.from, square);
                const isLastMoveTo = () =>
                  !!props.lastMove && sameSquare(props.lastMove.to, square);
                const isChecked = () =>
                  !!props.checkSquare && sameSquare(props.checkSquare, square);
                return (
                  <button
                    type="button"
                    class={styles.square}
                    classList={{
                      [styles.targetEmpty]: isLegalTarget() && !piece(),
                      [styles.targetCapture]: isLegalTarget() && !!piece(),
                      [styles.lastMoveFrom]: isLastMoveFrom(),
                      [styles.lastMoveTo]: isLastMoveTo(),
                      [styles.checked]: isChecked(),
                      [styles.selected]: selected(),
                    }}
                    onClick={() => props.onSquareClick?.(square)}
                    aria-label={squareAriaLabel(square, piece())}
                  >
                    {isStarPoint(square) && <span class={styles.starPoint} />}
                    {/* The captured piece fades out underneath the incoming
                        piece rather than vanishing the instant it's replaced. */}
                    <Show when={capturedGhost()} keyed>
                      {(ghost) => (
                        <span
                          class={styles.capturedGhost}
                          onAnimationEnd={() => setCapturedGhost(null)}
                        >
                          <PieceView
                            piece={ghost}
                            theme={props.theme}
                            rotated={pieceRotated(ghost, !!props.flipped)}
                          />
                        </span>
                      )}
                    </Show>
                    {/* keyed: forces a fresh PieceView on every landing, including
                        captures, so the slide/place CSS animation always restarts.
                        Relies on applyMoveToBoardOnly (src/domain/moves.ts) always
                        allocating a new piece object at the destination square. */}
                    <Show when={piece()} keyed>
                      {(p) => (
                        <PieceView
                          piece={p}
                          theme={props.theme}
                          selected={selected()}
                          placed={isLastMoveTo() && !props.lastMove?.from}
                          slide={
                            isLastMoveTo() && props.lastMove?.from
                              ? slideCellDelta(
                                  props.lastMove.from,
                                  square,
                                  !!props.flipped,
                                )
                              : null
                          }
                          rotated={pieceRotated(p, !!props.flipped)}
                        />
                      )}
                    </Show>
                  </button>
                );
              }}
            </For>
          )}
        </For>
      </div>
      <div class={styles.rankLabels}>
        <For each={orderedRanks()}>
          {(rank) => <div class={styles.rankLabel}>{RANK_KANJI[rank - 1]}</div>}
        </For>
      </div>
    </div>
  );
}
