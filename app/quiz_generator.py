import os
import json
import logging
import asyncio
import time
import re
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from google import genai
from google.genai import types

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
        
        # 配置新版 Gemini API
        self.api_key = os.getenv('GEMINI_API_KEY')
        self.use_mock = False
        self.client = None
        self.mock_generator = MockQuizGenerator()
        
        if not self.api_key:
            print("警告: 未找到GEMINI_API_KEY，将使用模拟生成器")
            self.use_mock = True
        else:
            try:
                # 使用新的 google-genai 客户端
                self.client = genai.Client(api_key=self.api_key)
                print("✅ 新版 Gemini API 配置成功")
            except Exception as e:
                print(f"警告: 新版 Gemini API 配置失败，将使用模拟生成器: {e}")
                self.use_mock = True
                self.client = None
    
    
    async def _generate_with_gemini_async(self, content_text: str, num_questions: int = 1) -> List[Dict]:
        """
        使用新版 Gemini API 异步生成题目（支持20秒超时）
        """
        if not self.client:
            raise Exception("Gemini API 客户端未初始化")
        
        # 构建提示词
        prompt = f"""
基于以下内容生成 {num_questions} 道选择题。每道题有4个选项，请标明正确答案序号（0-3）和解释。

内容：
{content_text[:2000]}  # 限制内容长度避免超时

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
3. 正确答案序号从0开始
4. 解释要简洁明了
"""
        
        try:
            # 使用新版 API 生成内容，关闭思考功能以提高速度
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    thinking_config=types.ThinkingConfig(thinking_budget=0)  # 关闭思考功能
                ),
            )
            
            return self._parse_response(response.text)
            
        except Exception as e:
            logger.error(f"Gemini API调用失败: {e}")
            raise e
    
    def generate_quiz(self, content_text: str, num_questions: int = 1) -> List[Dict]:
        """
        根据内容文本生成选择题（支持20秒超时）
        
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
        
        # 尝试使用真实的 Gemini API (20秒超时)
        try:
            print("🔄 正在使用新版 Gemini API 生成题目...")
            start_time = time.time()
            
            # 使用异步方式处理超时
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            try:
                # 设置20秒超时
                result = loop.run_until_complete(
                    asyncio.wait_for(
                        self._generate_with_gemini_async(content_text, num_questions),
                        timeout=20.0
                    )
                )
                
                elapsed_time = time.time() - start_time
                print(f"✅ Gemini API 调用成功，耗时: {elapsed_time:.2f}秒")
                return result
                
            except asyncio.TimeoutError:
                elapsed_time = time.time() - start_time
                print(f"⏰ Gemini API 调用超时（{elapsed_time:.1f}秒），切换到模拟生成器...")
                return self.mock_generator.generate_quiz(content_text, num_questions)
                
            finally:
                loop.close()
                
        except Exception as e:
            print(f"❌ Gemini API调用失败: {e}")
            print("🔄 切换到模拟生成器...")
            return self.mock_generator.generate_quiz(content_text, num_questions)

    
    def _parse_response(self, response_text: str) -> List[Dict]:
        """解析新版 API 返回的响应"""
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

