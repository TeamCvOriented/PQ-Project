// 组织者界面的JavaScript功能

let currentUser = null;

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    loadUserInfo();
    loadDashboardData();
    loadSpeakers();
    
    // 导航切换
    document.querySelectorAll('[data-section]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            showSection(this.dataset.section);
            
            // 更新导航状态
            document.querySelectorAll('.nav-link').forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // 统计页面会话选择事件监听器
    const sessionSelect = document.getElementById('sessionSelect');
    if (sessionSelect) {
        sessionSelect.addEventListener('change', function() {
            loadSessionStatistics(this.value);
        });
    }
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
        if (currentUser.role !== 'organizer') {
            alert('权限不足，您不是组织者');
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
        document.getElementById('userInfo').textContent = `${currentUser.nickname || currentUser.username}`;
    }
}

// 显示指定部分
function showSection(sectionId) {
    // 隐藏所有部分
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // 显示目标部分
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // 根据部分加载相应数据
        switch(sectionId) {
            case 'dashboard':
                loadDashboardData();
                break;
            case 'sessions':
                loadSessions();
                break;
            case 'speakers':
                loadSpeakers();
                break;
            case 'statistics':
                loadStatistics();
                break;
        }
    }
}

// 加载仪表板数据
async function loadDashboardData() {
    try {
        const response = await fetch('/api/session/list');
        if (response.ok) {
            const data = await response.json();
            const sessions = data.sessions;
            
            // 更新会话数量
            document.getElementById('totalSessions').textContent = sessions.length;
            
            let totalParticipants = 0;
            let totalQuizzes = 0;
            let totalResponses = 0;
            let totalCorrect = 0;
            
            // 为每个会话获取统计数据
            const statsPromises = sessions.map(async (session) => {
                totalParticipants += session.participant_count || 0;
                
                try {
                    const statsResponse = await fetch(`/api/quiz/statistics/${session.id}`);
                    if (statsResponse.ok) {
                        const statsData = await statsResponse.json();
                        const quizStats = statsData.quiz_statistics || [];
                        
                        totalQuizzes += quizStats.length;
                        
                        quizStats.forEach(quiz => {
                            totalResponses += quiz.total_responses || 0;
                            totalCorrect += quiz.correct_responses || 0;
                        });
                    }
                } catch (error) {
                    console.error(`获取会话 ${session.id} 统计失败:`, error);
                }
            });
            
            // 等待所有统计数据加载完成
            await Promise.all(statsPromises);
            
            // 更新显示
            document.getElementById('totalParticipants').textContent = totalParticipants;
            document.getElementById('totalQuizzes').textContent = totalQuizzes;
            
            // 计算平均正确率
            const avgAccuracy = totalResponses > 0 ? (totalCorrect / totalResponses * 100).toFixed(1) : 0;
            document.getElementById('avgAccuracy').textContent = `${avgAccuracy}%`;
            
            // 显示最近的会话
            displayRecentSessions(sessions.slice(0, 5));
        }
    } catch (error) {
        console.error('加载仪表板数据失败:', error);
        // 设置默认值
        document.getElementById('totalSessions').textContent = '0';
        document.getElementById('totalParticipants').textContent = '0';
        document.getElementById('totalQuizzes').textContent = '0';
        document.getElementById('avgAccuracy').textContent = '0%';
    }
}

// 显示最近的会话
function displayRecentSessions(sessions) {
    const container = document.getElementById('recentSessions');
    
    if (sessions.length === 0) {
        container.innerHTML = '<p class="text-muted">暂无会话数据</p>';
        return;
    }
    
    container.innerHTML = sessions.map(session => `
        <div class="d-flex justify-content-between align-items-center mb-2 p-2 border-bottom">
            <div>
                <strong>${session.title}</strong>
                <small class="text-muted d-block">演讲者: ${session.speaker}</small>
            </div>
            <div class="text-end">
                <span class="badge ${session.is_active ? 'bg-success' : 'bg-secondary'}">
                    ${session.is_active ? '进行中' : '已结束'}
                </span>
                <small class="text-muted d-block">${session.participant_count} 人参与</small>
            </div>
        </div>
    `).join('');
}

// 加载所有会话
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
        container.innerHTML = '<p class="text-muted">暂无会话数据</p>';
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
                            演讲者: ${session.speaker} | 
                            创建时间: ${new Date(session.created_at).toLocaleDateString()} |
                            参与人数: ${session.participant_count}
                        </small>
                    </div>
                    <div class="text-end">
                        <span class="badge ${session.is_active ? 'bg-success' : 'bg-secondary'} mb-2">
                            ${session.is_active ? '进行中' : '已结束'}
                        </span>
                        <div class="btn-group-vertical btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="viewSessionDetails(${session.id})">
                                查看详情
                            </button>
                            <button class="btn btn-outline-${session.is_active ? 'danger' : 'success'}" 
                                    onclick="toggleSessionStatus(${session.id}, ${!session.is_active})">
                                ${session.is_active ? '停用' : '激活'}
                            </button>
                            <button class="btn btn-outline-info" onclick="viewStatistics(${session.id})">
                                查看统计
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// 加载演讲者列表
async function loadSpeakers() {
    try {
        const response = await fetch('/api/session/speakers');
        if (response.ok) {
            const data = await response.json();
            displaySpeakers(data.speakers);
            updateSpeakerSelect(data.speakers);
        } else {
            console.error('加载演讲者失败:', response.status);
        }
    } catch (error) {
        console.error('加载演讲者失败:', error);
    }
}

// 显示演讲者列表
function displaySpeakers(speakers) {
    const container = document.getElementById('speakersList');
    
    if (speakers.length === 0) {
        container.innerHTML = '<p class="text-muted">暂无演讲者数据</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0">可用演讲者 (${speakers.length})</h5>
            </div>
            <div class="card-body">
                <div class="row">
                    ${speakers.map(speaker => `
                        <div class="col-md-6 col-lg-4 mb-3">
                            <div class="card">
                                <div class="card-body text-center">
                                    <i class="fas fa-user-circle fa-3x text-primary mb-3"></i>
                                    <h6 class="card-title">${speaker.nickname || speaker.username}</h6>
                                    <small class="text-muted">${speaker.email}</small>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

// 更新演讲者选择下拉框
function updateSpeakerSelect(speakers) {
    const select = document.getElementById('speakerId');
    select.innerHTML = '<option value="">请选择演讲者</option>';
    
    speakers.forEach(speaker => {
        const option = document.createElement('option');
        option.value = speaker.id;
        option.textContent = `${speaker.nickname || speaker.username} (${speaker.email})`;
        select.appendChild(option);
    });
}

// 创建会话
async function createSession() {
    const title = document.getElementById('sessionTitle').value;
    const description = document.getElementById('sessionDescription').value;
    const speakerId = document.getElementById('speakerId').value;
    
    if (!title || !speakerId) {
        showMessage('请填写所有必填字段', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/session/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title,
                description,
                speaker_id: parseInt(speakerId)
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('会话创建成功', 'success');
            document.getElementById('createSessionForm').reset();
            const modal = bootstrap.Modal.getInstance(document.getElementById('createSessionModal'));
            modal.hide();
            
            // 刷新数据
            loadDashboardData();
            if (document.getElementById('sessions').classList.contains('active')) {
                loadSessions();
            }
        } else {
            showMessage(data.error || '创建失败', 'error');
        }
    } catch (error) {
        showMessage('网络错误，请稍后重试', 'error');
    }
}

// 切换会话状态
async function toggleSessionStatus(sessionId, isActive) {
    try {
        const response = await fetch(`/api/session/${sessionId}/activate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ is_active: isActive })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage(data.message, 'success');
            loadSessions();
            loadDashboardData();
        } else {
            showMessage(data.error || '操作失败', 'error');
        }
    } catch (error) {
        showMessage('网络错误，请稍后重试', 'error');
    }
}

// 查看会话详情
async function viewSessionDetails(sessionId) {
    try {
        const response = await fetch(`/api/session/${sessionId}`);
        if (response.ok) {
            const data = await response.json();
            showSessionDetailsModal(data);
        }
    } catch (error) {
        showMessage('加载会话详情失败', 'error');
    }
}

// 显示会话详情模态框
function showSessionDetailsModal(sessionData) {
    // 这里可以创建一个详情模态框
    alert(`会话详情:\n标题: ${sessionData.title}\n描述: ${sessionData.description}\n演讲者: ${sessionData.speaker.username}\n参与人数: ${sessionData.participant_count}`);
}

// 查看统计信息
async function viewStatistics(sessionId) {
    try {
        const response = await fetch(`/api/quiz/statistics/${sessionId}`);
        if (response.ok) {
            const data = await response.json();
            showStatisticsModal(data);
        }
    } catch (error) {
        showMessage('加载统计信息失败', 'error');
    }
}

// 显示统计信息模态框
function showStatisticsModal(statsData) {
    // 这里可以创建一个统计信息模态框
    let statsText = `会话统计:\n总题目数: ${statsData.total_quizzes}\n\n`;
    
    statsData.quiz_statistics.forEach((quiz, index) => {
        statsText += `题目 ${index + 1}:\n`;
        statsText += `回答人数: ${quiz.total_responses}\n`;
        statsText += `正确率: ${quiz.accuracy_rate.toFixed(1)}%\n\n`;
    });
    
    alert(statsText);
}

// 加载统计分析
async function loadStatistics() {
    try {
        const response = await fetch('/api/session/list');
        if (response.ok) {
            const data = await response.json();
            updateStatsSessionSelect(data.sessions);
        }
    } catch (error) {
        console.error('加载统计失败:', error);
        showMessage('加载会话列表失败', 'error');
    }
}

// 更新统计页面的会话选择下拉框
function updateStatsSessionSelect(sessions) {
    const select = document.getElementById('sessionSelect');
    select.innerHTML = '<option value="">选择会话</option>';
    
    sessions.forEach(session => {
        const option = document.createElement('option');
        option.value = session.id;
        option.textContent = `${session.title} (${session.is_active ? '进行中' : '已结束'})`;
        select.appendChild(option);
    });
}

// 加载会话统计数据
async function loadSessionStatistics(sessionId) {
    if (!sessionId) {
        document.getElementById('statisticsContent').innerHTML = '<div class="text-center text-muted py-5">请选择一个会话查看统计数据</div>';
        return;
    }

    try {
        const response = await fetch(`/api/quiz/statistics/${sessionId}`);
        if (response.ok) {
            const data = await response.json();
            displayStatistics(data);
        } else {
            const errorData = await response.json();
            showMessage(errorData.error || '加载统计数据失败', 'error');
        }
    } catch (error) {
        console.error('加载会话统计失败:', error);
        showMessage('网络错误，请稍后重试', 'error');
    }
}

// 显示统计数据
// 显示统计数据
function displayStatistics(data) {
    const container = document.getElementById('statisticsContent');
    
    if (!data.quiz_statistics || data.quiz_statistics.length === 0) {
        container.innerHTML = '<div class="text-center text-muted py-5">该会话暂无题目统计数据</div>';
        return;
    }

    // 计算总体统计
    const totalQuizzes = data.quiz_statistics.length;
    const totalResponses = data.quiz_statistics.reduce((sum, quiz) => sum + quiz.total_responses, 0);
    const totalCorrect = data.quiz_statistics.reduce((sum, quiz) => sum + quiz.correct_responses, 0);
    const overallAccuracy = totalResponses > 0 ? (totalCorrect / totalResponses * 100).toFixed(1) : 0;

    let html = `
        <!-- 总体统计卡片 -->
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="card bg-primary text-white">
                    <div class="card-body text-center">
                        <i class="fas fa-question-circle fa-2x mb-2"></i>
                        <h4>${totalQuizzes}</h4>
                        <p class="mb-0">总题目数</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-info text-white">
                    <div class="card-body text-center">
                        <i class="fas fa-users fa-2x mb-2"></i>
                        <h4>${totalResponses}</h4>
                        <p class="mb-0">总回答数</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-success text-white">
                    <div class="card-body text-center">
                        <i class="fas fa-check-circle fa-2x mb-2"></i>
                        <h4>${totalCorrect}</h4>
                        <p class="mb-0">正确回答数</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-warning text-white">
                    <div class="card-body text-center">
                        <i class="fas fa-percentage fa-2x mb-2"></i>
                        <h4>${overallAccuracy}%</h4>
                        <p class="mb-0">总体正确率</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- 状态说明 -->
        <div class="alert alert-info mb-4">
            <h6><i class="fas fa-info-circle me-2"></i>状态说明</h6>
            <p class="mb-0">
                <span class="badge bg-success me-2">已激活</span>题目已发送给听众，可以接收答案
                <span class="badge bg-secondary ms-3 me-2">未激活</span>题目已创建但未发送给听众，听众无法看到和回答
            </p>
        </div>

        <!-- 题目详细统计 -->
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0"><i class="fas fa-chart-bar me-2"></i>题目详细统计</h5>
            </div>
            <div class="card-body">
    `;

    data.quiz_statistics.forEach((quiz, index) => {
        const accuracy = quiz.total_responses > 0 ? quiz.accuracy_rate.toFixed(1) : 0;
        const statusBadge = quiz.is_active ? 
            '<span class="badge bg-success"><i class="fas fa-check me-1"></i>已激活</span>' : 
            '<span class="badge bg-secondary"><i class="fas fa-pause me-1"></i>未激活</span>';
        
        // 格式化创建时间
        const createdDate = new Date(quiz.created_at);
        const formattedDate = createdDate.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        // 获取选项内容，处理undefined情况
        const options = {
            'A': quiz.option_a || '选项A内容未设置',
            'B': quiz.option_b || '选项B内容未设置',
            'C': quiz.option_c || '选项C内容未设置',
            'D': quiz.option_d || '选项D内容未设置'
        };

        html += `
            <div class="quiz-stat-item mb-4 border rounded shadow-sm">
                <!-- 题目头部 -->
                <div class="quiz-header bg-light p-3 border-bottom">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <div class="d-flex align-items-center mb-2">
                                <span class="badge bg-primary me-2">题目 ${index + 1}</span>
                                ${statusBadge}
                                <span class="badge bg-info ms-2">ID: ${quiz.id}</span>
                            </div>
                            <h6 class="mb-2 text-dark">${quiz.question}</h6>
                            <div class="d-flex align-items-center text-muted small">
                                <i class="fas fa-clock me-1"></i>
                                <span class="me-3">创建时间: ${formattedDate}</span>
                                <i class="fas fa-stopwatch me-1"></i>
                                <span>时间限制: ${quiz.time_limit || 30}秒</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 题目选项 -->
                <div class="quiz-options p-3 bg-white">
                    <h6 class="mb-3"><i class="fas fa-list me-2"></i>题目选项</h6>
                    <div class="row">
        `;

        ['A', 'B', 'C', 'D'].forEach(option => {
            const isCorrect = quiz.correct_answer === option;
            const count = quiz.option_distribution[option] || 0;
            const percentage = quiz.total_responses > 0 ? (count / quiz.total_responses * 100).toFixed(1) : 0;
            const optionText = options[option];
            const isUndefined = optionText.includes('未设置');
            
            html += `
                <div class="col-md-6 mb-2">
                    <div class="option-card p-3 border rounded ${isCorrect ? 'border-success bg-success bg-opacity-10' : 'border-light'} ${isUndefined ? 'border-warning bg-warning bg-opacity-10' : ''}">
                        <div class="d-flex align-items-start">
                            <div class="option-label me-3">
                                <span class="badge ${isCorrect ? 'bg-success' : isUndefined ? 'bg-warning' : 'bg-secondary'} fs-6">
                                    ${option} ${isCorrect ? '✓' : ''}
                                </span>
                            </div>
                            <div class="flex-grow-1">
                                <div class="option-text mb-2 ${isUndefined ? 'text-warning fst-italic' : ''}">${optionText}</div>
                                <div class="option-stats">
                                    <div class="d-flex justify-content-between align-items-center mb-1">
                                        <small class="text-muted">${count} 人选择 (${percentage}%)</small>
                                        <small class="text-muted">${percentage}%</small>
                                    </div>
                                    <div class="progress" style="height: 6px;">
                                        <div class="progress-bar ${isCorrect ? 'bg-success' : 'bg-secondary'}" 
                                             style="width: ${percentage}%"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
                    </div>
                </div>

                <!-- 统计数据 -->
                <div class="quiz-stats p-3 bg-light border-top">
                    <div class="row text-center">
                        <div class="col-md-3">
                            <div class="stat-item">
                                <div class="h5 mb-1 text-primary">${quiz.total_responses}</div>
                                <small class="text-muted">总回答数</small>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-item">
                                <div class="h5 mb-1 text-success">${quiz.correct_responses}</div>
                                <small class="text-muted">答对人数</small>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-item">
                                <div class="h5 mb-1 text-warning">${accuracy}%</div>
                                <small class="text-muted">正确率</small>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="stat-item">
                                <div class="h5 mb-1 text-info">${quiz.correct_answer}</div>
                                <small class="text-muted">正确答案</small>
                            </div>
                        </div>
                    </div>
                </div>
        `;

        // 如果有解释，显示解释
        if (quiz.explanation && quiz.explanation.trim()) {
            html += `
                <div class="quiz-explanation p-3 border-top bg-info bg-opacity-10">
                    <h6 class="mb-2"><i class="fas fa-lightbulb me-2 text-warning"></i>题目解释</h6>
                    <p class="mb-0 text-dark">${quiz.explanation}</p>
                </div>
            `;
        }

        // 如果题目未激活，显示提示
        if (!quiz.is_active) {
            html += `
                <div class="quiz-inactive-notice p-3 border-top bg-secondary bg-opacity-10">
                    <h6 class="mb-2"><i class="fas fa-exclamation-triangle me-2 text-warning"></i>题目状态</h6>
                    <p class="mb-0 text-muted">此题目尚未激活，听众无法看到和回答。需要演讲者在演讲者界面中发送此题目给听众。</p>
                </div>
            `;
        }

        html += `</div>`;
    });

    html += `
            </div>
        </div>
    `;

    container.innerHTML = html;
}
