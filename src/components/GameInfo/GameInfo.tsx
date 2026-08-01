import type { Color } from "../../domain/types";
import type { GameMode, GameStatus } from "../../state/gameStore";
import { isGameOver } from "../../state/gameStore";
import styles from "./GameInfo.module.css";

interface GameInfoProps {
  status: GameStatus;
  mode: GameMode;
  sideToMove: Color;
  errorMessage: string | null;
  checked: boolean;
}

const STATUS_LABEL: Record<GameStatus, string> = {
  loading: "エンジンを起動しています…",
  playerTurn: "あなたの番です",
  thinking: "エンジンが思考中です…",
  engineResigned: "あなたの勝ちです（エンジンが投了しました）",
  engineMated: "あなたの勝ちです（詰み）",
  playerMated: "あなたの負けです（詰み）",
  playerResigned: "あなたの負けです（投了しました）",
  engineDeclaredWin: "エンジンの勝ちです",
  blackMated: "後手の勝ちです（詰み）",
  whiteMated: "先手の勝ちです（詰み）",
  blackResigned: "後手の勝ちです（先手が投了しました）",
  whiteResigned: "先手の勝ちです（後手が投了しました）",
  error: "エラーが発生しました",
};

function turnLabel(sideToMove: Color): string {
  return sideToMove === "black" ? "先手の番です" : "後手の番です";
}

export function GameInfo(props: GameInfoProps) {
  const isChecked = () => props.checked && !isGameOver(props.status);
  const hasError = () => props.status === "error" && !!props.errorMessage;
  const label = () =>
    props.status === "playerTurn" && props.mode === "human"
      ? turnLabel(props.sideToMove)
      : STATUS_LABEL[props.status];

  return (
    <div class={styles.info} aria-live="polite">
      <p>{label()}</p>
      <p
        class={styles.secondary}
        classList={{
          [styles.check]: isChecked(),
          [styles.error]: hasError(),
        }}
      >
        {isChecked() ? "王手!" : hasError() ? props.errorMessage : ""}
      </p>
    </div>
  );
}
