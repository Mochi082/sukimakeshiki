from flask import (render_template, request, redirect, url_for, flash, session, jsonify)
from flask_login import (login_user, login_required,logout_user, current_user)
from sqlalchemy import select
from werkzeug.security import (generate_password_hash,check_password_hash)
from extensions import db
from models import User, Spot, Unlock, Favorite
from get_pref import get_prefecture, get_prefecture_key
from datetime import datetime
import os
import json
import uuid
import base64


# 画像保存先
UPLOAD_FOLDER = os.path.join('static', 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'heic'}

def register_routes(app):

    @app.route('/')
    def index():
        return render_template('index.html')

    @app.route('/signup', methods=['GET', 'POST'])
    def signup():
        if request.method == 'GET':
            return render_template('signup.html')

        user_name  = request.form['user_name']
        email      = request.form['email']
        password   = request.form['password']
        password2  = request.form['password2']
        bike_type  = request.form['bike_type']
        bike_name  = request.form['bike_name']
        bike_power = request.form['bike_power']
        active_time = request.form['activity_time']

        # フラッシュメッセージ -114
        form_data = {
        'user_name': user_name,
        'email': email,
        'bike_type': bike_type,
        'bike_name': bike_name,
        'bike_power': bike_power,
        'active_time': active_time
        }

        # ユーザー名
        if not user_name:
            flash('ユーザー名を入力してください。')
            return render_template('signup.html', **form_data)

        # メールアドレス
        if not email:
            flash('メールアドレスを入力してください。')
            return render_template('signup.html', **form_data)

        if '@' not in email:
            flash('メールアドレスに＠を含めてください。')
            form_data['email'] = ''
            return render_template('signup.html', **form_data)

        # メールアドレスの重複チェック
        stmt = select(User).where(User.email == email)
        user = db.session.scalar(stmt)
        if user:
            flash('このメールアドレスは既に存在します。')
            form_data['email'] = ''
            return render_template('signup.html', **form_data)

        # パスワード
        if not password:
            flash('パスワードを入力してください。')
            return render_template('signup.html', **form_data)

        if len(password) < 8:
            flash('パスワードは8文字以上で入力してください。')
            return render_template('signup.html', **form_data)

        # パスワード確認
        if not password2:
            flash('パスワードを２回入力してください。')
            return render_template('signup.html', **form_data)

        if password != password2:
            flash('パスワードが不一致です。')
            return render_template('signup.html', **form_data)

        # バイクの種類
        if not bike_type or bike_type == 'default':
            flash('バイクの種類を選択してください')
            return render_template('signup.html', **form_data)

        # 車体名
        if not bike_name:
            flash('車体名を入力してください。')
            return render_template('signup.html', **form_data)

        # 排気量
        if not bike_power:
            flash('排気量を入力してください。')
            return render_template('signup.html', **form_data)

        if not bike_power.isascii() or not bike_power.isdigit():
            flash('排気量は半角で入力してください。')
            form_data['bike_power'] = ''
            return render_template('signup.html', **form_data)

        # 活動時間帯
        if not active_time or active_time == 'default':
            flash('活動時間帯を選択してください。')
            return render_template('signup.html', **form_data)

        # パスワードのハッシュ化
        hashed_password = generate_password_hash(password)

        first_ticket = 0

        user = User(
            user_name=user_name,
            email=email,
            password=hashed_password,
            bike_type=bike_type,
            bike_name=bike_name,
            bike_power=bike_power,
            active_time=active_time,
            ticket_count=first_ticket
        )
        db.session.add(user)
        db.session.commit()
        default_area = Unlock(pref="tokyo", checkin_date=datetime.now())
        db.session.add(default_area)
        flash('アカウントが作成されました。')
        return redirect(url_for('signin'))

    @app.route('/signin', methods=['GET', 'POST'])
    def signin():
        if request.method == 'GET':
            return render_template('signin.html')

        email    = request.form['email']
        password = request.form['password']

        # メールアドレス未入力
        if not email:
            flash('メールアドレスを入力してください。')
            return render_template('signin.html')

        # メールアドレス形式
        if '@' not in email:
            flash('メールアドレスに＠を含めてください。')
            return render_template('signin.html')

        # パスワード未入力
        if not password:
            flash('パスワードを入力してください。')
            return render_template('signin.html', email=email)

        # ユーザー情報の取得
        stmt = select(User).where(User.email == email)
        user = db.session.scalar(stmt)

        if user and check_password_hash(user.password, password):
            session.clear()
            login_user(user)
            session.permanent = True #session有効期限設定
            return redirect(url_for('dashboard'))
        else:
            flash('emailまたはpasswordが異なります。')
            return render_template('signin.html')

    @app.route('/dashboard')
    @login_required
    def dashboard():
        bike_type  = current_user.bike_type
        bike_name  = current_user.bike_name
        bike_power = current_user.bike_power
        match current_user.active_time:
            case "morning":
                active_time = "朝"
            case "day":
                active_time = "昼"
            case "evening":
                active_time = "夕方"
            case "night":
                active_time = "夜"
            case _:
                active_time = "未設定"

        return render_template('home.html', bike_type=bike_type, bike_name=bike_name, bike_power=bike_power, active_time=active_time, ticket_count=current_user.ticket_count)

    @app.route('/spots')
    @login_required
    def spots():
        spots_db = db.session.scalars(select(Spot)).all()
        posts = []
        for spot in spots_db:
            posts.append({
                "id": spot.spot_id,
                "user_id": spot.post_id,
                "name": spot.spot_name,
                "desc": spot.spot_desc,
                "photo": spot.photo,
                "difficulty": spot.level,
                "facilities": spot.equipment or "",
                "location": spot.location_name,
                "pref": get_prefecture(spot.location_name),
                "pref_key": get_prefecture_key(get_prefecture(spot.location_name)),
                "lat": spot.latitude,
                "lng": spot.longitude,
                "time_select": spot.time_select,
            })

        unlocked = db.session.scalars(select(Unlock.pref).where(Unlock.user_id == current_user.user_id)).all()
        favorited_ids = [int(sid) for sid in db.session.scalars(select(Favorite.spot_id).where(Favorite.user_id == current_user.user_id)).all()]
        return render_template('spots.html', posts=posts, unlocked=unlocked, favorited_ids=favorited_ids, ticket_count=current_user.ticket_count)

    @app.route('/post', methods=['GET','POST'])
    @login_required
    def post():
        if request.method == 'GET':
            return render_template('post.html', ticket_count=current_user.ticket_count)

        spot_name = request.form['name']
        time_select = request.form['time']
        spot_desc  = request.form.get('desc', '')
        location_name = request.form.get('address', '')
        level = int(request.form.get('difficulty', 0))
        equipment = request.form.get('facilities', '')
        photo = request.files['photo']
        latitude = request.form.get('lat', '')
        longitude = request.form.get('lng', '')
        current_user.ticket_count += 1


        # フラッシュメッセージ -261
        form_data = {
            'name': spot_name,
            'time': time_select,
            'desc': spot_desc,
            'address': location_name,
            'difficulty': level,
            'facilities': equipment,
        }

        # スポット名
        if not spot_name:
            flash('スポット名を入力してください。')
            return render_template('post.html', **form_data)

        # おすすめ時間帯
        if not time_select or time_select == 'default':
            flash('おすすめ時間帯を選択してください。')
            return render_template('post.html', **form_data)

        photo_filename = None
        if photo and photo.filename:
            ext = photo.filename.rsplit('.', 1)[1].lower()
            unique_name = f"{uuid.uuid4().hex}.{ext}"
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)
            photo.save(os.path.join(UPLOAD_FOLDER, unique_name))
            photo_filename = unique_name
        else:
            flash('画像が正しくアップロードされませんでした。')
            return render_template('post.html', **form_data)

        # おすすめ時間帯
        if level == 0:
            flash('難易度を選択してください。')
            return render_template('post.html', **form_data)

        spot = Spot(
            post_id = current_user.user_id,
            spot_name = spot_name,
            time_select = time_select,
            spot_desc = spot_desc,
            location_name = location_name,
            level = level,
            equipment = equipment,
            photo = photo_filename,
            latitude = latitude,
            longitude = longitude
        )
        db.session.add(spot)
        db.session.commit()

        return redirect(url_for('post'))

    @app.route('/favorite', methods=['GET'])
    @login_required
    def favorite():
        spots_db = db.session.scalars(select(Spot).join(Favorite, Favorite.spot_id == Spot.spot_id).where(Favorite.user_id == current_user.user_id)).all()
        posts = []
        for spot in spots_db:
            pref_name = get_prefecture(spot.location_name)
            pref_key = get_prefecture_key(pref_name)
            posts.append({
                "id": spot.spot_id,
                "name": spot.spot_name,
                "desc": spot.spot_desc,
                "photo": spot.photo,
                "difficulty": spot.level,
                "facilities": spot.equipment or "",
                "location": spot.location_name,
                "pref": pref_name,
                "pref_key": pref_key,
                "lat": spot.latitude,
                "lng": spot.longitude,
                "time_select": spot.time_select,
                "posted_at": spot.posted_at.strftime("%Y/%m/%d") if hasattr(spot, "posted_at") and spot.posted_at else ""
            })
        return render_template('fav.html',posts=posts, ticket_count=current_user.ticket_count)

    @app.route('/favorite/toggle/<int:spot_id>', methods=['POST'])
    @login_required
    def favorite_toggle(spot_id):
        stmt = select(Favorite).where(Favorite.user_id == current_user.user_id, Favorite.spot_id == spot_id)
        fav = db.session.scalar(stmt)

        if fav:
            db.session.delete(fav)
            favorited = False
        else:
            db.session.add(Favorite(user_id=current_user.user_id, spot_id=spot_id, add_date=datetime.now()))
            favorited = True
        db.session.commit()

        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return jsonify({'favorited': favorited})
        return redirect(request.referrer)

    @app.route('/map', methods=['GET','POST'])
    @login_required
    def map():
        if request.method == 'GET':
            stmt = select(Unlock).where(Unlock.user_id == current_user.user_id)
            areas = db.session.scalars(stmt).all()
            unlocked = [i.pref for i in areas]
            checkins = {j.pref: j.checkin_date for j in areas}
            ticket_count = current_user.ticket_count
            return render_template('map.html', unlocked=unlocked, checkins=checkins, ticket_count=ticket_count)

        if current_user.ticket_count < 1:
            flash('チケット残高がありません')
            return redirect(url_for('map'))

        pref = request.form['pref']
        today = datetime.now()
        area = Unlock(user_id=current_user.user_id, pref=pref, checkin_date=today)
        db.session.add(area)
        current_user.ticket_count -= 1
        db.session.commit()
        return jsonify({'pref': pref, 'date': today.strftime('%Y/%m/%d'), 'ticket_count':current_user.ticket_count})

    @app.route('/settings')
    @login_required
    def settings():
        return render_template('settings.html', ticket_count=current_user.ticket_count)
    
    @app.route('/logout')
    @login_required
    def logout():
        logout_user()
        session.clear()
        flash('ログアウトしました。')
        return redirect(url_for('signin'))
        
    @app.route('/profile_edit', methods=['GET','POST'])
    @login_required
    def profile_edit():
        if request.method == 'GET':
            return render_template('profile_edit.html')

        # フラッシュメッセージ　-368
        user_name  = request.form['user_name']

        # ユーザー名
        if not user_name:
            flash('ユーザー名を入力してください。')
            return render_template('profile_edit.html')

        current_user.user_name = user_name
        db.session.commit()
        return redirect(url_for('dashboard'))
    
    @app.route('/garage_edit', methods=['GET','POST'])
    @login_required
    def garage_edit():
        if request.method == 'GET':
            return render_template('garage_edit.html')

        # フラッシュメッセージ -402
        bike_name = request.form['bike_name']
        bike_power = request.form['engine']

        form_data = {
            'bike_name': bike_name,
            'bike_power': bike_power,
            }

        # 車体名
        if not bike_name:
            flash('車体名を入力してください。')
            return render_template('garage_edit.html', **form_data)

        # 排気量
        if not bike_power:
            flash('排気量を入力してください。')
            return render_template('garage_edit.html', **form_data)

        if not bike_power.isascii() or not bike_power.isdigit():
            flash('排気量は半角で入力してください。')
            form_data['bike_power'] = ''
            return render_template('garage_edit.html', **form_data)
        
        current_user.bike_type = request.form['bike_type']
        current_user.bike_name = bike_name
        current_user.bike_power = bike_power
        current_user.active_time = request.form['activity_time']
        db.session.commit()
        return redirect(url_for('dashboard'))
        
    @app.route('/password_edit', methods=['GET','POST'])
    @login_required
    def password_edit():
        if request.method == 'GET':
            return render_template('password_edit.html')

        # フラッシュメッセージ -447
        current_password = request.form['current_password']
        new_password = request.form['new_password']
        new_password2 = request.form['new_password2']

        # 現在のパスワード
        if not current_password:
            flash('現在のパスワードを入力してください。')
            return render_template('password_edit.html')

        if not check_password_hash(current_user.password, current_password):
            flash('パスワードが違います。')
            return render_template('password_edit.html')

        # 新しいパスワード
        if not new_password:
            flash('新しいパスワードを入力してください。')
            return render_template('password_edit.html')

        if len(new_password) < 8:
            flash('新しいパスワードは8文字以上で入力してください。')
            return render_template('password_edit.html')

        # 確認用パスワード
        if not new_password2:
            flash('確認用パスワードを入力してください。')
            return render_template('password_edit.html')

        if new_password != new_password2:
            flash('新しいパスワードと確認用パスワードが不一致です。')
            return render_template('password_edit.html')

        current_user.password = generate_password_hash(new_password)
        db.session.commit()
        flash('パスワードが変更されました')
        return redirect(url_for('logout'))

    @app.route('/post_list', methods=['GET','POST'])
    @login_required
    def post_list():
        if request.method == 'GET':
            posts = db.session.scalars(select(Spot).where(Spot.post_id == current_user.user_id)).all()
            return render_template('post_list.html', posts=posts, ticket_count=current_user.ticket_count)

        spot_id = request.form['spot_id']
        post = db.session.scalar(select(Spot).where(Spot.spot_id == spot_id))
        if post.post_id == current_user.user_id:
            return render_template('post_edit.html', post=post)

        return redirect(url_for('post_list'))

    @app.route('/post_edit', methods=['POST'])
    @login_required
    def post_edit():
        spot_name = request.form['name']
        time_select = request.form['time']
        
        form_data = {
            'name': spot_name,
            'time': time_select
            }
                
        # スポット名
        if not spot_name:
            flash('スポット名を入力してください。')
            return render_template('post_edit.html', post=spot,**form_data)
                
        # おすすめ時間帯
        if not time_select or time_select == 'default':
            flash('おすすめ時間帯を選択してください。')
            return render_template('post_edit.html', post=spot,**form_data)

        spot_id = request.form['spot_id']
        spot = db.session.scalar(select(Spot).where(Spot.spot_id == spot_id, Spot.post_id == current_user.user_id))
        spot.spot_name = spot_name
        spot.time_select = time_select
        spot.spot_desc = request.form["desc"]
        spot.latitude = request.form["lat"]
        spot.longitude = request.form["lng"]
        spot.location_name = request.form["address"]
        spot.level = request.form["difficulty"]
        spot.equipment = request.form["facilities"]
        photo = request.form.get('photo')
        if photo and photo.filename:
            ext = photo.filename.rsplit('.', 1)[1].lower()
            unique_name = f"{uuid.uuid4().hex}.{ext}"
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)
            photo.save(os.path.join(UPLOAD_FOLDER, unique_name))
            spot.photo = unique_name
        db.session.commit()
        return redirect(url_for('post_list'))

    @app.route('/post_delete/<int:spot_id>', methods=['POST'])
    @login_required
    def post_delete(spot_id):
        spot = db.session.scalar(select(Spot).where(Spot.spot_id == spot_id, Spot.post_id == current_user.user_id))
        if spot:
            favs = db.session.scalars(select(Favorite).where(Favorite.spot_id == spot_id)).all()
            for fav in favs:
                db.session.delete(fav)
            db.session.delete(spot)
            db.session.commit()
        return redirect(url_for('post_list'))

    @app.route('/withdraw', methods=['GET','POST'])
    @login_required
    def withdraw():
        if request.method == 'GET':
            return render_template('withdraw.html')

        # フラッシュメッセージ -528
        password = request.form['password']
        
        # パスワード未入力
        if not password:
            flash('パスワードを入力してください。')
            return render_template('withdraw.html')

        # パスワード不一致
        if not check_password_hash(current_user.password, password):
            flash('パスワードが違います。')
            return render_template('withdraw.html')
        
        delete_user = current_user._get_current_object()
        logout_user()
        db.session.delete(delete_user)
        db.session.commit()
        flash('アカウントを削除しました。')
        return redirect(url_for('signup'))