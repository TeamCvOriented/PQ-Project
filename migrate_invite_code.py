#!/usr/bin/env python3
"""
数据库迁移脚本：为现有会话添加邀请码字段
"""

import sys
import os
import random
import string

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app, db
from app.models import Session

def generate_unique_invite_code():
    """生成唯一的6位数字邀请码"""
    while True:
        invite_code = ''.join(random.choices(string.digits, k=6))
        if not Session.query.filter_by(invite_code=invite_code).first():
            return invite_code

def migrate_database():
    """执行数据库迁移"""
    app = create_app()
    
    with app.app_context():
        print("开始数据库迁移...")
        
        try:
            # 首先尝试添加列（如果不存在）
            from sqlalchemy import text
            
            # 检查列是否已存在
            result = db.engine.execute(text("""
                SELECT COUNT(*) 
                FROM pragma_table_info('sessions') 
                WHERE name='invite_code'
            """))
            
            column_exists = result.fetchone()[0] > 0
            
            if not column_exists:
                print("添加 invite_code 列...")
                db.engine.execute(text("ALTER TABLE sessions ADD COLUMN invite_code VARCHAR(6)"))
                
                # 为现有会话生成邀请码
                sessions = Session.query.all()
                print(f"为 {len(sessions)} 个现有会话生成邀请码...")
                
                for session in sessions:
                    if not session.invite_code:
                        session.invite_code = generate_unique_invite_code()
                        print(f"会话 '{session.title}' 分配邀请码: {session.invite_code}")
                
                # 提交更改
                db.session.commit()
                print("邀请码生成完成！")
                
                # 添加唯一约束
                print("添加唯一约束...")
                db.engine.execute(text("CREATE UNIQUE INDEX idx_sessions_invite_code ON sessions(invite_code)"))
                print("唯一约束添加完成！")
                
            else:
                print("invite_code 列已存在，检查是否有空的邀请码...")
                
                # 为没有邀请码的会话生成邀请码
                sessions_without_code = Session.query.filter(
                    (Session.invite_code == None) | (Session.invite_code == '')
                ).all()
                
                if sessions_without_code:
                    print(f"为 {len(sessions_without_code)} 个会话生成缺失的邀请码...")
                    for session in sessions_without_code:
                        session.invite_code = generate_unique_invite_code()
                        print(f"会话 '{session.title}' 分配邀请码: {session.invite_code}")
                    
                    db.session.commit()
                    print("缺失邀请码生成完成！")
                else:
                    print("所有会话都已有邀请码。")
            
            print("数据库迁移完成！")
            
        except Exception as e:
            print(f"迁移过程中出错: {str(e)}")
            db.session.rollback()
            raise

if __name__ == '__main__':
    migrate_database()
