#!/usr/bin/env python3
"""
数据库迁移脚本：为QuizResponse表添加answer_duration字段
"""

import sqlite3
import os

def migrate_database():
    """添加answer_duration字段到quiz_responses表"""
    db_path = os.path.join('instance', 'pq_database.db')
    
    if not os.path.exists(db_path):
        print(f"数据库文件不存在: {db_path}")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 检查字段是否已存在
        cursor.execute("PRAGMA table_info(quiz_responses)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'answer_duration' not in columns:
            print("添加answer_duration字段...")
            cursor.execute("ALTER TABLE quiz_responses ADD COLUMN answer_duration REAL")
            conn.commit()
            print("✅ answer_duration字段添加成功")
        else:
            print("✅ answer_duration字段已存在，无需添加")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ 迁移失败: {str(e)}")
        return False

if __name__ == "__main__":
    print("开始数据库迁移...")
    success = migrate_database()
    if success:
        print("🎉 数据库迁移完成！")
    else:
        print("💥 数据库迁移失败！")
