import type { GameStatus } from "../../state/gameStore";
import { isGameOver } from "../../state/gameStore";
import styles from "./GameInfo.module.css";

interface GameInfoProps {
  status: GameStatus;
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
  error: "エラーが発生しました",
};

export function GameInfo(props: GameInfoProps) {
  const isChecked = () => props.checked && !isGameOver(props.status);
  const hasError = () => props.status === "error" && !!props.errorMessage;

  return (
    <div class={styles.info} aria-live="polite">
      <p>{STATUS_LABEL[props.status]}</p>
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
