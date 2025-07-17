import json
import random
from typing import List, Dict

class MockQuizGenerator:
    """模拟的题目生成器，用于网络连接不稳定时的测试"""
    
    def __init__(self):
        # 预定义的题目模板
        self.question_templates = [
            {
                "question": "根据文档内容，{topic}的主要特点是什么？",
                "options": {
                    "A": "具有{feature1}特性",
                    "B": "具有{feature2}特性", 
                    "C": "具有{feature3}特性",
                    "D": "以上都是"
                },
                "correct_answer": "D"
            },
            {
                "question": "文档中提到的{concept}主要应用于哪个领域？",
                "options": {
                    "A": "{field1}",
                    "B": "{field2}",
                    "C": "{field3}", 
                    "D": "所有领域"
                },
                "correct_answer": "A"
            },
            {
                "question": "关于{topic}，以下说法正确的是？",
                "options": {
                    "A": "{statement1}",
                    "B": "{statement2}",
                    "C": "{statement3}",
                    "D": "以上都不对"
                },
                "correct_answer": "A"
            }
        ]
    
    def generate_quiz(self, content_text: str, num_questions: int = 1) -> List[Dict]:
        """
        根据内容文本生成模拟题目
        """
        # 从文本中提取关键词
        keywords = self._extract_keywords(content_text)
        
        quizzes = []
        for i in range(min(num_questions, 5)):  # 最多生成5道题
            template = random.choice(self.question_templates)
            quiz = self._generate_from_template(template, keywords, i)
            quizzes.append(quiz)
            
        return quizzes
    
    def _extract_keywords(self, text: str) -> Dict:
        """从文本中提取关键词"""
        # 简单的关键词提取逻辑
        topics = ["人工智能", "机器学习", "深度学习", "算法", "数据", "智能"]
        features = ["自动化", "智能化", "高效性", "准确性", "可扩展性"]
        fields = ["医疗", "教育", "金融", "交通", "制造业"]
        concepts = ["神经网络", "监督学习", "无监督学习", "强化学习"]
        
        # 从文本中查找存在的关键词
        found_topics = [t for t in topics if t in text]
        found_features = [f for f in features if f in text]
        found_fields = [f for f in fields if f in text]
        found_concepts = [c for c in concepts if c in text]
        
        return {
            "topics": found_topics if found_topics else topics[:3],
            "features": found_features if found_features else features[:3], 
            "fields": found_fields if found_fields else fields[:3],
            "concepts": found_concepts if found_concepts else concepts[:3]
        }
    
    def _generate_from_template(self, template: Dict, keywords: Dict, index: int) -> Dict:
        """根据模板和关键词生成题目"""
        quiz = template.copy()
        
        # 替换模板中的占位符
        topic = keywords["topics"][index % len(keywords["topics"])]
        concept = keywords["concepts"][index % len(keywords["concepts"])]
        
        quiz["question"] = quiz["question"].format(
            topic=topic,
            concept=concept
        )
        
        # 替换选项中的占位符
        features = keywords["features"]
        fields = keywords["fields"]
        
        for key, option in quiz["options"].items():
            quiz["options"][key] = option.format(
                feature1=features[0] if len(features) > 0 else "智能化",
                feature2=features[1] if len(features) > 1 else "自动化", 
                feature3=features[2] if len(features) > 2 else "高效性",
                field1=fields[0] if len(fields) > 0 else "医疗",
                field2=fields[1] if len(fields) > 1 else "教育",
                field3=fields[2] if len(fields) > 2 else "金融",
                statement1=f"{topic}具有重要意义",
                statement2=f"{topic}应用有限",
                statement3=f"{topic}技术不成熟"
            )
        
        return quiz
