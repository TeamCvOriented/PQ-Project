// 听众界面的JavaScript功能

let currentUser = null;
let currentQuizId = null;
let quizTimer = null;
let timeLeft = 0;
let currentSessionId = null; // 添加当前会话ID跟踪

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    loadUserInfo();
    loadSessions();
    loadUserStats();
    
    // 检查是否已经参与了会话，如果是则设置currentSessionId
    checkExistingParticipation();
    
    // 定期检查新题目（只有在有活跃会话时）
    setInterval(() => {
        if (currentSessionId) {
            checkForNewQuiz();
        }
    }, 3000); // 3秒检查一次
});

// 检查是否已经参与了某个会话
async function checkExistingParticipation() {
    try {
        const response = await fetch('/api/session/list');
        if (response.ok) {
            const data = await response.json();
            const sessions = data.sessions || [];
            
            // 查找已参与的活跃会话
            const participatedSession = sessions.find(s => s.is_participant && s.is_active);
            
            if (participatedSession) {
                currentSessionId = participatedSession.id;
                console.log(`检测到已参与会话 ${currentSessionId}，开始监听题目`);
                
                // 自动切换到答题区标签页
                const quizTab = document.querySelector('a[href="#quizTab"]');
                if (quizTab) {
                    const tab = new bootstrap.Tab(quizTab);
                    tab.show();
                }
                
                // 立即检查题目
                checkForNewQuiz();
            } else {
                console.log('没有找到已参与的活跃会话');
            }
        }
    } catch (error) {
        console.error('检查会话参与状态失败:', error);
    }
}

// 检查用户认证状态
async function checkAuthentication() {
    try {
        const response = await fetch('/api/auth/profile');
        if (!response.ok) {
            window.location.href = '/login';
            return;
        }
        
        const data = await response.json();
        currentUser = data.user;
        
        // 检查用户角色
        if (currentUser.role !== 'listener') {
            alert('权限不足，您不是听众');
            window.location.href = '/';
            return;
        }
        
        console.log('听众认证成功:', currentUser);
        
    } catch (error) {
        console.error('认证检查失败:', error);
        window.location.href = '/login';
    }
}

// 加载用户信息
function loadUserInfo() {
    if (currentUser) {
        document.getElementById('userInfo').textContent = currentUser.nickname || currentUser.username;
    }
}

// 加载可参与的会话
async function loadSessions() {
    try {
        const response = await fetch('/api/session/list');
        if (response.ok) {
            const data = await response.json();
            displaySessions(data.sessions);
        }
    } catch (error) {
        console.error('加载会话失败:', error);
    }
}

// 显示会话列表
function displaySessions(sessions) {
    const container = document.getElementById('sessionsList');
    
    if (sessions.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">暂无可参与的会话</p>';
        return;
    }
    
    container.innerHTML = sessions.map(session => `
        <div class="card session-card">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h5 class="card-title">${session.title}</h5>
                        <p class="card-text text-muted">${session.description || '暂无描述'}</p>
                        <small class="text-muted">
                            演讲者: ${session.speaker} | 
                            组织者: ${session.organizer} |
                            参与人数: ${session.participant_count}
                        </small>
                    </div>
                    <div class="text-end">
                        <span class="badge ${session.is_active ? 'bg-success' : 'bg-secondary'} mb-2">
                            ${session.is_active ? '进行中' : '未开始'}
                        </span>
                        <div>
                            ${session.is_active ? 
                                (session.is_participant ? 
                                    `<button class="btn btn-success btn-sm" disabled>
                                        <i class="fas fa-check me-1"></i>已参与
                                    </button>` :
                                    `<button class="btn btn-warning btn-sm" onclick="joinSession(${session.id})">
                                        <i class="fas fa-sign-in-alt me-1"></i>加入会话
                                    </button>`
                                ) :
                                `<button class="btn btn-outline-secondary btn-sm" disabled>
                                    <i class="fas fa-clock me-1"></i>等待开始
                                </button>`
                            }
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// 加入会话
async function joinSession(sessionId) {
    try {
        const response = await fetch(`/api/session/${sessionId}/join`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('成功加入会话', 'success');
            currentSessionId = sessionId; // 设置当前会话ID
            loadSessions(); // 刷新会话列表
            
            // 切换到答题区标签页
            const quizTab = document.querySelector('[href="#quizTab"]');
            const tab = new bootstrap.Tab(quizTab);
            tab.show();
            
            // 立即检查题目
            checkForNewQuiz();
            
            console.log(`已加入会话 ${sessionId}，开始监听题目`);
        } else {
            showMessage(data.error || '加入会话失败', 'error');
        }
    } catch (error) {
        console.error('加入会话失败:', error);
        showMessage('网络错误，请稍后重试', 'error');
    }
}

// 检查新题目
async function checkForNewQuiz() {
    if (!currentSessionId) {
        console.log('没有当前会话，显示等待状态');
        showWaitingState();
        return;
    }
    
    try {
        console.log(`检查会话${currentSessionId}的题目...`);
        const quizResponse = await fetch(`/api/quiz/current/${currentSessionId}`);
        
        console.log(`检查会话${currentSessionId}的题目，响应状态:`, quizResponse.status);
        
        if (quizResponse.ok) {
            const quizData = await quizResponse.json();
            console.log('题目数据:', quizData);
            
            if (quizData.success && quizData.quiz) {
                console.log('找到活跃题目:', quizData.quiz.question);
                
                // 检查是否是新题目
                if (currentQuizId !== quizData.quiz.id) {
                    console.log('这是一个新题目，显示题目');
                    displayQuiz(quizData.quiz, currentSessionId);
                } else {
                    console.log('这是当前题目，无需更新');
                }
                return;
            } else {
                console.log('没有活跃题目:', quizData.message);
            }
        } else {
            console.log('获取题目失败:', quizResponse.status, await quizResponse.text());
        }
        
        // 没有活跃题目，显示等待状态
        if (currentQuizId !== null) {
            console.log('没有活跃题目，显示等待状态');
            showWaitingState();
            currentQuizId = null;
        }
        
    } catch (error) {
        console.error('检查题目失败:', error);
        showWaitingState();
    }
}

// 显示题目 - 修复版本，使用固定覆盖层显示
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

// 显示等待状态
function showWaitingState() {
    const currentQuizDiv = document.getElementById('currentQuiz');
    const waitingDiv = document.getElementById('waitingState');
    
    if (currentQuizDiv && waitingDiv) {
        currentQuizDiv.style.display = 'none';
        waitingDiv.style.display = 'block';
        
        // 更新等待状态文字
        if (currentSessionId) {
            waitingDiv.innerHTML = `
                <div class="text-center">
                    <i class="fas fa-clock fa-3x text-warning mb-3"></i>
                    <h5>等待题目发布</h5>
                    <p class="text-muted">已加入会话 ${currentSessionId}，等待演讲者发布题目...</p>
                    <div class="spinner-border text-warning" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>
            `;
        } else {
            waitingDiv.innerHTML = `
                <div class="text-center">
                    <i class="fas fa-users fa-3x text-muted mb-3"></i>
                    <h5>请先加入会话</h5>
                    <p class="text-muted">请在"我的会话"标签页中选择并加入一个会话</p>
                    <button class="btn btn-warning" onclick="document.querySelector('[href=\\"#sessionsTab\\"]').click()">
                        <i class="fas fa-arrow-left me-2"></i>返回会话列表
                    </button>
                </div>
            `;
        }
    }
    
    // 停止计时器
    if (quizTimer) {
        clearInterval(quizTimer);
        quizTimer = null;
    }
}

// 开始计时器
function startTimer() {
    const timerDiv = document.getElementById('timer');
    
    if (quizTimer) {
        clearInterval(quizTimer);
    }
    
    quizTimer = setInterval(() => {
        timerDiv.textContent = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(quizTimer);
            // 时间到，自动提交或显示结果
            showMessage('时间到！', 'warning');
            disableQuiz();
        }
        
        timeLeft--;
    }, 1000);
}

// 选择选项
let selectedAnswer = null;

function selectOption(option, element) {
    // 移除其他选项的选中状态
    document.querySelectorAll('.quiz-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // 选中当前选项
    element.classList.add('selected');
    selectedAnswer = option;
    
    // 启用提交按钮
    document.getElementById('submitBtn').disabled = false;
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
        opt.style.color = '#333';
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

// 提交答案
async function submitAnswer() {
    if (!selectedAnswer || !currentQuizId) {
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
                answer: selectedAnswer
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showQuizResult(data);
            loadUserStats(); // 更新统计数据
        } else {
            showMessage(data.error || '提交失败', 'error');
        }
    } catch (error) {
        showMessage('网络错误，请稍后重试', 'error');
    }
}

// 显示答题结果
function showQuizResult(result) {
    // 停止计时器
    if (quizTimer) {
        clearInterval(quizTimer);
        quizTimer = null;
    }
    
    // 显示正确答案
    document.querySelectorAll('.quiz-option').forEach((opt, index) => {
        const optionLetter = ['A', 'B', 'C', 'D'][index];
        if (optionLetter === result.correct_answer) {
            opt.classList.add('correct');
        } else if (optionLetter === selectedAnswer && !result.is_correct) {
            opt.classList.add('incorrect');
        }
        opt.onclick = null; // 禁用点击
    });
    
    // 更新提交按钮
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.innerHTML = result.is_correct ? 
        '<i class="fas fa-check me-2"></i>回答正确！' : 
        '<i class="fas fa-times me-2"></i>回答错误';
    submitBtn.className = result.is_correct ? 'btn btn-success btn-lg' : 'btn btn-danger btn-lg';
    submitBtn.disabled = true;
    
    // 显示解释
    if (result.explanation) {
        document.getElementById('quizContent').innerHTML += `
            <div class="alert alert-info mt-3">
                <strong>解释：</strong> ${result.explanation}
            </div>
        `;
    }
    
    showMessage(result.is_correct ? '回答正确！' : '回答错误', result.is_correct ? 'success' : 'error');
    
    // 5秒后回到等待状态，等待下一题
    setTimeout(() => {
        console.log('答题结果显示完毕，回到等待状态');
        showWaitingState();
        selectedAnswer = null;
        currentQuizId = null;
    }, 5000);
}

// 禁用题目
function disableQuiz() {
    document.querySelectorAll('.quiz-option').forEach(opt => {
        opt.onclick = null;
        opt.style.opacity = '0.6';
    });
    
    document.getElementById('submitBtn').disabled = true;
}

// 提交反馈
async function submitFeedback(feedbackType) {
    if (!currentQuizId) {
        showMessage('当前没有活跃的题目', 'error');
        return;
    }
    
    try {
        // 这里需要获取当前题目所属的会话ID
        const response = await fetch('/api/quiz/feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session_id: 1, // 临时写死，实际应该获取当前会话ID
                feedback_type: feedbackType
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('反馈提交成功', 'success');
        } else {
            showMessage(data.error || '反馈提交失败', 'error');
        }
    } catch (error) {
        showMessage('网络错误，请稍后重试', 'error');
    }
}

// 加载用户统计数据
async function loadUserStats() {
    try {
        // 获取用户参与的会话
        const sessionsResponse = await fetch('/api/session/list');
        if (!sessionsResponse.ok) return;
        
        const sessionsData = await sessionsResponse.json();
        let totalAnswered = 0;
        let correctAnswered = 0;
        
        // 这里应该调用实际的统计API
        // 暂时显示模拟数据
        document.getElementById('totalAnswered').textContent = totalAnswered;
        document.getElementById('correctAnswered').textContent = correctAnswered;
        document.getElementById('accuracyRate').textContent = 
            totalAnswered > 0 ? Math.round((correctAnswered / totalAnswered) * 100) + '%' : '0%';
        document.getElementById('userRank').textContent = '-';
        
    } catch (error) {
        console.error('加载统计数据失败:', error);
    }
}

// 登出
async function logout() {
    try {
        const response = await fetch('/api/auth/logout', { method: 'POST' });
        if (response.ok) {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('登出失败:', error);
    }
}

// 显示消息提示
function showMessage(message, type) {
    const toast = document.getElementById('messageToast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    
    // 设置不同类型的样式
    toast.className = 'toast';
    if (type === 'success') {
        toast.classList.add('bg-success', 'text-white');
    } else if (type === 'warning') {
        toast.classList.add('bg-warning', 'text-white');
    } else {
        toast.classList.add('bg-danger', 'text-white');
    }
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}
