#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.models import Quiz
from app import db

def activate_first_quiz():
    """激活第一道题目来测试显示"""
    app = create_app()
    
    with app.app_context():
        print("=== 激活第一道题目进行测试 ===")
        
        # 获取第一道题目
        first_quiz = Quiz.query.filter_by(session_id=1).first()
        
        if first_quiz:
            # 先关闭所有其他活跃题目
            Quiz.query.filter_by(session_id=1, is_active=True).update({'is_active': False})
            
            # 激活第一道题目
            first_quiz.is_active = True
            db.session.commit()
            
            print(f"已激活题目 {first_quiz.id}: {first_quiz.question}")
            print("现在听众界面应该能看到题目了！")
            
            return True
        else:
            print("没有找到题目")
            return False

if __name__ == "__main__":
    activate_first_quiz()
