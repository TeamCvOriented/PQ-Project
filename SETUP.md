# PopQuiz 配置说明

## 环境变量配置

请在 `.env` 文件中配置以下变量：

### 必需配置

1. **GEMINI_API_KEY**
   - 说明：Google Gemini API密钥，用于AI生成题目
   - 获取方式：访问 https://ai.google.dev/ 获取API密钥
   - 示例：`GEMINI_API_KEY=AIza...`

2. **SECRET_KEY**
   - 说明：Flask应用密钥，用于会话加密
   - 生成方式：可使用 `python -c "import secrets; print(secrets.token_hex(32))"`
   - 示例：`SECRET_KEY=your_generated_secret_key_here`

### 可选配置

3. **DATABASE_URL**
   - 说明：数据库连接URL
   - 默认值：`sqlite:///pq_database.db`
   - 示例：`DATABASE_URL=sqlite:///pq_database.db`

4. **UPLOAD_FOLDER**
   - 说明：文件上传存储路径
   - 默认值：`uploads`
   - 示例：`UPLOAD_FOLDER=uploads`

## 快速开始

### Windows用户
1. 双击运行 `start.bat` 脚本
2. 脚本会自动创建虚拟环境、安装依赖、初始化数据库并启动应用

### 手动启动

1. **创建虚拟环境**
```bash
python -m venv venv
```

2. **激活虚拟环境**
```bash
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

3. **安装依赖**
```bash
pip install -r requirements.txt
```

4. **配置环境变量**
- 复制 `.env` 文件并设置必要的环境变量
- 特别是 `GEMINI_API_KEY`

5. **初始化数据库**
```bash
python init_db.py
```

6. **启动应用**
```bash
python run.py
```

## 测试账户

系统初始化后会自动创建以下测试账户：

| 角色 | 用户名 | 密码 | 昵称 |
|------|--------|------|------|
| 组织者 | admin | admin123 | 系统管理员 |
| 演讲者 | speaker1 | speaker123 | 张教授 |
| 演讲者 | speaker2 | speaker123 | 李博士 |
| 听众 | listener1 | listener123 | 小明 |
| 听众 | listener2 | listener123 | 小红 |
| 听众 | listener3 | listener123 | 小李 |

## 功能测试流程

### 完整测试流程

1. **组织者操作**
   - 使用 `admin/admin123` 登录
   - 创建新的演讲会话
   - 选择演讲者（如 speaker1）
   - 查看会话统计

2. **演讲者操作**
   - 使用 `speaker1/speaker123` 登录
   - 上传演讲内容（PPT、PDF或文本）
   - 使用AI生成题目
   - 激活会话并发布题目

3. **听众操作**
   - 使用 `listener1/listener123` 登录
   - 加入对应的会话
   - 参与答题
   - 查看个人成绩

## 支持的文件格式

### 文档文件
- PowerPoint: `.ppt`, `.pptx`
- PDF: `.pdf`
- Word: `.doc`, `.docx`
- 文本: `.txt`, `.md`

### 多媒体文件
- 音频: `.mp3`, `.wav`, `.m4a`, `.flac`
- 视频: `.mp4`, `.avi`, `.mov`, `.wmv`, `.flv`

## 注意事项

1. **API配置**：确保正确配置Gemini API密钥，否则无法使用AI生成题目功能

2. **文件大小限制**：默认最大文件大小为100MB，可在配置中调整

3. **浏览器兼容性**：建议使用现代浏览器（Chrome、Firefox、Safari、Edge）

4. **网络要求**：需要稳定的网络连接以访问AI服务

## 常见问题

### Q: AI生成题目失败怎么办？
A: 检查Gemini API密钥是否正确配置，确保网络连接正常

### Q: 文件上传失败怎么办？
A: 检查文件格式是否支持，文件大小是否超限

### Q: 无法登录怎么办？
A: 确认用户名密码正确，检查数据库是否正确初始化

### Q: 页面显示异常怎么办？
A: 清除浏览器缓存，刷新页面重试

## 技术支持

如遇到技术问题，请检查：
1. Python版本是否为3.8+
2. 所有依赖是否正确安装
3. 环境变量是否正确配置
4. 数据库是否正确初始化

更多帮助请参考 `README_WEB.md` 文档。
