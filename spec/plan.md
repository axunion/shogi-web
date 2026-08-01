# shogi-web 改善計画書 (第 4 期: 駒・盤面の美化)

第 1 期(盤 UI / 合法手判定 / USI 通信 / エンジン結合)・第 2 期(フェーズ 1〜7: レイアウト・
ビジュアル/効果音・棋譜表示・永続化・アクセシビリティ)・第 3 期(フェーズ 8: 対局中の
使い勝手改善)は完了済み(いずれも git 履歴参照)。本書は第 4 期の計画を新規に記す。

- **この文書は日本語**(開発時の計画メモ扱い)。CLAUDE.md の規約により
  **コード・コメント・コミットメッセージ・console 出力・README はすべて英語**。
  ただし **UI 表示テキストは日本語**(日本語話者向けアプリのため。規約違反ではない)。
- 検証コマンド: `pnpm dev` / `pnpm test` / `pnpm check`。フェーズ完了時に
  `pnpm test` と `pnpm check` が通っていることが最低条件。

## 0. 過去方針の変更(重要)

第 2 期の計画書には「画像・音声アセットは追加せず、CSS と Web Audio API のみで表現する」
という恒久規約が明記されていた。**本期はこれを意図的に上書きする**:

- 駒の見た目をより美しくするため、Lishogi (`github.com/WandererXII/lishogi`) の
  駒 SVG アセットを `public/pieces/` に静的ファイルとして同梱する。
- 効果音・その他の画像(背景・アイコン等)についてはこの規約を変更しない
  (Web Audio API による効果音生成、CSS のみによる装飾は引き続き踏襲)。
- 外部 CDN 参照を追加しない、という規約は維持する(全アセットをリポジトリに
  ベンダリングし、`fetch` 等での実行時取得は行わない)。

## 1. 引き継ぐ不変の前提

| 項目 | 内容 |
| --- | --- |
| 構成 | SolidJS 1.9 + Vite 8 + TypeScript 6.0 / CSS Modules(lightningcss)/ Vitest 4 / Biome |
| 依存方向 | `components → state → domain / engine`(一方向。循環禁止) |
| 新規 npm 依存 | 追加しない(既存依存の未使用サブモジュール・アイコンは自由に使ってよい) |
| 画像アセット配置 | `public/`(Vite が素通しで配信。SVGR 等のインポートプラグインは未設定なので `<img src="/pieces/...">` 形式で参照する) |

## 2. 事前調査で確定した事実(Lishogi アセット)

Lishogi 本家リポジトリ (`WandererXII/lishogi`, デフォルトブランチ `master`) を実際に
fetch して検証済み。

- 駒 SVG は `ui/@build/pieces/assets/standard/<スタイル名>/<0|1><2文字コード>.svg`
  という命名(例: `0FU.svg` = 先手歩)。スタイルは 40 種類以上。
- **ライセンスはスタイルごとに異なる**(`COPYING.md` の例外表で確認)。
  - `kanji_light` / `kanji_brown` / `kanji_red_wood` / `simple_kanji`(作者 Ka-hu)
    は **CC BY 4.0**(表示のみで再配布・改変可)。純粋ベクター path、1〜3KB 程度で軽量。
  - 例外表に載らないスタイル(`hitomoji` を含む)はデフォルトの **AGPLv3+**
    (強いコピーレフト)。本プロジェクトには LICENSE ファイルが無いため、AGPL 系素材の
    組み込みはアプリ全体のライセンス方針に波及するリスクがある → **不採用**。
  - `portella` 系は **CC BY-NC-SA**(非商用限定)→ 不採用。
- **`1*.svg`(後手側)は `0*.svg` を 180 度回転させただけの完成品**であることを
  SVG の中身(path の transform 符号反転)を比較して確認済み。本アプリの
  `PieceView.tsx` は既に `.piece` 要素に `rotated` クラス(色/盤反転に応じて
  `rotate(180deg)`)を適用しており、これは `theme.kind` に関係なく効く。
  → **`0*.svg`(先手側 15 ファイル)だけを取り込めばよく、`1*.svg` は不要**。
- 駒種ごとに**相対サイズが SVG 内(viewBox に対するペンタゴンの縮尺)に焼き込まれて
  いる**。既存の `PIECE_SIZE_SCALE`(`src/theme/pieceSize.ts`)を画像テーマにも
  そのまま掛けると二重縮小になるため、画像テーマでは scale を `1` に固定する。
  結果として文字テーマより駒種間の大小差はやや控えめになるが、これは仕様であり
  不具合ではない。

**採用方針(ユーザー確認済み)**:
- スタイルは **`kanji_light`** を採用。
- 駒の見た目は **設定画面から切替可能**にする(文字駒 `textTheme` はコードに残し、
  フォールバック兼選択肢として維持)。
- 盤面は Lishogi の写真調テクスチャ(AGPL ライセンス)を使わず、**CSS/SVG で
  木目調を自作**する。

## 3. フェーズ 9: Lishogi 駒 SVG (`kanji_light`) の導入

### 9-1. アセットのベンダリング
- `public/pieces/lishogi-kanji-light/` に以下 15 ファイルをコピー:
  `0FU 0KY 0KE 0GI 0KI 0KA 0HI 0OU 0GY 0TO 0NY 0NK 0NG 0UM 0RY .svg`
- 取得元コミット SHA を控え、同ディレクトリに `LICENSE.md` を同梱
  (CC BY 4.0 全文リンク・原作者 Ka-hu・入手元 URL・取得コミット SHA・改変有無を明記。
  CC BY の表示義務を満たすため)。
- 王将/玉将は `textTheme` の規約(先手=王, 後手=玉)に合わせ、先手側描画に
  `0OU.svg`、後手側描画に `0GY.svg` を使う(どちらも `0` プレフィックスのファイルで、
  回転は既存 CSS が担当)。

### 9-2. `PieceTheme` 型の拡張 (`src/theme/types.ts`)
判別可能ユニオン化し、image 側に attribution 情報を持たせる:
```ts
export interface PieceThemeAttribution {
  name: string;
  author: string;
  authorUrl?: string;
  sourceUrl: string;
  licenseName: string;
  licenseUrl: string;
}

export type PieceTheme =
  | { kind: "text"; id: string; label: (piece: Piece) => string }
  | { kind: "image"; id: string; imageUrl: (piece: Piece) => string; attribution: PieceThemeAttribution };
```

### 9-3. ラベルマップの共通化
`textTheme.ts` の `LABELS` マップを `src/theme/kanjiLabels.ts` として切り出し、
`kanjiLabel(piece: Piece): string` を提供。`textTheme.label` はこれを再利用する。
画像テーマ使用時も `<img alt>` と `Hand.tsx` の `aria-label` に同じ関数を使い、
`"+R"` のような内部コードがそのまま読み上げられないようにする(現状 `Hand.tsx` は
`theme.kind === "text"` の時しかラベルを取っていないため、kind 非依存の呼び出しに直す)。

### 9-4. `src/theme/lishogiKanjiLightTheme.ts` の新設
駒種→2文字コードのマッピング(`FU/KY/KE/GI/KI/KA/HI` + 成駒 `TO/NY/NK/NG/UM/RY`、
玉は色で `OU`/`GY`)と `imageUrl(piece)` ビルダー、`attribution` 定義を持つ。パスは
`import.meta.env.BASE_URL` 起点で組み立てる(将来サブパスデプロイでも壊れないよう)。
**マッピング表は実際にベンダリングしたファイル名の `ls` から機械的に作る**(記憶や
文書からの手書きは typo の温床なので避ける)。

### 9-5. `PieceView.tsx` の描画分岐
現状 `rotated`/`selected`/`placed`/`--piece-scale`/`drop-shadow` は全て外側の
`.piece` 要素に載っており、`.shape`/`.face` は文字テーマの五角形装飾専用。
image kind では `.shape`/`.face` を経由せず `.piece` 直下に `<img>` を置くサブツリー
分岐にする(Lishogi SVG は五角形本体込みの完成画像のため、CSS 側の五角形と二重に
ならないようにする):

```
kind === "text"  → .piece > .shape > .face > .label   (現状維持、無変更)
kind === "image" → .piece > <img class={.image} alt={kanjiLabel(piece)} />
```

`scale()` は `theme.kind === "image"` の場合は `1` を返すようガードする
(二重縮小防止)。

### 9-6. テーマ切替 UI と永続化
- `src/theme/registry.ts`: `id → PieceTheme` の一覧
  (`textTheme` と `lishogiKanjiLightTheme` を登録)。
- `src/state/gameStore.ts` の `Settings` に `pieceTheme: string`
  (theme id、デフォルトは `textTheme.id` — 既存ユーザーの見た目を勝手に変えない)を追加。
  `loadSettings` の復元パスで、未知の theme id が来た場合は `textTheme` に
  フォールバックするガードを入れる。
- `Controls.tsx` に既存の `<select>` パターンを踏襲した「駒の見た目」選択 UI を追加。
- `App.tsx` の 3 箇所の `theme={textTheme}` を、`registry` から選択中 id を引く
  `theme={selectedTheme()}` に置換。

### 9-7. クレジット表示
CC BY 4.0 の SVG を同梱する以上、表示義務がある。新規コンポーネントは作らず、
Controls の「駒の見た目」選択 UI 直下に、画像テーマ選択時だけ `attribution` から
生成した 1 行(「駒画像: Kanji Light by Ka-hu (CC BY 4.0)」+ リンク)を出す。

## 4. フェーズ 10: 盤面テクスチャの自作改善

現状 `Board.module.css` は `.square` 1 マスごとに
`linear-gradient(135deg, var(--board-bg), var(--board-bg-dark))` を個別適用しており、
テクスチャ画像を持ち込んでも 81 マス分の継ぎ目が出る構造的な問題がある。方針:

1. 背景を `.square` から `.board` 1 枚に移し、`.square` は透明にする。
2. 木目調は `<feTurbulence>` + `<feColorMatrix>` によるノイズ生成 SVG を
   `background-image: url("data:image/svg+xml,...")` として 1 枚だけ埋め込む
   (または複数 `linear-gradient`/`repeating-linear-gradient` レイヤーの重ね合わせ)。
   色は既存 `--board-bg`/`--board-bg-dark` を土台に調整。外部アセット不要・ライセンス
   問題なし・任意サイズで継ぎ目なし。
3. **注意点**: `.lastMoveFrom`/`.lastMoveTo`/`.selected` は現状、盤面グラデーションを
   個々に再宣言して色オーバーレイと重ねている
   (`linear-gradient(色, 色), linear-gradient(135deg, board-bg, board-bg-dark)`)。
   背景を `.board` に一本化すると、この 3 ルールが下地テクスチャを覆い隠す不透明
   パッチになってしまうため、半透明の単色オーバーレイ
   (`background: var(--last-move-bg-weak)` 相当、または `mix-blend-mode`)に
   書き換える必要がある。
4. ダークモード等、他の配色モードが `index.css` にあるかはフェーズ 10 着手時に
   再確認し、木目調テクスチャとの整合を取る。

## 5. 対象ファイル一覧

- `src/components/Board/PieceView.tsx` / `PieceView.module.css` — 描画分岐・scale=1 ガード
- `src/theme/types.ts` — `PieceTheme` 判別ユニオン化
- `src/theme/textTheme.ts` / 新設 `src/theme/kanjiLabels.ts` — ラベル共通化
- 新設 `src/theme/lishogiKanjiLightTheme.ts`, `src/theme/registry.ts`
- `src/components/Hand/Hand.tsx` — `aria-label` の kind 非依存化
- `src/state/gameStore.ts` — `Settings.pieceTheme` 追加、フォールバックガード
- `src/components/Controls/Controls.tsx` — 駒テーマ選択 UI + クレジット行
- `src/App.tsx` — テーマ参照を registry 経由に置換
- `public/pieces/lishogi-kanji-light/` — 新設(SVG 15 点 + `LICENSE.md`)
- `src/components/Board/Board.module.css` — 背景合成の一本化(フェーズ 10)

## 6. 検証方法

- **アセット存在チェック**: 全 `PieceType × 色` の組み合わせについて `imageUrl()` が
  生成するファイル名が `public/pieces/lishogi-kanji-light/` に実在することを検証する
  vitest(`fs.existsSync` で可能)。マッピングの typo は実行時に壊れた `<img>` として
  しか気づけないため優先度高。
- `pnpm check`(biome + tsc)を通し、判別ユニオン化した `PieceTheme` の型 narrowing が
  効いているか確認。
- `pnpm dev` で目視確認: (a) 全 14 駒種 × 2 色 × 成/不成で二重五角形になっていないか
  (b) 玉/王が OU/GY で正しく出るか (c) 回転(後手・盤反転モード)・選択スケール・
  placed アニメーションが画像テーマでも機能するか (d) 歩と玉の相対サイズが不自然でないか
  (e) `alt`/`aria-label` が漢字ラベルになっているか。
- フェーズ 10 は変更前後のスクリーンショット比較で、`selected`/`lastMoveFrom`/
  `lastMoveTo` が不透明パッチ化していないか確認。
- フェーズ完了時は `pnpm test` と `pnpm check` が通っていることを確認する。
