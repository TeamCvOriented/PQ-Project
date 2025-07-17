#!/usr/bin/env python3
# -*- coding: utf-8 -*-

# 测试新版 Gemini API
import os
from google import genai

def test_gemini_api():
    """测试基本的Gemini API调用"""
    try:
        # 检查API密钥
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            print("❌ 未找到GEMINI_API_KEY环境变量")
            return False
        
        print("✅ API密钥已找到")
        
        # 创建客户端
        client = genai.Client(api_key=api_key)
        print("✅ 客户端创建成功")
        
        # 简单的API调用
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents="用中文简短回答：什么是人工智能？"
        )
        
        print("✅ API调用成功")
        print(f"响应: {response.text}")
        return True
        
    except Exception as e:
        print(f"❌ API测试失败: {e}")
        return False

if __name__ == "__main__":
    print("=== Gemini API 基础测试 ===")
    if test_gemini_api():
        print("\n🎉 Gemini API 工作正常！")
    else:
        print("\n❌ Gemini API 测试失败")
