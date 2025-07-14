from flask import Blueprint, request, jsonify, session, current_app
from werkzeug.utils import secure_filename
import os
from app import db
from app.models import Content, Session as PQSession
from app.file_processor import FileProcessor, detect_file_type
from app.routes.auth import require_auth

content_bp = Blueprint('content', __name__)
file_processor = FileProcessor()

ALLOWED_EXTENSIONS = {
    'txt', 'md', 'pdf', 'doc', 'docx', 
    'ppt', 'pptx', 'mp3', 'wav', 'm4a', 
    'mp4', 'avi', 'mov', 'wmv'
}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@content_bp.route('/upload', methods=['POST'])
@require_auth
def upload_content():
    """上传内容文件"""
    if 'file' not in request.files:
        return jsonify({'error': '没有选择文件'}), 400
    
    file = request.files['file']
    session_id = request.form.get('session_id')
    
    if file.filename == '':
        return jsonify({'error': '没有选择文件'}), 400
    
    if not session_id:
        return jsonify({'error': '缺少会话ID'}), 400
    
    # 验证会话存在且用户有权限
    pq_session = PQSession.query.get(session_id)
    if not pq_session:
        return jsonify({'error': '会话不存在'}), 404
    
    # 检查权限（演讲者或组织者）
    user_id = session['user_id']
    if pq_session.speaker_id != user_id and pq_session.organizer_id != user_id:
        return jsonify({'error': '权限不足'}), 403
    
    if file and allowed_file(file.filename):
        try:
            # 安全的文件名
            filename = secure_filename(file.filename)
            
            # 检测文件类型
            content_type = detect_file_type(filename)
            if content_type == 'unknown':
                return jsonify({'error': '不支持的文件类型'}), 400
            
            # 创建文件保存路径
            upload_folder = current_app.config['UPLOAD_FOLDER']
            file_path = os.path.join(upload_folder, f"{session_id}_{filename}")
            
            # 保存文件
            file.save(file_path)
            
            # 处理文件并提取文本
            extracted_text = file_processor.process_file(file_path, content_type)
            
            # 保存到数据库
            content = Content(
                session_id=session_id,
                content_type=content_type,
                original_filename=filename,
                file_path=file_path,
                extracted_text=extracted_text
            )
            
            db.session.add(content)
            db.session.commit()
            
            return jsonify({
                'message': '文件上传成功',
                'content': {
                    'id': content.id,
                    'filename': filename,
                    'content_type': content_type,
                    'text_length': len(extracted_text),
                    'upload_time': content.upload_time.isoformat()
                }
            })
            
        except Exception as e:
            db.session.rollback()
            # 删除已上传的文件
            if os.path.exists(file_path):
                os.remove(file_path)
            return jsonify({'error': f'文件处理失败: {str(e)}'}), 500
    
    return jsonify({'error': '文件类型不支持'}), 400

@content_bp.route('/text', methods=['POST'])
@require_auth
def upload_text():
    """直接上传文本内容"""
    data = request.get_json()
    
    if not data or not data.get('text') or not data.get('session_id'):
        return jsonify({'error': '缺少文本内容或会话ID'}), 400
    
    session_id = data['session_id']
    text_content = data['text']
    
    # 验证会话存在且用户有权限
    pq_session = PQSession.query.get(session_id)
    if not pq_session:
        return jsonify({'error': '会话不存在'}), 404
    
    # 检查权限
    user_id = session['user_id']
    if pq_session.speaker_id != user_id and pq_session.organizer_id != user_id:
        return jsonify({'error': '权限不足'}), 403
    
    try:
        # 保存文本内容到数据库
        content = Content(
            session_id=session_id,
            content_type='text',
            original_filename='直接输入文本',
            extracted_text=text_content
        )
        
        db.session.add(content)
        db.session.commit()
        
        return jsonify({
            'message': '文本内容保存成功',
            'content': {
                'id': content.id,
                'text_length': len(text_content),
                'upload_time': content.upload_time.isoformat()
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'保存失败: {str(e)}'}), 500

@content_bp.route('/session/<int:session_id>', methods=['GET'])
@require_auth
def get_session_content(session_id):
    """获取会话的所有内容"""
    # 验证会话存在
    pq_session = PQSession.query.get(session_id)
    if not pq_session:
        return jsonify({'error': '会话不存在'}), 404
    
    # 获取所有内容
    contents = Content.query.filter_by(session_id=session_id).order_by(Content.upload_time).all()
    
    content_list = []
    for content in contents:
        content_list.append({
            'id': content.id,
            'content_type': content.content_type,
            'original_filename': content.original_filename,
            'text_length': len(content.extracted_text) if content.extracted_text else 0,
            'upload_time': content.upload_time.isoformat(),
            'text_preview': content.extracted_text[:200] + '...' if content.extracted_text and len(content.extracted_text) > 200 else content.extracted_text
        })
    
    return jsonify({
        'session_id': session_id,
        'contents': content_list,
        'total_contents': len(content_list)
    })

@content_bp.route('/<int:content_id>', methods=['GET'])
@require_auth
def get_content(content_id):
    """获取具体内容详情"""
    content = Content.query.get(content_id)
    if not content:
        return jsonify({'error': '内容不存在'}), 404
    
    return jsonify({
        'id': content.id,
        'session_id': content.session_id,
        'content_type': content.content_type,
        'original_filename': content.original_filename,
        'extracted_text': content.extracted_text,
        'upload_time': content.upload_time.isoformat()
    })

@content_bp.route('/<int:content_id>', methods=['DELETE'])
@require_auth
def delete_content(content_id):
    """删除内容"""
    content = Content.query.get(content_id)
    if not content:
        return jsonify({'error': '内容不存在'}), 404
    
    # 验证权限
    pq_session = PQSession.query.get(content.session_id)
    user_id = session['user_id']
    if pq_session.speaker_id != user_id and pq_session.organizer_id != user_id:
        return jsonify({'error': '权限不足'}), 403
    
    try:
        # 删除文件
        if content.file_path and os.path.exists(content.file_path):
            os.remove(content.file_path)
        
        # 删除数据库记录
        db.session.delete(content)
        db.session.commit()
        
        return jsonify({'message': '内容删除成功'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'删除失败: {str(e)}'}), 500
