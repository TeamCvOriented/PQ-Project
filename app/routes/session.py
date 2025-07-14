from flask import Blueprint, request, jsonify, session
from app import db
from app.models import Session as PQSession, SessionParticipant, User, UserRole
from app.routes.auth import require_auth
from datetime import datetime

session_bp = Blueprint('session', __name__)

@session_bp.route('/create', methods=['POST'])
@require_auth
def create_session():
    """创建新会话（组织者功能）"""
    user_role = session.get('user_role')
    if user_role != 'organizer':
        return jsonify({'error': '只有组织者可以创建会话'}), 403
    
    data = request.get_json()
    
    if not data or not data.get('title') or not data.get('speaker_id'):
        return jsonify({'error': '缺少标题或演讲者ID'}), 400
    
    # 验证演讲者存在
    speaker = User.query.filter_by(id=data['speaker_id'], role=UserRole.SPEAKER).first()
    if not speaker:
        return jsonify({'error': '演讲者不存在'}), 404
    
    try:
        pq_session = PQSession(
            title=data['title'],
            description=data.get('description', ''),
            organizer_id=session['user_id'],
            speaker_id=data['speaker_id'],
            quiz_interval=data.get('quiz_interval', 10)
        )
        
        db.session.add(pq_session)
        db.session.commit()
        
        return jsonify({
            'message': '会话创建成功',
            'session': {
                'id': pq_session.id,
                'title': pq_session.title,
                'description': pq_session.description,
                'organizer_id': pq_session.organizer_id,
                'speaker_id': pq_session.speaker_id,
                'is_active': pq_session.is_active,
                'quiz_interval': pq_session.quiz_interval,
                'created_at': pq_session.created_at.isoformat()
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'创建会话失败: {str(e)}'}), 500

@session_bp.route('/list', methods=['GET'])
@require_auth
def list_sessions():
    """获取会话列表"""
    user_id = session['user_id']
    user_role = session.get('user_role')
    
    if user_role == 'organizer':
        # 组织者查看自己组织的会话
        sessions = PQSession.query.filter_by(organizer_id=user_id).all()
    elif user_role == 'speaker':
        # 演讲者查看自己的会话
        sessions = PQSession.query.filter_by(speaker_id=user_id).all()
    else:
        # 听众查看参与的会话
        participant_sessions = db.session.query(PQSession).join(SessionParticipant).filter(
            SessionParticipant.user_id == user_id
        ).all()
        sessions = participant_sessions
    
    session_list = []
    for s in sessions:
        session_list.append({
            'id': s.id,
            'title': s.title,
            'description': s.description,
            'organizer': s.organizer.username,
            'speaker': s.speaker.username,
            'is_active': s.is_active,
            'quiz_interval': s.quiz_interval,
            'created_at': s.created_at.isoformat(),
            'participant_count': len(s.participants)
        })
    
    return jsonify({
        'sessions': session_list,
        'total': len(session_list)
    })

@session_bp.route('/<int:session_id>', methods=['GET'])
@require_auth
def get_session(session_id):
    """获取会话详情"""
    pq_session = PQSession.query.get(session_id)
    if not pq_session:
        return jsonify({'error': '会话不存在'}), 404
    
    # 获取参与者列表
    participants = []
    for participant in pq_session.participants:
        participants.append({
            'id': participant.user_id,
            'username': User.query.get(participant.user_id).username,
            'nickname': User.query.get(participant.user_id).nickname,
            'joined_at': participant.joined_at.isoformat()
        })
    
    return jsonify({
        'id': pq_session.id,
        'title': pq_session.title,
        'description': pq_session.description,
        'organizer': {
            'id': pq_session.organizer_id,
            'username': pq_session.organizer.username
        },
        'speaker': {
            'id': pq_session.speaker_id,
            'username': pq_session.speaker.username
        },
        'is_active': pq_session.is_active,
        'quiz_interval': pq_session.quiz_interval,
        'created_at': pq_session.created_at.isoformat(),
        'participants': participants,
        'participant_count': len(participants)
    })

@session_bp.route('/<int:session_id>/join', methods=['POST'])
@require_auth
def join_session(session_id):
    """加入会话（听众功能）"""
    user_id = session['user_id']
    user_role = session.get('user_role')
    
    if user_role != 'listener':
        return jsonify({'error': '只有听众可以加入会话'}), 403
    
    pq_session = PQSession.query.get(session_id)
    if not pq_session:
        return jsonify({'error': '会话不存在'}), 404
    
    # 检查是否已经参与
    existing_participant = SessionParticipant.query.filter_by(
        session_id=session_id, 
        user_id=user_id
    ).first()
    
    if existing_participant:
        return jsonify({'message': '您已经参与了该会话'})
    
    try:
        participant = SessionParticipant(
            session_id=session_id,
            user_id=user_id
        )
        
        db.session.add(participant)
        db.session.commit()
        
        return jsonify({'message': '成功加入会话'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'加入会话失败: {str(e)}'}), 500

@session_bp.route('/<int:session_id>/leave', methods=['POST'])
@require_auth
def leave_session(session_id):
    """离开会话"""
    user_id = session['user_id']
    
    participant = SessionParticipant.query.filter_by(
        session_id=session_id,
        user_id=user_id
    ).first()
    
    if not participant:
        return jsonify({'error': '您未参与该会话'}), 404
    
    try:
        db.session.delete(participant)
        db.session.commit()
        
        return jsonify({'message': '已离开会话'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'离开会话失败: {str(e)}'}), 500

@session_bp.route('/<int:session_id>/activate', methods=['POST'])
@require_auth
def activate_session(session_id):
    """激活/停用会话"""
    pq_session = PQSession.query.get(session_id)
    if not pq_session:
        return jsonify({'error': '会话不存在'}), 404
    
    # 验证权限（组织者或演讲者）
    user_id = session['user_id']
    if pq_session.organizer_id != user_id and pq_session.speaker_id != user_id:
        return jsonify({'error': '权限不足'}), 403
    
    data = request.get_json()
    is_active = data.get('is_active', not pq_session.is_active)
    
    try:
        pq_session.is_active = is_active
        db.session.commit()
        
        status = '激活' if is_active else '停用'
        return jsonify({
            'message': f'会话已{status}',
            'is_active': is_active
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'操作失败: {str(e)}'}), 500

@session_bp.route('/<int:session_id>/speakers', methods=['GET'])
@require_auth
def get_available_speakers():
    """获取可用的演讲者列表"""
    user_role = session.get('user_role')
    if user_role != 'organizer':
        return jsonify({'error': '权限不足'}), 403
    
    speakers = User.query.filter_by(role=UserRole.SPEAKER).all()
    
    speaker_list = []
    for speaker in speakers:
        speaker_list.append({
            'id': speaker.id,
            'username': speaker.username,
            'email': speaker.email,
            'nickname': speaker.nickname
        })
    
    return jsonify({
        'speakers': speaker_list,
        'total': len(speaker_list)
    })

@session_bp.route('/<int:session_id>/update', methods=['PUT'])
@require_auth
def update_session(session_id):
    """更新会话信息"""
    pq_session = PQSession.query.get(session_id)
    if not pq_session:
        return jsonify({'error': '会话不存在'}), 404
    
    # 验证权限（只有组织者可以更新）
    user_id = session['user_id']
    if pq_session.organizer_id != user_id:
        return jsonify({'error': '只有组织者可以更新会话信息'}), 403
    
    data = request.get_json()
    
    try:
        if 'title' in data:
            pq_session.title = data['title']
        if 'description' in data:
            pq_session.description = data['description']
        if 'quiz_interval' in data:
            pq_session.quiz_interval = data['quiz_interval']
        if 'speaker_id' in data:
            # 验证新演讲者存在
            speaker = User.query.filter_by(id=data['speaker_id'], role=UserRole.SPEAKER).first()
            if not speaker:
                return jsonify({'error': '演讲者不存在'}), 404
            pq_session.speaker_id = data['speaker_id']
        
        db.session.commit()
        
        return jsonify({
            'message': '会话信息更新成功',
            'session': {
                'id': pq_session.id,
                'title': pq_session.title,
                'description': pq_session.description,
                'speaker_id': pq_session.speaker_id,
                'quiz_interval': pq_session.quiz_interval
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'更新失败: {str(e)}'}), 500
