# web-shogi 実装計画書

ブラウザで動作する将棋ゲーム（人間 vs AI）の詳細実装計画。
実装は Claude Code が本書に従って自律的に行う。

- **この文書は日本語**（開発時の計画メモ扱い）。ただし CLAUDE.md の規約により、
  **コード・コメント・コミットメッセージ・console 出力はすべて英語**で書くこと。
- 検証コマンド: `pnpm dev` / `pnpm test` / `pnpm check`（Biome + tsc）。
  各フェーズ完了時に `pnpm test` と `pnpm check` が通っていることが最低条件。

## 0. 前提（確認済みの環境）

| 項目 | 内容 |
| --- | --- |
| フレームワーク | SolidJS 1.9 + Vite 8 + TypeScript 6.0（strict 相当、`verbatimModuleSyntax` 有効） |
| スタイリング | CSS Modules（lightningcss）。UI ライブラリ依存は最小限に |
| テスト | Vitest 4（導入済み、テストはまだ 0 件） |
| Lint/Format | Biome（lefthook で pre-commit 実行） |
| パッケージ管理 | pnpm 11 / Node 24 |
| 思考エンジン | `@mizarjp/yaneuraou.k-p`（npm 公開済み、v7.6.3-alpha.0、NNUE K-P・水匠 Petite 評価関数内蔵） |

現状の `src/` はテンプレートのカウンターサンプルのみ。すべて置き換えてよい。

**注意（ライセンス）**: `@mizarjp/yaneuraou.k-p` は GPL-3.0。本アプリを公開配布する場合は
プロジェクト全体のライセンスを GPL 互換にする必要がある。実装作業には影響しない。

## 1. スコープ

### v1 でやること
- 平手・人間（先手固定）vs YaneuraOu（後手）の 1 局対局
- 合法手判定: 駒の動き、駒打ち（二歩・行き所のない駒の禁止）、成り（任意成り/強制成り）、
  自玉を王手に晒す手の禁止
- 終局: 詰み（合法手なし）、エンジンの `bestmove resign` / `bestmove win`
- 駒画像・盤面デザインを後から差し替え可能なテーマ構造

### v1 でやらないこと（理由: 対局成立に不要で、後付け可能）
- 打ち歩詰め・千日手・持将棋の判定（エンジン側は正しく扱うため実害は限定的。既知の制限として記録）
- 待った、棋譜保存、駒落ち、先後選択、強さ選択 UI、対人戦

## 2. 全体アーキテクチャと理由

### 2.1 レイヤー構成

```
┌─ components/  SolidJS コンポーネント（DOM + CSS Grid、表示とクリック入力のみ）
├─ state/       ゲーム状態ストア（createStore。UI とエンジンを結ぶ唯一の司令塔）
├─ domain/      将棋ルール（純 TypeScript。SolidJS・DOM に一切依存しない）
└─ engine/      Web Worker + USI クライアント（YaneuraOu.wasm を隔離）
```

**理由**:
- `domain` を framework-free にすることで、合法手判定・SFEN 変換という最もバグりやすい
  部分を Vitest（node 環境、jsdom 不要）で高速・網羅的に検証できる。
- UI は「ストアを表示し、クリックをアクションとして投げる」だけの薄い層に保つ。
  後述のテーマ差し替えが CSS とテーマ定義の変更だけで完結する。
- `state/gameStore.ts` だけが domain と engine の両方を知る。依存方向は
  `components → state → domain / engine` の一方向。循環参照を作らないこと。

### 2.2 局面の正準表現

内部状態は独自の `Position` 型（後述 §4）で持ち、SFEN/USI 文字列との相互変換を
`domain/sfen.ts` の 1 ファイルに閉じ込める。

**理由**: エンジンとの通信は USI（テキスト）だが、UI と合法手判定は構造化データが必要。
変換ロジックを 1 箇所に集約すれば、座標系の取り違え（将棋特有の「筋は右から左」）による
バグの発生源を局所化でき、往復テスト（parse ↔ serialize）で正しさを機械的に保証できる。

### 2.3 エンジン通信（USI over Web Worker）

```
gameStore ──(Promise API)── UsiEngine ──(postMessage)── engine.worker.ts ── YaneuraOu.wasm
   メインスレッド                              │              Worker スレッド
                                    型付きメッセージ:
                                    main→worker: { type: "init" } | { type: "send", line: string }
                                    worker→main: { type: "ready" } | { type: "line", line: string }
                                                 | { type: "error", message: string }
```

- `engine.worker.ts`（Worker 側）: `const engine = await YaneuraOu_K_P();` でモジュールを
  初期化し、`engine.addMessageListener` で受けた USI 出力行をそのまま `{ type: "line" }` で
  メインへ転送、メインからの `{ type: "send" }` を `engine.postMessage(line)` へ渡すだけの
  素通し層。ロジックを持たせない。
- `UsiEngine` クラス（メイン側）: USI プロトコルの状態を管理し、Promise API を公開する。
  - `launch(): Promise<void>` — Worker 生成 → `usi`→`usiok` → `isready`→`readyok` まで
  - `newGame(): void` — `usinewgame` 送信
  - `search(usiPosition: string, movetimeMs: number): Promise<string>` —
    `position ...` と `go movetime ...` を送り、`bestmove xxx` 受信で resolve（`info` 行は無視）
  - すべての送受信行を `console.debug` にログする（デバッグの生命線）

**理由**: wasm の初期化と探索はブロッキング処理であり、メインスレッドで動かすと UI が
固まる。また UI 側を「Promise を await するだけ」にすることで、フェーズ 4 の結合が
`const bestmove = await engine.search(...)` の 1 行に単純化される。USI の逐次テキスト
処理という厄介さを `UsiEngine` の内側に完全に封じ込めるのが狙い。

### 2.4 COOP/COEP（SharedArrayBuffer 要件）

YaneuraOu.wasm は WebAssembly Threads（SharedArrayBuffer）を使うため、トップレベル
レスポンスに以下のヘッダーが必須（パッケージ README に明記あり）:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

`vite.config.ts` の `server.headers` と `preview.headers` の両方に設定する。
本番ホスティング（Netlify/Cloudflare Pages 等）でも同ヘッダーの設定が必要な点を
README に注記すること。動作確認は DevTools コンソールで `crossOriginIsolated === true`。

**注意**: このヘッダー下では外部オリジンのリソース読み込みが制限される。本プロジェクトは
アセットをすべて同梱する方針なので問題にならないが、CDN 参照は追加しないこと。

## 3. ディレクトリ構造・ファイル配置

```
src/
  domain/
    types.ts        # PieceType, Color, Square, Piece, Move, Position, Hand
    position.ts     # createInitialPosition(), applyMove(), isInCheck()
    moves.ts        # generateLegalMoves(), canPromote(), mustPromote()
    sfen.ts         # positionToSfen(), parseSfen(), moveToUsi(), usiToMove()
  engine/
    messages.ts     # main↔worker のメッセージ型定義（判別可能ユニオン）
    usiEngine.ts    # UsiEngine クラス（§2.3 の Promise API）
    engine.worker.ts # Worker エントリ。wasm 初期化と行の素通しのみ
  state/
    gameStore.ts    # createStore によるゲーム状態 + アクション（唯一の司令塔）
  components/
    Board/
      Board.tsx / Board.module.css      # 9x9 CSS Grid、マス目、座標ラベル
      PieceView.tsx                     # 1 駒の表示（テーマ参照。後手駒は 180 度回転）
    Hand/
      Hand.tsx / Hand.module.css        # 駒台（先手用・後手用を同一コンポーネントで）
    PromotionDialog/
      PromotionDialog.tsx / .module.css # 成る/成らない の選択
    GameInfo/
      GameInfo.tsx / .module.css        # 手番表示、思考中インジケーター、終局表示
  theme/
    types.ts        # PieceTheme / BoardTheme インターフェース
    textTheme.ts    # デフォルト: 漢字テキスト駒テーマ
  App.tsx           # レイアウト（盤 + 両駒台 + GameInfo）
  index.tsx / index.css                 # エントリ（CSS カスタムプロパティの既定値）
```

**理由**: 「1 ファイル 1 責務」を徹底し、Claude Code が各フェーズで触るファイルを
明確に限定するため。`domain/` はフェーズ 1〜2、`engine/` はフェーズ 3、`state/` と
結合はフェーズ 4、と作業領域がフェーズに対応する。

## 4. ドメインモデル（型の骨子）

実装時はこの骨子に従う（フィールド名は変えない。必要な追加は可）:

```ts
type Color = "black" | "white"; // black = 先手(Sente), white = 後手(Gote)
type PieceType =
  | "K" | "R" | "B" | "G" | "S" | "N" | "L" | "P"          // king..pawn
  | "+R" | "+B" | "+S" | "+N" | "+L" | "+P";               // promoted

interface Square { file: number; rank: number; }  // file: 1-9 (right to left), rank: 1-9 (top to bottom)
interface Piece { type: PieceType; color: Color; }

type Move =
  | { kind: "move"; from: Square; to: Square; promote: boolean }
  | { kind: "drop"; piece: PieceType; to: Square };

interface Position {
  board: (Piece | null)[];        // 81 cells, index = (rank - 1) * 9 + (9 - file)
  hands: Record<Color, Partial<Record<PieceType, number>>>; // unpromoted types only
  sideToMove: Color;
  moveNumber: number;             // 1 始まり（SFEN 第 4 フィールドと一致させる）
}
```

座標規約（バグの最多発生源なので厳守）:
- `rank` は上（後手陣）から 1〜9。USI の段字母 `a`〜`i` に対応（`a`=1）。
- `file` は右から 1〜9。盤を左→右に描画するとき列順は file 9→1。
- USI 指し手表記: `7g7f`（移動）、`8h2b+`（成り）、`P*5e`（打ち）。
- 平手初期局面 SFEN: `lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1`
- 成りゾーン: 先手は rank 1〜3、後手は rank 7〜9。強制成り: 歩・香は最奥段、桂は奥 2 段。

## 5. UI 拡張性（テーマ設計）

**要求**: 背景・盤面・駒画像を後から容易に差し替えられること。Canvas は使わず DOM ベース。

設計:

```ts
// theme/types.ts
interface PieceTheme {
  kind: "text" | "image";
  // text: 駒種 → 表示文字（例 "P" → "歩"）。image: 駒種+色 → 画像 URL
  label?: (piece: Piece) => string;
  imageUrl?: (piece: Piece) => string;
}
```

- `PieceView` はテーマオブジェクトを参照して `<span>`（text）または `<img>`（image）を
  描画する。差し替えは `App.tsx` で渡すテーマ定数を変えるだけ。
- 盤・マス・背景・ハイライト色は CSS カスタムプロパティ（`--board-bg`, `--square-size`,
  `--highlight-color` 等）に集約し、`index.css` で既定値を定義。盤の背景画像化も
  `--board-bg` の差し替えで対応可能。
- **v1 のデフォルトは漢字テキスト駒**（五角形は CSS `clip-path` で表現、後手は
  `transform: rotate(180deg)`）。

**理由**: 画像アセットが未調達でもフェーズ 1 を完了・検証でき、将来の差し替えが
「テーマ定数 1 個 + アセット追加」に局所化される。DOM ベースなのでホバー・クリック・
アニメーションも CSS だけで拡張できる。

## 6. フェーズ別実装ステップ

各フェーズは独立したコミット単位。**エビデンスを満たすまで次フェーズに進まない**。

### フェーズ 1: 将棋盤 UI の構築

**やること**:
1. `domain/types.ts` の型定義と `domain/position.ts` の `createInitialPosition()`
2. `domain/sfen.ts` の `parseSfen()` / `positionToSfen()`（持ち駒・成駒・手数を含む完全版）
3. `theme/`（`types.ts` + `textTheme.ts`）
4. `Board` / `PieceView` / `Hand` コンポーネント。9x9 は
   `display: grid; grid-template-columns: repeat(9, var(--square-size))`。
   筋（9〜1）・段（一〜九）の座標ラベルを盤の外周に表示
5. `App.tsx` で初期局面を静的表示（インタラクションはまだ不要）

**理由**: SFEN 変換をこの段階で完成させるのは、フェーズ 2 のテストで任意局面を
SFEN 文字列から構築できるようにするため（テストの書きやすさが劇的に変わる）。

**エビデンス**:
- [ ] Vitest: `sfen.test.ts` — 初期局面 SFEN の parse 結果の駒配置検証、
      持ち駒・成駒・後手番を含む複数 SFEN の parse↔serialize 往復一致
- [ ] `pnpm dev` 目視: 9x9 の盤に平手初期局面（歩 9 枚 ×2、玉・飛・角の位置）が正しく
      表示され、後手駒が 180 度回転している。駒台が両側に空で表示される
- [ ] `pnpm check` 通過

### フェーズ 2: 駒の選択・移動ロジック

**やること**:
1. `domain/moves.ts` — `generateLegalMoves(position, from | dropPiece)`:
   駒種ごとの利き、飛・角・香の走り（遮断）、駒打ち制約（二歩、行き所のない駒、
   空きマスのみ）、`canPromote` / `mustPromote`、自玉が王手になる手の除外
2. `domain/position.ts` — `applyMove()`（駒取り→持ち駒化、成り反映、手番・手数更新）、
   `isInCheck()`
3. `state/gameStore.ts` — `createStore<GameState>` で `position`、`selection`（選択中の
   マス or 持ち駒）、`legalTargets`、`pendingPromotion`、`status` を管理。
   アクション: `selectSquare()`, `selectHandPiece()`, `confirmPromotion()`
4. UI 結合: クリックで選択 → 合法手先をハイライト → 移動。成り選択が必要な手は
   `PromotionDialog` を表示。手番はプレイヤー同士で交互（この時点では人間 vs 人間）

**理由**: エンジン結合前に人間 vs 人間で完全に動く状態を作ることで、ルールバグと
通信バグを分離してデバッグできる。

**エビデンス**:
- [ ] Vitest: `moves.test.ts` — 最低限次のケースを SFEN 局面ベースで検証:
      歩/桂/銀/金/玉の利き、飛・角・香の遮断、成り任意（ゾーン内）、強制成り
      （歩香の最奥段・桂の奥 2 段）、二歩の拒否、行き所のない駒打ちの拒否、
      ピン駒が動けないこと、王手時は回避手のみ生成されること
- [ ] Vitest: `position.test.ts` — 駒取りで持ち駒が増える、成駒を取ると生駒として
      持ち駒になる、`applyMove` 後の SFEN が期待値と一致
- [ ] 手動シナリオ: 選択ハイライト表示 → 移動 → 相手駒を取る → 駒台から打つ →
      成り選択ダイアログ → 非合法マスのクリックが無視される
- [ ] `pnpm test` / `pnpm check` 通過

### フェーズ 3: YaneuraOu.wasm 通信基盤

**やること**:
1. `pnpm add @mizarjp/yaneuraou.k-p`
2. `vite.config.ts` に `server.headers` / `preview.headers` の COOP/COEP を追加。
   Vite の事前バンドルが wasm/worker 構成と干渉した場合は
   `optimizeDeps.exclude: ["@mizarjp/yaneuraou.k-p"]` を試す
3. `engine/messages.ts` の型定義、`engine/engine.worker.ts`（§2.3 の素通し層）、
   `engine/usiEngine.ts`（`launch` / `newGame` / `search`）。
   Worker 生成は `new Worker(new URL("./engine.worker.ts", import.meta.url), { type: "module" })`
4. 動作確認用の一時コード（`App.tsx` に Debug ボタン等）で起動〜探索を検証し、
   確認後に削除する

**理由**: エンジン導入はビルド設定（ヘッダー・wasm 読み込み）という環境起因の
不確実性が最も高い工程なので、UI 結合と切り離して単体で疎通を確認する。

**エビデンス**:
- [ ] DevTools コンソールで `crossOriginIsolated === true`
- [ ] コンソールログで USI ハンドシェイクの完走: `usi` → `id name YaneuraOu ...` →
      `usiok` → `isready` → `readyok`
- [ ] `search("position startpos", 1000)` が `bestmove` 行（例 `bestmove 7g7f` 等）で
      resolve することをログで確認
- [ ] `pnpm build && pnpm preview` でも同様に動作（preview ヘッダー設定の検証）

### フェーズ 4: UI と頭脳の結合

**やること**:
1. `gameStore` に USI 手履歴（`string[]`）を追加し、`applyMove` のたびに
   `moveToUsi()` の結果を積む
2. 対局ループ: プレイヤー（先手）が指す → `status` を "thinking" に変更・入力ロック →
   `engine.search("position startpos moves " + 履歴.join(" "), MOVETIME_MS)` →
   `usiToMove()` で変換し `applyMove` → 入力ロック解除
3. 終局処理: `bestmove resign`（プレイヤー勝ち）、`bestmove win`（宣言勝ち）、
   プレイヤー側の合法手ゼロ（詰み負け）。`GameInfo` に結果表示
4. アプリ起動時に `engine.launch()` を開始し、準備完了までは対局開始をブロック
   （ロード表示）。強さは定数 `MOVETIME_MS = 1000` から開始

**理由**: `position startpos moves ...` 方式（SFEN 直送ではなく手履歴を送る）は
USI エンジンの最も標準的な使い方であり、千日手検出などエンジン内部の履歴依存機能が
正しく働く。

**エビデンス**:
- [ ] 1 局を通しでプレイし、投了または詰みまで到達できる
- [ ] エンジン思考中はインジケーターが表示され、盤クリックが無効
- [ ] エンジンの指し手（成り・打ちを含む）が盤面に正しく反映される
- [ ] フェーズ 3 の一時デバッグコードが削除されている
- [ ] `pnpm test` / `pnpm check` / `pnpm build` すべて通過

## 7. 既知のリスクと対処

| リスク | 対処 |
| --- | --- |
| wasm パッケージと Vite 8 の相性（事前バンドル・worker 解決） | `optimizeDeps.exclude` → それでも駄目なら wasm 一式を `public/` に置き importScripts で読む代替案に切り替え |
| 座標系の取り違え（file の左右反転） | §4 の規約に固定し、SFEN 往復テストを最初に書く |
| 合法手判定の漏れ | エンジンは不正手を送ると `bestmove` を返さない/異常挙動になり得る。フェーズ 2 のテストケースを削らない |
| `bestmove` 待ちのタイムアウト | v1 では `search` に 30 秒のタイムアウトを付け、超過時は error 状態を表示（自動リトライはしない） |

## 8. Claude Code への引き継ぎインプット

次の指示をそのまま Claude Code に渡して実装を開始する:

```
spec/plan.md を読んで、web-shogi の実装をフェーズ 1 から開始してください。

ルール:
- spec/plan.md の設計（型定義・座標規約・ディレクトリ構成）に従うこと。
  逸脱が必要になった場合は理由を説明して確認を取ること
- 1 フェーズ = 1 コミット。各フェーズの「エビデンス」チェックリストを
  すべて満たしてから次のフェーズへ進むこと
- 検証: pnpm test / pnpm check を各フェーズ完了時に実行。
  UI の目視確認が必要な項目は、確認手順を提示して私に依頼すること
- コード・コメント・コミットメッセージは英語（CLAUDE.md 準拠）

まずフェーズ 1（domain 型定義 + SFEN 変換 + 盤 UI）を実装してください。
```

フェーズ 3 以降を別セッションで再開する場合も、同じ形式で
「spec/plan.md のフェーズ 3 から」と指定すればよい。
