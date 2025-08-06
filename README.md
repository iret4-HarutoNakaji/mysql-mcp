# MySQL MCP Server

MySQL データベース操作とパフォーマンス分析のための包括的な Model Context Protocol (MCP) サーバーです。

## 機能

### データベース操作

- **安全な SELECT クエリ** - パラメータバインディング対応
- **データ操作** (INSERT, UPDATE, DELETE) - WHERE 句必須
- **スキーマ検査** (テーブル構造、インデックス、テーブル一覧)
- **SQL インジェクション対策** - クエリ検証機能

### パフォーマンス分析

- **クエリ実行計画** - EXPLAIN 分析
- **テーブル統計** - サイズ、行数、インデックス効率
- **スロークエリ検出** - 自動分析
- **接続プール監視** - リアルタイムメトリクス
- **パフォーマンス推奨事項** - クエリパターンに基づく分析

## インストール

1. リポジトリをクローン:

```bash
git clone <repository-url>
cd mysql-mcp
```

2. 依存関係をインストール:

```bash
npm install
```

3. プロジェクトをビルド:

```bash
npm run build
```

## 設定

### 1. 環境変数

mcp.json に追加。

```env
# データベース設定
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=your_database
DB_CONNECTION_LIMIT=10
DB_TIMEOUT=60000

```

### 2. MCP クライアント設定

`mcp.json`ファイルに以下の設定を追加してください:
この mcp サーバープロジェクトの絶対パスを入れてください。

```json
{
  "mcpServers": {
    "mysql": {
      "command": "node",
      "args": ["/{path}/mysql-mcp/dist/index.js"],
      "cwd": "/{path}/mysql-mcp",
      "env": {
        "DB_HOST": "xxxxxxx",
        "DB_PORT": "xxxx",
        "DB_USER": "xxxx",
        "DB_PASSWORD": "xxxxxxxx",
        "DB_NAME": "xxxxxxx"
      }
    }
  }
}
```

### 3. セキュリティ設定例

mcp.json の env に設定。設定しない場合は false として扱われる。

#### 読み取り専用モード (デフォルト)

```env
ALLOW_INSERT=false
ALLOW_UPDATE=false
ALLOW_DELETE=false
```

#### 読み取り・挿入のみ

```env
ALLOW_INSERT=true
ALLOW_UPDATE=false
ALLOW_DELETE=false
```

#### フルアクセス (原則使用しない！)

```env
ALLOW_INSERT=true
ALLOW_UPDATE=true
ALLOW_DELETE=true
```

### 利用可能なツール

#### データ操作

- `mysql_query` - SQL クエリの実行 (SELECT, INSERT, UPDATE, DELETE)
- `mysql_describe_table` - テーブル構造とスキーマ情報の取得
- `mysql_list_tables` - データベース内の全テーブル一覧

#### パフォーマンス分析

- `mysql_explain` - EXPLAIN を使用したクエリ実行計画の取得

## セキュリティ機能

### クエリ保護

- **危険な操作の検出** - DROP、CREATE、ALTER、TRUNCATE 操作を自動的にブロック
- **個別操作制御** - INSERT、UPDATE、DELETE 操作を個別に制御可能
- **WHERE 句必須** - UPDATE と DELETE 操作には WHERE 句が必要
- **クエリ制限** - SELECT クエリには LIMIT 句と最大行数制限が必要
- **システム操作ブロック** - SHUTDOWN、KILL、STOP SLAVE、RESET MASTER コマンドを防止
- **権限操作ブロック** - GRANT と REVOKE 操作をブロック

### SQL インジェクション対策

- **パラメータバインディング** - すべてのクエリでプリペアドステートメントを使用
- **クエリ検証** - 包括的な入力検証とサニタイゼーション
- **識別子エスケープ** - テーブル名とカラム名を適切にエスケープ

### 環境変数による制御

- **設定可能な権限** - 環境変数による特定操作の制御
- **行数制限** - クエリあたりの最大行数設定 (デフォルト: 1000)
- **操作ホワイトリスト** - 特定の操作タイプの有効/無効化

### 接続セキュリティ

- **接続プール** - 自動再接続と接続管理
- **タイムアウト保護** - 設定可能なクエリと接続タイムアウト
- **エラーハンドリング** - 機密情報を露出させない適切なエラー処理

## パフォーマンス機能

- **自動クエリメトリクス** - 収集と分析
- **スロークエリ検出** - 設定可能な閾値
- **接続プール監視** - 使用率追跡
- **クエリ実行洞察** - 最適化推奨事項
- **リアルタイムパフォーマンス統計**

### プロジェクト構造

```
mysql-mcp/
├── src/
│   └── index.ts          # MCPサーバーエントリーポイント
├── dist/                 # ビルド出力ディレクトリ
│   ├── index.js          # コンパイル済みエントリーポイント
│   ├── database/
│   │   ├── connection.js # MySQL接続管理
│   │   └── queries.js    # メトリクス付きクエリ実行
│   ├── tools/
│   │   ├── select.js     # SELECT操作
│   │   ├── insert.js     # INSERT操作
│   │   ├── update.js     # UPDATE操作
│   │   ├── delete.js     # DELETE操作
│   │   ├── schema.js     # スキーマ検査
│   │   ├── session.js    # セッション管理
│   │   └── performance/  # パフォーマンス分析ツール
│   │       ├── explain.js    # クエリ実行計画
│   │       ├── statistics.js # テーブル統計
│   │       └── monitoring.js # リアルタイム監視
│   ├── utils/
│   │   └── metrics.js    # パフォーマンスメトリクス収集
│   ├── types/
│   │   ├── index.js      # TypeScript型定義
│   │   └── session.js    # セッション型定義
│   └── session/
│       └── manager.js    # セッション管理
├── package.json          # プロジェクト設定
├── tsconfig.json         # TypeScript設定
├── .eslintrc.json        # ESLint設定
└── README.md             # プロジェクトドキュメント
```

## 要件

- Node.js 18+
- MySQL 5.7+ または MySQL 8.0+
- TypeScript 5.0+

## ライセンス

ISC License
