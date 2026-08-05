import type { JSX } from "solid-js";
import styles from "./Dialog.module.css";

export type DialogButtonVariant = "neutral" | "primary" | "danger";

const VARIANT_CLASS: Record<DialogButtonVariant, string> = {
  neutral: "",
  primary: styles.primary,
  danger: styles.danger,
};

interface DialogButtonProps {
  variant?: DialogButtonVariant;
  onClick?: () => void;
  children: JSX.Element;
}

export function DialogButton(props: DialogButtonProps) {
  return (
    <button
      type="button"
      class={`${styles.actionButton} ${VARIANT_CLASS[props.variant ?? "neutral"]}`}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}
