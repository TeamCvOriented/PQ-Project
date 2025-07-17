from flask import Blueprint, render_template, send_from_directory
import os

static_bp = Blueprint('static', __name__)

@static_bp.route('/')
def index():
    """主页"""
    return render_template('index.html')

@static_bp.route('/organizer')
def organizer():
    """组织者页面"""
    return render_template('organizer.html')

@static_bp.route('/speaker')
def speaker():
    """演讲者页面"""
    return render_template('speaker.html')

@static_bp.route('/listener')
def listener():
    """听众页面"""
    return render_template('listener.html')

@static_bp.route('/login')
def login_page():
    """登录页面"""
    return render_template('login.html')

@static_bp.route('/test-upload')
def test_upload():
    """测试上传页面"""
    return render_template('test_upload.html')

@static_bp.route('/register')
def register_page():
    """注册页面"""
    return render_template('register.html')
