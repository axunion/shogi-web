import { For, Show } from "solid-js";
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
  return (
    <div class={styles.hand} classList={{ [styles.active]: !!props.active }}>
      <span class={styles.label}>{props.label}</span>
      <div class={styles.slots}>
        <For each={HAND_ORDER}>
          {(type) => {
            const count = () => props.pieces[type] ?? 0;
            const piece: Piece = { type, color: props.color };
            const label =
              props.theme.kind === "text" && props.theme.label
                ? props.theme.label(piece)
                : type;
            return (
              <Show
                when={count() > 0}
                fallback={<div class={styles.emptySlot} aria-hidden="true" />}
              >
                <button
                  type="button"
                  class={styles.slot}
                  classList={{
                    [styles.selected]: props.selectedPiece === type,
                  }}
                  disabled={!props.onSelectPiece}
                  onClick={() => props.onSelectPiece?.(type)}
                  aria-label={`持ち駒 ${label} ${count()}枚`}
                >
                  <PieceView piece={piece} theme={props.theme} />
                  <span class={styles.count}>{count()}</span>
                </button>
              </Show>
            );
          }}
        </For>
      </div>
    </div>
  );
}
