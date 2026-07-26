import { Board } from "./components/Board/Board";
import { Hand } from "./components/Hand/Hand";
import { PromotionDialog } from "./components/PromotionDialog/PromotionDialog";
// TODO(phase 3 debug): remove this import once phase 4 wires the engine into gameStore.
import { UsiEngine } from "./engine/usiEngine";
import { gameStore } from "./state/gameStore";
import { textTheme } from "./theme/textTheme";
import "./App.css";

// TODO(phase 3 debug): remove this handler once phase 4 wires the engine into gameStore.
async function debugEngineCheck() {
  console.debug("crossOriginIsolated:", window.crossOriginIsolated);
  const engine = new UsiEngine();
  try {
    await engine.launch();
    const bestmove = await engine.search("position startpos", 1000);
    console.debug("search resolved with:", bestmove);
  } catch (error) {
    console.error("debug engine check failed:", error);
  }
}

function App() {
  const { state, selectSquare, selectHandPiece, confirmPromotion } = gameStore;

  return (
    <main>
      {/* TODO(phase 3 debug): remove this button once phase 4 wires the engine into gameStore. */}
      <button type="button" onClick={debugEngineCheck}>
        Debug: launch engine and search
      </button>
      <div class="gameArea">
        <Hand
          color="white"
          pieces={state.position.hands.white}
          theme={textTheme}
          selectedPiece={
            state.selection?.kind === "hand" &&
            state.position.sideToMove === "white"
              ? state.selection.piece
              : null
          }
          onSelectPiece={
            state.position.sideToMove === "white" ? selectHandPiece : undefined
          }
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
            state.selection?.kind === "hand" &&
            state.position.sideToMove === "black"
              ? state.selection.piece
              : null
          }
          onSelectPiece={
            state.position.sideToMove === "black" ? selectHandPiece : undefined
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
