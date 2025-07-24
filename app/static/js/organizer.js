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
    
    // 统计页面会话选择事件监听器 - 仅重置显示，不自动加载数据
    document.addEventListener('change', function(e) {
        if (e.target && e.target.id === 'sessionSelect') {
            const sessionId = e.target.value;
            const container = document.getElementById('analyticsContent');
            if (container) {
                if (sessionId) {
                    // 选择了会话，显示提示用户点击按钮
                    container.innerHTML = `
                        <div class="text-center text-muted py-5">
                            <i class="fas fa-chart-bar fa-3x mb-3"></i>
                            <p>已选择会话，请点击"查看统计"按钮来查看详细分析</p>
                        </div>
                    `;
                } else {
                    // 未选择会话，显示默认提示
                    container.innerHTML = `
                        <div class="text-center text-muted py-5">
                            <i class="fas fa-chart-bar fa-3x mb-3"></i>
                            <p>请选择一个会话查看详细的统计分析</p>
                        </div>
                    `;
                }
            }
        }
    });
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
            case 'analytics':
                loadAnalytics();
                break;
        }
    }
}

// 加载仪表板数据
async function loadDashboardData() {
    try {
        // 并行加载会话数据和演讲者数据
        const [sessionResponse, speakersResponse] = await Promise.all([
            fetch('/api/session/list'),
            fetch('/api/session/speakers')
        ]);
        
        if (sessionResponse.ok) {
            const data = await sessionResponse.json();
            const sessions = data.sessions;
            
            // 更新会话数量
            document.getElementById('totalSessions').textContent = sessions.length;
            
            let totalParticipants = 0;
            let totalQuizzes = 0;
            
            // 为每个会话获取统计数据
            const statsPromises = sessions.map(async (session) => {
                totalParticipants += session.participant_count || 0;
                
                try {
                    const statsResponse = await fetch(`/api/quiz/statistics/${session.id}`);
                    if (statsResponse.ok) {
                        const statsData = await statsResponse.json();
                        const quizStats = statsData.quiz_statistics || [];
                        
                        totalQuizzes += quizStats.length;
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
            
            // 显示最近的会话
            displayRecentActivities(sessions);
        }
        
        // 更新演讲者数量
        if (speakersResponse.ok) {
            const speakersData = await speakersResponse.json();
            document.getElementById('totalSpeakers').textContent = speakersData.speakers.length;
        }
        
    } catch (error) {
        console.error('加载仪表板数据失败:', error);
        // 设置默认值
        document.getElementById('totalSessions').textContent = '0';
        document.getElementById('totalSpeakers').textContent = '0';
        document.getElementById('totalParticipants').textContent = '0';
        document.getElementById('totalQuizzes').textContent = '0';
    }
}

// 显示最近的活动
function displayRecentActivities(sessions) {
    const container = document.getElementById('recentActivities');
    
    if (sessions.length === 0) {
        container.innerHTML = '<p class="text-muted">暂无会话数据</p>';
        return;
    }
    
    // 按创建时间排序，显示最新的5个会话
    const sortedSessions = sessions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const recentSessions = sortedSessions.slice(0, 5);
    
    container.innerHTML = recentSessions.map(session => {
        const createdDate = new Date(session.created_at);
        const formattedDate = createdDate.toLocaleDateString('zh-CN', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        return `
            <div class="d-flex justify-content-between align-items-center mb-3 p-3 border-bottom">
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center mb-2">
                        <strong class="text-primary">${session.title}</strong>
                        <span class="badge ${session.is_active ? 'bg-success' : 'bg-secondary'} ms-2">
                            ${session.is_active ? '进行中' : '已结束'}
                        </span>
                    </div>
                    <div class="text-muted small">
                        <i class="fas fa-user me-1"></i>演讲者: ${session.speaker} | 
                        <i class="fas fa-users me-1"></i>${session.participant_count || 0} 人参与 |
                        <i class="fas fa-clock me-1"></i>${formattedDate}
                    </div>
                </div>
                <div class="text-end">
                    <button class="btn btn-sm btn-outline-primary" onclick="viewSessionDetails(${session.id})">
                        <i class="fas fa-eye me-1"></i>查看
                    </button>
                </div>
            </div>
        `;
    }).join('');
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
        <div class="card session-card mb-3" data-session-id="${session.id}">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h5 class="card-title">${session.title}</h5>
                        <p class="card-text text-muted">${session.description || '暂无描述'}</p>
                        <small class="text-muted">
                            演讲者: ${session.speaker} | 
                            创建时间: ${new Date(session.created_at).toLocaleDateString()} |
                            参与人数: ${session.participant_count} |
                            邀请码: <span class="badge bg-info">${session.invite_code}</span>
                        </small>
                    </div>
                    <div class="text-end">
                        <span class="badge ${session.is_active ? 'bg-success' : 'bg-secondary'} mb-2 session-status-badge">
                            ${session.is_active ? '进行中' : '已结束'}
                        </span>
                        <div class="btn-group-vertical btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="viewSessionDetails(${session.id})">
                                查看详细
                            </button>
                            <button class="btn btn-outline-${session.is_active ? 'danger' : 'success'} session-toggle-btn" 
                                    onclick="toggleSessionStatus(${session.id}, ${!session.is_active})">
                                ${session.is_active ? '停用' : '激活'}
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
    const select = document.getElementById('sessionSpeaker');
    if (!select) return; // 如果元素不存在则退出
    
    select.innerHTML = '<option value="">选择演讲者</option>';
    
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
    const speakerId = document.getElementById('sessionSpeaker').value;
    
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
    console.log(`切换会话状态: sessionId=${sessionId}, isActive=${isActive}`);
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
            console.log('状态切换成功，开始更新UI');
            showMessage(data.message, 'success');
            
            // 立即更新页面上的会话状态显示
            updateSessionStatusInUI(sessionId, isActive);
            
            // 立即更新模态框中的状态显示（如果模态框正在显示）
            updateModalStatusDisplay(sessionId, isActive);
            
            // 只刷新仪表板统计数据，不重新加载会话列表
            updateDashboardStats();
        } else {
            showMessage(data.error || '操作失败', 'error');
        }
    } catch (error) {
        console.error('切换状态失败:', error);
        showMessage('网络错误，请稍后重试', 'error');
    }
}

// 只更新仪表板统计数据，不重新加载会话列表
async function updateDashboardStats() {
    try {
        const response = await fetch('/api/session/list');
        if (response.ok) {
            const data = await response.json();
            const sessions = data.sessions;
            
            // 更新会话数量
            document.getElementById('totalSessions').textContent = sessions.length;
            
            let totalParticipants = 0;
            sessions.forEach(session => {
                totalParticipants += session.participant_count || 0;
            });
            
            // 更新参与者数量
            document.getElementById('totalParticipants').textContent = totalParticipants;
        }
    } catch (error) {
        console.error('更新仪表板统计失败:', error);
    }
}

// 立即更新UI中的会话状态
function updateSessionStatusInUI(sessionId, isActive) {
    console.log(`更新UI状态: sessionId=${sessionId}, isActive=${isActive}`);
    // 查找对应的会话卡片
    const sessionCard = document.querySelector(`[data-session-id="${sessionId}"]`);
    
    if (sessionCard) {
        console.log('找到会话卡片，开始更新');
        // 更新状态徽章
        const statusBadge = sessionCard.querySelector('.session-status-badge');
        if (statusBadge) {
            console.log(`更新状态徽章: ${isActive ? '进行中' : '已结束'}`);
            statusBadge.className = `badge ${isActive ? 'bg-success' : 'bg-secondary'} mb-2 session-status-badge`;
            statusBadge.textContent = isActive ? '进行中' : '已结束';
        } else {
            console.log('未找到状态徽章');
        }
        
        // 更新操作按钮
        const actionButton = sessionCard.querySelector('.session-toggle-btn');
        if (actionButton) {
            console.log(`更新操作按钮: ${isActive ? '停用' : '激活'}`);
            actionButton.className = `btn btn-outline-${isActive ? 'danger' : 'success'} session-toggle-btn`;
            actionButton.textContent = isActive ? '停用' : '激活';
            actionButton.setAttribute('onclick', `toggleSessionStatus(${sessionId}, ${!isActive})`);
        } else {
            console.log('未找到操作按钮');
        }
    } else {
        console.log(`未找到sessionId为${sessionId}的会话卡片`);
    }
}

// 更新模态框中的状态显示
function updateModalStatusDisplay(sessionId, isActive) {
    const modal = document.getElementById('sessionDetailsModal');
    if (modal) {
        // 更新模态框中的状态徽章
        const statusBadge = modal.querySelector('.badge');
        if (statusBadge) {
            statusBadge.className = `badge ${isActive ? 'bg-success' : 'bg-secondary'}`;
            statusBadge.textContent = isActive ? '进行中' : '已结束';
        }
        
        // 更新模态框中的操作按钮
        const actionButton = modal.querySelector(`button[onclick*="toggleSessionStatus(${sessionId}"]`);
        if (actionButton) {
            actionButton.className = `btn btn-${isActive ? 'danger' : 'success'}`;
            actionButton.textContent = isActive ? '停用会话' : '激活会话';
            actionButton.setAttribute('onclick', `toggleSessionStatus(${sessionId}, ${!isActive})`);
        }
    }
}

// 查看会话详情
async function viewSessionDetails(sessionId) {
    try {
        const response = await fetch(`/api/session/${sessionId}`);
        if (response.ok) {
            const data = await response.json();
            showSessionDetailsModal(data);
        } else {
            showMessage('加载会话详情失败', 'error');
        }
    } catch (error) {
        showMessage('加载会话详情失败', 'error');
    }
}

// 显示会话详情模态框
// 显示会话详情模态框
function showSessionDetailsModal(sessionData) {
    // 创建详细的会话信息显示
    const modalHtml = `
        <div class="modal fade" id="sessionDetailsModal" tabindex="-1" aria-labelledby="sessionDetailsModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="sessionDetailsModalLabel">
                            <i class="fas fa-info-circle me-2"></i>会话详细信息
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <!-- 基本信息 -->
                        <div class="card mb-3">
                            <div class="card-header">
                                <h6 class="mb-0"><i class="fas fa-clipboard-list me-2"></i>基本信息</h6>
                            </div>
                            <div class="card-body">
                                <div class="row">
                                    <div class="col-md-6">
                                        <p><strong>会话标题:</strong> ${sessionData.title}</p>
                                        <p><strong>会话描述:</strong> ${sessionData.description || '暂无描述'}</p>
                                        <p><strong>会话状态:</strong> 
                                            <span class="badge ${sessionData.is_active ? 'bg-success' : 'bg-secondary'}">
                                                ${sessionData.is_active ? '进行中' : '已结束'}
                                            </span>
                                        </p>
                                    </div>
                                    <div class="col-md-6">
                                        <p><strong>邀请码:</strong> 
                                            <span class="badge bg-primary fs-5">${sessionData.invite_code}</span>
                                            <button class="btn btn-sm btn-outline-secondary ms-2" onclick="copyInviteCode('${sessionData.invite_code}')" title="复制邀请码">
                                                <i class="fas fa-copy"></i>
                                            </button>
                                        </p>
                                        <p><strong>创建时间:</strong> ${new Date(sessionData.created_at).toLocaleString('zh-CN')}</p>
                                        <p><strong>演讲者:</strong> ${sessionData.speaker.nickname || sessionData.speaker.username}</p>
                                        <p><strong>组织者:</strong> ${sessionData.organizer.username}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 参与者信息 -->
                        <div class="card">
                            <div class="card-header">
                                <h6 class="mb-0"><i class="fas fa-users me-2"></i>参与者信息 (${sessionData.participants.length}人)</h6>
                            </div>
                            <div class="card-body">
                                ${sessionData.participants.length > 0 ? `
                                    <div class="row">
                                        ${sessionData.participants.map(participant => `
                                            <div class="col-md-6 col-lg-4 mb-2">
                                                <div class="d-flex align-items-center">
                                                    <i class="fas fa-user-circle text-primary me-2"></i>
                                                    <div>
                                                        <small class="fw-bold">${participant.nickname || participant.username}</small><br>
                                                        <small class="text-muted">加入时间: ${new Date(participant.joined_at).toLocaleString('zh-CN')}</small>
                                                    </div>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : '<p class="text-muted">暂无参与者</p>'}
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                        ${sessionData.is_active ? 
                            `<button type="button" class="btn btn-danger" onclick="toggleSessionStatus(${sessionData.id}, false)">停用会话</button>` :
                            `<button type="button" class="btn btn-success" onclick="toggleSessionStatus(${sessionData.id}, true)">激活会话</button>`
                        }
                    </div>
                </div>
            </div>
        </div>
    `;

    // 移除已存在的模态框
    const existingModal = document.getElementById('sessionDetailsModal');
    if (existingModal) {
        existingModal.remove();
    }

    // 添加新的模态框到页面
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // 显示模态框
    const modal = new bootstrap.Modal(document.getElementById('sessionDetailsModal'));
    modal.show();

    // 模态框关闭后清理DOM
    document.getElementById('sessionDetailsModal').addEventListener('hidden.bs.modal', function () {
        this.remove();
    });
}

// 移除以下函数，因为不再需要查看统计按钮
/*
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
*/

// 加载统计分析
async function loadAnalytics() {
    try {
        const response = await fetch('/api/session/list');
        if (response.ok) {
            const data = await response.json();
            updateAnalyticsSessionSelect(data.sessions);
        }
    } catch (error) {
        console.error('加载统计失败:', error);
        showMessage('加载会话列表失败', 'error');
    }
}

// 更新统计页面的会话选择下拉框
function updateAnalyticsSessionSelect(sessions) {
    const select = document.getElementById('sessionSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">请选择会话</option>';
    
    sessions.forEach(session => {
        const option = document.createElement('option');
        option.value = session.id;
        option.textContent = `${session.title} (${session.is_active ? '进行中' : '已结束'})`;
        select.appendChild(option);
    });
}

// 加载选中会话的统计数据
async function loadSelectedSessionStats() {
    const sessionSelect = document.getElementById('sessionSelect');
    const sessionId = sessionSelect.value;
    
    if (!sessionId) {
        showMessage('请先选择一个会话', 'warning');
        return;
    }
    
    await loadSessionStatistics(sessionId);
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
function displayStatistics(data) {
    const container = document.getElementById('analyticsContent');
    
    if (!data.quiz_statistics || data.quiz_statistics.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="fas fa-chart-bar fa-3x mb-3"></i>
                <h5>该会话暂无题目统计数据</h5>
                <p>请确保该会话已经创建了题目并有用户参与答题</p>
            </div>
        `;
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

        <!-- 题目详细统计 -->
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0"><i class="fas fa-chart-bar me-2"></i>题目详细统计</h5>
            </div>
            <div class="card-body">
    `;

    data.quiz_statistics.forEach((quiz, index) => {
        const accuracy = quiz.total_responses > 0 ? quiz.accuracy_rate.toFixed(1) : 0;
        
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
            </div>
        `;
    });

    html += `
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// 通用消息提示函数
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

// 复制邀请码功能
function copyInviteCode(inviteCode) {
    // 使用现代浏览器的 Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(inviteCode).then(() => {
            showMessage('邀请码已复制到剪贴板', 'success');
        }).catch(() => {
            fallbackCopyTextToClipboard(inviteCode);
        });
    } else {
        // 降级处理
        fallbackCopyTextToClipboard(inviteCode);
    }
}

// 降级复制功能
function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showMessage('邀请码已复制到剪贴板', 'success');
        } else {
            showMessage('复制失败，请手动复制邀请码', 'error');
        }
    } catch (err) {
        showMessage('复制失败，请手动复制邀请码', 'error');
    }
    
    document.body.removeChild(textArea);
}

// 退出登录
async function logout() {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST'
        });
        
        if (response.ok) {
            showMessage('已成功退出', 'success');
            setTimeout(() => {
                window.location.href = '/login';
            }, 1000);
        } else {
            showMessage('退出失败', 'error');
        }
    } catch (error) {
        console.error('退出失败:', error);
        // 即使请求失败，也跳转到登录页面
        window.location.href = '/login';
    }
}
