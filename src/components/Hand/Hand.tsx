import { For, Show } from "solid-js";
import type { Color, Piece, PieceType } from "../../domain/types";
import { kanjiLabel } from "../../theme/kanjiLabels";
import type { PieceTheme } from "../../theme/types";
import { PieceView } from "../Board/PieceView";
import styles from "./Hand.module.css";

const HAND_ORDER: PieceType[] = ["R", "B", "G", "S", "N", "L", "P"];

export type PlateBadge = "turn" | "thinking" | null;

interface HandProps {
  color: Color;
  pieces: Partial<Record<PieceType, number>>;
  theme: PieceTheme;
  /** Side symbol, e.g. ☗. */
  symbol: string;
  /** Who plays this side, e.g. あなた / AI 4級 / 先手. */
  name: string;
  badge?: PlateBadge;
  selectedPiece?: PieceType | null;
  onSelectPiece?: (piece: PieceType) => void;
  rotated?: boolean;
}

/** A player's plate: who they are, whether it's their move, and their
    pieces in hand (only the kinds actually held). */
export function Hand(props: HandProps) {
  const held = () => HAND_ORDER.filter((type) => (props.pieces[type] ?? 0) > 0);

  return (
    <section
      class={styles.plate}
      classList={{ [styles.active]: !!props.badge }}
      aria-label={`${props.name}の持ち駒`}
    >
      <div class={styles.identity}>
        <span class={styles.symbol} aria-hidden="true">
          {props.symbol}
        </span>
        <span class={styles.name}>{props.name}</span>
      </div>
      <Show when={props.badge}>
        {(badge) => (
          <span
            class={styles.badge}
            classList={{ [styles.thinking]: badge() === "thinking" }}
          >
            {badge() === "thinking" ? "考慮中" : "手番"}
          </span>
        )}
      </Show>
      <div class={styles.slots}>
        <For
          each={held()}
          fallback={<span class={styles.empty}>持ち駒なし</span>}
        >
          {(type) => {
            const count = () => props.pieces[type] ?? 0;
            const piece: Piece = { type, color: props.color };
            const label = kanjiLabel(piece);
            return (
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
                <PieceView
                  piece={piece}
                  theme={props.theme}
                  rotated={props.rotated}
                />
                <Show when={count() > 1}>
                  <span class={styles.count}>{count()}</span>
                </Show>
              </button>
            );
          }}
        </For>
      </div>
    </section>
  );
}
