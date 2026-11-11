import { createEffect, createSignal, on, onMount, Show } from "solid-js";
import { ensureAudioContext, playPieceSound } from "./audio/sfx";
import { Board } from "./components/Board/Board";
import { Controls } from "./components/Controls/Controls";
import { GameInfo } from "./components/GameInfo/GameInfo";
import { Hand } from "./components/Hand/Hand";
import { KifuList } from "./components/Kifu/KifuList";
import { Layout } from "./components/Layout/Layout";
import { PromotionDialog } from "./components/PromotionDialog/PromotionDialog";
import { ResultOverlay } from "./components/ResultOverlay/ResultOverlay";
import { TitleScreen } from "./components/TitleScreen/TitleScreen";
import { colorLabel, colorSymbol } from "./domain/notation";
import { squareIndex } from "./domain/sfen";
import type { Color, MoveRecord, PieceType } from "./domain/types";
import type { GameMode } from "./state/gameStore";
import { gameStore, isGameOver } from "./state/gameStore";
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
  } = gameStore;

  const hasResumableGame = () => state.records.length > 0;
  const [screen, setScreen] = createSignal<"title" | "game">(
    hasResumableGame() && !isGameOver(state.status) ? "game" : "title",
  );

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

  createEffect(
    on(
      () => state.records.length,
      (length, previousLength) => {
        if (previousLength === undefined || length <= previousLength) return;
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
          engineLaunchError={state.engineLaunchError}
          hasResumableGame={hasResumableGame()}
          colorScheme={state.settings.colorScheme}
          onColorSchemeChange={(colorScheme) => setSettings({ colorScheme })}
          onPieceThemeChange={(pieceTheme) => setSettings({ pieceTheme })}
          onStart={handleStart}
          onContinue={handleContinue}
        />
      </Show>
      <Show when={screen() === "game"}>
        <Layout
          info={
            <GameInfo
              status={state.status}
              mode={state.settings.mode}
              sideToMove={state.position.sideToMove}
              errorMessage={state.errorMessage}
              checked={checkedKingSquare() !== null}
            />
          }
          opponentHand={
            <Hand
              color={opponentColor()}
              pieces={state.position.hands[opponentColor()]}
              theme={selectedTheme()}
              label={`${colorSymbol(opponentColor())}${colorLabel(opponentColor())}`}
              active={state.position.sideToMove === opponentColor()}
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
              onSquareClick={handleSquareClick}
            />
          }
          ownHand={
            <Hand
              color={ownColor()}
              pieces={state.position.hands[ownColor()]}
              theme={selectedTheme()}
              label={`${colorSymbol(ownColor())}${colorLabel(ownColor())}`}
              active={state.position.sideToMove === ownColor()}
              selectedPiece={selectedPieceFor(ownColor())}
              onSelectPiece={
                handClickable(ownColor()) ? handleHandPieceClick : undefined
              }
              rotated={handRotated(ownColor())}
            />
          }
          controls={
            <Controls
              status={state.status}
              canUndo={state.records.length > 0}
              soundEnabled={state.settings.soundEnabled}
              mode={state.settings.mode}
              boardFlip={state.settings.boardFlip}
              records={state.records}
              onUndo={undo}
              onResign={resign}
              onToggleSound={() =>
                setSettings({ soundEnabled: !state.settings.soundEnabled })
              }
              onToggleBoardFlip={() =>
                setSettings({ boardFlip: !state.settings.boardFlip })
              }
              onReturnToTitle={handleReturnToTitle}
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
