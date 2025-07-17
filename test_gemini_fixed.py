#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import google.generativeai as genai
import os
from dotenv import load_dotenv

def test_gemini_api():
    """测试Gemini API基本功能"""
    try:
        # 加载.env文件
        load_dotenv()
        
        # 检查API密钥
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            print("❌ 未找到GEMINI_API_KEY环境变量")
            return False
        
        print("✅ API密钥已找到")
        print(f"API密钥: {api_key[:10]}...")  # 只显示前10个字符
        
        # 配置API
        genai.configure(api_key=api_key)
        print("✅ API配置成功")
        
        # 创建模型
        model = genai.GenerativeModel('gemini-1.5-flash')
        print("✅ 模型创建成功")
        
        # 简单的API调用
        response = model.generate_content("用中文简短回答：什么是人工智能？")
        
        print("✅ API调用成功")
        print(f"响应: {response.text}")
        
        # 测试题目生成
        prompt = """
请根据以下内容生成1道高质量的选择题：

人工智能（AI）是计算机科学的一个分支，旨在创建能够执行通常需要人类智能的任务的系统。

要求：
1. 四个选项A、B、C、D
2. 只有一个正确答案
3. 请用JSON格式返回

示例格式：
{
  "question": "题目内容",
  "options": {
    "A": "选项A",
    "B": "选项B", 
    "C": "选项C",
    "D": "选项D"
  },
  "correct_answer": "A"
}
"""
        
        print("\n开始测试题目生成...")
        quiz_response = model.generate_content(prompt)
        print("✅ 题目生成成功")
        print(f"生成的题目: {quiz_response.text}")
        
        return True
        
    except Exception as e:
        print(f"❌ API测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=== Gemini API 功能测试 ===")
    if test_gemini_api():
        print("\n🎉 Gemini API 工作正常！可以进行题目生成了。")
    else:
        print("\n❌ Gemini API 测试失败，请检查API密钥和网络连接")
