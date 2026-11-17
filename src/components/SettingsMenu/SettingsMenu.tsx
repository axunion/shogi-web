import { Popover } from "@kobalte/core/popover";
import {
  Monitor,
  Moon,
  Settings as SettingsIcon,
  Sun,
  Volume2,
  VolumeX,
} from "lucide-solid";
import { createSignal, For, type JSX } from "solid-js";
import type { Piece } from "../../domain/types";
import type { Settings } from "../../state/gameStore";
import { lishogiKanjiLightTheme } from "../../theme/lishogiKanjiLightTheme";
import { textTheme } from "../../theme/textTheme";
import type { PieceTheme } from "../../theme/types";
import { PieceView } from "../Board/PieceView";
import buttonStyles from "../Button/Button.module.css";
import styles from "./SettingsMenu.module.css";

// A pawn is the most familiar piece, so it reads clearly as "a sample piece"
// rather than anything tied to a specific role on the board.
const SAMPLE_PIECE: Piece = { type: "P", color: "black" };

interface Option<T> {
  value: T;
  /** Visible caption; also the accessible name unless ariaLabel is given. */
  label: string;
  ariaLabel?: string;
  preview: () => JSX.Element;
}

const COLOR_SCHEME_OPTIONS: Option<Settings["colorScheme"]>[] = [
  { value: "system", label: "システム", preview: () => <Monitor size={18} /> },
  { value: "light", label: "ライト", preview: () => <Sun size={18} /> },
  { value: "dark", label: "ダーク", preview: () => <Moon size={18} /> },
];

function pieceThemeOption(theme: PieceTheme, label: string): Option<string> {
  return {
    value: theme.id,
    label,
    preview: () => (
      <span class={styles.pieceBox}>
        <PieceView piece={SAMPLE_PIECE} theme={theme} />
      </span>
    ),
  };
}

const PIECE_THEME_OPTIONS: Option<string>[] = [
  pieceThemeOption(lishogiKanjiLightTheme, "画像駒"),
  pieceThemeOption(textTheme, "文字駒"),
];

const SOUND_OPTIONS: Option<boolean>[] = [
  {
    value: true,
    label: "オン",
    ariaLabel: "効果音オン",
    preview: () => <Volume2 size={18} />,
  },
  {
    value: false,
    label: "オフ",
    ariaLabel: "効果音オフ",
    preview: () => <VolumeX size={18} />,
  },
];

function OptionGroup<T>(props: {
  legend: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset class={styles.group}>
      <legend class={styles.legend}>{props.legend}</legend>
      <div class={styles.options}>
        <For each={props.options}>
          {(option) => (
            <button
              type="button"
              class={styles.option}
              classList={{
                [styles.optionActive]: props.value === option.value,
              }}
              aria-pressed={props.value === option.value}
              aria-label={option.ariaLabel ?? option.label}
              onClick={() => props.onChange(option.value)}
            >
              {option.preview()}
              <span class={styles.optionLabel} aria-hidden="true">
                {option.label}
              </span>
            </button>
          )}
        </For>
      </div>
    </fieldset>
  );
}

interface SettingsMenuProps {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
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
        <SettingsIcon size={20} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          class={styles.panel}
          onOpenAutoFocus={(event) => {
            if (!openedViaKeyboard()) event.preventDefault();
          }}
        >
          <OptionGroup
            legend="配色"
            options={COLOR_SCHEME_OPTIONS}
            value={props.settings.colorScheme}
            onChange={(colorScheme) => props.onChange({ colorScheme })}
          />
          <OptionGroup
            legend="駒の種類"
            options={PIECE_THEME_OPTIONS}
            value={props.settings.pieceTheme}
            onChange={(pieceTheme) => props.onChange({ pieceTheme })}
          />
          <OptionGroup
            legend="効果音"
            options={SOUND_OPTIONS}
            value={props.settings.soundEnabled}
            onChange={(soundEnabled) => props.onChange({ soundEnabled })}
          />

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
