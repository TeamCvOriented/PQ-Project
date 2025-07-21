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
    
    // 如果已经有活跃会话，开始轮询
    setTimeout(() => {
        if (currentSessionId) {
            pollForQuizzes();
        }
    }, 1000);
});

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
                pollForQuizzes();
            } else {
                console.log('没有找到已参与的活跃会话');
            }
        }
    } catch (error) {
        console.error('检查已参与会话失败:', error);
    }
}

// 题目轮询函数
async function pollForQuizzes() {
    if (!currentSessionId) {
        console.log('没有当前会话ID，跳过题目轮询');
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
                console.log('找到当前题目，开始显示');
                
                // 检查是否是新题目
                if (currentQuizId !== quizData.quiz.id) {
                    console.log('这是一个新题目，显示题目');
                    displayQuiz(quizData.quiz);
                    currentQuizId = quizData.quiz.id;
                } else {
                    console.log('这是当前题目，无需更新');
                }
                return;
            } else {
                console.log('没有活跃题目:', quizData.message);
                showNoQuizMessage();
            }
        }
    } catch (error) {
        console.error('轮询题目时出错:', error);
    }
    
    // 继续轮询
    setTimeout(pollForQuizzes, 3000);
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
        
    } catch (error) {
        console.error('认证检查失败:', error);
        window.location.href = '/login';
    }
}

// 加载用户信息
async function loadUserInfo() {
    if (!currentUser) return;
    
    const userInfoDiv = document.getElementById('userInfo');
    if (userInfoDiv) {
        userInfoDiv.innerHTML = `
            <div class="user-card">
                <h3>${currentUser.username}</h3>
                <p class="text-muted">听众身份</p>
            </div>
        `;
    }
}

// 加载会话列表
async function loadSessions() {
    try {
        const response = await fetch('/api/session/list');
        
        if (!response.ok) {
            throw new Error('Failed to fetch sessions');
        }
        
        const data = await response.json();
        displaySessions(data.sessions || []);
        
    } catch (error) {
        console.error('加载会话失败:', error);
        showMessage('加载会话失败', 'error');
    }
}

// 显示会话列表
function displaySessions(sessions) {
    const sessionsContainer = document.getElementById('sessionsList');
    if (!sessionsContainer) return;
    
    if (sessions.length === 0) {
        sessionsContainer.innerHTML = '<div class="text-center text-muted">暂无可参与的会话</div>';
        return;
    }
    
    sessionsContainer.innerHTML = sessions.map(session => `
        <div class="session-card">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h5 class="card-title">${session.title}</h5>
                        <p class="card-text text-muted">${session.description || '暂无描述'}</p>
                        <small class="text-muted">
                            创建时间: ${new Date(session.created_at).toLocaleString()}
                        </small>
                    </div>
                    <div class="text-end">
                        <span class="badge ${session.is_active ? 'bg-success' : 'bg-secondary'} mb-2">
                            ${session.is_active ? '进行中' : '已结束'}
                        </span>
                        ${session.is_participant ? 
                            '<span class="badge bg-info d-block">已参与</span>' : ''
                        }
                    </div>
                </div>
                <div class="mt-3">
                    ${session.is_active && !session.is_participant ? 
                        `<button class="btn btn-primary" onclick="joinSession(${session.id})">
                            <i class="fas fa-sign-in-alt me-2"></i>加入会话
                        </button>` : ''
                    }
                    ${session.is_participant && session.is_active ? 
                        `<button class="btn btn-warning" onclick="leaveSession(${session.id})">
                            <i class="fas fa-sign-out-alt me-2"></i>退出会话
                        </button>` : ''
                    }
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
            if (quizTab) {
                const tab = new bootstrap.Tab(quizTab);
                tab.show();
            }
            
            // 立即检查题目
            pollForQuizzes();
            
            console.log(`已加入会话 ${sessionId}，开始监听题目`);
        } else {
            showMessage(data.error || '加入会话失败', 'error');
        }
    } catch (error) {
        console.error('加入会话时出错:', error);
        showMessage('加入会话时出错', 'error');
    }
}

// 退出会话
async function leaveSession(sessionId) {
    try {
        const response = await fetch(`/api/session/${sessionId}/leave`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('已退出会话', 'success');
            currentSessionId = null; // 清除当前会话ID
            loadSessions(); // 刷新会话列表
            showNoQuizMessage(); // 显示无题目状态
        } else {
            showMessage(data.error || '退出会话失败', 'error');
        }
    } catch (error) {
        console.error('退出会话时出错:', error);
        showMessage('退出会话时出错', 'error');
    }
}

// 显示题目
function displayQuiz(quiz) {
    const currentQuizDiv = document.getElementById('currentQuiz');
    const waitingDiv = document.getElementById('waitingState');
    const quizContentDiv = document.getElementById('quizContent');
    const timerDiv = document.getElementById('timer');
    
    currentQuizId = quiz.id;
    timeLeft = quiz.time_limit || 60;
    
    // 自动切换到答题区标签页
    const quizTab = document.querySelector('a[href="#quizTab"]');
    if (quizTab) {
        const tab = new bootstrap.Tab(quizTab);
        tab.show();
    }
    
    // 显示题目区域
    currentQuizDiv.style.display = 'block';
    waitingDiv.style.display = 'none';
    
    // 更新计时器显示
    if (timerDiv) {
        timerDiv.textContent = timeLeft;
    }
    
    // 填充题目内容
    quizContentDiv.innerHTML = `
        <h4 class="mb-4 text-center">${quiz.question}</h4>
        <div class="quiz-options">
            <div class="quiz-option mb-2 p-3 border rounded" onclick="selectOption('A', this)" style="cursor: pointer;">
                <span class="option-badge bg-primary text-white px-2 py-1 rounded me-2">A</span>
                ${quiz.option_a}
            </div>
            <div class="quiz-option mb-2 p-3 border rounded" onclick="selectOption('B', this)" style="cursor: pointer;">
                <span class="option-badge bg-success text-white px-2 py-1 rounded me-2">B</span>
                ${quiz.option_b}
            </div>
            <div class="quiz-option mb-2 p-3 border rounded" onclick="selectOption('C', this)" style="cursor: pointer;">
                <span class="option-badge bg-warning text-white px-2 py-1 rounded me-2">C</span>
                ${quiz.option_c}
            </div>
            <div class="quiz-option mb-2 p-3 border rounded" onclick="selectOption('D', this)" style="cursor: pointer;">
                <span class="option-badge bg-info text-white px-2 py-1 rounded me-2">D</span>
                ${quiz.option_d}
            </div>
        </div>
        <div class="text-center mt-4">
            <button id="submitBtn" class="btn btn-warning btn-lg" onclick="submitAnswer()" disabled>
                <i class="fas fa-paper-plane me-2"></i>提交答案
            </button>
        </div>
    `;
    
    console.log('题目内容已插入DOM，题目ID:', quiz.id);
    
    // 开始计时
    startTimer();
}

// 显示无题目消息
function showNoQuizMessage() {
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
        }
    }
}

// 选择选项
function selectOption(option, element) {
    // 清除之前的选择
    document.querySelectorAll('.quiz-option').forEach(opt => {
        opt.classList.remove('selected', 'bg-light', 'border-primary');
    });
    
    // 标记当前选择
    element.classList.add('selected', 'bg-light', 'border-primary');
    
    // 启用提交按钮
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = `提交答案 ${option}`;
    }
    
    // 保存选择
    window.selectedOption = option;
}

// 提交答案
async function submitAnswer() {
    if (!window.selectedOption || !currentQuizId || !currentSessionId) {
        showMessage('请先选择答案', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/quiz/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                quiz_id: currentQuizId,
                session_id: currentSessionId,
                answer: window.selectedOption
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('答案提交成功！', 'success');
            
            // 禁用所有选项和提交按钮
            document.querySelectorAll('.quiz-option').forEach(opt => {
                opt.style.pointerEvents = 'none';
                opt.style.opacity = '0.6';
            });
            
            const submitBtn = document.getElementById('submitBtn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = '已提交';
            }
            
        } else {
            showMessage(data.error || '提交失败', 'error');
        }
    } catch (error) {
        console.error('提交答案时出错:', error);
        showMessage('提交答案时出错', 'error');
    }
}

// 开始计时器
function startTimer() {
    const timerDiv = document.getElementById('timer');
    
    if (quizTimer) {
        clearInterval(quizTimer);
    }
    
    quizTimer = setInterval(() => {
        if (timerDiv) {
            timerDiv.textContent = timeLeft;
        }
        
        if (timeLeft <= 0) {
            clearInterval(quizTimer);
            quizTimer = null;
            
            // 时间到，自动提交
            if (window.selectedOption) {
                submitAnswer();
            } else {
                showMessage('时间到！', 'warning');
            }
        }
        
        timeLeft--;
    }, 1000);
}

// 停止计时器
function stopTimer() {
    if (quizTimer) {
        clearInterval(quizTimer);
        quizTimer = null;
    }
}

// 加载用户统计
async function loadUserStats() {
    try {
        const response = await fetch('/api/user/stats');
        
        if (!response.ok) {
            console.error('Failed to fetch user stats');
            return;
        }
        
        const stats = await response.json();
        displayUserStats(stats);
        
    } catch (error) {
        console.error('加载统计失败:', error);
    }
}

// 显示用户统计
function displayUserStats(stats) {
    const statsContainer = document.getElementById('userStats');
    if (!statsContainer) return;
    
    statsContainer.innerHTML = `
        <div class="stats-card">
            <h4>我的答题统计</h4>
            <div class="row text-center">
                <div class="col-4">
                    <h5>${stats.total_questions || 0}</h5>
                    <small>总题目</small>
                </div>
                <div class="col-4">
                    <h5>${stats.correct_answers || 0}</h5>
                    <small>答对</small>
                </div>
                <div class="col-4">
                    <h5>${stats.accuracy || 0}%</h5>
                    <small>正确率</small>
                </div>
            </div>
        </div>
    `;
}

// 显示消息
function showMessage(message, type = 'info') {
    // 创建或获取消息容器
    let messageContainer = document.getElementById('messageContainer');
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.id = 'messageContainer';
        messageContainer.style.position = 'fixed';
        messageContainer.style.top = '20px';
        messageContainer.style.right = '20px';
        messageContainer.style.zIndex = '9999';
        document.body.appendChild(messageContainer);
    }
    
    // 创建消息元素
    const messageElement = document.createElement('div');
    messageElement.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
    messageElement.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    messageContainer.appendChild(messageElement);
    
    // 3秒后自动移除
    setTimeout(() => {
        if (messageElement.parentNode) {
            messageElement.remove();
        }
    }, 3000);
}

// 退出登录
async function logout() {
    try {
        const response = await fetch('/api/auth/logout', { method: 'POST' });
        
        if (response.ok) {
            window.location.href = '/login';
        } else {
            showMessage('退出失败', 'error');
        }
    } catch (error) {
        console.error('退出时出错:', error);
        showMessage('退出时出错', 'error');
    }
}
