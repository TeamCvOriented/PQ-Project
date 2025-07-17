#!/usr/bin/env python3
"""
测试新的 google-genai API
"""

import os
import asyncio
from google import genai
from google.genai import types
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

async def test_simple_api():
    """测试基本的API调用"""
    try:
        # 获取API密钥
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            print("❌ 未找到 GEMINI_API_KEY 环境变量")
            return False
        
        print(f"✅ 找到API密钥: {api_key[:8]}...")
        
        # 创建客户端
        client = genai.Client(api_key=api_key)
        print("✅ 客户端创建成功")
        
        # 测试简单的文本生成（关闭思考功能以提高速度）
        print("🔄 开始测试文本生成...")
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents="用一句话解释什么是人工智能",
            config=types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_budget=0)  # 关闭思考功能
            ),
        )
        
        print(f"✅ API调用成功!")
        print(f"📝 回复: {response.text}")
        return True
        
    except Exception as e:
        print(f"❌ API调用失败: {e}")
        return False

async def test_quiz_generation():
    """测试题目生成功能"""
    try:
        # 获取API密钥
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            print("❌ 未找到 GEMINI_API_KEY 环境变量")
            return False
        
        # 创建客户端
        client = genai.Client(api_key=api_key)
        
        # 测试题目生成
        print("🔄 开始测试题目生成...")
        
        text_content = "Python是一种高级编程语言，具有简洁的语法和强大的功能。"
        
        prompt = f"""
基于以下内容生成2道选择题：

{text_content}

请严格按照以下JSON格式返回：
{{
    "questions": [
        {{
            "question": "题目内容",
            "options": ["A选项", "B选项", "C选项", "D选项"],
            "correct_answer": 0,
            "explanation": "解释"
        }}
    ]
}}
"""
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_budget=0)
            ),
        )
        
        print(f"✅ 题目生成成功!")
        print(f"📝 回复: {response.text}")
        return True
        
    except Exception as e:
        print(f"❌ 题目生成失败: {e}")
        return False

async def main():
    print("=== 测试新的 google-genai API ===\n")
    
    # 测试1: 简单API调用
    print("1️⃣ 测试简单API调用")
    success1 = await test_simple_api()
    print()
    
    # 测试2: 题目生成
    print("2️⃣ 测试题目生成")
    success2 = await test_quiz_generation()
    print()
    
    # 总结
    print("=== 测试结果 ===")
    print(f"简单API调用: {'✅ 成功' if success1 else '❌ 失败'}")
    print(f"题目生成: {'✅ 成功' if success2 else '❌ 失败'}")

if __name__ == "__main__":
    asyncio.run(main())
