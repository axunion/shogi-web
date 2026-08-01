import { For, Show } from "solid-js";
import { sameSquare } from "../../domain/moves";
import { colorLabel, RANK_KANJI } from "../../domain/notation";
import { squareIndex } from "../../domain/sfen";
import type { Piece, Position, Square } from "../../domain/types";
import type { LastMove } from "../../state/gameStore";
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

function pieceLabel(piece: Piece, theme: PieceTheme): string {
  return theme.kind === "text" && theme.label ? theme.label(piece) : piece.type;
}

function squareAriaLabel(
  square: Square,
  piece: Piece | null,
  theme: PieceTheme,
): string {
  const position = `${square.file}${RANK_KANJI[square.rank - 1]}`;
  if (!piece) return `${position} 空`;
  return `${position} ${colorLabel(piece.color)} ${pieceLabel(piece, theme)}`;
}

export function Board(props: BoardProps) {
  const orderedFiles = () => (props.flipped ? [...FILES].reverse() : FILES);
  const orderedRanks = () => (props.flipped ? [...RANKS].reverse() : RANKS);

  return (
    <div class={styles.board}>
      <For each={orderedFiles()}>
        {(file) => <div class={styles.fileLabel}>{file}</div>}
      </For>
      <div class={styles.cornerCell} />
      <For each={orderedRanks()}>
        {(rank) => (
          <>
            <For each={orderedFiles()}>
              {(file) => {
                const square: Square = { file, rank };
                const piece = () =>
                  props.position.board[squareIndex(file, rank)];
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
                    aria-label={squareAriaLabel(square, piece(), props.theme)}
                  >
                    {isStarPoint(square) && <span class={styles.starPoint} />}
                    <Show when={piece()}>
                      {(p) => (
                        <PieceView
                          piece={p()}
                          theme={props.theme}
                          selected={selected()}
                          placed={isLastMoveTo()}
                          rotated={pieceRotated(p(), !!props.flipped)}
                        />
                      )}
                    </Show>
                  </button>
                );
              }}
            </For>
            <div class={styles.rankLabel}>{RANK_KANJI[rank - 1]}</div>
          </>
        )}
      </For>
    </div>
  );
}
