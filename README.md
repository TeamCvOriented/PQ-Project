# 🚀 PopQuiz: AI 智能互动问答系统

PopQuiz 是一个创新的AI驱动互动问答系统，旨在通过智能生成测验题目，将传统的单向演示转变为引人入胜的双向互动体验。无论是学术讲座、企业培训还是产品发布会，PopQuiz 都能显著提升听众的参与感和信息留存率。

## 🎯 项目目标

- **解决互动缺失**：克服传统演讲中听众容易分心、参与度低的痛点
- **自动化测验生成**：利用AI从多种格式的演讲材料（PPTX、PDF等）中自动提取关键信息并生成高质量的测验题目
- **提升用户体验**：为组织者、演讲者和听众提供流畅、直观且功能丰富的多角色交互界面
- **数据驱动优化**：通过收集和分析测验数据，为演讲者提供关于内容清晰度和听众理解度的宝贵洞察

## ✨ 主要功能

### 📁 多模态内容处理
- **文档处理**：支持  `.pptx`, `.pdf` 等文档格式
- **智能内容提取**：准确提取文档中的关键信息用于AI题目生成

### 🤖 智能问答生成
- **AI驱动**：集成通义千问(Qwen) API，根据上传内容智能生成高质量选择题
- **多样化题型**：支持单选题、多选题等多种题型
- **智能难度调节**：根据内容复杂度自动调整题目难度
- **批量生成**：支持一次性生成多道相关题目

### 👥 多角色用户系统
- **组织者 (Organizer)**：
  - 创建和管理活动会话
  - 上传演讲材料
  - 生成AI题目
  - 查看详细统计分析
  - 管理用户权限
  
- **演讲者 (Speaker)**：
  - 主持互动活动
  - 控制题目发布节奏
  - 查看实时答题统计
  - 管理题目讨论
  - 收集听众反馈
  
- **听众 (Listener)**：
  - 加入互动会话
  - 实时回答问题
  - 查看个人成绩统计
  - 参与题目讨论
  - 提供活动反馈

### 📊 实时互动与分析
- **实时答题**：听众可以实时参与问答，结果即时统计
- **数据可视化**：答题结果以图表形式展示，直观清晰
- **讨论区**：为每道题目提供专门的讨论区，促进深度交流
- **统计分析**：提供详细的参与度、正确率等多维度分析

### 🔄 会话管理
- **多会话支持**：支持创建、加入和管理多个并行的互动会话
- **会话状态控制**：灵活控制会话的开始、暂停和结束
- **邀请码系统**：通过唯一邀请码快速加入会话
- **权限管理**：精细化的用户权限控制

## 🏛️ 项目架构

本项目采用经典的 **Model-View-Controller (MVC)** 设计模式，基于 **Flask** 框架构建，确保了代码的模块化、可扩展性和可维护性。

### 后端架构（Python Flask）
```
app/
├── __init__.py          # Flask应用初始化和配置
├── models.py            # 数据库模型定义
├── file_processor.py    # 多媒体文件处理模块
├── quiz_generator.py    # AI题目生成核心模块
├── quiz_generator_qwen.py   # 通义千问API集成
├── quiz_generator_mock.py   # 模拟AI生成器（用于测试）
└── routes/              # API路由模块
    ├── auth.py          # 用户认证和授权
    ├── content.py       # 内容上传和管理
    ├── quiz.py          # 题目生成和管理
    ├── session.py       # 会话创建和管理
    └── static.py        # 静态页面路由
```

### 前端架构（HTML/CSS/JavaScript）
```
templates/
├── index.html           # 系统主页和角色选择
├── login.html           # 用户登录页面
├── register.html        # 用户注册页面
├── organizer.html       # 组织者工作台界面
├── speaker.html         # 演讲者控制台界面
└── listener.html        # 听众参与界面

static/
└── js/
    ├── organizer.js     # 组织者界面交互逻辑
    ├── speaker.js       # 演讲者界面交互逻辑
    └── listener.js      # 听众界面交互逻辑
```

## 🛠️ 技术栈

### 核心技术
- **后端框架**: Python 3.8+ + Flask 3.1.1
- **前端技术**: HTML5 + CSS3 + JavaScript ES6+ (原生)
- **模板引擎**: Jinja2
- **数据库**: SQLite 3 (生产环境可升级至PostgreSQL/MySQL)
- **ORM**: SQLAlchemy 3.1.1

### AI与处理技术
- **AI模型**: 通义千问(Qwen) API (OpenAI兼容接口)
- **文档处理**: python-pptx, PyPDF2, python-docx

### 部署与工具
- **开发服务器**: Flask内置开发服务器
- **包管理**: pip + requirements.txt
- **环境管理**: python-venv (虚拟环境)
- **跨域处理**: Flask-CORS
- **配置管理**: python-dotenv

### 数据库设计

系统采用关系型数据库设计，包含以下主要数据模型：

- **User**: 存储用户基本信息、角色权限和登录凭据
- **Session**: 定义活动会话，包含邀请码、状态等信息
- **Content**: 存储上传的演讲材料信息和提取的文本内容
- **Quiz**: 存储AI生成的测验题目和选项
- **QuizResponse**: 记录听众的答题记录和成绩
- **QuizDiscussion**: 提供围绕题目的讨论功能
- **Feedback**: 收集用户对活动的反馈和建议
- **UserQuizProgress**: 跟踪用户的答题进度和统计
- **SessionParticipant**: 管理会话参与者关系

## ⚙️ 快速开始

### � 立即开始使用

想要快速部署和使用 PopQuiz 系统？我们为您准备了详细的安装部署指南！

**👉 [点击查看完整安装部署指南 (SETUP.md)](SETUP.md)**

该指南包含：
- 📋 详细的系统要求说明
- 🚀 Windows 一键启动方式（推荐零基础用户）
- 🔧 手动安装步骤（适合高级用户）
- ⚙️ 环境变量配置说明
- 🐛 常见问题解决方案
- 📞 技术支持信息

### 🎯 三种启动方式

1. **🥇 一键启动** (推荐)
   - Windows 用户：双击 `start.bat` 即可
   - 全自动安装配置，无需技术背景

2. **⚙️ 手动安装**
   - 适合需要自定义配置的用户
   - 完全控制安装过程

3. **🐳 Docker部署** (即将推出)
   - 容器化部署，环境隔离
   - 适合生产环境使用

## � 测试账户

系统初始化时会自动创建以下测试账户，您可以用它们来体验不同角色的功能：

| 角色 | 用户名 | 密码 | 昵称 | 说明 |
|------|--------|------|------|------|
| 组织者 | `admin` | `admin123` | 系统管理员 | 拥有最高权限，可管理所有功能 |
| 演讲者 | `speaker1` | `speaker123` | 张教授 | 可创建会话、上传内容、生成题目 |
| 演讲者 | `speaker2` | `speaker123` | 李博士 | 第二个演讲者测试账号 |
| 听众 | `listener1` | `listener123` | 小明 | 可参与会话、答题、讨论 |
| 听众 | `listener2` | `listener123` | 小红 | 第二个听众测试账号 |
| 听众 | `listener3` | `listener123` | 小李 | 第三个听众测试账号 |

## 📖 使用指南

### 🎯 快速体验流程

1. **选择角色登录**: 在主页选择您想体验的角色并登录
2. **组织者创建会话**: 使用 `admin` 账号创建一个新的互动会话
3. **演讲者上传内容**: 使用 `speaker1` 账号上传PPT/PDF等演讲材料
4. **AI生成题目**: 系统自动从上传内容中生成相关题目
5. **听众加入会话**: 使用 `listener1` 账号通过邀请码加入会话
6. **开始互动**: 演讲者发布题目，听众实时参与答题
7. **查看统计**: 查看答题统计和讨论反馈

### 📚 详细功能说明

#### 组织者功能
- **会话管理**: 创建、编辑、删除会话
- **用户管理**: 查看和管理系统用户
- **数据统计**: 查看全局使用统计和分析
- **系统配置**: 配置系统参数和权限

#### 演讲者功能
- **内容上传**: 支持多种格式文件上传
- **AI题目生成**: 一键生成高质量测验题目
- **会话控制**: 实时控制题目发布和会话状态
- **统计查看**: 查看听众参与情况和答题统计

#### 听众功能
- **会话加入**: 通过邀请码快速加入会话
- **实时答题**: 参与实时问答互动
- **成绩查看**: 查看个人答题记录和成绩
- **讨论参与**: 在题目讨论区发表观点

## 🔧 高级配置

### AI功能配置
如需启用AI题目生成功能，请：
1. 注册通义千问账号并获取API密钥
2. 在 `.env` 文件中配置 `QWEN_API_KEY`
3. 重启应用即可使用AI功能

**注意**: 不配置API密钥时，系统会使用内置的模拟数据生成器，同样可以体验完整功能。

### 数据库配置
- **开发环境**: 默认使用SQLite数据库，无需额外配置
- **生产环境**: 可修改 `DATABASE_URL` 使用PostgreSQL或MySQL

### 性能优化
- **文件处理**: 支持大文件分块上传和处理
- **缓存优化**: 内置结果缓存，提升响应速度
- **并发处理**: 支持多用户同时使用

## ❓ 遇到问题？

如果在安装或使用过程中遇到任何问题，请查看我们的详细故障排除指南：

**👉 [查看详细问题解决方案 (SETUP.md#常见问题)](SETUP.md#常见问题)**

常见问题包括：
- Python环境配置问题
- 依赖包安装失败
- 端口占用问题
- AI功能不工作
- 文件上传失败
- 数据库初始化问题

## 📅 版本历史与路线图

### 当前版本特性
- ✅ 多模态内容处理
- ✅ AI智能题目生成  
- ✅ 多角色用户系统
- ✅ 实时互动答题
- ✅ 数据统计分析
- ✅ 一键启动部署

### 未来版本计划
- 🔮 **微信小程序端**: 开发移动端应用，支持手机端参与
- 🔮 **更多AI模型**: 集成ChatGPT、Claude等多种AI模型
- 🔮 **实时语音识别**: 支持演讲过程中实时生成题目
- 🔮 **多语言支持**: 支持英文、日文等多语言界面
- 🔮 **云端部署**: 支持Docker容器化部署
- 🔮 **高级分析**: 提供更深入的学习效果分析

## 🤝 参与贡献

我们热烈欢迎所有形式的贡献！无论是代码、文档、测试还是建议，都对项目发展有重要价值。

### 🛠️ 如何参与

1. **Fork 项目**: 点击 GitHub 页面右上角的 Fork 按钮
2. **克隆仓库**: `git clone https://github.com/your-username/PopQuiz.git`
3. **创建分支**: `git checkout -b feature/your-feature-name`
4. **提交更改**: `git commit -am 'Add some feature'`
5. **推送分支**: `git push origin feature/your-feature-name`
6. **创建PR**: 在GitHub上创建Pull Request

### 📋 贡献指南

- **代码规范**: 遵循PEP 8 Python代码规范
- **提交信息**: 使用清晰、描述性的提交信息
- **测试**: 确保新功能有相应的测试用例
- **文档**: 更新相关文档和README

### 🐛 问题报告

发现Bug？请通过以下方式报告：
1. 检查是否已有相关Issue
2. 提供详细的重现步骤
3. 附上错误日志和环境信息
4. 描述期望的行为

### 💡 功能建议

有好的想法？我们很想听！
- 在Issues中详细描述您的建议
- 解释功能的用途和价值
- 考虑实现的可行性

## � 致谢

感谢所有为 PopQuiz 项目做出贡献的开发者和用户！

特别感谢：
- **通义千问团队** - 提供强大的AI服务支持
- **Flask社区** - 优秀的Web框架和丰富的生态
- **开源社区** - 各种优秀的开源库和工具

## 📞 联系我们

- **项目主页**: [GitHub Repository](https://github.com/TeamCvOriented/PQ-Project)
- **问题反馈**: [GitHub Issues](https://github.com/TeamCvOriented/PQ-Project/issues)
- **功能建议**: [GitHub Discussions](https://github.com/TeamCvOriented/PQ-Project/discussions)
- **详细部署指南**: [SETUP.md](SETUP.md)

## �📄 开源协议

本项目采用 [MIT License](LICENSE) 开源协议。

```
MIT License

Copyright (c) 2024 PopQuiz Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

<div align="center">

**🌟 如果这个项目对您有帮助，请给我们一个Star！**

Made with ❤️ by TeamCvOriented Team

</div>