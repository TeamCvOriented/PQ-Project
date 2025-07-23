// 全局变量
let currentSessionId = null;
let currentQuizId = null;
let selectedFeedbackType = null;
let quizTimer = null;
let timeLeft = 0;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    setupEventListeners();
    
    // 检查是否有保存的会话
    loadSavedSession();
    
    // 加载可用会话
    loadAvailableSessions();
    
    // 智能检查当前题目
    startSmartQuizChecking();
});

// 智能检查题目机制
let quizCheckInterval = null;
let quizCheckFrequency = 5000; // 默认5秒检查一次
let isAnsweringQuiz = false; // 是否正在答题

function startSmartQuizChecking() {
    // 清除现有的检查
    if (quizCheckInterval) {
        clearInterval(quizCheckInterval);
    }
    
    // 开始智能检查
    quizCheckInterval = setInterval(() => {
        // 如果正在答题且计时器正在运行，跳过这次检查
        if (isAnsweringQuiz && quizTimer !== null) {
            console.log('正在答题中，跳过题目检查');
            return;
        }
        
        if (currentSessionId) {
            checkCurrentQuiz();
        }
    }, quizCheckFrequency);
}

function adjustCheckFrequency(isActive) {
    // 如果有活跃题目，检查频率更高，但在答题时减少检查
    if (isActive && !isAnsweringQuiz) {
        quizCheckFrequency = 8000; // 答题时降低检查频率
    } else if (isActive) {
        quizCheckFrequency = 15000; // 答题中进一步降低检查频率
    } else {
        quizCheckFrequency = 5000; // 没有题目时正常检查
    }
    startSmartQuizChecking();
}

// 初始化页面
function initializePage() {
    // 获取用户信息
    fetch('/api/auth/user')
        .then(response => response.json())
        .then(data => {
            if (data.user) {
                document.getElementById('userInfo').textContent = data.user.nickname || data.user.username;
            }
        })
        .catch(error => {
            console.error('获取用户信息失败:', error);
        });
}

// 加载保存的会话状态
async function loadSavedSession() {
    try {
        const response = await fetch('/api/session/my-sessions');
        if (response.ok) {
            const data = await response.json();
            if (data.sessions && data.sessions.length > 0) {
                // 如果用户已参与会话，自动设置当前会话
                const activeSession = data.sessions.find(s => s.is_active);
                if (activeSession) {
                    currentSessionId = activeSession.id;
                    showMessage(`已自动连接到会话: ${activeSession.title}`, 'info');
                    
                    // 切换到当前题目页面
                    showSection('quiz');
                    document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
                    document.querySelector('[data-section="quiz"]').classList.add('active');
                    
                    // 检查当前题目
                    checkCurrentQuiz();
                }
            }
        }
    } catch (error) {
        console.error('加载保存的会话失败:', error);
    }
}

// 设置事件监听器
function setupEventListeners() {
    // 侧边栏导航
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            if (section) {
                showSection(section);
                
                // 更新导航状态
                document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });

    // 反馈按钮
    document.querySelectorAll('.feedback-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // 移除其他按钮的选中状态
            document.querySelectorAll('.feedback-btn').forEach(b => b.classList.remove('active'));
            
            // 设置当前按钮为选中状态
            this.classList.add('active');
            selectedFeedbackType = this.getAttribute('data-type');
        });
    });
}

// 显示指定的内容区域
function showSection(sectionName) {
    // 隐藏所有内容区域
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // 显示指定的内容区域
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // 根据不同的区域执行相应的加载操作
        switch(sectionName) {
            case 'sessions':
                loadAvailableSessions();
                break;
            case 'quiz':
                checkCurrentQuiz();
                break;
            case 'results':
                refreshResults();
                break;
            case 'discussions':
                refreshDiscussions();
                break;
            case 'statistics':
                refreshStatistics();
                break;
        }
    }
}

// 加载可用的会话列表
async function loadAvailableSessions() {
    try {
        const response = await fetch('/api/session/list');
        if (response.ok) {
            const data = await response.json();
            displayAvailableSessions(data.sessions || []);
        } else {
            showMessage('加载会话列表失败', 'error');
        }
    } catch (error) {
        console.error('加载会话列表失败:', error);
        showMessage('网络错误，请稍后重试', 'error');
    }
}

// 显示可用的会话列表
function displayAvailableSessions(sessions) {
    const container = document.getElementById('sessionsList');
    
    if (sessions.length === 0) {
        container.innerHTML = `
            <div class="text-center">
                <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                <h4>暂无可加入的会话</h4>
                <p class="text-muted">请等待组织者创建新的会话</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = sessions.map(session => `
        <div class="card session-card mb-3" onclick="showJoinSessionModal(${session.id}, '${session.title}')">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h5 class="card-title">${session.title}</h5>
                        <p class="card-text text-muted">${session.description || '暂无描述'}</p>
                        <small class="text-muted">
                            <i class="fas fa-user me-1"></i>演讲者: ${session.speaker || '未指定'}
                        </small>
                    </div>
                    <div class="text-end">
                        <span class="badge bg-${session.is_active ? 'success' : 'secondary'} mb-2">
                            ${session.is_active ? '进行中' : '未开始'}
                        </span>
                        <br>
                        <small class="text-muted">
                            <i class="fas fa-calendar me-1"></i>
                            ${new Date(session.created_at).toLocaleDateString()}
                        </small>
                    </div>
                </div>
                <div class="mt-3">
                    <button class="btn btn-${session.is_participant ? 'secondary' : 'success'} btn-sm">
                        <i class="fas fa-${session.is_participant ? 'check' : 'sign-in-alt'} me-1"></i>
                        ${session.is_participant ? '已加入' : '加入会话'}
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// 显示加入会话确认模态框
function showJoinSessionModal(sessionId, sessionTitle) {
    document.getElementById('sessionTitleToJoin').textContent = sessionTitle;
    document.getElementById('joinSessionModal').setAttribute('data-session-id', sessionId);
    new bootstrap.Modal(document.getElementById('joinSessionModal')).show();
}

// 确认加入会话
async function confirmJoinSession() {
    const modal = document.getElementById('joinSessionModal');
    const sessionId = modal.getAttribute('data-session-id');
    
    try {
        const response = await fetch(`/api/session/${sessionId}/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentSessionId = parseInt(sessionId);
            showMessage('成功加入会话！', 'success');
            bootstrap.Modal.getInstance(modal).hide();
            
            // 切换到当前题目页面
            showSection('quiz');
            document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
            document.querySelector('[data-section="quiz"]').classList.add('active');
            
            // 开始检查当前题目
            checkCurrentQuiz();
        } else {
            showMessage(data.error || '加入会话失败', 'error');
        }
    } catch (error) {
        console.error('加入会话失败:', error);
        showMessage('网络错误，请稍后重试', 'error');
    }
}

// 检查当前活跃的题目
async function checkCurrentQuiz() {
    if (!currentSessionId) return;
    
    try {
        const response = await fetch(`/api/quiz/current/${currentSessionId}`);
        const data = await response.json();
        
        if (data.success && data.quiz) {
            displayCurrentQuiz(data.quiz, data.has_answered);
            adjustCheckFrequency(true); // 有活跃题目，提高检查频率
        } else {
            displayWaitingForQuiz();
            adjustCheckFrequency(false); // 没有题目，降低检查频率
        }
    } catch (error) {
        console.error('检查当前题目失败:', error);
        adjustCheckFrequency(false);
    }
}

// 显示当前题目
function displayCurrentQuiz(quiz, hasAnswered) {
    const container = document.getElementById('quizContent');
    
    // 检查是否是同一个题目，如果是且计时器正在运行，则不重新显示
    if (currentQuizId === quiz.id && quizTimer !== null && !hasAnswered) {
        console.log('同一题目正在进行中，不重新渲染');
        return;
    }
    
    currentQuizId = quiz.id;
    
    if (hasAnswered) {
        isAnsweringQuiz = false; // 已回答，不再是答题状态
        
        // 已经回答过，显示等待状态和跳过按钮
        container.innerHTML = `
            <div class="text-center waiting-animation">
                <i class="fas fa-check-circle fa-3x text-success mb-3"></i>
                <h4>您已回答此题</h4>
                <p class="text-muted">等待其他听众回答或演讲者发布新题目</p>
                <div class="mt-3">
                    <button class="btn btn-outline-primary" onclick="skipCurrentQuiz()">
                        <i class="fas fa-forward me-2"></i>跳过此题
                    </button>
                </div>
            </div>
        `;
        
        // 清除计时器
        if (quizTimer) {
            clearInterval(quizTimer);
            quizTimer = null;
        }
        document.getElementById('timer').textContent = '--:--';
        return;
    }
    
    isAnsweringQuiz = true; // 开始答题状态
    
    // 显示题目
    container.innerHTML = `
        <div class="quiz-card card">
            <div class="card-header">
                <h5><i class="fas fa-question-circle me-2"></i>第 ${quiz.quiz_number || '?'}/${quiz.total_quizzes || '?'} 题</h5>
            </div>
            <div class="card-body">
                <h4 class="mb-4">${quiz.question}</h4>
                
                <div class="options">
                    <button class="btn btn-outline-primary option-btn w-100 text-start" data-answer="A">
                        <strong>A.</strong> ${quiz.option_a}
                    </button>
                    <button class="btn btn-outline-primary option-btn w-100 text-start" data-answer="B">
                        <strong>B.</strong> ${quiz.option_b}
                    </button>
                    <button class="btn btn-outline-primary option-btn w-100 text-start" data-answer="C">
                        <strong>C.</strong> ${quiz.option_c}
                    </button>
                    <button class="btn btn-outline-primary option-btn w-100 text-start" data-answer="D">
                        <strong>D.</strong> ${quiz.option_d}
                    </button>
                </div>
                
                <div class="mt-4 text-center">
                    <button class="btn btn-success btn-lg" id="submitAnswerBtn" onclick="submitAnswer()" disabled>
                        <i class="fas fa-paper-plane me-2"></i>提交答案
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // 设置选项点击事件
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // 移除其他选项的选中状态
            document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
            
            // 设置当前选项为选中状态
            this.classList.add('selected');
            
            // 启用提交按钮
            document.getElementById('submitAnswerBtn').disabled = false;
        });
    });
    
    // 启动计时器（只有在新题目或重新开始时）
    startTimer(quiz.time_limit || 30);
    
    // 调整检查频率
    adjustCheckFrequency(true);
}

// 显示等待题目状态
function displayWaitingForQuiz() {
    const container = document.getElementById('quizContent');
    container.innerHTML = `
        <div class="text-center waiting-animation">
            <i class="fas fa-clock fa-3x text-muted mb-3"></i>
            <h4>等待题目发布...</h4>
            <p class="text-muted">请耐心等待演讲者发布新题目</p>
        </div>
    `;
    
    // 清除计时器
    if (quizTimer) {
        clearInterval(quizTimer);
        quizTimer = null;
    }
    
    document.getElementById('timer').textContent = '--:--';
}

// 启动计时器
function startTimer(seconds) {
    // 如果计时器已经在运行且时间相近，不重新启动
    if (quizTimer && Math.abs(timeLeft - seconds) < 2) {
        console.log('计时器已在运行，无需重新启动');
        return;
    }
    
    timeLeft = seconds;
    updateTimerDisplay();
    
    if (quizTimer) {
        clearInterval(quizTimer);
    }
    
    console.log(`启动计时器: ${seconds}秒`);
    
    quizTimer = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 0) {
            clearInterval(quizTimer);
            quizTimer = null;
            
            console.log('计时器结束');
            
            // 时间到，禁用答题界面
            const submitBtn = document.getElementById('submitAnswerBtn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-clock me-2"></i>时间已到';
            }
            document.querySelectorAll('.option-btn').forEach(btn => btn.disabled = true);
            
            showMessage('答题时间已到', 'warning');
            
            // 3秒后自动检查下一题
            setTimeout(() => {
                console.log('时间到，检查下一题');
                checkForNextQuiz();
            }, 3000);
        }
    }, 1000);
}

// 更新计时器显示
function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('timer').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// 提交答案
async function submitAnswer() {
    const selectedOption = document.querySelector('.option-btn.selected');
    if (!selectedOption) {
        showMessage('请选择一个答案', 'warning');
        return;
    }
    
    const answer = selectedOption.getAttribute('data-answer');
    
    // 禁用提交按钮防止重复提交
    const submitBtn = document.getElementById('submitAnswerBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>提交中...';
    }
    
    try {
        const response = await fetch('/api/quiz/answer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                quiz_id: currentQuizId,
                answer: answer
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            if (data.already_answered) {
                // 处理已回答的情况
                showMessage('您已经回答过这道题', 'warning');
                displayAlreadyAnsweredResult(data);
                isAnsweringQuiz = false; // 结束答题状态
            } else {
                // 正常提交成功
                showMessage('答案提交成功！', 'success');
                isAnsweringQuiz = false; // 结束答题状态
                
                // 清除计时器
                if (quizTimer) {
                    clearInterval(quizTimer);
                    quizTimer = null;
                }
                
                // 检查是否完成了所有题目
                if (data.all_quizzes_completed) {
                    // 所有题目已完成，显示完成状态并回到等待页面
                    const container = document.getElementById('quizContent');
                    container.innerHTML = `
                        <div class="text-center waiting-animation">
                            <i class="fas fa-trophy fa-3x text-warning mb-3"></i>
                            <h4>🎉 恭喜！</h4>
                            <p class="text-success">您已完成所有题目</p>
                            <p class="text-muted">等待演讲者发布新题目...</p>
                        </div>
                    `;
                    
                    // 2秒后自动显示等待状态
                    setTimeout(() => {
                        displayWaitingForQuiz();
                    }, 2000);
                } else {
                    // 还有下一题，显示加载状态
                    const container = document.getElementById('quizContent');
                    container.innerHTML = `
                        <div class="text-center waiting-animation">
                            <i class="fas fa-check-circle fa-3x text-success mb-3"></i>
                            <h4>答案已提交</h4>
                            <p class="text-muted">正在加载下一题...</p>
                            <div class="spinner-border text-primary mt-2" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    `;
                    
                    // 立即检查下一题（不等待3秒）
                    setTimeout(() => {
                        checkForNextQuiz();
                    }, 1000); // 只等1秒让用户看到提交成功
                }
            }
        } else {
            // 处理错误情况
            showMessage(data.error || '提交答案失败', 'error');
            // 重新启用提交按钮
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>提交答案';
            }
        }
    } catch (error) {
        console.error('提交答案失败:', error);
        showMessage('网络连接失败，请检查网络后重试', 'error');
        // 重新启用提交按钮
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>提交答案';
        }
    }
}

// 检查下一题
async function checkForNextQuiz() {
    if (!currentSessionId) return;
    
    try {
        const response = await fetch(`/api/quiz/current/${currentSessionId}`);
        const data = await response.json();
        
        if (data.success && data.quiz) {
            // 有题目可答，直接显示
            log(`获取到题目 ID: ${data.quiz.id} (第${data.quiz.quiz_number}/${data.quiz.total_quizzes}题)`);
            displayCurrentQuiz(data.quiz, data.quiz.has_answered);
            return;
        } else if (data.completed) {
            // 用户已完成所有题目
            log('用户已完成所有题目');
            displayCompletionMessage();
            return;
        }
        
        // 如果没有题目，显示等待状态
        log('没有可答题目，显示等待状态');
        displayWaitingForQuiz();
        
    } catch (error) {
        console.error('检查题目失败:', error);
        log(`检查题目失败: ${error.message}`);
        displayWaitingForQuiz();
    }
}

function log(message) {
    console.log(`[Listener] ${message}`);
}

// 显示完成所有题目的消息
function displayCompletionMessage() {
    const container = document.getElementById('quizContent');
    container.innerHTML = `
        <div class="text-center waiting-animation">
            <i class="fas fa-trophy fa-3x text-warning mb-3"></i>
            <h4>🎉 恭喜！</h4>
            <p class="text-success">您已完成该会话的所有题目</p>
            <p class="text-muted">感谢您的参与！</p>
            <div class="mt-3">
                <button class="btn btn-primary" onclick="showSection('results')">
                    <i class="fas fa-chart-bar me-2"></i>查看结果
                </button>
            </div>
        </div>
    `;
    
    // 清除计时器
    if (quizTimer) {
        clearInterval(quizTimer);
        quizTimer = null;
    }
    document.getElementById('timer').textContent = '--:--';
}

// 显示已回答题目的结果
function displayAlreadyAnsweredResult(data) {
    const container = document.getElementById('quizContent');
    isAnsweringQuiz = false; // 结束答题状态
    
    container.innerHTML = `
        <div class="quiz-card card">
            <div class="card-header bg-info text-white">
                <h5>
                    <i class="fas fa-info-circle me-2"></i>
                    您已回答过此题
                </h5>
            </div>
            <div class="card-body">
                <h4 class="mb-3">${data.quiz ? data.quiz.question : '题目'}</h4>
                
                <div class="mb-3">
                    <p><strong>您的答案：</strong> 
                        <span class="badge bg-${data.is_correct ? 'success' : 'danger'}">${data.user_answer}</span>
                    </p>
                    <p><strong>正确答案：</strong> 
                        <span class="badge bg-success">${data.correct_answer}</span>
                    </p>
                    <p><strong>结果：</strong> 
                        <span class="badge bg-${data.is_correct ? 'success' : 'danger'}">
                            ${data.is_correct ? '正确' : '错误'}
                        </span>
                    </p>
                </div>
                
                ${data.quiz && data.quiz.explanation ? `
                    <div class="alert alert-info">
                        <h6><i class="fas fa-lightbulb me-2"></i>解释</h6>
                        <p class="mb-0">${data.quiz.explanation}</p>
                    </div>
                ` : ''}
                
                <div class="text-center mt-4">
                    <p class="text-muted">正在检查下一题...</p>
                    <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <button class="btn btn-outline-secondary mt-2" onclick="checkForNextQuiz()">
                        <i class="fas fa-sync me-2"></i>手动检查
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // 清除计时器
    if (quizTimer) {
        clearInterval(quizTimer);
        quizTimer = null;
    }
    
    document.getElementById('timer').textContent = '--:--';
    
    // 2秒后自动检查下一题
    setTimeout(() => {
        checkForNextQuiz();
    }, 2000);
}

// 跳过当前题目
function skipCurrentQuiz() {
    showMessage('已跳过当前题目，等待新题目...', 'info');
    
    // 显示等待状态
    displayWaitingForQuiz();
    
    // 开始检查新题目
    setTimeout(() => {
        checkCurrentQuiz();
    }, 2000);
}

// 显示答案结果
function displayAnswerResult(result) {
    const container = document.getElementById('quizContent');
    
    container.innerHTML = `
        <div class="quiz-card card">
            <div class="card-header bg-${result.is_correct ? 'success' : 'danger'} text-white">
                <h5>
                    <i class="fas fa-${result.is_correct ? 'check-circle' : 'times-circle'} me-2"></i>
                    ${result.is_correct ? '回答正确！' : '回答错误'}
                </h5>
            </div>
            <div class="card-body">
                <h4 class="mb-3">${result.quiz ? result.quiz.question : '题目'}</h4>
                
                <div class="mb-3">
                    <p><strong>您的答案：</strong> 
                        <span class="badge bg-${result.is_correct ? 'success' : 'danger'}">${result.user_answer}</span>
                    </p>
                    <p><strong>正确答案：</strong> 
                        <span class="badge bg-success">${result.correct_answer}</span>
                    </p>
                </div>
                
                ${result.explanation ? `
                    <div class="alert alert-info">
                        <h6><i class="fas fa-lightbulb me-2"></i>解释</h6>
                        <p class="mb-0">${result.explanation}</p>
                    </div>
                ` : ''}
                
                <div class="text-center mt-4">
                    <p class="text-muted">正在检查下一题...</p>
                    <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <button class="btn btn-outline-secondary mt-2" onclick="checkForNextQuiz()">
                        <i class="fas fa-sync me-2"></i>手动检查
                    </button>
                </div>
            </div>
        </div>
    `;
}

// 刷新答题结果
async function refreshResults() {
    if (!currentSessionId) {
        document.getElementById('resultsContent').innerHTML = `
            <div class="text-center">
                <i class="fas fa-info-circle fa-3x text-muted mb-3"></i>
                <h4>请先加入会话</h4>
                <p class="text-muted">加入会话后即可查看答题结果</p>
            </div>
        `;
        return;
    }
    
    try {
        const response = await fetch(`/api/quiz/session-sequence/${currentSessionId}`);
        if (response.ok) {
            const data = await response.json();
            displayResults(data);
        } else {
            console.error('API响应错误:', response.status, response.statusText);
            
            if (response.status === 401) {
                // 未登录错误
                document.getElementById('resultsContent').innerHTML = `
                    <div class="text-center">
                        <i class="fas fa-user-times fa-3x text-warning mb-3"></i>
                        <h4>请先登录</h4>
                        <p class="text-muted">需要登录后才能查看答题结果</p>
                        <button class="btn btn-primary" onclick="showSection('login')">前往登录</button>
                    </div>
                `;
            } else {
                // 获取错误详情
                try {
                    const errorData = await response.json();
                    const errorMessage = errorData.error || errorData.message || '加载答题结果失败';
                    showMessage(errorMessage, 'error');
                } catch (e) {
                    showMessage('加载答题结果失败', 'error');
                }
            }
        }
    } catch (error) {
        console.error('加载答题结果失败:', error);
        showMessage('网络错误，请稍后重试', 'error');
    }
}

// 显示答题结果
function displayResults(data) {
    const container = document.getElementById('resultsContent');
    
    if (!data.success || !data.quizzes || data.quizzes.length === 0) {
        container.innerHTML = `
            <div class="text-center">
                <i class="fas fa-clipboard-list fa-3x text-muted mb-3"></i>
                <h4>暂无答题记录</h4>
                <p class="text-muted">会话中还没有发布题目</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="results-summary mb-4">
            <div class="row">
                <div class="col-md-3">
                    <div class="card text-center">
                        <div class="card-body">
                            <h5 class="card-title text-primary">${data.total_quizzes}</h5>
                            <p class="card-text">总题目数</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-center">
                        <div class="card-body">
                            <h5 class="card-title text-success">${data.answered_count}</h5>
                            <p class="card-text">已回答</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-center">
                        <div class="card-body">
                            <h5 class="card-title text-info">${data.correct_count}</h5>
                            <p class="card-text">答对数</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card text-center">
                        <div class="card-body">
                            <h5 class="card-title text-warning">${data.accuracy.toFixed(1)}%</h5>
                            <p class="card-text">正确率</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="quiz-list">
            ${data.quizzes.map((quiz, index) => `
                <div class="card mb-3">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h6 class="mb-0">题目 ${index + 1}: ${quiz.question}</h6>
                        <span class="badge bg-${quiz.has_answered ? (quiz.is_correct ? 'success' : 'danger') : 'secondary'}">
                            ${quiz.has_answered ? (quiz.is_correct ? '正确' : '错误') : '未答'}
                        </span>
                    </div>
                    ${quiz.has_answered ? `
                        <div class="card-body">
                            <p><strong>您的答案：</strong> ${quiz.user_answer}</p>
                            <p><strong>正确答案：</strong> ${quiz.correct_answer}</p>
                            ${quiz.explanation ? `<p><strong>解释：</strong> ${quiz.explanation}</p>` : ''}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
    `;
}

// 刷新讨论
async function refreshDiscussions() {
    if (!currentSessionId) {
        document.getElementById('discussionsContent').innerHTML = `
            <div class="text-center">
                <i class="fas fa-info-circle fa-3x text-muted mb-3"></i>
                <h4>请先加入会话</h4>
                <p class="text-muted">加入会话后即可参与讨论</p>
            </div>
        `;
        return;
    }
    
    try {
        // 获取会话中的所有题目
        const response = await fetch(`/api/quiz/session/${currentSessionId}/discussions`);
        if (response.ok) {
            const data = await response.json();
            displayDiscussionsList(data);
        } else {
            console.error('获取讨论列表失败:', response.status);
            if (response.status === 401) {
                document.getElementById('discussionsContent').innerHTML = `
                    <div class="text-center">
                        <i class="fas fa-user-times fa-3x text-warning mb-3"></i>
                        <h4>请先登录</h4>
                        <p class="text-muted">需要登录后才能参与讨论</p>
                        <button class="btn btn-primary" onclick="showSection('login')">前往登录</button>
                    </div>
                `;
            } else {
                showMessage('加载讨论失败', 'error');
            }
        }
    } catch (error) {
        console.error('加载讨论失败:', error);
        showMessage('网络错误，请稍后重试', 'error');
    }
}

// 显示讨论列表
function displayDiscussionsList(data) {
    const container = document.getElementById('discussionsContent');
    
    if (!data.success || !data.quizzes || data.quizzes.length === 0) {
        container.innerHTML = `
            <div class="text-center">
                <i class="fas fa-clipboard-list fa-3x text-muted mb-3"></i>
                <h4>暂无题目</h4>
                <p class="text-muted">会话中还没有发布题目</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="mb-4">
            <h4><i class="fas fa-comments me-2"></i>题目讨论区</h4>
            <p class="text-muted">点击题目查看和参与讨论</p>
        </div>
        
        <div class="quiz-discussions-list">
            ${data.quizzes.map(quiz => `
                <div class="card mb-3 quiz-discussion-item" onclick="showQuizDiscussion(${quiz.id})">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="flex-grow-1">
                                <h6 class="card-title mb-2">
                                    <span class="badge bg-secondary me-2">题目 ${quiz.order_index}</span>
                                    ${quiz.question}
                                </h6>
                                <div class="d-flex align-items-center text-muted small">
                                    <i class="fas fa-comments me-1"></i>
                                    <span class="me-3">${quiz.discussion_count} 条讨论</span>
                                    <i class="fas fa-users me-1"></i>
                                    <span class="me-3">${quiz.response_count} 人作答</span>
                                    ${quiz.is_active ? '<span class="badge bg-success">活跃中</span>' : '<span class="badge bg-secondary">已结束</span>'}
                                </div>
                            </div>
                            <i class="fas fa-chevron-right text-muted"></i>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <!-- 题目详细讨论区域 -->
        <div id="quizDiscussionDetail" class="mt-4" style="display: none;">
            <!-- 这里会动态加载具体题目的讨论内容 -->
        </div>
    `;
}

// 显示特定题目的讨论
async function showQuizDiscussion(quizId) {
    const detailContainer = document.getElementById('quizDiscussionDetail');
    
    try {
        detailContainer.style.display = 'block';
        detailContainer.innerHTML = `
            <div class="text-center p-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">加载中...</span>
                </div>
                <p class="mt-2">加载讨论内容...</p>
            </div>
        `;
        
        const response = await fetch(`/api/quiz/${quizId}/discussions`);
        if (response.ok) {
            const data = await response.json();
            displayQuizDiscussion(data);
            
            // 滚动到讨论详情区域
            detailContainer.scrollIntoView({ behavior: 'smooth' });
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.error('加载题目讨论失败:', error);
        detailContainer.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                加载讨论失败，请稍后重试
            </div>
        `;
    }
}

// 显示题目详细讨论
function displayQuizDiscussion(data) {
    const container = document.getElementById('quizDiscussionDetail');
    
    if (!data.success) {
        container.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                ${data.error || '加载讨论失败'}
            </div>
        `;
        return;
    }
    
    const quiz = data.quiz;
    const discussions = data.discussions || [];
    const stats = data.statistics || {};
    
    container.innerHTML = `
        <div class="card">
            <div class="card-header bg-primary text-white">
                <div class="d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">
                        <i class="fas fa-comments me-2"></i>题目讨论
                    </h5>
                    <button class="btn btn-outline-light btn-sm" onclick="closeQuizDiscussion()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
            
            <div class="card-body">
                <!-- 题目信息 -->
                <div class="quiz-info mb-4 p-3 bg-light rounded">
                    <h6 class="fw-bold mb-2">${quiz.question}</h6>
                    <div class="row">
                        <div class="col-md-6">
                            <p class="mb-1"><strong>A.</strong> ${quiz.option_a}</p>
                            <p class="mb-1"><strong>B.</strong> ${quiz.option_b}</p>
                        </div>
                        <div class="col-md-6">
                            <p class="mb-1"><strong>C.</strong> ${quiz.option_c}</p>
                            <p class="mb-1"><strong>D.</strong> ${quiz.option_d}</p>
                        </div>
                    </div>
                    <div class="mt-2">
                        <small class="text-success">
                            <i class="fas fa-check-circle me-1"></i>
                            正确答案: ${quiz.correct_answer}
                        </small>
                        ${quiz.explanation ? `
                            <div class="mt-2">
                                <small class="text-muted">
                                    <i class="fas fa-info-circle me-1"></i>
                                    ${quiz.explanation}
                                </small>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <!-- 统计信息 -->
                ${stats.total_responses > 0 ? `
                    <div class="stats-info mb-4 p-3 border rounded">
                        <h6 class="fw-bold mb-3">
                            <i class="fas fa-chart-bar me-2"></i>作答统计
                        </h6>
                        <div class="row">
                            <div class="col-md-6">
                                <p class="mb-1">总回答数: ${stats.total_responses}</p>
                            </div>
                            <div class="col-md-6">
                                <p class="mb-1">选项分布:</p>
                                ${Object.entries(stats.option_distribution || {}).map(([option, count]) => `
                                    <small class="d-block">
                                        ${option}: ${count}人 (${((count/stats.total_responses)*100).toFixed(1)}%)
                                    </small>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                <!-- 发布讨论 -->
                ${data.can_discuss ? `
                    <div class="discussion-form mb-4">
                        <div class="input-group">
                            <input type="text" class="form-control" id="discussionInput_${quiz.id}" 
                                   placeholder="输入您的观点或问题..." maxlength="500">
                            <button class="btn btn-primary" onclick="postQuizDiscussion(${quiz.id})">
                                <i class="fas fa-paper-plane me-1"></i>发布
                            </button>
                        </div>
                    </div>
                ` : ''}
                
                <!-- 讨论列表 -->
                <div class="discussions-list">
                    <h6 class="fw-bold mb-3">
                        <i class="fas fa-comment-dots me-2"></i>
                        讨论 (${discussions.length}条)
                    </h6>
                    
                    ${discussions.length > 0 ? `
                        <div id="discussionMessages_${quiz.id}">
                            ${discussions.map(discussion => `
                                <div class="discussion-message mb-3 p-3 border rounded">
                                    <div class="d-flex justify-content-between align-items-start mb-2">
                                        <strong class="text-primary">${discussion.username}</strong>
                                        <small class="text-muted">${formatDateTime(discussion.created_at)}</small>
                                    </div>
                                    <p class="mb-0">${discussion.message}</p>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="text-center text-muted py-4">
                            <i class="fas fa-comment-slash fa-2x mb-2"></i>
                            <p>还没有讨论，来发表第一条观点吧！</p>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;
}

// 关闭题目讨论详情
function closeQuizDiscussion() {
    const container = document.getElementById('quizDiscussionDetail');
    container.style.display = 'none';
}

// 发布题目讨论
async function postQuizDiscussion(quizId) {
    const input = document.getElementById(`discussionInput_${quizId}`);
    const message = input.value.trim();
    
    if (!message) {
        showMessage('请输入讨论内容', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`/api/quiz/${quizId}/discussions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message: message })
        });
        
        if (response.ok) {
            const data = await response.json();
            input.value = '';
            showMessage('讨论发布成功', 'success');
            
            // 重新加载讨论内容
            showQuizDiscussion(quizId);
        } else {
            const errorData = await response.json();
            showMessage(errorData.error || '发布失败', 'error');
        }
    } catch (error) {
        console.error('发布讨论失败:', error);
        showMessage('网络错误，请稍后重试', 'error');
    }
}

// 格式化日期时间
function formatDateTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 提交反馈
async function submitFeedback() {
    if (!currentSessionId) {
        showMessage('请先加入会话', 'warning');
        return;
    }
    
    if (!selectedFeedbackType) {
        showMessage('请选择反馈类型', 'warning');
        return;
    }
    
    const content = document.getElementById('feedbackContent').value.trim();
    if (!content) {
        showMessage('请输入反馈内容', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/quiz/feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session_id: currentSessionId,
                feedback_type: selectedFeedbackType,
                content: content
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('反馈提交成功，感谢您的建议！', 'success');
            
            // 清空表单
            document.getElementById('feedbackContent').value = '';
            document.querySelectorAll('.feedback-btn').forEach(btn => btn.classList.remove('active'));
            selectedFeedbackType = null;
        } else {
            showMessage(data.message || '提交反馈失败', 'error');
        }
    } catch (error) {
        console.error('提交反馈失败:', error);
        showMessage('网络错误，请稍后重试', 'error');
    }
}

// 刷新成绩统计
async function refreshStatistics() {
    if (!currentSessionId) {
        document.getElementById('statisticsContent').innerHTML = `
            <div class="text-center">
                <i class="fas fa-info-circle fa-3x text-muted mb-3"></i>
                <h4>请先加入会话</h4>
                <p class="text-muted">加入会话后即可查看成绩统计</p>
            </div>
        `;
        return;
    }
    
    try {
        const response = await fetch(`/api/quiz/user-stats/${currentSessionId}`);
        if (response.ok) {
            const data = await response.json();
            displayStatistics(data);
        } else {
            showMessage('加载成绩统计失败', 'error');
        }
    } catch (error) {
        console.error('加载成绩统计失败:', error);
        showMessage('网络错误，请稍后重试', 'error');
    }
}

// 显示成绩统计
function displayStatistics(data) {
    const container = document.getElementById('statisticsContent');
    
    container.innerHTML = `
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="card text-center">
                    <div class="card-body">
                        <h5 class="card-title text-primary">${data.total_answered}</h5>
                        <p class="card-text">已答题数</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center">
                    <div class="card-body">
                        <h5 class="card-title text-success">${data.correct_answered}</h5>
                        <p class="card-text">答对题数</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center">
                    <div class="card-body">
                        <h5 class="card-title text-warning">${data.accuracy.toFixed(1)}%</h5>
                        <p class="card-text">正确率</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-center">
                    <div class="card-body">
                        <h5 class="card-title text-info">${data.rank}</h5>
                        <p class="card-text">排名</p>
                    </div>
                </div>
            </div>
        </div>
        
        ${data.leaderboard && data.leaderboard.length > 0 ? `
            <div class="card">
                <div class="card-header">
                    <h5><i class="fas fa-trophy me-2"></i>排行榜</h5>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-striped">
                            <thead>
                                <tr>
                                    <th>排名</th>
                                    <th>用户</th>
                                    <th>答对题数</th>
                                    <th>正确率</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.leaderboard.map((user, index) => `
                                    <tr class="${user.user_id === data.user_id ? 'table-warning' : ''}">
                                        <td>
                                            ${index + 1}
                                            ${index === 0 ? '<i class="fas fa-crown text-warning ms-1"></i>' : ''}
                                        </td>
                                        <td>${user.nickname || user.username}</td>
                                        <td>${user.correct_answered}</td>
                                        <td>${user.accuracy.toFixed(1)}%</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        ` : ''}
    `;
}

// 通用消息提示
function showMessage(message, type = 'info') {
    // 创建消息元素
    const messageDiv = document.createElement('div');
    messageDiv.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    messageDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    messageDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // 添加到页面
    document.body.appendChild(messageDiv);
    
    // 3秒后自动移除
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 3000);
}

// 刷新会话列表
function refreshSessions() {
    loadAvailableSessions();
}

// 退出登录
function logout() {
    currentSessionId = null;
    
    fetch('/api/auth/logout', {
        method: 'POST'
    }).then(() => {
        window.location.href = '/';
    }).catch(error => {
        console.error('退出登录失败:', error);
        window.location.href = '/';
    });
}