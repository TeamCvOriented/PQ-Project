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
    setupAIFileUpload();
    
    // 会话选择事件
    document.getElementById('quizSessionSelect').addEventListener('change', function() {
        if (this.value) {
            loadQuizzes(this.value);
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
    const selects = ['quizSessionSelect', 'statsSessionSelect'];
    
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
    const selects = ['quizSessionSelect', 'statsSessionSelect'];
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

// AI文件上传功能
let uploadedFile = null;

function setupAIFileUpload() {
    const fileInput = document.getElementById('aiFileInput');
    const uploadArea = document.getElementById('aiUploadArea');
    const fileInfo = document.getElementById('uploadedFileInfo');
    const fileName = document.getElementById('fileName');
    const generateBtn = document.getElementById('aiGenerateBtn');
    
    // 文件选择事件
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            handleAIFileSelect(file);
        }
    });
    
    // 拖拽上传
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.style.backgroundColor = '#e3f2fd';
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadArea.style.backgroundColor = '#f8f9fa';
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.style.backgroundColor = '#f8f9fa';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type === 'application/pdf' || 
                file.name.endsWith('.ppt') || 
                file.name.endsWith('.pptx')) {
                handleAIFileSelect(file);
            } else {
                showMessage('请选择PDF或PPT文件', 'error');
            }
        }
    });
    
    // 点击上传区域触发文件选择
    uploadArea.addEventListener('click', function() {
        fileInput.click();
    });
}

function handleAIFileSelect(file) {
    // 验证文件类型
    const allowedTypes = ['application/pdf', 'application/vnd.ms-powerpoint', 
                         'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
    const allowedExtensions = ['.pdf', '.ppt', '.pptx'];
    
    const isValidType = allowedTypes.includes(file.type) || 
                       allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (!isValidType) {
        showMessage('请选择PDF或PPT文件', 'error');
        return;
    }
    
    // 验证文件大小（限制为50MB）
    if (file.size > 50 * 1024 * 1024) {
        showMessage('文件大小不能超过50MB', 'error');
        return;
    }
    
    uploadedFile = file;
    
    // 显示文件信息
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('uploadedFileInfo').style.display = 'block';
    document.getElementById('aiGenerateBtn').disabled = false;
    
    showMessage('文件上传成功，现在可以生成题目了', 'success');
}

function clearUploadedFile() {
    uploadedFile = null;
    document.getElementById('aiFileInput').value = '';
    document.getElementById('uploadedFileInfo').style.display = 'none';
    document.getElementById('aiGenerateBtn').disabled = true;
}

async function generateAIQuizzes() {
    if (!uploadedFile) {
        showMessage('请先上传文件', 'error');
        return;
    }
    
    const sessionId = document.getElementById('quizSessionSelect').value;
    if (!sessionId) {
        showMessage('请先选择会话', 'error');
        return;
    }
    
    const generateBtn = document.getElementById('aiGenerateBtn');
    const originalText = generateBtn.innerHTML;
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>AI正在生成题目...';
    
    try {
        const formData = new FormData();
        formData.append('file', uploadedFile);
        formData.append('num_questions', '5'); // 生成5道题目
        
        const response = await fetch('/api/quiz/upload', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                showMessage(`成功生成${result.questions.length}道题目`, 'success');
                
                // 显示生成的题目
                displayGeneratedQuizzes(result.questions, sessionId);
                
                // 清除上传的文件
                clearUploadedFile();
            } else {
                showMessage(result.message || 'AI生成题目失败', 'error');
            }
        } else {
            const error = await response.json();
            showMessage(error.message || 'AI生成题目失败', 'error');
        }
    } catch (error) {
        console.error('生成题目错误:', error);
        showMessage('网络错误，请重试', 'error');
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = originalText;
    }
}

// 显示生成的题目
function displayGeneratedQuizzes(questions, sessionId) {
    const container = document.getElementById('quizzesList');
    
    if (questions.length === 0) {
        container.innerHTML = '<p class="text-muted">暂无题目</p>';
        return;
    }
    
    // 将题目数据存储在全局变量中
    window.currentGeneratedQuizzes = questions;
    window.currentSessionId = sessionId;
    
    container.innerHTML = `
        <div class="alert alert-success">
            <h5><i class="fas fa-check-circle me-2"></i>成功生成 ${questions.length} 道题目</h5>
            <p class="mb-0">请预览题目，然后选择发送给听众</p>
        </div>
        
        ${questions.map((quiz, index) => `
            <div class="card quiz-card mb-3" data-quiz-index="${index}">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h6 class="mb-0">题目 ${index + 1}</h6>
                    <div>
                        <button class="btn btn-primary btn-sm me-2" onclick="sendSingleQuizToAudience(${index})">
                            <i class="fas fa-paper-plane me-1"></i>发送给听众
                        </button>
                        <button class="btn btn-outline-info btn-sm" onclick="previewQuiz(${index})">
                            <i class="fas fa-eye me-1"></i>预览
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <h6 class="mb-3">${quiz.question}</h6>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="option-item mb-2">
                                <span class="option-badge bg-primary">A</span>
                                ${quiz.option_a}
                            </div>
                            <div class="option-item mb-2">
                                <span class="option-badge bg-secondary">B</span>
                                ${quiz.option_b}
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="option-item mb-2">
                                <span class="option-badge bg-info">C</span>
                                ${quiz.option_c}
                            </div>
                            <div class="option-item mb-2">
                                <span class="option-badge bg-warning">D</span>
                                ${quiz.option_d}
                            </div>
                        </div>
                    </div>
                    <div class="mt-3">
                        <strong>正确答案：</strong>
                        <span class="badge bg-success">${quiz.correct_answer}</span>
                        <div class="mt-2">
                            <strong>解释：</strong>${quiz.explanation}
                        </div>
                    </div>
                </div>
            </div>
        `).join('')}
        
        <div class="text-center mt-4">
            <button class="btn btn-success btn-lg" id="sendAllQuizzesBtn" onclick="sendAllQuizzesToAudienceWrapper()">
                <i class="fas fa-broadcast-tower me-2"></i>发送所有题目给听众
            </button>
        </div>
    `;
}

// 发送单个题目给听众的wrapper函数
async function sendSingleQuizToAudience(quizIndex) {
    if (!window.currentGeneratedQuizzes || !window.currentSessionId) {
        showMessage('数据丢失，请重新生成题目', 'error');
        return;
    }
    
    const quizData = window.currentGeneratedQuizzes[quizIndex];
    const sessionId = window.currentSessionId;
    
    await sendQuizToAudience(quizIndex, sessionId, quizData);
}

// 发送所有题目给听众的wrapper函数
async function sendAllQuizzesToAudienceWrapper() {
    if (!window.currentGeneratedQuizzes || !window.currentSessionId) {
        showMessage('数据丢失，请重新生成题目', 'error');
        return;
    }
    
    await sendAllQuizzesToAudience(window.currentSessionId, window.currentGeneratedQuizzes);
}

// 发送单个题目给听众
async function sendQuizToAudience(quizIndex, sessionId, quizData) {
    try {
        const response = await fetch('/api/quiz/send-to-audience', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session_id: sessionId,
                quiz: quizData,
                quiz_index: quizIndex
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            showMessage(`题目 ${quizIndex + 1} 已发送给听众`, 'success');
            
            // 更新题目卡片状态
            const quizCard = document.querySelector(`[data-quiz-index="${quizIndex}"]`);
            if (quizCard) {
                quizCard.classList.add('quiz-active');
                const sendBtn = quizCard.querySelector('button[onclick*="sendSingleQuizToAudience"]');
                if (sendBtn) {
                    sendBtn.innerHTML = '<i class="fas fa-check me-1"></i>已发送';
                    sendBtn.disabled = true;
                    sendBtn.classList.remove('btn-primary');
                    sendBtn.classList.add('btn-success');
                }
            }
        } else {
            const error = await response.json();
            showMessage(error.message || '发送失败', 'error');
        }
    } catch (error) {
        console.error('发送题目错误:', error);
        showMessage('网络错误，请重试', 'error');
    }
}

// 发送所有题目给听众
async function sendAllQuizzesToAudience(sessionId, questions) {
    console.log('开始发送所有题目:', { sessionId, questionsCount: questions.length });
    
    try {
        showMessage('正在发送所有题目...', 'info');
        
        const response = await fetch('/api/quiz/send-all-to-audience', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session_id: sessionId,
                questions: questions
            })
        });
        
        console.log('发送响应状态:', response.status);
        
        const result = await response.json();
        console.log('发送响应数据:', result);
        
        if (response.ok && result.success) {
            showMessage(`成功发送 ${questions.length} 道题目给听众！第一道题目已激活`, 'success');
            
            // 更新所有题目卡片状态
            document.querySelectorAll('.quiz-card').forEach((card, index) => {
                card.classList.add('quiz-active');
                const sendBtn = card.querySelector('button[onclick*="sendSingleQuizToAudience"]');
                if (sendBtn) {
                    sendBtn.innerHTML = '<i class="fas fa-check me-1"></i>已发送';
                    sendBtn.disabled = true;
                    sendBtn.classList.remove('btn-primary');
                    sendBtn.classList.add('btn-success');
                }
            });
            
            // 更新批量发送按钮
            const sendAllBtn = document.getElementById('sendAllQuizzesBtn');
            if (sendAllBtn) {
                sendAllBtn.innerHTML = '<i class="fas fa-check me-2"></i>已发送所有题目';
                sendAllBtn.disabled = true;
                sendAllBtn.classList.remove('btn-success');
                sendAllBtn.classList.add('btn-secondary');
            }
            
        } else {
            const errorMessage = result.message || '发送失败';
            console.error('发送失败:', errorMessage);
            showMessage(errorMessage, 'error');
        }
    } catch (error) {
        console.error('发送题目错误:', error);
        showMessage('网络错误，请重试', 'error');
    }
}

// 预览题目
function previewQuiz(quizIndex) {
    const quizCard = document.querySelector(`[data-quiz-index="${quizIndex}"]`);
    if (quizCard) {
        quizCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        quizCard.style.transform = 'scale(1.02)';
        setTimeout(() => {
            quizCard.style.transform = 'scale(1)';
        }, 300);
    }
}
