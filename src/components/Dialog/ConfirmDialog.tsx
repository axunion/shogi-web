import { AlertDialog } from "@kobalte/core/alert-dialog";
import type { JSX } from "solid-js";
import styles from "./Dialog.module.css";
import { DialogButton, type DialogButtonVariant } from "./DialogButton";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: DialogButtonVariant;
  cancelLabel?: string;
  onConfirm: () => void;
  trigger?: () => JSX.Element;
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  return (
    <AlertDialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.trigger?.()}
      <AlertDialog.Portal>
        <AlertDialog.Overlay class={styles.overlay} />
        <div class={styles.positioner}>
          <AlertDialog.Content class={styles.content}>
            <AlertDialog.Title class={styles.title}>
              {props.title}
            </AlertDialog.Title>
            <AlertDialog.Description>
              {props.description}
            </AlertDialog.Description>
            <div class={styles.actions}>
              <DialogButton onClick={() => props.onOpenChange(false)}>
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
