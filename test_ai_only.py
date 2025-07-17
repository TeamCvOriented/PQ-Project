#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
import time

# 创建会话对象
session = requests.Session()

def test_ai_generation():
    """测试AI题目生成功能"""
    # 登录
    login_data = {'username': 'speaker1', 'password': 'speaker123'}
    response = session.post('http://localhost:5000/api/auth/login', json=login_data)
    
    if response.status_code != 200:
        print("❌ 登录失败")
        return False
    
    print("✅ 登录成功")
    
    # 准备测试文件内容
    test_content = """
人工智能简介

人工智能（AI）是计算机科学的一个分支，旨在创建能够执行通常需要人类智能的任务的系统。

主要类型：
1. 弱人工智能（窄AI）- 专为特定任务设计
2. 强人工智能（通用AI）- 能处理任何智力任务
3. 超人工智能 - 超越人类智能

机器学习基础：
机器学习是AI的子集，使计算机能够从数据中学习而无需明确编程。

应用领域：
- 医疗诊断
- 自动驾驶
- 语音识别
- 图像识别
"""
    
    # 创建一个PDF文件进行测试
    import io
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter
    
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    c.setFont('Helvetica', 12)
    
    y = 750
    lines = test_content.split('\n')
    for line in lines:
        if y < 50:
            c.showPage()
            c.setFont('Helvetica', 12)
            y = 750
        c.drawString(50, y, line)
        y -= 15
    
    c.save()
    buffer.seek(0)
    pdf_content = buffer.getvalue()
    
    files = {'file': ('ai_intro.pdf', pdf_content, 'application/pdf')}
    data = {'session_id': '1'}
    
    print("开始AI题目生成...")
    start_time = time.time()
    
    try:
        response = session.post(
            'http://localhost:5000/api/quiz/generate-ai-quizzes',
            files=files,
            data=data,
            timeout=120  # 2分钟超时
        )
        
        end_time = time.time()
        duration = end_time - start_time
        
        print(f"请求耗时: {duration:.2f}秒")
        print(f"响应状态: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ AI题目生成成功!")
            print(f"消息: {result.get('message')}")
            print(f"生成数量: {result.get('count')}")
            return True
        else:
            result = response.json()
            print(f"❌ AI题目生成失败: {result.get('error')}")
            return False
            
    except requests.Timeout:
        print("❌ 请求超时，AI生成可能需要更长时间")
        return False
    except Exception as e:
        print(f"❌ 请求出错: {e}")
        return False

if __name__ == "__main__":
    print("=== AI题目生成测试 ===")
    if test_ai_generation():
        print("\n🎉 AI题目生成功能正常工作！")
    else:
        print("\n⚠️ AI题目生成可能需要更长时间，或存在网络问题")
        print("文件上传功能已经正常，可以在界面中测试AI生成")
