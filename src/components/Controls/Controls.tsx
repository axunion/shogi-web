import { AlertDialog } from "@kobalte/core/alert-dialog";
import { Dialog } from "@kobalte/core/dialog";
import { Popover } from "@kobalte/core/popover";
import { Flag, Menu, RotateCw, Undo2, Volume2, VolumeX, X } from "lucide-solid";
import type { JSX } from "solid-js";
import { createSignal, Show } from "solid-js";
import type { MoveRecord } from "../../domain/types";
import type { GameMode, GameStatus } from "../../state/gameStore";
import { ConfirmDialog } from "../Dialog/ConfirmDialog";
import dialogStyles from "../Dialog/Dialog.module.css";
import { KifuList } from "../Kifu/KifuList";
import styles from "./Controls.module.css";

function ButtonContent(props: { icon: JSX.Element; label: string }) {
  return (
    <>
      {props.icon}
      <span class={styles.buttonLabel}>{props.label}</span>
    </>
  );
}

interface ControlsProps {
  status: GameStatus;
  canUndo: boolean;
  soundEnabled: boolean;
  mode: GameMode;
  boardFlip: boolean;
  records: MoveRecord[];
  onUndo: () => void;
  onResign: () => void;
  onToggleSound: () => void;
  onToggleBoardFlip: () => void;
  onReturnToTitle: () => void;
}

export function Controls(props: ControlsProps) {
  const [confirmResign, setConfirmResign] = createSignal(false);
  const [confirmReturnToTitle, setConfirmReturnToTitle] = createSignal(false);
  const [kifuOpen, setKifuOpen] = createSignal(false);
  const [menuOpen, setMenuOpen] = createSignal(false);

  function openKifuDialog() {
    setMenuOpen(false);
    setKifuOpen(true);
  }

  function openReturnToTitleDialog() {
    setMenuOpen(false);
    setConfirmReturnToTitle(true);
  }

  return (
    <div class={styles.controls}>
      <button
        type="button"
        class={styles.button}
        disabled={!props.canUndo}
        onClick={props.onUndo}
      >
        <ButtonContent icon={<Undo2 size={16} />} label="待った" />
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
        trigger={() => (
          <AlertDialog.Trigger
            class={`${styles.button} ${styles.buttonDanger}`}
            disabled={props.status !== "playerTurn"}
          >
            <ButtonContent icon={<Flag size={16} />} label="投了" />
          </AlertDialog.Trigger>
        )}
      />

      <Popover
        open={menuOpen()}
        onOpenChange={setMenuOpen}
        modal={false}
        placement="bottom"
        gutter={8}
      >
        <Popover.Trigger class={`${styles.button} ${styles.buttonAccent}`}>
          <ButtonContent icon={<Menu size={16} />} label="メニュー" />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content class={styles.menuPanel}>
            <button
              type="button"
              class={styles.menuItem}
              onClick={props.onToggleSound}
            >
              {props.soundEnabled ? (
                <Volume2 size={18} />
              ) : (
                <VolumeX size={18} />
              )}
              {props.soundEnabled ? "音を消す" : "音を鳴らす"}
            </button>

            <Show when={props.mode === "human"}>
              <button
                type="button"
                class={styles.menuItem}
                onClick={props.onToggleBoardFlip}
              >
                <RotateCw size={18} />
                {props.boardFlip ? "盤面回転:オン" : "盤面回転:オフ"}
              </button>
            </Show>

            <button
              type="button"
              class={`${styles.menuItem} ${styles.kifuButton}`}
              onClick={openKifuDialog}
            >
              棋譜
            </button>

            <button
              type="button"
              class={styles.menuItem}
              onClick={openReturnToTitleDialog}
            >
              タイトルへ戻る
            </button>
          </Popover.Content>
        </Popover.Portal>
      </Popover>

      <ConfirmDialog
        open={confirmReturnToTitle()}
        onOpenChange={setConfirmReturnToTitle}
        title="タイトルへ戻る"
        description="対局を中断してタイトルへ戻りますか?現在の対局は保存され、後で続きから再開できます。"
        confirmLabel="タイトルへ戻る"
        onConfirm={() => {
          props.onReturnToTitle();
          setConfirmReturnToTitle(false);
        }}
      />

      <Dialog open={kifuOpen()} onOpenChange={setKifuOpen}>
        <Dialog.Portal>
          <Dialog.Content class={styles.fullscreen}>
            <div class={styles.fullscreenHeader}>
              <Dialog.Title class={dialogStyles.title}>棋譜</Dialog.Title>
              <Dialog.CloseButton
                class={`${styles.button} ${styles.fullscreenClose}`}
                aria-label="閉じる"
              >
                <X size={20} />
              </Dialog.CloseButton>
            </div>
            <KifuList records={props.records} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </div>
  );
}
