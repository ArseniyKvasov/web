let selectedFile = null;
let fileUploaded = false;
let taskId = null;

let currentTranscriptLines = [];
let currentSummaryData = [];
let currentQuizData = [];

let isGenerating = false;
let summaryReady = false;
let quizReady = false;
let isEditMode = false;
let firstTranscriptReceived = false;

let currentQuizIndex = 0;
let quizAnswers = [];

let streamSocket = null;
let taskSocket = null;

const CHUNK_SIZE = 64 * 1024;

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const uploadStatusDiv = document.getElementById('uploadStatus');
const generateBtn = document.getElementById('generateBtn');
const resetUploadBtn = document.getElementById('resetUploadBtn');
const transcriptContainer = document.getElementById('transcriptContainer');
const summaryContainer = document.getElementById('summaryContainer');
const quizContainer = document.getElementById('quizContainer');
const editSummaryBtn = document.getElementById('editSummaryBtn');
const summaryTabBtn = document.getElementById('summaryTabBtn');
const quizTabBtn = document.getElementById('quizTabBtn');

function wsUrl(path) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${path}`;
}

function renderMathInContainer(container) {
  if (!container || !window.renderMathInElement) return;
  if (!container.innerHTML.trim()) return;
  try {
    window.renderMathInElement(container, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\(', right: '\\)', display: false },
        { left: '\\[', right: '\\]', display: true }
      ],
      throwOnError: false
    });
  } catch (e) {
    console.warn(e);
  }
}

function jsonToMarkdown(data) {
  return data.map((section) => `## ${section.subtopic}\n\n${section.content}`).join('\n\n');
}

function markdownToJson(markdown) {
  const sections = [];
  const lines = markdown.split('\n');
  let currentSection = null;
  let currentContent = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentSection) {
        sections.push({ subtopic: currentSection, content: currentContent.join('\n').trim() });
      }
      currentSection = line.substring(3).trim();
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  if (currentSection) {
    sections.push({ subtopic: currentSection, content: currentContent.join('\n').trim() });
  }

  return sections;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMarkdownToHtml(text) {
  let html = text;
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/^\* (.*?)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*?<\/li>\n?)+/gm, '<ul>$&</ul>');
  html = html.replace(/\n\n/g, '</p><p>');
  html = `<p>${html}</p>`;
  html = html.replace(/<p><\/p>/g, '').replace(/<\/ul><ul>/g, '');
  return html;
}

function setTabLoader(tabBtn, show) {
  const loader = tabBtn.querySelector('.tab-loader');
  if (loader) {
    loader.style.display = show ? 'inline-block' : 'none';
  }
}

function formatTime(ms) {
  const seconds = Math.floor((Number(ms) || 0) / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

function renderTranscript() {
  if (isGenerating && !firstTranscriptReceived) {
    transcriptContainer.innerHTML = `<div class="status-message"><span class="spinner-small"></span> Распознавание...</div>`;
    return;
  }

  if (currentTranscriptLines.length === 0 && !isGenerating) {
    transcriptContainer.innerHTML = `<div class="status-message">Нажмите «Сгенерировать задания», чтобы начать расшифровку</div>`;
    return;
  }

  const html = currentTranscriptLines
    .map(
      (line) =>
        `<div class="transcript-line"><div class="timestamp">${formatTime(line.start_ms)}</div><div class="line-text">${escapeHtml(line.text || '')}</div></div>`
    )
    .join('');

  transcriptContainer.innerHTML =
    html +
    (isGenerating
      ? `<div class="transcript-line" style="opacity:0.7;"><div class="timestamp"></div><div class="line-text"><span class="spinner-small"></span> Распознавание...</div></div>`
      : '');
}

function showSummaryLoader() {
  summaryContainer.innerHTML = `<div class="status-message"><span class="spinner-small"></span> Генерация конспекта...</div>`;
}

function showQuizLoader() {
  quizContainer.innerHTML = `<div class="status-message"><span class="spinner-small"></span> Подготовка теста...</div>`;
}

function renderSummaryContent() {
  if (!currentSummaryData.length) {
    summaryContainer.innerHTML = `<div class="status-message">Конспект появится после генерации</div>`;
    return;
  }

  if (isEditMode) {
    const markdown = jsonToMarkdown(currentSummaryData);
    const toolbar = `
      <div class="markdown-editor-toolbar">
        <button class="toolbar-btn" onclick="insertMarkdown('## ')">Заголовок H2</button>
        <button class="toolbar-btn" onclick="insertMarkdown('**')">Жирный</button>
        <button class="toolbar-btn" onclick="insertMarkdown('*')">Курсив</button>
        <button class="toolbar-btn" onclick="insertMarkdown('\\n* ')">Маркированный список</button>
        <button class="toolbar-btn" onclick="insertMarkdown('\\n\\n$$\\n\\n$$\\n\\n', '\\n\\n$$\\n\\n')">Формула</button>
      </div>`;

    summaryContainer.innerHTML = `<div class="markdown-editor-container">${toolbar}<textarea id="markdownEditor" class="markdown-editor">${escapeHtml(markdown)}</textarea></div>`;
    return;
  }

  let tocHtml = `<div class="summary-toc"><h4>📑 Оглавление</h4><ul class="toc-list">`;
  let contentHtml = `<div class="summary-content">`;

  currentSummaryData.forEach((section, idx) => {
    const sectionId = `section-${idx}`;
    tocHtml += `<li class="toc-item" onclick="document.getElementById('${sectionId}').scrollIntoView({ behavior: 'smooth' })">${escapeHtml(section.subtopic || '')}</li>`;
    contentHtml += `<div id="${sectionId}" class="summary-section"><h3>${escapeHtml(section.subtopic || '')}</h3><div class="content">${formatMarkdownToHtml(section.content || '')}</div></div>`;
  });

  tocHtml += `</ul></div>`;
  contentHtml += `</div>`;
  summaryContainer.innerHTML = `<div class="summary-layout">${tocHtml}${contentHtml}</div>`;
  setTimeout(() => renderMathInContainer(summaryContainer), 50);
}

function renderQuizContent() {
  if (!currentQuizData.length || !quizReady) {
    showQuizLoader();
    return;
  }

  if (currentQuizIndex >= currentQuizData.length) {
    quizContainer.innerHTML = `<div class="quiz-complete"><h3>🎉 Тест завершен!</h3><p>Вы ответили на все вопросы</p></div>`;
    return;
  }

  const q = currentQuizData[currentQuizIndex];
  const answered = quizAnswers[currentQuizIndex] && quizAnswers[currentQuizIndex].answered;
  const isOpenEnded = q.question_type === 'open_ended';

  let html = `<div class="quiz-item" data-question-idx="${currentQuizIndex}"><div class="quiz-question">${currentQuizIndex + 1}. ${escapeHtml(q.question_text || '')}</div>`;

  if (!answered) {
    if (isOpenEnded) {
      html += `<div class="open-ended-area"><textarea id="openAnswer" class="open-ended-input" rows="4" placeholder="Введите ваш развернутый ответ..."></textarea><button class="check-answer-btn" onclick="checkOpenEndedAnswer()">Проверить ответ</button></div>`;
    } else {
      (q.options || []).forEach((opt, optIdx) => {
        html += `<div class="quiz-option" data-opt-index="${optIdx}"><label>${escapeHtml(String(opt))}</label></div>`;
      });
    }
  } else {
    const userData = quizAnswers[currentQuizIndex];
    if (isOpenEnded) {
      html += `<div class="open-ended-area"><textarea id="openAnswerReadonly" class="open-ended-input" readonly rows="4">${escapeHtml(userData.answer)}</textarea></div>`;
      html += `<div class="explanation-box"><strong>📖 Эталонный ответ:</strong><br>${escapeHtml(String(q.correct_answer || ''))}<br><br><strong>💡 Объяснение:</strong><br>${escapeHtml(String(q.explanation || ''))}</div>`;
      html += `<div class="next-btn-container"><button class="next-question-btn" onclick="nextQuestion()">Далее →</button></div>`;
    } else {
      const correct = Number(q.correct_answer);
      const isCorrect = Number(userData.answer) === correct;
      (q.options || []).forEach((opt, optIdx) => {
        let cls = '';
        if (optIdx === correct) cls = 'correct-highlight';
        if (optIdx === Number(userData.answer) && optIdx !== correct) cls = 'wrong-highlight';
        html += `<div class="quiz-option ${cls}" data-opt-index="${optIdx}"><label>${escapeHtml(String(opt))}</label></div>`;
      });

      if (!isCorrect) {
        html += `<div class="explanation-box"><strong>📖 Объяснение:</strong><br>${escapeHtml(String(q.explanation || ''))}</div>`;
        html += `<div class="next-btn-container"><button class="next-question-btn" onclick="nextQuestion()">Далее →</button></div>`;
      } else {
        setTimeout(() => nextQuestion(), 500);
      }
    }
  }

  html += `</div>`;
  quizContainer.innerHTML = html;

  if (!answered && !isOpenEnded) {
    quizContainer.querySelectorAll('.quiz-option').forEach((optionNode) => {
      optionNode.addEventListener('click', () => {
        if (quizAnswers[currentQuizIndex] && quizAnswers[currentQuizIndex].answered) return;
        const selectedIdx = Number(optionNode.getAttribute('data-opt-index'));
        selectAnswer(currentQuizIndex, selectedIdx);
      });
    });
  }

  setTimeout(() => renderMathInContainer(quizContainer), 50);
}

function updateGenerateButtonIdle() {
  generateBtn.disabled = !fileUploaded;
  generateBtn.textContent = 'Сгенерировать задания';
}

function setFailedState(message) {
  isGenerating = false;
  updateGenerateButtonIdle();
  if (message) {
    const html = `<div class="status-message">Ошибка: ${escapeHtml(message)}</div>`;
    if (!summaryReady) summaryContainer.innerHTML = html;
    if (!quizReady) quizContainer.innerHTML = html;
  }
}

function applyTaskUpdate(task) {
  if (!task || !task.id) return;

  if (Array.isArray(task.transcript) && task.transcript.length) {
    currentTranscriptLines = task.transcript;
    if (task.transcript.some((segment) => String(segment.text || '').trim().length > 0)) {
      firstTranscriptReceived = true;
    }
    renderTranscript();
  }

  if (Array.isArray(task.summary) && task.summary.length) {
    currentSummaryData = task.summary;
    summaryReady = true;
    summaryTabBtn.disabled = false;
    summaryTabBtn.style.opacity = '1';
    setTabLoader(summaryTabBtn, false);
    if (document.querySelector('.tab-btn[data-tab="summary"]').classList.contains('active')) {
      renderSummaryContent();
    }
  }

  if (Array.isArray(task.test) && task.test.length) {
    currentQuizData = task.test;
    quizReady = true;
    quizTabBtn.disabled = false;
    quizTabBtn.style.opacity = '1';
    setTabLoader(quizTabBtn, false);
    if (document.querySelector('.tab-btn[data-tab="quiz"]').classList.contains('active')) {
      renderQuizContent();
    }
  }

  if (task.status === 'failed') {
    setFailedState(task.error || 'Task failed');
  }

  if (task.status === 'done') {
    isGenerating = false;
    updateGenerateButtonIdle();
  }
}

function connectTaskSocket(newTaskId) {
  if (taskSocket) {
    taskSocket.close();
    taskSocket = null;
  }

  taskSocket = new WebSocket(wsUrl(`/ws/tasks/${encodeURIComponent(newTaskId)}`));

  taskSocket.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload.type === 'error') {
        setFailedState(payload.code || 'Ошибка подписки на задачу');
        return;
      }
      applyTaskUpdate(payload);
    } catch (e) {
      console.warn('Bad task update', e);
    }
  };

  taskSocket.onclose = () => {
    taskSocket = null;
  };
}

async function uploadFile(file) {
  selectedFile = file;
  fileUploaded = false;
  generateBtn.disabled = true;

  uploadStatusDiv.innerHTML = `<div class="file-info"><span class="loader"></span> Загрузка "${escapeHtml(file.name.slice(0, 40))}"...</div>`;

  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });

    const payload = await response.json();
    if (!response.ok || !payload.task_id) {
      throw new Error(payload.error || 'Upload failed');
    }

    taskId = payload.task_id;
    connectTaskSocket(taskId);

    fileUploaded = true;
    uploadStatusDiv.innerHTML = `<div class="file-info">✅ Файл "${escapeHtml(file.name.slice(0, 40))}" успешно загружен</div>`;
    generateBtn.disabled = false;
  } catch (error) {
    uploadStatusDiv.innerHTML = `<div class="status-message">Ошибка загрузки: ${escapeHtml(error.message || 'unknown')}</div>`;
    selectedFile = null;
    taskId = null;
    fileUploaded = false;
    generateBtn.disabled = true;
  }
}

async function sendFileToStream(ws, file) {
  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);

  for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
    const chunk = data.slice(offset, Math.min(offset + CHUNK_SIZE, data.length));
    ws.send(chunk);
    if ((offset / CHUNK_SIZE) % 20 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  ws.send(JSON.stringify({ type: 'end' }));
}

function addTranscriptLine(segment) {
  const line = {
    start_ms: Number(segment.start_ms || 0),
    end_ms: segment.end_ms,
    text: segment.text || '',
    is_final: Boolean(segment.is_final)
  };
  currentTranscriptLines.push(line);
  if (String(line.text || '').trim().length > 0) {
    firstTranscriptReceived = true;
  }
}

function resetContentState() {
  currentTranscriptLines = [];
  currentSummaryData = [];
  currentQuizData = [];
  currentQuizIndex = 0;
  quizAnswers = [];
  isEditMode = false;
  firstTranscriptReceived = false;

  summaryReady = false;
  quizReady = false;

  summaryTabBtn.disabled = true;
  summaryTabBtn.style.opacity = '0.5';
  quizTabBtn.disabled = true;
  quizTabBtn.style.opacity = '0.5';

  setTabLoader(summaryTabBtn, false);
  setTabLoader(quizTabBtn, false);

  renderTranscript();
  showSummaryLoader();
  showQuizLoader();
}

function startGeneration() {
  if (!fileUploaded || !selectedFile || !taskId) {
    alert('Сначала загрузите аудиофайл');
    return;
  }
  if (isGenerating) return;

  const transcriptTab = document.querySelector('.tab-btn[data-tab="transcript"]');
  transcriptTab.click();

  resetContentState();
  setTabLoader(summaryTabBtn, true);
  setTabLoader(quizTabBtn, true);

  isGenerating = true;
  firstTranscriptReceived = false;
  generateBtn.disabled = true;
  generateBtn.textContent = 'Генерация...';

  if (streamSocket) {
    streamSocket.close();
    streamSocket = null;
  }

  streamSocket = new WebSocket(wsUrl(`/ws/stream?task_id=${encodeURIComponent(taskId)}`));

  streamSocket.onopen = async () => {
    try {
      streamSocket.send(JSON.stringify({ type: 'init', config: { language: null } }));
      await sendFileToStream(streamSocket, selectedFile);
    } catch (error) {
      setFailedState(error.message || 'Не удалось отправить файл');
      if (streamSocket) streamSocket.close();
    }
  };

  streamSocket.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      if (payload.type === 'transcript') {
        addTranscriptLine(payload);
        renderTranscript();
        return;
      }
      if (payload.type === 'error') {
        setFailedState(payload.code || 'Ошибка стриминга');
      }
    } catch (e) {
      console.warn('Bad stream message', e);
    }
  };

  streamSocket.onerror = () => {
    setFailedState('Ошибка соединения с сервером');
  };

  streamSocket.onclose = () => {
    streamSocket = null;
    isGenerating = false;
    updateGenerateButtonIdle();
  };
}

function resetUpload() {
  if (streamSocket) {
    streamSocket.close();
    streamSocket = null;
  }
  if (taskSocket) {
    taskSocket.close();
    taskSocket = null;
  }

  selectedFile = null;
  fileUploaded = false;
  taskId = null;
  isGenerating = false;
  uploadStatusDiv.innerHTML = '';

  resetContentState();
  updateGenerateButtonIdle();

  if (fileInput) fileInput.value = '';
  dropZone.classList.remove('drag-over');
}

function enterEditMode() {
  if (!currentSummaryData.length) {
    alert('Конспект ещё не сгенерирован');
    return;
  }
  isEditMode = true;
  editSummaryBtn.textContent = '💾 Сохранить';
  renderSummaryContent();
}

function saveSummary() {
  const editor = document.getElementById('markdownEditor');
  if (!editor) return;

  const newData = markdownToJson(editor.value);
  if (!newData.length) {
    alert('Ошибка: заголовки должны начинаться с ##');
    return;
  }

  currentSummaryData = newData;
  isEditMode = false;
  editSummaryBtn.textContent = '✏️ Редактировать конспект';
  renderSummaryContent();
}

function onEditButtonClick() {
  if (!currentSummaryData.length) {
    alert('Конспект ещё не сгенерирован');
    return;
  }
  if (isEditMode) saveSummary();
  else enterEditMode();
}

function selectAnswer(questionIdx, answerIdx) {
  if (quizAnswers[questionIdx] && quizAnswers[questionIdx].answered) return;
  const q = currentQuizData[questionIdx];
  const correct = Number(q.correct_answer);
  const isCorrect = Number(answerIdx) === correct;

  quizAnswers[questionIdx] = { answer: answerIdx, answered: true };
  renderQuizContent();

  if (isCorrect) {
    setTimeout(() => nextQuestion(), 500);
  }
}

window.checkOpenEndedAnswer = function checkOpenEndedAnswer() {
  const input = document.getElementById('openAnswer');
  if (!input) return;

  const userAnswer = input.value.trim();
  if (!userAnswer) return;

  quizAnswers[currentQuizIndex] = { answer: userAnswer, answered: true };
  renderQuizContent();
};

window.nextQuestion = function nextQuestion() {
  if (currentQuizIndex + 1 < currentQuizData.length) {
    currentQuizIndex += 1;
  } else {
    currentQuizIndex = currentQuizData.length;
  }
  renderQuizContent();
};

window.insertMarkdown = function insertMarkdown(prefix, suffix = '') {
  const editor = document.getElementById('markdownEditor');
  if (!editor) return;

  const start = editor.selectionStart;
  const end = editor.selectionEnd;
  const text = editor.value;
  const selected = text.substring(start, end);

  editor.value = text.substring(0, start) + prefix + selected + suffix + text.substring(end);
  editor.focus();
  editor.setSelectionRange(start + prefix.length, end + prefix.length);
};

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  if (e.dataTransfer.files.length) uploadFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', (e) => {
  if (e.target.files.length) uploadFile(e.target.files[0]);
});

generateBtn.addEventListener('click', startGeneration);
resetUploadBtn.addEventListener('click', resetUpload);
editSummaryBtn.addEventListener('click', onEditButtonClick);

const tabBtns = document.querySelectorAll('.tab-btn');
const panels = {
  transcript: document.getElementById('panelTranscript'),
  summary: document.getElementById('panelSummary'),
  quiz: document.getElementById('panelQuiz')
};

tabBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const tab = btn.getAttribute('data-tab');

    tabBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    Object.values(panels).forEach((p) => p.classList.remove('active-pane'));
    panels[tab].classList.add('active-pane');

    if (tab === 'summary') {
      if (summaryReady) renderSummaryContent();
      else showSummaryLoader();
    }

    if (tab === 'quiz') {
      if (quizReady) renderQuizContent();
      else showQuizLoader();
    }
  });
});

renderTranscript();
showSummaryLoader();
showQuizLoader();
