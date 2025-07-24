import os
import json
import logging
import asyncio
import time
import re
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from openai import OpenAI

# 加载环境变量
load_dotenv()

logger = logging.getLogger(__name__)

class MockQuizGenerator:
    """
    模拟题目生成器，用于测试和备用
    """
    def __init__(self):
        pass
    
    def generate_quiz(self, text_content: str, num_questions: int = 5) -> List[Dict]:
        """
        生成模拟题目
        """
        
        try:
            # 基于文本内容生成一些简单的模拟题目
            mock_questions = []
            
            for i in range(min(num_questions, 3)):  # 最多生成3题
                question = {
                    "question": f"基于提供内容的第{i+1}道题目",
                    "options": [
                        f"选项A：相关概念{i+1}",
                        f"选项B：相关概念{i+2}",
                        f"选项C：相关概念{i+3}",
                        f"选项D：相关概念{i+4}"
                    ],
                    "correct_answer": i % 4,  # 循环选择正确答案
                    "explanation": f"这是第{i+1}道题的解释说明"
                }
                mock_questions.append(question)
            
            return mock_questions
            
        except Exception as e:
            logger.error(f"模拟题目生成失败: {e}")
            return []

class QuizGenerator:
    def __init__(self):
        # 加载环境变量
        load_dotenv()
        
        # 配置 Qwen API
        self.api_key = os.getenv('QWEN_API_KEY')
        self.use_mock = False
        self.client = None
        self.mock_generator = MockQuizGenerator()
        
        if not self.api_key:
            print("警告: 未找到QWEN_API_KEY，将使用模拟生成器")
            self.use_mock = True
        else:
            try:
                # 使用 OpenAI 兼容的 Qwen API
                self.client = OpenAI(
                    api_key=self.api_key,
                    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
                )
                print("✅ Qwen API 配置成功")
            except Exception as e:
                print(f"警告: Qwen API 配置失败，将使用模拟生成器: {e}")
                self.use_mock = True
                self.client = None
    
    
    async def _generate_with_qwen_async(self, content_text: str, num_questions: int = 1) -> List[Dict]:
        """
        使用 Qwen API 异步生成题目（动态超时：75-300秒）
        """
        if not self.client:
            raise Exception("Qwen API 客户端未初始化")
        
        # 构建提示词
        # 对于超长内容，给AI一些处理建议
        content_length = len(content_text)
        content_hint = ""
        if content_length > 80000:
            content_hint = f"\n\n注意：内容极其庞大（{content_length}字符），请深度分析全文内容，从中提炼最核心的概念、关键定义、重要理论和实践要点来生成高质量的题目。请确保题目覆盖内容的精华部分。"
        elif content_length > 50000:
            content_hint = f"\n\n注意：内容非常庞大（{content_length}字符），请全面分析文本后，重点关注核心概念、关键定义、重要理论和关键信息生成高质量题目。"
        elif content_length > 30000:
            content_hint = f"\n\n注意：内容非常长（{content_length}字符），请仔细分析全文后，重点关注核心概念、关键定义和重要信息生成高质量题目。"
        elif content_length > 15000:
            content_hint = f"\n\n注意：内容较长（{content_length}字符），请重点关注核心概念和关键信息生成题目。"
        
        prompt = f"""
基于以下内容生成 {num_questions} 道选择题。每道题有4个选项，请标明正确答案序号（0-3）和解释。

内容：
{content_text}{content_hint}

请严格按照以下JSON格式返回：
{{
    "questions": [
        {{
            "question": "题目内容",
            "options": ["选项A", "选项B", "选项C", "选项D"],
            "correct_answer": 0,
            "explanation": "答案解释"
        }}
    ]
}}

要求：
1. 题目要基于提供的内容
2. 选项要合理且有区分度
3. 正确答案序号从0开始（0=第一个选项，1=第二个选项，等等）
4. 解释要简洁明了
5. 只返回JSON，不要其他文字
"""
        
        try:
            # 使用 Qwen API 生成内容
            response = self.client.chat.completions.create(
                model="qwen-plus",  # 使用qwen-plus模型
                messages=[
                    {'role': 'system', 'content': 'You are a helpful assistant that generates quiz questions based on provided content. Always respond with valid JSON format.'},
                    {'role': 'user', 'content': prompt}
                ],
                temperature=0.7,
                max_tokens=2000,
                timeout=60.0  # 增加到60秒超时，为整体动态超时留出充分缓冲
            )
            
            response_text = response.choices[0].message.content
            print(f"✅ Qwen API 调用成功，返回内容长度: {len(response_text)}")
            return self._parse_response(response_text)
            
        except Exception as e:
            logger.error(f"Qwen API调用失败: {e}")
            raise e
    
    def generate_quiz(self, content_text: str, num_questions: int = 1) -> List[Dict]:
        """
        根据内容文本生成选择题（动态超时：75-300秒）
        
        Args:
            content_text: 源内容文本
            num_questions: 要生成的题目数量
            
        Returns:
            包含题目信息的字典列表
        """
        # 如果使用模拟生成器
        if self.use_mock or not self.client:
            print("使用模拟题目生成器...")
            return self.mock_generator.generate_quiz(content_text, num_questions)
        
        # 尝试使用真实的 Qwen API (动态超时：75-300秒)
        try:
            print("🔄 正在使用 Qwen API 生成题目...")
            start_time = time.time()
            
            # 使用异步方式处理超时
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            try:
                # 根据内容长度动态调整超时时间
                content_length = len(content_text)
                if content_length > 100000:
                    timeout_seconds = 300.0  # 巨型内容使用5分钟超时
                    print(f"📄 检测到巨型内容（{content_length}字符），使用300秒超时...")
                elif content_length > 80000:
                    timeout_seconds = 240.0  # 极大内容使用4分钟超时
                    print(f"📄 检测到极大内容（{content_length}字符），使用240秒超时...")
                elif content_length > 50000:
                    timeout_seconds = 180.0  # 超超长内容使用3分钟超时
                    print(f"📄 检测到超超长内容（{content_length}字符），使用180秒超时...")
                elif content_length > 30000:
                    timeout_seconds = 150.0  # 超长内容使用2.5分钟超时
                    print(f"📄 检测到超长内容（{content_length}字符），使用150秒超时...")
                elif content_length > 20000:
                    timeout_seconds = 120.0  # 很长内容使用2分钟超时
                    print(f"📄 检测到很长内容（{content_length}字符），使用120秒超时...")
                elif content_length > 10000:
                    timeout_seconds = 90.0  # 长内容使用1.5分钟超时
                    print(f"📄 检测到长内容（{content_length}字符），使用90秒超时...")
                else:
                    timeout_seconds = 75.0  # 普通内容使用75秒超时
                
                # 设置动态超时
                result = loop.run_until_complete(
                    asyncio.wait_for(
                        self._generate_with_qwen_async(content_text, num_questions),
                        timeout=timeout_seconds
                    )
                )
                
                elapsed_time = time.time() - start_time
                print(f"✅ Qwen API 调用成功，耗时: {elapsed_time:.2f}秒")
                return result
                
            except asyncio.TimeoutError:
                elapsed_time = time.time() - start_time
                print(f"⏰ Qwen API 调用超时（{elapsed_time:.1f}秒），切换到模拟生成器...")
                return self.mock_generator.generate_quiz(content_text, num_questions)
                
            finally:
                loop.close()
                
        except Exception as e:
            print(f"❌ Qwen API调用失败: {e}")
            print("🔄 切换到模拟生成器...")
            return self.mock_generator.generate_quiz(content_text, num_questions)

    
    def _parse_response(self, response_text: str) -> List[Dict]:
        """解析 Qwen API 返回的响应"""
        try:
            # 清理响应文本
            cleaned_text = response_text.strip()
            
            # 尝试提取JSON部分
            json_match = re.search(r'```json\s*(.*?)\s*```', cleaned_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(1).strip()
            else:
                # 寻找花括号包围的JSON
                brace_match = re.search(r'\{.*\}', cleaned_text, re.DOTALL)
                if brace_match:
                    json_str = brace_match.group(0)
                else:
                    json_str = cleaned_text
            
            # 解析JSON
            data = json.loads(json_str)
            
            # 确保返回的是新格式的题目列表
            if isinstance(data, dict) and 'questions' in data:
                questions = data['questions']
            elif isinstance(data, list):
                questions = data
            else:
                raise ValueError("响应格式不正确")
            
            # 转换为统一格式
            result = []
            for q in questions:
                if isinstance(q, dict) and 'question' in q:
                    formatted_q = {
                        'question': q.get('question', ''),
                        'options': q.get('options', []),
                        'correct_answer': q.get('correct_answer', 0),
                        'explanation': q.get('explanation', ''),
                        'difficulty': q.get('difficulty', 'medium'),
                        'time_estimate': q.get('time_estimate', 20)
                    }
                    
                    # 确保选项是列表格式
                    if not isinstance(formatted_q['options'], list):
                        formatted_q['options'] = [
                            q.get('option_a', '选项A'),
                            q.get('option_b', '选项B'),
                            q.get('option_c', '选项C'),
                            q.get('option_d', '选项D')
                        ]
                    
                    result.append(formatted_q)
            
            if not result:
                raise ValueError("未能解析出有效题目")
                
            print(f"✅ 成功解析出 {len(result)} 道题目")
            return result
            
        except Exception as e:
            print(f"❌ 解析AI响应失败: {e}")
            print(f"原始响应: {response_text[:200]}...")
            # 返回空列表，让调用者处理
            return []
