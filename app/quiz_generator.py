import google.generativeai as genai
import os
import json
import re
from typing import List, Dict

class QuizGenerator:
    def __init__(self):
        # 配置Gemini API
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("请在.env文件中设置GEMINI_API_KEY")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-pro')
    
    def generate_quiz(self, content_text: str, num_questions: int = 1) -> List[Dict]:
        """
        根据内容文本生成选择题
        
        Args:
            content_text: 源内容文本
            num_questions: 要生成的题目数量
            
        Returns:
            包含题目信息的字典列表
        """
        # 构建提示词
        prompt = self._build_prompt(content_text, num_questions)
        
        try:
            # 调用Gemini API
            response = self.model.generate_content(prompt)
            
            # 解析响应
            quiz_data = self._parse_response(response.text)
            
            # 验证和优化题目质量
            validated_quizzes = []
            for quiz in quiz_data:
                if self._validate_quiz(quiz):
                    optimized_quiz = self._optimize_quiz(quiz, content_text)
                    validated_quizzes.append(optimized_quiz)
            
            return validated_quizzes[:num_questions]
            
        except Exception as e:
            print(f"生成题目时出错: {str(e)}")
            return []
    
    def _build_prompt(self, content_text: str, num_questions: int) -> str:
        """构建发送给AI的提示词"""
        prompt = f"""
请根据以下内容生成{num_questions}道高质量的选择题。题目要求：

1. 题目应该有适当的难度，既不过于简单也不过于困难
2. 四个选项中只有一个正确答案
3. 错误选项要有一定的迷惑性，但不能是明显错误的
4. 题目要紧扣内容核心，测试理解而非记忆
5. 每道题的回答时间应控制在10-30秒内
6. 提供题目解释说明

内容文本：
{content_text}

请按照以下JSON格式返回：
```json
[
    {{
        "question": "题目内容",
        "option_a": "选项A",
        "option_b": "选项B", 
        "option_c": "选项C",
        "option_d": "选项D",
        "correct_answer": "A",
        "explanation": "答案解释",
        "difficulty": "medium",
        "time_estimate": 20
    }}
]
```

请确保返回的是有效的JSON格式。
"""
        return prompt
    
    def _parse_response(self, response_text: str) -> List[Dict]:
        """解析AI返回的响应"""
        try:
            # 提取JSON部分
            json_match = re.search(r'```json\s*(.*?)\s*```', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                # 如果没有找到代码块，尝试直接解析
                json_str = response_text
            
            # 解析JSON
            quiz_data = json.loads(json_str)
            
            # 确保返回的是列表
            if isinstance(quiz_data, dict):
                quiz_data = [quiz_data]
            
            return quiz_data
            
        except json.JSONDecodeError as e:
            print(f"JSON解析错误: {str(e)}")
            print(f"原始响应: {response_text}")
            return []
    
    def _validate_quiz(self, quiz: Dict) -> bool:
        """验证题目的基本格式和质量"""
        required_fields = ['question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer']
        
        # 检查必需字段
        for field in required_fields:
            if field not in quiz or not quiz[field]:
                return False
        
        # 检查正确答案格式
        if quiz['correct_answer'] not in ['A', 'B', 'C', 'D']:
            return False
        
        # 检查题目长度
        if len(quiz['question']) < 10 or len(quiz['question']) > 500:
            return False
        
        # 检查选项长度
        for option in ['option_a', 'option_b', 'option_c', 'option_d']:
            if len(quiz[option]) < 1 or len(quiz[option]) > 200:
                return False
        
        return True
    
    def _optimize_quiz(self, quiz: Dict, content_text: str) -> Dict:
        """优化题目质量"""
        try:
            # 使用AI进行题目质量检查和优化
            optimization_prompt = f"""
请评估并优化以下选择题的质量：

题目：{quiz['question']}
A. {quiz['option_a']}
B. {quiz['option_b']} 
C. {quiz['option_c']}
D. {quiz['option_d']}
正确答案：{quiz['correct_answer']}

原始内容：{content_text[:1000]}...

请检查：
1. 题目是否过于简单或过于困难？
2. 错误选项是否有足够的迷惑性？
3. 题目是否真正测试了对内容的理解？

如果需要优化，请返回优化后的题目，格式与原题相同。如果不需要优化，请返回"NO_CHANGE"。
"""
            
            response = self.model.generate_content(optimization_prompt)
            
            if "NO_CHANGE" not in response.text:
                optimized_data = self._parse_response(response.text)
                if optimized_data and self._validate_quiz(optimized_data[0]):
                    return optimized_data[0]
            
        except Exception as e:
            print(f"优化题目时出错: {str(e)}")
        
        return quiz
    
    def check_quiz_quality(self, quiz: Dict, content_text: str) -> Dict:
        """检查题目质量并返回评估结果"""
        try:
            quality_prompt = f"""
请评估以下选择题的质量（1-10分）：

题目：{quiz['question']}
A. {quiz['option_a']}
B. {quiz['option_b']}
C. {quiz['option_c']} 
D. {quiz['option_d']}
正确答案：{quiz['correct_answer']}

原始内容：{content_text[:1000]}...

请从以下维度评分：
1. 相关性：题目是否与内容相关 (1-10)
2. 难度适中：题目难度是否合适 (1-10)
3. 迷惑性：错误选项是否有迷惑性 (1-10)
4. 清晰度：题目表述是否清晰 (1-10)

请返回JSON格式：
{{
    "relevance": 8,
    "difficulty": 7,
    "distraction": 6,
    "clarity": 9,
    "overall": 7.5,
    "suggestions": "改进建议"
}}
"""
            
            response = self.model.generate_content(quality_prompt)
            quality_data = self._parse_response(response.text)
            
            return quality_data[0] if quality_data else {}
            
        except Exception as e:
            print(f"检查题目质量时出错: {str(e)}")
            return {}
    
    def generate_diverse_quizzes(self, content_text: str, num_questions: int = 3) -> List[Dict]:
        """
        生成多样化的题目，确保不同学生收到不同的问题
        """
        all_quizzes = []
        
        # 分批生成题目以增加多样性
        for i in range(num_questions):
            variation_prompt = f"""
基于以下内容，请生成一道与之前生成的题目不同的选择题。
要求题目角度新颖，关注内容的不同方面。

内容：{content_text}

第{i+1}次生成，请确保题目的独特性。
"""
            
            quiz = self.generate_quiz(content_text, 1)
            if quiz:
                all_quizzes.extend(quiz)
        
        return all_quizzes
