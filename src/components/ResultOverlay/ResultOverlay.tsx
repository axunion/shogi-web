import { Dialog } from "@kobalte/core/dialog";
import { createEffect, createSignal, on } from "solid-js";
import type { GameStatus } from "../../state/gameStore";
import { isGameOver } from "../../state/gameStore";
import dialogStyles from "../Dialog/Dialog.module.css";
import { DialogButton } from "../Dialog/DialogButton";
import styles from "./ResultOverlay.module.css";

interface ResultOverlayProps {
  status: GameStatus;
  onRematch: () => void;
  onReturnToTitle: () => void;
}

const RESULT_LABEL: Partial<Record<GameStatus, string>> = {
  engineResigned: "あなたの勝ちです",
  engineMated: "あなたの勝ちです",
  playerMated: "あなたの負けです",
  playerResigned: "あなたの負けです",
  engineDeclaredWin: "エンジンの勝ちです",
  blackMated: "後手の勝ちです",
  whiteMated: "先手の勝ちです",
  blackResigned: "後手の勝ちです",
  whiteResigned: "先手の勝ちです",
};

const RESULT_REASON: Partial<Record<GameStatus, string>> = {
  engineResigned: "エンジンが投了しました",
  engineMated: "詰みです",
  playerMated: "詰みです",
  playerResigned: "投了しました",
  blackMated: "詰みです",
  whiteMated: "詰みです",
  blackResigned: "先手が投了しました",
  whiteResigned: "後手が投了しました",
};

type Outcome = "win" | "lose" | "neutral";

// Face-to-face games have no "you", so they get the neutral stamp.
const OUTCOME: Partial<Record<GameStatus, Outcome>> = {
  engineResigned: "win",
  engineMated: "win",
  playerMated: "lose",
  playerResigned: "lose",
  engineDeclaredWin: "lose",
};

const STAMP: Record<Outcome, string> = { win: "勝", lose: "負", neutral: "終" };

export function ResultOverlay(props: ResultOverlayProps) {
  const [open, setOpen] = createSignal(false);

  createEffect(
    on(
      () => props.status,
      (status) => {
        if (isGameOver(status)) setOpen(true);
      },
    ),
  );

  const outcome = (): Outcome => OUTCOME[props.status] ?? "neutral";

  function handleRematch() {
    setOpen(false);
    props.onRematch();
  }

  return (
    <Dialog open={open()} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay class={dialogStyles.overlay} />
        <div class={dialogStyles.positioner}>
          <Dialog.Content
            class={styles.dialog}
            classList={{
              [styles.win]: outcome() === "win",
              [styles.lose]: outcome() === "lose",
            }}
          >
            <span class={styles.stamp} aria-hidden="true">
              {STAMP[outcome()]}
            </span>
            <Dialog.Title class={styles.title}>
              {RESULT_LABEL[props.status]}
            </Dialog.Title>
            {RESULT_REASON[props.status] && (
              <p class={styles.reason}>{RESULT_REASON[props.status]}</p>
            )}
            <div class={styles.actions}>
              <Dialog.CloseButton
                class={dialogStyles.actionButton}
                aria-label="閉じる"
              >
                閉じる
              </Dialog.CloseButton>
              <DialogButton onClick={props.onReturnToTitle}>
                タイトルへ戻る
              </DialogButton>
              <DialogButton variant="primary" onClick={handleRematch}>
                もう一局
              </DialogButton>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
