from app import create_app, db
from app.models import User, Session, Content, Quiz, QuizResponse, QuizDiscussion, Feedback, SessionParticipant

app = create_app()

@app.before_first_request
def create_tables():
    """创建数据库表"""
    db.create_all()

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='0.0.0.0', port=5000)
