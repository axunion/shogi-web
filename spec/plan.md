# web-shogi 改善計画書（第 2 期）

第 1 期（盤 UI / 合法手判定 / USI 通信 / エンジン結合）は完了済み。本書は「完成度の高い
コンシューマーゲーム」に近づけるための第 2 期計画。

- **この文書は日本語**（開発時の計画メモ扱い）。CLAUDE.md の規約により
  **コード・コメント・コミットメッセージ・console 出力・README はすべて英語**。
  ただし **UI 表示テキストは日本語**（日本語話者向けアプリのため。規約違反ではない）。
- 検証コマンド: `pnpm dev` / `pnpm test` / `pnpm check`。各フェーズ完了時に
  `pnpm test` と `pnpm check` が通っていることが最低条件。
- サーバー保存は対象外。すべてローカル（`pnpm dev` / `pnpm preview`）で検証可能な範囲。

## 0. 引き継ぐ不変の前提

| 項目 | 内容 |
| --- | --- |
| 構成 | SolidJS 1.9 + Vite 8 + TypeScript 6.0 / CSS Modules（lightningcss）/ Vitest 4 / Biome |
| 依存方向 | `components → state → domain / engine`（一方向。循環禁止） |
| 思考エンジン | `@mizarjp/yaneuraou.k-p`（GPL-3.0。公開配布時はライセンス整合が必要） |
| COOP/COEP | `Cross-Origin-Opener-Policy: same-origin` / `Cross-Origin-Embedder-Policy: require-corp` を `vite.config.ts` の `server.headers` と `preview.headers` 両方に設定済み。**外部 CDN 参照を追加してはいけない**（アセットは全て同梱） |

### 座標規約（バグの最多発生源。厳守）

- `rank` は上（後手陣）から 1〜9。USI の段字母 `a`〜`i` に対応（`a`=1）。
- `file` は右から 1〜9。盤を左→右に描画するとき列順は **file 9→1**。
- 盤配列 index = `(rank - 1) * 9 + (9 - file)`（`domain/sfen.ts: squareIndex()`）。
- USI 指し手表記: `7g7f`（移動）、`8h2b+`（成り）、`P*5e`（打ち）。
- 平手初期局面 SFEN: `lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1`
- 成りゾーン: 先手は rank 1〜3、後手は rank 7〜9。強制成り: 歩・香は最奥段、桂は奥 2 段。

### エンジン通信（既存 `engine/usiEngine.ts`）

```
gameStore ──(Promise API)── UsiEngine ──(postMessage)── engine.worker.ts ── YaneuraOu.wasm
```
- `launch(): Promise<void>` / `newGame(): void` / `search(usiPosition, movetimeMs): Promise<string>`
- 送受信行はすべて `console.debug` にログ（デバッグの生命線。削除禁止）。
- **`stop()` / `quit()` は未実装**。思考中に対局リセットや待ったを行いたい場合は、
  進行中の `search` Promise の結果を破棄する方式で対応する（§フェーズ 2 参照）。

## 1. 第 2 期スコープ

### やること

| # | 項目 | フェーズ |
| --- | --- | --- |
| 1 | `--square-size` を唯一のスケーリングノブにする基盤整備 | 1 |
| 2 | ダークモード対応・CSS トークン整理 | 1 |
| 3 | 新規対局 / 投了 / 待った（undo）/ 強さ・音量設定 のストア基盤 | 2 |
| 4 | 詰み判定（プレイヤー勝ち）を自前で検出 | 2 |
| 5 | モバイル / デスクトップの 2 系統レイアウト | 3 |
| 6 | 背景・盤・駒台・駒のビジュアル作り込み | 4 |
| 7 | 王手表示・最終手ハイライト・駒着手アニメーション・効果音 | 4 |
| 8 | 棋譜表示（▲7六歩 形式） | 5 |
| 9 | localStorage による対局・設定の永続化とリロード復帰 | 6 |
| 10 | メタ情報・favicon・README・アクセシビリティの仕上げ | 7 |

### やらないこと（明示的に対象外）

- **サーバーでのデータ保存**（ユーザー指示により今回は不要）
- 対人戦（オンライン）、駒落ち、先後選択、棋譜ファイル入出力（KIF/CSA）
- 棋譜クリックによる局面巻き戻し（表示のみ。undo は最新手からのみ）
- 打ち歩詰め・千日手・持将棋の**自前**判定（エンジン側は正しく扱う。既知の制限）
- PWA / Service Worker（COOP/COEP と相性が悪く、ローカル検証の主旨から外れる）
- i18n、音声ファイル・画像ファイルの追加

## 2. フェーズ別実装ステップ

各フェーズは独立したコミット単位。**エビデンスを満たすまで次フェーズに進まない**。

### フェーズ 1: `--square-size` を単一スケーリングノブにする

**目的**: レイアウト作業の前提を作る。**見た目を意図的に変えないリファクタ**
（`--square-size: 56px` のままなら現状と同じ表示になること）。

#### 現状の問題（実測）

1. 文字サイズが絶対値。`PieceView.module.css` `.label { font-size: 1.1rem }`、
   `Board.module.css` の座標ラベル `0.85rem`、`Hand.module.css` の `.count { 0.75rem }`。
   `--square-size` を変えても文字は追従しない。
2. `Hand.module.css` の `.slot` に width/height がなく、駒台の駒は
   auto サイズのボタンに対する 88% として解決される（盤の駒と別経路）。
3. `index.css` に `color-scheme: light dark` があるのに、13 個のカスタムプロパティは
   すべてライト固定値で `prefers-color-scheme` ブロックが存在しない。ダークモードでは
   ページ地色と `PromotionDialog` のボタンだけが UA 由来で暗くなり崩れる。
4. `--dialog-bg` が未定義（`var(--dialog-bg, #fff)` のフォールバックで動いている）。
5. `+S` / `+N` / `+L` のラベルが `成銀` `成桂` `成香` の **2 文字**で、1 マスに収まらない。

#### やること

1. **`src/index.css` のトークンを再定義**。派生値はすべて `--square-size` から `calc()` で
   導く。追加・変更するトークン:

   ```css
   :root {
     color-scheme: light dark;

     /* 唯一のスケーリングノブ。レイアウト側で上書きする */
     --square-size: 56px;

     /* 座標ラベル帯の幅/高さ。--square-size からは導出しない（フェーズ 3 の
        --square-size の式がこの値を引くため、導出すると循環参照になる）。
        帯に収まるよう座標フォントには上限を掛ける。 */
     --coord-band: 1.6rem;
     --coord-font-size: min(calc(var(--square-size) * 0.24), 0.9rem);

     /* --square-size から導出する寸法（絶対値を書かない） */
     --piece-font-size: calc(var(--square-size) * 0.5);
     --count-font-size: calc(var(--square-size) * 0.26);
     --board-line-width: max(1px, calc(var(--square-size) * 0.018));
     --board-edge-width: max(2px, calc(var(--square-size) * 0.045));

     /* 色: ライト */
     --page-bg: #e9e2d4;
     --page-bg-accent: #d9cfba;
     --page-text: #241d14;
     --panel-bg: #fffdf7;
     --panel-text: #241d14;
     --panel-border: #c9bda4;
     --board-bg: #dcb35c;
     --board-bg-dark: #c99a41;
     --board-edge: #6b4b23;
     --board-line: #3a2a1a;
     --stand-bg: #c69a5e;
     --stand-edge: #6b4b23;
     --label-color: #4a3c2a;
     --piece-bg: #f0d9a8;
     --piece-bg-dark: #dcbf85;
     --piece-edge: #6b4b23;
     --piece-text: #1a1a1a;
     --count-bg: #fffdf7;
     --count-text: #1a1a1a;
     --highlight-color: #4c9a2a;
     --selected-bg: rgb(106 176 76 / 35%);
     --target-dot: rgb(58 42 26 / 45%);
     --last-move-bg: rgb(214 168 63 / 45%);
     --check-color: #d0342c;
     --error-text: #b00020;
     --dialog-bg: var(--panel-bg);
     --dialog-text: var(--panel-text);
     --focus-ring: #1a73e8;
   }

   @media (prefers-color-scheme: dark) {
     :root {
       --page-bg: #1b1814;
       --page-bg-accent: #241f19;
       --page-text: #ece4d6;
       --panel-bg: #2a251e;
       --panel-text: #ece4d6;
       --panel-border: #4a4137;
       --label-color: #cfc3ad;
       --count-bg: #2a251e;
       --count-text: #ece4d6;
       --focus-ring: #8ab4f8;
     }
   }

   body {
     margin: 0;
     min-height: 100svh;
     background: var(--page-bg);
     color: var(--page-text);
   }
   ```

   **盤・駒・駒台の色はダークモードでも変えない**（木の盤は暗所でも木のまま。UI の枠だけ
   暗くする）。`@media (prefers-reduced-motion: reduce)` は フェーズ 4 で使う。

2. **絶対値の font-size を全廃**。
   - `PieceView.module.css` `.label` → `font-size: var(--piece-font-size)`
   - `Board.module.css` `.fileLabel/.rankLabel/.cornerCell` → `var(--coord-font-size)`、
     さらに座標帯は `--coord-band` を使った固定トラックにする（`auto` をやめる）:
     `grid-template-columns: repeat(9, var(--square-size)) var(--coord-band);`
     `grid-template-rows: var(--coord-band) repeat(9, var(--square-size));`
   - `Hand.module.css` `.count` → `var(--count-font-size)`
   - `.slot` に `width: var(--square-size); height: var(--square-size);` を付与し、
     盤の駒と同一経路でサイズが決まるようにする。

3. **`theme/textTheme.ts` の成駒ラベルを 1 文字に変更**（1 マスに収める）:
   `+S → 全`、`+N → 圭`、`+L → 杏`（`+R → 龍`、`+B → 馬`、`+P → と` は現状のまま）。
   将棋ソフトの慣例表記であり、2 文字ラベルのオーバーフローを根本から除去する。
   棋譜表示（フェーズ 5）は別のラベル表（`成銀` 等）を `domain/notation.ts` に持つ。

4. `PromotionDialog.module.css` の `.dialog button` に明示的な
   `background: var(--panel-bg); color: var(--panel-text); border: 1px solid var(--panel-border);`
   を与える（UA 既定色に依存させない）。

**やらないこと**: レイアウト変更、`@media` によるサイズ切り替え（フェーズ 3）。

**エビデンス**:
- [ ] `index.css` の `--square-size` を一時的に `36px` / `88px` に書き換えて `pnpm dev`
      で目視 — 盤・駒の文字・座標ラベル・駒台の駒・持ち駒バッジが**すべて比例して**
      拡縮する（文字だけ取り残されない）。確認後 `56px` に戻す。
- [ ] `+S` `+N` `+L` を含む局面を一時的に初期局面に差し替えて表示し、成駒ラベルが
      マスから溢れないこと。確認後戻す。
- [ ] macOS のシステム設定でダークモードに切り替え、ページ地色・パネル・成り選択ダイアログの
      ボタンが破綻せず読めること。
- [ ] `pnpm test` / `pnpm check` 通過。

---

### フェーズ 2: 対局ライフサイクルとストア基盤

**目的**: 新規対局・投了・待った・詰み判定・設定を `state/gameStore.ts` に入れる。
**永続化（フェーズ 6）より前に必ずリセット手段を用意する** — 順序を逆にすると、負け局面が
localStorage に固定され、以降のフェーズの手動検証で毎回 localStorage を手で消す必要が出る。

#### やること

1. **import 時副作用の除去**。`gameStore.ts` 末尾の `void init();`（現 209 行）を削除し、
   `startEngine(): Promise<void>` として公開。`App.tsx` の `onMount` で呼ぶ。
   HMR ごとに Worker が再生成される現状の問題も解消する。

2. **`GameState` の拡張**（フィールド名はこの通り）:

   **`MoveRecord` は `src/domain/types.ts` に定義する**（`state` ではなく domain）。
   `positionBefore: Position` を含む domain のデータであり、フェーズ 6 の
   `domain/replay.ts` が返す型でもあるため、ここで domain に置かないと後で
   `gameStore.ts` / `rewind.ts` / `undo.test.ts` を再度触ることになる。

   ```ts
   // domain/types.ts
   interface MoveRecord {
     usi: string;
     move: Move;
     positionBefore: Position; // 棋譜整形と undo に使う
   }

   // state/gameStore.ts
   interface Settings {
     movetimeMs: number;   // 500 | 1000 | 3000 | 8000
     soundEnabled: boolean;
   }

   interface GameState {
     position: Position;
     records: MoveRecord[];        // usiHistory を置き換える。usi は records から導出
     lastMove: { from: Square | null; to: Square } | null;
     selection: Selection | null;
     legalTargets: Square[];
     pendingPromotion: PendingPromotion | null;
     status: GameStatus;
     errorMessage: string | null;
     settings: Settings;
   }
   ```

   `usiHistory: string[]` は削除し、`usiPositionCommand()` は
   `state.records.map((r) => r.usi)` から組み立てる。`records` は undo・棋譜・永続化の
   3 用途を 1 つの配列で満たす（`positionBefore` があるので undo は pop するだけ）。

3. **`GameStatus` を終局理由まで表す**:

   ```ts
   export type GameStatus =
     | "loading"        // エンジン起動中
     | "playerTurn"
     | "thinking"
     | "engineResigned" // プレイヤー勝ち（エンジン投了）
     | "engineMated"    // プレイヤー勝ち（詰ませた）
     | "playerMated"    // プレイヤー負け（詰まされた）
     | "playerResigned" // プレイヤー負け（自分で投了）
     | "engineDeclaredWin" // bestmove win
     | "error";

   export function isGameOver(status: GameStatus): boolean;
   ```

   `GameInfo.tsx` の `STATUS_LABEL` を全メンバー分に更新。

4. **詰み検出をプレイヤー側にも入れる**（現状はエンジンの `resign` 頼み）。
   `applyPlayerMove` の直後、`hasAnyLegalMoves(nextPosition) === false` なら
   `status: "engineMated"` にして `requestEngineMove()` を呼ばない。
   既存 `hasAnyLegalMoves`（`domain/moves.ts`）を再利用する。

5. **新アクション**（すべて `return` するオブジェクトに追加）:
   - `newGame(): void` — `position` を `createInitialPosition()` に、`records`/`lastMove`/
     選択状態をクリア、`engine.newGame()` を送信、`status: "playerTurn"`。
     **思考中でも実行可能**にする（`UsiEngine` に `stop()` が無いため、後述の世代カウンタで
     古い `search` の結果を破棄する）。
   - `resign(): void` — `status: "playerResigned"`。`playerTurn` のときのみ。
   - `undo(): void` — 規則は 1 つだけ。**`plies` 手戻すとき、
     `position = records[records.length - plies].positionBefore`、
     `records = records.slice(0, records.length - plies)`。**
     削除する最初のレコードの `positionBefore` がそのまま復元先なので、
     `applyMove` による再生は不要。
     `plies` は通常 2（プレイヤー手 + エンジン手）。`records` が 1 件だけ
     （プレイヤーの初手のみでエンジン思考中）なら `plies = 1`。0 件なら no-op。
     終局後も実行可能（`status` を `playerTurn` に戻す）。
     `lastMove` は新しい `records` の末尾から再計算する（空なら `null`）。
   - `setSettings(patch: Partial<Settings>): void`

6. **世代カウンタで陳腐化した探索結果を捨てる**。`createGameStore` 内に
   `let generation = 0;` を持ち、`newGame` / `undo` で `generation++`。
   `requestEngineMove` は開始時の値を控え、`await` 後に `generation` が変わっていたら
   結果を**適用せず return** する。これで `stop()` 無しでも安全にリセット・待ったができる。

7. **派生アクセサ**を公開（`createMemo` を使う。`solid-js` から import）:
   - `checkedKingSquare(): Square | null` — 手番側が王手されていれば玉のマス。
     **現在デッドコード（呼び出し 0 件）の `isInCheck`（`domain/position.ts:12`）と
     `findKing`（`domain/moves.ts:212`）を再利用**する。引数の型は実装側の現行
     シグネチャに合わせること（`findKing` は `Board` 型を取る）。
   - `usiMoves(): string[]` — `records` から導出（永続化とエンジン送信で共用）。

8. `MOVETIME_MS` 定数を廃止し `state.settings.movetimeMs` を使う。既定値 1000。

**エビデンス**:
- [ ] Vitest 新規 `src/state/undo.test.ts` — `gameStore` そのものではなく、undo の
      巻き戻しロジックを純関数 `rewind(records: MoveRecord[], plies: number)` として
      `state/` に切り出して単体テスト（2 手戻し・1 手戻し・0 件 no-op・戻した局面の
      SFEN が期待値と一致）。エンジン依存部分はテストしない。
- [ ] 手動: 数手指す → 待った → 盤が 2 手前に戻る → 続けて指せる。
- [ ] 手動: エンジン思考中に「新規対局」→ 盤が初期化され、**遅れて返ってきたエンジンの
      指し手が盤に反映されない**（世代カウンタの検証。DevTools の console.debug で
      `bestmove` が来ていることを確認しつつ盤が動かないこと）。
- [ ] 手動: 投了ボタンで負け表示になり、盤クリックが無効になる。
- [ ] 手動: 1 手詰めを指して `engineMated`（あなたの勝ち）表示になる。
- [ ] `pnpm test` / `pnpm check` 通過。

---

### フェーズ 3: モバイル / デスクトップ 2 系統レイアウト

**目的**: モバイルは**スクロールなしで 1 画面**、デスクトップは盤を大きく取り情報パネルを
横に置く。**コンポーネントを分岐させず、`grid-template-areas` を 2 つ持つ**方式にする
（盤は両モードで正方形。動くのは駒台と情報パネルの配置だけ）。

#### やること

1. `src/App.css`（グローバル）を削除し、`src/components/Layout/Layout.module.css` +
   `Layout.tsx` を新設。`App.tsx` は `<Layout>` にスロット（props で JSX を受ける）を
   渡すだけにする。名前付きスロット props: `info` / `opponentHand` / `board` /
   `ownHand` / `controls` / `kifu`。

2. **モバイル（既定 = mobile-first、`@media (max-width: 47.9375rem)` 側を素の状態にする）**

   縦積み。行構成と `--square-size` の算出:

   ```css
   .layout {
     --gap: 0.4rem;
     --info-height: 2.75rem;
     --controls-height: 3rem;
     /* 縦方向で --square-size に比例する行:
        盤 9 + 座標帯 0.5 + 駒台 1.5 × 2 = 12.5 */
     --vertical-fixed: calc(
       var(--info-height) + var(--controls-height) + var(--gap) * 4 + 1rem
     );
     --square-size: min(
       calc((100vw - 1rem - var(--coord-band)) / 9),
       calc((100svh - var(--vertical-fixed)) / 12.5),
       64px
     );

     display: grid;
     grid-template-areas:
       "info"
       "opponentHand"
       "board"
       "ownHand"
       "controls";
     justify-items: center;
     gap: var(--gap);
     padding: 0.5rem;
     padding-bottom: max(0.5rem, env(safe-area-inset-bottom));
     min-height: 100svh;
     align-content: center;
   }
   ```

   - `--coord-band` は固定値（1.6rem）なので、この式に入れても循環参照にならず、
     **予約した幅と実際の帯の幅が常に一致する**。`--square-size` から導出した値を
     `--square-size` の式に入れてはいけない。
   - モバイルの駒台は横一列（`flex-wrap: nowrap; overflow-x: auto;` は使わず、
     持ち駒 7 種 × 幅を `--square-size * 0.8` に縮めて必ず収める → `Hand` に
     `compact` フラグ props ではなく **CSS カスタムプロパティ `--hand-piece-scale`** で
     制御する。モバイル 0.8、デスクトップ 1.0）。
   - 棋譜（`kifu` スロット）はモバイルでは `grid-area` を持たず、`controls` 内の
     ボタンで開く**ボトムシート**（`@kobalte/core` の `Dialog` を position: fixed;
     bottom: 0 でスタイルして流用）に入れる。

3. **デスクトップ（`@media (min-width: 48rem)`）**

   ```css
   @media (min-width: 48rem) {
     .layout {
       --gap: 1rem;
       --square-size: min(
         calc((100svh - 8rem) / 10),
         calc((100vw - 22rem) / 12),
         96px
       );
       grid-template-columns: auto auto auto minmax(16rem, 22rem);
       grid-template-rows: auto 1fr;
       grid-template-areas:
         "info         info  info     kifu"
         "opponentHand board ownHand  kifu";
       align-items: center;
       justify-content: center;
       padding: 1.5rem;
     }
     .opponentHand { align-self: start; }
     .ownHand      { align-self: end; }
     .controls     { grid-area: kifu; align-self: end; } /* 棋譜パネル下部に配置 */
   }
   ```

   - **後手駒台を盤の左上、先手（自分）駒台を盤の右下**に置く（一般的な将棋ソフトの配置）。
     デスクトップの駒台は縦 1 列（`flex-direction: column`）。
   - 棋譜は右カラムに常設（シートではない）。操作ボタンはその下。
   - 上限 96px により 1440×900 でも盤が約 864px になり「小さすぎる」問題が解消する。

4. `Hand.tsx` に `orientation` は持たせず、CSS 側（`Layout.module.css` から
   `:global` ではなく Hand 側に `--hand-direction` トークン）で切り替える。
   **`Hand.tsx` の TSX 変更は最小限**にとどめる。

5. モバイル操作性: `.square` / `.slot` の実効タップ領域は `--square-size` に等しい。
   360px 幅端末での `--square-size` は約 (360-16-25.6)/9 ≈ 35px。これは小さいので
   **タップ精度の補助として、選択中は合法手マスの当たり判定を広げない代わりに、
   選択した駒を 1.15 倍に拡大表示**して誤タップを気づきやすくする（CSS のみ）。

**エビデンス**:
- [ ] `pnpm dev` + Chrome DevTools デバイスエミュレーション **390×844**（iPhone 14）と
      **430×932**（iPhone 15 Pro Max）と **360×740**（小型 Android）で、
      **縦横どちらのスクロールバーも出ない**こと。盤・両駒台・状態表示・操作ボタンが
      すべて見えていること。
- [ ] 同エミュレーションで横向き（844×390）にしても破綻しない（盤が縦に収まる）。
- [ ] `--square-size` が上限（モバイル 64px / デスクトップ 96px）に張り付く画面サイズで、
      DevTools の Elements で座標ラベル帯の実測幅が `--coord-band`（1.6rem = 25.6px）と
      一致し、盤全体の幅が式で予約した幅を超えていないこと。
- [ ] **1440×900** と **1920×1080** で盤の 1 マスが 80px 以上あり、右に棋譜パネルが
      並ぶこと。ウィンドウ幅を 1440 → 700px にゆっくり縮めて、48rem 境界で
      レイアウトが切り替わり、途中のどの幅でも横スクロールが出ないこと。
- [ ] `pnpm check` 通過。

---

### フェーズ 4: ビジュアルとフィードバックの作り込み

**目的**: 「盤しかない」状態から、背景・駒台・駒の質感・手番の視覚表現までを整える。
**画像アセットは追加せず CSS のみ**。

#### やること

1. **ページ背景**（`Layout.module.css`）。畳/和室を想起させる控えめな背景:
   ベースの `--page-bg` に `repeating-linear-gradient` で細い織り目、さらに
   `radial-gradient` の大きなビネットを重ねる。`background-attachment: fixed` は
   モバイルで重いので使わない。

2. **盤の質感**（`Board.module.css`）:
   - 罫線の二重化バグを修正。現状は各 `.square` が `border: 1px` を持ち隣接で 2px に
     見えている。**`.board` の 9×9 部分を `gap: var(--board-line-width)` +
     `background: var(--board-line)` にし、`.square` は `border: none` +
     `background: var(--board-bg)`** に変更する（罫線は隙間から見える地色）。
     座標帯セルの背景は透明にする。
   - 盤面に木目の `linear-gradient` と、`box-shadow: 0 calc(var(--square-size)*0.12)
     calc(var(--square-size)*0.3) rgb(0 0 0 / 35%)` で厚み・浮きを表現。
   - **星（花形）**を 4 箇所（file 3/7 × rank 4/6 の交点）に `::after` の小円で描く。
     実装は交点なので、対象 4 マスの右上コーナーに絶対配置した疑似要素として置き、
     `translate(-50%, -50%)` でずらす。file/rank から対象マスを判定するのは `Board.tsx`
     側で class を付ける（`styles.starPoint`）。座標規約に従い判定式を間違えないこと。
   - `:hover` / `:focus-visible` を追加（`--focus-ring` を使う。`outline-offset` で内側に）。

3. **駒台**（`Hand.module.css`）:
   - **常に見える面にする**（これが「撮った駒を置くスペースがない」の実体。コンポーネント
     自体は既にあるが `background: none` で不可視だった）。
     `background: var(--stand-bg)` + 木目グラデーション + `border: var(--board-edge-width)
     solid var(--stand-edge)` + 内側の `inset` シャドウ + `border-radius`。
   - 持ち駒 0 でも面が見えるよう `min-height`（デスクトップは `min-width`）を確保。
   - 手番側の駒台に淡いリング（`--highlight-color`）を出して手番を可視化。
   - 「☖後手」「☗先手」のラベルを駒台に付ける（`Hand.tsx` に `label` を追加）。

4. **駒の見た目**（`PieceView.tsx` / `.module.css`）:
   - 現状 `clip-path` と `border` が同一要素にあり **枠線が肩の斜辺で切り落とされている**。
     2 要素構成に変更: 外側 `.shape`（`background: var(--piece-edge)` + clip-path）、
     内側 `.face`（`clip-path` 同形、`inset` で数 % 小さく、`background:
     linear-gradient(var(--piece-bg), var(--piece-bg-dark))`）。これで五角形の縁が出る。
   - `filter: drop-shadow(0 1px 1px rgb(0 0 0 / 30%))` で浮き。
   - `kind: "image"` 分岐と `theme/types.ts` の `PieceTheme` は**そのまま維持**（将来の
     画像テーマ差し替え口）。

5. **フィードバック 3 種**:
   - **最終手ハイライト**: `state.lastMove` の from/to マスに `--last-move-bg`。
     from は薄く、to は濃く。
   - **王手表示**: `checkedKingSquare()` のマスに脈動する `--check-color` のリング。
     `GameInfo` にも「王手」を表示。
   - **合法手マーカー**: 現状の `inset box-shadow` リングを、
     **空きマスは中央の小円（`--target-dot`）／敵駒があるマスは外周リング**に変える
     （将棋ソフトの慣例。空きと取りが一目で区別できる）。

6. **アニメーション**（`prefers-reduced-motion` を必ず尊重）:
   - 駒は各マスの子要素なので**滑るスライドは行わない**（絶対配置オーバーレイへの
     大改修が必要で費用対効果が悪い）。代わりに **着手マスの駒に「置いた」感の
     keyframes**（`scale(1.25) → 1` + わずかな `translateY`、120ms）と、
     **最終手マスの一瞬のフラッシュ**を入れる。SolidJS では `<Show>` の再生成に頼らず、
     `lastMove` が変わったときに CSS animation を再実行させるため、
     `animation-name` を付けた要素に `lastMove` をキーにした `key` 相当の再マウントを
     `<Show keyed>` で行う。
   - 選択中の駒: `transform: scale(1.15)` + `transition: transform 80ms`。
   - 終局時: 結果表示を `fade-in` + わずかな `scale`。

   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       animation-duration: 0.01ms !important;
       animation-iteration-count: 1 !important;
       transition-duration: 0.01ms !important;
     }
   }
   ```

7. **効果音**（`src/audio/sfx.ts` を新設。**音声ファイルは追加せず Web Audio API で生成**）:
   - `export function playPieceSound(kind: "move" | "capture" | "drop"): void`
   - `AudioContext` は**最初のユーザー操作で遅延生成**する（自動再生ポリシー対策）。
     `ensureAudioContext()` を `selectSquare` 経由の最初のクリックで呼ぶ。
   - 音の作り方: 短いノイズバースト（`AudioBuffer` にホワイトノイズを書き込み）+
     `BiquadFilterNode`（bandpass 800〜2500Hz）+ `GainNode` の指数減衰（約 80ms）で
     木の駒を打つ「パチッ」を合成。`capture` は少し低く長く、`drop` は少し高く。
   - `state.settings.soundEnabled === false` のときは何もしない。操作パネルに
     ミュートトグル（`lucide-solid` の `Volume2` / `VolumeX`）。
   - 呼び出し箇所は `gameStore` ではなく **`App.tsx` / `Layout` 側の `createEffect`**
     に置く（`state` レイヤーを DOM/Web API から独立に保つため。`records.length` の変化を
     監視して、増えたら最後の `MoveRecord` の種類に応じて鳴らす）。

8. **操作パネル**（`components/Controls/Controls.tsx` を新設）:
   新規対局 / 待った / 投了 / 音量トグル / 強さ（思考時間）セレクト / 棋譜（モバイルのみ）。
   アイコンは `lucide-solid`（既存依存、現状未使用）。投了と新規対局は
   `@kobalte/core` の `AlertDialog` で確認を取る。

**エビデンス**:
- [ ] 手動（390×844 と 1440×900 の両方）: 駒台が空でも木の面として見え、手番側に
      リングが出る。背景が盤の外にある。駒に縁と影がある。星が 4 点ある。
- [ ] 手動: 駒を選ぶ → 空きマスに小円、敵駒に外周リングが出る。移動すると着手マスで
      「置いた」アニメーションと音が鳴る。取ったときは音が違う。
- [ ] 手動: 王手をかけられた状態で自玉にリングが出て `GameInfo` に「王手」が出る。
- [ ] 手動: ミュートトグルで無音になる。ページ読み込み直後の 1 手目でも音が鳴る
      （AudioContext の遅延生成が効いている）。
- [ ] 手動: OS の「視差効果を減らす」を ON にするとアニメーションが止まるが操作はできる。
- [ ] `pnpm check` 通過。

---

### フェーズ 5: 棋譜表示

**目的**: `records` を日本語棋譜として表示する。**表示専用**（クリックでの巻き戻しはしない）。

#### やること

1. **`src/domain/notation.ts` を新設**（純 TypeScript。DOM 非依存でテスト容易）:

   ```ts
   /** Formats a move in Japanese kifu notation, e.g. "▲7六歩", "△2二角成", "▲5五歩打". */
   export function formatMove(positionBefore: Position, move: Move): string;
   ```
   - 手番記号: `black → "▲"` / `white → "△"`。
   - 筋はアラビア数字（1〜9）、段は漢数字（一〜九）。
   - 駒名は `成銀` `成桂` `成香` `竜` `馬` `と` を含む専用テーブル（盤上表示の
     1 文字ラベルとは別物）。玉は後手のみ `玉`、先手は `王`（`textTheme` と同じ規則）。
   - 成る手は末尾 `成`、成れるのに成らなかった手は `不成`（`canPromote` を再利用して
     判定 — 現在 `moves.ts` 内部専用になっている既存 export をここで初めて外部利用する）。
   - 駒打ちは末尾 `打`。
   - **`同` は実装しない**（前手と同じマスでも通常表記。単純さ優先。既知の簡略化として
     本書に記録する）。

2. **`src/components/Kifu/KifuList.tsx`** を新設。`records` を `<ol>` で表示。
   - 各行 `1 ▲7六歩` の形式（手数 + 棋譜）。
   - 最新手をハイライトし、`createEffect` で末尾へ自動スクロール。
   - パネルは `--panel-bg` / `--panel-border` を使う。デスクトップは右カラムに常設、
     モバイルはボトムシート（フェーズ 3 で用意）。
   - 高さは `min-height: 0` + `overflow-y: auto` でグリッド内に閉じ込める
     （親の高さを押し広げてモバイルのノースクロール条件を壊さないこと）。

**エビデンス**:
- [ ] Vitest `src/domain/notation.test.ts` — 既存 3 テストファイルと同じ **SFEN から局面を
      組む** パターンに従い、少なくとも: 通常の歩の移動、成る手（`成`）、成れるが
      成らない手（`不成`）、駒打ち（`打`）、後手の手（`△`）、成駒の移動（`と`・`竜`）、
      玉の手（先手 `王` / 後手 `玉`）を検証。
- [ ] 手動: 10 手ほど進めて棋譜が正しい順序・正しい表記で並び、最新手までスクロールする。
- [ ] 手動: 待った後に棋譜からも 2 手消える。
- [ ] 手動（390×844）: 棋譜シートを開いて閉じても盤レイアウトが崩れない／
      スクロールバーが出ない。
- [ ] `pnpm test` / `pnpm check` 通過。

---

### フェーズ 6: localStorage 永続化とリロード復帰

**目的**: リロードしても対局と設定が続く。**保存するのは `Position` ではなく USI 手列**
（`usiToMove` + `applyMove` で再生することで自己検証になり、エンジンに送る文字列と同一）。

#### やること

1. **`src/state/storage.ts` を新設**。localStorage アクセスと**純粋な検証/整形を分離**する
   （`tsconfig.app.json` は `strict: true` を設定していないため、`JSON.parse` 境界は
   型に頼らず**実行時検証**すること。strict の有効化は影響が広いので今回はしない）:

   ```ts
   const GAME_KEY = "web-shogi:game";
   const SETTINGS_KEY = "web-shogi:settings";
   const SCHEMA_VERSION = 1;

   interface SavedGame { version: number; usiMoves: string[]; savedAt: string; }

   /** Pure: validates a raw JSON string. Returns null when unusable. */
   export function parseSavedGame(raw: string | null): string[] | null;
   /** Pure: validates settings JSON. Returns null when unusable. */
   export function parseSavedSettings(raw: string | null): Partial<Settings> | null;

   export function loadGame(): string[] | null;
   export function saveGame(usiMoves: string[]): void;
   export function clearGame(): void;
   export function loadSettings(): Partial<Settings> | null;
   export function saveSettings(settings: Settings): void;
   ```
   - USI 文字列の形式検証は正規表現
     `/^(?:[1-9][a-i][1-9][a-i]\+?|[PLNSGBR]\*[1-9][a-i])$/`。
   - `version !== SCHEMA_VERSION`、非配列、要素が文字列でない、正規表現不一致は
     すべて `null`。localStorage 例外（プライベートモード等）は `try/catch` で握って
     `null` / no-op（**アプリを落とさない**）。

2. **`src/domain/replay.ts` を新設**（純関数。domain に置く）:

   ```ts
   /** Replays USI moves from the initial position. Returns null on any illegal move. */
   export function replayUsiMoves(usiMoves: string[]):
     | { position: Position; records: MoveRecord[] }
     | null;
   ```
   各手について `generateLegalMoves` に含まれることを確認してから `applyMove` する
   （壊れた/改変された localStorage で不正局面を作らない）。`MoveRecord` は
   フェーズ 2 で `domain/types.ts` に定義済みのものを再利用する（依存方向を守る）。

3. **`gameStore` の復帰処理**。`startEngine()` 内、`engine.launch()` 成功後に:
   - `loadSettings()` を `state.settings` にマージ。
   - `loadGame()` → `replayUsiMoves()`。成功したら `position` / `records` /
     `lastMove` を復元。失敗（`null`）なら `clearGame()` して初期局面。
   - 復元後 `hasAnyLegalMoves` が false なら終局ステータスへ。
   - 復元後の手番が後手（エンジン側）なら、`engine.newGame()` の後に
     `requestEngineMove()` を呼んで続行する。

4. **保存タイミング**: `records` が変わるすべての箇所（`applyPlayerMove` /
   `requestEngineMove` の成功時 / `undo` / `newGame`）で `saveGame(usiMoves())` を呼ぶ。
   `newGame` は `clearGame()` でも良いが、**空配列を保存する方が分岐が減る**ので
   `saveGame([])` で統一する。`setSettings` では `saveSettings`。
   実装は `createEffect(on(() => state.records.length, ...))` ではなく**アクション内で
   明示的に呼ぶ**（保存タイミングを追跡可能にする）。

5. 終局ステータスは保存しない（`records` から再判定できる。ただし**投了は再現できない**
   ので、`SavedGame` に `resigned?: "player"` を持たせて復元する）。

**エビデンス**:
- [ ] Vitest `src/state/storage.test.ts` — `parseSavedGame` の純関数テスト:
      正常系、`version` 不一致、`null` 入力、不正 JSON、配列でない、要素が数値、
      USI 形式違反（`7g7z` 等）がすべて `null`。
- [ ] Vitest `src/domain/replay.test.ts` — 正しい手列で期待 SFEN に到達、
      途中に不正手（合法手でない `1a1b` 等）を混ぜると `null`。
- [ ] 手動: 5 手指してリロード → 同じ局面・同じ棋譜が復元される。
- [ ] 手動: プレイヤーが指した直後（エンジン思考中）にリロード → 復元後にエンジンが
      自動で指し始める。
- [ ] 手動: DevTools で `localStorage` の `web-shogi:game` を壊す（`usiMoves` に
      `"zzzz"` を混ぜる）→ リロードしてもクラッシュせず初期局面で始まる。
- [ ] 手動: 音量・強さ設定を変えてリロードすると保持される。
- [ ] 手動: 「新規対局」→ リロード → 初期局面のまま（保存が更新されている）。
- [ ] `pnpm test` / `pnpm check` 通過。

---

### フェーズ 7: 仕上げ（メタ情報・アクセシビリティ・ドキュメント）

**目的**: テンプレート残骸の除去と、キーボード/スクリーンリーダー対応の最低線。

#### やること

1. **`index.html`**: `<html lang="ja">`（現在 `en` で中身は全て日本語）、
   `<title>将棋 — web-shogi</title>`、`<meta name="description">`、
   `<meta name="theme-color" content="#dcb35c">`（ダーク用に `media` 付きで 2 つ）、
   `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`。
2. **`public/favicon.svg`** を Vite/Solid テンプレートの紫ロゴから、五角形の駒に「王」の
   SVG に差し替える（インライン SVG で自作。外部アセット不要）。
3. **`README.md`** をテンプレート文面から web-shogi の説明に書き換える（**英語**）。
   含める内容: 概要、`pnpm dev/test/check/build`、COOP/COEP が必要な理由と本番ホスティング
   での設定、`public/engine/` に wasm をベンダリングしている理由、GPL-3.0 の注意、
   既知の制限（打ち歩詰め・千日手・持将棋の自前判定なし、棋譜の `同` 表記なし、
   先手固定、サーバー保存なし）。
   **`README.md` の「Vitest (jsdom environment)」という記述は誤り**（`vitest.config` が
   無く実際は node 環境）。node と書き直す。
4. **アクセシビリティ**:
   - `Board` の各 `<button>` に `aria-label`（例 `7六 先手 歩` / `5五 空`）。
   - `Hand` のスロットに `aria-label`（例 `持ち駒 歩 2枚`）。
   - `GameInfo` に `aria-live="polite"`（手番・王手・終局が読まれる）。
   - `PromotionDialog` を **`@kobalte/core` の `Dialog`** に置き換え（フォーカストラップ・
     Escape・`role="dialog"`・`aria-modal` を自前実装しない）。既存依存の初回利用。
   - `:focus-visible` のリングを盤・駒台・ボタンに（`--focus-ring`）。
   - 盤の矢印キー移動は**対象外**（クリック/タップと Tab で到達可能なら最低線は満たす）。
5. **不要物の整理**: `src/App.css` を削除（フェーズ 3 で `Layout.module.css` に移行済み）。
   `jsdom` は使っていないので `package.json` から削除するか、コンポーネントテストを
   入れないなら残さない。**それ以外の未使用 export（`positionToSfen` 等）は
   テストで使っているので触らない。**

**エビデンス**:
- [ ] `pnpm build && pnpm preview` で本番ビルドが動作し、`crossOriginIsolated === true`、
      対局が最後まで通せる。
- [ ] Chrome DevTools の Lighthouse（Accessibility）を Mobile で実行し、
      盤・駒台・ボタンに関する critical な指摘がないこと。
- [ ] VoiceOver（macOS）で Tab 移動し、マスと持ち駒が読み上げられ、手番変化が
      アナウンスされる。
- [ ] 成り選択ダイアログが Escape で閉じ、Tab がダイアログ内に留まる。
- [ ] `pnpm test` / `pnpm check` / `pnpm build` すべて通過。

## 3. 変更・新規ファイル一覧

```
変更:
  index.html                  メタ情報・lang・viewport
  README.md                   テンプレート文面 → web-shogi の説明（英語）
  public/favicon.svg          駒アイコンに差し替え
  src/index.css               トークン再定義・ダークモード・body 背景
  src/App.tsx                 Layout へのスロット渡し + onMount で startEngine
  src/state/gameStore.ts      records/lastMove/settings、newGame/resign/undo、世代カウンタ
  src/theme/textTheme.ts      成駒ラベルを 1 文字化（全・圭・杏）
  src/components/Board/*      罫線方式・星・hover/focus・ハイライト 3 種・aria-label
  src/components/Hand/*       可視な駒台・ラベル・スロット寸法・aria-label
  src/components/GameInfo/*   終局理由 9 状態・王手表示・aria-live
  src/components/PromotionDialog/*  Kobalte Dialog へ置換

新規:
  src/components/Layout/Layout.tsx + .module.css    2 系統レイアウト（grid-template-areas）
  src/components/Controls/Controls.tsx + .module.css 新規対局/待った/投了/音量/強さ/棋譜
  src/components/Kifu/KifuList.tsx + .module.css     棋譜一覧
  src/domain/notation.ts + notation.test.ts          ▲7六歩 形式の整形
  src/domain/replay.ts + replay.test.ts              USI 手列の再生（永続化復帰用）
  src/state/storage.ts + storage.test.ts             localStorage + 実行時検証
  src/state/rewind.ts + undo.test.ts                 undo の純粋ロジック
  src/audio/sfx.ts                                   Web Audio による効果音生成

削除:
  src/App.css                 → Layout.module.css へ
```

## 4. 既知のリスクと対処

| リスク | 対処 |
| --- | --- |
| `--square-size` の `calc` が循環参照になる／予約幅と実幅がずれる | `--coord-band` を固定 1.6rem にして予約と実体を同一トークンにする。`--square-size` から導出した値を `--square-size` の式に入れない |
| モバイルで 1 画面に収まらない（フェーズ 3 の係数がずれる） | 390/430/360 の実測で `--vertical-fixed` と `12.5` の係数を調整する。**係数の調整はフェーズ 3 の作業に含まれる**（後回しにしない） |
| `search` に `stop()` が無いため待った/新規対局で古い bestmove が混入 | 世代カウンタで `await` 後に破棄（フェーズ 2） |
| 壊れた localStorage で不正局面 | `replayUsiMoves` が `generateLegalMoves` で 1 手ずつ検証し、失敗時は `clearGame()` |
| Web Audio の自動再生ブロック | `AudioContext` を最初のユーザー操作で生成する |
| アニメーションで酔う/低速端末 | `prefers-reduced-motion` を必ず尊重。スライドは実装せず着手アニメのみ |
| `state` レイヤーが Web API に依存して純粋性を失う | 音は `App`/`Layout` の `createEffect`、localStorage は `state/storage.ts` に隔離 |

## 5. Claude Code への引き継ぎインプット

次の指示をそのまま Claude Code に渡して実装を開始する:

```
spec/plan.md を読んで、web-shogi の第 2 期改善をフェーズ 1 から実装してください。

ルール:
- spec/plan.md の §0 座標規約・依存方向（components → state → domain / engine）に従うこと。
  逸脱が必要になったら理由を説明して確認を取ること
- 1 フェーズ = 1 コミット。各フェーズの「エビデンス」を全て満たしてから次へ進むこと
- 検証: pnpm test / pnpm check を各フェーズ完了時に実行。
  UI の目視確認が必要な項目は、確認手順を提示して私に依頼すること
- コード・コメント・コミットメッセージ・README は英語。UI 表示テキストは日本語
- 画像・音声アセットは追加しない（CSS と Web Audio で表現する）
- 新規 npm 依存は追加しない（@kobalte/core と lucide-solid は既存依存なので使ってよい）

まずフェーズ 1（--square-size を単一スケーリングノブにする + ダークモード対応）から。
```

フェーズ 3 以降を別セッションで再開する場合も、同じ形式で
「spec/plan.md のフェーズ 3 から」と指定すればよい。

---

## 検証方法（本計画全体）

1. **各フェーズ**: `pnpm test` と `pnpm check` を実行。新規の純関数（`notation.ts`、
   `replay.ts`、`storage.ts` の parse、`rewind.ts`）には Vitest を追加する。既存 3 テスト
   ファイル（`src/domain/*.test.ts`）の **SFEN から局面を組むパターン**に倣う。
2. **レスポンシブ**: `pnpm dev` + Chrome DevTools デバイスエミュレーションで
   **390×844 / 430×932 / 360×740 / 844×390（横）/ 1440×900 / 1920×1080** を確認。
   モバイルでは縦横どちらのスクロールバーも出ないことが合否基準。
   `run` skill / `claude-in-chrome` skill でスクリーンショットを取って比較してよい。
3. **通し対局**: `pnpm build && pnpm preview` で 1 局を投了/詰みまで通す。途中で
   リロード・待った・新規対局・投了を各 1 回試す。
4. **ダークモード**: macOS のシステム設定で切り替えて両モードを目視。
5. **アクセシビリティ**: Lighthouse (Accessibility, Mobile) + VoiceOver で Tab 走査。
