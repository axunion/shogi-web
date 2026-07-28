# shogi-web 改善計画書

第 1 期（盤 UI / 合法手判定 / USI 通信 / エンジン結合）と第 2 期（フェーズ 1〜7:
`--square-size` 単一化・対局ライフサイクル・レイアウト・ビジュアル/効果音・棋譜表示・
永続化・アクセシビリティ仕上げ）は完了済み。本書は第 3 期（フェーズ 8）を追記したもの。

- **この文書は日本語**（開発時の計画メモ扱い）。CLAUDE.md の規約により
  **コード・コメント・コミットメッセージ・console 出力・README はすべて英語**。
  ただし **UI 表示テキストは日本語**（日本語話者向けアプリのため。規約違反ではない）。
- 検証コマンド: `pnpm dev` / `pnpm test` / `pnpm check`。フェーズ完了時に
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
  `gameStore.ts` の世代カウンタ（`generation`）で古い `search` の結果を破棄する
  （実装済み）。

## 1. プロジェクト全体の対象外方針（継続）

- **サーバーでのデータ保存**（ユーザー指示により不要）
- 対人戦（オンライン）、駒落ち、先後選択、棋譜ファイル入出力（KIF/CSA）
- 棋譜クリックによる局面巻き戻し（表示のみ。undo は最新手からのみ）
- 打ち歩詰め・千日手・持将棋の**自前**判定（エンジン側は正しく扱う。既知の制限）
- PWA / Service Worker（COOP/COEP と相性が悪く、ローカル検証の主旨から外れる）
- i18n、音声ファイル・画像ファイルの追加
- 新規 npm 依存の追加（既存依存の未使用サブモジュール・アイコンは自由に使ってよい）

## 2. 第 2 期の完了サマリ（フェーズ 1〜7）

全フェーズ実装済み。`pnpm test` / `pnpm check` 通過済み、TODO/FIXME 等の残骸なし。
詳細な実装手順（CSS 計算式・コンポーネント構成等）は git 履歴と実コードを参照。

| フェーズ | 項目 | 状態 |
| --- | --- | --- |
| 1 | `--square-size` を単一スケーリングノブに、ダークモード対応 | 完了 |
| 2 | 新規対局/投了/待った/詰み判定/設定のストア基盤（世代カウンタで陳腐化した探索結果を破棄） | 完了 |
| 3 | モバイル/デスクトップ 2 系統レイアウト（`grid-template-areas`） | 完了 |
| 4 | 背景・盤・駒台・駒のビジュアル、王手/最終手ハイライト、着手アニメーション、Web Audio 効果音 | 完了 |
| 5 | 棋譜表示（▲7六歩 形式、`domain/notation.ts`） | 完了 |
| 6 | localStorage 永続化とリロード復帰（`domain/replay.ts`、`state/storage.ts`） | 完了 |
| 7 | メタ情報・favicon・README・アクセシビリティ仕上げ | 完了 |

**恒久的に守る設計規約**（第 3 期以降も適用）:
- アニメーションは必ず `prefers-reduced-motion: reduce` を尊重する（`index.css` に
  全称セレクタでの上書きが定義済み。個別コンポーネントで重複定義しない）。
- 画像・音声アセットは追加せず、CSS と Web Audio API のみで表現する。
- 色は既存の CSS カスタムプロパティ（`--panel-bg`/`--dialog-bg`/`--focus-ring` 等、
  `src/index.css` 定義）を使い回し、新規トークンは真に必要な場合のみ追加する。

## 3. 第 3 期スコープ（フェーズ 8）

対局中の使い勝手を改善する 3 点をまとめて実装する。**単一コミット**として扱う
（3 機能とも UI 表示ロジックのみで密接に関連するため、個別コミットに分ける実益がない）。
新規 npm 依存は追加しない（`@kobalte/core` の `Popover` と `lucide-solid` の `Menu` は
既存依存に含まれる）。新規の純関数・Vitest も追加しない（今回の変更はすべて UI 表示
ロジックであり、既存の「純関数には Vitest を追加する」方針の対象外）。

### 8-1. 駒台（持ち駒）の表示サイズ固定

**目的**: 駒台が捕獲した駒の種類が増えるにつれて大きくなる問題を解消し、対局開始直後
から一定の大きさを確保する。

**現状の問題**（`src/components/Hand/Hand.tsx:7,20-21` と `Hand.module.css:24-32`）:
- `HAND_ORDER = ["R","B","G","S","N","L","P"]` を `entries()` が
  `pieces[type] > 0` でフィルタしており、捕獲していない駒種はスロットごと DOM に
  存在しない。捕獲するたびにスロット数が増減し、駒台の幅/高さが変動する。
- `.slots` は `min-height`/`min-width` が「スロット概ね 1 個分」
  （`calc(var(--square-size) * 1.2 * var(--hand-piece-scale, 1))`）にしかならず、
  7 種全部を収める幅を最初から予約していない。`gap: 0.5rem` も絶対値。

**やること**:
1. `Hand.tsx`: `entries()` のフィルタを廃止し `HAND_ORDER` を直接 `<For>` に渡す。
   捕獲数 0 の駒種は `<Show>` で「クリック不可の空きスロット」（`aria-hidden="true"`
   の `<div class={styles.emptySlot}>`）にフォールバックする。**7 個すべてボタンに
   する案は採らない**（両陣営で常時 14 個の無意味なフォーカス項目/読み上げが
   増えるため）。
2. `Hand.module.css`: `.slots` を `flex-wrap: nowrap`（7 個固定なので折り返し禁止 —
   折り返すとモバイルの縦方向予算 `--vertical-fixed`（`Layout.module.css`）の前提が
   崩れスクロールバーが出る）にし、`gap` を `--slot-gap: calc(var(--square-size) * 0.08)`
   として `--square-size` から導出する（絶対値の `gap` を廃止）。`.slot`/`.emptySlot`
   共通で `width/height: var(--slot-size)`（`--slot-size` は既存の
   `calc(var(--square-size) * var(--hand-piece-scale, 1))` を変数化したもの）。
3. 既存の `aria-label="持ち駒 ○ N枚"` は捕獲済みスロットのみそのまま維持する。

**エビデンス**:
- [ ] 対局開始直後（持ち駒 0）と複数駒捕獲後で駒台の幅・高さが変化しないこと
      （390×844 / 1440×900）。
- [ ] 360×740（最小想定幅）で 7 スロット行が盤の外にはみ出さず横スクロールが
      出ないこと。
- [ ] 0 枚のスロットが Tab フォーカスされず読み上げられないこと。捕獲済みスロットの
      読み上げ文言は従来通り。
- [ ] `pnpm check` 通過。

### 8-2. 操作パネルのメニュー化

**目的**: 対局中は盤に集中できるよう、常時表示するボタンを「待った」「投了」の
2 つのみに絞り、残りをハンバーガーメニューに格納する（重要度に応じた表示、
ユーザー決定済み）。

**現状**（`Controls.tsx` 全 157 行）: 新規対局・待った・投了・音量トグル・
強さセレクト・棋譜ボタンの 6 要素が 1 行にフラットに並ぶ。

**プリミティブ選択**: `@kobalte/core/dropdown-menu` ではなく `Popover` を使う。
`DropdownMenu` は `Item` に選択時オートクローズを強制するため、中に置く
`<select>`（強さ設定）や「開いたまま連打したい」音量トグルと相性が悪い。`Popover` は
項目セマンティクスを課さないため素の `<button>`/`<select>` をそのまま置ける。

**実装上の注意（重要）**: 新規対局の `AlertDialog` と棋譜の `Dialog` は
`Popover.Content` の中に**入れ子にしない**。両方とも `document.body` に portal
されるため、その中でのクリックが `Popover` から見て「外側クリック」に扱われ、
ダイアログが開く前に `Popover` が閉じてサブツリーごとアンマウントされてしまう。
`AlertDialog`／`Dialog` は引き続き `Controls` トップレベルの兄弟要素とし、開閉は
既存の `createSignal`（`confirmNewGame`/`kifuOpen`）で制御する。`Popover` の中身は
「押したら `setMenuOpen(false)` してから該当シグナルを `true` にするだけのプレーンな
`<button>`」に留める。

**やること**:
1. `Controls.tsx`: 「待った」ボタン・「投了」の `AlertDialog`（`Trigger` 付き、
   従来通り）はそのまま常時表示のまま残す。`Menu` アイコン（lucide-solid）を
   トリガーにした `Popover`（`modal={false}` を明記）を追加し、中に新規対局を開く
   ボタン・音量トグル・強さ `<select>`・棋譜を開くボタン（モバイルのみ、既存
   `@media (min-width: 48rem) { display: none }` 方式を踏襲）を並べる。新規対局の
   `AlertDialog` と棋譜の `Dialog` 自体は Popover の外に兄弟として残し、`Trigger`
   を持たず `open` シグナルのみで制御する形に変更する。
2. `Controls.module.css`: `.menuPanel`/`.menuItem` を新設（`--panel-bg`/
   `--panel-border`/`--dialog-text`/`--focus-ring` など既存トークンを流用。
   新規カラートークンは追加しない）。`.overlay` は Popover には使わない
   （バックドロップなしのアンカー配置ポップアップのため）。
3. `Layout.module.css` の `--controls-height: 3rem` は変更不要（常時表示が
   6 要素→3 要素に減るため既存の高さで収まる）。

**エビデンス**:
- [ ] 対局中、常時表示は「待った」「投了」「メニュー（ハンバーガー）」の 3 つのみ
      （390×844 / 1440×900）。
- [ ] メニュー内で強さ変更・音量トグルを操作してもメニューが閉じない。
- [ ] メニュー内「新規対局」→ メニューが閉じた上で確認ダイアログが正しく開閉する
      （Popover と AlertDialog が競合してアンマウントされない）。
- [ ] 投了は従来通りメニュー外から直接押せ、`playerTurn` 以外は無効化。
- [ ] キーボード: メニュートリガーに Tab→Enter/Space で開き、Escape で閉じて
      フォーカスがトリガーに戻る。
- [ ] ダークモードで破綻しない。
- [ ] `pnpm check` 通過。

### 8-3. 対局結果オーバーレイ

**目的**: 「今週末公開するゲームのような完成度」に不足していた点として、終局が
`GameInfo` 内のテキスト変化のみで専用の結果画面がないことを補う。

**現状**: `GameInfo.tsx` は `aria-live="polite"` 内のテキストが `STATUS_LABEL` に
切り替わるのみ。

**やること**:
1. `src/components/ResultOverlay/ResultOverlay.tsx` を新設。`@kobalte/core/dialog`
   （`PromotionDialog.tsx` と同じ使い方）を使用。`isGameOver(status)` を直接 `open`
   に渡すと Escape で閉じてもすぐ再オープンする罠があるため、
   `createEffect(on(() => props.status, ...))` でローカルシグナル `open` を状態
   遷移時にのみ `true` にする。
   - 勝敗/理由の表示は既存 `STATUS_LABEL` 相当の文言を流用した簡潔な
     `RESULT_LABEL`/`RESULT_REASON` マップ（終局系ステータスのみ対象）。
   - 「もう一局」ボタンは確認ダイアログなしで直接 `newGame()` を呼ぶ（終局後は
     対局途中を破棄する心配がないため、既存の新規対局確認とは文脈が異なる）。
   - 「閉じる」（`Dialog.CloseButton`）や Escape での閉じるを許可する。閉じても
     盤面クリック無効化などの既存ゲート（フェーズ 2 実装済み）は `status` に
     基づくため影響を受けない。
2. `src/components/ResultOverlay/ResultOverlay.module.css` を新設
   （`PromotionDialog.module.css` と同系統。`fade-in` の `@keyframes` のみ追加。
   `prefers-reduced-motion` の分岐は書かない — `index.css` の既存グローバル
   `@media (prefers-reduced-motion: reduce)` が全称セレクタで上書き済みのため
   重複させない）。色は新規トークンを追加せず `--dialog-bg`/`--dialog-text`/
   `--panel-border`/`--focus-ring` を使う。
3. `App.tsx`（返り値 JSX）に `PromotionDialog` と同じトップレベル配置で追加:
   `<ResultOverlay status={state.status} onRematch={newGame} />`。`state.status` と
   `newGame` は既に `App.tsx` 内で取得済みのため新規シグナル不要。
4. **既知の副作用として明記**: フェーズ 6 の localStorage 復帰は終局ステータスを
   `records` から再判定するため、終局済みの対局をリロードするとオーバーレイが
   再表示される。これは意図した挙動として採用する。

**エビデンス**:
- [ ] 投了 → オーバーレイに負け表示。「閉じる」で消えても盤面クリックは引き続き
      無効。
- [ ] 1 手詰めを指す → オーバーレイに勝ち表示。
- [ ] 「もう一局」→ 確認なしで即座に新規対局・オーバーレイも閉じる。
- [ ] Escape で閉じられ、フォーカスが戻る。
- [ ] 終局した対局をリロードするとオーバーレイが再表示される（意図した挙動）。
- [ ] 「視差効果を減らす」ON でアニメーションが実質即時になる。
- [ ] ダークモード・390×844・1440×900 で破綻しない。
- [ ] `pnpm check` 通過。

## 4. 変更・新規ファイル一覧（フェーズ 8）

```
変更:
  src/components/Hand/Hand.tsx                  entries() のフィルタ廃止・空スロット表示
  src/components/Hand/Hand.module.css           --slot-size/--slot-gap 導入・nowrap 化
  src/components/Controls/Controls.tsx          Popover メニュー化（待った/投了以外を格納）
  src/components/Controls/Controls.module.css   .menuPanel/.menuItem 追加
  src/App.tsx                                   ResultOverlay の配線

新規:
  src/components/ResultOverlay/ResultOverlay.tsx
  src/components/ResultOverlay/ResultOverlay.module.css
```

## 5. Claude Code への引き継ぎインプット

次の指示をそのまま Claude Code に渡して実装を開始する:

```
spec/plan.md を読んで、shogi-web の第 3 期（フェーズ 8）を実装してください。

ルール:
- spec/plan.md の §0 座標規約・依存方向（components → state → domain / engine）に従うこと。
  逸脱が必要になったら理由を説明して確認を取ること
- フェーズ 8 は単一コミットとして扱う（8-1 駒台固定表示・8-2 操作メニュー化・
  8-3 対局結果オーバーレイ、の 3 機能をまとめて実装する）
- 検証: pnpm test / pnpm check を実行。UI の目視確認が必要な項目は、確認手順を
  提示して私に依頼すること
- コード・コメント・コミットメッセージ・README は英語。UI 表示テキストは日本語
- 画像・音声アセットは追加しない（CSS と Web Audio で表現する）
- 新規 npm 依存は追加しない（@kobalte/core の Popover、lucide-solid の Menu は
  既存依存に含まれるので使ってよい）

まず 8-1（駒台の表示サイズ固定）から着手し、次に 8-2（操作パネルのメニュー化）、
最後に 8-3（対局結果オーバーレイ）の順で進めてください。
```

---

## 検証方法（本計画全体）

1. **フェーズ 8**: `pnpm test` と `pnpm check` を実行。今回の変更は UI 表示ロジックの
   みのため新規 Vitest は不要（既存の純関数テスト方針の対象外）。
2. **レスポンシブ**: `pnpm dev` + Chrome DevTools デバイスエミュレーションで
   390×844 / 430×932 / **360×740**（駒台の最厳しいフィット確認） / 844×390（横） /
   1440×900 を確認。モバイルでは縦横どちらのスクロールバーも出ないことが合否基準。
   `run` skill / `claude-in-chrome` skill でスクリーンショットを取って比較してよい。
3. **通し対局**: `pnpm build && pnpm preview` で 1 局を投了/詰みまで通す。途中で
   駒を捕獲して駒台サイズの不変を確認、メニューから強さ変更・棋譜確認、投了 →
   結果オーバーレイ → 「もう一局」、の一連を 1 回ずつ試す。
4. **ダークモード**: macOS のシステム設定で切り替えて両モードを目視。
5. **アクセシビリティ**: メニュー・結果オーバーレイともに Tab/Escape のキーボード
   操作と VoiceOver の読み上げを確認する。
