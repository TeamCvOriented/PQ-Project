#!/usr/bin/env python
# -*- coding: utf-8 -*-

import requests
import json
import time

def simulate_user_login():
    """模拟用户登录"""
    base_url = "http://localhost:5000"
    
    print("=== 模拟用户登录流程 ===")
    
    session = requests.Session()
    
    # 1. 登录
    login_data = {
        'username': 'listener1',
        'password': 'listener123'
    }
    
    try:
        login_response = session.post(f"{base_url}/api/auth/login", json=login_data)
        print(f"登录响应状态: {login_response.status_code}")
        
        if login_response.status_code == 200:
            login_result = login_response.json()
            print(f"登录成功: {login_result}")
            
            # 2. 检查profile
            profile_response = session.get(f"{base_url}/api/auth/profile")
            print(f"Profile响应状态: {profile_response.status_code}")
            
            if profile_response.status_code == 200:
                profile_data = profile_response.json()
                print(f"用户信息: {profile_data}")
                
                # 3. 加入会话
                join_response = session.post(f"{base_url}/api/session/1/join")
                print(f"加入会话响应状态: {join_response.status_code}")
                
                if join_response.status_code == 200:
                    join_result = join_response.json()
                    print(f"加入会话成功: {join_result}")
                    
                    # 4. 获取题目
                    quiz_response = session.get(f"{base_url}/api/quiz/current/1")
                    print(f"获取题目响应状态: {quiz_response.status_code}")
                    
                    if quiz_response.status_code == 200:
                        quiz_data = quiz_response.json()
                        print(f"题目数据: {json.dumps(quiz_data, indent=2, ensure_ascii=False)}")
                        return True
                    else:
                        print(f"获取题目失败: {quiz_response.text}")
                else:
                    print(f"加入会话失败: {join_response.text}")
            else:
                print(f"获取Profile失败: {profile_response.text}")
        else:
            print(f"登录失败: {login_response.text}")
            
    except Exception as e:
        print(f"测试失败: {e}")
    
    return False

if __name__ == "__main__":
    simulate_user_login()
