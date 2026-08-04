import { Monitor, Moon, Sun } from "lucide-solid";
import { createSignal, For, Show } from "solid-js";
import type { Piece } from "../../domain/types";
import type { GameMode, GameStatus, Settings } from "../../state/gameStore";
import { isGameOver } from "../../state/gameStore";
import { lishogiKanjiLightTheme } from "../../theme/lishogiKanjiLightTheme";
import { textTheme } from "../../theme/textTheme";
import type { PieceTheme } from "../../theme/types";
import { PieceView } from "../Board/PieceView";
import styles from "./TitleScreen.module.css";

const MODE_OPTIONS: { value: GameMode; label: string }[] = [
  { value: "engine", label: "対エンジン" },
  { value: "human", label: "人対人(対面)" },
];

const MOVETIME_OPTIONS: { value: number; label: string }[] = [
  { value: 500, label: "弱い(0.5秒)" },
  { value: 1000, label: "普通(1秒)" },
  { value: 3000, label: "強い(3秒)" },
  { value: 8000, label: "最強(8秒)" },
];

// A pawn is the most familiar piece, so it reads clearly as "a sample piece"
// rather than anything tied to a specific role on the board.
const SAMPLE_PIECE: Piece = { type: "P", color: "black" };

const PIECE_THEME_OPTIONS: {
  value: string;
  label: string;
  theme: PieceTheme;
}[] = [
  { value: textTheme.id, label: "文字駒", theme: textTheme },
  {
    value: lishogiKanjiLightTheme.id,
    label: "画像駒",
    theme: lishogiKanjiLightTheme,
  },
];

const COLOR_SCHEME_OPTIONS: {
  value: Settings["colorScheme"];
  label: string;
  Icon: typeof Monitor;
}[] = [
  { value: "system", label: "システム", Icon: Monitor },
  { value: "light", label: "ライト", Icon: Sun },
  { value: "dark", label: "ダーク", Icon: Moon },
];

interface ChoiceRowProps<T extends string | number> {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}

function ChoiceRow<T extends string | number>(props: ChoiceRowProps<T>) {
  return (
    <fieldset class={styles.choiceRow} disabled={props.disabled}>
      <legend class={styles.choiceLabel}>{props.label}</legend>
      <div class={styles.choiceOptions}>
        <For each={props.options}>
          {(option) => (
            <button
              type="button"
              class={`${styles.toggleButton} ${styles.choiceButton}`}
              classList={{
                [styles.toggleButtonActive]: props.value === option.value,
                [styles.choiceButtonActive]: props.value === option.value,
              }}
              aria-pressed={props.value === option.value}
              onClick={() => props.onChange(option.value)}
            >
              {option.label}
            </button>
          )}
        </For>
      </div>
    </fieldset>
  );
}

interface TitleScreenProps {
  mode: GameMode;
  movetimeMs: number;
  pieceTheme: string;
  status: GameStatus;
  hasResumableGame: boolean;
  colorScheme: Settings["colorScheme"];
  onColorSchemeChange: (colorScheme: Settings["colorScheme"]) => void;
  onPieceThemeChange: (pieceTheme: string) => void;
  onStart: (mode: GameMode, movetimeMs: number) => void;
  onContinue: () => void;
}

export function TitleScreen(props: TitleScreenProps) {
  const [selectedMode, setSelectedMode] = createSignal<GameMode>(props.mode);
  const [selectedMovetime, setSelectedMovetime] = createSignal(
    props.movetimeMs,
  );

  const engineNotReady = () =>
    selectedMode() === "engine" && props.status === "loading";

  return (
    <div class={styles.screen}>
      <div class={styles.colorSchemeControl}>
        <For each={COLOR_SCHEME_OPTIONS}>
          {(option) => (
            <button
              type="button"
              class={styles.colorSchemeButton}
              classList={{
                [styles.colorSchemeButtonActive]:
                  props.colorScheme === option.value,
              }}
              aria-pressed={props.colorScheme === option.value}
              aria-label={option.label}
              onClick={() => props.onColorSchemeChange(option.value)}
            >
              <option.Icon size={16} />
            </button>
          )}
        </For>
      </div>

      <div class={styles.hero}>
        <img
          class={styles.emblem}
          src="/pieces/lishogi-kanji-light/0OU.svg"
          alt=""
          width="120"
          height="120"
        />
        <h1 class={styles.title}>将棋</h1>
        <hr class={styles.divider} />
      </div>

      <div class={styles.choices}>
        <ChoiceRow
          label="対局相手"
          options={MODE_OPTIONS}
          value={selectedMode()}
          onChange={setSelectedMode}
        />
        <ChoiceRow
          label="難易度"
          options={MOVETIME_OPTIONS}
          value={selectedMovetime()}
          onChange={setSelectedMovetime}
          disabled={selectedMode() !== "engine"}
        />
        <fieldset class={styles.choiceRow}>
          <legend class={styles.choiceLabel}>駒の種類</legend>
          <div class={styles.themeOptions}>
            <For each={PIECE_THEME_OPTIONS}>
              {(option) => (
                <button
                  type="button"
                  class={`${styles.toggleButton} ${styles.themeButton}`}
                  classList={{
                    [styles.toggleButtonActive]:
                      props.pieceTheme === option.value,
                  }}
                  aria-pressed={props.pieceTheme === option.value}
                  aria-label={option.label}
                  onClick={() => props.onPieceThemeChange(option.value)}
                >
                  <span class={styles.themePieceBox}>
                    <PieceView piece={SAMPLE_PIECE} theme={option.theme} />
                  </span>
                </button>
              )}
            </For>
          </div>
        </fieldset>
      </div>

      <div class={styles.actions}>
        <button
          type="button"
          class={styles.startButton}
          disabled={engineNotReady()}
          onClick={() => props.onStart(selectedMode(), selectedMovetime())}
        >
          {engineNotReady() ? "エンジン起動中…" : "対局を始める"}
        </button>

        <Show when={props.hasResumableGame}>
          <button
            type="button"
            class={styles.continueLink}
            onClick={props.onContinue}
          >
            {isGameOver(props.status) ? "結果を見る" : "対局を続ける"}
          </button>
        </Show>
      </div>

      <p class={styles.credit}>
        駒画像: {lishogiKanjiLightTheme.attribution.name} by{" "}
        {lishogiKanjiLightTheme.attribution.author} (
        <a
          href={lishogiKanjiLightTheme.attribution.licenseUrl}
          target="_blank"
          rel="noreferrer"
        >
          {lishogiKanjiLightTheme.attribution.licenseName}
        </a>
        )
      </p>
    </div>
  );
}
