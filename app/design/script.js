const transcriptChunks = [
  { text: "Сегодня мы разберем LU-разложение матриц — мощный метод решения систем линейных уравнений.", start_ms: 3000, is_final: false },
  { text: "LU-разложение позволяет эффективно решать множество систем с одной и той же матрицей.", start_ms: 11000, is_final: false },
  { text: "Основная идея: представить матрицу A как произведение нижней L и верхней U треугольных матриц.", start_ms: 19000, is_final: false },
  { text: "L — нижняя треугольная с единицами на диагонали, U — верхняя треугольная.", start_ms: 27000, is_final: false },
  { text: "Решение системы Ax = b сводится к двум шагам: прямая и обратная подстановка.", start_ms: 35000, is_final: false },
  { text: "Сложность LU-разложения O(n³), но для N систем выигрыш колоссальный.", start_ms: 43000, is_final: false },
  { text: "Алгоритм получения LU-разложения основан на методе Гаусса.", start_ms: 51000, is_final: false },
  { text: "Важно: LU-разложение существует не для всех матриц, нужны ненулевые главные миноры.", start_ms: 59000, is_final: true }
];

const summaryData = [
  { "subtopic": "Цель LU-разложения", "content": "LU-разложение — это метод, который позволяет решать множество систем линейных уравнений с **одной и той же матрицей** $A$, но разными правыми частями $b$.\n\n*   **Почему это выгодно?**\n    *   Прямое решение системы методом Гаусса имеет сложность $O(n^3)$.\n    *   Если у вас есть разложение $A = LU$, то решение сводится к двум последовательным шагам (прямой и обратной подстановке), каждый из которых имеет сложность $O(n^2)$.\n    *   Для $N$ систем уравнений выигрыш в производительности становится огромным, так как сложность падает с $O(N \\cdot n^3)$ до $O(n^3 + N \\cdot n^2)$.\n\n*   **Когда это не нужно:**\n    *   Если нужно решить **всего одну** систему уравнений, выполнять LU-разложение не имеет смысла, так как оно потребует больше вычислений, чем прямой метод Гаусса." },
  { "subtopic": "Определение и форма LU-разложения", "content": "LU-разложение представляет исходную квадратную матрицу $A$ в виде произведения двух треугольных матриц:\n\n$$\nA = L \\cdot U\n$$\n\nгде:\n*   $L$ (от англ. *lower*) — **нижняя треугольная матрица**. На её главной диагонали находятся **единицы**.\n*   $U$ (от англ. *upper*) — **верхняя треугольная матрица**.\n\nТакое разложение является **однозначным** при условии, что на диагонали $U$ нет нулей (или что все главные миноры матрицы $A$ отличны от нуля)." },
  { "subtopic": "Решение системы Ax = b через LU-разложение", "content": "Используя разложение $A = LU$, систему $Ax = b$ можно решить в два этапа:\n\n1.  **Прямая подстановка (Forward substitution):**\n    Вводится вспомогательная переменная $y = Ux$. Тогда $Ly = b$.\n    *   Так как $L$ — нижняя треугольная матрица с единицами на диагонали, вектор $y$ легко находится последовательно, начиная с первой строки.\n\n2.  **Обратная подстановка (Backward substitution):**\n    Решается система $Ux = y$.\n    *   Так как $U$ — верхняя треугольная матрица, вектор $x$ легко находится, начиная с последней строки.\n\n**Пример** (из транскрипта):\nПусть $A = \\begin{pmatrix} 1 & 2 \\\\ 2 & 1 \\end{pmatrix}$, тогда $L = \\begin{pmatrix} 1 & 0 \\\\ 2 & 1 \\end{pmatrix}$, $U = \\begin{pmatrix} 1 & 2 \\\\ 0 & -3 \\end{pmatrix}$.\nДля решения $Ax = b$ (например, $b = (1,0)^T$):\n1. Решаем $Ly = b$: $\\begin{cases} y_1 = 1 \\\\ 2y_1 + y_2 = 0 \\end{cases} \\Rightarrow y_1 = 1, y_2 = -2$.\n2. Решаем $Ux = y$: $\\begin{cases} x_1 + 2x_2 = 1 \\\\ -3x_2 = -2 \\end{cases} \\Rightarrow x_2 = \\frac{2}{3}, x_1 = -\\frac{1}{3}$." },
  { "subtopic": "Алгоритм нахождения LU-разложения (Метод Гаусса)", "content": "Самый практичный способ получения LU-разложения — это преобразование матрицы $A$ к верхнетреугольному виду $U$ с помощью **элементарных преобразований строк** (вычитание одной строки из другой), которые всегда являются нижнетреугольными матрицами $E$.\n\n1.  **Прямой ход (к U):**\n    Последовательно применяем к $A$ элементарные матрицы $E_1, E_2, ..., E_k$, чтобы получить $U$:\n    $$\n    E_k \\cdots E_2 E_1 A = U\n    $$\n    Важно: разрешены только преобразования **сверху вниз** (из нижней строки вычитаем верхнюю, умноженную на коэффициент). Это гарантирует, что все $E_i$ являются нижнетреугольными.\n\n2.  **Формирование L:**\n    Из предыдущего уравнения следует:\n    $$\n    A = (E_1^{-1} E_2^{-1} \\cdots E_k^{-1}) U\n    $$\n    Матрица $L$ — это произведение обратных элементарных матриц:\n    $$\n    L = E_1^{-1} E_2^{-1} \\cdots E_k^{-1}\n    $$\n    *   Обратная операция к вычитанию строки — это прибавление строки с противоположным знаком.\n    *   На практике $L$ формируется, применяя **в обратном порядке** обратные преобразования к единичной матрице $I$." },
  { "subtopic": "Практический пример (на матрице 3x3)", "content": "Найдем LU-разложение для матрицы $A = \\begin{pmatrix} 1 & 2 & 3 \\\\ 1 & 1 & 1 \\\\ 1 & 3 & 2 \\end{pmatrix}$.\n\n**Шаг 1: Прямой ход (получение U).**\n*   $\\text{стр2} := \\text{стр2} - \\text{стр1}$: $\\begin{pmatrix} 1 & 2 & 3 \\\\ 0 & -1 & -2 \\\\ 1 & 3 & 2 \\end{pmatrix}$.\n*   $\\text{стр3} := \\text{стр3} - \\text{стр1}$: $\\begin{pmatrix} 1 & 2 & 3 \\\\ 0 & -1 & -2 \\\\ 0 & 1 & -1 \\end{pmatrix}$.\n*   $\\text{стр3} := \\text{стр3} + \\text{стр2}$: $\\begin{pmatrix} 1 & 2 & 3 \\\\ 0 & -1 & -2 \\\\ 0 & 0 & -3 \\end{pmatrix}$.\n\nМатрица $U$ готова: $U = \\begin{pmatrix} 1 & 2 & 3 \\\\ 0 & -1 & -2 \\\\ 0 & 0 & -3 \\end{pmatrix}$.\n\n**Шаг 2: Обратный ход (получение L).**\nНачинаем с единичной матрицы $I$ и применяем обратные преобразования в обратном порядке.\n1.  Исходная $I = \\begin{pmatrix} 1 & 0 & 0 \\\\ 0 & 1 & 0 \\\\ 0 & 0 & 1 \\end{pmatrix}$.\n2.  Обратное к последнему преобразованию ($\\text{стр3} := \\text{стр3} + \\text{стр2}$) — это $\\text{стр3} := \\text{стр3} - \\text{стр2}$:\n    $\\begin{pmatrix} 1 & 0 & 0 \\\\ 0 & 1 & 0 \\\\ 0 & -1 & 1 \\end{pmatrix}$.\n3.  Обратное к преобразованию $\\text{стр3} := \\text{стр3} - \\text{стр1}$ — это $\\text{стр3} := \\text{стр3} + \\text{стр1}$:\n    $\\begin{pmatrix} 1 & 0 & 0 \\\\ 0 & 1 & 0 \\\\ 1 & -1 & 1 \\end{pmatrix}$.\n4.  Обратное к преобразованию $\\text{стр2} := \\text{стр2} - \\text{стр1}$ — это $\\text{стр2} := \\text{стр2} + \\text{стр1}$:\n    $\\begin{pmatrix} 1 & 0 & 0 \\\\ 1 & 1 & 0 \\\\ 1 & -1 & 1 \\end{pmatrix}$.\n\nМатрица $L$ готова: $L = \\begin{pmatrix} 1 & 0 & 0 \\\\ 1 & 1 & 0 \\\\ 1 & -1 & 1 \\end{pmatrix}$.\n\n**Проверка:** $L \\cdot U = A$." },
  { "subtopic": "Условия существования и возможные проблемы", "content": "LU-разложение существует не для всех невырожденных матриц.\n\n*   **Основное условие:** Все главные миноры матрицы $A$ должны быть отличны от нуля.\n*   **Почему оно может отсутствовать:**\n    *   Если в процессе приведения к $U$ на главной диагонали появляется ноль, дальнейшее зануление элементов ниже него с помощью разрешенных операций (вычитание верхних строк из нижних) становится невозможным.\n    *   **Пример:** $A = \\begin{pmatrix} 0 & 1 \\\\ 1 & 1 \\end{pmatrix}$. На первом же шаге $a_{11} = 0$, что блокирует стандартный алгоритм.\n\n*   **Решение проблемы:** Для таких матриц используется **LU-разложение с перестановками (LUP)**. Оно добавляет матрицу перестановок $P$, так что:\n    $$\n    PA = LU\n    $$\n    Это позволяет менять строки местами, чтобы избежать нулевых элементов на диагонали." }
];

const quizData = [
  { question_id: 1, question_text: "Какая из следующих матриц может быть представлена в виде $A = LU$, где $L$ — нижняя треугольная с единицами на диагонали, а $U$ — верхняя треугольная?", question_type: "multiple_choice", options: ["$\\begin{pmatrix} 1 & 2 \\\\ 2 & 1 \\end{pmatrix}$", "$\\begin{pmatrix} 0 & 1 \\\\ 1 & 1 \\end{pmatrix}$", "$\\begin{pmatrix} 1 & 0 \\\\ 0 & 1 \\end{pmatrix}$", "$\\begin{pmatrix} 2 & 4 \\\\ 1 & 2 \\end{pmatrix}$"], correct_answer: 0, explanation: "Матрица $\\begin{pmatrix} 1 & 2 \\\\ 2 & 1 \\end{pmatrix}$ имеет ненулевые главные миноры (1 и -3), поэтому для нее существует LU-разложение. Матрица $\\begin{pmatrix} 0 & 1 \\\\ 1 & 1 \\end{pmatrix}$ имеет нулевой первый главный минор, поэтому для нее требуется LU-разложение с перестановками.", subtopic: "Условия существования и возможные проблемы" },
  { question_id: 2, question_text: "Какая матрица в LU-разложении имеет единицы на главной диагонали?", question_type: "multiple_choice", options: ["Матрица U", "Матрица L", "Обе матрицы", "Ни одна из матриц"], correct_answer: 1, explanation: "В классическом LU-разложении нижняя треугольная матрица L имеет единицы на главной диагонали, а U — произвольные числа.", subtopic: "Определение и форма LU-разложения" },
  { question_id: 3, question_text: "Какова вычислительная сложность решения системы через LU-разложение (после получения разложения)?", question_type: "multiple_choice", options: ["O(n³)", "O(n²)", "O(n log n)", "O(n)"], correct_answer: 1, explanation: "После получения LU-разложения решение системы сводится к прямой и обратной подстановке, каждая из которых имеет сложность O(n²).", subtopic: "Решение системы Ax = b через LU-разложение" },
  { question_id: 4, question_text: "Какое условие необходимо для существования LU-разложения?", question_type: "multiple_choice", options: ["Все элементы матрицы должны быть ненулевыми", "Матрица должна быть симметричной", "Все главные миноры должны быть отличны от нуля", "Матрица должна быть диагональной"], correct_answer: 2, explanation: "Для существования LU-разложения все главные миноры матрицы A должны быть ненулевыми.", subtopic: "Условия существования и возможные проблемы" },
  { question_id: 5, question_text: "Что такое LUP-разложение?", question_type: "multiple_choice", options: ["LU-разложение с перестановками строк", "LU-разложение с перестановками столбцов", "LU-разложение с комплексными числами", "Модификация для невырожденных матриц"], correct_answer: 0, explanation: "LUP-разложение добавляет матрицу перестановок P для обхода проблемы нулевых диагональных элементов.", subtopic: "Условия существования и возможные проблемы" },
  { question_id: 6, question_text: "Объясните, почему для матрицы с нулевым первым главным минором не существует стандартного LU-разложения и как это можно исправить.", question_type: "open_ended", options: null, correct_answer: "Потому что в процессе приведения к верхнетреугольному виду на первом шаге возникает ноль на диагонали, что делает невозможным зануление элементов ниже с помощью разрешенных операций. Исправляется с помощью LU-разложения с перестановками (LUP), где строки матрицы переставляются так, чтобы на диагонали оказался ненулевой элемент.", explanation: "Нулевой главный минор означает, что матрица вырождена или требует перестановки строк для устойчивости алгоритма. LUP-разложение позволяет обойти эту проблему.", subtopic: "Условия существования и возможные проблемы" },
  { question_id: 7, question_text: "Опишите алгоритм получения LU-разложения методом Гаусса.", question_type: "open_ended", options: null, correct_answer: "Алгоритм заключается в последовательном исключении элементов под главной диагональю: для каждого столбца k от 1 до n-1, для каждой строки i от k+1 до n вычисляется множитель l_ik = a_ik / a_kk, затем из i-й строки вычитается k-я строка, умноженная на l_ik. В результате получается верхняя треугольная матрица U, а множители l_ik образуют нижнюю треугольную матрицу L с единицами на диагонали.", explanation: "Это прямой ход метода Гаусса, где все элементарные преобразования сохраняются в матрице L.", subtopic: "Алгоритм нахождения LU-разложения (Метод Гаусса)" }
];

let currentTranscriptLines = [];
let isGenerating = false;
let generationInterval = null;
let fileUploaded = false;
let currentSummaryData = [];
let isEditMode = false;
let currentQuizIndex = 0;
let quizAnswers = [];

let summaryReady = false;
let quizReady = false;

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

function renderMathInContainer(container) {
  if (!container || !window.renderMathInElement) return;
  if (!container.innerHTML.trim()) return;
  try {
    window.renderMathInElement(container, {
      delimiters: [
        {left: '$$', right: '$$', display: true},
        {left: '$', right: '$', display: false},
        {left: '\\(', right: '\\)', display: false},
        {left: '\\[', right: '\\]', display: true}
      ],
      throwOnError: false
    });
  } catch (e) { console.warn(e); }
}

function jsonToMarkdown(data) {
  return data.map(section => `## ${section.subtopic}\n\n${section.content}`).join('\n\n');
}

function markdownToJson(markdown) {
  const sections = [];
  const lines = markdown.split('\n');
  let currentSection = null, currentContent = [];
  for (let line of lines) {
    if (line.startsWith('## ')) {
      if (currentSection) sections.push({ subtopic: currentSection, content: currentContent.join('\n').trim() });
      currentSection = line.substring(3).trim();
      currentContent = [];
    } else if (currentSection) currentContent.push(line);
  }
  if (currentSection) sections.push({ subtopic: currentSection, content: currentContent.join('\n').trim() });
  return sections;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}

function formatMarkdownToHtml(text) {
  let html = text;
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/^\* (.*?)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*?<\/li>\n?)+/gm, '<ul>$&</ul>');
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';
  html = html.replace(/<p><\/p>/g, '').replace(/<\/ul><ul>/g, '');
  return html;
}

function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${minutes.toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

function renderTranscript() {
  if (currentTranscriptLines.length === 0 && isGenerating) {
    transcriptContainer.innerHTML = `<div class="status-message"><span class="spinner-small"></span> Распознавание...</div>`;
    return;
  }
  if (currentTranscriptLines.length === 0 && !isGenerating) {
    transcriptContainer.innerHTML = `<div class="status-message">Нажмите «Сгенерировать задания», чтобы начать расшифровку</div>`;
    return;
  }
  let html = '';
  for (let line of currentTranscriptLines) {
    html += `<div class="transcript-line"><div class="timestamp">${formatTime(line.start_ms)}</div><div class="line-text">${escapeHtml(line.text)}</div></div>`;
  }
  if (isGenerating) html += `<div class="transcript-line" style="opacity:0.7;"><div class="timestamp"></div><div class="line-text"><span class="spinner-small"></span> Распознавание...</div></div>`;
  transcriptContainer.innerHTML = html;
}

function showSummaryLoader() {
  summaryContainer.innerHTML = `<div class="status-message"><span class="spinner-small"></span> Генерация конспекта...</div>`;
}

function showQuizLoader() {
  quizContainer.innerHTML = `<div class="status-message"><span class="spinner-small"></span> Подготовка теста...</div>`;
}

function setTabLoader(tabBtn, show) {
  const loader = tabBtn.querySelector('.tab-loader');
  if (loader) {
    loader.style.display = show ? 'inline-block' : 'none';
  }
}

function renderSummaryContent() {
  if (!currentSummaryData.length) {
    summaryContainer.innerHTML = `<div class="status-message">Конспект появится после генерации</div>`;
    return;
  }
  if (isEditMode) {
    const markdown = jsonToMarkdown(currentSummaryData);
    const toolbar = `<div class="markdown-editor-toolbar"><button class="toolbar-btn" onclick="insertMarkdown('## ')">Заголовок H2</button><button class="toolbar-btn" onclick="insertMarkdown('**')">Жирный</button><button class="toolbar-btn" onclick="insertMarkdown('*')">Курсив</button><button class="toolbar-btn" onclick="insertMarkdown('\\n* ')">Маркированный список</button><button class="toolbar-btn" onclick="insertMarkdown('\\n\\n$$\\n\\n$$\\n\\n', '\\n\\n$$\\n\\n')">Формула</button></div><textarea id="markdownEditor" class="markdown-editor">${escapeHtml(markdown)}</textarea>`;
    summaryContainer.innerHTML = `<div class="markdown-editor-container">${toolbar}</div>`;
    return;
  }
  let tocHtml = `<div class="summary-toc"><h4>📑 Оглавление</h4><ul class="toc-list">`;
  let contentHtml = `<div class="summary-content">`;
  currentSummaryData.forEach((section, idx) => {
    const id = `section-${idx}`;
    tocHtml += `<li class="toc-item" onclick="document.getElementById('${id}').scrollIntoView({ behavior: 'smooth' })">${escapeHtml(section.subtopic)}</li>`;
    contentHtml += `<div id="${id}" class="summary-section"><h3>${escapeHtml(section.subtopic)}</h3><div class="content">${formatMarkdownToHtml(section.content)}</div></div>`;
  });
  tocHtml += `</ul></div>`;
  contentHtml += `</div>`;
  summaryContainer.innerHTML = `<div class="summary-layout">${tocHtml}${contentHtml}</div>`;
  setTimeout(() => renderMathInContainer(summaryContainer), 50);
}

function renderQuizContent() {
  if (!currentSummaryData.length || !quizReady) {
    showQuizLoader();
    return;
  }
  if (currentQuizIndex >= quizData.length) {
    quizContainer.innerHTML = `<div class="quiz-complete"><h3>🎉 Тест завершен!</h3><p>Вы ответили на все вопросы</p></div>`;
    return;
  }
  const q = quizData[currentQuizIndex];
  const answered = quizAnswers[currentQuizIndex] && quizAnswers[currentQuizIndex].answered;
  const isOpenEnded = q.question_type === 'open_ended';
  let html = `<div class="quiz-item" data-question-idx="${currentQuizIndex}"><div class="quiz-question">${currentQuizIndex + 1}. ${escapeHtml(q.question_text)}</div>`;

  if (!answered) {
    if (isOpenEnded) {
      html += `<div class="open-ended-area"><textarea id="openAnswer" class="open-ended-input" rows="4" placeholder="Введите ваш развернутый ответ..."></textarea><button class="check-answer-btn" onclick="checkOpenEndedAnswer()">Проверить ответ</button></div>`;
    } else {
      q.options.forEach((opt, optIdx) => {
        html += `<div class="quiz-option" data-opt-index="${optIdx}"><label>${opt}</label></div>`;
      });
    }
  } else {
    const userData = quizAnswers[currentQuizIndex];
    if (isOpenEnded) {
      html += `<div class="open-ended-area"><textarea id="openAnswerReadonly" class="open-ended-input" readonly rows="4">${escapeHtml(userData.answer)}</textarea></div>`;
      let explanationHtml = `<div class="explanation-box"><strong>📖 Эталонный ответ:</strong><br>${q.correct_answer}<br><br><strong>💡 Объяснение:</strong><br>${q.explanation}</div>`;
      html += explanationHtml;
      html += `<div class="next-btn-container"><button class="next-question-btn" onclick="nextQuestion()">Далее →</button></div>`;
    } else {
      const isCorrect = userData.answer === q.correct_answer;
      q.options.forEach((opt, optIdx) => {
        let highlightClass = '';
        if (optIdx === q.correct_answer) highlightClass = 'correct-highlight';
        if (optIdx === userData.answer && optIdx !== q.correct_answer) highlightClass = 'wrong-highlight';
        html += `<div class="quiz-option ${highlightClass}" data-opt-index="${optIdx}"><label>${opt}</label></div>`;
      });
      if (!isCorrect) {
        html += `<div class="explanation-box"><strong>📖 Объяснение:</strong><br>${q.explanation}</div>`;
        html += `<div class="next-btn-container"><button class="next-question-btn" onclick="nextQuestion()">Далее →</button></div>`;
      } else {
        setTimeout(() => nextQuestion(), 500);
      }
    }
  }
  html += `</div>`;
  quizContainer.innerHTML = html;

  if (!answered && !isOpenEnded) {
    const options = quizContainer.querySelectorAll('.quiz-option');
    options.forEach(opt => {
      opt.addEventListener('click', (e) => {
        if (quizAnswers[currentQuizIndex] && quizAnswers[currentQuizIndex].answered) return;
        const selectedIdx = parseInt(opt.getAttribute('data-opt-index'));
        selectAnswer(currentQuizIndex, selectedIdx);
      });
    });
  }
  setTimeout(() => renderMathInContainer(quizContainer), 50);
}

function selectAnswer(questionIdx, answerIdx) {
  if (quizAnswers[questionIdx] && quizAnswers[questionIdx].answered) return;
  const q = quizData[questionIdx];
  const isCorrect = answerIdx === q.correct_answer;
  quizAnswers[questionIdx] = { answer: answerIdx, answered: true };

  const quizItem = document.querySelector(`.quiz-item[data-question-idx="${questionIdx}"]`);
  if (!quizItem) return;
  const options = quizItem.querySelectorAll('.quiz-option');
  options.forEach((opt, idx) => {
    if (idx === q.correct_answer) opt.classList.add('correct-highlight');
    if (idx === answerIdx && idx !== q.correct_answer) opt.classList.add('wrong-highlight');
  });
  if (!isCorrect) {
    const explanationBox = document.createElement('div');
    explanationBox.className = 'explanation-box';
    explanationBox.innerHTML = `<strong>📖 Объяснение:</strong><br>${q.explanation}`;
    quizItem.appendChild(explanationBox);
    const nextBtnContainer = document.createElement('div');
    nextBtnContainer.className = 'next-btn-container';
    const nextBtn = document.createElement('button');
    nextBtn.className = 'next-question-btn';
    nextBtn.textContent = 'Далее →';
    nextBtn.onclick = () => nextQuestion();
    nextBtnContainer.appendChild(nextBtn);
    quizItem.appendChild(nextBtnContainer);
  } else {
    setTimeout(() => nextQuestion(), 500);
  }
}

window.checkOpenEndedAnswer = function() {
  const input = document.getElementById('openAnswer');
  if (!input) return;
  const userAnswer = input.value.trim();
  if (!userAnswer) return;
  const q = quizData[currentQuizIndex];
  quizAnswers[currentQuizIndex] = { answer: userAnswer, answered: true };
  renderQuizContent();
};

window.nextQuestion = function() {
  if (currentQuizIndex + 1 < quizData.length) {
    currentQuizIndex++;
    renderQuizContent();
  } else {
    currentQuizIndex = quizData.length;
    renderQuizContent();
  }
};

window.insertMarkdown = function(prefix, suffix = '') {
  const editor = document.getElementById('markdownEditor');
  if (!editor) return;
  const start = editor.selectionStart, end = editor.selectionEnd;
  const text = editor.value, selected = text.substring(start, end);
  editor.value = text.substring(0, start) + prefix + selected + suffix + text.substring(end);
  editor.focus();
  editor.setSelectionRange(start + prefix.length, end + prefix.length);
};

function simulateFileUpload(file) {
  if (!file) return;
  uploadStatusDiv.innerHTML = `<div class="file-info"><span class="loader"></span> Загрузка "${escapeHtml(file.name.slice(0, 20))}"...</div>`;
  generateBtn.disabled = true;
  fileUploaded = false;
  setTimeout(() => {
    uploadStatusDiv.innerHTML = `<div class="file-info">✅ Файл "${file.name.slice(0, 20)}" успешно загружен</div>`;
    fileUploaded = true;
    generateBtn.disabled = false;
  }, 2000);
}

function resetUpload() {
  if (generationInterval) clearInterval(generationInterval);
  isGenerating = false;
  currentTranscriptLines = [];
  fileUploaded = false;
  uploadStatusDiv.innerHTML = '';
  generateBtn.disabled = true;
  generateBtn.textContent = "Сгенерировать задания";
  currentSummaryData = [];
  currentQuizIndex = 0;
  quizAnswers = [];
  isEditMode = false;
  summaryReady = false;
  quizReady = false;
  summaryTabBtn.disabled = true; summaryTabBtn.style.opacity = '0.5';
  quizTabBtn.disabled = true; quizTabBtn.style.opacity = '0.5';
  setTabLoader(summaryTabBtn, false);
  setTabLoader(quizTabBtn, false);
  renderTranscript();
  showSummaryLoader();
  showQuizLoader();
  if (fileInput) fileInput.value = '';
  dropZone.classList.remove('drag-over');
}

function startGeneration() {
  if (!fileUploaded) { alert("Сначала загрузите аудиофайл"); return; }
  if (isGenerating) return;

  const activeTab = document.querySelector('.tab-btn.active').getAttribute('data-tab');
  if (activeTab !== 'transcript') {
    const transcriptTab = document.querySelector('.tab-btn[data-tab="transcript"]');
    transcriptTab.click();
  }

  if (generationInterval) clearInterval(generationInterval);
  currentTranscriptLines = [];
  isGenerating = true;
  generateBtn.disabled = true;
  generateBtn.textContent = "Генерация...";
  summaryReady = false;
  quizReady = false;
  summaryTabBtn.disabled = true; summaryTabBtn.style.opacity = '0.5';
  quizTabBtn.disabled = true; quizTabBtn.style.opacity = '0.5';
  setTabLoader(summaryTabBtn, true);
  setTabLoader(quizTabBtn, true);
  showSummaryLoader();
  showQuizLoader();
  const sourceLines = [...transcriptChunks];
  let pointer = 0;
  function addNextChunk() {
    if (!isGenerating) return;
    if (pointer >= sourceLines.length) {
      isGenerating = false;
      generateBtn.disabled = false;
      generateBtn.textContent = "Сгенерировать задания";
      renderTranscript();
      currentSummaryData = JSON.parse(JSON.stringify(summaryData));
      setTimeout(() => {
        summaryReady = true;
        summaryTabBtn.disabled = false; summaryTabBtn.style.opacity = '1';
        setTabLoader(summaryTabBtn, false);
        if (document.querySelector('.tab-btn[data-tab="summary"]').classList.contains('active')) {
          renderSummaryContent();
        } else {
          showSummaryLoader();
        }
      }, 2000);
      setTimeout(() => {
        quizReady = true;
        quizTabBtn.disabled = false; quizTabBtn.style.opacity = '1';
        setTabLoader(quizTabBtn, false);
        if (document.querySelector('.tab-btn[data-tab="quiz"]').classList.contains('active')) {
          renderQuizContent();
        } else {
          showQuizLoader();
        }
      }, 5000);
      return;
    }
    currentTranscriptLines.push({ ...sourceLines[pointer] });
    pointer++;
    renderTranscript();
    generationInterval = setTimeout(addNextChunk, 1500);
  }
  generationInterval = setTimeout(addNextChunk, 500);
}

function enterEditMode() {
  if (!currentSummaryData.length) { alert("Конспект ещё не сгенерирован"); return; }
  isEditMode = true;
  editSummaryBtn.textContent = "💾 Сохранить";
  renderSummaryContent();
}

function saveSummary() {
  const editor = document.getElementById('markdownEditor');
  if (editor) {
    const newData = markdownToJson(editor.value);
    if (newData.length > 0) {
      currentSummaryData = newData;
      isEditMode = false;
      editSummaryBtn.textContent = "✏️ Редактировать конспект";
      renderSummaryContent();
    } else alert("Ошибка: заголовки должны начинаться с ##");
  }
}

function onEditButtonClick() {
  if (!currentSummaryData.length) { alert("Конспект ещё не сгенерирован"); return; }
  if (isEditMode) saveSummary();
  else enterEditMode();
}

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('drag-over'); if (e.dataTransfer.files.length) simulateFileUpload(e.dataTransfer.files[0]); });
fileInput.addEventListener('change', (e) => { if (e.target.files.length) simulateFileUpload(e.target.files[0]); });
generateBtn.addEventListener('click', startGeneration);
resetUploadBtn.addEventListener('click', resetUpload);
editSummaryBtn.addEventListener('click', onEditButtonClick);

const tabBtns = document.querySelectorAll('.tab-btn');
const panels = { transcript: document.getElementById('panelTranscript'), summary: document.getElementById('panelSummary'), quiz: document.getElementById('panelQuiz') };
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.getAttribute('data-tab');
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    Object.values(panels).forEach(p => p.classList.remove('active-pane'));
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