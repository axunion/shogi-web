import type { JSX } from "solid-js";
import styles from "./Layout.module.css";

interface LayoutProps {
  header: JSX.Element;
  info: JSX.Element;
  opponentHand: JSX.Element;
  board: JSX.Element;
  ownHand: JSX.Element;
  actions: JSX.Element;
  kifu: JSX.Element;
}

export function Layout(props: LayoutProps) {
  return (
    <div class={styles.layout}>
      <header class={styles.header}>{props.header}</header>
      <div class={styles.opponentHand}>{props.opponentHand}</div>
      <main class={styles.board}>{props.board}</main>
      <div class={styles.ownHand}>{props.ownHand}</div>
      <aside class={styles.sidePanel}>
        <div class={styles.info}>{props.info}</div>
        <section class={styles.kifu} aria-label="棋譜">
          <h2 class={styles.kifuTitle}>棋譜</h2>
          {props.kifu}
        </section>
        <div class={styles.actions}>{props.actions}</div>
      </aside>
    </div>
  );
}
