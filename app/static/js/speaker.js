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
        const sessionId = this.value;
        if (sessionId) {
            currentSessionId = sessionId;
            // 移除提示信息，只更新当前会话ID
        } else {
            currentSessionId = null;
        }
    });
    
    // 统计页面会话选择事件
    document.getElementById('statsSessionSelect').addEventListener('change', function() {
        if (this.value) {
            loadSessionStatistics(this.value);
        } else {
            const container = document.getElementById('statisticsContent');
            container.innerHTML = '<p class="text-muted text-center">请选择会话查看统计数据</p>';
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
                            创建时间: ${new Date(session.created_at).toLocaleDateString()} |
                            邀请码: <span class="badge bg-info">${session.invite_code}</span>
                        </small>
                    </div>
                    <div class="text-end">
                        <span class="badge ${session.is_active ? 'bg-success' : 'bg-secondary'} mb-2">
                            ${session.is_active ? '进行中' : '未开始'}
                        </span>
                        <div class="btn-group-vertical btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="viewSessionDetails(${session.id})">
                                查看详细
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
let uploadedFiles = []; // 改为数组以支持多文件

function setupAIFileUpload() {
    const fileInput = document.getElementById('aiFileInput');
    const uploadArea = document.getElementById('aiUploadArea');
    const filesInfo = document.getElementById('uploadedFilesInfo');
    const filesList = document.getElementById('filesList');
    const generateBtn = document.getElementById('aiGenerateBtn');
    
    // 文件选择事件 - 支持多文件
    fileInput.addEventListener('change', function(e) {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            handleMultipleFileSelect(files);
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
        
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            // 过滤出支持的文件类型
            const validFiles = files.filter(file => {
                return file.type === 'application/pdf' || 
                       file.name.endsWith('.ppt') || 
                       file.name.endsWith('.pptx');
            });
            
            if (validFiles.length > 0) {
                handleMultipleFileSelect(validFiles);
                if (validFiles.length < files.length) {
                    showMessage(`已选择${validFiles.length}个有效文件，${files.length - validFiles.length}个文件格式不支持`, 'warning');
                }
            } else {
                showMessage('请选择PDF或PPT文件', 'error');
            }
        }
    });
}

function handleMultipleFileSelect(files) {
    // 验证文件类型和大小
    const allowedTypes = ['application/pdf', 'application/vnd.ms-powerpoint', 
                         'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
    const allowedExtensions = ['.pdf', '.ppt', '.pptx'];
    
    const validFiles = [];
    const invalidFiles = [];
    
    files.forEach(file => {
        const isValidType = allowedTypes.includes(file.type) || 
                           allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
        
        if (!isValidType) {
            invalidFiles.push(file.name + ' (格式不支持)');
            return;
        }
        
        // 验证文件大小（限制为50MB）
        if (file.size > 50 * 1024 * 1024) {
            invalidFiles.push(file.name + ' (文件太大)');
            return;
        }
        
        // 检查是否已经添加过这个文件
        const isDuplicate = uploadedFiles.some(f => f.name === file.name && f.size === file.size);
        if (isDuplicate) {
            invalidFiles.push(file.name + ' (文件已存在)');
            return;
        }
        
        validFiles.push(file);
    });
    
    // 添加有效文件到列表
    uploadedFiles.push(...validFiles);
    
    // 更新显示
    updateFilesDisplay();
    
    // 显示结果消息
    if (validFiles.length > 0) {
        let message = `成功添加${validFiles.length}个文件`;
        if (invalidFiles.length > 0) {
            message += `，${invalidFiles.length}个文件无效：${invalidFiles.join(', ')}`;
        }
        showMessage(message, validFiles.length > 0 ? 'success' : 'warning');
    } else if (invalidFiles.length > 0) {
        showMessage(`文件无效：${invalidFiles.join(', ')}`, 'error');
    }
}

function updateFilesDisplay() {
    const filesInfo = document.getElementById('uploadedFilesInfo');
    const filesList = document.getElementById('filesList');
    const generateBtn = document.getElementById('aiGenerateBtn');
    
    if (uploadedFiles.length === 0) {
        filesInfo.style.display = 'none';
        generateBtn.disabled = true;
        return;
    }
    
    filesInfo.style.display = 'block';
    generateBtn.disabled = false;
    
    // 生成文件列表HTML
    filesList.innerHTML = uploadedFiles.map((file, index) => `
        <div class="d-flex align-items-center justify-content-between p-2 border rounded mb-2" data-file-index="${index}">
            <div class="d-flex align-items-center">
                <i class="fas fa-file-${getFileIcon(file.name)} text-primary me-2"></i>
                <div>
                    <div class="fw-bold">${file.name}</div>
                    <small class="text-muted">${formatFileSize(file.size)}</small>
                </div>
            </div>
            <button class="btn btn-sm btn-outline-danger" onclick="removeFile(${index})" title="移除文件">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

function getFileIcon(filename) {
    const ext = filename.toLowerCase().split('.').pop();
    switch(ext) {
        case 'pdf': return 'pdf';
        case 'ppt':
        case 'pptx': return 'powerpoint';
        default: return 'alt';
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function removeFile(index) {
    uploadedFiles.splice(index, 1);
    updateFilesDisplay();
    showMessage('文件已移除', 'info');
}

function clearAllUploadedFiles() {
    uploadedFiles = [];
    document.getElementById('aiFileInput').value = '';
    updateFilesDisplay();
    showMessage('所有文件已清空', 'info');
}

async function generateAIQuizzes() {
    if (!uploadedFiles || uploadedFiles.length === 0) {
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
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>AI正在分析多个文件并生成题目...';
    
    try {
        const formData = new FormData();
        
        // 添加所有文件到FormData
        uploadedFiles.forEach((file, index) => {
            formData.append('files', file); // 使用'files'作为字段名以支持多文件
        });
        
        formData.append('num_questions', '5'); // 生成5道题目
        formData.append('session_id', sessionId);
        
        const response = await fetch('/api/quiz/upload-multiple', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                // 构建详细的成功消息
                let successMessage = `成功基于${uploadedFiles.length}个文件生成${result.questions.length}道题目`;
                
                // 如果有题目分配信息，显示更详细的信息
                if (result.file_info && result.file_info.questions_distribution) {
                    const dist = result.file_info.questions_distribution;
                    successMessage += `\n📊 题目分配：每个文件${dist.questions_per_file}道题`;
                    if (dist.remaining_questions > 0) {
                        successMessage += `，前${dist.remaining_questions}个文件额外+1道题`;
                    }
                }
                
                // 显示处理的文件信息
                if (result.processed_files && result.processed_files.length > 0) {
                    successMessage += `\n📁 成功处理文件：${result.processed_files.join(', ')}`;
                }
                
                // 显示失败的文件信息
                if (result.failed_files && result.failed_files.length > 0) {
                    successMessage += `\n⚠️ 处理失败：${result.failed_files.join(', ')}`;
                }
                
                showMessage(successMessage, 'success');
                
                // 显示生成的题目
                displayGeneratedQuizzes(result.questions, sessionId);
                
                // 清除上传的文件
                clearAllUploadedFiles();
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
                    <div>
                        <h6 class="mb-0">题目 ${index + 1}</h6>
                        ${quiz.source_file ? `<small class="text-muted"><i class="fas fa-file me-1"></i>来源：${quiz.source_file}</small>` : ''}
                    </div>
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

// 加载答题统计
async function loadStatistics() {
    try {
        // 加载会话列表到统计页面的下拉框
        const response = await fetch('/api/session/list');
        if (response.ok) {
            const data = await response.json();
            updateStatsSessionSelect(data.sessions);
        }
        
        // 清空统计内容
        const container = document.getElementById('statisticsContent');
        container.innerHTML = '<p class="text-muted text-center">请选择会话查看统计数据</p>';
        
    } catch (error) {
        console.error('加载统计失败:', error);
        showMessage('加载统计失败', 'error');
    }
}

// 更新统计页面的会话选择下拉框
function updateStatsSessionSelect(sessions) {
    const select = document.getElementById('statsSessionSelect');
    if (select) {
        select.innerHTML = '<option value="">选择会话</option>';
        sessions.forEach(session => {
            const option = document.createElement('option');
            option.value = session.id;
            option.textContent = session.title;
            select.appendChild(option);
        });
        
        // 添加会话选择事件监听器
        select.addEventListener('change', function() {
            if (this.value) {
                loadSessionStatistics(this.value);
            } else {
                const container = document.getElementById('statisticsContent');
                container.innerHTML = '<p class="text-muted text-center">请选择会话查看统计数据</p>';
            }
        });
    }
}

// 加载指定会话的统计数据
async function loadSessionStatistics(sessionId) {
    const container = document.getElementById('statisticsContent');
    
    try {
        // 显示加载状态
        container.innerHTML = `
            <div class="text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">加载中...</span>
                </div>
                <p class="mt-2">正在加载统计数据...</p>
            </div>
        `;
        
        const response = await fetch(`/api/quiz/statistics/${sessionId}`);
        
        if (response.ok) {
            const data = await response.json();
            displayStatistics(data);
        } else {
            const error = await response.json();
            container.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    ${error.error || '加载统计数据失败'}
                </div>
            `;
        }
    } catch (error) {
        console.error('加载会话统计失败:', error);
        container.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-times-circle me-2"></i>
                网络错误，请稍后重试
            </div>
        `;
    }
}

// 显示统计数据
function displayStatistics(data) {
    const container = document.getElementById('statisticsContent');
    
    if (!data.quiz_statistics || data.quiz_statistics.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                该会话暂无题目数据
            </div>
        `;
        return;
    }
    
    // 计算总体统计
    const totalQuizzes = data.quiz_statistics.length;
    const totalResponses = data.quiz_statistics.reduce((sum, quiz) => sum + quiz.total_responses, 0);
    const totalCorrect = data.quiz_statistics.reduce((sum, quiz) => sum + quiz.correct_responses, 0);
    const overallAccuracy = totalResponses > 0 ? (totalCorrect / totalResponses * 100).toFixed(1) : 0;
    
    container.innerHTML = `
        <!-- 总体统计卡片 -->
        <div class="row mb-4">
            <div class="col-md-3">
                <div class="card bg-primary text-white">
                    <div class="card-body text-center">
                        <i class="fas fa-question-circle fa-2x mb-2"></i>
                        <h4>${totalQuizzes}</h4>
                        <small>总题目数</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-info text-white">
                    <div class="card-body text-center">
                        <i class="fas fa-users fa-2x mb-2"></i>
                        <h4>${totalResponses}</h4>
                        <small>总回答数</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-success text-white">
                    <div class="card-body text-center">
                        <i class="fas fa-check-circle fa-2x mb-2"></i>
                        <h4>${totalCorrect}</h4>
                        <small>正确回答数</small>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card bg-warning text-white">
                    <div class="card-body text-center">
                        <i class="fas fa-percentage fa-2x mb-2"></i>
                        <h4>${overallAccuracy}%</h4>
                        <small>总体正确率</small>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- 详细题目统计 -->
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0">
                    <i class="fas fa-chart-bar me-2"></i>题目详细统计
                </h5>
            </div>
            <div class="card-body">
                ${data.quiz_statistics.map((quiz, index) => `
                    <div class="card mb-3 ${quiz.is_active ? 'border-success' : 'border-secondary'}">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h6 class="mb-0">
                                题目 ${index + 1}
                                ${quiz.is_active ? '<span class="badge bg-success ms-2">进行中</span>' : '<span class="badge bg-secondary ms-2">已结束</span>'}
                            </h6>
                            <small class="text-muted">创建时间: ${new Date(quiz.created_at).toLocaleString()}</small>
                        </div>
                        <div class="card-body">
                            <h6 class="mb-3">${quiz.question}</h6>
                            
                            <!-- 统计数据 -->
                            <div class="row mb-3">
                                <div class="col-md-3">
                                    <div class="text-center">
                                        <h5 class="text-primary">${quiz.total_responses}</h5>
                                        <small class="text-muted">回答人数</small>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="text-center">
                                        <h5 class="text-success">${quiz.correct_responses}</h5>
                                        <small class="text-muted">答对人数</small>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="text-center">
                                        <h5 class="text-warning">${quiz.accuracy_rate.toFixed(1)}%</h5>
                                        <small class="text-muted">正确率</small>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="text-center">
                                        <h5 class="text-info">${quiz.correct_answer}</h5>
                                        <small class="text-muted">正确答案</small>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 选项分布 -->
                            <div class="mb-3">
                                <h6>选项分布:</h6>
                                <div class="row">
                                    ${['A', 'B', 'C', 'D'].map(option => {
                                        const count = quiz.option_distribution[option] || 0;
                                        const percentage = quiz.total_responses > 0 ? (count / quiz.total_responses * 100).toFixed(1) : 0;
                                        const isCorrect = quiz.correct_answer === option;
                                        return `
                                            <div class="col-md-3">
                                                <div class="d-flex align-items-center mb-2">
                                                    <span class="option-badge ${isCorrect ? 'bg-success' : 'bg-secondary'} me-2">${option}</span>
                                                    <div class="flex-grow-1">
                                                        <div class="progress" style="height: 20px;">
                                                            <div class="progress-bar ${isCorrect ? 'bg-success' : 'bg-secondary'}" 
                                                                 style="width: ${percentage}%">
                                                                ${count}人 (${percentage}%)
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
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
