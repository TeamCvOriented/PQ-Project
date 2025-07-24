// 全局变量
let currentSessionId = null;
let currentQuizId = null;
let selectedFeedbackType = null;
let quizTimer = null;
let timeLeft = 0;
let quizStartTime = null; // 记录开始答题的时间

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
                    
                    // 加载反馈统计
                    loadFeedbackStats();
                    
                    // 切换到当前题目页面
                    showSection('quiz');
                    document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
                    document.querySelector('[data-section="quiz"]').classList.add('active');
                    
                    // 启用导航
                    enableNavigation();
                    
                    // 显示当前会话信息
                    document.getElementById('currentSessionInfo').style.display = 'block';
                    document.getElementById('currentSessionTitle').textContent = activeSession.title;
                    
                    // 检查用户是否已完成答题
                    await checkUserQuizCompletionStatus(activeSession.id);
                    
                    // 检查当前题目
                    checkCurrentQuiz();
                }
            }
        }
    } catch (error) {
        console.error('加载保存的会话失败:', error);
    }
}

// 检查用户答题完成状态
async function checkUserQuizCompletionStatus(sessionId) {
    try {
        const response = await fetch(`/api/quiz/user-completion-status/${sessionId}`);
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.completed) {
                console.log('用户已完成所有题目，显示完成状态功能');
                // 显示答题完成后的功能访问区域
                const postQuizActions = document.getElementById('postQuizActions');
                if (postQuizActions) {
                    postQuizActions.style.display = 'block';
                }
                
                // 启用结果和讨论导航
                const resultsNavItem = document.getElementById('resultsNavItem');
                const discussionsNavItem = document.getElementById('discussionsNavItem');
                if (resultsNavItem) resultsNavItem.style.display = 'block';
                if (discussionsNavItem) discussionsNavItem.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('检查答题完成状态失败:', error);
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
    // 检查是否尝试访问受限功能
    if ((sectionName === 'results' || sectionName === 'discussions') && !hasCompletedQuiz()) {
        showMessage('请先完成答题后再访问此功能', 'warning');
        return;
    }
    
    // 隐藏所有内容区域
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // 显示指定的内容区域
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // 如果不是会话页面且没有选择会话，则不执行加载操作
        if (sectionName !== 'sessions' && !currentSessionId) {
            return;
        }
        
        // 根据不同的区域执行相应的加载操作
        switch(sectionName) {
            case 'sessions':
                loadAvailableSessions();
                break;
            case 'quiz':
                checkCurrentQuiz();
                break;
            case 'results':
                // 确保答题结果区域可见
                document.getElementById('resultsSessionSelector').style.display = 'none';
                document.getElementById('resultsSessionContent').style.display = 'block';
                refreshResults();
                break;
            case 'discussions':
                // 确保讨论区域可见
                document.getElementById('discussionsSessionSelector').style.display = 'none';
                document.getElementById('discussionsSessionContent').style.display = 'block';
                refreshDiscussions();
                break;
            case 'statistics':
                refreshStatistics();
                break;
        }
    }
}

// 检查是否已完成答题
async function hasCompletedQuiz() {
    if (!currentSessionId) return false;
    
    // 检查是否显示了答题完成后的功能访问区域
    const postQuizActions = document.getElementById('postQuizActions');
    if (postQuizActions && postQuizActions.style.display !== 'none') {
        return true;
    }
    
    // 如果前端状态不准确，调用后端API确认
    try {
        const response = await fetch(`/api/quiz/user-completion-status/${currentSessionId}`);
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.completed) {
                // 更新前端状态
                if (postQuizActions) {
                    postQuizActions.style.display = 'block';
                }
                // 启用结果和讨论导航
                const resultsNavItem = document.getElementById('resultsNavItem');
                const discussionsNavItem = document.getElementById('discussionsNavItem');
                if (resultsNavItem) resultsNavItem.style.display = 'block';
                if (discussionsNavItem) discussionsNavItem.style.display = 'block';
                return true;
            }
        }
    } catch (error) {
        console.error('检查完成状态失败:', error);
    }
    
    return false;
}

// 加载可用的会话列表
async function loadAvailableSessions() {
    try {
        const response = await fetch('/api/session/my-sessions');
        if (response.ok) {
            const data = await response.json();
            displayAvailableSessions(data.sessions || []);
        } else {
            console.error('加载我的会话失败:', response.status);
            // 不显示错误消息，因为用户可能还没有参与任何会话
            displayAvailableSessions([]);
        }
    } catch (error) {
        console.error('加载会话列表失败:', error);
        // 不显示错误消息，静默处理
        displayAvailableSessions([]);
    }
}

// 显示可用的会话列表
function displayAvailableSessions(sessions) {
    const container = document.getElementById('sessionsList');
    
    if (sessions.length === 0) {
        container.innerHTML = `
            <div class="text-center">
                <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                <h4>暂无已加入的会话</h4>
                <p class="text-muted">您还没有参与任何会话，请使用邀请码加入会话</p>
                <div class="mt-3">
                    <button class="btn btn-primary" onclick="showJoinByCodeModal()">
                        <i class="fas fa-key me-2"></i>通过邀请码加入会话
                    </button>
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = sessions.map(session => `
        <div class="card session-card mb-3">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h5 class="card-title">${session.title}</h5>
                        <p class="card-text text-muted">${session.description || '暂无描述'}</p>
                        <small class="text-muted">
                            <i class="fas fa-user me-1"></i>演讲者: ${session.speaker || '未指定'} |
                            <i class="fas fa-calendar me-1"></i>加入时间: ${new Date(session.joined_at).toLocaleDateString('zh-CN')}
                        </small>
                    </div>
                    <div class="text-end">
                        <span class="badge bg-${session.is_active ? 'success' : 'secondary'} mb-2">
                            ${session.is_active ? '进行中' : '已结束'}
                        </span>
                        <br>
                        <small class="text-muted">
                            <i class="fas fa-users me-1"></i>
                            ${session.participant_count || 0} 人参与
                        </small>
                    </div>
                </div>
                <div class="mt-3">
                    <button class="btn btn-success btn-sm me-2" onclick="selectSession(${session.id}, '${session.title}')">
                        <i class="fas fa-play me-1"></i>进入会话
                    </button>
                    <button class="btn btn-outline-secondary btn-sm" onclick="leaveSession(${session.id})">
                        <i class="fas fa-sign-out-alt me-1"></i>离开会话
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    // 添加通过邀请码加入的按钮
    container.innerHTML += `
        <div class="text-center mt-4">
            <button class="btn btn-outline-primary" onclick="showJoinByCodeModal()">
                <i class="fas fa-key me-2"></i>通过邀请码加入新会话
            </button>
        </div>
    `;
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
    quizStartTime = Date.now(); // 记录开始答题的时间
    
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
            
            showMessage('答题时间已到，自动跳到下一题', 'warning');
            isAnsweringQuiz = false; // 结束答题状态
            quizStartTime = null; // 清除开始时间
            
            // 立即自动提交空答案或直接切换到下一题
            setTimeout(() => {
                console.log('时间到，自动切换到下一题');
                autoSkipToNextQuiz();
            }, 2000);
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
    
    // 计算答题用时（秒）
    let answerDuration = null;
    if (quizStartTime) {
        answerDuration = (Date.now() - quizStartTime) / 1000; // 转换为秒
        answerDuration = Math.round(answerDuration * 10) / 10; // 保留一位小数
    }
    
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
                answer: answer,
                answer_duration: answerDuration
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
                quizStartTime = null; // 清除开始时间
                
                // 清除计时器
                if (quizTimer) {
                    clearInterval(quizTimer);
                    quizTimer = null;
                }
                
                // 检查是否完成了所有题目
                if (data.all_quizzes_completed) {
                    // 所有题目已完成，显示完成状态并启用功能访问
                    displayCompletionMessage();
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
                    
                    // 隐藏功能访问区域（因为还有题目要答）
                    const postQuizActions = document.getElementById('postQuizActions');
                    if (postQuizActions) {
                        postQuizActions.style.display = 'none';
                    }
                    
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
        </div>
    `;
    
    // 显示答题完成后的功能访问区域
    const postQuizActions = document.getElementById('postQuizActions');
    if (postQuizActions) {
        postQuizActions.style.display = 'block';
    }
    
    // 启用结果和讨论导航
    const resultsNavItem = document.getElementById('resultsNavItem');
    const discussionsNavItem = document.getElementById('discussionsNavItem');
    if (resultsNavItem) resultsNavItem.style.display = 'block';
    if (discussionsNavItem) discussionsNavItem.style.display = 'block';
    
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
    
    // 检查是否是未答题状态
    const isTimeout = data.user_answer === 'X';
    
    container.innerHTML = `
        <div class="quiz-card card">
            <div class="card-header ${isTimeout ? 'bg-warning text-dark' : 'bg-info text-white'}">
                <h5>
                    <i class="fas fa-${isTimeout ? 'clock' : 'info-circle'} me-2"></i>
                    ${isTimeout ? '此题答题超时' : '您已回答过此题'}
                </h5>
            </div>
            <div class="card-body">
                <h4 class="mb-3">${data.quiz ? data.quiz.question : '题目'}</h4>
                
                ${data.quiz ? `
                <!-- 显示所有选项 -->
                <div class="mb-3">
                    <h6><strong>选项：</strong></h6>
                    <div class="options-display">
                        <div class="option-item ${!isTimeout && data.user_answer === 'A' ? (data.is_correct ? 'user-correct' : 'user-incorrect') : ''} ${data.correct_answer === 'A' ? 'correct-answer' : ''}">
                            <div class="option-content">
                                <strong>A.</strong> ${data.quiz.option_a}
                            </div>
                            <div class="option-icons">
                                ${!isTimeout && data.user_answer === 'A' ? '<i class="fas fa-user text-primary"></i>' : ''}
                                ${data.correct_answer === 'A' ? '<i class="fas fa-check text-success"></i>' : ''}
                            </div>
                        </div>
                        <div class="option-item ${!isTimeout && data.user_answer === 'B' ? (data.is_correct ? 'user-correct' : 'user-incorrect') : ''} ${data.correct_answer === 'B' ? 'correct-answer' : ''}">
                            <div class="option-content">
                                <strong>B.</strong> ${data.quiz.option_b}
                            </div>
                            <div class="option-icons">
                                ${!isTimeout && data.user_answer === 'B' ? '<i class="fas fa-user text-primary"></i>' : ''}
                                ${data.correct_answer === 'B' ? '<i class="fas fa-check text-success"></i>' : ''}
                            </div>
                        </div>
                        <div class="option-item ${!isTimeout && data.user_answer === 'C' ? (data.is_correct ? 'user-correct' : 'user-incorrect') : ''} ${data.correct_answer === 'C' ? 'correct-answer' : ''}">
                            <div class="option-content">
                                <strong>C.</strong> ${data.quiz.option_c}
                            </div>
                            <div class="option-icons">
                                ${!isTimeout && data.user_answer === 'C' ? '<i class="fas fa-user text-primary"></i>' : ''}
                                ${data.correct_answer === 'C' ? '<i class="fas fa-check text-success"></i>' : ''}
                            </div>
                        </div>
                        <div class="option-item ${!isTimeout && data.user_answer === 'D' ? (data.is_correct ? 'user-correct' : 'user-incorrect') : ''} ${data.correct_answer === 'D' ? 'correct-answer' : ''}">
                            <div class="option-content">
                                <strong>D.</strong> ${data.quiz.option_d}
                            </div>
                            <div class="option-icons">
                                ${!isTimeout && data.user_answer === 'D' ? '<i class="fas fa-user text-primary"></i>' : ''}
                                ${data.correct_answer === 'D' ? '<i class="fas fa-check text-success"></i>' : ''}
                            </div>
                        </div>
                    </div>
                </div>
                ` : ''}
                
                <!-- 结果总结 -->
                <div class="result-summary mb-3">
                    <p class="mb-1"><strong>您的答案：</strong> 
                        <span class="badge bg-${isTimeout ? 'warning text-dark' : (data.is_correct ? 'success' : 'danger')}">${isTimeout ? '未答题（超时）' : data.user_answer}</span>
                    </p>
                    <p class="mb-1"><strong>正确答案：</strong> 
                        <span class="badge bg-success">${data.correct_answer}</span>
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

// 自动跳过到下一题（时间到时调用）
async function autoSkipToNextQuiz() {
    if (!currentSessionId || !currentQuizId) {
        console.log('没有当前会话或题目，无法自动跳过');
        return;
    }
    
    try {
        // 显示跳过状态
        const container = document.getElementById('quizContent');
        container.innerHTML = `
            <div class="text-center waiting-animation">
                <i class="fas fa-forward fa-3x text-warning mb-3"></i>
                <h4>时间到，自动跳过</h4>
                <p class="text-muted">正在加载下一题...</p>
                <div class="spinner-border text-primary mt-2" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;
        
        // 请求跳过当前题目到下一题
        const response = await fetch(`/api/quiz/skip/${currentQuizId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                console.log('自动跳过成功，检查下一题');
                // 等待1秒后检查下一题
                setTimeout(() => {
                    checkForNextQuiz();
                }, 1000);
            } else {
                console.log('跳过失败，尝试直接检查下一题');
                checkForNextQuiz();
            }
        } else {
            console.log('跳过请求失败，尝试直接检查下一题');
            checkForNextQuiz();
        }
    } catch (error) {
        console.error('自动跳过失败:', error);
        // 如果跳过API失败，直接检查下一题
        checkForNextQuiz();
    }
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
                
                ${result.quiz ? `
                <!-- 显示所有选项 -->
                <div class="mb-3">
                    <h6><strong>选项：</strong></h6>
                    <div class="options-display">
                        <div class="option-item ${result.user_answer === 'A' ? (result.is_correct ? 'user-correct' : 'user-incorrect') : ''} ${result.correct_answer === 'A' ? 'correct-answer' : ''}">
                            <div class="option-content">
                                <strong>A.</strong> ${result.quiz.option_a}
                            </div>
                            <div class="option-icons">
                                ${result.user_answer === 'A' ? '<i class="fas fa-user text-primary"></i>' : ''}
                                ${result.correct_answer === 'A' ? '<i class="fas fa-check text-success"></i>' : ''}
                            </div>
                        </div>
                        <div class="option-item ${result.user_answer === 'B' ? (result.is_correct ? 'user-correct' : 'user-incorrect') : ''} ${result.correct_answer === 'B' ? 'correct-answer' : ''}">
                            <div class="option-content">
                                <strong>B.</strong> ${result.quiz.option_b}
                            </div>
                            <div class="option-icons">
                                ${result.user_answer === 'B' ? '<i class="fas fa-user text-primary"></i>' : ''}
                                ${result.correct_answer === 'B' ? '<i class="fas fa-check text-success"></i>' : ''}
                            </div>
                        </div>
                        <div class="option-item ${result.user_answer === 'C' ? (result.is_correct ? 'user-correct' : 'user-incorrect') : ''} ${result.correct_answer === 'C' ? 'correct-answer' : ''}">
                            <div class="option-content">
                                <strong>C.</strong> ${result.quiz.option_c}
                            </div>
                            <div class="option-icons">
                                ${result.user_answer === 'C' ? '<i class="fas fa-user text-primary"></i>' : ''}
                                ${result.correct_answer === 'C' ? '<i class="fas fa-check text-success"></i>' : ''}
                            </div>
                        </div>
                        <div class="option-item ${result.user_answer === 'D' ? (result.is_correct ? 'user-correct' : 'user-incorrect') : ''} ${result.correct_answer === 'D' ? 'correct-answer' : ''}">
                            <div class="option-content">
                                <strong>D.</strong> ${result.quiz.option_d}
                            </div>
                            <div class="option-icons">
                                ${result.user_answer === 'D' ? '<i class="fas fa-user text-primary"></i>' : ''}
                                ${result.correct_answer === 'D' ? '<i class="fas fa-check text-success"></i>' : ''}
                            </div>
                        </div>
                    </div>
                </div>
                ` : ''}
                
                <!-- 结果总结 -->
                <div class="result-summary mb-3">
                    <p class="mb-1"><strong>您的答案：</strong> 
                        <span class="badge bg-${result.is_correct ? 'success' : 'danger'}">${result.user_answer}</span>
                    </p>
                    <p class="mb-0"><strong>正确答案：</strong> 
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
                            ${quiz.has_answered ? (quiz.is_correct ? '✓ 正确' : '✗ 错误') : '未答'}
                        </span>
                    </div>
                    ${quiz.has_answered ? `
                        <div class="card-body">
                            <!-- 显示所有选项 -->
                            <div class="mb-3">
                                <h6><strong>选项：</strong></h6>
                                <div class="options-display">
                                    <div class="option-item ${quiz.user_answer === 'A' ? (quiz.is_correct ? 'user-correct' : 'user-incorrect') : ''} ${quiz.correct_answer === 'A' ? 'correct-answer' : ''}">
                                        <div class="option-content">
                                            <strong>A.</strong> ${quiz.option_a}
                                        </div>
                                        <div class="option-icons">
                                            ${quiz.user_answer === 'A' ? '<i class="fas fa-user text-primary"></i>' : ''}
                                            ${quiz.correct_answer === 'A' ? '<i class="fas fa-check text-success"></i>' : ''}
                                        </div>
                                    </div>
                                    <div class="option-item ${quiz.user_answer === 'B' ? (quiz.is_correct ? 'user-correct' : 'user-incorrect') : ''} ${quiz.correct_answer === 'B' ? 'correct-answer' : ''}">
                                        <div class="option-content">
                                            <strong>B.</strong> ${quiz.option_b}
                                        </div>
                                        <div class="option-icons">
                                            ${quiz.user_answer === 'B' ? '<i class="fas fa-user text-primary"></i>' : ''}
                                            ${quiz.correct_answer === 'B' ? '<i class="fas fa-check text-success"></i>' : ''}
                                        </div>
                                    </div>
                                    <div class="option-item ${quiz.user_answer === 'C' ? (quiz.is_correct ? 'user-correct' : 'user-incorrect') : ''} ${quiz.correct_answer === 'C' ? 'correct-answer' : ''}">
                                        <div class="option-content">
                                            <strong>C.</strong> ${quiz.option_c}
                                        </div>
                                        <div class="option-icons">
                                            ${quiz.user_answer === 'C' ? '<i class="fas fa-user text-primary"></i>' : ''}
                                            ${quiz.correct_answer === 'C' ? '<i class="fas fa-check text-success"></i>' : ''}
                                        </div>
                                    </div>
                                    <div class="option-item ${quiz.user_answer === 'D' ? (quiz.is_correct ? 'user-correct' : 'user-incorrect') : ''} ${quiz.correct_answer === 'D' ? 'correct-answer' : ''}">
                                        <div class="option-content">
                                            <strong>D.</strong> ${quiz.option_d}
                                        </div>
                                        <div class="option-icons">
                                            ${quiz.user_answer === 'D' ? '<i class="fas fa-user text-primary"></i>' : ''}
                                            ${quiz.correct_answer === 'D' ? '<i class="fas fa-check text-success"></i>' : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 结果总结 -->
                            <div class="result-summary mb-3">
                                <p class="mb-1"><strong>您的答案：</strong> 
                                    <span class="badge bg-${quiz.is_correct ? 'success' : 'danger'}">${quiz.user_answer}</span>
                                </p>
                                <p class="mb-1"><strong>正确答案：</strong> 
                                    <span class="badge bg-success">${quiz.correct_answer}</span>
                                </p>
                            </div>
                            
                            ${quiz.explanation ? `
                                <div class="alert alert-info">
                                    <h6><i class="fas fa-lightbulb me-2"></i>解释</h6>
                                    <p class="mb-0">${quiz.explanation}</p>
                                </div>
                            ` : ''}
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

// 移动端侧边栏切换
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('show');
}

// 点击主内容区域时关闭侧边栏（移动端）
document.addEventListener('click', function(e) {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.querySelector('.mobile-toggle');
    
    if (window.innerWidth <= 768 && 
        !sidebar.contains(e.target) && 
        !toggleBtn.contains(e.target) && 
        sidebar.classList.contains('show')) {
        sidebar.classList.remove('show');
    }
});

// 窗口大小改变时处理侧边栏显示
window.addEventListener('resize', function() {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth > 768) {
        sidebar.classList.remove('show');
    }
});

// 选择反馈类型
function selectFeedbackType(card) {
    // 移除所有卡片的选中状态
    document.querySelectorAll('.feedback-type-card').forEach(c => {
        c.classList.remove('selected');
    });
    
    // 设置当前卡片为选中状态
    card.classList.add('selected');
    selectedFeedbackType = card.getAttribute('data-type');
    
    // 添加选中动画效果
    card.style.transform = 'scale(1.05)';
    setTimeout(() => {
        card.style.transform = '';
    }, 200);
}

// 提交反馈
async function submitFeedback() {
    if (!currentSessionId) {
        showMessage('请先选择一个会话', 'warning');
        return;
    }
    
    if (!selectedFeedbackType) {
        showMessage('请选择反馈类型', 'warning');
        return;
    }
    
    const feedbackContent = document.getElementById('feedbackContent').value.trim();
    
    try {
        const response = await fetch('/api/quiz/feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session_id: currentSessionId,
                feedback_type: selectedFeedbackType,
                content: feedbackContent
            })
        });
        
        if (response.ok) {
            showMessage('反馈提交成功！', 'success');
            
            // 清空表单
            document.getElementById('feedbackContent').value = '';
            document.querySelectorAll('.feedback-type-card').forEach(c => {
                c.classList.remove('selected');
            });
            selectedFeedbackType = null;
            
            // 更新反馈统计
            loadFeedbackStats();
            
            // 添加提交成功的视觉反馈
            const submitBtn = document.querySelector('.feedback-submit-btn');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-check me-2"></i>提交成功！';
            submitBtn.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
            
            setTimeout(() => {
                submitBtn.innerHTML = originalText;
                submitBtn.style.background = '';
            }, 2000);
            
        } else {
            const errorData = await response.json();
            showMessage(errorData.message || '提交反馈失败', 'error');
        }
    } catch (error) {
        console.error('提交反馈失败:', error);
        showMessage('网络错误，请稍后重试', 'error');
    }
}

// 加载反馈统计
async function loadFeedbackStats() {
    if (!currentSessionId) {
        document.getElementById('sessionFeedbackCount').textContent = '--';
        return;
    }
    
    try {
        const response = await fetch(`/api/quiz/feedback-stats/${currentSessionId}`);
        if (response.ok) {
            const data = await response.json();
            document.getElementById('sessionFeedbackCount').textContent = data.feedback_count || 0;
        } else {
            console.error('加载反馈统计失败');
            document.getElementById('sessionFeedbackCount').textContent = '--';
        }
    } catch (error) {
        console.error('加载反馈统计失败:', error);
        document.getElementById('sessionFeedbackCount').textContent = '--';
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
    // 更新统计数据
    document.getElementById('accuracyRate').textContent = data.accuracy ? `${data.accuracy.toFixed(1)}%` : '--';
    document.getElementById('totalQuestions').textContent = data.total_quizzes || '--';  // 使用总题数
    document.getElementById('correctAnswers').textContent = data.correct_answered || '--';
    
    // 优化平均用时显示
    let avgTimeText = '--';
    if (data.avg_time) {
        if (data.avg_time >= 60) {
            // 超过60秒，显示分钟和秒
            const minutes = Math.floor(data.avg_time / 60);
            const seconds = Math.round(data.avg_time % 60);
            avgTimeText = `${minutes}分${seconds}秒`;
        } else {
            // 少于60秒，只显示秒
            avgTimeText = `${data.avg_time}秒`;
        }
    }
    document.getElementById('avgTime').textContent = avgTimeText;
    
    // 更新正确率卡片样式
    const accuracyCard = document.querySelector('.stats-card.accuracy-excellent');
    if (accuracyCard && data.accuracy !== undefined) {
        accuracyCard.className = 'stats-card';
        if (data.accuracy >= 90) {
            accuracyCard.classList.add('accuracy-excellent');
        } else if (data.accuracy >= 75) {
            accuracyCard.classList.add('accuracy-good');
        } else if (data.accuracy >= 60) {
            accuracyCard.classList.add('accuracy-average');
        } else {
            accuracyCard.classList.add('accuracy-poor');
        }
    }
    
    // 更新环形进度条
    const progressCircle = document.getElementById('progressCircle');
    const progressText = document.getElementById('progressText');
    const performanceBadge = document.getElementById('performanceBadge');
    
    if (data.accuracy !== undefined) {
        const percentage = data.accuracy;
        const circumference = 2 * Math.PI * 52; // r=52
        const offset = circumference - (percentage / 100) * circumference;
        
        progressCircle.style.strokeDashoffset = offset;
        progressText.textContent = `${percentage.toFixed(1)}%`;
        
        // 更新进度条颜色和徽章
        progressCircle.className = 'progress';
        if (percentage >= 90) {
            progressCircle.classList.add('excellent');
            performanceBadge.className = 'badge bg-success';
            performanceBadge.textContent = '优秀表现';
        } else if (percentage >= 75) {
            progressCircle.classList.add('good');
            performanceBadge.className = 'badge bg-info';
            performanceBadge.textContent = '良好表现';
        } else if (percentage >= 50) {
            progressCircle.classList.add('average');
            performanceBadge.className = 'badge bg-warning';
            performanceBadge.textContent = '一般表现';
        } else {
            progressCircle.classList.add('poor');
            performanceBadge.className = 'badge bg-danger';
            performanceBadge.textContent = '需要努力';
        }
    }
    
    // 更新成绩等级
    const gradeIcon = document.getElementById('gradeIcon');
    const gradeLevel = document.getElementById('gradeLevel');
    const gradeMessage = document.getElementById('gradeMessage');
    
    if (data.accuracy !== undefined) {
        if (data.accuracy >= 90) {
            gradeIcon.className = 'fas fa-star';
            gradeIcon.style.color = '#ffd700';
            gradeLevel.textContent = 'A级';
            gradeLevel.className = 'text-warning mb-2';
            gradeMessage.textContent = '优秀！继续保持！';
        } else if (data.accuracy >= 75) {
            gradeIcon.className = 'fas fa-medal';
            gradeIcon.style.color = '#17a2b8';
            gradeLevel.textContent = 'B级';
            gradeLevel.className = 'text-info mb-2';
            gradeMessage.textContent = '良好表现，再接再厉！';
        } else if (data.accuracy >= 50) {
            gradeIcon.className = 'fas fa-certificate';
            gradeIcon.style.color = '#ffc107';
            gradeLevel.textContent = 'C级';
            gradeLevel.className = 'text-warning mb-2';
            gradeMessage.textContent = '还有提升空间！';
        } else {
            gradeIcon.className = 'fas fa-exclamation-triangle';
            gradeIcon.style.color = '#dc3545';
            gradeLevel.textContent = 'D级';
            gradeLevel.className = 'text-danger mb-2';
            gradeMessage.textContent = '需要认真听讲！';
        }
    }
    
    // 更新排行榜
    const rankingList = document.getElementById('rankingList');
    if (data.leaderboard && data.leaderboard.length > 0) {
        rankingList.innerHTML = data.leaderboard.map((user, index) => {
            const isCurrentUser = user.user_id === data.user_id;
            let positionClass = 'other';
            if (index === 0) positionClass = 'first';
            else if (index === 1) positionClass = 'second';
            else if (index === 2) positionClass = 'third';
            
            return `
                <div class="ranking-item ${isCurrentUser ? 'current-user' : ''}">
                    <div class="ranking-position ${positionClass}">${index + 1}</div>
                    <div class="ranking-info">
                        <div class="ranking-name">${user.nickname || user.username}${isCurrentUser ? ' (我)' : ''}</div>
                        <div class="ranking-score">正确率: ${user.accuracy.toFixed(1)}% · 总分: ${user.total_score || (user.correct_answered * 10)}分</div>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        rankingList.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="fas fa-users fa-3x mb-3"></i>
                <p>暂无排行数据</p>
            </div>
        `;
    }
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

// 选择会话
function selectSession(sessionId, sessionTitle) {
    currentSessionId = sessionId;
    
    // 显示当前会话信息
    document.getElementById('currentSessionInfo').style.display = 'block';
    document.getElementById('currentSessionTitle').textContent = sessionTitle;
    
    // 显示其他导航项
    enableNavigation();
    
    // 自动跳转到当前题目页面
    showSection('quiz');
    document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector('[data-section="quiz"]').classList.add('active');
    
    // 开始检查当前题目
    checkCurrentQuiz();
    
    showMessage(`已进入会话: ${sessionTitle}`, 'success');
}

// 启用导航功能
function enableNavigation() {
    // 只启用基本导航项，不包括答题结果和讨论区
    const navItems = ['quizNavItem', 'feedbackNavItem', 'statisticsNavItem'];
    navItems.forEach(itemId => {
        const item = document.getElementById(itemId);
        if (item) {
            item.style.display = 'block';
        }
    });
    
    // 隐藏所有区域的会话选择提示，显示内容
    const sessionSelectors = ['quizSessionSelector', 'feedbackSessionSelector', 'statisticsSessionSelector'];
    const sessionContents = ['quizSessionContent', 'feedbackSessionContent', 'statisticsSessionContent'];
    
    sessionSelectors.forEach(selectorId => {
        const selector = document.getElementById(selectorId);
        if (selector) {
            selector.style.display = 'none';
        }
    });
    
    sessionContents.forEach(contentId => {
        const content = document.getElementById(contentId);
        if (content) {
            content.style.display = 'block';
        }
    });
}

// 禁用导航功能
function disableNavigation() {
    const navItems = ['quizNavItem', 'resultsNavItem', 'discussionsNavItem', 'feedbackNavItem', 'statisticsNavItem'];
    navItems.forEach(itemId => {
        const item = document.getElementById(itemId);
        if (item) {
            item.style.display = 'none';
        }
    });
    
    // 显示所有区域的会话选择提示，隐藏内容
    const sessionSelectors = ['quizSessionSelector', 'resultsSessionSelector', 'discussionsSessionSelector', 'feedbackSessionSelector', 'statisticsSessionSelector'];
    const sessionContents = ['quizSessionContent', 'resultsSessionContent', 'discussionsSessionContent', 'feedbackSessionContent', 'statisticsSessionContent'];
    
    sessionSelectors.forEach(selectorId => {
        const selector = document.getElementById(selectorId);
        if (selector) {
            selector.style.display = 'block';
        }
    });
    
    sessionContents.forEach(contentId => {
        const content = document.getElementById(contentId);
        if (content) {
            content.style.display = 'none';
        }
    });
}

// 离开当前会话
function leaveCurrentSession() {
    currentSessionId = null;
    currentQuizId = null;
    
    // 隐藏当前会话信息
    document.getElementById('currentSessionInfo').style.display = 'none';
    
    // 禁用导航功能
    disableNavigation();
    
    // 切换回我的会话页面
    showSection('sessions');
    document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector('[data-section="sessions"]').classList.add('active');
    
    // 重新加载会话列表
    loadAvailableSessions();
    
    showMessage('已离开当前会话', 'info');
}

// 离开指定会话
async function leaveSession(sessionId) {
    if (confirm('确定要离开这个会话吗？')) {
        try {
            const response = await fetch(`/api/session/${sessionId}/leave`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showMessage('已离开会话', 'success');
                
                // 如果离开的是当前会话，重置状态
                if (currentSessionId === sessionId) {
                    leaveCurrentSession();
                } else {
                    // 重新加载会话列表
                    loadAvailableSessions();
                }
            } else {
                showMessage(data.error || '离开会话失败', 'error');
            }
        } catch (error) {
            console.error('离开会话失败:', error);
            showMessage('网络错误，请稍后重试', 'error');
        }
    }
}

// 刷新会话列表
function refreshSessions() {
    loadAvailableSessions();
    showMessage('会话列表已刷新', 'success');
}

// 显示通过邀请码加入会话的模态框
function showJoinByCodeModal() {
    new bootstrap.Modal(document.getElementById('joinByCodeModal')).show();
}

// 通过邀请码加入会话
async function joinByInviteCode() {
    const inviteCode = document.getElementById('inviteCode').value.trim();
    
    if (!inviteCode) {
        showMessage('请输入邀请码', 'warning');
        return;
    }
    
    if (inviteCode.length !== 6) {
        showMessage('邀请码应为6位字符', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/session/join-by-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                invite_code: inviteCode
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('成功加入会话！', 'success');
            bootstrap.Modal.getInstance(document.getElementById('joinByCodeModal')).hide();
            document.getElementById('inviteCode').value = '';
            
            // 刷新已加入的会话列表
            loadAvailableSessions();
        } else {
            showMessage(data.error || '加入会话失败', 'error');
        }
    } catch (error) {
        console.error('加入会话失败:', error);
        showMessage('网络错误，请稍后重试', 'error');
    }
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