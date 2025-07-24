// 演讲者界面的JavaScript功能

let currentUser = null;
let currentSessionId = null;
let selectedSessions = {  // 记录各个模块的会话选择状态
    quiz: null,
    feedback: null
};

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
            selectedSessions.quiz = sessionId; // 保存题目管理模块的会话选择
            // 加载已发布题目
            loadPublishedQuizzes(sessionId);
        } else {
            currentSessionId = null;
            selectedSessions.quiz = null;
            // 清空已发布题目显示
            const publishedContainer = document.getElementById('publishedQuizzes');
            publishedContainer.innerHTML = '<p class="text-muted text-center">请先选择会话查看已发布的题目</p>';
            document.getElementById('publishedQuizCount').textContent = '0';
        }
    });
    
    // 反馈页面会话选择事件
    document.getElementById('feedbackSessionSelect').addEventListener('change', function() {
        const sessionId = this.value;
        selectedSessions.feedback = sessionId; // 保存反馈模块的会话选择
        if (sessionId) {
            loadSessionFeedback(sessionId);
        } else {
            const container = document.getElementById('feedbackContent');
            container.innerHTML = '<p class="text-muted text-center">请选择会话查看反馈数据</p>';
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
        
        // 更新用户信息显示
        loadUserInfo();
        
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
                // 恢复之前选择的会话
                setTimeout(() => {
                    if (selectedSessions.quiz) {
                        const quizSelect = document.getElementById('quizSessionSelect');
                        if (quizSelect) {
                            quizSelect.value = selectedSessions.quiz;
                            currentSessionId = selectedSessions.quiz;
                            // 自动加载之前选择的会话的已发布题目
                            loadPublishedQuizzes(selectedSessions.quiz);
                        }
                    }
                }, 100);
                break;
            case 'control':
                loadSessions(); // 为控制面板加载会话选项
                break;
            case 'statistics':
                loadSessions(); // 为反馈页面加载会话选项
                // 恢复之前选择的会话
                setTimeout(() => {
                    if (selectedSessions.feedback) {
                        const feedbackSelect = document.getElementById('feedbackSessionSelect');
                        if (feedbackSelect) {
                            feedbackSelect.value = selectedSessions.feedback;
                            // 自动加载之前选择的会话的反馈数据
                            loadSessionFeedback(selectedSessions.feedback);
                        }
                    }
                }, 100);
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
    const selects = ['quizSessionSelect', 'feedbackSessionSelect'];
    
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            const currentValue = select.value; // 保存当前选择的值
            select.innerHTML = '<option value="">请选择会话</option>';
            sessions.forEach(session => {
                const option = document.createElement('option');
                option.value = session.id;
                option.textContent = session.title;
                select.appendChild(option);
            });
            
            // 恢复之前的选择
            if (currentValue && sessions.some(session => session.id == currentValue)) {
                select.value = currentValue;
            }
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

// 加载反馈数据
async function loadFeedbackData() {
    try {
        // 加载会话列表到反馈页面的下拉框
        const response = await fetch('/api/session/list');
        if (response.ok) {
            const data = await response.json();
            updateFeedbackSessionSelect(data.sessions);
        }
        
        // 清空反馈内容
        const container = document.getElementById('feedbackContent');
        container.innerHTML = '<p class="text-muted text-center">请选择会话查看反馈数据</p>';
        
    } catch (error) {
        console.error('加载反馈数据失败:', error);
        showMessage('加载反馈数据失败', 'error');
    }
}

// 更新反馈页面的会话选择下拉框
function updateFeedbackSessionSelect(sessions) {
    const select = document.getElementById('feedbackSessionSelect');
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
                loadSessionFeedback(this.value);
            } else {
                const container = document.getElementById('feedbackContent');
                container.innerHTML = '<p class="text-muted text-center">请选择会话查看反馈数据</p>';
            }
        });
    }
}

// 加载指定会话的反馈数据
async function loadSessionFeedback(sessionId) {
    const container = document.getElementById('feedbackContent');
    
    try {
        // 显示加载状态
        container.innerHTML = `
            <div class="text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">加载中...</span>
                </div>
                <p class="mt-2">正在加载反馈数据...</p>
            </div>
        `;
        
        const response = await fetch(`/api/quiz/session/${sessionId}/feedback-details`);
        
        if (response.ok) {
            const data = await response.json();
            displayFeedbackData(data);
        } else {
            const error = await response.json();
            container.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    ${error.error || '加载反馈数据失败'}
                </div>
            `;
        }
    } catch (error) {
        console.error('加载会话反馈失败:', error);
        container.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-times-circle me-2"></i>
                网络错误，请稍后重试
            </div>
        `;
    }
}

// 显示反馈数据
function displayFeedbackData(data) {
    const container = document.getElementById('feedbackContent');
    
    if (!data.feedback_statistics || data.total_feedback_count === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-comment-dots fa-3x text-muted mb-3"></i>
                <h5 class="text-muted">暂无反馈数据</h5>
                <p class="text-muted">当听众发送反馈时，数据将显示在这里</p>
            </div>
        `;
        return;
    }
    
    const feedbackStats = data.feedback_statistics;
    
    container.innerHTML = `
        <!-- 反馈总数卡片 -->
        <div class="row mb-4">
            <div class="col-md-12">
                <div class="card bg-primary text-white">
                    <div class="card-body text-center">
                        <i class="fas fa-comment-dots fa-2x mb-2"></i>
                        <h3>${data.total_feedback_count}</h3>
                        <p class="mb-0">总反馈数量</p>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- 反馈类型统计 -->
        <div class="row">
            ${Object.entries(feedbackStats).map(([typeKey, typeData]) => `
                <div class="col-md-6 col-lg-4 mb-4">
                    <div class="card feedback-type-card h-100" data-feedback-type="${typeKey}">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h6 class="mb-0">
                                <i class="fas fa-${getFeedbackIcon(typeKey)} me-2"></i>
                                ${typeData.type_name}
                            </h6>
                            <span class="badge bg-primary">${typeData.count}</span>
                        </div>
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <div class="text-center flex-grow-1">
                                    <h4 class="text-primary">${typeData.count}</h4>
                                    <small class="text-muted">反馈人数</small>
                                </div>
                                <div class="text-center flex-grow-1">
                                    <h4 class="text-success">${typeData.percentage}%</h4>
                                    <small class="text-muted">占比</small>
                                </div>
                            </div>
                            
                            <!-- 进度条 -->
                            <div class="progress mb-3" style="height: 8px;">
                                <div class="progress-bar bg-${getFeedbackColor(typeKey)}" 
                                     style="width: ${typeData.percentage}%"></div>
                            </div>
                            
                            <!-- 详细评论按钮 -->
                            <div class="text-center">
                                <button class="btn btn-outline-${getFeedbackColor(typeKey)} btn-sm" 
                                        onclick="toggleFeedbackComments('${typeKey}')"
                                        id="toggleBtn-${typeKey}">
                                    <i class="fas fa-chevron-down me-1"></i>
                                    查看详细评论 ${typeData.detailed_comments.length > 0 ? `(${typeData.detailed_comments.length})` : '(0)'}
                                </button>
                            </div>
                        </div>
                        
                        <!-- 详细评论区域（默认隐藏）-->
                        <div id="comments-${typeKey}" class="feedback-comments" style="display: none;">
                            <div class="card-footer">
                                <h6 class="mb-3">
                                    <i class="fas fa-comments me-2"></i>详细评论
                                </h6>
                                <div class="comments-list" style="max-height: 300px; overflow-y: auto;">
                                    ${typeData.detailed_comments.length > 0 ? 
                                        typeData.detailed_comments.map(comment => `
                                            <div class="comment-item p-3 mb-2 bg-light rounded">
                                                <div class="d-flex justify-content-between align-items-start">
                                                    <div class="flex-grow-1">
                                                        <strong class="text-primary">
                                                            ${comment.nickname || comment.username}
                                                        </strong>
                                                        <div class="mt-1">${comment.content}</div>
                                                    </div>
                                                    <small class="text-muted ms-2">
                                                        ${new Date(comment.created_at).toLocaleString()}
                                                    </small>
                                                </div>
                                            </div>
                                        `).join('') 
                                        : '<p class="text-muted text-center">该类型暂无详细评论</p>'
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// 获取反馈类型的图标
function getFeedbackIcon(feedbackType) {
    const icons = {
        'too_fast': 'tachometer-alt',
        'too_slow': 'turtle',
        'boring': 'frown',
        'bad_question': 'question-circle',
        'environment': 'volume-up',
        'difficulty': 'brain'
    };
    return icons[feedbackType] || 'comment';
}

// 获取反馈类型的颜色
function getFeedbackColor(feedbackType) {
    const colors = {
        'too_fast': 'warning',
        'too_slow': 'info',
        'boring': 'danger',
        'bad_question': 'primary',
        'environment': 'secondary',
        'difficulty': 'success'
    };
    return colors[feedbackType] || 'primary';
}

// 切换反馈评论显示
function toggleFeedbackComments(feedbackType) {
    const commentsDiv = document.getElementById(`comments-${feedbackType}`);
    const toggleBtn = document.getElementById(`toggleBtn-${feedbackType}`);
    
    if (commentsDiv.style.display === 'none') {
        commentsDiv.style.display = 'block';
        toggleBtn.innerHTML = '<i class="fas fa-chevron-up me-1"></i>隐藏详细评论';
        toggleBtn.classList.remove('btn-outline-' + getFeedbackColor(feedbackType));
        toggleBtn.classList.add('btn-' + getFeedbackColor(feedbackType));
    } else {
        commentsDiv.style.display = 'none';
        const comments = commentsDiv.querySelectorAll('.comment-item').length;
        toggleBtn.innerHTML = `<i class="fas fa-chevron-down me-1"></i>查看详细评论 ${comments > 0 ? `(${comments})` : '(0)'}`;
        toggleBtn.classList.remove('btn-' + getFeedbackColor(feedbackType));
        toggleBtn.classList.add('btn-outline-' + getFeedbackColor(feedbackType));
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

// 加载已发布题目
async function loadPublishedQuizzes(sessionId) {
    const container = document.getElementById('publishedQuizzes');
    const countBadge = document.getElementById('publishedQuizCount');
    
    try {
        // 显示加载状态
        container.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">加载中...</span>
                </div>
                <p class="mt-2 text-muted">正在加载已发布题目...</p>
            </div>
        `;
        
        const response = await fetch(`/api/quiz/session/${sessionId}/published`);
        
        if (response.ok) {
            const data = await response.json();
            displayPublishedQuizzes(data.quizzes);
            countBadge.textContent = data.total;
        } else {
            const error = await response.json();
            container.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    ${error.error || '加载已发布题目失败'}
                </div>
            `;
            countBadge.textContent = '0';
        }
    } catch (error) {
        console.error('加载已发布题目错误:', error);
        container.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-times-circle me-2"></i>
                网络错误，请稍后重试
            </div>
        `;
        countBadge.textContent = '0';
    }
}

// 显示已发布题目
function displayPublishedQuizzes(quizzes) {
    const container = document.getElementById('publishedQuizzes');
    
    if (!quizzes || quizzes.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-clipboard-list fa-3x text-muted mb-3"></i>
                <p class="text-muted">该会话暂无已发布题目</p>
                <small class="text-muted">生成题目后，它们将显示在这里</small>
            </div>
        `;
        return;
    }
    
    container.innerHTML = quizzes.map((quiz, index) => `
        <div class="card mb-3 published-quiz-card" data-quiz-id="${quiz.id}">
            <div class="card-header">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-0">
                            <i class="fas fa-question-circle text-primary me-2"></i>
                            题目 ${quiz.order_index}
                            ${quiz.is_active ? '<span class="badge bg-success ms-2">进行中</span>' : '<span class="badge bg-secondary ms-2">已结束</span>'}
                        </h6>
                        <small class="text-muted">创建时间: ${new Date(quiz.created_at).toLocaleString()}</small>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-outline-info me-2" onclick="toggleQuizDetails(${quiz.id})">
                            <i class="fas fa-chart-bar me-1"></i>统计
                        </button>
                        <button class="btn btn-sm btn-outline-primary" onclick="toggleQuizDiscussion(${quiz.id})">
                            <i class="fas fa-comments me-1"></i>讨论 
                            ${quiz.statistics.discussion_count > 0 ? `<span class="badge bg-primary">${quiz.statistics.discussion_count}</span>` : ''}
                        </button>
                    </div>
                </div>
            </div>
            <div class="card-body">
                <!-- 题目内容 -->
                <div class="quiz-content">
                    <h6 class="mb-3">${quiz.question}</h6>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="option-item mb-2">
                                <span class="option-badge ${quiz.correct_answer === 'A' ? 'bg-success' : 'bg-primary'}">A</span>
                                ${quiz.option_a}
                            </div>
                            <div class="option-item mb-2">
                                <span class="option-badge ${quiz.correct_answer === 'B' ? 'bg-success' : 'bg-secondary'}">B</span>
                                ${quiz.option_b}
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="option-item mb-2">
                                <span class="option-badge ${quiz.correct_answer === 'C' ? 'bg-success' : 'bg-info'}">C</span>
                                ${quiz.option_c}
                            </div>
                            <div class="option-item mb-2">
                                <span class="option-badge ${quiz.correct_answer === 'D' ? 'bg-success' : 'bg-warning'}">D</span>
                                ${quiz.option_d}
                            </div>
                        </div>
                    </div>
                    <div class="mt-3">
                        <div class="row">
                            <div class="col-md-8">
                                <strong>正确答案：</strong>
                                <span class="badge bg-success">${quiz.correct_answer}</span>
                                <div class="mt-2">
                                    <strong>解释：</strong>${quiz.explanation}
                                </div>
                            </div>
                            <div class="col-md-4 text-end">
                                <div class="d-flex justify-content-end">
                                    <div class="me-3 text-center">
                                        <div class="fw-bold text-primary">${quiz.statistics.total_responses}</div>
                                        <small class="text-muted">回答人数</small>
                                    </div>
                                    <div class="text-center">
                                        <div class="fw-bold text-success">${quiz.statistics.accuracy_rate}%</div>
                                        <small class="text-muted">正确率</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 统计详情（默认隐藏）-->
                <div id="quizStats-${quiz.id}" class="quiz-statistics mt-4" style="display: none;">
                    <hr>
                    <h6><i class="fas fa-chart-pie me-2"></i>详细统计</h6>
                    <div class="row">
                        <div class="col-md-8">
                            <h6 class="mb-3">选项分布：</h6>
                            <div class="row">
                                ${['A', 'B', 'C', 'D'].map(option => {
                                    const count = quiz.statistics.option_distribution[option];
                                    const percentage = quiz.statistics.option_percentages[option];
                                    const isCorrect = quiz.correct_answer === option;
                                    return `
                                        <div class="col-md-6 mb-3">
                                            <div class="d-flex align-items-center">
                                                <span class="option-badge ${isCorrect ? 'bg-success' : 'bg-secondary'} me-2">${option}</span>
                                                <div class="flex-grow-1">
                                                    <div class="d-flex justify-content-between align-items-center mb-1">
                                                        <small>${count}人</small>
                                                        <small>${percentage.toFixed(1)}%</small>
                                                    </div>
                                                    <div class="progress" style="height: 8px;">
                                                        <div class="progress-bar ${isCorrect ? 'bg-success' : 'bg-secondary'}" 
                                                             style="width: ${percentage}%"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="row text-center">
                                <div class="col-6">
                                    <div class="card bg-light">
                                        <div class="card-body p-3">
                                            <h5 class="text-primary mb-1">${quiz.statistics.total_responses}</h5>
                                            <small class="text-muted">总回答数</small>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-6">
                                    <div class="card bg-light">
                                        <div class="card-body p-3">
                                            <h5 class="text-success mb-1">${quiz.statistics.correct_responses}</h5>
                                            <small class="text-muted">正确回答</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 讨论区（默认隐藏）-->
                <div id="quizDiscussion-${quiz.id}" class="quiz-discussion mt-4" style="display: none;">
                    <hr>
                    <h6><i class="fas fa-comments me-2"></i>讨论区</h6>
                    <div id="discussionMessages-${quiz.id}" class="discussion-messages mb-3">
                        <!-- 讨论消息将在这里加载 -->
                    </div>
                    <div class="d-flex">
                        <input type="text" class="form-control me-2" id="discussionInput-${quiz.id}" 
                               placeholder="输入评论..." onkeypress="handleDiscussionKeyPress(event, ${quiz.id})">
                        <button class="btn btn-primary" onclick="postDiscussion(${quiz.id})">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// 切换题目统计显示
function toggleQuizDetails(quizId) {
    const statsElement = document.getElementById(`quizStats-${quizId}`);
    const button = event.target.closest('button');
    
    if (statsElement.style.display === 'none') {
        statsElement.style.display = 'block';
        button.innerHTML = '<i class="fas fa-chart-bar me-1"></i>隐藏统计';
        button.classList.remove('btn-outline-info');
        button.classList.add('btn-info');
    } else {
        statsElement.style.display = 'none';
        button.innerHTML = '<i class="fas fa-chart-bar me-1"></i>统计';
        button.classList.remove('btn-info');
        button.classList.add('btn-outline-info');
    }
}

// 切换题目讨论显示
async function toggleQuizDiscussion(quizId) {
    const discussionElement = document.getElementById(`quizDiscussion-${quizId}`);
    const button = event.target.closest('button');
    
    if (discussionElement.style.display === 'none') {
        // 显示讨论区并加载讨论内容
        discussionElement.style.display = 'block';
        button.innerHTML = '<i class="fas fa-comments me-1"></i>隐藏讨论';
        button.classList.remove('btn-outline-primary');
        button.classList.add('btn-primary');
        
        // 加载讨论内容
        await loadQuizDiscussions(quizId);
    } else {
        // 隐藏讨论区
        discussionElement.style.display = 'none';
        button.innerHTML = '<i class="fas fa-comments me-1"></i>讨论';
        button.classList.remove('btn-primary');
        button.classList.add('btn-outline-primary');
    }
}

// 加载题目讨论
async function loadQuizDiscussions(quizId) {
    const container = document.getElementById(`discussionMessages-${quizId}`);
    
    try {
        container.innerHTML = '<div class="text-center"><div class="spinner-border spinner-border-sm" role="status"></div> 加载讨论中...</div>';
        
        const response = await fetch(`/api/quiz/${quizId}/discussions`);
        
        if (response.ok) {
            const data = await response.json();
            displayDiscussions(quizId, data.discussions);
        } else {
            container.innerHTML = '<div class="text-muted text-center">加载讨论失败</div>';
        }
    } catch (error) {
        console.error('加载讨论错误:', error);
        container.innerHTML = '<div class="text-muted text-center">网络错误</div>';
    }
}

// 显示讨论内容
function displayDiscussions(quizId, discussions) {
    const container = document.getElementById(`discussionMessages-${quizId}`);
    
    if (!discussions || discussions.length === 0) {
        container.innerHTML = '<div class="text-muted text-center py-3">暂无讨论，快来发表第一条评论吧！</div>';
        return;
    }
    
    container.innerHTML = discussions.map(discussion => `
        <div class="discussion-item p-3 mb-2 bg-light rounded">
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                    <strong class="text-primary">${discussion.username}</strong>
                    <div class="mt-1">${discussion.message}</div>
                </div>
                <small class="text-muted">${new Date(discussion.created_at).toLocaleString()}</small>
            </div>
        </div>
    `).join('');
    
    // 滚动到最新消息
    container.scrollTop = container.scrollHeight;
}

// 发布讨论
async function postDiscussion(quizId) {
    const input = document.getElementById(`discussionInput-${quizId}`);
    const message = input.value.trim();
    
    if (!message) {
        showMessage('请输入评论内容', 'error');
        return;
    }
    
    try {
        const response = await fetch(`/api/quiz/${quizId}/discussions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            input.value = '';
            showMessage('评论发布成功', 'success');
            
            // 重新加载讨论内容
            await loadQuizDiscussions(quizId);
            
            // 更新讨论计数
            const button = document.querySelector(`button[onclick="toggleQuizDiscussion(${quizId})"]`);
            if (button) {
                const badge = button.querySelector('.badge');
                if (badge) {
                    const currentCount = parseInt(badge.textContent) || 0;
                    badge.textContent = currentCount + 1;
                } else {
                    button.innerHTML = button.innerHTML.replace('讨论', '讨论 <span class="badge bg-primary">1</span>');
                }
            }
        } else {
            const error = await response.json();
            showMessage(error.error || '发布评论失败', 'error');
        }
    } catch (error) {
        console.error('发布讨论错误:', error);
        showMessage('网络错误，请稍后重试', 'error');
    }
}

// 处理讨论输入框的回车键
function handleDiscussionKeyPress(event, quizId) {
    if (event.key === 'Enter') {
        postDiscussion(quizId);
    }
}
