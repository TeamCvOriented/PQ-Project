#!/usr/bin/env python3
"""
测试PPT文件上传功能
"""

import requests
import os

def test_ppt_upload():
    """测试PPT文件上传"""
    print("=== 测试PPT文件上传功能 ===")
    
    # 配置
    BASE_URL = "http://localhost:5000"
    
    # 创建一个简单的测试用文本文件（模拟PPT内容）
    test_content = """
    人工智能概述
    
    什么是人工智能？
    人工智能（Artificial Intelligence，AI）是计算机科学的一个分支，它企图了解智能的实质，并生产出一种新的能以人类智能相似的方式做出反应的智能机器。
    
    人工智能的发展历史：
    1. 1950年，阿兰·图灵提出了著名的图灵测试
    2. 1956年，达特茅斯会议标志着人工智能学科的诞生
    3. 1980年代，专家系统的兴起
    4. 1990年代，机器学习算法的发展
    5. 2010年代，深度学习的突破
    
    人工智能的应用领域：
    - 自然语言处理
    - 计算机视觉  
    - 机器学习
    - 专家系统
    - 机器人技术
    
    未来发展趋势：
    人工智能将在医疗、教育、交通、金融等各个领域发挥越来越重要的作用。
    """
    
    # 将文本保存为临时文件（模拟上传）
    temp_file_path = "temp_test_content.txt"
    with open(temp_file_path, 'w', encoding='utf-8') as f:
        f.write(test_content)
    
    try:
        # 测试文件上传
        with open(temp_file_path, 'rb') as f:
            files = {'file': ('test_content.txt', f, 'text/plain')}
            data = {'num_questions': '3'}
            
            response = requests.post(f"{BASE_URL}/api/quiz/upload", files=files, data=data, timeout=30)
            
            print(f"上传状态码: {response.status_code}")
            print(f"响应内容: {response.text}")
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    print("✅ 文件上传和题目生成成功！")
                    questions = result.get('questions', [])
                    print(f"生成了 {len(questions)} 道题目:")
                    for i, q in enumerate(questions, 1):
                        print(f"\n题目 {i}: {q.get('question', '未知题目')}")
                        options = q.get('options', [])
                        for j, option in enumerate(options):
                            print(f"  {chr(65+j)}. {option}")
                        print(f"  正确答案: {chr(65+q.get('correct_answer', 0))}")
                else:
                    print(f"❌ 上传失败: {result.get('message')}")
            else:
                print(f"❌ 请求失败，状态码: {response.status_code}")
                print(f"错误信息: {response.text}")
                
    except requests.exceptions.RequestException as e:
        print(f"❌ 网络请求错误: {e}")
    except Exception as e:
        print(f"❌ 其他错误: {e}")
    finally:
        # 清理临时文件
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

def test_ppt_file_detection():
    """测试PPT文件格式检测"""
    print("\n=== 测试PPT文件格式检测 ===")
    
    try:
        import sys
        sys.path.append('.')
        from app.file_processor import FileProcessor
        
        processor = FileProcessor()
        
        # 测试不同的文件头
        test_cases = [
            {
                'name': 'PPTX文件头',
                'header': b'PK\x03\x04\x14\x00\x00\x00',
                'should_work': True
            },
            {
                'name': 'PPT文件头(OLE)',
                'header': b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1',
                'should_work': False
            },
            {
                'name': '无效文件头',
                'header': b'INVALID_HEADER_TEST',
                'should_work': False
            }
        ]
        
        for case in test_cases:
            print(f"\n测试 {case['name']}:")
            # 创建模拟的文件内容
            fake_content = case['header'] + b'This is simulated file content for testing file header detection.' * 10
            
            try:
                result = processor.extract_text_from_ppt_bytes(fake_content)
                print(f"  结果: {result[:100]}...")
                
                if case['should_work']:
                    if '错误' not in result and '失败' not in result:
                        print("  ✅ 按预期工作")
                    else:
                        print("  ❌ 应该成功但失败了")
                else:
                    if '不支持' in result or '错误' in result or '失败' in result:
                        print("  ✅ 按预期被拒绝")
                    else:
                        print("  ❌ 应该失败但成功了")
            except Exception as e:
                print(f"  异常: {e}")
    except ImportError as e:
        print(f"❌ 无法导入模块: {e}")
        print("跳过文件格式检测测试")

if __name__ == "__main__":
    test_ppt_file_detection()
    test_ppt_upload()
