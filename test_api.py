#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
import io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os

def create_test_pdf():
    """创建一个测试PDF文件"""
    buffer = io.BytesIO()
    
    try:
        # 尝试注册中文字体
        font_path = "C:/Windows/Fonts/simsun.ttc"  # 宋体
        if os.path.exists(font_path):
            pdfmetrics.registerFont(TTFont('SimSun', font_path))
            font_name = 'SimSun'
        else:
            font_name = 'Helvetica'  # 回退到英文字体
    except:
        font_name = 'Helvetica'
    
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    # 写入测试内容
    c.setFont(font_name, 16)
    y = height - 50
    
    content = [
        "Test PDF Document",
        "",
        "This is a test document for AI quiz generation.",
        "",
        "Topic: Artificial Intelligence",
        "",
        "1. What is machine learning?",
        "Machine learning is a subset of artificial intelligence",
        "that enables computers to learn without being explicitly programmed.",
        "",
        "2. Deep Learning Applications:",
        "- Image recognition",
        "- Natural language processing", 
        "- Speech recognition",
        "- Autonomous vehicles",
        "",
        "3. Future of AI:",
        "AI will continue to transform various industries",
        "including healthcare, finance, education, and transportation."
    ]
    
    for line in content:
        if y < 50:  # 新页面
            c.showPage()
            c.setFont(font_name, 16)
            y = height - 50
        
        c.drawString(50, y, line)
        y -= 20
    
    c.save()
    buffer.seek(0)
    return buffer.getvalue()

def test_api_upload():
    """测试API上传功能"""
    print("创建测试PDF...")
    pdf_content = create_test_pdf()
    
    print("准备上传到API...")
    
    # 准备文件数据
    files = {
        'file': ('test.pdf', pdf_content, 'application/pdf')
    }
    
    data = {
        'session_id': '1'
    }
    
    try:
        # 测试文件上传
        print("调用测试API...")
        response = requests.post(
            'http://localhost:5000/api/quiz/test-upload',
            files=files,
            data=data,
            timeout=30
        )
        
        print(f"响应状态码: {response.status_code}")
        print(f"响应内容: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ 文件上传测试成功!")
            print(f"文件信息: {result.get('file_info', {})}")
            print(f"文本信息: {result.get('text_info', {})}")
        else:
            print("❌ 文件上传测试失败!")
            
    except Exception as e:
        print(f"❌ 测试出错: {e}")

if __name__ == "__main__":
    test_api_upload()
