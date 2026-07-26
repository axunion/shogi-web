import type { GameStatus } from "../../state/gameStore";
import styles from "./GameInfo.module.css";

interface GameInfoProps {
  status: GameStatus;
  errorMessage: string | null;
}

const STATUS_LABEL: Record<GameStatus, string> = {
  loading: "エンジンを起動しています…",
  playerTurn: "あなたの番です",
  thinking: "エンジンが思考中です…",
  playerWin: "あなたの勝ちです（エンジンが投了しました）",
  playerLose: "あなたの負けです",
  error: "エラーが発生しました",
};

export function GameInfo(props: GameInfoProps) {
  return (
    <div class={styles.info}>
      <p>{STATUS_LABEL[props.status]}</p>
      {props.status === "error" && props.errorMessage && (
        <p class={styles.error}>{props.errorMessage}</p>
      )}
    </div>
  );
}
