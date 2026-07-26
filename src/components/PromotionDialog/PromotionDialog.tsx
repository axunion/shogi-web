import styles from "./PromotionDialog.module.css";

interface PromotionDialogProps {
  onChoose: (promote: boolean) => void;
}

export function PromotionDialog(props: PromotionDialogProps) {
  return (
    <div class={styles.overlay}>
      <div class={styles.dialog}>
        <button type="button" onClick={() => props.onChoose(true)}>
          成る
        </button>
        <button type="button" onClick={() => props.onChoose(false)}>
          成らない
        </button>
      </div>
    </div>
  );
}
