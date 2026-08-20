import { Popover } from "@kobalte/core/popover";
import {
  Bot,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Moon,
  Settings,
  Sun,
  Users,
} from "lucide-solid";
import { createSignal, For, Show } from "solid-js";
import type { Piece } from "../../domain/types";
import {
  DIFFICULTY_LEVELS,
  difficultyLevelById,
} from "../../engine/difficulty";
import type {
  GameMode,
  GameStatus,
  Settings as SettingsState,
} from "../../state/gameStore";
import { isGameOver } from "../../state/gameStore";
import { lishogiKanjiLightTheme } from "../../theme/lishogiKanjiLightTheme";
import { textTheme } from "../../theme/textTheme";
import type { PieceTheme } from "../../theme/types";
import { PieceView } from "../Board/PieceView";
import styles from "./TitleScreen.module.css";

const MODE_OPTIONS: { value: GameMode; label: string; Icon: typeof Bot }[] = [
  { value: "engine", label: "AI対戦", Icon: Bot },
  { value: "human", label: "対面対局", Icon: Users },
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
  value: SettingsState["colorScheme"];
  label: string;
  Icon: typeof Monitor;
}[] = [
  { value: "system", label: "システム", Icon: Monitor },
  { value: "light", label: "ライト", Icon: Sun },
  { value: "dark", label: "ダーク", Icon: Moon },
];

interface TitleScreenProps {
  mode: GameMode;
  difficultyLevel: number;
  pieceTheme: string;
  status: GameStatus;
  hasResumableGame: boolean;
  colorScheme: SettingsState["colorScheme"];
  onColorSchemeChange: (colorScheme: SettingsState["colorScheme"]) => void;
  onPieceThemeChange: (pieceTheme: string) => void;
  onStart: (mode: GameMode, difficultyLevel: number) => void;
  onContinue: () => void;
}

export function TitleScreen(props: TitleScreenProps) {
  const [selectedMode, setSelectedMode] = createSignal<GameMode>(props.mode);
  const [selectedDifficulty, setSelectedDifficulty] = createSignal(
    props.difficultyLevel,
  );
  const [settingsOpen, setSettingsOpen] = createSignal(false);
  // A native <button>'s click event has detail:0 when fired by keyboard
  // activation (Enter/Space) rather than an actual pointer click — used
  // below to only auto-focus into the popover for keyboard users, so a
  // mouse click doesn't show a focus ring nobody asked for, while Tab still
  // reaches the popover's contents for keyboard-only navigation.
  const [openedViaKeyboard, setOpenedViaKeyboard] = createSignal(false);

  const engineNotReady = () =>
    selectedMode() === "engine" && props.status === "loading";

  return (
    <div class={styles.screen}>
      <Popover
        open={settingsOpen()}
        onOpenChange={setSettingsOpen}
        modal={false}
        placement="bottom-end"
        gutter={8}
      >
        <Popover.Trigger
          class={`${styles.settingsButton} ${settingsOpen() ? styles.settingsButtonActive : ""}`}
          aria-label="設定"
          onClick={(event) => setOpenedViaKeyboard(event.detail === 0)}
        >
          <Settings size={18} />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            class={styles.settingsPanel}
            onOpenAutoFocus={(event) => {
              if (!openedViaKeyboard()) event.preventDefault();
            }}
          >
            <fieldset class={styles.choiceRow}>
              <legend class={styles.srOnly}>配色</legend>
              <div class={styles.settingsColorOptions}>
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
            </fieldset>

            <fieldset class={styles.choiceRow}>
              <legend class={styles.srOnly}>駒の種類</legend>
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

            <p class={styles.pieceCredit}>
              {lishogiKanjiLightTheme.attribution.name} by{" "}
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
          </Popover.Content>
        </Popover.Portal>
      </Popover>

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
        <fieldset class={styles.choiceRow}>
          <legend class={styles.srOnly}>対局相手</legend>
          <div class={styles.modeCards}>
            <For each={MODE_OPTIONS}>
              {(option) => (
                <button
                  type="button"
                  class={styles.modeCard}
                  classList={{
                    [styles.modeCardActive]: selectedMode() === option.value,
                  }}
                  aria-pressed={selectedMode() === option.value}
                  onClick={() => setSelectedMode(option.value)}
                >
                  <option.Icon size={18} />
                  <span>{option.label}</span>
                </button>
              )}
            </For>
          </div>
        </fieldset>

        <fieldset
          class={styles.choiceRow}
          disabled={selectedMode() !== "engine"}
        >
          <legend class={styles.srOnly}>難易度</legend>
          <div class={styles.difficultyStepper}>
            <button
              type="button"
              class={styles.stepperButton}
              aria-label="難易度を下げる"
              disabled={selectedDifficulty() === 0}
              onClick={() => setSelectedDifficulty((d) => Math.max(0, d - 1))}
            >
              <ChevronLeft size={20} />
            </button>
            <span class={styles.difficultyLabel}>
              {difficultyLevelById(selectedDifficulty()).label}
            </span>
            <button
              type="button"
              class={styles.stepperButton}
              aria-label="難易度を上げる"
              disabled={selectedDifficulty() === DIFFICULTY_LEVELS.length - 1}
              onClick={() =>
                setSelectedDifficulty((d) =>
                  Math.min(DIFFICULTY_LEVELS.length - 1, d + 1),
                )
              }
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <div class={styles.difficultyDots}>
            <For each={DIFFICULTY_LEVELS}>
              {(level, index) => (
                <button
                  type="button"
                  class={styles.difficultyDot}
                  classList={{
                    [styles.difficultyDotFilled]:
                      index() <= selectedDifficulty(),
                  }}
                  aria-label={level.label}
                  aria-pressed={index() === selectedDifficulty()}
                  onClick={() => setSelectedDifficulty(index())}
                />
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
          onClick={() => props.onStart(selectedMode(), selectedDifficulty())}
        >
          {engineNotReady() ? "エンジン起動中…" : "対局を始める"}
        </button>

        <Show when={props.hasResumableGame && !isGameOver(props.status)}>
          <button
            type="button"
            class={styles.continueLink}
            onClick={props.onContinue}
          >
            対局を続ける
          </button>
        </Show>
      </div>
    </div>
  );
}
