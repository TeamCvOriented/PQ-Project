from flask import Blueprint, request, jsonify, session
from app import db
from app.models import Quiz, QuizResponse, QuizDiscussion, Content, Session as PQSession, Feedback
from app.quiz_generator import QuizGenerator
from app.routes.auth import require_auth
from datetime import datetime

quiz_bp = Blueprint('quiz', __name__)
quiz_generator = QuizGenerator()

@quiz_bp.route('/generate', methods=['POST'])
@require_auth
def generate_quiz():
    """生成题目"""
    data = request.get_json()
    
    if not data or not data.get('session_id'):
        return jsonify({'error': '缺少会话ID'}), 400
    
    session_id = data['session_id']
    num_questions = data.get('num_questions', 1)
    
    # 验证会话存在且用户有权限
    pq_session = PQSession.query.get(session_id)
    if not pq_session:
        return jsonify({'error': '会话不存在'}), 404
    
    # 检查权限（演讲者或组织者）
    user_id = session['user_id']
    if pq_session.speaker_id != user_id and pq_session.organizer_id != user_id:
        return jsonify({'error': '权限不足'}), 403
    
    try:
        # 获取会话的所有内容
        contents = Content.query.filter_by(session_id=session_id).all()
        
        if not contents:
            return jsonify({'error': '会话暂无内容，无法生成题目'}), 400
        
        # 合并所有文本内容
        all_text = '\n\n'.join([content.extracted_text for content in contents if content.extracted_text])
        
        if not all_text.strip():
            return jsonify({'error': '没有有效的文本内容'}), 400
        
        # 生成题目
        quiz_data = quiz_generator.generate_quiz(all_text, num_questions)
        
        if not quiz_data:
            return jsonify({'error': 'AI生成题目失败，请稍后重试'}), 500
        
        # 保存题目到数据库
        saved_quizzes = []
        for quiz_info in quiz_data:
            quiz = Quiz(
                session_id=session_id,
                question=quiz_info['question'],
                option_a=quiz_info['option_a'],
                option_b=quiz_info['option_b'],
                option_c=quiz_info['option_c'],
                option_d=quiz_info['option_d'],
                correct_answer=quiz_info['correct_answer'],
                explanation=quiz_info.get('explanation', ''),
                time_limit=quiz_info.get('time_estimate', 30)
            )
            
            db.session.add(quiz)
            saved_quizzes.append(quiz)
        
        db.session.commit()
        
        # 返回生成的题目
        quiz_list = []
        for quiz in saved_quizzes:
            quiz_list.append({
                'id': quiz.id,
                'question': quiz.question,
                'option_a': quiz.option_a,
                'option_b': quiz.option_b,
                'option_c': quiz.option_c,
                'option_d': quiz.option_d,
                'correct_answer': quiz.correct_answer,
                'explanation': quiz.explanation,
                'time_limit': quiz.time_limit,
                'created_at': quiz.created_at.isoformat()
            })
        
        return jsonify({
            'message': f'成功生成{len(quiz_list)}道题目',
            'quizzes': quiz_list
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'生成题目失败: {str(e)}'}), 500

@quiz_bp.route('/activate', methods=['POST'])
@require_auth
def activate_quiz():
    """激活题目（开始答题）"""
    data = request.get_json()
    
    if not data or not data.get('quiz_id'):
        return jsonify({'error': '缺少题目ID'}), 400
    
    quiz_id = data['quiz_id']
    quiz = Quiz.query.get(quiz_id)
    
    if not quiz:
        return jsonify({'error': '题目不存在'}), 404
    
    # 验证权限
    pq_session = PQSession.query.get(quiz.session_id)
    user_id = session['user_id']
    if pq_session.speaker_id != user_id and pq_session.organizer_id != user_id:
        return jsonify({'error': '权限不足'}), 403
    
    try:
        # 先关闭该会话的其他活跃题目
        Quiz.query.filter_by(session_id=quiz.session_id, is_active=True).update({'is_active': False})
        
        # 激活当前题目
        quiz.is_active = True
        db.session.commit()
        
        return jsonify({
            'message': '题目已激活',
            'quiz': {
                'id': quiz.id,
                'question': quiz.question,
                'option_a': quiz.option_a,
                'option_b': quiz.option_b,
                'option_c': quiz.option_c,
                'option_d': quiz.option_d,
                'time_limit': quiz.time_limit,
                'is_active': quiz.is_active
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'激活题目失败: {str(e)}'}), 500

@quiz_bp.route('/current/<int:session_id>', methods=['GET'])
@require_auth
def get_current_quiz(session_id):
    """获取当前活跃的题目"""
    quiz = Quiz.query.filter_by(session_id=session_id, is_active=True).first()
    
    if not quiz:
        return jsonify({'message': '当前没有活跃的题目'})
    
    # 检查用户是否已经回答过
    user_id = session['user_id']
    response = QuizResponse.query.filter_by(quiz_id=quiz.id, user_id=user_id).first()
    
    quiz_data = {
        'id': quiz.id,
        'question': quiz.question,
        'option_a': quiz.option_a,
        'option_b': quiz.option_b,
        'option_c': quiz.option_c,
        'option_d': quiz.option_d,
        'time_limit': quiz.time_limit,
        'is_active': quiz.is_active,
        'has_answered': response is not None
    }
    
    # 如果已经回答，显示答案和结果
    if response:
        quiz_data.update({
            'user_answer': response.answer,
            'correct_answer': quiz.correct_answer,
            'is_correct': response.is_correct,
            'explanation': quiz.explanation
        })
    
    return jsonify({'quiz': quiz_data})

@quiz_bp.route('/answer', methods=['POST'])
@require_auth
def submit_answer():
    """提交答案"""
    data = request.get_json()
    
    if not data or not data.get('quiz_id') or not data.get('answer'):
        return jsonify({'error': '缺少题目ID或答案'}), 400
    
    quiz_id = data['quiz_id']
    answer = data['answer'].upper()
    
    if answer not in ['A', 'B', 'C', 'D']:
        return jsonify({'error': '答案格式错误'}), 400
    
    quiz = Quiz.query.get(quiz_id)
    if not quiz:
        return jsonify({'error': '题目不存在'}), 404
    
    if not quiz.is_active:
        return jsonify({'error': '题目已关闭'}), 400
    
    user_id = session['user_id']
    
    # 检查是否已经回答过
    existing_response = QuizResponse.query.filter_by(quiz_id=quiz_id, user_id=user_id).first()
    if existing_response:
        return jsonify({'error': '您已经回答过该题目'}), 400
    
    try:
        # 判断答案是否正确
        is_correct = (answer == quiz.correct_answer)
        
        # 保存回答
        response = QuizResponse(
            quiz_id=quiz_id,
            user_id=user_id,
            answer=answer,
            is_correct=is_correct
        )
        
        db.session.add(response)
        db.session.commit()
        
        return jsonify({
            'message': '答案提交成功',
            'is_correct': is_correct,
            'correct_answer': quiz.correct_answer,
            'explanation': quiz.explanation
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'提交答案失败: {str(e)}'}), 500

@quiz_bp.route('/statistics/<int:session_id>', methods=['GET'])
@require_auth
def get_quiz_statistics(session_id):
    """获取题目统计信息"""
    # 验证会话存在
    pq_session = PQSession.query.get(session_id)
    if not pq_session:
        return jsonify({'error': '会话不存在'}), 404
    
    # 获取所有题目及其回答统计
    quizzes = Quiz.query.filter_by(session_id=session_id).all()
    
    quiz_stats = []
    for quiz in quizzes:
        responses = QuizResponse.query.filter_by(quiz_id=quiz.id).all()
        
        total_responses = len(responses)
        correct_responses = sum(1 for r in responses if r.is_correct)
        
        # 选项分布统计
        option_stats = {'A': 0, 'B': 0, 'C': 0, 'D': 0}
        for response in responses:
            option_stats[response.answer] += 1
        
        quiz_stats.append({
            'id': quiz.id,
            'question': quiz.question,
            'correct_answer': quiz.correct_answer,
            'total_responses': total_responses,
            'correct_responses': correct_responses,
            'accuracy_rate': (correct_responses / total_responses * 100) if total_responses > 0 else 0,
            'option_distribution': option_stats,
            'is_active': quiz.is_active,
            'created_at': quiz.created_at.isoformat()
        })
    
    return jsonify({
        'session_id': session_id,
        'quiz_statistics': quiz_stats,
        'total_quizzes': len(quiz_stats)
    })

@quiz_bp.route('/user-stats/<int:session_id>', methods=['GET'])
@require_auth
def get_user_quiz_stats(session_id):
    """获取用户在该会话中的答题统计"""
    user_id = session['user_id']
    
    # 获取用户在该会话中的所有回答
    user_responses = db.session.query(QuizResponse).join(Quiz).filter(
        Quiz.session_id == session_id,
        QuizResponse.user_id == user_id
    ).all()
    
    total_answered = len(user_responses)
    correct_answered = sum(1 for r in user_responses if r.is_correct)
    
    # 计算排名
    all_user_stats = db.session.query(
        QuizResponse.user_id,
        db.func.count(QuizResponse.id).label('total'),
        db.func.sum(db.case([(QuizResponse.is_correct == True, 1)], else_=0)).label('correct')
    ).join(Quiz).filter(Quiz.session_id == session_id).group_by(QuizResponse.user_id).all()
    
    # 按正确率排序
    sorted_stats = sorted(all_user_stats, 
                         key=lambda x: (x.correct / x.total if x.total > 0 else 0), 
                         reverse=True)
    
    user_rank = next((i + 1 for i, stat in enumerate(sorted_stats) if stat.user_id == user_id), None)
    
    return jsonify({
        'user_id': user_id,
        'session_id': session_id,
        'total_answered': total_answered,
        'correct_answered': correct_answered,
        'accuracy_rate': (correct_answered / total_answered * 100) if total_answered > 0 else 0,
        'rank': user_rank,
        'total_participants': len(sorted_stats)
    })

@quiz_bp.route('/feedback', methods=['POST'])
@require_auth
def submit_feedback():
    """提交反馈"""
    data = request.get_json()
    
    if not data or not data.get('session_id') or not data.get('feedback_type'):
        return jsonify({'error': '缺少必要字段'}), 400
    
    try:
        feedback = Feedback(
            session_id=data['session_id'],
            user_id=session['user_id'],
            feedback_type=data['feedback_type'],
            content=data.get('content', '')
        )
        
        db.session.add(feedback)
        db.session.commit()
        
        return jsonify({'message': '反馈提交成功'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'提交反馈失败: {str(e)}'}), 500
