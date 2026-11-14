import { createEffect, createSignal, on, onMount, Show } from "solid-js";
import { ensureAudioContext, playPieceSound } from "./audio/sfx";
import { ActionBar } from "./components/ActionBar/ActionBar";
import { Board } from "./components/Board/Board";
import { GameHeader } from "./components/GameHeader/GameHeader";
import { GameInfo } from "./components/GameInfo/GameInfo";
import { Hand, type PlateBadge } from "./components/Hand/Hand";
import { KifuList } from "./components/Kifu/KifuList";
import { Layout } from "./components/Layout/Layout";
import { PromotionDialog } from "./components/PromotionDialog/PromotionDialog";
import { ResultOverlay } from "./components/ResultOverlay/ResultOverlay";
import { TitleScreen } from "./components/TitleScreen/TitleScreen";
import { colorLabel, colorSymbol, formatMove } from "./domain/notation";
import { squareIndex } from "./domain/sfen";
import type { Color, MoveRecord, PieceType } from "./domain/types";
import { difficultyLevelById } from "./engine/difficulty";
import type { GameMode } from "./state/gameStore";
import { gameStore, isGameOver } from "./state/gameStore";
import type { Screen } from "./state/storage";
import { loadScreen, saveScreen } from "./state/storage";
import { applyColorScheme } from "./theme/colorScheme";
import { lishogiKanjiLightTheme } from "./theme/lishogiKanjiLightTheme";
import { pieceThemeById } from "./theme/registry";

function wasCapture(record: MoveRecord): boolean {
  if (record.move.kind !== "move") return false;
  const index = squareIndex(record.move.to.file, record.move.to.rank);
  return record.positionBefore.board[index] !== null;
}

function App() {
  const {
    state,
    selectSquare,
    selectHandPiece,
    confirmPromotion,
    cancelPromotion,
    startEngine,
    checkedKingSquare,
    newGame,
    resign,
    undo,
    setSettings,
    resumedFromSave,
  } = gameStore;

  const hasResumableGame = () => state.records.length > 0;
  // Reload returns to the screen the player was last on. Without a restored
  // save there's no game to show, so the title screen is the only option.
  const [screen, setScreen] = createSignal<Screen>(
    resumedFromSave && loadScreen() === "game" ? "game" : "title",
  );
  createEffect(() => saveScreen(screen()));

  function handleStart(mode: GameMode, difficultyLevel: number) {
    setSettings({ mode, difficultyLevel });
    newGame();
    setScreen("game");
  }

  function handleContinue() {
    setScreen("game");
  }

  function handleReturnToTitle() {
    setScreen("title");
  }

  const selectedTheme = () =>
    pieceThemeById(state.settings.pieceTheme) ?? lishogiKanjiLightTheme;

  const flipModeActive = () =>
    state.settings.mode === "human" && state.settings.boardFlip;
  const flipped = () =>
    flipModeActive() && state.position.sideToMove === "white";
  const opponentColor = (): Color => (flipped() ? "black" : "white");
  const ownColor = (): Color => (flipped() ? "white" : "black");

  const difficultyLabel = () =>
    difficultyLevelById(state.settings.difficultyLevel).label;

  const headerTitle = () =>
    state.settings.mode === "engine"
      ? `AI対戦 · ${difficultyLabel()}`
      : "対面対局";

  // Engine games always seat the player as black (先手).
  function playerName(color: Color): string {
    if (state.settings.mode === "human") return colorLabel(color);
    return color === "black" ? "あなた" : `AI ${difficultyLabel()}`;
  }

  function plateBadge(color: Color): PlateBadge {
    if (isGameOver(state.status)) return null;
    if (state.position.sideToMove !== color) return null;
    return state.status === "thinking" ? "thinking" : "turn";
  }

  const lastMoveText = () => {
    const record = state.records[state.records.length - 1];
    return record ? formatMove(record.positionBefore, record.move) : null;
  };

  function handClickable(color: Color): boolean {
    return state.status === "playerTurn" && state.position.sideToMove === color;
  }

  function selectedPieceFor(color: Color): PieceType | null {
    if (state.selection?.kind !== "hand") return null;
    return state.position.sideToMove === color ? state.selection.piece : null;
  }

  // In board-flip mode, "own vs opponent" (not black vs white) determines
  // which hand pieces should read as upright to the current mover.
  function handRotated(color: Color): boolean | undefined {
    if (!flipModeActive()) return undefined;
    return state.position.sideToMove !== color;
  }

  onMount(() => {
    void startEngine();
  });

  createEffect(() => applyColorScheme(state.settings.colorScheme));

  // Counts checking moves for the board's 王手 banner. Only a newly played
  // move announces check — not undo, a reload, or the mating move (the result
  // dialog covers that).
  const [checkAnnouncement, setCheckAnnouncement] = createSignal(0);

  createEffect(
    on(
      () => state.records.length,
      (length, previousLength) => {
        if (previousLength === undefined || length <= previousLength) return;
        if (checkedKingSquare() !== null && !isGameOver(state.status)) {
          setCheckAnnouncement((count) => count + 1);
        }
        if (!state.settings.soundEnabled) return;
        const record = state.records[state.records.length - 1];
        if (!record) return;
        playPieceSound(
          record.move.kind === "drop"
            ? "drop"
            : wasCapture(record)
              ? "capture"
              : "move",
        );
      },
    ),
  );

  function handleSquareClick(square: Parameters<typeof selectSquare>[0]) {
    ensureAudioContext();
    selectSquare(square);
  }

  function handleHandPieceClick(piece: Parameters<typeof selectHandPiece>[0]) {
    ensureAudioContext();
    selectHandPiece(piece);
  }

  return (
    <>
      <Show when={screen() === "title"}>
        <TitleScreen
          mode={state.settings.mode}
          difficultyLevel={state.settings.difficultyLevel}
          pieceTheme={state.settings.pieceTheme}
          status={state.status}
          engine={state.engine}
          hasResumableGame={hasResumableGame()}
          colorScheme={state.settings.colorScheme}
          soundEnabled={state.settings.soundEnabled}
          onSoundEnabledChange={(soundEnabled) => setSettings({ soundEnabled })}
          onColorSchemeChange={(colorScheme) => setSettings({ colorScheme })}
          onPieceThemeChange={(pieceTheme) => setSettings({ pieceTheme })}
          onStart={handleStart}
          onContinue={handleContinue}
        />
      </Show>
      <Show when={screen() === "game"}>
        <Layout
          header={
            <GameHeader
              title={headerTitle()}
              pieceTheme={state.settings.pieceTheme}
              colorScheme={state.settings.colorScheme}
              soundEnabled={state.settings.soundEnabled}
              onSoundEnabledChange={(soundEnabled) =>
                setSettings({ soundEnabled })
              }
              onColorSchemeChange={(colorScheme) =>
                setSettings({ colorScheme })
              }
              onPieceThemeChange={(pieceTheme) => setSettings({ pieceTheme })}
              onReturnToTitle={handleReturnToTitle}
            />
          }
          info={
            <GameInfo
              status={state.status}
              mode={state.settings.mode}
              sideToMove={state.position.sideToMove}
              errorMessage={state.errorMessage}
              checked={checkedKingSquare() !== null}
              moveCount={state.records.length}
              lastMove={lastMoveText()}
            />
          }
          opponentHand={
            <Hand
              color={opponentColor()}
              pieces={state.position.hands[opponentColor()]}
              theme={selectedTheme()}
              symbol={colorSymbol(opponentColor())}
              name={playerName(opponentColor())}
              badge={plateBadge(opponentColor())}
              selectedPiece={selectedPieceFor(opponentColor())}
              onSelectPiece={
                handClickable(opponentColor())
                  ? handleHandPieceClick
                  : undefined
              }
              rotated={handRotated(opponentColor())}
            />
          }
          board={
            <Board
              position={state.position}
              theme={selectedTheme()}
              selectedSquare={
                state.selection?.kind === "square"
                  ? state.selection.square
                  : null
              }
              legalTargets={state.legalTargets}
              lastMove={state.lastMove}
              checkSquare={checkedKingSquare()}
              flipped={flipped()}
              checkAnnouncement={checkAnnouncement()}
              onSquareClick={handleSquareClick}
            />
          }
          ownHand={
            <Hand
              color={ownColor()}
              pieces={state.position.hands[ownColor()]}
              theme={selectedTheme()}
              symbol={colorSymbol(ownColor())}
              name={playerName(ownColor())}
              badge={plateBadge(ownColor())}
              selectedPiece={selectedPieceFor(ownColor())}
              onSelectPiece={
                handClickable(ownColor()) ? handleHandPieceClick : undefined
              }
              rotated={handRotated(ownColor())}
            />
          }
          actions={
            <ActionBar
              status={state.status}
              canUndo={state.records.length > 0}
              mode={state.settings.mode}
              boardFlip={state.settings.boardFlip}
              records={state.records}
              onUndo={undo}
              onResign={resign}
              onRematch={newGame}
              onToggleBoardFlip={() =>
                setSettings({ boardFlip: !state.settings.boardFlip })
              }
            />
          }
          kifu={<KifuList records={state.records} />}
        />
        {state.pendingPromotion && (
          <PromotionDialog
            onChoose={confirmPromotion}
            onCancel={cancelPromotion}
          />
        )}
        <ResultOverlay
          status={state.status}
          onRematch={newGame}
          onReturnToTitle={handleReturnToTitle}
        />
      </Show>
    </>
  );
}

export default App;
