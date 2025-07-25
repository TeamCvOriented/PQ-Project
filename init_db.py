"""
初始化数据库和创建示例数据
"""
from app import create_app, db
from app.models import User, UserRole
from werkzeug.security import generate_password_hash

def init_database():
    """初始化数据库"""
    app = create_app()
    
    with app.app_context():
        # 创建所有表
        db.create_all()
        
        # 检查是否已有用户数据
        if User.query.count() == 0:
            # 创建示例用户
            users = [
                {
                    'username': 'admin',
                    'email': 'admin@popquiz.com',
                    'password': 'admin123',
                    'role': UserRole.ORGANIZER,
                    'nickname': '系统管理员'
                },
                {
                    'username': 'speaker1',
                    'email': 'speaker1@popquiz.com',
                    'password': 'speaker123',
                    'role': UserRole.SPEAKER,
                    'nickname': '张教授'
                },
                {
                    'username': 'speaker2',
                    'email': 'speaker2@popquiz.com',
                    'password': 'speaker123',
                    'role': UserRole.SPEAKER,
                    'nickname': '李博士'
                },
                {
                    'username': 'listener1',
                    'email': 'listener1@popquiz.com',
                    'password': 'listener123',
                    'role': UserRole.LISTENER,
                    'nickname': '小明'
                },
                {
                    'username': 'listener2',
                    'email': 'listener2@popquiz.com',
                    'password': 'listener123',
                    'role': UserRole.LISTENER,
                    'nickname': '小红'
                },
                {
                    'username': 'listener3',
                    'email': 'listener3@popquiz.com',
                    'password': 'listener123',
                    'role': UserRole.LISTENER,
                    'nickname': '小李'
                }
            ]
            
            for user_data in users:
                user = User(
                    username=user_data['username'],
                    email=user_data['email'],
                    password_hash=generate_password_hash(user_data['password']),
                    role=user_data['role'],
                    nickname=user_data['nickname']
                )
                db.session.add(user)
            
            db.session.commit()
            print("示例用户创建成功！")
            print("\n用户账户信息：")
            print("组织者：admin / admin123")
            print("演讲者：speaker1 / speaker123, speaker2 / speaker123")
            print("听众：listener1 / listener123, listener2 / listener123, listener3 / listener123")
        else:
            print("数据库已初始化，跳过示例数据创建")

if __name__ == '__main__':
    init_database()
