import { For } from "solid-js";
import type { Color, Piece, PieceType } from "../../domain/types";
import type { PieceTheme } from "../../theme/types";
import { PieceView } from "../Board/PieceView";
import styles from "./Hand.module.css";

const HAND_ORDER: PieceType[] = ["R", "B", "G", "S", "N", "L", "P"];

interface HandProps {
  color: Color;
  pieces: Partial<Record<PieceType, number>>;
  theme: PieceTheme;
}

export function Hand(props: HandProps) {
  const entries = () =>
    HAND_ORDER.filter((type) => (props.pieces[type] ?? 0) > 0);

  return (
    <div class={styles.hand}>
      <For each={entries()}>
        {(type) => {
          const piece: Piece = { type, color: props.color };
          return (
            <div class={styles.slot}>
              <PieceView piece={piece} theme={props.theme} />
              <span class={styles.count}>{props.pieces[type]}</span>
            </div>
          );
        }}
      </For>
    </div>
  );
}
