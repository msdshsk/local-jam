# アプリアイコン

このフォルダにアプリアイコンを置きます（パッケージング時に使用）。

## いちばん簡単な渡し方

**1024×1024 の透過 PNG を1枚**（`build/icon.png`）用意してください。
ここから各プラットフォーム形式（Windows `.ico` / macOS `.icns`）を生成できます。

## 各プラットフォームの形式

| OS | 形式 | 備考 |
|---|---|---|
| Windows | **`icon.ico`（マルチサイズ）** | 16 / 24 / 32 / 48 / 64 / 128 / 256 px を1つの .ico に内包する「マルチアイコン形式」が望ましい |
| macOS | **`icon.icns`（マルチ解像度）** | 16〜1024 px を内包 |
| Linux | **`icon.png`** | 512×512 以上 |

→ ご質問の「マルチアイコン形式がいいか？」は **Windows に関しては Yes**（複数サイズ入りの `.ico`）。macOS も同様にマルチ解像度の `.icns` が標準です。

## 想定ファイル

```
build/
├── icon.png    # 1024×1024 透過PNG（マスター）
├── icon.ico    # Windows 用（マルチサイズ）
└── icon.icns   # macOS 用（マルチ解像度）
```

## 生成方法（PNG マスターから）

- `electron-builder` を導入すると、`build/icon.png`（1024px）から各形式を自動生成できます。
- もしくは `electron-icon-builder` / `png2icons` 等のツール、または ImageMagick で個別生成。

## 用途別の置き場所

- **配布パッケージのアイコン**：パッケージャ（electron-builder 等）が `build/icon.*` を参照。
  - ※ 本リポジトリは現状パッケージング設定（electron-builder）未導入。アイコンを頂いた段階で、ビルド設定とアイコン生成をまとめて用意します。
- **ウィンドウ/タスクバーのアイコン（実行時）**：`src/main/index.ts` の `BrowserWindow({ icon: ... })` に指定（Windows は `.ico`、Linux は `.png`。macOS は無視されアプリバンドルのアイコンを使用）。
