# システム構成書 - すきまけしき (sukima)

バイク乗り向けの「隙間時間で行けるスポット」共有Webアプリケーション。

## 1. 技術スタック

| レイヤー | 技術 |
|---|---|
| バックエンド | Python / Flask |
| ORM | Flask-SQLAlchemy |
| 認証 | Flask-Login（セッションベース、パスワードは werkzeug でハッシュ化） |
| DB | SQLite（`instance/u22.db`） |
| テンプレートエンジン | Jinja2 |
| フロントエンド | 素のHTML/CSS/JavaScript（フレームワークなし、ページごとに個別JS/CSSファイル） |
| 地図 | Leaflet.js |
| アイコン | Font Awesome（CDN） |

## 2. ディレクトリ構成

```
IH/
├── app.py               # アプリケーションファクトリ（create_app）・起動エントリポイント
├── extensions.py        # SQLAlchemy / LoginManager のインスタンス定義
├── models.py             # ORMモデル定義（User, Spot, Unlock, Favorite）
├── routes.py              # 全ルーティング定義（register_routes 関数にまとめて登録）
├── get_pref.py            # 住所文字列 → 都道府県名・都道府県キー変換ユーティリティ
├── .env                    # 環境変数（SECRET_KEY）
├── instance/
│   └── u22.db               # SQLite DB本体（Flaskのinstanceフォルダに配置）
├── static/
│   ├── css/                  # ページ単位のスタイルシート（base.css は共通）
│   ├── js/                    # ページ単位のクライアントサイドJS
│   ├── images/                 # アイコンなど静的画像
│   └── uploads/                 # ユーザー投稿画像のアップロード先
├── templates/                   # Jinja2テンプレート（実際にrenderされるHTML）
└── venv/                         # Python仮想環境
```

テンプレートとCSSは1ページ＝1テンプレート＋1CSSファイルの構成（例: `spots.html` ⇔ `static/css/main.css`、`fav.html` ⇔ `static/css/fav.css`）。JSも同様にページ単位（`spot.js`, `fav.js`, `post.js` など）。

> `templates/main.html` はDBと接続していない旧デザインのモックページで、どのルートからも `render_template` されていない（未使用）。

## 3. アプリケーション初期化フロー

```
app.py (create_app)
  ├─ .env 読み込み（load_dotenv）
  ├─ Flask アプリ生成
  │    ├─ SQLALCHEMY_DATABASE_URI = sqlite:///u22.db
  │    ├─ SECRET_KEY = 環境変数から取得
  │    └─ PERMANENT_SESSION_LIFETIME = 5時間
  ├─ db.init_app(app)            … extensions.py の SQLAlchemy を紐付け
  ├─ login_manager.init_app(app)  … extensions.py の LoginManager を紐付け
  │    └─ login_view = "signin"（未ログイン時のリダイレクト先）
  ├─ user_loader 登録（session の user_id → User オブジェクト復元）
  └─ register_routes(app)         … routes.py の全エンドポイントを登録
```

## 4. データモデル

FK制約はDBカラムレベルのみで、SQLAlchemyの `relationship()` は未使用（各ルートで都度 `select()` して取得する設計）。

```
User (users)
 ├─ user_id (PK)
 ├─ user_name / email(unique) / password(hash)
 ├─ bike_type / bike_name / bike_power   … 愛車情報
 ├─ active_time                            … 主な活動時間帯 (morning/day/evening/night)
 └─ ticket_count                           … エリア解放に使うチケット枚数

Spot (spots)                … 投稿されたツーリングスポット
 ├─ spot_id (PK)
 ├─ post_id (FK → users.user_id)            … 投稿者
 ├─ spot_name / location_name / spot_desc
 ├─ time_select                              … おすすめ時間帯
 ├─ level                                    … 難易度 1〜5
 ├─ equipment                                … 設備（gas/food/parking/restroom等をカンマ区切りで保持）
 ├─ photo                                    … static/uploads 配下のファイル名
 └─ latitude / longitude

Unlock (Unlock)             … 都道府県マップの解放履歴
 ├─ id (PK)
 ├─ user_id (FK → users.user_id)
 ├─ pref                                     … 都道府県キー（例: tokyo）
 └─ checkin_date

Favorite (Favorite)          … お気に入り登録
 ├─ id (PK)
 ├─ user_id (FK → users.user_id)
 ├─ spot_id (FK → spots.spot_id)
 └─ add_date
```

**関連**
- `User 1 — N Spot`（投稿）
- `User 1 — N Unlock`（エリア解放）
- `User 1 — N Favorite`（お気に入り）
- `Spot 1 — N Favorite`

`Spot` を削除する際は `Favorite` に外部キー制約があり ON DELETE CASCADE が設定されていないため、`post_delete` ルート内でアプリ側から先に関連 `Favorite` を削除している。

## 5. ルーティング一覧（routes.py）

すべて `register_routes(app)` 内にまとめて定義。`@login_required` は Flask-Login によるログインガード。

| Method | Path | 認証 | 説明 |
|---|---|:---:|---|
| GET | `/` | - | トップページ (`index.html`) |
| GET/POST | `/signup` | - | 新規登録（バリデーション → メール重複チェック → ハッシュ化保存） |
| GET/POST | `/signin` | - | ログイン（成功時 `session.permanent=True` で5時間保持） |
| GET | `/dashboard` | ✓ | ホーム画面（愛車情報・チケット枚数表示） |
| GET | `/spots` | ✓ | 全スポット一覧＋地図（お気に入り状態・解放エリアも付与） |
| GET/POST | `/post` | ✓ | スポット投稿フォーム／投稿処理（画像アップロード必須、投稿ごとにチケット+1） |
| GET | `/favorite` | ✓ | お気に入り一覧 |
| POST | `/favorite/toggle/<spot_id>` | ✓ | お気に入りON/OFF切替。`X-Requested-With: XMLHttpRequest` の場合はJSONを返しページ遷移なし、それ以外は従来通りリダイレクト |
| GET/POST | `/map` | ✓ | 都道府県マップ表示／チケット消費でエリア解放（POSTはJSON応答） |
| GET | `/settings` | ✓ | 設定メニュー |
| GET | `/logout` | ✓ | ログアウト |
| GET/POST | `/profile_edit` | ✓ | ユーザー名編集 |
| GET/POST | `/garage_edit` | ✓ | 愛車情報編集 |
| GET/POST | `/password_edit` | ✓ | パスワード変更（変更後ログアウトへ） |
| GET/POST | `/post_list` | ✓ | 自分の投稿一覧／POSTで該当投稿の編集画面を表示 |
| POST | `/post_edit` | ✓ | 投稿内容の更新 |
| POST | `/post_delete/<spot_id>` | ✓ | 投稿削除（所有者チェック後、関連Favoriteも削除してからSpotを削除） |
| GET/POST | `/withdraw` | ✓ | 退会（パスワード確認後アカウント削除） |

## 6. 主要な画面フロー

```
signup / signin
      │
      ▼
  dashboard（home.html）
      │
      ├─ spots ──(お気に入りトグル / 詳細モーダル)──▶ favorite
      ├─ post ──(投稿)──▶ post_list ──(編集/削除)──▶ post_edit
      ├─ map ──(チケット消費でエリア解放)
      └─ settings ── profile_edit / garage_edit / password_edit / withdraw
```

## 7. フロントエンド実装メモ

- お気に入りボタン（`spots.html` のカード／モーダル、`fav.html` の一覧）は `fetch` によるAjax送信で実装（`static/js/spot.js`, `static/js/fav.js`）。`/favorite/toggle/<spot_id>` に `X-Requested-With: XMLHttpRequest` ヘッダー付きでPOSTし、レスポンスのJSON (`favorited`) を見てDOMのクラスだけ切り替える。ページ全体のリロードは発生しない。
- `fav.html` でお気に入り解除した場合はカードをフェードアウトさせてDOMから削除し、件数バッジを更新。0件になった場合は空状態UIをJS側で描画する。
- `post_edit.html` の「投稿を削除」ボタンは確認モーダル（`.delete-modal-overlay`）を表示し、確認後に `/post_delete/<spot_id>` へPOSTする。

## 8. 環境変数

`.env`（リポジトリ直下、Git管理対象外推奨）

| 変数 | 用途 |
|---|---|
| `SECRET_KEY` | Flaskセッション署名用シークレットキー |

## 9. 既知の留意点

- `templates/main.html` / `static/css/main.css` の一部クラス（`.card-tags` の絶対配置指定）は現行デザインでは未使用の古いレイアウトに依存しており、`main.html` 自体がどのルートからも参照されない死んだテンプレートになっている。
- ORMに `relationship()` を定義していないため、関連データの取得は各ルートで個別に `select()` している（N+1的な取得コードがルートごとに重複しやすい）。
- 画像アップロードは拡張子チェックのみ（`ALLOWED_EXTENSIONS` は定義されているが実際のバリデーションには未使用）。
