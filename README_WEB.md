# PQ-Project 网页版

这是一个基于AI的智能弹题系统，能够根据演讲内容自动生成问题，实时与听众互动。

## 项目架构

### 后端架构（Python Flask）
```
app/
├── __init__.py          # Flask应用初始化
├── models.py            # 数据库模型
├── file_processor.py    # 文件处理模块
├── quiz_generator.py    # AI题目生成模块
└── routes/              # API路由
    ├── auth.py          # 用户认证
    ├── content.py       # 内容管理
    ├── quiz.py          # 题目管理
    ├── session.py       # 会话管理
    └── static.py        # 静态页面路由
```

### 前端架构（HTML/CSS/JavaScript）
```
templates/
├── index.html           # 主页
├── login.html           # 登录页面
├── register.html        # 注册页面
├── organizer.html       # 组织者界面
├── speaker.html         # 演讲者界面
└── listener.html        # 听众界面

static/
└── js/
    ├── organizer.js     # 组织者界面功能
    ├── speaker.js       # 演讲者界面功能
    └── listener.js      # 听众界面功能
```

### 数据库设计
- **Users**: 用户信息（组织者、演讲者、听众）
- **Sessions**: 演讲会话
- **Contents**: 上传的内容文件
- **Quizzes**: AI生成的题目
- **QuizResponses**: 听众答题记录
- **Feedback**: 听众反馈
- **QuizDiscussion**: 题目讨论

## 功能模块

### 1. 用户认证模块
- 用户注册/登录
- 角色权限管理（组织者、演讲者、听众）
- 用户信息管理

### 2. 文件处理模块
- 支持多种文件格式：PPT、PDF、Word、音频、视频
- 文本提取和OCR识别
- 语音转文字功能

### 3. AI题目生成模块
- 基于Gemini API的智能出题
- 题目质量验证和优化
- 多样化题目生成

### 4. 会话管理模块
- 演讲会话创建和管理
- 参与者管理
- 实时状态控制

### 5. 题目交互模块
- 实时题目发布
- 听众答题功能
- 答题统计分析

## 安装和运行

### 1. 环境准备
```bash
# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

### 2. 环境配置
复制 `.env` 文件并配置：
```bash
# 在 .env 文件中设置
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=sqlite:///pq_database.db
SECRET_KEY=your_secret_key_here
UPLOAD_FOLDER=uploads
```

### 3. 初始化数据库
```bash
python init_db.py
```

### 4. 运行应用
```bash
python run.py
```

访问 http://localhost:5000 即可使用系统。

## 示例账户

系统初始化后会创建以下测试账户：

- **组织者**: admin / admin123
- **演讲者**: speaker1 / speaker123, speaker2 / speaker123  
- **听众**: listener1 / listener123, listener2 / listener123, listener3 / listener123

## 使用流程

### 组织者操作流程
1. 登录组织者账户
2. 创建新的演讲会话
3. 选择演讲者
4. 查看会话统计数据

### 演讲者操作流程
1. 登录演讲者账户
2. 上传演讲内容（PPT、PDF等）
3. AI自动生成题目
4. 在演讲过程中发布题目
5. 查看听众答题统计

### 听众操作流程
1. 登录听众账户
2. 加入相应的演讲会话
3. 等待题目发布并答题
4. 查看个人成绩和排名
5. 参与题目讨论

## 技术特性

### 模块化设计
- 松耦合的模块设计
- 清晰的API接口
- 易于扩展和维护

### AI智能出题
- 基于内容的自动出题
- 题目质量验证
- 多样化问题生成

### 实时交互
- 实时题目发布
- 即时答题反馈
- 动态统计更新

### 多文件格式支持
- PPT/PPTX文件处理
- PDF文档解析
- 音视频转文字
- OCR图像识别

## 扩展计划

1. **微信小程序版本**：将网页功能移植到微信小程序
2. **更多AI模型支持**：集成更多大语言模型
3. **高级统计分析**：更详细的数据分析和可视化
4. **实时语音识别**：支持实时演讲内容识别
5. **多语言支持**：支持英文等其他语言

## 贡献指南

欢迎提交问题和改进建议！请确保：
- 遵循现有的代码风格
- 添加适当的测试
- 更新相关文档

## 许可证

本项目采用 MIT 许可证。
