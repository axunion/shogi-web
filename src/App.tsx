import { onMount } from "solid-js";
import { Board } from "./components/Board/Board";
import { GameInfo } from "./components/GameInfo/GameInfo";
import { Hand } from "./components/Hand/Hand";
import { Layout } from "./components/Layout/Layout";
import { PromotionDialog } from "./components/PromotionDialog/PromotionDialog";
import { gameStore } from "./state/gameStore";
import { textTheme } from "./theme/textTheme";

function App() {
  const {
    state,
    selectSquare,
    selectHandPiece,
    confirmPromotion,
    startEngine,
  } = gameStore;

  onMount(() => {
    void startEngine();
  });

  return (
    <>
      <Layout
        info={
          <GameInfo status={state.status} errorMessage={state.errorMessage} />
        }
        opponentHand={
          <Hand
            color="white"
            pieces={state.position.hands.white}
            theme={textTheme}
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
            onSquareClick={selectSquare}
          />
        }
        ownHand={
          <Hand
            color="black"
            pieces={state.position.hands.black}
            theme={textTheme}
            selectedPiece={
              state.selection?.kind === "hand" ? state.selection.piece : null
            }
            onSelectPiece={
              state.status === "playerTurn" ? selectHandPiece : undefined
            }
          />
        }
      />
      {state.pendingPromotion && (
        <PromotionDialog onChoose={confirmPromotion} />
      )}
    </>
  );
}

export default App;
