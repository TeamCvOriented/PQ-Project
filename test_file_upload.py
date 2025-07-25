#!/usr/bin/env python3
"""
测试文件上传和AI题目生成功能
"""

import tempfile
import os
import sys

# 添加项目路径到sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_file_processor():
    """测试文件处理器"""
    print("🔍 测试文件处理器...")
    
    try:
        from app.file_processor import FileProcessor
        processor = FileProcessor()
        print("✅ FileProcessor 导入成功")
        
        # 创建测试PDF内容
        test_pdf_content = b'''\
%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 100
>>
stream
BT
/F1 12 Tf
100 700 Td
(This is a test PDF document with some content for AI quiz generation) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000208 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
308
%%EOF'''
        
        # 测试PDF处理
        result = processor.extract_text_from_pdf_bytes(test_pdf_content)
        print(f"PDF处理结果: {result[:100]}...")
        
        if "test PDF document" in result:
            print("✅ PDF文本提取成功")
        else:
            print("⚠️ PDF文本提取可能有问题")
            
        return True
        
    except Exception as e:
        print(f"❌ 文件处理器测试失败: {e}")
        return False

def test_quiz_generator():
    """测试题目生成器"""
    print("\n🤖 测试AI题目生成器...")
    
    try:
        from app.quiz_generator import QuizGenerator
        generator = QuizGenerator()
        print("✅ QuizGenerator 导入成功")
        
        # 测试文本
        test_text = """
        人工智能（Artificial Intelligence，AI）是计算机科学的一个分支，它企图了解智能的实质，
        并生产出一种新的能以人类智能相似的方式做出反应的智能机器。该领域的研究包括机器人、
        语言识别、图像识别、自然语言处理和专家系统等。人工智能从诞生以来，理论和技术日益成熟，
        应用领域也不断扩大，可以设想，未来人工智能带来的科技产品，将会是人类智慧的"容器"。
        机器学习是人工智能的一个重要分支，它通过算法使计算机能够从数据中学习。深度学习是
        机器学习的一个子集，它模拟人脑神经网络的结构和功能。
        """
        
        # 生成题目
        print("正在生成测试题目...")
        quizzes = generator.generate_quiz(test_text, num_questions=1)
        
        if quizzes and len(quizzes) > 0:
            quiz = quizzes[0]
            print("✅ 题目生成成功!")
            print(f"题目: {quiz.get('question', 'N/A')[:100]}...")
            print(f"选项A: {quiz.get('option_a', 'N/A')[:50]}...")
            print(f"正确答案: {quiz.get('correct_answer', 'N/A')}")
            return True
        else:
            print("❌ 题目生成失败")
            return False
            
    except Exception as e:
        print(f"❌ 题目生成器测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """主测试函数"""
    print("🚀 开始测试PopQuiz文件上传和AI出题功能\n")
    
    # 测试文件处理器
    file_processor_ok = test_file_processor()
    
    # 测试题目生成器
    quiz_generator_ok = test_quiz_generator()
    
    # 总结
    print("\n📊 测试结果总结:")
    print(f"文件处理器: {'✅ 正常' if file_processor_ok else '❌ 异常'}")
    print(f"题目生成器: {'✅ 正常' if quiz_generator_ok else '❌ 异常'}")
    
    if file_processor_ok and quiz_generator_ok:
        print("\n🎉 所有核心功能测试通过！文件上传和AI出题应该可以正常工作。")
        print("\n💡 使用建议:")
        print("1. 确保上传的PDF或PPTX文件包含可提取的文本内容")
        print("2. 文件大小建议在50MB以内")
        print("3. 文本内容至少应包含20个字符以上")
        print("4. 如果是扫描版PDF，可能无法提取文本")
    else:
        print("\n⚠️ 部分功能存在问题，请检查环境配置。")
    
    return file_processor_ok and quiz_generator_ok

if __name__ == "__main__":
    main()
