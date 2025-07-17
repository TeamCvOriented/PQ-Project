#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
import io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

# 创建会话对象保持登录状态
session = requests.Session()

def create_simple_pdf():
    """创建一个简单的测试PDF"""
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    
    c.setFont('Helvetica', 12)
    c.drawString(50, 750, "Simple Test Document")
    c.drawString(50, 730, "This is for testing file upload.")
    c.drawString(50, 710, "It contains basic text content.")
    
    c.save()
    buffer.seek(0)
    return buffer.getvalue()

def test_simple_upload():
    """测试简单的文件上传（不调用AI）"""
    # 先登录
    login_data = {'username': 'speaker1', 'password': 'speaker123'}
    response = session.post('http://localhost:5000/api/auth/login', json=login_data)
    
    if response.status_code != 200:
        print("❌ 登录失败")
        return False
    
    print("✅ 登录成功")
    
    # 测试文件上传处理
    pdf_content = create_simple_pdf()
    files = {'file': ('simple.pdf', pdf_content, 'application/pdf')}
    data = {'session_id': '1'}
    
    # 使用测试端点
    response = session.post(
        'http://localhost:5000/api/quiz/test-upload',
        files=files,
        data=data,
        timeout=30
    )
    
    print(f"响应状态: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print("✅ 文件处理成功!")
        print(f"文件大小: {result['file_info']['size']} bytes")
        print(f"文本长度: {result['text_info']['length']} characters")
        print(f"文本预览: {result['text_info']['preview'][:100]}...")
        return True
    else:
        print(f"❌ 文件处理失败: {response.text}")
        return False

if __name__ == "__main__":
    print("=== 简单文件上传测试 ===")
    if test_simple_upload():
        print("\n🎉 文件上传功能正常工作！")
        print("\n现在可以在演讲者界面中使用文件上传功能了。")
        print("访问 http://localhost:5000/login 登录为speaker1，然后进入演讲者界面测试。")
    else:
        print("\n❌ 文件上传测试失败")
