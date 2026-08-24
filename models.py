from datetime import datetime
from flask_login import UserMixin
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, Float,Text, DateTime, BigInteger, Enum, ForeignKey
from extensions import db

# ユーザーモデル定義
class User(UserMixin, db.Model):

    __tablename__ = "users"

    # PK
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True
    )

    # ユーザー名
    user_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    # メール（ログインID）
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False
    )

    # パスワード
    password: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    # バイクタイプ
    bike_type: Mapped[str] = mapped_column(
        Enum(
            "アメリカン",
            "ストリート",
            "オールドルック",
            "ミニバイク",
            "ネイキッド",
            "スポーツ/レプリカ",
            "オフロード",
            "スクーター(51cc以上)",
            "スクーター(50cc以下)",
            "ツアラー",
            "アドベンチャー",
            "スクランブラー",
            "コンペティション",
            "トライク",
            "EV"
        ),
        nullable=True
    )

    # 車体名
    bike_name: Mapped[str] = mapped_column(
        String(255),
        nullable=True
    )

    # 排気量
    bike_power: Mapped[int] = mapped_column(
        Integer,
        nullable=True
    )

    # 活動時間帯
    active_time: Mapped[str] = mapped_column(
        Enum(
            "morning", # 朝
            "day",     # 昼間
            "evening", # 夕方
            "night"    # 夜
        ),
        nullable=True
    )

    # 所持チケット枚数
    ticket_count: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False
    )

    def get_id(self):
        return int(self.user_id)


# スポットモデル定義
class Spot(db.Model):
    __tablename__ = "spots"

    # スポットID
    spot_id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True
    )

    # 投稿者ID
    post_id: Mapped[int] = mapped_column(
        BigInteger,
        db.ForeignKey("users.user_id"),
        nullable=False
    )

    # スポット名
    spot_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    # 住所
    location_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    # おすすめ時間帯
    time_select: Mapped[str] = mapped_column(
        String(50),
        nullable=True
    )

    # スポットの説明
    spot_desc: Mapped[str] = mapped_column(
        Text,
        nullable=True
    )

    # 設備
    equipment: Mapped[str] = mapped_column(
        Text,
        nullable=True
    )

    # 道の難易度（1〜5)
    level: Mapped[int] = mapped_column(
        Integer,
        nullable=True
    )

    # 画像パス
    photo: Mapped[str] = mapped_column(
        String(255),
        nullable=True
    )

    #緯度経度
    latitude: Mapped[float] = mapped_column(
        Float(255),
        nullable=True
    )
    longitude: Mapped[float] = mapped_column(
        Float(255),
        nullable=True
    )

# マップ解放モデル定義
class Unlock(db.Model):
    __tablename__ = "Unlock"
      
    id: Mapped[int] = mapped_column(
            BigInteger,
            primary_key=True
        )
    
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.user_id"),
        nullable=False
    )

    pref: Mapped[str] = mapped_column(
        String(5),
        nullable=False
    )

    checkin_date: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
    )

# お気に入りモデル定義
class Favorite(db.Model):
    __tablename__ = "Favorite"
          
    id: Mapped[int] = mapped_column(
            BigInteger,
            primary_key=True
        )
    
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.user_id"),
        nullable=False
    )

    spot_id: Mapped[int] = mapped_column(
            BigInteger,
            ForeignKey("spots.spot_id"),
            nullable=False
        )

    add_date: Mapped[datetime] = mapped_column(
            DateTime,
            nullable=False,
        )
