import { createEffect, For, Show } from "solid-js";
import { formatMove } from "../../domain/notation";
import type { MoveRecord } from "../../domain/types";
import styles from "./KifuList.module.css";

interface KifuListProps {
  records: MoveRecord[];
}

export function KifuList(props: KifuListProps) {
  let listRef: HTMLOListElement | undefined;

  createEffect(() => {
    props.records.length;
    listRef?.lastElementChild?.scrollIntoView({ block: "nearest" });
  });

  return (
    <ol class={styles.list} ref={listRef}>
      <Show
        when={props.records.length > 0}
        fallback={<li class={styles.empty}>まだ指し手はありません</li>}
      >
        <For each={props.records}>
          {(record, index) => (
            <li
              classList={{
                [styles.latest]: index() === props.records.length - 1,
              }}
            >
              {index() + 1} {formatMove(record.positionBefore, record.move)}
            </li>
          )}
        </For>
      </Show>
    </ol>
  );
}
