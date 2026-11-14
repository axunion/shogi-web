import { Dialog } from "@kobalte/core/dialog";
import dialogStyles from "../Dialog/Dialog.module.css";
import { DialogButton } from "../Dialog/DialogButton";
import { createFocusReturn } from "../Dialog/focusReturn";
import styles from "./PromotionDialog.module.css";

interface PromotionDialogProps {
  onChoose: (promote: boolean) => void;
  onCancel: () => void;
}

export function PromotionDialog(props: PromotionDialogProps) {
  // Mounted only while a promotion is pending, so it is always open.
  const returnFocus = createFocusReturn(() => true);

  return (
    <Dialog
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) props.onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay class={dialogStyles.overlay} />
        <div class={dialogStyles.positioner}>
          <Dialog.Content
            class={styles.dialog}
            // Explicit: rendered without it, Kobalte exposes this content
            // as an alertdialog, which is for interruptive warnings.
            role="dialog"
            onCloseAutoFocus={returnFocus}
          >
            <Dialog.Title class={styles.title}>成りますか?</Dialog.Title>
            <div class={styles.actions}>
              <DialogButton onClick={() => props.onChoose(false)}>
                成らない
              </DialogButton>
              <DialogButton
                variant="primary"
                onClick={() => props.onChoose(true)}
              >
                成る
              </DialogButton>
            </div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog>
  );
}
