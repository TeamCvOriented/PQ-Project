#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.models import Session, Quiz, User

app = create_app()

with app.app_context():
    print("=== 检查数据库中的Session和Quiz数据 ===")
    
    # 检查Session
    sessions = Session.query.all()
    print(f"\n总会话数: {len(sessions)}")
    for session in sessions:
        print(f"- Session ID: {session.id}, 激活状态: {session.is_active}, 组织者: {session.organizer.username}")
        
        # 检查这个session的quiz
        quizzes = Quiz.query.filter_by(session_id=session.id).all()
        print(f"  该会话的题目数: {len(quizzes)}")
        for quiz in quizzes:
            print(f"  - Quiz ID: {quiz.id}, 激活: {quiz.is_active}, 题目: {quiz.question[:50]}...")
    
    print("\n=== 检查所有Quiz数据 ===")
    all_quizzes = Quiz.query.all()
    print(f"总题目数: {len(all_quizzes)}")
    for quiz in all_quizzes:
        print(f"- Quiz ID: {quiz.id}, Session ID: {quiz.session_id}, 激活: {quiz.is_active}")
        print(f"  题目: {quiz.question}")
        print(f"  选项A: {quiz.option_a}")
        print(f"  选项B: {quiz.option_b}")
        print(f"  选项C: {quiz.option_c}")
        print(f"  选项D: {quiz.option_d}")
        print("---")
