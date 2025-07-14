from app import db
from datetime import datetime
from enum import Enum

class UserRole(Enum):
    ORGANIZER = "organizer"
    SPEAKER = "speaker"
    LISTENER = "listener"

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.Enum(UserRole), nullable=False)
    nickname = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 关系
    organized_sessions = db.relationship('Session', foreign_keys='Session.organizer_id', backref='organizer')
    speaker_sessions = db.relationship('Session', foreign_keys='Session.speaker_id', backref='speaker')
    responses = db.relationship('QuizResponse', backref='user')

class Session(db.Model):
    __tablename__ = 'sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    organizer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    speaker_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    is_active = db.Column(db.Boolean, default=False)
    quiz_interval = db.Column(db.Integer, default=10)  # 分钟
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 关系
    contents = db.relationship('Content', backref='session')
    quizzes = db.relationship('Quiz', backref='session')
    participants = db.relationship('SessionParticipant', backref='session')
    
class SessionParticipant(db.Model):
    __tablename__ = 'session_participants'
    
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('sessions.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 建立唯一约束
    __table_args__ = (db.UniqueConstraint('session_id', 'user_id'),)

class Content(db.Model):
    __tablename__ = 'contents'
    
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('sessions.id'), nullable=False)
    content_type = db.Column(db.String(50), nullable=False)  # text, ppt, pdf, audio, video
    original_filename = db.Column(db.String(255))
    file_path = db.Column(db.String(500))
    extracted_text = db.Column(db.Text)
    upload_time = db.Column(db.DateTime, default=datetime.utcnow)

class Quiz(db.Model):
    __tablename__ = 'quizzes'
    
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('sessions.id'), nullable=False)
    question = db.Column(db.Text, nullable=False)
    option_a = db.Column(db.String(500), nullable=False)
    option_b = db.Column(db.String(500), nullable=False)
    option_c = db.Column(db.String(500), nullable=False)
    option_d = db.Column(db.String(500), nullable=False)
    correct_answer = db.Column(db.String(1), nullable=False)  # A, B, C, D
    explanation = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=False)
    time_limit = db.Column(db.Integer, default=30)  # 秒
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 关系
    responses = db.relationship('QuizResponse', backref='quiz')
    discussions = db.relationship('QuizDiscussion', backref='quiz')

class QuizResponse(db.Model):
    __tablename__ = 'quiz_responses'
    
    id = db.Column(db.Integer, primary_key=True)
    quiz_id = db.Column(db.Integer, db.ForeignKey('quizzes.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    answer = db.Column(db.String(1), nullable=False)  # A, B, C, D
    is_correct = db.Column(db.Boolean, nullable=False)
    response_time = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 建立唯一约束
    __table_args__ = (db.UniqueConstraint('quiz_id', 'user_id'),)

class QuizDiscussion(db.Model):
    __tablename__ = 'quiz_discussions'
    
    id = db.Column(db.Integer, primary_key=True)
    quiz_id = db.Column(db.Integer, db.ForeignKey('quizzes.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Feedback(db.Model):
    __tablename__ = 'feedbacks'
    
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('sessions.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    feedback_type = db.Column(db.String(50), nullable=False)  # too_fast, too_slow, boring, bad_question
    content = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
