from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from dotenv import load_dotenv
import os

# 加载环境变量
load_dotenv()

# 创建数据库实例
db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    
    # 配置
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'default-secret-key')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///pq_database.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['UPLOAD_FOLDER'] = os.getenv('UPLOAD_FOLDER', 'uploads')
    app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max file size
    
    # 初始化扩展
    db.init_app(app)
    CORS(app)
    
    # 确保上传文件夹存在
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # 注册蓝图
    from .routes.auth import auth_bp
    from .routes.content import content_bp
    from .routes.quiz import quiz_bp
    from .routes.session import session_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(content_bp, url_prefix='/api/content')
    app.register_blueprint(quiz_bp, url_prefix='/api/quiz')
    app.register_blueprint(session_bp, url_prefix='/api/session')
    
    # 注册静态文件路由
    from .routes.static import static_bp
    app.register_blueprint(static_bp)
    
    return app
