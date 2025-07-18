from flask import Blueprint, request, jsonify, session
from app import db
from app.models import Quiz, QuizResponse, QuizDiscussion, Content, Session as PQSession, Feedback
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
                        options=quiz_data['options'],
                        correct_answer=quiz_data['correct_answer'],
                        created_by=user_id,
                        created_at=datetime.utcnow()
                    )
                    db.session.add(quiz)
                    created_count += 1
                except Exception as e:
                    print(f"保存题目失败: {e}")
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
