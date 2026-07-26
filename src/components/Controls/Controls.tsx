import { AlertDialog } from "@kobalte/core/alert-dialog";
import { Volume2, VolumeX } from "lucide-solid";
import { createSignal, For } from "solid-js";
import type { GameStatus } from "../../state/gameStore";
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
  onNewGame: () => void;
  onUndo: () => void;
  onResign: () => void;
  onToggleSound: () => void;
  onMovetimeChange: (movetimeMs: number) => void;
}

export function Controls(props: ControlsProps) {
  const [confirmNewGame, setConfirmNewGame] = createSignal(false);
  const [confirmResign, setConfirmResign] = createSignal(false);

  return (
    <div class={styles.controls}>
      <AlertDialog open={confirmNewGame()} onOpenChange={setConfirmNewGame}>
        <AlertDialog.Trigger class={styles.button}>
          新規対局
        </AlertDialog.Trigger>
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

      <button
        type="button"
        class={styles.button}
        onClick={props.onToggleSound}
        aria-label={props.soundEnabled ? "音を消す" : "音を鳴らす"}
      >
        {props.soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>

      <select
        class={styles.select}
        value={props.movetimeMs}
        onChange={(event) =>
          props.onMovetimeChange(Number(event.currentTarget.value))
        }
      >
        <For each={MOVETIME_OPTIONS}>
          {(option) => <option value={option.value}>{option.label}</option>}
        </For>
      </select>
    </div>
  );
}
