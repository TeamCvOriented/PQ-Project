// 听众界面的JavaScript功能

let currentUser = null;
let currentQuizId = null;
let quizTimer = null;
let timeLeft = 0;
let currentSessionId = null; // 添加当前会话ID跟踪
let quizSequence = []; // 存储题目序列
let currentQuizIndex = -1; // 当前题目在序列中的索引

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
        
        // 获取题目序列
        await loadQuizSequence();
        
        if (quizSequence.length === 0) {
            console.log('没有题目序列');
            showWaitingState();
            return;
        }
        
        // 找到下一个未回答的题目
        const nextQuiz = findNextUnAnsweredQuiz();
        
        if (nextQuiz) {
            console.log('找到下一个未回答题目:', nextQuiz.question);
            
            // 检查是否是新题目
            if (currentQuizId !== nextQuiz.id) {
                console.log('显示新题目');
                displayQuiz(nextQuiz, currentSessionId);
            } else {
                console.log('这是当前题目，无需更新');
            }
        } else {
            console.log('所有题目已完成');
            showAllQuizzesCompleted();
        }
        
    } catch (error) {
        console.error('检查题目失败:', error);
        showWaitingState();
    }
}

// 找到下一个未回答的题目
function findNextUnAnsweredQuiz() {
    for (let quiz of quizSequence) {
        if (!quiz.has_answered) {
            return quiz;
        }
    }
    return null; // 所有题目都已回答
}

// 加载题目序列
async function loadQuizSequence() {
    try {
        const response = await fetch(`/api/quiz/session-sequence/${currentSessionId}`);
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                quizSequence = data.quiz_sequence;
                console.log(`加载了${quizSequence.length}道题目序列`);
            }
        }
    } catch (error) {
        console.error('加载题目序列失败:', error);
    }
}

// 请求激活下一题
async function requestNextQuiz() {
    try {
        const response = await fetch(`/api/quiz/auto-activate-next/${currentSessionId}`, {
            method: 'POST'
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('激活下一题响应:', data);
            
            if (data.success) {
                if (data.is_finished) {
                    console.log('所有题目已完成');
                    showAllQuizzesCompleted();
                } else {
                    console.log(`已请求激活第${data.quiz_index + 1}题`);
                    // 显示正在准备下一题的状态
                    showPreparingNextQuiz(data.quiz_index + 1, data.total_quizzes);
                    // 短暂等待后重新检查题目
                    setTimeout(() => {
                        checkForNewQuiz();
                    }, 2000);
                }
            }
        }
    } catch (error) {
        console.error('请求下一题失败:', error);
    }
}

// 显示正在准备下一题的状态
function showPreparingNextQuiz(nextQuizNumber, totalQuizzes) {
    const currentQuizDiv = document.getElementById('currentQuiz');
    const waitingDiv = document.getElementById('waitingState');
    
    if (currentQuizDiv && waitingDiv) {
        currentQuizDiv.style.display = 'none';
        waitingDiv.style.display = 'block';
        
        waitingDiv.innerHTML = `
            <div class="text-center">
                <i class="fas fa-hourglass-half fa-3x text-info mb-3"></i>
                <h5>正在准备下一题...</h5>
                <p class="text-muted">即将显示第 ${nextQuizNumber}/${totalQuizzes} 题</p>
                <div class="progress mb-3" style="max-width: 300px; margin: 0 auto;">
                    <div class="progress-bar bg-info" role="progressbar" 
                         style="width: ${((nextQuizNumber - 1) / totalQuizzes * 100)}%">
                    </div>
                </div>
                <div class="spinner-border text-info" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;
    }
}

// 显示所有题目完成状态
function showAllQuizzesCompleted() {
    const currentQuizDiv = document.getElementById('currentQuiz');
    const waitingDiv = document.getElementById('waitingState');
    
    if (currentQuizDiv && waitingDiv) {
        currentQuizDiv.style.display = 'none';
        waitingDiv.style.display = 'block';
        
        const totalQuizzes = quizSequence.length;
        
        waitingDiv.innerHTML = `
            <div class="text-center">
                <i class="fas fa-trophy fa-3x text-success mb-3"></i>
                <h5>🎉 恭喜！您已完成所有题目</h5>
                <p class="text-success font-weight-bold">共完成 ${totalQuizzes} 道题目</p>
                <p class="text-muted">感谢您的参与，请等待演讲继续...</p>
                <div class="mt-3">
                    <button class="btn btn-outline-primary" onclick="loadUserStats()">
                        <i class="fas fa-chart-bar me-2"></i>查看我的成绩
                    </button>
                </div>
            </div>
        `;
    }
}

// 替换题目内容（平滑切换，不关闭弹窗）
function replaceQuizContent(quiz) {
    console.log('=== 平滑切换到新题目 ===');
    console.log('新题目数据:', quiz);
    
    const quizDisplay = document.getElementById('fixedQuizDisplay');
    if (!quizDisplay) {
        // 如果没有现有的题目显示，则创建新的
        displayQuiz(quiz, currentSessionId);
        return;
    }
    
    // 找到题目容器
    const quizContainer = quizDisplay.querySelector('div[style*="background: white"]');
    if (!quizContainer) {
        console.error('找不到题目容器');
        return;
    }
    
    // 停止当前计时器
    if (fixedQuizTimer) {
        clearInterval(fixedQuizTimer);
        fixedQuizTimer = null;
    }
    
    // 设置新题目内容
    currentQuizId = quiz.id;
    timeLeft = quiz.time_limit || 60;
    selectedFixedAnswer = null;
    
    // 查找当前题目在序列中的位置
    let quizNumber = '?';
    let totalQuizzes = quizSequence.length;
    
    const currentIndex = quizSequence.findIndex(q => q.id === quiz.id);
    if (currentIndex !== -1) {
        quizNumber = currentIndex + 1;
        currentQuizIndex = currentIndex;
    }
    
    // 更新题目内容
    quizContainer.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="background: #dc3545; color: white; border-radius: 50%; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: bold; margin: 0 auto 15px;">
                <span id="fixedTimer">${timeLeft}</span>
            </div>
            <h4 style="color: #333; margin-bottom: 10px;">题目 ${quizNumber}/${totalQuizzes}</h4>
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
    
    console.log('题目内容已更新，开始新计时');
    
    // 开始新的计时
    startFixedTimer();
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
    
    // 查找当前题目在序列中的位置
    let quizNumber = '?';
    let totalQuizzes = quizSequence.length;
    
    const currentIndex = quizSequence.findIndex(q => q.id === quiz.id);
    if (currentIndex !== -1) {
        quizNumber = currentIndex + 1;
        currentQuizIndex = currentIndex;
    }
    
    quizContainer.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="background: #dc3545; color: white; border-radius: 50%; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: bold; margin: 0 auto 15px;">
                <span id="fixedTimer">${timeLeft}</span>
            </div>
            <h4 style="color: #333; margin-bottom: 10px;">题目 ${quizNumber}/${totalQuizzes}</h4>
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
    
    // 3秒后直接切换到下一题，不关闭当前题目
    setTimeout(async () => {
        console.log('题目答题完成，准备切换到下一题');
        currentQuizId = null;
        
        // 重新加载题目序列（更新回答状态）
        await loadQuizSequence();
        
        // 找到下一个未回答的题目
        const nextQuiz = findNextUnAnsweredQuiz();
        
        if (nextQuiz) {
            console.log('切换到下一题:', nextQuiz.question);
            // 直接替换当前题目内容，而不是关闭再重新创建
            replaceQuizContent(nextQuiz);
        } else {
            console.log('所有题目已完成');
            closeFixedQuiz();
            showAllQuizzesCompleted();
        }
    }, 3000);
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
    
    // 3秒后自动切换到下一题
    setTimeout(() => {
        console.log('答题结果显示完毕，自动切换到下一题');
        selectedAnswer = null;
        currentQuizId = null;
        
        // 检查下一题
        checkForNewQuiz();
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
        const response = await fetch('/api/session/list');
        if (!response.ok) return;
        const data = await response.json();
        const sessions = data.sessions.filter(s => s.is_participant);
        let totalAnswered = 0, correctAnswered = 0, rank = 0, totalParticipants = 0;
        for (const session of sessions) {
            const statsRes = await fetch(`/api/quiz/user-stats/${session.id}`);
            if (statsRes.ok) {
                const stats = await statsRes.json();
                totalAnswered += stats.total_answered;
                correctAnswered += stats.correct_answered;
                rank = stats.rank; // 使用最后一个会话的排名作为示例
                totalParticipants = stats.total_participants;
            }
        }
        document.getElementById('totalAnswered').textContent = totalAnswered;
        document.getElementById('correctAnswered').textContent = correctAnswered;
        document.getElementById('accuracyRate').textContent = totalAnswered > 0 ? Math.round((correctAnswered / totalAnswered) * 100) + '%' : '0%';
        document.getElementById('userRank').textContent = rank ? `${rank}/${totalParticipants}` : '-';
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

// 页面加载时加载已截止题目列表
async function loadFinishedQuizzes() {
    try {
        const response = await fetch('/api/quiz/finished');  // 假设添加此后端路由获取已截止题目
        const data = await response.json();
        const select = document.getElementById('quizSelect');
        select.innerHTML = '<option value="">选择题目</option>';
        data.quizzes.forEach(quiz => {
            select.innerHTML += `<option value="${quiz.id}">${quiz.question.substring(0, 30)}...</option>`;
        });
    } catch (error) {
        console.error('加载题目失败:', error);
    }
}

// 加载特定题目的讨论
async function loadQuizDiscussion(quizId) {
    if (!quizId) return;
    try {
        const response = await fetch(`/api/quiz/${quizId}/discussions`);
        const data = await response.json();
        const area = document.getElementById('discussionArea');
        area.style.display = 'block';
        area.innerHTML = `
            <h5>题目: ${data.quiz.question}</h5>
            <div class="statistics">
                <p>总回答: ${data.statistics.total_responses}</p>
                <p>选项分布: A:${data.statistics.option_distribution.A} B:${data.statistics.option_distribution.B} C:${data.statistics.option_distribution.C} D:${data.statistics.option_distribution.D}</p>
            </div>
            <div class="comments">
                ${data.discussions.map(d => `<div><small>${d.created_at}</small><p>${d.message}</p></div>`).join('')}
            </div>
            <textarea id="commentInput" placeholder="输入评论"></textarea>
            <button onclick="postComment(${quizId})">发布</button>
        `;
    } catch (error) {
        showMessage('加载失败', 'error');
    }
}

// 发布评论
async function postComment(quizId) {
    const input = document.getElementById('commentInput');
    const message = input.value.trim();
    if (!message) {
        showMessage('评论内容不能为空', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/quiz/${quizId}/discussions`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({message: message})
        });
        const data = await response.json();
        if (response.ok) {
            showMessage('评论发布成功', 'success');
            input.value = '';
            loadQuizDiscussion(quizId); // 刷新讨论区
        } else {
            showMessage(data.error || '发布失败', 'error');
        }
    } catch (error) {
        showMessage('网络错误', 'error');
    }
}

// 在 DOMContentLoaded 中添加事件监听
document.addEventListener('DOMContentLoaded', function() {
    loadFinishedQuizzes();
    // 如果需要，添加答题区初始化
    if (currentSessionId) checkForNewQuiz();
});
