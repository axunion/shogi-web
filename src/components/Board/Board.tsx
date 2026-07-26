import { For, Show } from "solid-js";
import { squareIndex } from "../../domain/sfen";
import type { Position, Square } from "../../domain/types";
import type { LastMove } from "../../state/gameStore";
import type { PieceTheme } from "../../theme/types";
import styles from "./Board.module.css";
import { PieceView } from "./PieceView";

const RANK_LABELS = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];
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
  onSquareClick?: (square: Square) => void;
}

function sameSquare(a: Square, b: Square): boolean {
  return a.file === b.file && a.rank === b.rank;
}

function isStarPoint(square: Square): boolean {
  return (
    STAR_POINT_FILES.includes(square.file) &&
    STAR_POINT_RANKS.includes(square.rank)
  );
}

export function Board(props: BoardProps) {
  return (
    <div class={styles.board}>
      <For each={FILES}>
        {(file) => <div class={styles.fileLabel}>{file}</div>}
      </For>
      <div class={styles.cornerCell} />
      <For each={RANKS}>
        {(rank) => (
          <>
            <For each={FILES}>
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
                  >
                    {isStarPoint(square) && <span class={styles.starPoint} />}
                    <Show when={piece()}>
                      {(p) => (
                        <PieceView
                          piece={p()}
                          theme={props.theme}
                          selected={selected()}
                          placed={isLastMoveTo()}
                        />
                      )}
                    </Show>
                  </button>
                );
              }}
            </For>
            <div class={styles.rankLabel}>{RANK_LABELS[rank - 1]}</div>
          </>
        )}
      </For>
    </div>
  );
}
