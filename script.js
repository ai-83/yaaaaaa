let subjects = [];
let scheduledTasks = [];

let currentBaseDate = new Date();
const tagColors = ['tag-pink', 'tag-blue', 'tag-green', 'tag-purple'];

const addSubjectBtn = document.getElementById('addSubjectBtn');
const subjectTitleInput = document.getElementById('subjectTitle');
const subjectPagesInput = document.getElementById('subjectPages');
const subjectList = document.getElementById('subjectList');
const totalProgressEl = document.getElementById('totalProgress');

const monthTitleEl = document.querySelector('.month-title');
const weekRangeEl = document.querySelector('.week-selector span');
const prevWeekBtn = document.querySelectorAll('.nav-btn')[0];
const nextWeekBtn = document.querySelectorAll('.nav-btn')[1];

let isDropZoneSetup = false;

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

  subjects.push({
    id: Date.now(),
    title: title,
    totalPages: totalPages,
    colorClass: colorClass
  });

  subjectTitleInput.value = '';
  subjectPagesInput.value = '';

  render();
});

function render() {
  updateCalendarHeader();
  renderSubjects();
  renderSchedule();
  calculateTotalProgress();
  setupDragAndDrop();
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
    const completedPages = scheduledTasks
      .filter(t => Number(t.subjectId) === Number(subject.id) && t.completed)
      .reduce((sum, t) => sum + t.pages, 0);

    // 負の数にならないように Math.max(0, 残りページ) で制御
    const remainingPages = Math.max(0, subject.totalPages - completedPages);
    
    // 達成度が100%を超えないように制御 (0〜100%)
    const percent = Math.min(100, Math.round((completedPages / subject.totalPages) * 100));

    const card = document.createElement('div');
    card.className = 'subject-card';
    card.innerHTML = `
      <span class="tag ${subject.colorClass}">${subject.title}</span>
      <div class="card-stats">
        ${remainingPages}p / ${subject.totalPages}p / ${percent}%
      </div>
      
      <div class="drag-item" draggable="true" data-subject-id="${subject.id}">
        <span class="drag-handle-label">⠿ 掴んで枠へポイ</span>
        <div>
          <input type="number" class="page-input" placeholder="p数" min="1" max="${remainingPages}" style="width: 50px;">
          <span style="font-size:11px;">p</span>
        </div>
      </div>
    `;
    subjectList.appendChild(card);
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
      taskEl.innerHTML = `
        <label>
          <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${task.id})">
          ${task.title}
        </label>
        <span style="font-size:10px; margin-left:18px;">${task.pages}p.</span>
      `;
      container.appendChild(taskEl);
    });
  });
}

function setupDragAndDrop() {
  const dragItems = document.querySelectorAll('.drag-item');
  const dropZones = document.querySelectorAll('.drop-zone');

  dragItems.forEach(item => {
    item.ondragstart = (e) => {
      const subjectId = item.getAttribute('data-subject-id');
      const pageInput = item.querySelector('.page-input');
      const pages = parseInt(pageInput.value, 10) || 5;

      e.dataTransfer.setData('text/plain', JSON.stringify({
        subjectId: parseInt(subjectId, 10),
        pages: pages
      }));
    };
  });

  if (!isDropZoneSetup) {
    dropZones.forEach(zone => {
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('drag-over');
      });

      zone.addEventListener('dragleave', () => {
        zone.classList.remove('drag-over');
      });

      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');

        const dataText = e.dataTransfer.getData('text/plain');
        if (!dataText) return;

        const data = JSON.parse(dataText);
        const row = zone.parentElement;
        const dateKey = row.getAttribute('data-date-key');
        const subject = subjects.find(s => Number(s.id) === Number(data.subjectId));

        if (subject) {
          scheduledTasks.push({
            id: Date.now(),
            subjectId: subject.id,
            title: subject.title,
            dateKey: dateKey,
            pages: data.pages,
            completed: false
          });
          render();
        }
      });
    });
    isDropZoneSetup = true;
  }
}

function toggleTask(taskId) {
  const task = scheduledTasks.find(t => Number(t.id) === Number(taskId));
  if (task) {
    task.completed = !task.completed;
    render();
  }
}

function calculateTotalProgress() {
  if (subjects.length === 0) {
    totalProgressEl.textContent = '0';
    return;
  }

  const totalAllPages = subjects.reduce((sum, s) => sum + s.totalPages, 0);
  const totalCompletedPages = scheduledTasks
    .filter(t => t.completed)
    .reduce((sum, t) => sum + t.pages, 0);

  // 全体進捗も最大100%までで制御
  const totalPercent = Math.min(100, Math.round((totalCompletedPages / totalAllPages) * 100));
  totalProgressEl.textContent = totalPercent;
}

render();