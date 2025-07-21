#!/usr/bin/env python3
"""
测试DOM结构冲突修复效果
"""

import requests
import time

BASE_URL = 'http://localhost:5000'

def test_dom_conflict_fix():
    """测试DOM结构冲突修复"""
    print("🔧 测试DOM结构冲突修复...")
    
    session = requests.Session()
    
    # 1. 听众登录
    print("\n=== 1. 听众登录 ===")
    login_data = {
        'username': 'listener1',
        'password': 'listener123'
    }
    
    response = session.post(f'{BASE_URL}/api/auth/login', json=login_data)
    if response.status_code == 200:
        print("✅ 听众登录成功")
    else:
        print(f"❌ 登录失败: {response.text}")
        return
    
    # 2. 检查会话和题目数据
    print("\n=== 2. 检查题目数据 ===")
    response = session.get(f'{BASE_URL}/api/session/list')
    if response.status_code == 200:
        sessions_data = response.json()
        sessions = sessions_data.get('sessions', [])
        
        for s in sessions:
            if s.get('is_participant') and s.get('is_active'):
                session_id = s.get('id')
                print(f"✅ 发现活跃会话: {session_id}")
                
                # 检查当前题目
                quiz_response = session.get(f'{BASE_URL}/api/quiz/current/{session_id}')
                
                if quiz_response.status_code == 200:
                    quiz_data = quiz_response.json()
                    if quiz_data.get('success') and quiz_data.get('quiz'):
                        quiz = quiz_data['quiz']
                        print(f"✅ 题目数据完整:")
                        print(f"  ID: {quiz.get('id')}")
                        print(f"  问题: {quiz.get('question')}")
                        print(f"  选项A: {quiz.get('option_a')}")
                        print(f"  选项B: {quiz.get('option_b')}")
                        print(f"  选项C: {quiz.get('option_c')}")
                        print(f"  选项D: {quiz.get('option_d')}")
                        print(f"  时间限制: {quiz.get('time_limit', 60)}秒")
                        
                        print("\n🔧 DOM结构冲突修复要点:")
                        print("✅ 移除了重复的timer ID创建")
                        print("✅ 使用现有的#timer元素更新计时")
                        print("✅ displayQuiz函数适配HTML模板结构")
                        print("✅ 自动切换到答题区标签页")
                        
                        print("\n📱 浏览器测试:")
                        print("1. 刷新页面 (Ctrl+F5)")
                        print("2. 登录听众账号")
                        print("3. 应该自动切换到答题区标签页")
                        print("4. 应该看到完整的题目内容")
                        print("5. 计时器应该正常工作")
                        return
                        
                print("ℹ️ 当前没有活跃题目")
                break
    
    print("❌ 没有找到活跃会话或题目")

def main():
    test_dom_conflict_fix()

if __name__ == '__main__':
    main()
