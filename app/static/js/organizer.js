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
            
            // 更新统计数据
            document.getElementById('totalSessions').textContent = sessions.length;
            
            let totalParticipants = 0;
            let totalQuizzes = 0;
            sessions.forEach(session => {
                totalParticipants += session.participant_count || 0;
            });
            
            document.getElementById('totalParticipants').textContent = totalParticipants;
            
            // 显示最近的会话
            displayRecentSessions(sessions.slice(0, 5));
        }
    } catch (error) {
        console.error('加载仪表板数据失败:', error);
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
function loadStatistics() {
    const container = document.getElementById('statisticsContent');
    container.innerHTML = '<p class="text-muted">统计分析功能开发中...</p>';
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
    } else {
        toast.classList.add('bg-danger', 'text-white');
    }
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}
