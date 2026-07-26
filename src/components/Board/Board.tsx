import { For } from "solid-js";
import { squareIndex } from "../../domain/sfen";
import type { Position } from "../../domain/types";
import type { PieceTheme } from "../../theme/types";
import styles from "./Board.module.css";
import { PieceView } from "./PieceView";

const RANK_LABELS = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];
const FILES = [9, 8, 7, 6, 5, 4, 3, 2, 1];
const RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

interface BoardProps {
  position: Position;
  theme: PieceTheme;
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
                const piece = props.position.board[squareIndex(file, rank)];
                return (
                  <div class={styles.square}>
                    {piece && <PieceView piece={piece} theme={props.theme} />}
                  </div>
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
