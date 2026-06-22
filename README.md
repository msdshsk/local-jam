# local-jam

> **FigJam（部品の手作りが手間）と Figma（過剰）の中間**を埋める、Webアプリ用の超軽量モック作成ツール。
> コンセプトは **「話しながら使える落書き帳」** — 作り込みより素早さ。

無限キャンバスに「いつもの画面の骨組み」をサッと並べ、関係者と画面を触りながら「こういう機能・こういう画面にしたい」を素早く詰めるためのデスクトップアプリ（Electron）です。きれいに描くことではなく、**ローファイでも"それが何か一目で分かる"部品**を素早く置き換えることに価値を置いています。

---

## 特徴

- **無限キャンバス**に複数画面を自由配置（React-Flow ベース）
- **編集可能なローファイ部品ライブラリ**（フォーム一式・ナビ・データ表示・グラフ・チャットUI など）
  - `input[type=*]` 網羅、テーブル、カード、グラフ（棒/折れ線/円）、アイコン35種、アイコンレール、吹き出し ほか
- **テンプレ / バンドル**：よく使う並び（ログインフォーム、CRUD、チャット会話など）をワンドロップで展開。選択範囲を**マイテンプレート**として保存・再利用。**`.ljat` で書き出し／取り込み**でき、画像も同梱して配布できる
- **吸着整列・グループ化・テーマ色・複数行テキスト・日本語IME対応**
- **空フレーム（分類ゾーン）/ 角丸枠** で領域をゆるく区切る
- **注釈線・付箋メモ・コメント**（ワンクリックで一括表示/非表示）
- **出口**：`.ljam` 保存（ZIPパッケージ）／ PNG・PDF 書き出し（画面ごとPDFも可）
- **オートセーブ＆復帰**（userData に軽量退避）
- **Claude 連携（MCP）**：起動中のキャンバスを Claude が読み取り、画面構成を理解して相談できる（読み取り専用）
- **自動テスト**：Vitest（単体）＋ Playwright（E2E）で回帰チェック

---

## 技術スタック

- **Electron** + **electron-vite**（main / preload / renderer 構成）
- **React 18** + **TypeScript** + **Tailwind CSS v3**
- **@xyflow/react (React-Flow v12)** — キャンバス
- **zustand** — 状態管理
- **jszip**（.ljam）/ **html-to-image** + **jspdf**（書き出し）/ **@fontsource/yomogi**（手書き風フォント同梱）
- テスト：**Vitest** / **@playwright/test**

---

## セットアップ

```bash
npm install
npm run dev        # 開発起動（Electron）
```

### ビルド / 起動

```bash
npm run build      # main/preload/renderer をビルド（out/ に出力）
npm run start      # ビルド済みをプレビュー起動
npm run typecheck  # 型チェック（main + renderer）
```

### テスト

```bash
npm test           # Vitest 単体テスト（高速・ブラウザ不要）
npm run test:e2e   # build 後に Playwright E2E（chromium）
npm run test:all   # 単体 + E2E
```

> E2E は初回のみブラウザ取得が必要です：`npx playwright install chromium`

---

## Claude 連携（MCP・読み取り専用）

アプリ起動中、`http://127.0.0.1:4319/mcp` で **MCP サーバ**（HTTP / JSON-RPC）が立ち上がります。Claude から現在のキャンバスを読めます。

```bash
# 一度だけ登録（アプリ起動中に）
claude mcp add -t http local-jam http://127.0.0.1:4319/mcp
```

- ツール：`describe_layout`（画面構成の要約）/ `get_document`（完全なドキュメントJSON）
- ※ Claude Code は**起動中のインスタンスにMCPを追加できない**ため、登録後に**新しいインスタンス**で有効になります。
- 詳細は [docs/MCP.md](docs/MCP.md) を参照。

---

## 保存形式 `.ljam`

xlsx/OOXML と同じ **ZIPパッケージ**です（中身は JSON）。

```
mydoc.ljam (zip)
├── mimetype          # "application/x-local-jam"
├── document.json     # JamDocument（version/meta/viewport/nodes/edges）
└── resources/        # 画像等のバイナリ資産（将来用）
```

ロックインしないよう、いざとなれば解凍して `document.json` を直接読めます。

### マイテンプレート `.ljat`

マイテンプレートは **1テンプレ＝1ファイル**（`userData/templates/<id>.ljat`）で管理します。中身は `.ljam` と同じ ZIP で、`template.json` ＋ `assets/`（埋め込み画像を実ファイルに抽出して同梱）。パレットの「マイテンプレート」から **⬇ で書き出し**、**＋取り込み** で読み込めます。これにより、画像入りの複雑な部品テンプレも丸ごと配布できます。

---

## プロジェクト構成

```
local-jam/
├─ src/
│  ├─ main/                 # Electron メイン
│  │  ├─ index.ts           #   ウィンドウ / IPC(保存・画像・テンプレ) / MCP起動
│  │  ├─ mcp.ts             #   読み取り専用 MCP サーバ(HTTP)
│  │  └─ describeLayout.ts  #   ドキュメントJSON → 画面構成テキスト要約
│  ├─ preload/              # contextBridge（window.jam）
│  └─ renderer/src/         # React アプリ
│     ├─ App / Canvas / store / types
│     ├─ parts.ts           #   部品レジストリ（拡充=1エントリ追加）
│     ├─ bundles.ts         #   バンドル（束）定義
│     ├─ renderPart.tsx     #   部品の描画
│     ├─ icons.tsx          #   アイコン台帳（IconGlyph）
│     ├─ chartUtil / tableUtil / imageUtil / exportImage / geometry
│     ├─ nodes/             #   ScreenNode / PartNode / GroupNode / NoteNode / CommentNode
│     ├─ edges/             #   AnnotationEdge
│     └─ components/        #   Toolbar / Palette / Inspector / TableEditor / Autosave / ContextMenu
├─ test/
│  ├─ unit/                 # Vitest（純ロジック）
│  └─ e2e/                  # Playwright（UI回帰）
├─ docs/                    # design.md（設計メモ）/ MCP.md
├─ build/                   # アプリアイコン置き場（build/README.md 参照）
└─ electron.vite.config.ts / tailwind.config.js / vitest.config.ts / playwright.config.ts
```

部品の拡充は基本 **`parts.ts` / `renderPart.tsx`（必要なら `icons.tsx` / `bundles.tsx`）に1エントリ追加** で済む設計です。

---

## アプリアイコン

`build/` 配下に置きます。詳細・必要な形式は [build/README.md](build/README.md) を参照してください（要点：**1024×1024 の透過PNG を1枚**用意すれば、そこから各プラットフォーム形式を生成できます）。

---

## 設計ドキュメント

プロダクトの意図・データモデル・確定した設計判断は [docs/design.md](docs/design.md)（設計メモ v3）にまとまっています。

## ライセンス

MIT
