import type { JSX } from "solid-js";
import styles from "./Layout.module.css";

interface LayoutProps {
  info: JSX.Element;
  opponentHand: JSX.Element;
  board: JSX.Element;
  ownHand: JSX.Element;
  controls?: JSX.Element;
  kifu?: JSX.Element;
}

export function Layout(props: LayoutProps) {
  return (
    <div class={styles.layout}>
      <div class={styles.info}>{props.info}</div>
      <div class={styles.opponentHand}>{props.opponentHand}</div>
      <div class={styles.board}>{props.board}</div>
      <div class={styles.ownHand}>{props.ownHand}</div>
      <div class={styles.controls}>{props.controls}</div>
      <div class={styles.kifu}>{props.kifu}</div>
    </div>
  );
}
