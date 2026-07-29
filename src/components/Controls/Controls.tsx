import { AlertDialog } from "@kobalte/core/alert-dialog";
import { Dialog } from "@kobalte/core/dialog";
import { Popover } from "@kobalte/core/popover";
import { Menu, Volume2, VolumeX } from "lucide-solid";
import { createSignal, For } from "solid-js";
import type { MoveRecord } from "../../domain/types";
import type { GameStatus } from "../../state/gameStore";
import { KifuList } from "../Kifu/KifuList";
import styles from "./Controls.module.css";

const MOVETIME_OPTIONS: { value: number; label: string }[] = [
  { value: 500, label: "弱い(0.5秒)" },
  { value: 1000, label: "普通(1秒)" },
  { value: 3000, label: "強い(3秒)" },
  { value: 8000, label: "最強(8秒)" },
];

interface ControlsProps {
  status: GameStatus;
  canUndo: boolean;
  soundEnabled: boolean;
  movetimeMs: number;
  records: MoveRecord[];
  onNewGame: () => void;
  onUndo: () => void;
  onResign: () => void;
  onToggleSound: () => void;
  onMovetimeChange: (movetimeMs: number) => void;
}

export function Controls(props: ControlsProps) {
  const [confirmNewGame, setConfirmNewGame] = createSignal(false);
  const [confirmResign, setConfirmResign] = createSignal(false);
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
