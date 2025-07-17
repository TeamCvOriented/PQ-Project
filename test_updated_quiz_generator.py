#!/usr/bin/env python3
"""
测试更新后的 QuizGenerator（新版 google-genai API + 20秒超时）
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.quiz_generator import QuizGenerator
import time

def test_quiz_generation():
    """测试题目生成功能"""
    print("=== 测试新版 QuizGenerator ===\n")
    
    # 创建生成器
    generator = QuizGenerator()
    
    # 测试内容
    test_content = """
    Python是一种高级编程语言，由Guido van Rossum于1991年首次发布。
    Python设计哲学强调代码的可读性和简洁的语法（尤其是使用空格缩进划分代码块，而非使用大括号或者关键词）。
    相比于C++或Java，Python让开发者能够用更少的代码表达想法。
    Python支持多种编程范式，包括结构化、面向对象和函数式编程。
    Python拥有一个巨大而广泛的标准库，提供了丰富的工具和模块。
    """
    
    print("📝 测试内容:")
    print(test_content.strip())
    print("\n" + "="*50 + "\n")
    
    # 测试1: 生成1道题目
    print("1️⃣ 测试生成1道题目（20秒超时）")
    start_time = time.time()
    
    try:
        questions = generator.generate_quiz(test_content, num_questions=1)
        elapsed = time.time() - start_time
        
        print(f"⏱️  总耗时: {elapsed:.2f}秒")
        
        if questions:
            print(f"✅ 成功生成 {len(questions)} 道题目:")
            for i, q in enumerate(questions, 1):
                print(f"\n📋 题目 {i}:")
                print(f"问题: {q.get('question', '未知')}")
                print("选项:")
                options = q.get('options', [])
                if options:
                    for j, option in enumerate(options):
                        print(f"  {chr(65+j)}. {option}")
                else:
                    print(f"  A. {q.get('option_a', '选项A')}")
                    print(f"  B. {q.get('option_b', '选项B')}")
                    print(f"  C. {q.get('option_c', '选项C')}")
                    print(f"  D. {q.get('option_d', '选项D')}")
                
                correct = q.get('correct_answer', 0)
                if isinstance(correct, int):
                    print(f"正确答案: {chr(65+correct)}")
                else:
                    print(f"正确答案: {correct}")
                print(f"解释: {q.get('explanation', '无解释')}")
        else:
            print("❌ 没有生成任何题目")
            
    except Exception as e:
        elapsed = time.time() - start_time
        print(f"❌ 测试失败 (耗时 {elapsed:.2f}秒): {e}")
    
    print("\n" + "="*50 + "\n")
    
    # 测试2: 生成2道题目
    print("2️⃣ 测试生成2道题目（20秒超时）")
    start_time = time.time()
    
    try:
        questions = generator.generate_quiz(test_content, num_questions=2)
        elapsed = time.time() - start_time
        
        print(f"⏱️  总耗时: {elapsed:.2f}秒")
        
        if questions:
            print(f"✅ 成功生成 {len(questions)} 道题目")
            for i, q in enumerate(questions, 1):
                print(f"\n📋 题目 {i}: {q.get('question', '未知')[:50]}...")
        else:
            print("❌ 没有生成任何题目")
            
    except Exception as e:
        elapsed = time.time() - start_time
        print(f"❌ 测试失败 (耗时 {elapsed:.2f}秒): {e}")
    
    print("\n" + "="*50 + "\n")
    
    # 总结
    print("📊 测试总结:")
    if hasattr(generator, 'use_mock') and generator.use_mock:
        print("🔄 当前使用: 模拟生成器（Mock Generator）")
        print("💡 原因: API密钥不可用或地区限制")
    elif hasattr(generator, 'client') and generator.client:
        print("🚀 当前使用: 新版 Gemini API (google-genai)")
        print("✅ API 客户端初始化成功")
    else:
        print("❓ 状态未知")

if __name__ == "__main__":
    test_quiz_generation()
