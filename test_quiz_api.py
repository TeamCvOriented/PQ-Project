#!/usr/bin/env python
# -*- coding: utf-8 -*-

import requests
import json

def test_current_quiz_api():
    """直接测试 /quiz/current/1 API"""
    
    base_url = "http://localhost:5000"
    
    print("=== 测试 /quiz/current/1 API ===")
    
    try:
        # 测试获取当前题目
        response = requests.get(f"{base_url}/api/quiz/current/1")
        
        print(f"状态码: {response.status_code}")
        print(f"响应头: {dict(response.headers)}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print("响应数据:")
                print(json.dumps(data, indent=2, ensure_ascii=False))
            except:
                print("响应内容:")
                print(response.text)
        else:
            print("错误响应:")
            print(response.text)
            
    except requests.exceptions.ConnectionError:
        print("连接错误：服务器可能未运行")
    except Exception as e:
        print(f"测试失败: {e}")

if __name__ == "__main__":
    test_current_quiz_api()
