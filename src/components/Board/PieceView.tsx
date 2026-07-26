import type { Piece } from "../../domain/types";
import type { PieceTheme } from "../../theme/types";
import styles from "./PieceView.module.css";

interface PieceViewProps {
  piece: Piece;
  theme: PieceTheme;
}

export function PieceView(props: PieceViewProps) {
  return (
    <span
      classList={{
        [styles.piece]: true,
        [styles.rotated]: props.piece.color === "white",
      }}
    >
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
  );
}
