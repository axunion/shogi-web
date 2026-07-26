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
  label: string;
  active?: boolean;
  selectedPiece?: PieceType | null;
  onSelectPiece?: (piece: PieceType) => void;
}

export function Hand(props: HandProps) {
  const entries = () =>
    HAND_ORDER.filter((type) => (props.pieces[type] ?? 0) > 0);

  return (
    <div class={styles.hand} classList={{ [styles.active]: !!props.active }}>
      <span class={styles.label}>{props.label}</span>
      <div class={styles.slots}>
        <For each={entries()}>
          {(type) => {
            const piece: Piece = { type, color: props.color };
            return (
              <button
                type="button"
                class={styles.slot}
                classList={{ [styles.selected]: props.selectedPiece === type }}
                disabled={!props.onSelectPiece}
                onClick={() => props.onSelectPiece?.(type)}
              >
                <PieceView piece={piece} theme={props.theme} />
                <span class={styles.count}>{props.pieces[type]}</span>
              </button>
            );
          }}
        </For>
      </div>
    </div>
  );
}
