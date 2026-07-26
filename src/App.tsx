import { Board } from "./components/Board/Board";
import { Hand } from "./components/Hand/Hand";
import { createInitialPosition } from "./domain/position";
import { textTheme } from "./theme/textTheme";
import "./App.css";

function App() {
  const position = createInitialPosition();

  return (
    <main>
      <div class="gameArea">
        <Hand color="white" pieces={position.hands.white} theme={textTheme} />
        <Board position={position} theme={textTheme} />
        <Hand color="black" pieces={position.hands.black} theme={textTheme} />
      </div>
    </main>
  );
}

export default App;
