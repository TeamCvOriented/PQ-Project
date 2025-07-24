from flask import Blueprint, request, jsonify, session, current_app
from app import db
from app.models import Quiz, QuizResponse, QuizDiscussion, Content, Session as PQSession, Feedback, UserQuizProgress, User
from app.routes.auth import require_auth
from datetime import datetime

quiz_bp = Blueprint('quiz', __name__)

# 延迟导入测验生成器以避免依赖问题
_quiz_generator = None

def get_quiz_generator():
    """获取测验生成器实例（延迟初始化）"""
    global _quiz_generator
    if _quiz_generator is None:
        try:
            from app.quiz_generator import QuizGenerator
            _quiz_generator = QuizGenerator()
        except Exception as e:
            print(f"警告：测验生成器初始化失败: {e}")
            _quiz_generator = False
    return _quiz_generator if _quiz_generator is not False else None

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
        quiz_generator = get_quiz_generator()
        if not quiz_generator:
            return jsonify({'error': 'AI服务暂时不可用'}), 503
            
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

@quiz_bp.route('/answer', methods=['POST'])
@require_auth
def submit_answer():
    """提交答案"""
    data = request.get_json()
    
    if not data or not data.get('quiz_id') or not data.get('answer'):
        return jsonify({'error': '缺少题目ID或答案'}), 400
    
    quiz_id = data['quiz_id']
    answer = data['answer'].upper()
    user_id = session['user_id']
    
    if answer not in ['A', 'B', 'C', 'D']:
        return jsonify({'error': '答案格式错误'}), 400
    
    quiz = Quiz.query.get(quiz_id)
    if not quiz:
        return jsonify({'error': '题目不存在'}), 404
    
    # 检查用户是否已经回答过这道题
    existing_response = QuizResponse.query.filter_by(
        quiz_id=quiz_id,
        user_id=user_id
    ).first()
    
    if existing_response:
        # 返回已回答的结果信息，而不是简单的错误
        return jsonify({
            'error': '您已经回答过这道题',
            'already_answered': True,
            'quiz': {
                'id': quiz.id,
                'question': quiz.question,
                'explanation': quiz.explanation
            },
            'user_answer': existing_response.answer,
            'correct_answer': quiz.correct_answer,
            'is_correct': existing_response.is_correct
        }), 200  # 改为200状态码，但包含already_answered标志
    
    # 检查答案是否正确
    is_correct = answer == quiz.correct_answer.upper()
    
    try:
        # 保存答题记录
        response = QuizResponse(
            quiz_id=quiz_id,
            user_id=user_id,
            answer=answer,
            is_correct=is_correct
        )
        
        db.session.add(response)
        db.session.commit()
        
        # 更新用户进度
        user_progress = UserQuizProgress.query.filter_by(
            user_id=user_id,
            session_id=quiz.session_id
        ).first()
        
        if not user_progress:
            # 如果没有进度记录，创建一个
            user_progress = UserQuizProgress(
                user_id=user_id,
                session_id=quiz.session_id,
                current_quiz_index=0,
                is_completed=False
            )
            db.session.add(user_progress)
        
        # 获取该会话的所有题目，按创建时间排序
        all_quizzes = Quiz.query.filter_by(session_id=quiz.session_id).order_by(Quiz.created_at.asc()).all()
        
        # 找到当前题目的位置
        current_index = -1
        for i, q in enumerate(all_quizzes):
            if q.id == quiz_id:
                current_index = i
                break
        
        # 更新用户进度
        if current_index >= 0:
            if current_index < len(all_quizzes) - 1:
                # 还有下一题，推进进度
                user_progress.current_quiz_index = current_index + 1
                user_progress.last_activity = datetime.utcnow()
                next_quiz_activated = True
            else:
                # 这是最后一题，标记为完成
                user_progress.is_completed = True
                user_progress.last_activity = datetime.utcnow()
                next_quiz_activated = False
        
        db.session.commit()
        
        result = {
            'success': True,
            'is_correct': is_correct,
            'correct_answer': quiz.correct_answer,
            'explanation': quiz.explanation,
            'user_answer': answer,
            'quiz': {
                'id': quiz.id,
                'question': quiz.question,
                'explanation': quiz.explanation
            }
        }
        
        # 如果有下一题，添加相关信息
        if next_quiz_activated:
            result['next_quiz_activated'] = True
            result['message'] = '答案已提交，准备下一题'
        else:
            # 这是最后一题，所有题目已完成
            result['all_quizzes_completed'] = True
            result['message'] = '恭喜！您已完成所有题目'
        
        return jsonify(result)
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'保存答案失败: {str(e)}'}), 500

@quiz_bp.route('/current/<int:session_id>', methods=['GET'])
def get_current_quiz(session_id):
    """获取用户在会话中的当前题目（基于个人进度）"""
    try:
        # 检查用户是否已登录
        if 'user_id' not in session:
            return jsonify({
                'success': False,
                'message': '请先登录'
            }), 401
        
        user_id = session['user_id']
        
        # 获取会话的所有题目，按创建时间排序
        all_quizzes = Quiz.query.filter_by(session_id=session_id).order_by(Quiz.created_at.asc()).all()
        
        if not all_quizzes:
            return jsonify({
                'success': False,
                'message': '该会话暂无题目'
            })
        
        # 获取或创建用户在该会话的进度记录
        user_progress = UserQuizProgress.query.filter_by(
            user_id=user_id,
            session_id=session_id
        ).first()
        
        if not user_progress:
            # 新用户，创建进度记录，从第一题开始
            user_progress = UserQuizProgress(
                user_id=user_id,
                session_id=session_id,
                current_quiz_index=0,
                is_completed=False
            )
            db.session.add(user_progress)
            db.session.commit()
        
        # 检查用户是否已完成所有题目
        if user_progress.is_completed:
            return jsonify({
                'success': False,
                'message': '您已完成该会话的所有题目',
                'completed': True
            })
        
        # 检查当前题目索引是否有效
        if user_progress.current_quiz_index >= len(all_quizzes):
            # 标记为已完成
            user_progress.is_completed = True
            db.session.commit()
            return jsonify({
                'success': False,
                'message': '您已完成该会话的所有题目',
                'completed': True
            })
        
        # 获取当前应该答的题目
        current_quiz = all_quizzes[user_progress.current_quiz_index]
        
        # 检查是否已经回答过这道题
        existing_response = QuizResponse.query.filter_by(
            quiz_id=current_quiz.id,
            user_id=user_id
        ).first()
        
        has_answered = existing_response is not None
        
        # 如果已经回答过，自动推进到下一题
        if has_answered and user_progress.current_quiz_index < len(all_quizzes) - 1:
            user_progress.current_quiz_index += 1
            user_progress.last_activity = datetime.utcnow()
            db.session.commit()
            
            # 递归调用获取下一题
            return get_current_quiz(session_id)
        elif has_answered and user_progress.current_quiz_index == len(all_quizzes) - 1:
            # 最后一题也答完了
            user_progress.is_completed = True
            db.session.commit()
            return jsonify({
                'success': False,
                'message': '您已完成该会话的所有题目',
                'completed': True
            })
        
        # 返回当前题目
        quiz_data = {
            'id': current_quiz.id,
            'question': current_quiz.question,
            'option_a': current_quiz.option_a,
            'option_b': current_quiz.option_b,
            'option_c': current_quiz.option_c,
            'option_d': current_quiz.option_d,
            'time_limit': current_quiz.time_limit,
            'created_at': current_quiz.created_at.isoformat(),
            'has_answered': has_answered,
            'quiz_number': user_progress.current_quiz_index + 1,
            'total_quizzes': len(all_quizzes)
        }
        
        return jsonify({
            'success': True,
            'quiz': quiz_data
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'获取题目失败: {str(e)}'
        }), 500





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
            'option_a': quiz.option_a,
            'option_b': quiz.option_b,
            'option_c': quiz.option_c,
            'option_d': quiz.option_d,
            'correct_answer': quiz.correct_answer,
            'total_responses': total_responses,
            'correct_responses': correct_responses,
            'accuracy_rate': (correct_responses / total_responses * 100) if total_responses > 0 else 0,
            'option_distribution': option_stats,
            'is_active': quiz.is_active,
            'created_at': quiz.created_at.isoformat(),
            'explanation': quiz.explanation,
            'time_limit': quiz.time_limit
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
    from app.models import User
    
    user_id = session['user_id']
    
    # 获取会话的所有题目
    total_quizzes = Quiz.query.filter_by(session_id=session_id).count()
    
    # 获取用户在该会话中的所有回答
    user_responses = db.session.query(QuizResponse).join(Quiz).filter(
        Quiz.session_id == session_id,
        QuizResponse.user_id == user_id
    ).all()
    
    total_answered = len(user_responses)
    correct_answered = sum(1 for r in user_responses if r.is_correct)
    accuracy = (correct_answered / total_answered * 100) if total_answered > 0 else 0
    
    # 计算排名 - 获取所有用户的统计数据和用户信息
    all_user_stats = db.session.query(
        QuizResponse.user_id,
        db.func.count(QuizResponse.id).label('total'),
        db.func.sum(db.case((QuizResponse.is_correct == True, 1), else_=0)).label('correct')
    ).join(Quiz).filter(Quiz.session_id == session_id).group_by(QuizResponse.user_id).all()
    
    # 按正确率排序，然后按答题数量排序
    sorted_stats = sorted(all_user_stats, 
                         key=lambda x: (x.correct / x.total if x.total > 0 else 0, x.total), 
                         reverse=True)
    
    user_rank = next((i + 1 for i, stat in enumerate(sorted_stats) if stat.user_id == user_id), None)
    
    # 构建排行榜数据，包含用户信息
    leaderboard = []
    for i, stat in enumerate(sorted_stats):
        user_info = User.query.get(stat.user_id)
        user_accuracy = (stat.correct / stat.total * 100) if stat.total > 0 else 0
        leaderboard.append({
            'user_id': stat.user_id,
            'username': user_info.username if user_info else f'User{stat.user_id}',
            'nickname': user_info.nickname if user_info and hasattr(user_info, 'nickname') else None,
            'total_answered': stat.total,
            'correct_answered': stat.correct,
            'accuracy': round(user_accuracy, 1),
            'is_current_user': stat.user_id == user_id
        })
    
    return jsonify({
        'user_id': user_id,
        'session_id': session_id,
        'total_quizzes': total_quizzes,
        'total_answered': total_answered,
        'correct_answered': correct_answered,
        'accuracy': round(accuracy, 1),
        'rank': user_rank,
        'total_participants': len(sorted_stats),
        'leaderboard': leaderboard
    })

@quiz_bp.route('/session-sequence/<int:session_id>', methods=['GET'])
@require_auth
def get_session_quiz_sequence(session_id):
    """获取会话的题目序列（按创建时间排序）"""
    try:
        # 获取会话的所有题目，按创建时间排序
        quizzes = Quiz.query.filter_by(session_id=session_id).order_by(Quiz.created_at.asc()).all()
        
        if not quizzes:
            return jsonify({
                'success': False,
                'message': '该会话没有题目'
            })
        
        # 如果用户已登录，检查每个题目的回答状态
        user_responses = {}
        if 'user_id' in session:
            user_id = session['user_id']
            # 查询用户在该会话中的所有回答
            responses = db.session.query(QuizResponse).join(Quiz).filter(
                QuizResponse.user_id == user_id,
                Quiz.session_id == session_id
            ).all()
            user_responses = {r.quiz_id: r for r in responses}
        
        quiz_sequence = []
        answered_count = 0
        correct_count = 0
        
        for i, quiz in enumerate(quizzes):
            user_response = user_responses.get(quiz.id)
            quiz_data = {
                'id': quiz.id,
                'question': quiz.question,
                'option_a': quiz.option_a,
                'option_b': quiz.option_b,
                'option_c': quiz.option_c,
                'option_d': quiz.option_d,
                'correct_answer': quiz.correct_answer,
                'explanation': quiz.explanation,
                'time_limit': quiz.time_limit,
                'is_active': quiz.is_active,
                'order_index': i,  # 题目顺序索引
                'created_at': quiz.created_at.isoformat()
            }
            
            # 添加用户回答信息
            if user_response:
                answered_count += 1
                if user_response.is_correct:
                    correct_count += 1
                quiz_data['user_response'] = {
                    'answer': user_response.answer,
                    'is_correct': user_response.is_correct,
                    'answered_at': user_response.response_time.isoformat()
                }
                quiz_data['has_answered'] = True
                quiz_data['is_correct'] = user_response.is_correct
                quiz_data['user_answer'] = user_response.answer
            else:
                quiz_data['has_answered'] = False
                quiz_data['is_correct'] = False
                quiz_data['user_answer'] = None
            
            quiz_sequence.append(quiz_data)
        
        # 计算正确率
        accuracy = (correct_count / answered_count * 100) if answered_count > 0 else 0
        
        return jsonify({
            'success': True,
            'quizzes': quiz_sequence,
            'total_count': len(quiz_sequence),
            'total_quizzes': len(quiz_sequence),
            'answered_count': answered_count,
            'correct_count': correct_count,
            'accuracy': accuracy
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'获取题目序列失败: {str(e)}'
        }), 500




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

@quiz_bp.route('/generate-ai-quizzes', methods=['POST'])
@require_auth
def generate_ai_quizzes():
    """使用AI从上传的文件直接生成5道选择题"""
    try:
        # 获取上传的文件
        if 'file' not in request.files:
            return jsonify({'error': '请选择文件'}), 400
        
        file = request.files['file']
        session_id = request.form.get('session_id')
        
        if not file or file.filename == '':
            return jsonify({'error': '请选择文件'}), 400
            
        if not session_id:
            return jsonify({'error': '请选择会话'}), 400
        
        
        # 验证文件类型
        allowed_extensions = ['.pdf', '.ppt', '.pptx']
        file_ext = '.' + file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        
        if file_ext not in allowed_extensions:
            return jsonify({'error': '只支持PDF和PPT文件'}), 400
        
        # 验证会话存在且用户有权限
        pq_session = PQSession.query.get(session_id)
        if not pq_session:
            return jsonify({'error': '会话不存在'}), 404
        
        user_id = session['user_id']
        if pq_session.speaker_id != user_id and pq_session.organizer_id != user_id:
            return jsonify({'error': '权限不足'}), 403
        
        # 处理文件并生成题目
        try:
            from app.file_processor import FileProcessor
            from app.quiz_generator import QuizGenerator
            
            file_processor = FileProcessor()
            quiz_generator = QuizGenerator()
            
            # 直接从内存中的文件提取文本
            file_content = file.read()
            file.seek(0)  # 重置文件指针
            
            # 提取文本内容
            if file_ext == '.pdf':
                text_content = file_processor.extract_text_from_pdf_bytes(file_content)
            else:  # PPT files
                text_content = file_processor.extract_text_from_ppt_bytes(file_content)
            
            if not text_content or len(text_content.strip()) < 50:
                return jsonify({'error': '文件内容太少，无法生成题目'}), 400
            
            # 使用AI生成5道选择题
            generated_quizzes = quiz_generator.generate_quiz(text_content, num_questions=5)
            
            if not generated_quizzes:
                return jsonify({'error': 'AI生成题目失败，请检查文件内容'}), 500
            
            # 保存题目到数据库
            created_count = 0
            for quiz_data in generated_quizzes:
                try:
                    quiz = Quiz(
                        session_id=session_id,
                        question=quiz_data['question'],
                        option_a=quiz_data['option_a'],
                        option_b=quiz_data['option_b'],
                        option_c=quiz_data['option_c'],
                        option_d=quiz_data['option_d'],
                        correct_answer=quiz_data['correct_answer'],
                        explanation=quiz_data.get('explanation', ''),
                        time_limit=quiz_data.get('time_estimate', 30)
                    )
                    db.session.add(quiz)
                    created_count += 1
                except Exception as e:
                    print(f"保存题目失败: {e}")
                    import traceback
                    traceback.print_exc()
                    continue
            
            if created_count == 0:
                return jsonify({'error': '保存题目失败'}), 500
            
            db.session.commit()
            
            return jsonify({
                'message': f'成功生成{created_count}道题目', 
                'count': created_count
            })
            
        except ImportError as e:
            return jsonify({'error': '文件处理功能未正确配置'}), 500
        except Exception as e:
            print(f"AI生成题目错误: {e}")
            return jsonify({'error': f'生成题目失败: {str(e)}'}), 500
            
    except Exception as e:
        db.session.rollback()
        print(f"AI题目生成路由错误: {e}")
        return jsonify({'error': '系统错误，请重试'}), 500

@quiz_bp.route('/upload-multiple', methods=['POST'])
def upload_multiple_files_and_generate_quiz():
    """上传多个文件并生成题目"""
    try:
        # 检查是否有文件
        if 'files' not in request.files:
            return jsonify({'success': False, 'message': '请选择文件'}), 400
        
        files = request.files.getlist('files')
        num_questions = int(request.form.get('num_questions', 5))
        session_id = request.form.get('session_id')
        
        if not files or len(files) == 0:
            return jsonify({'success': False, 'message': '请选择文件'}), 400
            
        if not session_id:
            return jsonify({'success': False, 'message': '请选择会话'}), 400
        
        # 验证会话存在且用户有权限
        pq_session = PQSession.query.get(session_id)
        if not pq_session:
            return jsonify({'success': False, 'message': '会话不存在'}), 404
        
        user_id = session['user_id']
        if pq_session.speaker_id != user_id and pq_session.organizer_id != user_id:
            return jsonify({'success': False, 'message': '权限不足'}), 403
        
        # 处理所有文件并为每个文件分别生成题目
        all_file_contents = []  # 存储每个文件的内容和信息
        processed_files = []
        failed_files = []
        
        try:
            from app.file_processor import FileProcessor
            from app.quiz_generator import QuizGenerator
            
            file_processor = FileProcessor()
            
            for file in files:
                if not file or file.filename == '':
                    continue
                    
                # 验证文件类型
                allowed_extensions = ['.pdf', '.ppt', '.pptx']
                file_ext = '.' + file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
                
                if file_ext not in allowed_extensions:
                    failed_files.append(f"{file.filename} (格式不支持)")
                    continue
                
                try:
                    # 读取文件内容
                    file_content = file.read()
                    file.seek(0)  # 重置文件指针
                    
                    # 提取文本内容
                    if file_ext == '.pdf':
                        text_content = file_processor.extract_text_from_pdf_bytes(file_content)
                    else:  # PPT files
                        text_content = file_processor.extract_text_from_ppt_bytes(file_content)
                    
                    if text_content and len(text_content.strip()) > 20:
                        all_file_contents.append({
                            'filename': file.filename,
                            'content': text_content,
                            'length': len(text_content)
                        })
                        processed_files.append(file.filename)
                    else:
                        failed_files.append(f"{file.filename} (无法提取文本)")
                        
                except Exception as e:
                    failed_files.append(f"{file.filename} (处理失败: {str(e)})")
                    continue
            
            if not all_file_contents:
                return jsonify({'success': False, 'message': '没有成功处理的文件，无法生成题目'}), 400
            
            # 计算每个文件应该生成的题目数量
            total_files = len(all_file_contents)
            questions_per_file = max(1, num_questions // total_files)  # 每个文件至少1题
            remaining_questions = num_questions - (questions_per_file * total_files)
            
            print(f"成功处理{total_files}个文件，每个文件生成{questions_per_file}道题目，剩余{remaining_questions}道题目")
            
            # 为每个文件分别生成题目
            quiz_generator = QuizGenerator()
            all_generated_quizzes = []
            
            for i, file_info in enumerate(all_file_contents):
                # 计算当前文件应生成的题目数
                current_questions = questions_per_file
                if i < remaining_questions:  # 剩余题目分配给前几个文件
                    current_questions += 1
                
                print(f"🔄 为文件 '{file_info['filename']}' 生成 {current_questions} 道题目...")
                
                # 为当前文件生成题目
                file_quizzes = quiz_generator.generate_quiz(file_info['content'], num_questions=current_questions)
                
                if file_quizzes:
                    # 给每道题添加来源文件信息
                    for quiz in file_quizzes:
                        quiz['source_file'] = file_info['filename']
                        if 'explanation' in quiz:
                            quiz['explanation'] += f" (来源：{file_info['filename']})"
                        else:
                            quiz['explanation'] = f"来源：{file_info['filename']}"
                    
                    all_generated_quizzes.extend(file_quizzes)
                    print(f"✅ 文件 '{file_info['filename']}' 成功生成 {len(file_quizzes)} 道题目")
                else:
                    print(f"❌ 文件 '{file_info['filename']}' 生成题目失败")
            
            if not all_generated_quizzes:
                return jsonify({'success': False, 'message': 'AI生成题目失败，请检查文件内容或稍后重试'}), 500
            
            # 构建响应消息
            message = f'成功基于{len(processed_files)}个文件生成{len(all_generated_quizzes)}道题目'
            if failed_files:
                message += f'，{len(failed_files)}个文件处理失败'
            
            # 统计信息
            total_content_length = sum(file_info['length'] for file_info in all_file_contents)
            
            return jsonify({
                'success': True,
                'message': message,
                'questions': all_generated_quizzes,
                'processed_files': processed_files,
                'failed_files': failed_files,
                'file_info': {
                    'total_files': len(files),
                    'processed_count': len(processed_files),
                    'failed_count': len(failed_files),
                    'total_content_length': total_content_length,
                    'questions_distribution': {
                        'questions_per_file': questions_per_file,
                        'remaining_questions': remaining_questions,
                        'actual_generated': len(all_generated_quizzes)
                    }
                }
            })
            
        except ImportError as e:
            return jsonify({'success': False, 'message': '文件处理功能未正确配置'}), 500
        except Exception as e:
            print(f"多文件AI生成题目错误: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'success': False, 'message': f'处理失败: {str(e)}'}), 500
            
    except Exception as e:
        print(f"多文件上传API错误: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': '系统错误，请重试'}), 500

@quiz_bp.route('/upload', methods=['POST'])
def upload_and_generate_quiz():
    """上传文件并生成题目（简化版API）"""
    try:
        # 检查是否有文件
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': '请选择文件'}), 400
        
        file = request.files['file']
        num_questions = int(request.form.get('num_questions', 2))
        
        if not file or file.filename == '':
            return jsonify({'success': False, 'message': '请选择文件'}), 400
        
        # 验证文件类型
        allowed_extensions = ['.pdf', '.ppt', '.pptx']
        file_ext = '.' + file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        
        if file_ext not in allowed_extensions:
            return jsonify({'success': False, 'message': '只支持PDF和PPT文件'}), 400
        
        # 处理文件并生成题目
        try:
            from app.file_processor import FileProcessor
            from app.quiz_generator import QuizGenerator
            
            file_processor = FileProcessor()
            quiz_generator = QuizGenerator()
            
            # 直接从内存中的文件提取文本
            file_content = file.read()
            
            print(f"文件大小: {len(file_content)} 字节")
            print(f"文件类型: {file_ext}")
            
            # 提取文本内容
            if file_ext == '.pdf':
                text_content = file_processor.extract_text_from_pdf_bytes(file_content)
            else:  # PPT files
                text_content = file_processor.extract_text_from_ppt_bytes(file_content)
            
            print(f"提取到的文本长度: {len(text_content) if text_content else 0}")
            
            # 检查文本内容是否有效
            if not text_content:
                return jsonify({'success': False, 'message': '无法从文件中提取文本内容，请检查文件格式是否正确'}), 400
            
            if isinstance(text_content, str) and text_content.startswith('不支持'):
                return jsonify({'success': False, 'message': text_content}), 400
            
            if isinstance(text_content, str) and '处理' in text_content and '失败' in text_content:
                return jsonify({'success': False, 'message': text_content}), 400
                
            if len(text_content.strip()) < 50:
                return jsonify({'success': False, 'message': '文件内容太少，无法生成题目。至少需要50个字符的文本内容。'}), 400
            
            print(f"开始使用AI生成 {num_questions} 道题目...")
            
            # 使用AI生成题目
            generated_quizzes = quiz_generator.generate_quiz(text_content, num_questions=num_questions)
            
            if not generated_quizzes:
                return jsonify({'success': False, 'message': 'AI生成题目失败，请检查文件内容或稍后重试'}), 500
            
            return jsonify({
                'success': True,
                'message': f'成功生成{len(generated_quizzes)}道题目',
                'questions': generated_quizzes,
                'file_info': {
                    'filename': file.filename,
                    'text_length': len(text_content)
                }
            })
            
        except Exception as e:
            print(f"处理文件或生成题目错误: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'success': False, 'message': f'处理失败: {str(e)}'}), 500
            
    except Exception as e:
        print(f"上传API错误: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': '系统错误，请重试'}), 500

@quiz_bp.route('/auto-activate-next/<int:session_id>', methods=['POST'])
@require_auth
def auto_activate_next_quiz(session_id):
    """自动激活下一题"""
    try:
        # 验证会话存在且用户有权限
        pq_session = PQSession.query.get(session_id)
        if not pq_session:
            return jsonify({'success': False, 'message': '会话不存在'}), 404
        
        user_id = session['user_id']
        if pq_session.speaker_id != user_id and pq_session.organizer_id != user_id:
            return jsonify({'success': False, 'message': '权限不足'}), 403
        
        # 获取该会话的所有题目，按创建时间排序
        all_quizzes = Quiz.query.filter_by(session_id=session_id).order_by(Quiz.created_at.asc()).all()
        
        if not all_quizzes:
            return jsonify({'success': False, 'message': '该会话没有题目'}), 404
        
        # 查找当前活跃的题目
        current_active_quiz = None
        current_index = -1
        for i, quiz in enumerate(all_quizzes):
            if quiz.is_active:
                current_active_quiz = quiz
                current_index = i
                break
        
        # 如果没有活跃题目，激活第一题
        if current_active_quiz is None:
            first_quiz = all_quizzes[0]
            first_quiz.is_active = True
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': '已激活第一题',
                'current_quiz_id': first_quiz.id,
                'quiz_index': 0,
                'total_quizzes': len(all_quizzes)
            })
        
        # 如果当前是最后一题，返回完成状态
        if current_index >= len(all_quizzes) - 1:
            return jsonify({
                'success': True,
                'message': '所有题目已完成',
                'is_finished': True,
                'total_quizzes': len(all_quizzes)
            })
        
        # 激活下一题
        next_quiz = all_quizzes[current_index + 1]
        
        # 关闭当前题目，激活下一题
        current_active_quiz.is_active = False
        next_quiz.is_active = True
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'已激活第{current_index + 2}题',
            'current_quiz_id': next_quiz.id,
            'quiz_index': current_index + 1,
            'total_quizzes': len(all_quizzes)
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"自动激活下一题错误: {e}")
        return jsonify({'success': False, 'message': '系统错误'}), 500

@quiz_bp.route('/send-to-audience', methods=['POST'])
@require_auth
def send_quiz_to_audience():
    """发送题目给听众"""
    try:
        data = request.get_json()
        
        if not data or not data.get('session_id') or not data.get('quiz'):
            return jsonify({'success': False, 'message': '缺少必要参数'}), 400
        
        session_id = data['session_id']
        quiz_data = data['quiz']
        
        # 验证会话存在且用户有权限
        pq_session = PQSession.query.get(session_id)
        if not pq_session:
            return jsonify({'success': False, 'message': '会话不存在'}), 404
        
        user_id = session['user_id']
        if pq_session.speaker_id != user_id and pq_session.organizer_id != user_id:
            return jsonify({'success': False, 'message': '权限不足'}), 403
        
        # 保存题目到数据库
        try:
            quiz = Quiz(
                session_id=session_id,
                question=quiz_data['question'],
                option_a=quiz_data['option_a'],
                option_b=quiz_data['option_b'],
                option_c=quiz_data['option_c'],
                option_d=quiz_data['option_d'],
                correct_answer=quiz_data['correct_answer'],
                explanation=quiz_data.get('explanation', ''),
                time_limit=quiz_data.get('time_estimate', 30),
                is_active=True  # 立即激活
            )
            
            # 先关闭该会话的其他活跃题目
            Quiz.query.filter_by(session_id=session_id, is_active=True).update({'is_active': False})
            
            db.session.add(quiz)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': '题目已发送给听众',
                'quiz_id': quiz.id
            })
            
        except Exception as e:
            db.session.rollback()
            print(f"保存题目失败: {e}")
            return jsonify({'success': False, 'message': '保存题目失败'}), 500
            
    except Exception as e:
        print(f"发送题目错误: {e}")
        return jsonify({'success': False, 'message': '系统错误'}), 500

@quiz_bp.route('/send-all-to-audience', methods=['POST'])
@require_auth
def send_all_quizzes_to_audience():
    """发送所有题目给听众"""
    try:
        data = request.get_json()
        
        if not data or not data.get('session_id') or not data.get('questions'):
            return jsonify({'success': False, 'message': '缺少必要参数'}), 400
        
        session_id = data['session_id']
        questions = data['questions']
        
        # 验证会话存在且用户有权限
        pq_session = PQSession.query.get(session_id)
        if not pq_session:
            return jsonify({'success': False, 'message': '会话不存在'}), 404
        
        user_id = session['user_id']
        if pq_session.speaker_id != user_id and pq_session.organizer_id != user_id:
            return jsonify({'success': False, 'message': '权限不足'}), 403
        
        # 保存所有题目到数据库
        saved_count = 0
        try:
            # 先关闭该会话的其他活跃题目
            Quiz.query.filter_by(session_id=session_id, is_active=True).update({'is_active': False})
            
            for i, quiz_data in enumerate(questions):
                # 所有题目都设为活跃，让听众可以按顺序答题
                quiz = Quiz(
                    session_id=session_id,
                    question=quiz_data['question'],
                    option_a=quiz_data['option_a'],
                    option_b=quiz_data['option_b'],
                    option_c=quiz_data['option_c'],
                    option_d=quiz_data['option_d'],
                    correct_answer=quiz_data['correct_answer'],
                    explanation=quiz_data.get('explanation', ''),
                    time_limit=quiz_data.get('time_estimate', 30),
                    is_active=True  # 所有题目都激活
                )
                
                db.session.add(quiz)
                saved_count += 1
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': f'成功发送 {saved_count} 道题目，所有题目已激活',
                'saved_count': saved_count
            })
            
        except Exception as e:
            db.session.rollback()
            print(f"保存题目失败: {e}")
            return jsonify({'success': False, 'message': '保存题目失败'}), 500
            
    except Exception as e:
        print(f"发送所有题目错误: {e}")
        return jsonify({'success': False, 'message': '系统错误'}), 500

@quiz_bp.route('/session-quizzes/<int:session_id>', methods=['GET'])
@require_auth
def get_session_quizzes(session_id):
    """获取会话的所有题目"""
    try:
        # 验证会话存在
        pq_session = PQSession.query.get(session_id)
        if not pq_session:
            return jsonify({'error': '会话不存在'}), 404
        
        # 获取题目列表
        quizzes = Quiz.query.filter_by(session_id=session_id).order_by(Quiz.created_at.desc()).all()
        
        quiz_list = []
        for quiz in quizzes:
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
                'is_active': quiz.is_active,
                'created_at': quiz.created_at.isoformat()
            })
        
        return jsonify({
            'success': True,
            'quizzes': quiz_list,
            'total': len(quiz_list)
        })
        
    except Exception as e:
        print(f"获取题目列表错误: {e}")
        return jsonify({'error': '系统错误'}), 500

@quiz_bp.route('/test-upload', methods=['POST'])
def test_file_upload():
    """测试文件上传功能"""
    try:
        # 检查是否有文件
        if 'file' not in request.files:
            return jsonify({'error': '请选择文件', 'step': 'file_check'}), 400
        
        file = request.files['file']
        session_id = request.form.get('session_id', 'test')
        
        if not file or file.filename == '':
            return jsonify({'error': '请选择文件', 'step': 'file_empty'}), 400
        
        # 文件信息
        file_info = {
            'filename': file.filename,
            'content_type': file.content_type,
            'size': len(file.read())
        }
        file.seek(0)  # 重置文件指针
        
        # 验证文件类型
        allowed_extensions = ['.pdf', '.ppt', '.pptx']
        file_ext = '.' + file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        
        if file_ext not in allowed_extensions:
            return jsonify({'error': '只支持PDF和PPT文件', 'step': 'file_type', 'info': file_info}), 400
        
        # 尝试处理文件
        try:
            from app.file_processor import FileProcessor
            file_processor = FileProcessor()
            
            # 读取文件内容
            file_content = file.read()
            
            # 提取文本
            if file_ext == '.pdf':
                text_content = file_processor.extract_text_from_pdf_bytes(file_content)
            else:  # PPT files
                text_content = file_processor.extract_text_from_ppt_bytes(file_content)
            
            text_info = {
                'length': len(text_content) if text_content else 0,
                'preview': text_content[:200] if text_content else 'No text extracted'
            }
            
            return jsonify({
                'message': '文件处理成功',
                'file_info': file_info,
                'text_info': text_info,
                'step': 'complete'
            })
            
        except Exception as e:
            return jsonify({
                'error': f'文件处理失败: {str(e)}',
                'step': 'file_processing',
                'info': file_info
            }), 500
            
    except Exception as e:
        return jsonify({
            'error': f'测试失败: {str(e)}',
            'step': 'general_error'
        }), 500

@quiz_bp.route('/<int:quiz_id>/discussions', methods=['GET'])
@require_auth
def get_discussions(quiz_id):
    """获取题目的讨论消息"""
    quiz = Quiz.query.get(quiz_id)
    if not quiz:
        return jsonify({'error': '题目不存在'}), 404
    
    discussions = QuizDiscussion.query.filter_by(quiz_id=quiz_id).order_by(QuizDiscussion.created_at.asc()).all()
    discussion_list = [{
        'id': d.id,
        'user_id': d.user_id,
        'username': User.query.get(d.user_id).username if User.query.get(d.user_id) else '未知用户',
        'message': d.message,
        'created_at': d.created_at.isoformat()
    } for d in discussions]
    
    # 获取统计数据
    responses = QuizResponse.query.filter_by(quiz_id=quiz_id).all()
    total = len(responses)
    option_stats = {'A': 0, 'B': 0, 'C': 0, 'D': 0}
    for r in responses:
        option_stats[r.answer] += 1
    
    return jsonify({
        'success': True,
        'quiz': {
            'id': quiz.id,
            'question': quiz.question,
            'option_a': quiz.option_a,
            'option_b': quiz.option_b,
            'option_c': quiz.option_c,
            'option_d': quiz.option_d,
            'correct_answer': quiz.correct_answer,
            'explanation': quiz.explanation,
            'is_active': quiz.is_active
        },
        'discussions': discussion_list,
        'can_discuss': True,  # 所有题目都可以讨论
        'statistics': {
            'total_responses': total,
            'option_distribution': option_stats
        }
    })

@quiz_bp.route('/<int:quiz_id>/discussions', methods=['POST'])
@require_auth
def post_discussion(quiz_id):
    """发布讨论消息"""
    data = request.get_json()
    if not data or not data.get('message'):
        return jsonify({'error': '缺少消息内容'}), 400
    
    quiz = Quiz.query.get(quiz_id)
    if not quiz:
        return jsonify({'error': '题目不存在'}), 404
    
    discussion = QuizDiscussion(
        quiz_id=quiz_id,
        user_id=session['user_id'],
        message=data['message']
    )
    
    db.session.add(discussion)
    db.session.commit()
    
    # 返回新创建的讨论信息
    user = User.query.get(session['user_id'])
    return jsonify({
        'success': True,
        'message': '讨论发布成功',
        'discussion': {
            'id': discussion.id,
            'user_id': discussion.user_id,
            'username': user.username if user else '未知用户',
            'message': discussion.message,
            'created_at': discussion.created_at.isoformat()
        }
    })

@quiz_bp.route('/session/<int:session_id>/discussions', methods=['GET'])
@require_auth
def get_session_discussions(session_id):
    """获取会话中所有题目的讨论概览"""
    quizzes = Quiz.query.filter_by(session_id=session_id).order_by(Quiz.created_at.asc()).all()
    
    quiz_list = []
    for i, quiz in enumerate(quizzes):
        # 获取讨论数量
        discussion_count = QuizDiscussion.query.filter_by(quiz_id=quiz.id).count()
        
        # 获取回答统计
        responses = QuizResponse.query.filter_by(quiz_id=quiz.id).all()
        total_responses = len(responses)
        
        quiz_list.append({
            'id': quiz.id,
            'question': quiz.question,
            'order_index': i + 1,
            'is_active': quiz.is_active,
            'discussion_count': discussion_count,
            'response_count': total_responses,
            'created_at': quiz.created_at.isoformat()
        })
    
    return jsonify({
        'success': True,
        'quizzes': quiz_list,
        'total_count': len(quiz_list)
    })

@quiz_bp.route('/finished', methods=['GET'])
@require_auth
def get_finished_quizzes():
    quizzes = Quiz.query.filter_by(is_active=False).all()  # 简化，实际应过滤用户参与的会话
    return jsonify({'quizzes': [{'id': q.id, 'question': q.question} for q in quizzes]})

@quiz_bp.route('/create', methods=['POST'])
@require_auth
def create_quiz():
    """创建单个题目"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': '缺少请求数据'}), 400
    
    # 验证必要字段
    required_fields = ['question', 'options', 'correct_answer', 'session_id']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'缺少必要字段: {field}'}), 400
    
    # 验证会话存在
    session_obj = PQSession.query.get(data['session_id'])
    if not session_obj:
        return jsonify({'error': '会话不存在'}), 404
    
    # 检查权限（组织者或演讲者可以创建题目）
    user_id = session['user_id']
    if session_obj.organizer_id != user_id and session_obj.speaker_id != user_id:
        return jsonify({'error': '只有组织者和演讲者可以创建题目'}), 403
    
    # 验证选项格式
    options = data['options']
    if not isinstance(options, list) or len(options) < 2:
        return jsonify({'error': '选项必须是至少包含2个元素的列表'}), 400
    
    # 验证正确答案索引
    correct_answer = data['correct_answer']
    if not isinstance(correct_answer, int) or correct_answer < 0 or correct_answer >= len(options):
        return jsonify({'error': '正确答案索引无效'}), 400
    
    try:
        # 准备选项数据
        options = data['options']
        if len(options) < 4:
            # 如果少于4个选项，补充空选项
            while len(options) < 4:
                options.append("")
        
        # 将正确答案索引转换为字母
        correct_answer_letters = ['A', 'B', 'C', 'D']
        correct_answer_letter = correct_answer_letters[data['correct_answer']]
        
        # 创建题目
        quiz = Quiz(
            question=data['question'],
            option_a=options[0],
            option_b=options[1],
            option_c=options[2],
            option_d=options[3],
            correct_answer=correct_answer_letter,
            session_id=data['session_id'],
            is_active=False  # 默认不激活
        )
        
        db.session.add(quiz)
        db.session.commit()
        
        return jsonify({
            'message': '题目创建成功',
            'quiz_id': quiz.id,
            'quiz': {
                'id': quiz.id,
                'question': quiz.question,
                'options': [quiz.option_a, quiz.option_b, quiz.option_c, quiz.option_d],
                'correct_answer': data['correct_answer'],  # 返回原始索引
                'session_id': quiz.session_id,
                'is_active': quiz.is_active,
                'created_at': quiz.created_at.isoformat()
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'创建题目失败: {str(e)}'}), 500
