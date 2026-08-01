import { AlertDialog } from "@kobalte/core/alert-dialog";
import { Dialog } from "@kobalte/core/dialog";
import { Popover } from "@kobalte/core/popover";
import { Flag, Menu, RotateCw, Undo2, Volume2, VolumeX, X } from "lucide-solid";
import type { JSX } from "solid-js";
import { createEffect, createSignal, For, Show } from "solid-js";
import type { MoveRecord } from "../../domain/types";
import type { GameMode, GameStatus } from "../../state/gameStore";
import { ConfirmDialog } from "../Dialog/ConfirmDialog";
import dialogStyles from "../Dialog/Dialog.module.css";
import { KifuList } from "../Kifu/KifuList";
import styles from "./Controls.module.css";

const MOVETIME_OPTIONS: { value: number; label: string }[] = [
  { value: 500, label: "弱い(0.5秒)" },
  { value: 1000, label: "普通(1秒)" },
  { value: 3000, label: "強い(3秒)" },
  { value: 8000, label: "最強(8秒)" },
];

const MODE_OPTIONS: { value: GameMode; label: string }[] = [
  { value: "engine", label: "対エンジン" },
  { value: "human", label: "人対人（対面）" },
];

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
  movetimeMs: number;
  mode: GameMode;
  boardFlip: boolean;
  records: MoveRecord[];
  onNewGame: () => void;
  onUndo: () => void;
  onResign: () => void;
  onToggleSound: () => void;
  onMovetimeChange: (movetimeMs: number) => void;
  onModeChange: (mode: GameMode) => void;
  onToggleBoardFlip: () => void;
}

export function Controls(props: ControlsProps) {
  const [confirmNewGame, setConfirmNewGame] = createSignal(false);
  const [confirmResign, setConfirmResign] = createSignal(false);
  const [confirmModeChange, setConfirmModeChange] = createSignal(false);
  // Mirrors props.mode so the <select>'s displayed value can be snapped back
  // on cancel even when props.mode itself never changes.
  const [displayMode, setDisplayMode] = createSignal<GameMode>(props.mode);
  createEffect(() => setDisplayMode(props.mode));
  const [kifuOpen, setKifuOpen] = createSignal(false);
  const [menuOpen, setMenuOpen] = createSignal(false);

  function openNewGameDialog() {
    setMenuOpen(false);
    setConfirmNewGame(true);
  }

  function openKifuDialog() {
    setMenuOpen(false);
    setKifuOpen(true);
  }

  function requestModeChange(mode: GameMode) {
    setDisplayMode(mode);
    if (mode === props.mode) return;
    setMenuOpen(false);
    setConfirmModeChange(true);
  }

  function cancelModeChange() {
    setDisplayMode(props.mode);
    setConfirmModeChange(false);
  }

  function confirmModeChangeAction() {
    props.onModeChange(displayMode());
    setConfirmModeChange(false);
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
              onClick={openNewGameDialog}
            >
              新規対局
            </button>

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

            <select
              class={styles.select}
              value={displayMode()}
              onChange={(event) =>
                requestModeChange(event.currentTarget.value as GameMode)
              }
            >
              <For each={MODE_OPTIONS}>
                {(option) => (
                  <option value={option.value}>{option.label}</option>
                )}
              </For>
            </select>

            <Show when={props.mode === "engine"}>
              <select
                class={styles.select}
                value={props.movetimeMs}
                onChange={(event) =>
                  props.onMovetimeChange(Number(event.currentTarget.value))
                }
              >
                <For each={MOVETIME_OPTIONS}>
                  {(option) => (
                    <option value={option.value}>{option.label}</option>
                  )}
                </For>
              </select>
            </Show>

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
          </Popover.Content>
        </Popover.Portal>
      </Popover>

      <ConfirmDialog
        open={confirmNewGame()}
        onOpenChange={setConfirmNewGame}
        title="新規対局"
        description="現在の対局をやめて新しく始めますか?"
        confirmLabel="新規対局する"
        onConfirm={() => {
          props.onNewGame();
          setConfirmNewGame(false);
        }}
      />

      <ConfirmDialog
        open={confirmModeChange()}
        onOpenChange={(open) => {
          if (!open) cancelModeChange();
        }}
        title="対局モードの変更"
        description="モードを切り替えると現在の対局をやめて新しく始めます。よろしいですか?"
        confirmLabel="切り替える"
        onConfirm={confirmModeChangeAction}
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
