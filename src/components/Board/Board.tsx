import { For, Show } from "solid-js";
import { squareIndex } from "../../domain/sfen";
import type { Position, Square } from "../../domain/types";
import type { PieceTheme } from "../../theme/types";
import styles from "./Board.module.css";
import { PieceView } from "./PieceView";

const RANK_LABELS = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];
const FILES = [9, 8, 7, 6, 5, 4, 3, 2, 1];
const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

interface BoardProps {
  position: Position;
  theme: PieceTheme;
  selectedSquare?: Square | null;
  legalTargets?: Square[];
  onSquareClick?: (square: Square) => void;
}

function sameSquare(a: Square, b: Square): boolean {
  return a.file === b.file && a.rank === b.rank;
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
                const highlighted = () =>
                  !!props.legalTargets?.some((target) =>
                    sameSquare(target, square),
                  );
                return (
                  <button
                    type="button"
                    class={styles.square}
                    classList={{
                      [styles.selected]: selected(),
                      [styles.highlighted]: highlighted(),
                    }}
                    onClick={() => props.onSquareClick?.(square)}
                  >
                    <Show when={piece()}>
                      {(p) => <PieceView piece={p()} theme={props.theme} />}
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
