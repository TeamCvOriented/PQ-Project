// 听众界面的JavaScript功能

let currentUser = null;
let currentQuizId = null;
let quizTimer = null;
let timeLeft = 0;

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    loadUserInfo();
    loadSessions();
    loadUserStats();
    
    // 定期检查新题目
    setInterval(checkForNewQuiz, 5000);
});

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
                                `<button class="btn btn-warning btn-sm" onclick="joinSession(${session.id})">
                                    <i class="fas fa-sign-in-alt me-1"></i>加入会话
                                </button>` :
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
            loadSessions(); // 刷新会话列表
            
            // 切换到答题区标签页
            const quizTab = document.querySelector('[href="#quizTab"]');
            const tab = new bootstrap.Tab(quizTab);
            tab.show();
            
            // 开始检查题目
            checkForNewQuiz();
        } else {
            showMessage(data.error || '加入会话失败', 'error');
        }
    } catch (error) {
        showMessage('网络错误，请稍后重试', 'error');
    }
}

// 检查新题目
async function checkForNewQuiz() {
    try {
        // 获取当前用户参与的所有活跃会话
        const sessionsResponse = await fetch('/api/session/list');
        if (!sessionsResponse.ok) return;
        
        const sessionsData = await sessionsResponse.json();
        const activeSessions = sessionsData.sessions.filter(s => s.is_active);
        
        for (const session of activeSessions) {
            const quizResponse = await fetch(`/api/quiz/current/${session.id}`);
            if (quizResponse.ok) {
                const quizData = await quizResponse.json();
                if (quizData.quiz && !quizData.quiz.has_answered) {
                    displayQuiz(quizData.quiz);
                    return;
                }
            }
        }
        
        // 没有活跃题目，显示等待状态
        showWaitingState();
        
    } catch (error) {
        console.error('检查题目失败:', error);
    }
}

// 显示题目
function displayQuiz(quiz) {
    const currentQuizDiv = document.getElementById('currentQuiz');
    const waitingDiv = document.getElementById('waitingState');
    const quizContentDiv = document.getElementById('quizContent');
    
    currentQuizId = quiz.id;
    timeLeft = quiz.time_limit;
    
    // 显示题目区域
    currentQuizDiv.style.display = 'block';
    waitingDiv.style.display = 'none';
    
    // 填充题目内容
    quizContentDiv.innerHTML = `
        <h4 class="mb-4">${quiz.question}</h4>
        <div class="quiz-options">
            <div class="quiz-option" onclick="selectOption('A', this)">
                <span class="option-badge bg-primary">A</span>
                ${quiz.option_a}
            </div>
            <div class="quiz-option" onclick="selectOption('B', this)">
                <span class="option-badge bg-success">B</span>
                ${quiz.option_b}
            </div>
            <div class="quiz-option" onclick="selectOption('C', this)">
                <span class="option-badge bg-warning">C</span>
                ${quiz.option_c}
            </div>
            <div class="quiz-option" onclick="selectOption('D', this)">
                <span class="option-badge bg-info">D</span>
                ${quiz.option_d}
            </div>
        </div>
        <div class="text-center mt-4">
            <button id="submitBtn" class="btn btn-warning btn-lg" onclick="submitAnswer()" disabled>
                <i class="fas fa-paper-plane me-2"></i>提交答案
            </button>
        </div>
    `;
    
    // 开始计时
    startTimer();
}

// 显示等待状态
function showWaitingState() {
    const currentQuizDiv = document.getElementById('currentQuiz');
    const waitingDiv = document.getElementById('waitingState');
    
    currentQuizDiv.style.display = 'none';
    waitingDiv.style.display = 'block';
    
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
    
    // 3秒后回到等待状态
    setTimeout(() => {
        showWaitingState();
        selectedAnswer = null;
        currentQuizId = null;
    }, 3000);
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
