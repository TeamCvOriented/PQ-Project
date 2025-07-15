from app import create_app, db
from app.models import User, Session, Content, Quiz, QuizResponse, QuizDiscussion, Feedback, SessionParticipant

app = create_app()

if __name__ == '__main__':
    print("正在初始化数据库...")
    with app.app_context():
        db.create_all()
        print("数据库初始化完成")
    
    print("启动 PQ-Project Flask 应用...")
    print("访问地址: http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
