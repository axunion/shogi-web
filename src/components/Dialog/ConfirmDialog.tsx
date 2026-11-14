import { AlertDialog } from "@kobalte/core/alert-dialog";
import type { JSX } from "solid-js";
import styles from "./Dialog.module.css";
import { DialogButton, type DialogButtonVariant } from "./DialogButton";
import { createFocusReturn } from "./focusReturn";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: DialogButtonVariant;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  trigger?: () => JSX.Element;
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  const returnFocus = createFocusReturn(() => props.open);

  // Routed through a single function so onCancel also fires when the dialog
  // is dismissed via Escape or an outside click, not just the cancel button
  // — those close the dialog through this same onOpenChange(false).
  function handleOpenChange(open: boolean) {
    props.onOpenChange(open);
    if (!open) props.onCancel?.();
  }

  return (
    <AlertDialog open={props.open} onOpenChange={handleOpenChange}>
      {props.trigger?.()}
      <AlertDialog.Portal>
        <AlertDialog.Overlay class={styles.overlay} />
        <div class={styles.positioner}>
          <AlertDialog.Content
            class={styles.content}
            onCloseAutoFocus={returnFocus}
          >
            <AlertDialog.Title class={styles.title}>
              {props.title}
            </AlertDialog.Title>
            <AlertDialog.Description>
              {props.description}
            </AlertDialog.Description>
            <div class={styles.actions}>
              <DialogButton onClick={() => handleOpenChange(false)}>
                {props.cancelLabel ?? "キャンセル"}
              </DialogButton>
              <DialogButton
                variant={props.confirmVariant ?? "primary"}
                onClick={props.onConfirm}
              >
                {props.confirmLabel}
              </DialogButton>
            </div>
          </AlertDialog.Content>
        </div>
      </AlertDialog.Portal>
    </AlertDialog>
  );
}
