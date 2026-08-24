let subjects = [];
let scheduledTasks = [];
let puzzleIndices = [];

let currentBaseDate = new Date();
const tagColors = ['tag-pink', 'tag-blue', 'tag-green', 'tag-purple'];

const addSubjectBtn = document.getElementById('addSubjectBtn');
const autoAssignBtn = document.getElementById('autoAssignBtn');
const targetDateInput = document.getElementById('targetDateInput');
const subjectTitleInput = document.getElementById('subjectTitle');
const subjectPagesInput = document.getElementById('subjectPages');
const subjectList = document.getElementById('subjectList');
const totalProgressEl = document.getElementById('totalProgress');
const totalProgressBarFill = document.getElementById('totalProgressBarFill');

const monthTitleEl = document.querySelector('.month-title');
const weekRangeEl = document.querySelector('.week-selector span');
const prevWeekBtn = document.querySelectorAll('.nav-btn')[0];
const nextWeekBtn = document.querySelectorAll('.nav-btn')[1];

const puzzleImageInput = document.getElementById('puzzleImageInput');
const puzzleImageBg = document.getElementById('puzzleImageBg');

let isDropZoneSetup = false;

// 初期読み込み
loadData();
initPuzzlePanels();
loadSavedPuzzleImage();

document.addEventListener('click', (e) => {
  if (!e.target.matches('.menu-btn')) {
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
      menu.classList.remove('show');
    });
  }
});

if (puzzleImageInput) {
  puzzleImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
      const base64Image = event.target.result;
      applyPuzzleImage(base64Image);
      localStorage.setItem('study_puzzle_image', base64Image);
      alert('パズルの画像を変更したよ！');
    };
    reader.readAsDataURL(file);
  });
}

function loadSavedPuzzleImage() {
  const savedImage = localStorage.getItem('study_puzzle_image');
  if (savedImage) {
    applyPuzzleImage(savedImage);
  } else {
    applyPuzzleImage('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80');
  }
}

function applyPuzzleImage(imageSrc) {
  if (!puzzleImageBg) return;
  const img = new Image();
  img.src = imageSrc;
  img.onload = function() {
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    const wrapper = document.querySelector('.puzzle-wrapper');
    if (wrapper) {
      // 縦長画像（高さ >= 幅）の場合はアスペクト比を1:1(正方形)などに固定してトリミング
      if (height >= width) {
        wrapper.style.aspectRatio = '1 / 1';
      } else {
        wrapper.style.aspectRatio = `${width} / ${height}`;
      }
    }
    puzzleImageBg.style.backgroundImage = `url('${imageSrc}')`;
  };
}

prevWeekBtn.addEventListener('click', () => {
  currentBaseDate.setDate(currentBaseDate.getDate() - 7);
  render();
});

nextWeekBtn.addEventListener('click', () => {
  currentBaseDate.setDate(currentBaseDate.getDate() + 7);
  render();
});

addSubjectBtn.addEventListener('click', () => {
  const title = subjectTitleInput.value.trim();
  const totalPages = parseInt(subjectPagesInput.value, 10);
  if (!title || isNaN(totalPages) || totalPages <= 0) {
    alert('教科名と総ページ数を入力してね！');
    return;
  }
  const colorClass = tagColors[subjects.length % tagColors.length];
  subjects.push({ id: Date.now(), title, totalPages, colorClass });
  subjectTitleInput.value = '';
  subjectPagesInput.value = '';
  saveData();
  render();
});

autoAssignBtn.addEventListener('click', () => {
  if (subjects.length === 0) { alert('まずは課題を登録してね！'); return; }
  const targetDateStr = targetDateInput.value;
  if (!targetDateStr) { alert('目標の日付を選択してください！'); return; }
  const targetDate = new Date(targetDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (isNaN(targetDate.getTime()) || targetDate < today) { alert('今日以降の日付を選んでね！'); return; }
  const availableDates = [];
  let curr = new Date(today);
  while (curr <= targetDate) {
    availableDates.push(formatDateKey(curr));
    curr.setDate(curr.getDate() + 1);
  }
  if (availableDates.length === 0) return;
  scheduledTasks = scheduledTasks.filter(t => t.completed);
  subjects.forEach(subject => {
    const completedPages = scheduledTasks.filter(t => Number(t.subjectId) === Number(subject.id) && t.completed).reduce((sum, t) => sum + t.pages, 0);
    let remaining = Math.max(0, subject.totalPages - completedPages);
    if (remaining <= 0) return;
    const dailyPageMap = {};
    const shuffledDates = [...availableDates].sort(() => Math.random() - 0.5);
    const basePagesPerDay = Math.max(1, Math.ceil(remaining / shuffledDates.length));
    let dateIndex = 0;
    while (remaining > 0) {
      const dateKey = shuffledDates[dateIndex % shuffledDates.length];
      const randomPages = Math.min(remaining, Math.floor(Math.random() * basePagesPerDay) + 1);
      if (!dailyPageMap[dateKey]) dailyPageMap[dateKey] = 0;
      dailyPageMap[dateKey] += randomPages;
      remaining -= randomPages;
      dateIndex++;
    }
    Object.keys(dailyPageMap).forEach(dateKey => {
      scheduledTasks.push({ id: Date.now() + Math.random(), subjectId: subject.id, title: subject.title, dateKey, pages: dailyPageMap[dateKey], completed: false });
    });
  });
  saveData();
  render();
  alert('スケジュールを自動作成したよ！');
});

function render() {
  updateCalendarHeader();
  renderSubjects();
  renderSchedule();
  calculateTotalProgress();
  renderProgressBars();
  setupDragAndDrop();
}

function initPuzzlePanels() {
  const puzzleGrid = document.getElementById('puzzleGrid');
  if (!puzzleGrid) return;
  puzzleGrid.innerHTML = '';
  for (let i = 0; i < 100; i++) {
    const panel = document.createElement('div');
    panel.className = 'puzzle-panel';
    panel.setAttribute('data-index', i);
    puzzleGrid.appendChild(panel);
  }
  if (!puzzleIndices || puzzleIndices.length !== 100) {
    puzzleIndices = Array.from({ length: 100 }, (_, i) => i);
    for (let i = puzzleIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [puzzleIndices[i], puzzleIndices[j]] = [puzzleIndices[j], puzzleIndices[i]];
    }
    saveData();
  }
}

function updatePuzzle(percent) {
  const panels = document.querySelectorAll('.puzzle-panel');
  if (panels.length === 0) return;
  const openCount = Math.min(100, Math.max(0, percent));
  panels.forEach(panel => panel.classList.remove('opened'));
  for (let i = 0; i < openCount; i++) {
    const panelIndex = puzzleIndices[i];
    if (panels[panelIndex]) panels[panelIndex].classList.add('opened');
  }
}

function getWeekRange(date) {
  const tempDate = new Date(date);
  const day = tempDate.getDay();
  const diffToMonday = tempDate.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(tempDate.setDate(diffToMonday));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { monday, sunday };
}

function formatDateKey(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

function updateCalendarHeader() {
  const { monday, sunday } = getWeekRange(currentBaseDate);
  monthTitleEl.textContent = `${monday.getMonth() + 1}月`;
  weekRangeEl.textContent = `${monday.getDate()}日 〜 ${sunday.getDate()}日`;
  const dayRows = document.querySelectorAll('.day-row');
  const daysOfWeek = ['月', '火', '水', '木', '金', '土', '日'];
  daysOfWeek.forEach((dayName, index) => {
    const targetDate = new Date(monday);
    targetDate.setDate(monday.getDate() + index);
    const dateKey = formatDateKey(targetDate);
    const row = dayRows[index];
    row.setAttribute('data-date-key', dateKey);
    const label = row.querySelector('.day-label');
    label.innerHTML = `${dayName}<br><span style="font-size:10px; font-weight:normal;">${targetDate.getMonth()+1}/${targetDate.getDate()}</span>`;
  });
}

function renderSubjects() {
  subjectList.innerHTML = '';
  subjects.forEach(subject => {
    const assignedPages = scheduledTasks
      .filter(t => Number(t.subjectId) === Number(subject.id))
      .reduce((sum, t) => sum + t.pages, 0);

    const completedPages = scheduledTasks
      .filter(t => Number(t.subjectId) === Number(subject.id) && t.completed)
      .reduce((sum, t) => sum + t.pages, 0);

    const remainingPages = Math.max(0, subject.totalPages - completedPages);
    const percent = Math.min(100, Math.round((completedPages / subject.totalPages) * 100));

    const card = document.createElement('div');
    card.className = 'subject-card';
    card.innerHTML = `
      <div class="card-header">
        <span class="tag ${subject.colorClass}">${subject.title}</span>
        <div class="menu-container">
          <button class="menu-btn" data-id="${subject.id}">⋮</button>
          <div class="dropdown-menu" id="menu-${subject.id}">
            <button class="edit-btn" data-id="${subject.id}">編集</button>
            <button class="delete-btn" data-id="${subject.id}">削除</button>
          </div>
        </div>
      </div>
      <div class="card-stats">
        <div>達成: ${completedPages}p / ${subject.totalPages}p (${percent}%)</div>
        <div style="font-size: 11px; color: #666; margin-top: 2px;">スケジュール済: ${assignedPages}p</div>
      </div>
      <div class="drag-item" draggable="true" data-subject-id="${subject.id}">
        <span class="drag-handle-label">⠿ 掴んで枠へポイ</span>
        <div>
          <input type="number" class="page-input" placeholder="p数" min="1" max="${remainingPages}" style="width: 45px;">
          <span style="font-size:11px;">p</span>
        </div>
      </div>
    `;
    subjectList.appendChild(card);
  });

  document.querySelectorAll('.menu-btn').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      document.querySelectorAll('.dropdown-menu').forEach(m => {
        if (m.id !== `menu-${id}`) m.classList.remove('show');
      });
      document.getElementById(`menu-${id}`).classList.toggle('show');
    };
  });

  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.onclick = () => window.editSubject(btn.dataset.id);
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.onclick = () => window.deleteSubject(btn.dataset.id);
  });
}

function renderSchedule() {
  const dayRows = document.querySelectorAll('.day-row');
  dayRows.forEach(row => {
    const dateKey = row.getAttribute('data-date-key');
    const container = row.querySelector('.task-container');
    container.innerHTML = '';
    const tasks = scheduledTasks.filter(t => t.dateKey === dateKey);
    tasks.forEach(task => {
      const taskEl = document.createElement('div');
      taskEl.className = `schedule-task ${task.completed ? 'completed' : ''}`;
      taskEl.setAttribute('draggable', 'true');
      taskEl.setAttribute('data-task-id', task.id);
      taskEl.innerHTML = `
        <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
          <label>
            <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${task.id})">
            ${task.title}
          </label>
          <button onclick="removeTask(${task.id})" style="border:none; background:none; cursor:pointer; color:#888; font-size:10px; margin-left:4px;">✕</button>
        </div>
        <span style="font-size:10px; margin-left:18px;">${task.pages}p.</span>
      `;
      container.appendChild(taskEl);
    });
  });
}

function renderProgressBars() {
  const progressGrid = document.getElementById('progressGrid');
  if (!progressGrid) return;
  progressGrid.innerHTML = '';
  if (subjects.length === 0) {
    progressGrid.innerHTML = '<div style="font-size:11px; color:#888; grid-column: span 2;">課題が登録されていません</div>';
    return;
  }
  subjects.forEach(subject => {
    const completedPages = scheduledTasks.filter(t => Number(t.subjectId) === Number(subject.id) && t.completed).reduce((sum, t) => sum + t.pages, 0);
    const percent = Math.min(100, Math.round((completedPages / subject.totalPages) * 100));
    const item = document.createElement('div');
    item.className = 'progress-item';
    item.innerHTML = `
      <div class="progress-info">
        <span>${subject.title}</span>
        <span>${percent}% (${completedPages}/${subject.totalPages}p)</span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" style="width: ${percent}%;"></div>
      </div>
    `;
    progressGrid.appendChild(item);
  });
}

function setupDragAndDrop() {
  const dragItems = document.querySelectorAll('.drag-item');
  const scheduleTasks = document.querySelectorAll('.schedule-task');
  const dropZones = document.querySelectorAll('.drop-zone');
  dragItems.forEach(item => {
    item.ondragstart = (e) => {
      const subjectId = item.getAttribute('data-subject-id');
      const pageInput = item.querySelector('.page-input');
      const pages = parseInt(pageInput.value, 10) || 5;
      e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'new-task', subjectId: parseInt(subjectId, 10), pages: pages }));
    };
  });
  scheduleTasks.forEach(taskEl => {
    taskEl.ondragstart = (e) => {
      const taskId = taskEl.getAttribute('data-task-id');
      e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'move-task', taskId: Number(taskId) }));
      e.stopPropagation();
    };
  });
  if (!isDropZoneSetup) {
    dropZones.forEach(zone => {
      zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
      zone.addEventListener('dragleave', () => { zone.classList.remove('drag-over'); });
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        const dataText = e.dataTransfer.getData('text/plain');
        if (!dataText) return;
        const data = JSON.parse(dataText);
        const row = zone.parentElement;
        const targetDateKey = row.getAttribute('data-date-key');
        if (data.type === 'new-task') {
          const subject = subjects.find(s => Number(s.id) === Number(data.subjectId));
          if (subject) {
            scheduledTasks.push({ id: Date.now(), subjectId: subject.id, title: subject.title, dateKey: targetDateKey, pages: data.pages, completed: false });
            saveData(); render();
          }
        } else if (data.type === 'move-task') {
          const task = scheduledTasks.find(t => Number(t.id) === Number(data.taskId));
          if (task) { task.dateKey = targetDateKey; saveData(); render(); }
        }
      });
    });
    isDropZoneSetup = true;
  }
}

window.editSubject = function(subjectId) {
  const subject = subjects.find(s => String(s.id) === String(subjectId));
  if (!subject) return;
  const newPagesStr = prompt(`「${subject.title}」の新しい総ページ数を入力してください:`, subject.totalPages);
  if (newPagesStr === null) return;
  const newPages = parseInt(newPagesStr, 10);
  if (isNaN(newPages) || newPages <= 0) { alert('正しいページ数を入力してください！'); return; }
  subject.totalPages = newPages;
  saveData(); render();
};

window.deleteSubject = function(subjectId) {
  const subject = subjects.find(s => String(s.id) === String(subjectId));
  if (!subject) {
    alert('対象の課題が見つかりませんでした。');
    return;
  }
  if (confirm(`「${subject.title}」を削除しますか？\n（関連するスケジュールも消去されます）`)) {
    subjects = subjects.filter(s => String(s.id) !== String(subjectId));
    scheduledTasks = scheduledTasks.filter(t => String(t.subjectId) !== String(subjectId));
    saveData(); 
    render();
  }
};

window.toggleTask = function(taskId) {
  const task = scheduledTasks.find(t => Number(t.id) === Number(taskId));
  if (task) { task.completed = !task.completed; saveData(); render(); }
};

window.removeTask = function(taskId) {
  scheduledTasks = scheduledTasks.filter(t => Number(t.id) !== Number(taskId));
  saveData(); render();
};

function calculateTotalProgress() {
  if (subjects.length === 0) {
    if (totalProgressEl) totalProgressEl.textContent = '0';
    if (totalProgressBarFill) totalProgressBarFill.style.width = '0%';
    updatePuzzle(0);
    return;
  }
  const totalAllPages = subjects.reduce((sum, s) => sum + s.totalPages, 0);
  const totalCompletedPages = scheduledTasks.filter(t => t.completed).reduce((sum, t) => sum + t.pages, 0);
  const totalPercent = Math.min(100, Math.round((totalCompletedPages / totalAllPages) * 100));
  if (totalProgressEl) totalProgressEl.textContent = totalPercent;
  if (totalProgressBarFill) totalProgressBarFill.style.width = `${totalPercent}%`;
  updatePuzzle(totalPercent);
}

function saveData() {
  localStorage.setItem('study_subjects', JSON.stringify(subjects));
  localStorage.setItem('study_tasks', JSON.stringify(scheduledTasks));
  localStorage.setItem('study_puzzle_indices', JSON.stringify(puzzleIndices));
}

function loadData() {
  const savedSubjects = localStorage.getItem('study_subjects');
  const savedTasks = localStorage.getItem('study_tasks');
  const savedIndices = localStorage.getItem('study_puzzle_indices');
  if (savedSubjects) subjects = JSON.parse(savedSubjects);
  if (savedTasks) scheduledTasks = JSON.parse(savedTasks);
  if (savedIndices) puzzleIndices = JSON.parse(savedIndices);
}

render();