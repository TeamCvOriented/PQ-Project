@echo off
chcp 65001 >nul
title PopQuiz 智能弹题系统 - 启动器
color 0A

echo ==========================================
echo     PopQuiz 智能弹题系统启动脚本
echo ==========================================
echo.

echo [1/7] 正在检查Python环境...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误：未找到Python环境
    echo.
    echo 请先安装Python 3.8或更高版本：
    echo https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

python --version
echo ✅ Python环境检查通过
echo.

echo [2/7] 正在检查项目依赖...
if not exist "requirements.txt" (
    echo ❌ 错误：未找到requirements.txt文件
    pause
    exit /b 1
)

echo [3/7] 正在检查/创建虚拟环境...
if not exist "venv" (
    echo 🔨 创建虚拟环境中...
    python -m venv venv
    if %errorlevel% neq 0 (
        echo ❌ 创建虚拟环境失败
        pause
        exit /b 1
    )
    echo ✅ 虚拟环境创建成功
) else (
    echo ✅ 虚拟环境已存在
)

echo [4/7] 激活虚拟环境...
call venv\Scripts\activate
if %errorlevel% neq 0 (
    echo ❌ 激活虚拟环境失败
    pause
    exit /b 1
)
echo ✅ 虚拟环境激活成功

echo [5/7] 安装/更新依赖包...
echo 📦 正在安装依赖包，请稍候...
pip install -r requirements.txt --quiet --disable-pip-version-check
if %errorlevel% neq 0 (
    echo ❌ 依赖包安装失败，尝试升级pip...
    python -m pip install --upgrade pip --quiet
    pip install -r requirements.txt --quiet --disable-pip-version-check
    if %errorlevel% neq 0 (
        echo ❌ 依赖包安装仍然失败，请检查网络连接
        pause
        exit /b 1
    )
)
echo ✅ 依赖包安装完成

echo [6/7] 检查/创建环境变量配置...
if not exist ".env" (
    echo 🔧 创建默认环境变量配置...
    (
        echo # PopQuiz 环境变量配置
        echo # 如需使用AI功能，请在下面填入您的API密钥
        echo QWEN_API_KEY=
        echo.
        echo # 数据库配置
        echo DATABASE_URL=sqlite:///instance/pq_database.db
        echo.
        echo # 应用密钥（已自动生成）
        echo SECRET_KEY=%RANDOM%%RANDOM%%RANDOM%%RANDOM%
        echo.
        echo # 文件上传目录
        echo UPLOAD_FOLDER=uploads
    ) > .env
    echo ✅ 环境变量配置文件已创建
) else (
    echo ✅ 环境变量配置文件已存在
)

echo [7/7] 初始化数据库...
if not exist "instance" mkdir instance
python init_db.py >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  数据库初始化出现问题，尝试重新初始化...
    python init_db.py
)
echo ✅ 数据库初始化完成

echo.
echo ==========================================
echo           🚀 启动应用中...
echo ==========================================
echo.
echo 📡 服务地址: http://localhost:5000
echo.
echo 🔑 测试账户:
echo    组织者: admin / admin123
echo    演讲者: speaker1 / speaker123
echo    听众:   listener1 / listener123
echo.
echo 💡 提示: 
echo    - 按 Ctrl+C 可停止服务
echo    - 如需AI功能，请在.env文件中配置QWEN_API_KEY
echo.
echo ==========================================

timeout /t 3 >nul

REM 启动浏览器（延迟启动，确保服务先运行）
start "" cmd /c "timeout /t 5 >nul && start http://localhost:5000"

echo 🌐 浏览器将在5秒后自动打开...
echo.

REM 启动Flask应用
python run.py

echo.
echo 应用已停止运行
pause
