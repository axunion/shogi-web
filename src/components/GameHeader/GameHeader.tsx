import { ChevronLeft } from "lucide-solid";
import { createSignal, type JSX } from "solid-js";
import buttonStyles from "../Button/Button.module.css";
import { ConfirmDialog } from "../Dialog/ConfirmDialog";
import styles from "./GameHeader.module.css";

interface GameHeaderProps {
  /** e.g. "AI対戦 · 4級" or "対面対局". */
  title: string;
  /** The shared SettingsMenu, built by App. */
  settingsMenu: JSX.Element;
  onReturnToTitle: () => void;
}

export function GameHeader(props: GameHeaderProps) {
  const [confirmOpen, setConfirmOpen] = createSignal(false);

  return (
    <div class={styles.header}>
      <button
        type="button"
        class={`${buttonStyles.iconButton} ${styles.back}`}
        aria-label="タイトルへ"
        onClick={() => setConfirmOpen(true)}
      >
        <ChevronLeft size={22} />
        <span class={styles.backLabel} aria-hidden="true">
          タイトルへ
        </span>
      </button>

      <h1 class={styles.title}>{props.title}</h1>

      <div class={styles.end}>{props.settingsMenu}</div>

      <ConfirmDialog
        open={confirmOpen()}
        onOpenChange={setConfirmOpen}
        title="タイトルへ戻る"
        description="対局を中断してタイトルへ戻りますか?現在の対局は保存され、後で続きから再開できます。"
        confirmLabel="タイトルへ戻る"
        onConfirm={() => {
          props.onReturnToTitle();
          setConfirmOpen(false);
        }}
      />
    </div>
  );
}
