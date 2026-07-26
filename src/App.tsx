import { Board } from "./components/Board/Board";
import { GameInfo } from "./components/GameInfo/GameInfo";
import { Hand } from "./components/Hand/Hand";
import { PromotionDialog } from "./components/PromotionDialog/PromotionDialog";
import { gameStore } from "./state/gameStore";
import { textTheme } from "./theme/textTheme";
import "./App.css";

function App() {
  const { state, selectSquare, selectHandPiece, confirmPromotion } = gameStore;

  return (
    <main>
      <div class="gameArea">
        <GameInfo status={state.status} errorMessage={state.errorMessage} />
        <Hand
          color="white"
          pieces={state.position.hands.white}
          theme={textTheme}
        />
        <Board
          position={state.position}
          theme={textTheme}
          selectedSquare={
            state.selection?.kind === "square" ? state.selection.square : null
          }
          legalTargets={state.legalTargets}
          onSquareClick={selectSquare}
        />
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
      </div>
      {state.pendingPromotion && (
        <PromotionDialog onChoose={confirmPromotion} />
      )}
    </main>
  );
}

export default App;
