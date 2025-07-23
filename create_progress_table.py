"""
创建用户答题进度表
"""
import sys
sys.path.append('.')

from app import create_app, db
from app.models import UserQuizProgress

def create_progress_table():
    """创建用户答题进度表"""
    print("📊 创建用户答题进度表...")
    
    app = create_app()
    with app.app_context():
        try:
            # 创建新表
            db.create_all()
            print("✅ UserQuizProgress 表创建成功")
            
            # 验证表是否存在
            from sqlalchemy import inspect
            inspector = inspect(db.engine)
            tables = inspector.get_table_names()
            
            if 'user_quiz_progress' in tables:
                print("✅ 表已存在于数据库中")
                
                # 显示表结构
                columns = inspector.get_columns('user_quiz_progress')
                print("\n表结构:")
                for col in columns:
                    print(f"  - {col['name']}: {col['type']}")
            else:
                print("❌ 表创建失败")
                
        except Exception as e:
            print(f"❌ 创建表失败: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    create_progress_table()
