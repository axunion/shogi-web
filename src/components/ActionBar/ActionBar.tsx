import { Dialog } from "@kobalte/core/dialog";
import { Flag, RotateCcw, RotateCw, ScrollText, Undo2, X } from "lucide-solid";
import { createSignal, Show } from "solid-js";
import type { MoveRecord } from "../../domain/types";
import type { GameMode, GameStatus } from "../../state/gameStore";
import { isGameOver } from "../../state/gameStore";
import buttonStyles from "../Button/Button.module.css";
import { ConfirmDialog } from "../Dialog/ConfirmDialog";
import { createFocusReturn } from "../Dialog/focusReturn";
import { KifuList } from "../Kifu/KifuList";
import styles from "./ActionBar.module.css";

interface ActionBarProps {
  status: GameStatus;
  canUndo: boolean;
  mode: GameMode;
  boardFlip: boolean;
  records: MoveRecord[];
  onUndo: () => void;
  onResign: () => void;
  onRematch: () => void;
  onToggleBoardFlip: () => void;
}

/** The game's everyday actions, always on screen: a bottom bar on phones,
    a column beside the board in landscape, a button grid on desktop. */
export function ActionBar(props: ActionBarProps) {
  const [confirmResign, setConfirmResign] = createSignal(false);
  const [kifuOpen, setKifuOpen] = createSignal(false);
  const returnFocusFromKifu = createFocusReturn(kifuOpen);
  const button = `${buttonStyles.button} ${styles.action}`;

  return (
    <fieldset class={styles.bar} aria-label="対局操作">
      <Show when={isGameOver(props.status)}>
        <button
          type="button"
          class={`${button} ${styles.rematch}`}
          onClick={props.onRematch}
        >
          <RotateCcw size={20} />
          <span class={styles.label}>もう一局</span>
        </button>
      </Show>

      <button
        type="button"
        class={button}
        disabled={!props.canUndo}
        onClick={props.onUndo}
      >
        <Undo2 size={20} />
        <span class={styles.label}>待った</span>
      </button>

      <Show when={props.mode === "engine" && !isGameOver(props.status)}>
        <button
          type="button"
          class={`${button} ${styles.resign}`}
          disabled={props.status !== "playerTurn"}
          onClick={() => setConfirmResign(true)}
        >
          <Flag size={20} />
          <span class={styles.label}>投了</span>
        </button>
      </Show>

      <Show when={props.mode === "human"}>
        <button
          type="button"
          class={button}
          classList={{ [styles.pressed]: props.boardFlip }}
          aria-pressed={props.boardFlip}
          onClick={props.onToggleBoardFlip}
        >
          <RotateCw size={20} />
          <span class={styles.label}>盤面回転</span>
        </button>
      </Show>

      <button
        type="button"
        class={`${button} ${styles.kifuButton}`}
        onClick={() => setKifuOpen(true)}
      >
        <ScrollText size={20} />
        <span class={styles.label}>棋譜</span>
      </button>

      <ConfirmDialog
        open={confirmResign()}
        onOpenChange={setConfirmResign}
        title="投了"
        description="投了します。よろしいですか?"
        confirmLabel="投了する"
        confirmVariant="danger"
        onConfirm={() => {
          props.onResign();
          setConfirmResign(false);
        }}
      />

      <Dialog open={kifuOpen()} onOpenChange={setKifuOpen}>
        <Dialog.Portal>
          <Dialog.Overlay class={styles.sheetOverlay} />
          <Dialog.Content
            class={styles.sheet}
            onCloseAutoFocus={returnFocusFromKifu}
          >
            <div class={styles.sheetHeader}>
              <Dialog.Title class={styles.sheetTitle}>
                棋譜
                <span class={styles.sheetCount}>{props.records.length}手</span>
              </Dialog.Title>
              <Dialog.CloseButton
                class={buttonStyles.iconButton}
                aria-label="閉じる"
              >
                <X size={20} />
              </Dialog.CloseButton>
            </div>
            <KifuList records={props.records} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </fieldset>
  );
}
