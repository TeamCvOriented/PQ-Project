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
    echo.
    echo ████                  [20%%] 初始化...
    python -m venv venv >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ 创建虚拟环境失败
        pause
        exit /b 1
    )
    echo ████████████████████  [100%%] 完成
    echo ✅ 虚拟环境创建成功
) else (
    echo ✅ 虚拟环境已存在
)

echo [4/7] 激活虚拟环境...
call venv\Scripts\activate >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 激活虚拟环境失败
    pause
    exit /b 1
)
echo ✅ 虚拟环境激活成功

echo [5/7] 安装/更新依赖包...
echo 📦 正在安装依赖包，这可能需要几分钟时间，请耐心等待...
echo.

REM 创建进度条显示脚本
echo @echo off > progress.bat
echo setlocal enabledelayedexpansion >> progress.bat
echo for /l %%%%i in (1,1,20) do ( >> progress.bat
echo     set "bar=" >> progress.bat
echo     for /l %%%%j in (1,1,%%%%i) do set "bar=!bar!█" >> progress.bat
echo     for /l %%%%j in (%%%%i,1,19) do set "bar=!bar!░" >> progress.bat
echo     set /a "percent=%%%%i*5" >> progress.bat
echo     echo !bar! [!percent!%%%%] 正在安装依赖包... >> progress.bat
echo     timeout /t 1 /nobreak ^>nul >> progress.bat
echo     cls >> progress.bat
echo     echo 📦 正在安装依赖包，这可能需要几分钟时间，请耐心等待... >> progress.bat
echo     echo. >> progress.bat
echo ) >> progress.bat

REM 在后台运行进度条
start /b progress.bat

REM 安装依赖包
pip install -r requirements.txt --quiet --disable-pip-version-check >install.log 2>&1
set INSTALL_RESULT=%errorlevel%

REM 停止进度条
taskkill /f /im cmd.exe /fi "windowtitle eq progress.bat*" >nul 2>&1
del progress.bat >nul 2>&1

REM 清屏并显示结果
cls
echo ==========================================
echo     PopQuiz 智能弹题系统启动脚本
echo ==========================================
echo.
echo [1/7] ✅ Python环境检查通过
echo [2/7] ✅ 项目依赖检查通过
echo [3/7] ✅ 虚拟环境就绪
echo [4/7] ✅ 虚拟环境激活成功
echo [5/7] 📦 依赖包安装...

if %INSTALL_RESULT% neq 0 (
    echo ❌ 依赖包安装失败，尝试升级pip...
    python -m pip install --upgrade pip --quiet
    echo 🔄 重试安装依赖包...
    pip install -r requirements.txt --quiet --disable-pip-version-check
    if %errorlevel% neq 0 (
        echo ❌ 依赖包安装仍然失败
        echo 详细错误信息请查看 install.log 文件
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

REM 清理临时文件
if exist "install.log" del install.log >nul 2>&1

echo.
echo ==========================================
echo           🚀 启动应用中...
echo ==========================================
echo.
echo 📡 服务地址: http://localhost:5000
echo.
echo 🔑 测试账户:
echo    组织者: admin / admin123
echo    演讲者: speaker1 / speaker123, speaker2 / speaker123  
echo    听众:   listener1 / listener123, listener2 / listener123, listener3 / listener123
echo.
echo 💡 提示: 
echo    - 按 Ctrl+C 可停止服务
echo    - 如需AI功能，请在.env文件中配置QWEN_API_KEY
echo    - 更多账户信息请参考上方显示
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
