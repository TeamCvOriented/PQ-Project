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
    
    // 每5秒检查一次当前题目
    setInterval(checkCurrentQuiz, 5000);
});

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
        } else {
            displayWaitingForQuiz();
        }
    } catch (error) {
        console.error('检查当前题目失败:', error);
    }
}

// 显示当前题目
function displayCurrentQuiz(quiz, hasAnswered) {
    const container = document.getElementById('quizContent');
    currentQuizId = quiz.id;
    
    if (hasAnswered) {
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
        return;
    }
    
    // 显示题目
    container.innerHTML = `
        <div class="quiz-card card">
            <div class="card-header">
                <h5><i class="fas fa-question-circle me-2"></i>题目 #${quiz.id}</h5>
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
    
    // 启动计时器
    startTimer(quiz.time_limit || 30);
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
    timeLeft = seconds;
    updateTimerDisplay();
    
    if (quizTimer) {
        clearInterval(quizTimer);
    }
    
    quizTimer = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 0) {
            clearInterval(quizTimer);
            // 时间到，自动提交或禁用答题
            document.getElementById('submitAnswerBtn').disabled = true;
            document.querySelectorAll('.option-btn').forEach(btn => btn.disabled = true);
            showMessage('答题时间已到', 'warning');
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
            showMessage('答案提交成功！', 'success');
            
            // 显示答案结果
            displayAnswerResult(data);
            
            // 清除计时器
            if (quizTimer) {
                clearInterval(quizTimer);
                quizTimer = null;
            }
        } else {
            // 检查是否是已回答的错误
            if (data.already_answered) {
                showMessage('您已经回答过这道题', 'warning');
                displayAlreadyAnsweredResult(data);
            } else {
                showMessage(data.error || '提交答案失败', 'error');
            }
        }
    } catch (error) {
        console.error('提交答案失败:', error);
        showMessage('网络连接失败，请检查网络后重试', 'error');
    }
}

// 显示已回答题目的结果
function displayAlreadyAnsweredResult(data) {
    const container = document.getElementById('quizContent');
    
    container.innerHTML = `
        <div class="quiz-card card">
            <div class="card-header bg-info text-white">
                <h5>
                    <i class="fas fa-info-circle me-2"></i>
                    您已回答过此题
                </h5>
            </div>
            <div class="card-body">
                <h4 class="mb-3">${data.quiz.question}</h4>
                
                <div class="mb-3">
                    <p><strong>您的答案：</strong> 
                        <span class="badge bg-${data.is_correct ? 'success' : 'danger'}">${data.user_answer}</span>
                    </p>
                    <p><strong>正确答案：</strong> 
                        <span class="badge bg-success">${data.quiz.correct_answer}</span>
                    </p>
                    <p><strong>结果：</strong> 
                        <span class="badge bg-${data.is_correct ? 'success' : 'danger'}">
                            ${data.is_correct ? '正确' : '错误'}
                        </span>
                    </p>
                </div>
                
                ${data.quiz.explanation ? `
                    <div class="alert alert-info">
                        <h6><i class="fas fa-lightbulb me-2"></i>解释</h6>
                        <p class="mb-0">${data.quiz.explanation}</p>
                    </div>
                ` : ''}
                
                <div class="text-center mt-4">
                    <button class="btn btn-primary me-2" onclick="skipCurrentQuiz()">
                        <i class="fas fa-forward me-2"></i>跳过此题
                    </button>
                    <button class="btn btn-outline-secondary" onclick="checkCurrentQuiz()">
                        <i class="fas fa-sync me-2"></i>刷新题目
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
                <h4 class="mb-3">${result.quiz.question}</h4>
                
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
                    <p class="text-muted">等待演讲者发布下一题...</p>
                    <button class="btn btn-outline-secondary mt-2" onclick="checkCurrentQuiz()">
                        <i class="fas fa-sync me-2"></i>检查新题目
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
            showMessage('加载答题结果失败', 'error');
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
        // 获取当前活跃题目
        const quizResponse = await fetch(`/api/quiz/current/${currentSessionId}`);
        const quizData = await quizResponse.json();
        
        if (quizData.success && quizData.quiz) {
            // 获取题目讨论
            const discussionResponse = await fetch(`/api/quiz/${quizData.quiz.id}/discussions`);
            if (discussionResponse.ok) {
                const discussionData = await discussionResponse.json();
                displayDiscussion(discussionData);
            } else {
                showMessage('加载讨论失败', 'error');
            }
        } else {
            document.getElementById('discussionsContent').innerHTML = `
                <div class="text-center">
                    <i class="fas fa-comments fa-3x text-muted mb-3"></i>
                    <h4>暂无活跃题目</h4>
                    <p class="text-muted">等待演讲者发布题目后即可参与讨论</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('加载讨论失败:', error);
        showMessage('网络错误，请稍后重试', 'error');
    }
}

// 显示讨论
function displayDiscussion(data) {
    const container = document.getElementById('discussionsContent');
    
    container.innerHTML = `
        <div class="card mb-4">
            <div class="card-header">
                <h5><i class="fas fa-comments me-2"></i>题目讨论</h5>
                <small class="text-muted">题目: ${data.quiz ? data.quiz.question : '未知题目'}</small>
            </div>
            <div class="card-body">
                ${data.can_discuss ? `
                    <div class="discussion-form mb-4">
                        <div class="input-group">
                            <input type="text" class="form-control" id="discussionInput" 
                                   placeholder="输入您的观点或问题..." maxlength="500">
                            <button class="btn btn-primary" onclick="postDiscussion()">
                                <i class="fas fa-paper-plane me-1"></i>发布
                            </button>
                        </div>
                    </div>
                ` : `
                    <div class="alert alert-info">
                        <i class="fas fa-info-circle me-2"></i>
                        题目活跃期间讨论区暂时关闭，请先完成答题
                    </div>
                `}
                
                <div class="discussions-list">
                    ${data.discussions && data.discussions.length > 0 ? 
                        data.discussions.map(discussion => `
                            <div class="discussion-item border-bottom pb-3 mb-3">
                                <div class="d-flex justify-content-between align-items-start">
                                    <div>
                                        <strong>${discussion.user_nickname || discussion.username}</strong>
                                        <small class="text-muted ms-2">
                                            ${new Date(discussion.created_at).toLocaleString()}
                                        </small>
                                    </div>
                                </div>
                                <p class="mt-2 mb-0">${discussion.content}</p>
                            </div>
                        `).join('') : 
                        '<p class="text-muted text-center">暂无讨论内容</p>'
                    }
                </div>
            </div>
        </div>
    `;
}

// 发布讨论
async function postDiscussion() {
    const input = document.getElementById('discussionInput');
    const content = input.value.trim();
    
    if (!content) {
        showMessage('请输入讨论内容', 'warning');
        return;
    }
    
    try {
        // 获取当前活跃题目ID
        const quizResponse = await fetch(`/api/quiz/current/${currentSessionId}`);
        const quizData = await quizResponse.json();
        
        if (!quizData.success || !quizData.quiz) {
            showMessage('没有活跃的题目', 'error');
            return;
        }
        
        const response = await fetch(`/api/quiz/${quizData.quiz.id}/discussions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: content
            })
        });
        
        if (response.ok) {
            input.value = '';
            showMessage('讨论发布成功', 'success');
            refreshDiscussions();
        } else {
            const errorData = await response.json();
            showMessage(errorData.error || '发布讨论失败', 'error');
        }
    } catch (error) {
        console.error('发布讨论失败:', error);
        showMessage('网络错误，请稍后重试', 'error');
    }
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