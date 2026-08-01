import { AlertDialog } from "@kobalte/core/alert-dialog";
import { Dialog } from "@kobalte/core/dialog";
import { Popover } from "@kobalte/core/popover";
import { Menu, RotateCw, Volume2, VolumeX } from "lucide-solid";
import { createEffect, createSignal, For, Show } from "solid-js";
import type { MoveRecord } from "../../domain/types";
import type { GameMode, GameStatus } from "../../state/gameStore";
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
  const [pendingMode, setPendingMode] = createSignal<GameMode>(props.mode);
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
    setPendingMode(mode);
    setMenuOpen(false);
    setConfirmModeChange(true);
  }

  function cancelModeChange() {
    setDisplayMode(props.mode);
    setConfirmModeChange(false);
  }

  function confirmModeChangeAction() {
    props.onModeChange(pendingMode());
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
        待った
      </button>

      <AlertDialog open={confirmResign()} onOpenChange={setConfirmResign}>
        <AlertDialog.Trigger
          class={styles.button}
          disabled={props.status !== "playerTurn"}
        >
          投了
        </AlertDialog.Trigger>
        <AlertDialog.Portal>
          <AlertDialog.Overlay class={styles.overlay} />
          <div class={styles.dialogPositioner}>
            <AlertDialog.Content class={styles.dialog}>
              <AlertDialog.Title class={styles.dialogTitle}>
                投了
              </AlertDialog.Title>
              <AlertDialog.Description>
                投了します。よろしいですか?
              </AlertDialog.Description>
              <div class={styles.dialogActions}>
                <button type="button" onClick={() => setConfirmResign(false)}>
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={() => {
                    props.onResign();
                    setConfirmResign(false);
                  }}
                >
                  投了する
                </button>
              </div>
            </AlertDialog.Content>
          </div>
        </AlertDialog.Portal>
      </AlertDialog>

      <Popover
        open={menuOpen()}
        onOpenChange={setMenuOpen}
        modal={false}
        gutter={8}
      >
        <Popover.Trigger class={styles.button} aria-label="メニュー">
          <Menu size={18} />
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

      <AlertDialog open={confirmNewGame()} onOpenChange={setConfirmNewGame}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay class={styles.overlay} />
          <div class={styles.dialogPositioner}>
            <AlertDialog.Content class={styles.dialog}>
              <AlertDialog.Title class={styles.dialogTitle}>
                新規対局
              </AlertDialog.Title>
              <AlertDialog.Description>
                現在の対局をやめて新しく始めますか?
              </AlertDialog.Description>
              <div class={styles.dialogActions}>
                <button type="button" onClick={() => setConfirmNewGame(false)}>
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={() => {
                    props.onNewGame();
                    setConfirmNewGame(false);
                  }}
                >
                  新規対局する
                </button>
              </div>
            </AlertDialog.Content>
          </div>
        </AlertDialog.Portal>
      </AlertDialog>

      <AlertDialog
        open={confirmModeChange()}
        onOpenChange={(open) => {
          if (!open) cancelModeChange();
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay class={styles.overlay} />
          <div class={styles.dialogPositioner}>
            <AlertDialog.Content class={styles.dialog}>
              <AlertDialog.Title class={styles.dialogTitle}>
                対局モードの変更
              </AlertDialog.Title>
              <AlertDialog.Description>
                モードを切り替えると現在の対局をやめて新しく始めます。よろしいですか?
              </AlertDialog.Description>
              <div class={styles.dialogActions}>
                <button type="button" onClick={cancelModeChange}>
                  キャンセル
                </button>
                <button type="button" onClick={confirmModeChangeAction}>
                  切り替える
                </button>
              </div>
            </AlertDialog.Content>
          </div>
        </AlertDialog.Portal>
      </AlertDialog>

      <Dialog open={kifuOpen()} onOpenChange={setKifuOpen}>
        <Dialog.Portal>
          <Dialog.Overlay class={styles.overlay} />
          <Dialog.Content class={styles.sheet}>
            <Dialog.Title class={styles.dialogTitle}>棋譜</Dialog.Title>
            <KifuList records={props.records} />
            <Dialog.CloseButton class={styles.button}>
              閉じる
            </Dialog.CloseButton>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </div>
  );
}
