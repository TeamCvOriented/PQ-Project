# 🚀 PQ-Project: AI 互动问答系统

PQ（PopQuiz）是一个创新的AI驱动互动问答系统，旨在通过智能生成测验题，将传统的单向演示转变为引人入胜的双向互动体验。无论是学术讲座、企业培训还是产品发布会，PQ都能显著提升听众的参与感信息留存率。

## 🎯 项目目标

- **解决互动缺失**：克服传统演讲中听众容易分心、参与度低的痛点。
- **自动化测验生成**：利用AI从多种格式的演讲材料（PPT、PDF、音频、视频等）中自动提取关键信息并生成高质量的测验题，解放组织者和演讲者。
- **提升用户体验**：为组织者、演讲者和听众提供流畅、直观且功能丰富的多角色交互界面。
- **数据驱动优化**：通过收集和分析测验数据，为演讲者提供关于内容清晰度和听众理解度的宝贵洞见。

## ✨ 主要功能

- **多模态内容处理**：支持上传和解析多种文件格式，包括 `.txt`, `.pptx`, `.pdf`, `.docx`, 以及通过语音识别处理的 `.mp3`, `.wav`, `.mp4` 文件。
- **智能问答生成**：集成 Google Gemini API，根据上传内容的核心思想智能生成选择题。
- **多角色用户系统**：
    - **组织者 (Organizer)**: 创建活动、上传材料、生成问答、管理会话。
    - **演讲者 (Speaker)**: 主持活动、控制问答节奏、查看实时反馈。
    - **听众 (Listener)**: 参与活动、回答问题、查看排行榜、参与讨论。
- **实时互动与反馈**：听众可以实时回答问题，结果会以图表形式可视化展示，并设有专门的讨论区。
- **会话管理**：支持创建、加入和管理多个并行的互动会话。

## 🏛️ 项目架构

本项目采用经典的 **Model-View-Controller (MVC)** 设计模式，基于 **Flask** 框架构建，确保了代码的模块化、可扩展性和可维护性。

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

## 🛠️ 技术架构

- **后端**: Python, Flask
- **前端**: HTML, CSS, JavaScript (Jinja2 模板引擎)
- **数据库**: SQLite (通过 SQLAlchemy ORM 管理)
- **AI 模型**: Google Gemini API
- **部署**: 本地服务器

### 数据库设计

系统包含以下主要数据模型：
- `User`: 存储用户信息及其角色。
- `Session`: 定义一个活动会话。
- `Content`: 存储上传的演讲材料信息。
- `Quiz`: 存储生成的测验题目。
- `QuizResponse`: 记录听众的回答。
- `QuizDiscussion`: 提供一个围绕问题的讨论区。
- `Feedback`: 收集用户对活动的反馈。

## ⚙️ 安装与运行指南

请遵循以下步骤在您的本地计算机上设置并运行本项目。

### 1. 环境准备

- 确保您已安装 **Python 3.8 或更高版本**。
- 确认 **pip** 包管理器可用。
- 本指南主要针对 **Windows** 操作系统。

### 2. 获取项目

将项目文件下载或克隆到您的本地目录。

### 3. 配置环境变量

在项目根目录下，创建一个名为 `.env` 的文件，并填入以下内容：

```env
# 用于调用 Google AI 服务的 API 密钥
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

# Flask 应用的安全密钥，用于保护会话
SECRET_KEY="YOUR_SUPER_SECRET_KEY"
```

- `GEMINI_API_KEY`: 请从 <mcurl name="Google AI Studio" url="https://aistudio.google.com/app/apikey"></mcurl> 获取。
- `SECRET_KEY`: 这是一个用于保护用户会话安全的随机字符串。您可以使用以下命令生成一个：
  ```bash
  python -c "import secrets; print(secrets.token_hex(16))"
  ```

### 4. 设置虚拟环境并安装依赖

打开命令提示符（CMD）或 PowerShell，导航到项目根目录，然后执行以下命令：

```bash
# 创建一个名为 venv 的 Python 虚拟环境
python -m venv venv

# 激活虚拟环境
# Windows CMD
.\venv\Scripts\activate
# Windows PowerShell
# .\venv\Scripts\Activate.ps1

# 安装所有必需的依赖包
pip install -r requirements.txt
```

### 5. 初始化数据库

确保虚拟环境已激活，然后运行数据库初始化脚本。此脚本将创建数据库文件并填充初始的示例用户数据。

```bash
python init_db.py
```

### 6. 启动应用

一切就绪！现在可以启动 Flask 应用服务器了。

```bash
python run.py
```

服务器启动后，您可以在浏览器中访问 <mcurl name="http://localhost:5000" url="http://localhost:5000"></mcurl> 来使用本应用。

### 快捷启动 (Windows)

为了方便，您可以直接双击根目录下的 `start.bat` 批处理文件。它会自动完成激活虚拟环境、安装依赖、初始化数据库和启动服务器的所有步骤。

## 🧑‍💻 使用流程

应用启动后，您可以使用以下预设的测试账户登录并体验不同角色的功能：

- **管理员 (Organizer)**:
  - 用户名: `admin`
  - 密码: `adminpass`
- **演讲者 (Speaker)**:
  - 用户名: `speaker1`
  - 密码: `speakerpass`
- **听众 (Listener)**:
  - 用户名: `listener1`
  - 密码: `listenerpass`

## 📅 未来计划

- **微信小程序端**：开发移动端版本，方便用户随时随地参与。
- **支持更多AI模型**：集成如 Qwen、Kimi 等其他优秀的大语言模型。
- **高级数据分析**：提供更深入的活动后分析报告。
- **实时语音识别**：支持在演讲过程中实时生成问题。
- **多语言支持**：扩展系统以支持多种语言界面和内容。

## 🤝 贡献指南

我们欢迎任何形式的贡献！如果您有好的想法或发现了问题，请随时提交 Pull Request 或创建 Issue。

## 📄 许可证

本项目采用 [MIT License](LICENSE) 开源。