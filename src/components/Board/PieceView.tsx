import type { Piece } from "../../domain/types";
import type { PieceTheme } from "../../theme/types";
import styles from "./PieceView.module.css";

interface PieceViewProps {
  piece: Piece;
  theme: PieceTheme;
  selected?: boolean;
  placed?: boolean;
}

export function PieceView(props: PieceViewProps) {
  return (
    <span
      classList={{
        [styles.piece]: true,
        [styles.rotated]: props.piece.color === "white",
        [styles.selected]: !!props.selected,
        [styles.placed]: !!props.placed,
      }}
    >
      <span class={styles.shape}>
        <span class={styles.face}>
          {props.theme.kind === "text" && props.theme.label && (
            <span class={styles.label}>{props.theme.label(props.piece)}</span>
          )}
          {props.theme.kind === "image" && props.theme.imageUrl && (
            <img
              class={styles.image}
              src={props.theme.imageUrl(props.piece)}
              alt={props.piece.type}
            />
          )}
        </span>
      </span>
    </span>
  );
}
