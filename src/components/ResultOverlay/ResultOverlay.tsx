import { Dialog } from "@kobalte/core/dialog";
import { createEffect, createSignal, on } from "solid-js";
import type { GameStatus } from "../../state/gameStore";
import { isGameOver } from "../../state/gameStore";
import styles from "./ResultOverlay.module.css";

interface ResultOverlayProps {
  status: GameStatus;
  onRematch: () => void;
}

const RESULT_LABEL: Partial<Record<GameStatus, string>> = {
  engineResigned: "あなたの勝ちです",
  engineMated: "あなたの勝ちです",
  playerMated: "あなたの負けです",
  playerResigned: "あなたの負けです",
  engineDeclaredWin: "エンジンの勝ちです",
};

const RESULT_REASON: Partial<Record<GameStatus, string>> = {
  engineResigned: "エンジンが投了しました",
  engineMated: "詰みです",
  playerMated: "詰みです",
  playerResigned: "投了しました",
};

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

  function handleRematch() {
    setOpen(false);
    props.onRematch();
  }

  return (
    <Dialog open={open()} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay class={styles.overlay} />
        <div class={styles.positioner}>
          <Dialog.Content class={styles.dialog}>
            <Dialog.Title class={styles.title}>
              {RESULT_LABEL[props.status]}
            </Dialog.Title>
            {RESULT_REASON[props.status] && (
              <p class={styles.reason}>{RESULT_REASON[props.status]}</p>
            )}
            <div class={styles.actions}>
              <Dialog.CloseButton>閉じる</Dialog.CloseButton>
              <button type="button" onClick={handleRematch}>
                もう一局
              </button>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
