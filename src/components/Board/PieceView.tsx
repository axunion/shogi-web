import { demotedType } from "../../domain/moves";
import type { Piece } from "../../domain/types";
import { PIECE_SIZE_SCALE } from "../../theme/pieceSize";
import type { PieceTheme } from "../../theme/types";
import styles from "./PieceView.module.css";

interface PieceViewProps {
  piece: Piece;
  theme: PieceTheme;
  selected?: boolean;
  placed?: boolean;
}

export function PieceView(props: PieceViewProps) {
  const scale = () =>
    PIECE_SIZE_SCALE[
      demotedType(props.piece.type) as keyof typeof PIECE_SIZE_SCALE
    ];
  const isPromoted = () => props.piece.type.startsWith("+");

  return (
    <span
      classList={{
        [styles.piece]: true,
        [styles.rotated]: props.piece.color === "white",
        [styles.selected]: !!props.selected,
        [styles.placed]: !!props.placed,
        [styles.promoted]: isPromoted(),
      }}
      style={{ "--piece-scale": String(scale()) }}
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
