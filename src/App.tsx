import { createEffect, on, onMount } from "solid-js";
import { ensureAudioContext, playPieceSound } from "./audio/sfx";
import { Board } from "./components/Board/Board";
import { Controls } from "./components/Controls/Controls";
import { GameInfo } from "./components/GameInfo/GameInfo";
import { Hand } from "./components/Hand/Hand";
import { KifuList } from "./components/Kifu/KifuList";
import { Layout } from "./components/Layout/Layout";
import { PromotionDialog } from "./components/PromotionDialog/PromotionDialog";
import { squareIndex } from "./domain/sfen";
import type { MoveRecord } from "./domain/types";
import { gameStore } from "./state/gameStore";
import { textTheme } from "./theme/textTheme";

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
    startEngine,
    checkedKingSquare,
    newGame,
    resign,
    undo,
    setSettings,
  } = gameStore;

  onMount(() => {
    void startEngine();
  });

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
      <Layout
        info={
          <GameInfo
            status={state.status}
            errorMessage={state.errorMessage}
            checked={checkedKingSquare() !== null}
          />
        }
        opponentHand={
          <Hand
            color="white"
            pieces={state.position.hands.white}
            theme={textTheme}
            label="☖後手"
            active={state.position.sideToMove === "white"}
          />
        }
        board={
          <Board
            position={state.position}
            theme={textTheme}
            selectedSquare={
              state.selection?.kind === "square" ? state.selection.square : null
            }
            legalTargets={state.legalTargets}
            lastMove={state.lastMove}
            checkSquare={checkedKingSquare()}
            onSquareClick={handleSquareClick}
          />
        }
        ownHand={
          <Hand
            color="black"
            pieces={state.position.hands.black}
            theme={textTheme}
            label="☗先手"
            active={state.position.sideToMove === "black"}
            selectedPiece={
              state.selection?.kind === "hand" ? state.selection.piece : null
            }
            onSelectPiece={
              state.status === "playerTurn" ? handleHandPieceClick : undefined
            }
          />
        }
        controls={
          <Controls
            status={state.status}
            canUndo={state.records.length > 0}
            soundEnabled={state.settings.soundEnabled}
            movetimeMs={state.settings.movetimeMs}
            records={state.records}
            onNewGame={newGame}
            onUndo={undo}
            onResign={resign}
            onToggleSound={() =>
              setSettings({ soundEnabled: !state.settings.soundEnabled })
            }
            onMovetimeChange={(movetimeMs) => setSettings({ movetimeMs })}
          />
        }
        kifu={<KifuList records={state.records} />}
      />
      {state.pendingPromotion && (
        <PromotionDialog onChoose={confirmPromotion} />
      )}
    </>
  );
}

export default App;
