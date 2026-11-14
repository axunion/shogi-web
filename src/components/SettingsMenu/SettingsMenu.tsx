import { Popover } from "@kobalte/core/popover";
import { Monitor, Moon, Settings, Sun, Volume2, VolumeX } from "lucide-solid";
import { createSignal, For } from "solid-js";
import type { Piece } from "../../domain/types";
import type { Settings as SettingsState } from "../../state/gameStore";
import { lishogiKanjiLightTheme } from "../../theme/lishogiKanjiLightTheme";
import { textTheme } from "../../theme/textTheme";
import type { PieceTheme } from "../../theme/types";
import { PieceView } from "../Board/PieceView";
import buttonStyles from "../Button/Button.module.css";
import styles from "./SettingsMenu.module.css";

// A pawn is the most familiar piece, so it reads clearly as "a sample piece"
// rather than anything tied to a specific role on the board.
const SAMPLE_PIECE: Piece = { type: "P", color: "black" };

const PIECE_THEME_OPTIONS: {
  value: string;
  label: string;
  theme: PieceTheme;
}[] = [
  {
    value: lishogiKanjiLightTheme.id,
    label: "画像駒",
    theme: lishogiKanjiLightTheme,
  },
  { value: textTheme.id, label: "文字駒", theme: textTheme },
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

const SOUND_OPTIONS: {
  value: boolean;
  label: string;
  ariaLabel: string;
  Icon: typeof Monitor;
}[] = [
  { value: true, label: "オン", ariaLabel: "効果音オン", Icon: Volume2 },
  { value: false, label: "オフ", ariaLabel: "効果音オフ", Icon: VolumeX },
];

interface SettingsMenuProps {
  pieceTheme: string;
  colorScheme: SettingsState["colorScheme"];
  soundEnabled: boolean;
  onSoundEnabledChange: (soundEnabled: boolean) => void;
  onColorSchemeChange: (colorScheme: SettingsState["colorScheme"]) => void;
  onPieceThemeChange: (pieceTheme: string) => void;
}

export function SettingsMenu(props: SettingsMenuProps) {
  const [open, setOpen] = createSignal(false);
  // A native <button>'s click event has detail:0 when fired by keyboard
  // activation (Enter/Space) rather than an actual pointer click — used
  // below to only auto-focus into the popover for keyboard users, so a
  // mouse click doesn't show a focus ring nobody asked for, while Tab still
  // reaches the popover's contents for keyboard-only navigation.
  const [openedViaKeyboard, setOpenedViaKeyboard] = createSignal(false);

  return (
    <Popover
      open={open()}
      onOpenChange={setOpen}
      modal={false}
      placement="bottom-end"
      gutter={8}
    >
      <Popover.Trigger
        class={buttonStyles.iconButton}
        classList={{ [buttonStyles.iconButtonActive]: open() }}
        aria-label="設定"
        onClick={(event) => setOpenedViaKeyboard(event.detail === 0)}
      >
        <Settings size={20} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          class={styles.panel}
          onOpenAutoFocus={(event) => {
            if (!openedViaKeyboard()) event.preventDefault();
          }}
        >
          <fieldset class={styles.group}>
            <legend class={styles.legend}>配色</legend>
            <div class={styles.options}>
              <For each={COLOR_SCHEME_OPTIONS}>
                {(option) => (
                  <button
                    type="button"
                    class={styles.option}
                    classList={{
                      [styles.optionActive]: props.colorScheme === option.value,
                    }}
                    aria-pressed={props.colorScheme === option.value}
                    aria-label={option.label}
                    onClick={() => props.onColorSchemeChange(option.value)}
                  >
                    <option.Icon size={18} />
                    <span class={styles.optionLabel} aria-hidden="true">
                      {option.label}
                    </span>
                  </button>
                )}
              </For>
            </div>
          </fieldset>

          <fieldset class={styles.group}>
            <legend class={styles.legend}>駒の種類</legend>
            <div class={styles.options}>
              <For each={PIECE_THEME_OPTIONS}>
                {(option) => (
                  <button
                    type="button"
                    class={styles.option}
                    classList={{
                      [styles.optionActive]: props.pieceTheme === option.value,
                    }}
                    aria-pressed={props.pieceTheme === option.value}
                    aria-label={option.label}
                    onClick={() => props.onPieceThemeChange(option.value)}
                  >
                    <span class={styles.pieceBox}>
                      <PieceView piece={SAMPLE_PIECE} theme={option.theme} />
                    </span>
                    <span class={styles.optionLabel} aria-hidden="true">
                      {option.label}
                    </span>
                  </button>
                )}
              </For>
            </div>
          </fieldset>

          <fieldset class={styles.group}>
            <legend class={styles.legend}>効果音</legend>
            <div class={styles.options}>
              <For each={SOUND_OPTIONS}>
                {(option) => (
                  <button
                    type="button"
                    class={styles.option}
                    classList={{
                      [styles.optionActive]:
                        props.soundEnabled === option.value,
                    }}
                    aria-pressed={props.soundEnabled === option.value}
                    aria-label={option.ariaLabel}
                    onClick={() => props.onSoundEnabledChange(option.value)}
                  >
                    <option.Icon size={18} />
                    <span class={styles.optionLabel} aria-hidden="true">
                      {option.label}
                    </span>
                  </button>
                )}
              </For>
            </div>
          </fieldset>

          <p class={styles.credit}>
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
  );
}
