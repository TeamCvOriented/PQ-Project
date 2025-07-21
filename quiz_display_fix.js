// 修复版本的displayQuiz函数
function displayQuiz(quiz, sessionId) {
    console.log('=== displayQuiz 修复版本开始 ===');
    console.log('题目数据:', quiz);
    
    // 直接操作DOM，不依赖复杂的tab逻辑
    const body = document.body;
    
    // 移除现有的题目显示（如果有）
    const existingQuizDisplay = document.getElementById('fixedQuizDisplay');
    if (existingQuizDisplay) {
        existingQuizDisplay.remove();
    }
    
    // 创建一个固定在页面顶部的题目显示区域
    const quizDisplay = document.createElement('div');
    quizDisplay.id = 'fixedQuizDisplay';
    quizDisplay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
    `;
    
    const quizContainer = document.createElement('div');
    quizContainer.style.cssText = `
        background: white;
        border-radius: 15px;
        padding: 30px;
        max-width: 600px;
        width: 100%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 40px rgba(0,0,0,0.3);
    `;
    
    // 设置题目内容
    currentQuizId = quiz.id;
    timeLeft = quiz.time_limit || 60;
    
    quizContainer.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="background: #dc3545; color: white; border-radius: 50%; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: bold; margin: 0 auto 15px;">
                <span id="fixedTimer">${timeLeft}</span>
            </div>
            <h4 style="color: #333; margin-bottom: 10px;">题目 ${quiz.id}</h4>
            <p style="color: #666;">剩余时间: <span id="timeDisplay">${timeLeft}</span> 秒</p>
        </div>
        
        <div style="background: #f8f9fa; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
            <h5 style="color: #333; margin-bottom: 0;">${quiz.question}</h5>
        </div>
        
        <div style="margin-bottom: 20px;">
            <div onclick="selectFixedOption('A', this)" style="background: #f8f9fa; border: 2px solid #dee2e6; border-radius: 8px; padding: 15px; margin-bottom: 10px; cursor: pointer; display: flex; align-items: center;">
                <span style="background: #007bff; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold;">A</span>
                <span>${quiz.option_a}</span>
            </div>
            <div onclick="selectFixedOption('B', this)" style="background: #f8f9fa; border: 2px solid #dee2e6; border-radius: 8px; padding: 15px; margin-bottom: 10px; cursor: pointer; display: flex; align-items: center;">
                <span style="background: #28a745; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold;">B</span>
                <span>${quiz.option_b}</span>
            </div>
            <div onclick="selectFixedOption('C', this)" style="background: #f8f9fa; border: 2px solid #dee2e6; border-radius: 8px; padding: 15px; margin-bottom: 10px; cursor: pointer; display: flex; align-items: center;">
                <span style="background: #ffc107; color: #333; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold;">C</span>
                <span>${quiz.option_c}</span>
            </div>
            <div onclick="selectFixedOption('D', this)" style="background: #f8f9fa; border: 2px solid #dee2e6; border-radius: 8px; padding: 15px; margin-bottom: 10px; cursor: pointer; display: flex; align-items: center;">
                <span style="background: #17a2b8; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold;">D</span>
                <span>${quiz.option_d}</span>
            </div>
        </div>
        
        <div style="text-align: center;">
            <button id="fixedSubmitBtn" onclick="submitFixedAnswer()" disabled style="background: #6c757d; color: white; border: none; padding: 12px 30px; border-radius: 25px; font-size: 1rem; font-weight: bold; cursor: not-allowed; margin-right: 10px;">
                提交答案
            </button>
            <button onclick="closeFixedQuiz()" style="background: #dc3545; color: white; border: none; padding: 12px 30px; border-radius: 25px; font-size: 1rem;">
                关闭
            </button>
        </div>
    `;
    
    quizDisplay.appendChild(quizContainer);
    body.appendChild(quizDisplay);
    
    console.log('固定题目显示已创建');
    
    // 开始计时
    startFixedTimer();
}

// 固定显示的选项选择
let selectedFixedAnswer = null;

function selectFixedOption(option, element) {
    console.log(`选择了选项: ${option}`);
    
    // 移除其他选项的选中状态
    const options = document.querySelectorAll('#fixedQuizDisplay div[onclick*="selectFixedOption"]');
    options.forEach(opt => {
        opt.style.backgroundColor = '#f8f9fa';
        opt.style.borderColor = '#dee2e6';
    });
    
    // 选中当前选项
    element.style.backgroundColor = '#007bff';
    element.style.borderColor = '#007bff';
    element.style.color = 'white';
    
    selectedFixedAnswer = option;
    
    // 启用提交按钮
    const submitBtn = document.getElementById('fixedSubmitBtn');
    submitBtn.disabled = false;
    submitBtn.style.background = '#28a745';
    submitBtn.style.cursor = 'pointer';
}

// 固定显示的计时器
let fixedQuizTimer = null;

function startFixedTimer() {
    if (fixedQuizTimer) {
        clearInterval(fixedQuizTimer);
    }
    
    fixedQuizTimer = setInterval(() => {
        const timerElement = document.getElementById('fixedTimer');
        const timeDisplayElement = document.getElementById('timeDisplay');
        
        if (timerElement && timeDisplayElement) {
            timerElement.textContent = timeLeft;
            timeDisplayElement.textContent = timeLeft;
        }
        
        if (timeLeft <= 0) {
            clearInterval(fixedQuizTimer);
            showMessage('时间到！', 'warning');
            disableFixedQuiz();
        }
        
        timeLeft--;
    }, 1000);
}

// 提交固定显示的答案
async function submitFixedAnswer() {
    if (!selectedFixedAnswer || !currentQuizId) {
        showMessage('请选择答案', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/quiz/answer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                quiz_id: currentQuizId,
                answer: selectedFixedAnswer
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showFixedQuizResult(data);
        } else {
            showMessage(data.error || '提交失败', 'error');
        }
    } catch (error) {
        showMessage('网络错误，请稍后重试', 'error');
    }
}

// 显示固定答题结果
function showFixedQuizResult(result) {
    // 停止计时器
    if (fixedQuizTimer) {
        clearInterval(fixedQuizTimer);
        fixedQuizTimer = null;
    }
    
    // 显示正确答案
    const options = document.querySelectorAll('#fixedQuizDisplay div[onclick*="selectFixedOption"]');
    options.forEach((opt, index) => {
        const optionLetter = ['A', 'B', 'C', 'D'][index];
        if (optionLetter === result.correct_answer) {
            opt.style.backgroundColor = '#28a745';
            opt.style.borderColor = '#28a745';
            opt.style.color = 'white';
        } else if (optionLetter === selectedFixedAnswer && !result.is_correct) {
            opt.style.backgroundColor = '#dc3545';
            opt.style.borderColor = '#dc3545';
            opt.style.color = 'white';
        }
        opt.onclick = null; // 禁用点击
    });
    
    // 更新提交按钮
    const submitBtn = document.getElementById('fixedSubmitBtn');
    submitBtn.innerHTML = result.is_correct ? '回答正确！' : '回答错误';
    submitBtn.style.background = result.is_correct ? '#28a745' : '#dc3545';
    submitBtn.disabled = true;
    submitBtn.style.cursor = 'not-allowed';
    
    showMessage(result.is_correct ? '回答正确！' : '回答错误', result.is_correct ? 'success' : 'error');
    
    // 5秒后自动关闭
    setTimeout(() => {
        closeFixedQuiz();
    }, 5000);
}

// 禁用固定题目
function disableFixedQuiz() {
    const options = document.querySelectorAll('#fixedQuizDisplay div[onclick*="selectFixedOption"]');
    options.forEach(opt => {
        opt.onclick = null;
        opt.style.opacity = '0.6';
    });
    
    const submitBtn = document.getElementById('fixedSubmitBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.cursor = 'not-allowed';
    }
}

// 关闭固定题目显示
function closeFixedQuiz() {
    const quizDisplay = document.getElementById('fixedQuizDisplay');
    if (quizDisplay) {
        quizDisplay.remove();
    }
    
    if (fixedQuizTimer) {
        clearInterval(fixedQuizTimer);
        fixedQuizTimer = null;
    }
    
    selectedFixedAnswer = null;
    currentQuizId = null;
    
    console.log('固定题目显示已关闭');
}
