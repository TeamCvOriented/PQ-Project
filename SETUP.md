# 🚀 PopQuiz 智能弹题系统 - 详细部署指南

## 📋 目录
- [项目简介](#项目简介)
- [系统要求](#系统要求)
- [方式一：一键启动（推荐）](#方式一一键启动推荐)
- [方式二：手动启动](#方式二手动启动)
- [环境变量配置](#环境变量配置)
- [测试账户](#测试账户)
- [功能介绍](#功能介绍)
- [常见问题](#常见问题)
- [技术支持](#技术支持)

---

## 🎯 项目简介

PopQuiz 是一个智能互动问答系统，支持：
- 📝 多种文件格式内容提取（文本、PPT、PDF、音频、视频）
- 🤖 AI智能题目生成
- 👥 多角色协作（组织者、演讲者、听众）
- 📊 实时答题统计分析
- 💬 题目讨论与反馈

---

## 💻 系统要求

### 最低要求
- **操作系统**: Windows 10/11, macOS 10.14+, Ubuntu 18.04+
- **Python版本**: 3.8 或更高版本
- **内存**: 2GB RAM
- **硬盘空间**: 2GB 可用空间
- **网络**: 互联网连接（下载依赖包时需要）

### 推荐配置
- **Python版本**: 3.9 或 3.10
- **内存**: 4GB+ RAM
- **网络**: 稳定的互联网连接（使用AI功能时）

---

## 🎯 方式一：一键启动（推荐）

### Windows 用户

#### 步骤 1：检查 Python 环境
1. 按 `Win + R` 键，输入 `cmd`，按回车键
2. 在命令行中输入：`python --version`
3. 如果显示 Python 3.8+ 版本号，则已准备就绪
4. 如果提示 "不是内部或外部命令"，请先安装 Python

#### 步骤 2：安装 Python（如果未安装）
1. 访问 [Python官网](https://www.python.org/downloads/)
2. 下载 Python 3.9 或 3.10 版本
3. **重要**：安装时勾选 "Add Python to PATH"
4. 完成安装后重启命令行，再次验证版本

#### 步骤 3：一键启动
1. 下载并解压 PopQuiz 项目到任意目录
2. **双击运行** `start.bat` 文件
3. 等待自动安装配置（首次运行需要几分钟）
4. 看到启动成功信息后，浏览器会自动打开
5. 如果浏览器未自动打开，手动访问：`http://localhost:5000`

```batch
# start.bat 会自动执行以下操作：
# ✅ 检查 Python 环境
# ✅ 创建虚拟环境
# ✅ 安装所有依赖包
# ✅ 初始化数据库
# ✅ 创建测试账户
# ✅ 启动应用服务
# ✅ 自动打开浏览器
```

### macOS/Linux 用户

```bash
# 1. 确保已安装 Python 3.8+
python3 --version

# 2. 克隆或下载项目
cd /path/to/popquiz

# 3. 创建虚拟环境
python3 -m venv venv

# 4. 激活虚拟环境
source venv/bin/activate

# 5. 安装依赖
pip install -r requirements.txt

# 6. 初始化数据库
python init_db.py

# 7. 启动应用
python run.py
```

---

## 🔧 方式二：手动启动

### 适用场景
- 需要自定义配置
- 开发调试
- 一键启动失败时的备用方案

### 详细步骤

#### 1. 环境准备
```bash
# 检查 Python 版本
python --version

# 创建项目目录（如果还没有）
mkdir popquiz
cd popquiz

# 下载项目文件到此目录
```

#### 2. 创建虚拟环境
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux  
python3 -m venv venv
source venv/bin/activate
```

#### 3. 安装依赖包
```bash
# 升级 pip（推荐）
pip install --upgrade pip

# 安装项目依赖
pip install -r requirements.txt

# 验证安装
pip list
```

#### 4. 环境变量配置
```bash
# 编辑 .env 文件（可选）
notepad .env              # Windows
nano .env                 # Linux
open .env                 # macOS
```

#### 5. 数据库初始化
```bash
# 创建数据库目录
mkdir instance            # 如果不存在

# 初始化数据库和测试数据
python init_db.py
```

#### 6. 启动应用
```bash
# 启动开发服务器
python run.py

# 应该看到类似输出：
# * Running on http://127.0.0.1:5000
# * Debug mode: on
```

#### 7. 访问应用
打开浏览器访问：`http://localhost:5000`

---

## ⚙️ 环境变量配置

### 基础配置（自动生成）
```env
# 数据库配置
DATABASE_URL=sqlite:///instance/pq_database.db

# 应用密钥（自动生成）
SECRET_KEY=your-secret-key

# 文件上传目录
UPLOAD_FOLDER=uploads
```

### AI功能配置（可选）
```env
# 通义千问 API 密钥
QWEN_API_KEY=your-qwen-api-key

# 其他 OpenAI 兼容 API
OPENAI_API_KEY=your-openai-key
OPENAI_BASE_URL=https://api.openai.com/v1
```

### 高级配置（可选）
```env
# Flask 运行配置
FLASK_DEBUG=True          # 开发模式
FLASK_HOST=127.0.0.1      # 绑定地址
FLASK_PORT=5000           # 端口号

# 文件上传限制
MAX_CONTENT_LENGTH=16MB   # 最大文件大小
```

### 配置说明

#### AI API 密钥获取
1. **通义千问**：访问 [阿里云百炼平台](https://bailian.console.aliyun.com/)
2. **OpenAI**：访问 [OpenAI Platform](https://platform.openai.com/)
3. **其他兼容API**：如 Azure OpenAI、智谱AI等

#### 配置文件位置
- 主配置文件：`.env`（项目根目录）
- 模板文件：`.env.example`（参考用）
- 数据库文件：`instance/pq_database.db`

---

## 👥 测试账户

系统预设了以下测试账户，启动后即可使用：

| 角色 | 用户名 | 密码 | 昵称 | 权限说明 |
|------|--------|------|------|----------|
| 组织者 | `admin` | `admin123` | 系统管理员 | 管理所有会话、用户、统计 |
| 演讲者 | `speaker1` | `speaker123` | 张教授 | 创建会话、上传内容、生成题目 |
| 演讲者 | `speaker2` | `speaker123` | 李博士 | 创建会话、上传内容、生成题目 |
| 听众 | `listener1` | `listener123` | 小明 | 加入会话、答题、查看成绩 |
| 听众 | `listener2` | `listener123` | 小红 | 加入会话、答题、查看成绩 |
| 听众 | `listener3` | `listener123` | 小李 | 加入会话、答题、查看成绩 |

### 角色权限说明

#### 组织者 (Organizer)
- ✅ 查看所有会话统计
- ✅ 管理演讲者账户
- ✅ 查看系统整体分析
- ✅ 管理平台设置

#### 演讲者 (Speaker)  
- ✅ 创建和管理会话
- ✅ 上传各种格式文件
- ✅ 使用AI生成题目
- ✅ 发布题目和管理答题
- ✅ 查看自己会话的统计

#### 听众 (Listener)
- ✅ 搜索和加入会话
- ✅ 实时答题
- ✅ 查看个人成绩
- ✅ 参与题目讨论

---

## 🎮 功能介绍

### 文件处理功能
**办公文档**：`.pptx`, `.pdf`

### AI 题目生成
- 智能分析文件内容
- 自动生成选择题
- 支持批量生成
- 题目质量优化

### 实时互动
- 演讲者发布题目
- 听众实时答题
- 即时统计分析
- 讨论和反馈

### 数据分析
- 答题统计
- 参与度分析
- 个人成绩跟踪
- 会话级别报告

---

## ❓ 常见问题

### Q1: start.bat 运行失败怎么办？
**A1:** 按以下步骤排查：
1. 确认 Python 3.8+ 已安装并加到 PATH
2. 以管理员身份运行 start.bat
3. 检查网络连接是否正常
4. 查看 install.log 文件的错误信息

### Q2: 端口 5000 被占用怎么办？
**A2:** 两种解决方案：
```bash
# 方案1：找到并关闭占用进程
netstat -ano | findstr :5000
taskkill /PID <进程ID> /F

# 方案2：修改端口号
# 编辑 run.py 文件，将 port=5000 改为其他端口
```

### Q3: AI 功能不工作？
**A3:** 检查以下配置：
1. `.env` 文件中的 `QWEN_API_KEY` 是否正确
2. 网络是否能访问 API 服务
3. API 密钥是否有足够余额
4. 查看应用日志的错误信息

### Q4: 依赖包安装失败？
**A4:** 尝试以下方案：
```bash
# 升级 pip
python -m pip install --upgrade pip

# 使用国内镜像
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple/

# 逐个安装
pip install flask flask-sqlalchemy flask-cors
```

### Q5: 数据库文件丢失？
**A5:** 重新初始化：
```bash
# 删除旧数据库
rm instance/pq_database.db    # Linux/macOS
del instance\pq_database.db   # Windows

# 重新初始化
python init_db.py
```

### Q6: 文件上传失败？
**A6:** 检查以下项目：
1. 文件大小是否超过限制（默认16MB）
2. 文件格式是否支持
3. 上传目录权限是否正确
4. 磁盘空间是否充足

### Q7: 虚拟环境激活失败？
**A7:** 根据系统选择命令：
```bash
# Windows
venv\Scripts\activate

# Windows PowerShell  
venv\Scripts\Activate.ps1

# macOS/Linux
source venv/bin/activate
```

---

## 🛠️ 技术支持

### 开发模式
如需进行开发或调试：
```bash
# 设置开发模式
export FLASK_DEBUG=True      # Linux/macOS
set FLASK_DEBUG=True         # Windows

# 启动开发服务器
python run.py
```

### 日志查看
```bash
# 应用日志在终端中实时显示
# 如需保存日志：
python run.py > app.log 2>&1
```

### 数据备份
```bash
# 备份数据库
copy instance\pq_database.db backup\    # Windows
cp instance/pq_database.db backup/      # Linux/macOS

# 备份上传文件
copy uploads\* backup\uploads\           # Windows  
cp -r uploads/ backup/                   # Linux/macOS
```

### 版本信息
```bash
# 查看依赖版本
pip list

# 查看 Python 版本
python --version

# 查看项目版本
python -c "from app import __version__; print(__version__)"
```

### 性能优化
- 使用 SSD 硬盘提升数据库性能
- 增加内存提升文件处理速度  
- 使用专用API密钥提升AI响应速度
- 配置反向代理提升并发能力

---


**🎉 祝您使用愉快！PopQuiz 让智能问答变得简单高效！**
