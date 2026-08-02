import { demotedType } from "../../domain/moves";
import type { Piece } from "../../domain/types";
import { kanjiLabel } from "../../theme/kanjiLabels";
import { PIECE_SIZE_SCALE } from "../../theme/pieceSize";
import type { PieceTheme } from "../../theme/types";
import styles from "./PieceView.module.css";

interface PieceViewProps {
  piece: Piece;
  theme: PieceTheme;
  selected?: boolean;
  placed?: boolean;
  /** Overrides the default color-based rotation (white=180deg). Used by
   * hand slots in board-flip mode, where "own vs opponent" rather than
   * "black vs white" determines which pieces should read as upright. */
  rotated?: boolean;
}

export function PieceView(props: PieceViewProps) {
  const scale = () =>
    props.theme.kind === "image"
      ? 1
      : PIECE_SIZE_SCALE[
          demotedType(props.piece.type) as keyof typeof PIECE_SIZE_SCALE
        ];
  const isPromoted = () => props.piece.type.startsWith("+");
  const isRotated = () => props.rotated ?? props.piece.color === "white";

  return (
    <span
      classList={{
        [styles.piece]: true,
        [styles.rotated]: isRotated(),
        [styles.selected]: !!props.selected,
        [styles.placed]: !!props.placed,
        [styles.promoted]: isPromoted(),
      }}
      style={{ "--piece-scale": String(scale()) }}
    >
      {props.theme.kind === "image" ? (
        <img
          class={styles.image}
          src={props.theme.imageUrl(props.piece)}
          alt={kanjiLabel(props.piece)}
        />
      ) : (
        <span class={styles.shape}>
          <span class={styles.face}>
            <span class={styles.label}>{props.theme.label(props.piece)}</span>
          </span>
        </span>
      )}
    </span>
  );
}
