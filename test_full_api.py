#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
import io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import json

# 创建会话对象保持登录状态
session = requests.Session()

def create_test_pdf():
    """创建一个测试PDF文件"""
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    c.setFont('Helvetica', 16)
    y = height - 50
    
    content = [
        "Artificial Intelligence Tutorial",
        "",
        "Chapter 1: Introduction to AI",
        "",
        "What is Artificial Intelligence?",
        "Artificial Intelligence (AI) refers to the simulation of human intelligence",
        "in machines that are programmed to think and learn like humans.",
        "",
        "Types of AI:",
        "1. Narrow AI - designed for specific tasks",
        "2. General AI - can handle any intellectual task",
        "3. Super AI - exceeds human intelligence",
        "",
        "Machine Learning Basics:",
        "Machine learning is a subset of AI that enables computers to learn",
        "without being explicitly programmed. Key concepts include:",
        "- Supervised learning",
        "- Unsupervised learning", 
        "- Reinforcement learning",
        "",
        "Applications of AI:",
        "- Healthcare diagnosis",
        "- Autonomous vehicles",
        "- Natural language processing",
        "- Computer vision",
        "- Robotics"
    ]
    
    for line in content:
        if y < 50:
            c.showPage()
            c.setFont('Helvetica', 16)
            y = height - 50
        
        c.drawString(50, y, line)
        y -= 20
    
    c.save()
    buffer.seek(0)
    return buffer.getvalue()

def test_login():
    """测试登录并获取会话"""
    login_data = {
        'username': 'speaker1',
        'password': 'speaker123'
    }
    
    try:
        # 登录
        response = session.post(
            'http://localhost:5000/api/auth/login',
            json=login_data,
            timeout=10
        )
        
        if response.status_code == 200:
            print("✅ 登录成功!")
            
            # 获取会话列表
            response = session.get(
                'http://localhost:5000/api/session/list',
                timeout=10
            )
            
            if response.status_code == 200:
                sessions = response.json().get('sessions', [])
                print(f"找到 {len(sessions)} 个会话")
                if sessions:
                    return sessions[0]['id']
                else:
                    print("⚠️ 没有找到会话，尝试创建一个测试会话")
                    return create_test_session()
            else:
                print(f"❌ 获取会话失败: {response.text}")
                return create_test_session()
        else:
            print(f"❌ 登录失败: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ 登录测试出错: {e}")
        return None

def create_test_session():
    """创建一个测试会话"""
    try:
        session_data = {
            'title': 'AI测试会话',
            'description': '用于测试文件上传和AI题目生成的会话',
            'speaker_id': 2  # speaker1的ID通常是2
        }
        
        response = session.post(
            'http://localhost:5000/api/session/create',
            json=session_data,
            timeout=10
        )
        
        if response.status_code == 201:
            result = response.json()
            session_id = result.get('session_id')
            print(f"✅ 创建测试会话成功，ID: {session_id}")
            return session_id
        else:
            print(f"❌ 创建会话失败: {response.text}")
            return 1  # 使用默认ID
            
    except Exception as e:
        print(f"❌ 创建会话出错: {e}")
        return 1

def test_full_upload(session_id):
    """测试完整的文件上传和AI题目生成"""
    print(f"使用会话ID: {session_id}")
    
    pdf_content = create_test_pdf()
    
    files = {
        'file': ('ai_tutorial.pdf', pdf_content, 'application/pdf')
    }
    
    data = {
        'session_id': str(session_id)
    }
    
    try:
        print("上传文件并生成AI题目...")
        response = session.post(
            'http://localhost:5000/api/quiz/generate-ai-quizzes',
            files=files,
            data=data,
            timeout=60  # AI生成可能需要更长时间
        )
        
        print(f"响应状态码: {response.status_code}")
        result = response.json()
        
        if response.status_code == 200:
            print("✅ AI题目生成成功!")
            print(f"消息: {result.get('message')}")
            print(f"生成题目数量: {result.get('count')}")
        else:
            print("❌ AI题目生成失败!")
            print(f"错误: {result.get('error')}")
            
        return response.status_code == 200
            
    except Exception as e:
        print(f"❌ 完整测试出错: {e}")
        return False

if __name__ == "__main__":
    print("=== 开始完整功能测试 ===")
    
    # 首先测试登录
    session_id = test_login()
    
    if session_id:
        # 测试完整的文件上传和AI生成
        success = test_full_upload(session_id)
        
        if success:
            print("\n🎉 所有测试通过！文件上传和AI题目生成功能正常工作！")
        else:
            print("\n❌ 测试失败，需要进一步调试")
    else:
        print("\n❌ 无法获取有效的会话ID，请先创建会话")
        
        # 使用默认会话ID进行测试
        print("\n尝试使用默认会话ID 1 进行测试...")
        success = test_full_upload(1)
        
        if success:
            print("\n🎉 使用默认会话ID测试通过！")
        else:
            print("\n❌ 默认会话ID测试也失败了")
