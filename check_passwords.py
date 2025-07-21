#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.models import User
from werkzeug.security import check_password_hash

app = create_app()

with app.app_context():
    print("=== 检查用户登录信息 ===")
    
    users = User.query.all()
    for user in users:
        print(f"用户: {user.username}")
        print(f"邮箱: {user.email}")
        print(f"角色: {user.role.value}")
        print(f"密码哈希: {user.password_hash[:20]}...")
        
        # 测试密码
        test_passwords = ['password123', 'password', '123456', 'admin', 'listener123', 'speaker123', 'admin123']
        for pwd in test_passwords:
            if check_password_hash(user.password_hash, pwd):
                print(f"  密码: {pwd} ✓")
                break
        else:
            print("  密码: 未找到匹配的密码")
        print("---")
