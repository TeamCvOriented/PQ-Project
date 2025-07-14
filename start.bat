@echo off
echo ================================
echo PQ-Project 智能弹题系统启动脚本
echo ================================
echo.

echo 正在检查Python环境...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误：未找到Python环境，请先安装Python 3.8+
    pause
    exit /b 1
)

echo 正在检查虚拟环境...
if not exist "venv" (
    echo 创建虚拟环境...
    python -m venv venv
)

echo 激活虚拟环境...
call venv\Scripts\activate

echo 安装依赖包...
pip install -r requirements.txt

echo 初始化数据库...
python init_db.py

echo 启动应用...
echo.
echo ================================
echo 应用已启动！
echo 访问地址：http://localhost:5000
echo.
echo 测试账户：
echo 组织者：admin / admin123
echo 演讲者：speaker1 / speaker123
echo 听众：listener1 / listener123
echo ================================
echo.
python run.py

pause
