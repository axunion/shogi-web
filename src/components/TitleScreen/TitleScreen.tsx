import { Bot, ChevronLeft, ChevronRight, Users } from "lucide-solid";
import { createSignal, For, Show } from "solid-js";
import {
  DIFFICULTY_LEVELS,
  difficultyLevelById,
} from "../../engine/difficulty";
import type {
  EngineState,
  GameMode,
  GameStatus,
  Settings as SettingsState,
} from "../../state/gameStore";
import {
  ENGINE_LAUNCH_FAILED_MESSAGE,
  isGameOver,
} from "../../state/gameStore";
import { ConfirmDialog } from "../Dialog/ConfirmDialog";
import { SettingsMenu } from "../SettingsMenu/SettingsMenu";
import styles from "./TitleScreen.module.css";

const MODE_OPTIONS: { value: GameMode; label: string; Icon: typeof Bot }[] = [
  { value: "engine", label: "AI対戦", Icon: Bot },
  { value: "human", label: "対面対局", Icon: Users },
];

interface TitleScreenProps {
  mode: GameMode;
  difficultyLevel: number;
  pieceTheme: string;
  status: GameStatus;
  engine: EngineState;
  hasResumableGame: boolean;
  colorScheme: SettingsState["colorScheme"];
  soundEnabled: boolean;
  onSoundEnabledChange: (soundEnabled: boolean) => void;
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
  const [resumeChoiceOpen, setResumeChoiceOpen] = createSignal(false);

  const engineNotReady = () =>
    selectedMode() === "engine" && props.engine === "booting";
  const engineError = () =>
    selectedMode() === "engine" && props.engine === "failed";

  const canContinue = () => props.hasResumableGame && !isGameOver(props.status);

  function handleStartClick() {
    if (canContinue()) {
      setResumeChoiceOpen(true);
      return;
    }
    props.onStart(selectedMode(), selectedDifficulty());
  }

  return (
    <div class={styles.screen}>
      <div class={styles.topBar}>
        <SettingsMenu
          pieceTheme={props.pieceTheme}
          colorScheme={props.colorScheme}
          soundEnabled={props.soundEnabled}
          onSoundEnabledChange={props.onSoundEnabledChange}
          onColorSchemeChange={props.onColorSchemeChange}
          onPieceThemeChange={props.onPieceThemeChange}
        />
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
          onClick={handleStartClick}
        >
          {engineNotReady() ? "エンジン起動中…" : "対局を始める"}
        </button>
        <Show when={canContinue()}>
          <button
            type="button"
            class={styles.continueButton}
            onClick={props.onContinue}
          >
            続きから
          </button>
        </Show>
        {engineError() && (
          <p class={styles.engineError}>
            {`${ENGINE_LAUNCH_FAILED_MESSAGE}。ページを再読み込みするか、対面対局をお試しください。`}
          </p>
        )}
      </div>

      <ConfirmDialog
        open={resumeChoiceOpen()}
        onOpenChange={setResumeChoiceOpen}
        title="対局が進行中です"
        description="現在進行中の対局があります。続きから再開しますか、それとも新しく始めますか?"
        cancelLabel="続きから"
        confirmLabel="新しく始める"
        confirmVariant="danger"
        onConfirm={() => {
          setResumeChoiceOpen(false);
          props.onStart(selectedMode(), selectedDifficulty());
        }}
        onCancel={props.onContinue}
      />
    </div>
  );
}
