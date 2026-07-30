import { Dialog } from "@kobalte/core/dialog";
import styles from "./PromotionDialog.module.css";

interface PromotionDialogProps {
  onChoose: (promote: boolean) => void;
}

export function PromotionDialog(props: PromotionDialogProps) {
  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) props.onChoose(false);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay class={styles.overlay} />
        <div class={styles.positioner}>
          <Dialog.Content class={styles.dialog}>
            <Dialog.Title class={styles.title}>成りますか?</Dialog.Title>
            <div class={styles.actions}>
              <button type="button" onClick={() => props.onChoose(false)}>
                成らない
              </button>
              <button type="button" onClick={() => props.onChoose(true)}>
                成る
              </button>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
