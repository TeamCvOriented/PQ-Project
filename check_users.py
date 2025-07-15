#!/usr/bin/env python3
"""
检查现有用户数据
"""

import sys
import os

# 添加项目根目录到路径
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

from app import create_app, db
from app.models import User, UserRole

app = create_app()

with app.app_context():
    print("现有用户数据:")
    users = User.query.all()
    for user in users:
        print(f"- {user.username} ({user.role.value}) - {user.email}")
    
    print(f"\n总用户数: {len(users)}")
    print(f"组织者数: {User.query.filter_by(role=UserRole.ORGANIZER).count()}")
    print(f"演讲者数: {User.query.filter_by(role=UserRole.SPEAKER).count()}")
    print(f"听众数: {User.query.filter_by(role=UserRole.LISTENER).count()}")
