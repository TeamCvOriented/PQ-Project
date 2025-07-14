// 演讲者界面的JavaScript功能

let currentUser = null;
let currentSessionId = null;

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    checkAuthentication();
    loadUserInfo();
    loadSessions();
    
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
    
    // 文件上传相关事件
    setupFileUpload();
    
    // 会话选择事件
    document.getElementById('sessionSelect').addEventListener('change', function() {
        currentSessionId = this.value;
        if (currentSessionId) {
            loadSessionContent(currentSessionId);
        }
    });
    
    document.getElementById('quizSessionSelect').addEventListener('change', function() {
        if (this.value) {
            loadQuizzes(this.value);
        }
    });
    
    document.getElementById('controlSessionSelect').addEventListener('change', function() {
        if (this.value) {
            setupControlPanel(this.value);
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
        if (currentUser.role !== 'speaker') {
            alert('权限不足，您不是演讲者');
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
            case 'sessions':
                loadSessions();
                break;
            case 'upload':
                loadSessions(); // 为上传页面加载会话选项
                break;
            case 'quizzes':
                loadSessions(); // 为题目管理加载会话选项
                break;
            case 'control':
                loadSessions(); // 为控制面板加载会话选项
                break;
            case 'statistics':
                loadSessions(); // 为统计页面加载会话选项
                break;
        }
    }
}

// 加载演讲者的会话
async function loadSessions() {
    try {
        const response = await fetch('/api/session/list');
        if (response.ok) {
            const data = await response.json();
            displaySessions(data.sessions);
            updateSessionSelects(data.sessions);
        }
    } catch (error) {
        console.error('加载会话失败:', error);
    }
}

// 显示会话列表
function displaySessions(sessions) {
    const container = document.getElementById('sessionsList');
    
    if (sessions.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">暂无分配的会话</p>';
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
                            组织者: ${session.organizer} | 
                            参与人数: ${session.participant_count} |
                            创建时间: ${new Date(session.created_at).toLocaleDateString()}
                        </small>
                    </div>
                    <div class="text-end">
                        <span class="badge ${session.is_active ? 'bg-success' : 'bg-secondary'} mb-2">
                            ${session.is_active ? '进行中' : '未开始'}
                        </span>
                        <div class="btn-group-vertical btn-group-sm">
                            <button class="btn btn-outline-success" onclick="selectSession(${session.id})">
                                选择此会话
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// 更新会话选择下拉框
function updateSessionSelects(sessions) {
    const selects = ['sessionSelect', 'quizSessionSelect', 'controlSessionSelect', 'statsSessionSelect'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">请选择会话</option>';
            sessions.forEach(session => {
                const option = document.createElement('option');
                option.value = session.id;
                option.textContent = session.title;
                select.appendChild(option);
            });
        }
    });
}

// 选择会话
function selectSession(sessionId) {
    currentSessionId = sessionId;
    
    // 更新所有下拉框的选中状态
    const selects = ['sessionSelect', 'quizSessionSelect', 'controlSessionSelect', 'statsSessionSelect'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.value = sessionId;
        }
    });
    
    showMessage('会话选择成功', 'success');
}

// 设置文件上传
function setupFileUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    // 拖拽上传
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });
    
    // 点击上传
    uploadArea.addEventListener('click', function() {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });
}

// 处理文件上传
async function handleFileUpload(file) {
    if (!currentSessionId) {
        showMessage('请先选择会话', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('session_id', currentSessionId);
    
    try {
        showMessage('正在上传文件...', 'info');
        
        const response = await fetch('/api/content/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('文件上传成功', 'success');
            loadSessionContent(currentSessionId);
        } else {
            showMessage(data.error || '上传失败', 'error');
        }
    } catch (error) {
        showMessage('网络错误，请稍后重试', 'error');
    }
}

// 上传文本内容
async function uploadText() {
    const textContent = document.getElementById('textContent').value;
    
    if (!textContent.trim()) {
        showMessage('请输入文本内容', 'error');
        return;
    }
    
    if (!currentSessionId) {
        showMessage('请先选择会话', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/content/text', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: textContent,
                session_id: currentSessionId
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('文本保存成功', 'success');
            document.getElementById('textContent').value = '';
            loadSessionContent(currentSessionId);
        } else {
            showMessage(data.error || '保存失败', 'error');
        }
    } catch (error) {
        showMessage('网络错误，请稍后重试', 'error');
    }
}

// 加载会话内容
async function loadSessionContent(sessionId) {
    try {
        const response = await fetch(`/api/content/session/${sessionId}`);
        if (response.ok) {
            const data = await response.json();
            displayUploadedContent(data.contents);
        }
    } catch (error) {
        console.error('加载会话内容失败:', error);
    }
}

// 显示已上传的内容
function displayUploadedContent(contents) {
    const container = document.getElementById('uploadedContent');
    
    if (contents.length === 0) {
        container.innerHTML = '<p class="text-muted">暂无上传内容</p>';
        return;
    }
    
    container.innerHTML = contents.map(content => `
        <div class="card mb-2">
            <div class="card-body d-flex justify-content-between align-items-center">
                <div>
                    <strong>${content.original_filename}</strong>
                    <small class="text-muted d-block">
                        类型: ${content.content_type} | 
                        文本长度: ${content.text_length} |
                        上传时间: ${new Date(content.upload_time).toLocaleString()}
                    </small>
                </div>
                <button class="btn btn-outline-danger btn-sm" onclick="deleteContent(${content.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// 生成题目
async function generateQuizzes() {
    const sessionId = document.getElementById('quizSessionSelect').value;
    
    if (!sessionId) {
        showMessage('请先选择会话', 'error');
        return;
    }
    
    try {
        showMessage('AI正在生成题目，请稍候...', 'info');
        
        const response = await fetch('/api/quiz/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session_id: sessionId,
                num_questions: 3
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage(data.message, 'success');
            loadQuizzes(sessionId);
        } else {
            showMessage(data.error || '生成题目失败', 'error');
        }
    } catch (error) {
        showMessage('网络错误，请稍后重试', 'error');
    }
}

// 加载题目列表
async function loadQuizzes(sessionId) {
    // 这里应该调用获取题目的API
    showMessage('题目功能开发中...', 'info');
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
    } else if (type === 'info') {
        toast.classList.add('bg-info', 'text-white');
    } else {
        toast.classList.add('bg-danger', 'text-white');
    }
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}
