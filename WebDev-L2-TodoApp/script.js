'use strict';
/* ==========================================================================
   ARCLIGHT — script.js
   A dependency-free task workspace. Organized into small modules:
   Storage -> State -> Utils -> Renderers -> Actions -> Events -> Init
   ========================================================================== */

/* ---------------------------------------------------------------------- *
 *  Storage
 * ---------------------------------------------------------------------- */
const STORAGE_KEY = 'arclight.v1';

const Storage = {
  load(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return null;
      return JSON.parse(raw);
    }catch(e){
      console.warn('Arclight: could not read saved data', e);
      return null;
    }
  },
  save(state){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }catch(e){
      console.warn('Arclight: could not persist data', e);
    }
  }
};

/* ---------------------------------------------------------------------- *
 *  Default data
 * ---------------------------------------------------------------------- */
const DEFAULT_CATEGORIES = [
  { id:'personal', name:'Personal', color:'#7FA582', builtin:true },
  { id:'study',    name:'Study',    color:'#5B9BD9', builtin:true },
  { id:'work',     name:'Work',     color:'#E8A33D', builtin:true },
  { id:'health',   name:'Health',   color:'#E2665E', builtin:true },
  { id:'shopping', name:'Shopping', color:'#C77DC0', builtin:true },
];

const SWATCH_COLORS = ['#E8A33D','#7FA582','#5B9BD9','#E2665E','#C77DC0','#4FB6A8','#D9A05B','#8B7DFF'];

const PRIORITY_WEIGHT = { critical:0, high:1, medium:2, low:3 };

function seedTasks(){
  const now = Date.now();
  const today = new Date(); today.setHours(0,0,0,0);
  const iso = d => new Date(d).toISOString().slice(0,10);
  return [
    {
      id: uid(), title:'Welcome to Arclight — try dragging me', description:'Reorder tasks by dragging the handle on the left. Click the circle to complete a task.',
      category:'personal', priority:'medium', dueDate: iso(today), dueTime:'', tags:['welcome'],
      estimate:'2m', notes:'', completed:false, archived:false, order:0, createdAt: now, completedAt:null
    },
    {
      id: uid(), title:'Review the quarterly deck', description:'Check numbers against finance export before the sync.',
      category:'work', priority:'critical', dueDate: iso(today), dueTime:'15:30', tags:['deep-work','client'],
      estimate:'45m', notes:'', completed:false, archived:false, order:1, createdAt: now-1000, completedAt:null
    },
    {
      id: uid(), title:'Morning run', description:'', category:'health', priority:'low',
      dueDate: iso(today), dueTime:'07:00', tags:[], estimate:'30m', notes:'', completed:true, archived:false,
      order:2, createdAt: now-90000, completedAt: now-40000
    },
    {
      id: uid(), title:'Finish chapter 4 problem set', description:'Focus on integrals by parts.',
      category:'study', priority:'high', dueDate: iso(new Date(today.getTime()+86400000)), dueTime:'18:00',
      tags:['math'], estimate:'1h', notes:'', completed:false, archived:false, order:3, createdAt: now-2000, completedAt:null
    },
    {
      id: uid(), title:'Buy groceries for the week', description:'', category:'shopping', priority:'medium',
      dueDate: iso(new Date(today.getTime()+2*86400000)), dueTime:'', tags:[], estimate:'20m', notes:'',
      completed:false, archived:false, order:4, createdAt: now-3000, completedAt:null
    }
  ];
}

/* ---------------------------------------------------------------------- *
 *  State
 * ---------------------------------------------------------------------- */
const State = {
  tasks: [],
  categories: [],
  settings: { theme:'dusk' },
  ui: {
    filter:'all',            // all|today|tomorrow|week|overdue|pending|completed|archive
    navFilter:null,          // sidebar-driven filter override
    categoryFilter:'all',
    priorityFilter:'all',
    sort:'manual',
    search:'',
    selectMode:false,
    selectedIds:new Set(),
    calendarViewDate:new Date(),
    calendarSelectedDate:null,
  }
};

function persist(){
  Storage.save({
    tasks: State.tasks,
    categories: State.categories,
    settings: State.settings
  });
}

function initState(){
  const saved = Storage.load();
  if(saved && Array.isArray(saved.tasks) && saved.tasks.length){
    State.tasks = saved.tasks;
    State.categories = saved.categories && saved.categories.length ? saved.categories : DEFAULT_CATEGORIES.slice();
    State.settings = Object.assign({theme:'dusk'}, saved.settings || {});
  } else {
    State.tasks = seedTasks();
    State.categories = DEFAULT_CATEGORIES.slice();
    persist();
  }
}

/* ---------------------------------------------------------------------- *
 *  Utils
 * ---------------------------------------------------------------------- */
function uid(){ return 't_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,8); }

function todayISO(){ const d = new Date(); d.setHours(0,0,0,0); return isoFromDate(d); }
function isoFromDate(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function dateFromISO(s){ const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); }

function isToday(iso){ return iso === todayISO(); }
function isTomorrow(iso){
  const t = new Date(); t.setDate(t.getDate()+1); t.setHours(0,0,0,0);
  return iso === isoFromDate(t);
}
function isThisWeek(iso){
  if(!iso) return false;
  const d = dateFromISO(iso);
  const now = new Date(); now.setHours(0,0,0,0);
  const end = new Date(now); end.setDate(now.getDate() + (7 - now.getDay()));
  return d >= now && d <= end;
}
function isOverdue(task){
  if(!task.dueDate || task.completed) return false;
  const d = dateFromISO(task.dueDate);
  const now = new Date(); now.setHours(0,0,0,0);
  if(d < now) return true;
  if(d.getTime() === now.getTime() && task.dueTime){
    const [h,m] = task.dueTime.split(':').map(Number);
    const due = new Date(); due.setHours(h,m,0,0);
    return new Date() > due;
  }
  return false;
}
function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function highlight(text, query){
  const safe = escapeHtml(text);
  if(!query) return safe;
  try{
    const re = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + ')', 'ig');
    return safe.replace(re, '<mark>$1</mark>');
  }catch(e){ return safe; }
}
function categoryById(id){ return State.categories.find(c => c.id === id) || State.categories[0]; }
function formatDueLabel(task){
  if(!task.dueDate) return '';
  let label;
  if(isToday(task.dueDate)) label = 'Today';
  else if(isTomorrow(task.dueDate)) label = 'Tomorrow';
  else label = dateFromISO(task.dueDate).toLocaleDateString(undefined,{month:'short', day:'numeric'});
  if(task.dueTime) label += ' · ' + formatTime(task.dueTime);
  return label;
}
function formatTime(t){
  const [h,m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2,'0')} ${period}`;
}

/* ---------------------------------------------------------------------- *
 *  Toasts
 * ---------------------------------------------------------------------- */
const ToastIcons = {
  success:'<svg viewBox="0 0 16 16" width="10" height="10" fill="none"><path d="m3 8 3.5 3.5L13 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  info:'<svg viewBox="0 0 16 16" width="10" height="10" fill="none"><circle cx="8" cy="8" r="1"/><path d="M8 7v5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  warning:'<svg viewBox="0 0 16 16" width="10" height="10" fill="none"><path d="M8 2 15 14H1L8 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>'
};
function showToast(message, type='info', actionLabel=null, actionFn=null){
  const stack = document.getElementById('toast-stack');
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.setAttribute('role','status');
  el.innerHTML = `
    <span class="toast__icon">${ToastIcons[type] || ToastIcons.info}</span>
    <span class="toast__msg">${escapeHtml(message)}</span>
    ${actionLabel ? `<button class="toast__action">${escapeHtml(actionLabel)}</button>` : ''}
  `;
  if(actionLabel && actionFn){
    el.querySelector('.toast__action').addEventListener('click', () => {
      actionFn();
      dismiss();
    });
  }
  stack.appendChild(el);
  const timer = setTimeout(dismiss, 5000);
  function dismiss(){
    clearTimeout(timer);
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 200);
  }
}

/* ---------------------------------------------------------------------- *
 *  Filtering / sorting
 * ---------------------------------------------------------------------- */
function getVisibleTasks(){
  const ui = State.ui;
  let list = State.tasks.filter(t => !t.archived);

  const activeFilter = ui.navFilter || ui.filter;

  if(activeFilter === 'archive'){
    list = State.tasks.filter(t => t.archived);
  } else {
    switch(activeFilter){
      case 'today': list = list.filter(t => t.dueDate && isToday(t.dueDate) && !t.completed); break;
      case 'tomorrow': list = list.filter(t => t.dueDate && isTomorrow(t.dueDate)); break;
      case 'week': list = list.filter(t => t.dueDate && isThisWeek(t.dueDate)); break;
      case 'upcoming': list = list.filter(t => t.dueDate && dateFromISO(t.dueDate) >= new Date(new Date().setHours(0,0,0,0)) && !t.completed); break;
      case 'overdue': list = list.filter(t => isOverdue(t)); break;
      case 'pending': list = list.filter(t => !t.completed); break;
      case 'completed': list = list.filter(t => t.completed); break;
      default: break; // 'all'
    }
  }

  if(ui.categoryFilter !== 'all'){
    list = list.filter(t => t.category === ui.categoryFilter);
  }
  if(ui.priorityFilter !== 'all'){
    list = list.filter(t => t.priority === ui.priorityFilter);
  }
  if(ui.calendarSelectedDate){
    list = list.filter(t => t.dueDate === ui.calendarSelectedDate);
  }
  if(ui.search.trim()){
    const q = ui.search.trim().toLowerCase();
    list = list.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      (t.tags||[]).some(tag => tag.toLowerCase().includes(q))
    );
  }

  switch(ui.sort){
    case 'due':
      list = list.slice().sort((a,b) => (a.dueDate||'9999').localeCompare(b.dueDate||'9999') || (a.dueTime||'99:99').localeCompare(b.dueTime||'99:99'));
      break;
    case 'priority':
      list = list.slice().sort((a,b) => PRIORITY_WEIGHT[a.priority]-PRIORITY_WEIGHT[b.priority]);
      break;
    case 'created':
      list = list.slice().sort((a,b) => b.createdAt - a.createdAt);
      break;
    case 'alpha':
      list = list.slice().sort((a,b) => a.title.localeCompare(b.title));
      break;
    default:
      list = list.slice().sort((a,b) => a.order - b.order);
  }
  return list;
}

/* ---------------------------------------------------------------------- *
 *  Rendering
 * ---------------------------------------------------------------------- */
const el = id => document.getElementById(id);

function renderAll(){
  renderSidebarCounts();
  renderCategoryList();
  renderCategorySelect();
  renderTaskList();
  renderDayArc();
  renderCalendar();
  renderStats();
  renderGreeting();
}

function renderGreeting(){
  const now = new Date();
  const h = now.getHours();
  const greeting = h < 5 ? 'Still up?' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Winding down';
  el('dash-greeting').textContent = greeting;
  el('dash-date').textContent = now.toLocaleDateString(undefined,{weekday:'long', month:'long', day:'numeric'});
  const pending = State.tasks.filter(t=>!t.archived && !t.completed).length;
  el('dash-subline').textContent = pending === 0
    ? 'Everything is clear. Enjoy the quiet.'
    : `${pending} task${pending===1?'':'s'} left to shape today.`;
}

function renderSidebarCounts(){
  const active = State.tasks.filter(t => !t.archived);
  el('count-today').textContent = active.filter(t => t.dueDate && isToday(t.dueDate) && !t.completed).length;
  el('count-upcoming').textContent = active.filter(t => t.dueDate && dateFromISO(t.dueDate) > new Date(new Date().setHours(0,0,0,0)) && !t.completed).length;
  el('count-overdue').textContent = active.filter(isOverdue).length;

  document.querySelectorAll('.nav-item[data-filter]').forEach(btn => {
    btn.classList.toggle('is-active', State.ui.navFilter === btn.dataset.filter);
  });
  document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
    btn.classList.toggle('is-active', !State.ui.navFilter);
  });
}

function renderCategoryList(){
  const list = el('category-list');
  list.innerHTML = '';
  const counts = {};
  State.tasks.filter(t=>!t.archived && !t.completed).forEach(t => counts[t.category] = (counts[t.category]||0)+1);

  State.categories.forEach(cat => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'category-pill-btn' + (State.ui.categoryFilter === cat.id ? ' is-active' : '');
    btn.type = 'button';
    btn.innerHTML = `<span class="cat-swatch" style="background:${cat.color}"></span><span>${escapeHtml(cat.name)}</span><span class="nav-count">${counts[cat.id]||0}</span>`;
    btn.addEventListener('click', () => {
      State.ui.categoryFilter = State.ui.categoryFilter === cat.id ? 'all' : cat.id;
      State.ui.navFilter = null;
      renderAll();
    });
    li.appendChild(btn);
    list.appendChild(li);
  });
}

function renderCategorySelect(){
  const sel = el('field-category');
  const prevValue = sel.value;
  sel.innerHTML = State.categories.map(c =>
    `<option value="${c.id}" style="color:${c.color || DEFAULT_CATEGORY_COLOR}">● ${escapeHtml(c.name)}</option>`
  ).join('');
  if(prevValue && State.categories.some(c => c.id === prevValue)) sel.value = prevValue;
}

function renderTaskList(){
  const listEl = el('task-list');
  const tasks = getVisibleTasks();
  const emptyState = el('empty-state');

  el('list-heading').textContent = headingForCurrentFilter();
  el('list-meta').textContent = tasks.length ? `${tasks.length} task${tasks.length===1?'':'s'}` : '';

  listEl.innerHTML = '';

  if(!tasks.length){
    emptyState.hidden = false;
    const isSearch = State.ui.search.trim().length > 0;
    el('empty-state-title').textContent = isSearch ? 'No matches' : 'Nothing here yet';
    el('empty-state-body').textContent = isSearch
      ? 'Try a different search term or clear your filters.'
      : (State.ui.navFilter === 'archive' ? 'Archived tasks will show up here.' : "Add a task above and it'll take its place on the arc.");
    return;
  }
  emptyState.hidden = true;

  tasks.forEach(task => listEl.appendChild(buildTaskCard(task)));
}

function headingForCurrentFilter(){
  const f = State.ui.navFilter || State.ui.filter;
  const map = { all:"Today's focus", today:'Today', tomorrow:'Tomorrow', week:'This week', overdue:'Overdue',
    pending:'Pending', completed:'Completed', archive:'Archive', upcoming:'Upcoming' };
  return map[f] || "Today's focus";
}

function buildTaskCard(task){
  const li = document.createElement('li');
  li.className = 'task-card' + (task.completed ? ' is-complete' : '');
  li.draggable = State.ui.sort === 'manual' && !State.ui.navFilter;
  li.dataset.id = task.id;

  const cat = categoryById(task.category);
  const overdue = isOverdue(task);
  const q = State.ui.search.trim();

  const tagsHtml = (task.tags||[]).map(tg => `<span class="meta-pill tag-pill">#${escapeHtml(tg)}</span>`).join('');
  const dueHtml = task.dueDate ? `<span class="meta-pill ${overdue?'is-overdue':''}">
      <svg viewBox="0 0 20 20" fill="none"><rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M3 8h14" stroke="currentColor" stroke-width="1.6"/></svg>
      ${escapeHtml(formatDueLabel(task))}${overdue?' · overdue':''}
    </span>` : '';
  const estHtml = task.estimate ? `<span class="meta-pill">⏱ ${escapeHtml(task.estimate)}</span>` : '';

  li.innerHTML = `
    <span class="task-card__drag" aria-hidden="true" title="Drag to reorder">
      <svg viewBox="0 0 10 16" width="10" height="16" fill="currentColor"><circle cx="2" cy="2" r="1.3"/><circle cx="8" cy="2" r="1.3"/><circle cx="2" cy="8" r="1.3"/><circle cx="8" cy="8" r="1.3"/><circle cx="2" cy="14" r="1.3"/><circle cx="8" cy="14" r="1.3"/></svg>
    </span>
    ${State.ui.selectMode ? `<input type="checkbox" class="task-card__select" aria-label="Select task" ${State.ui.selectedIds.has(task.id)?'checked':''}/>` : `
    <button class="task-card__check" aria-pressed="${task.completed}" aria-label="${task.completed?'Mark incomplete':'Mark complete'}">
      <svg viewBox="0 0 16 16" fill="none"><path d="m3 8 3.5 3.5L13 5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>`}
    <div class="task-card__body">
      <div class="task-card__title-row">
        <span class="priority-dot" style="background:var(--priority-${task.priority})"></span>
        <span class="task-card__title">${highlight(task.title, q)}</span>
      </div>
      ${task.description ? `<p class="task-card__desc">${highlight(task.description, q)}</p>` : ''}
      <div class="task-card__meta">
        <span class="meta-pill" style="color:${cat.color}"><span class="cat-swatch" style="background:${cat.color}"></span>${escapeHtml(cat.name)}</span>
        <span class="meta-pill priority-${task.priority}">${task.priority}</span>
        ${dueHtml}
        ${estHtml}
        ${tagsHtml}
      </div>
    </div>
    <div class="task-card__actions">
      <button class="icon-btn task-card__menu-btn" aria-label="Task options" aria-haspopup="true">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none"><circle cx="8" cy="3" r="1.3" fill="currentColor"/><circle cx="8" cy="8" r="1.3" fill="currentColor"/><circle cx="8" cy="13" r="1.3" fill="currentColor"/></svg>
      </button>
    </div>
  `;

  // Complete toggle
  const checkBtn = li.querySelector('.task-card__check');
  if(checkBtn) checkBtn.addEventListener('click', () => toggleComplete(task.id));

  const selectBox = li.querySelector('.task-card__select');
  if(selectBox) selectBox.addEventListener('change', () => {
    if(selectBox.checked) State.ui.selectedIds.add(task.id); else State.ui.selectedIds.delete(task.id);
    updateBulkBar();
  });

  // Menu
  const menuBtn = li.querySelector('.task-card__menu-btn');
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAllMenus();
    openTaskMenu(task, li);
  });

  // Click card body opens edit (unless in select mode)
  li.querySelector('.task-card__body').addEventListener('click', () => {
    if(State.ui.selectMode) return;
    openTaskModal(task.id);
  });

  // Drag events
  li.addEventListener('dragstart', (e) => {
    li.classList.add('is-dragging');
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  });
  li.addEventListener('dragend', () => li.classList.remove('is-dragging'));
  li.addEventListener('dragover', (e) => { e.preventDefault(); });
  li.addEventListener('drop', (e) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    reorderTasks(draggedId, task.id);
  });

  return li;
}

function closeAllMenus(){
  document.querySelectorAll('.task-menu').forEach(m => m.remove());
}

function openTaskMenu(task, cardEl){
  const menu = document.createElement('div');
  menu.className = 'task-menu';
  menu.innerHTML = `
    <button data-act="edit">Edit</button>
    <button data-act="duplicate">Duplicate</button>
    ${task.archived ? '<button data-act="restore">Restore</button>' : '<button data-act="archive">Archive</button>'}
    <button data-act="delete" class="danger">Delete</button>
  `;
  cardEl.querySelector('.task-card__actions').appendChild(menu);

  menu.addEventListener('click', (e) => {
    const act = e.target.dataset.act;
    if(!act) return;
    if(act === 'edit') openTaskModal(task.id);
    if(act === 'duplicate') duplicateTask(task.id);
    if(act === 'archive') archiveTask(task.id);
    if(act === 'restore') restoreTask(task.id);
    if(act === 'delete') deleteTask(task.id);
    menu.remove();
  });

  setTimeout(() => document.addEventListener('click', closeAllMenus, { once:true }), 0);
}

/* ---------------------------------------------------------------------- *
 *  Day Arc (signature element)
 * ---------------------------------------------------------------------- */
const ARC_PATH_LENGTH = 408.4; // circumference of the semicircle path (pi * r=130)

function renderDayArc(){
  const todayTasks = State.tasks.filter(t => !t.archived && t.dueDate && isToday(t.dueDate));
  const completed = todayTasks.filter(t => t.completed).length;
  const total = todayTasks.length;
  const pct = total ? Math.round((completed/total)*100) : 0;

  el('completion-percent').textContent = pct + '%';
  el('stat-completed').textContent = completed;
  el('stat-remaining').textContent = total - completed;

  const offset = ARC_PATH_LENGTH - (ARC_PATH_LENGTH * pct/100);
  el('arc-fill').style.strokeDashoffset = offset;

  // Position "sun" marker along the arc based on current time of day (6am-10pm mapped to 0-1)
  const now = new Date();
  const minutes = now.getHours()*60 + now.getMinutes();
  const dayStart = 6*60, dayEnd = 22*60;
  const t = Math.min(1, Math.max(0, (minutes - dayStart) / (dayEnd - dayStart)));
  const point = pointOnArc(t);
  const marker = el('arc-sun-marker');
  marker.setAttribute('transform', `translate(${point.x} ${point.y})`);

  // Task dots along the arc based on due time (default to spread if no time)
  const dotsG = el('arc-dots');
  dotsG.innerHTML = '';
  todayTasks.forEach((task, i) => {
    let dt;
    if(task.dueTime){
      const [h,m] = task.dueTime.split(':').map(Number);
      dt = Math.min(1, Math.max(0, (h*60+m - dayStart) / (dayEnd - dayStart)));
    } else {
      dt = todayTasks.length > 1 ? i/(todayTasks.length-1) : 0.5;
    }
    const p = pointOnArc(dt);
    const dotColor = task.completed ? 'var(--accent)' : 'var(--priority-'+task.priority+')';
    const circle = document.createElementNS('http://www.w3.org/2000/svg','circle');
    circle.setAttribute('cx', p.x); circle.setAttribute('cy', p.y); circle.setAttribute('r', 4.2);
    circle.setAttribute('fill', dotColor);
    circle.setAttribute('class', 'arc-dot');
    circle.setAttribute('opacity', task.completed ? '0.9' : '0.85');
    const title = document.createElementNS('http://www.w3.org/2000/svg','title');
    title.textContent = task.title;
    circle.appendChild(title);
    dotsG.appendChild(circle);
  });
}

// Arc defined by "M20 150 A130 130 0 0 1 280 150" — semicircle, center (150,150), r=130
// t=0 -> left end (20,150), t=0.5 -> top (150,20), t=1 -> right end (280,150)
function pointOnArc(t){
  const cx = 150, cy = 150, r = 130;
  const theta = Math.PI * (1 - t); // 180deg -> 0deg
  return { x: cx + r*Math.cos(theta), y: cy - r*Math.sin(theta) };
}

/* ---------------------------------------------------------------------- *
 *  Calendar
 * ---------------------------------------------------------------------- */
function renderCalendar(){
  const viewDate = State.ui.calendarViewDate;
  const y = viewDate.getFullYear(), m = viewDate.getMonth();

  el('cal-month-label').textContent = viewDate.toLocaleDateString(undefined,{month:'long', year:'numeric'});

  const weekdaysEl = el('calendar-weekdays');
  weekdaysEl.innerHTML = ['S','M','T','W','T','F','S'].map(d => `<div>${d}</div>`).join('');

  const daysEl = el('calendar-days');
  daysEl.innerHTML = '';

  const firstDay = new Date(y, m, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const daysInPrevMonth = new Date(y, m, 0).getDate();

  const tasksByDate = {};
  State.tasks.filter(t=>!t.archived && t.dueDate).forEach(t => {
    tasksByDate[t.dueDate] = (tasksByDate[t.dueDate]||0)+1;
  });

  const cells = [];
  for(let i=startOffset-1;i>=0;i--) cells.push({ day: daysInPrevMonth-i, otherMonth:true, iso:null });
  for(let d=1; d<=daysInMonth; d++){
    const iso = isoFromDate(new Date(y,m,d));
    cells.push({ day:d, otherMonth:false, iso });
  }
  while(cells.length % 7 !== 0) cells.push({ day: cells.length, otherMonth:true, iso:null });

  cells.forEach(c => {
    const div = document.createElement('div');
    div.className = 'cal-day';
    if(c.otherMonth) div.classList.add('is-other-month');
    if(c.iso === todayISO()) div.classList.add('is-today');
    if(c.iso && tasksByDate[c.iso]) div.classList.add('has-tasks');
    if(c.iso && c.iso === State.ui.calendarSelectedDate) div.classList.add('is-selected');
    div.textContent = c.day;
    if(c.iso){
      div.addEventListener('click', () => {
        State.ui.calendarSelectedDate = State.ui.calendarSelectedDate === c.iso ? null : c.iso;
        State.ui.navFilter = null;
        renderAll();
      });
    }
    daysEl.appendChild(div);
  });
}

/* ---------------------------------------------------------------------- *
 *  Stats
 * ---------------------------------------------------------------------- */
function renderStats(){
  const active = State.tasks.filter(t => !t.archived);
  el('stat-created').textContent = active.length;
  el('stat-done-total').textContent = active.filter(t=>t.completed).length;
  el('stat-pending-total').textContent = active.filter(t=>!t.completed).length;

  // Weekly chart: last 7 days, count of tasks completed
  const chart = el('week-chart');
  chart.innerHTML = '';
  const days = [];
  for(let i=6;i>=0;i--){
    const d = new Date(); d.setDate(d.getDate()-i); d.setHours(0,0,0,0);
    days.push(d);
  }
  const counts = days.map(d => {
    const next = new Date(d); next.setDate(d.getDate()+1);
    return active.filter(t => t.completed && t.completedAt >= d.getTime() && t.completedAt < next.getTime()).length;
  });
  const max = Math.max(1, ...counts);
  const barW = 28, gap = 10, chartH = 60;
  days.forEach((d,i) => {
    const h = (counts[i]/max) * chartH;
    const x = i*(barW+gap)+6;
    const rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
    rect.setAttribute('x', x); rect.setAttribute('y', 70-h);
    rect.setAttribute('width', barW); rect.setAttribute('height', Math.max(2,h));
    rect.setAttribute('rx', 4);
    rect.setAttribute('class', 'bar' + (i===6?' today':''));
    chart.appendChild(rect);
    const text = document.createElementNS('http://www.w3.org/2000/svg','text');
    text.setAttribute('x', x+barW/2); text.setAttribute('y', 84); text.setAttribute('text-anchor','middle');
    text.textContent = d.toLocaleDateString(undefined,{weekday:'narrow'});
    chart.appendChild(text);
  });

  // category breakdown
  const breakdown = el('category-breakdown');
  breakdown.innerHTML = '';
  const totalActive = active.length || 1;
  State.categories.forEach(cat => {
    const count = active.filter(t => t.category === cat.id).length;
    if(count === 0) return;
    const row = document.createElement('div');
    row.className = 'cat-bar-row';
    row.innerHTML = `
      <span class="cat-swatch" style="background:${cat.color}"></span>
      <span>${escapeHtml(cat.name)}</span>
      <span class="cat-bar-track"><span class="cat-bar-fill" style="width:${(count/totalActive)*100}%;background:${cat.color}"></span></span>
      <span class="cat-bar-count">${count}</span>
    `;
    breakdown.appendChild(row);
  });
  if(!breakdown.children.length){
    breakdown.innerHTML = '<p style="color:var(--text-faint); font-size:.8rem;">No tasks yet.</p>';
  }
}

/* ---------------------------------------------------------------------- *
 *  Task actions
 * ---------------------------------------------------------------------- */
function toggleComplete(id){
  const task = State.tasks.find(t => t.id === id);
  if(!task) return;
  task.completed = !task.completed;
  task.completedAt = task.completed ? Date.now() : null;
  persist();
  renderAll();
  if(task.completed){
    showToast(`"${truncate(task.title)}" completed`, 'success', 'Undo', () => {
      task.completed = false; task.completedAt = null; persist(); renderAll();
    });
  } else {
    showToast(`"${truncate(task.title)}" marked incomplete`, 'info');
  }
}

function truncate(str, n=40){ return str.length > n ? str.slice(0,n-1)+'…' : str; }

function deleteTask(id, opts={}){
  const idx = State.tasks.findIndex(t => t.id === id);
  if(idx === -1) return;
  const [removed] = State.tasks.splice(idx,1);
  persist();
  renderAll();
  if(!opts.silent){
    showToast(`"${truncate(removed.title)}" deleted`, 'warning', 'Undo', () => {
      State.tasks.splice(idx,0,removed); persist(); renderAll();
    });
  }
}

function duplicateTask(id){
  const task = State.tasks.find(t => t.id === id);
  if(!task) return;
  const copy = Object.assign({}, task, {
    id: uid(), title: task.title + ' (copy)', completed:false, completedAt:null,
    createdAt: Date.now(), order: Math.max(...State.tasks.map(t=>t.order), 0) + 1
  });
  State.tasks.push(copy);
  persist();
  renderAll();
  showToast('Task duplicated', 'success');
}

function archiveTask(id){
  const task = State.tasks.find(t => t.id === id);
  if(!task) return;
  task.archived = true;
  persist();
  renderAll();
  showToast(`"${truncate(task.title)}" archived`, 'info', 'Undo', () => { task.archived=false; persist(); renderAll(); });
}

function restoreTask(id){
  const task = State.tasks.find(t => t.id === id);
  if(!task) return;
  task.archived = false;
  persist();
  renderAll();
  showToast(`"${truncate(task.title)}" restored`, 'success');
}

function reorderTasks(draggedId, targetId){
  if(draggedId === targetId) return;
  const list = getVisibleTasks();
  const draggedIdx = list.findIndex(t => t.id === draggedId);
  const targetIdx = list.findIndex(t => t.id === targetId);
  if(draggedIdx === -1 || targetIdx === -1) return;
  const [dragged] = list.splice(draggedIdx,1);
  list.splice(targetIdx,0,dragged);
  list.forEach((t,i) => { t.order = i; });
  persist();
  renderTaskList();
  renderDayArc();
}

/* ---------------------------------------------------------------------- *
 *  Modal (create / edit)
 * ---------------------------------------------------------------------- */
function openTaskModal(taskId=null){
  closeAllMenus();
  const overlay = el('task-modal-overlay');
  const form = el('task-form');
  form.reset();
  renderCategorySelect();

  if(taskId){
    const task = State.tasks.find(t => t.id === taskId);
    el('modal-title').textContent = 'Edit task';
    el('task-id').value = task.id;
    el('field-title').value = task.title;
    el('field-description').value = task.description || '';
    el('field-category').value = task.category;
    el('field-priority').value = task.priority;
    el('field-date').value = task.dueDate || '';
    el('field-time').value = task.dueTime || '';
    el('field-estimate').value = task.estimate || '';
    el('field-tags').value = (task.tags||[]).join(', ');
    el('field-notes').value = task.notes || '';
  } else {
    el('modal-title').textContent = 'New task';
    el('task-id').value = '';
    el('field-date').value = todayISO();
  }

  overlay.hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => el('field-title').focus(), 50);
}

function closeTaskModal(){
  el('task-modal-overlay').hidden = true;
  document.body.style.overflow = '';
}

function handleTaskFormSubmit(e){
  e.preventDefault();
  const id = el('task-id').value;
  const tags = el('field-tags').value.split(',').map(s=>s.trim()).filter(Boolean);

  if(id){
    const task = State.tasks.find(t => t.id === id);
    Object.assign(task, {
      title: el('field-title').value.trim(),
      description: el('field-description').value.trim(),
      category: el('field-category').value,
      priority: el('field-priority').value,
      dueDate: el('field-date').value,
      dueTime: el('field-time').value,
      estimate: el('field-estimate').value.trim(),
      tags, notes: el('field-notes').value.trim()
    });
    showToast(`"${truncate(task.title)}" updated`, 'success');
  } else {
    const newTask = {
      id: uid(),
      title: el('field-title').value.trim(),
      description: el('field-description').value.trim(),
      category: el('field-category').value,
      priority: el('field-priority').value,
      dueDate: el('field-date').value,
      dueTime: el('field-time').value,
      estimate: el('field-estimate').value.trim(),
      tags, notes: el('field-notes').value.trim(),
      completed:false, archived:false,
      order: (Math.max(-1, ...State.tasks.map(t=>t.order)) + 1),
      createdAt: Date.now(), completedAt:null
    };
    State.tasks.push(newTask);
    showToast(`"${truncate(newTask.title)}" added`, 'success');
  }
  persist();
  closeTaskModal();
  renderAll();
}

/* ---------------------------------------------------------------------- *
 *  Quick add (parses #tags inline)
 * ---------------------------------------------------------------------- */
function handleQuickAdd(e){
  e.preventDefault();
  const input = el('quick-add-input');
  const raw = input.value.trim();
  if(!raw) return;

  const tags = [];
  const title = raw.replace(/#(\w+)/g, (m, tag) => { tags.push(tag); return ''; }).trim() || raw;

  const newTask = {
    id: uid(), title, description:'', category: State.categories[0].id, priority:'medium',
    dueDate: todayISO(), dueTime:'', tags, estimate:'', notes:'',
    completed:false, archived:false,
    order:(Math.max(-1, ...State.tasks.map(t=>t.order)) + 1),
    createdAt: Date.now(), completedAt:null
  };
  State.tasks.push(newTask);
  persist();
  input.value = '';
  renderAll();
  showToast(`"${truncate(title)}" added to today`, 'success');
}

/* ---------------------------------------------------------------------- *
 *  Category modal
 * ---------------------------------------------------------------------- */
let selectedSwatch = null; // null = "not chosen yet"; DEFAULT_CATEGORY_COLOR is applied at save time
const DEFAULT_CATEGORY_COLOR = '#3B82F6';

function renderSwatches(){
  const wrap = el('color-swatches');
  wrap.innerHTML = SWATCH_COLORS.map(c =>
    `<button type="button" class="color-swatch ${c===selectedSwatch?'is-selected':''}" style="background:${c}" data-color="${c}" aria-label="Color ${c}"></button>`
  ).join('');
  wrap.querySelectorAll('.color-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedSwatch = btn.dataset.color;
      renderSwatches();
    });
  });
}

function handleCategoryFormSubmit(e){
  e.preventDefault();
  e.stopPropagation(); // don't let this submit bubble into the Task modal's form underneath

  const nameInput = el('cat-name');
  const name = (nameInput.value || '').trim();

  // Validation — now with visible feedback instead of a silent return
  if(!name){
    showToast('Category name is required', 'warning');
    nameInput.focus();
    return;
  }

  // Prevent duplicates (case-insensitive)
  const isDuplicate = State.categories.some(c => c.name.toLowerCase() === name.toLowerCase());
  if(isDuplicate){
    showToast(`Category "${name}" already exists`, 'warning');
    nameInput.focus();
    return;
  }

  // Default color assignment — only falls back if the user never picked a swatch
  const color = selectedSwatch || DEFAULT_CATEGORY_COLOR;

  State.categories.push({ id: 'cat_' + uid(), name, color, builtin:false });
  persist();

  // Refresh every category dropdown/list immediately
  renderCategorySelect();
  renderCategoryList();
  renderStats(); // keeps the category breakdown panel in sync too

  closeCategoryModalOnly();
  showToast(`Category "${name}" created`, 'success');

  // Reset picker state for the next time this modal opens
  selectedSwatch = null;
}

// Closes ONLY the category modal and restores body scroll-lock correctly
// if — and only if — no other modal (e.g. the Task modal) is still open.
function closeCategoryModalOnly(){
  el('category-modal-overlay').hidden = true;
  const taskModalOpen = !el('task-modal-overlay').hidden;
  if(!taskModalOpen){
    document.body.style.overflow = '';
  }
}

/* ---------------------------------------------------------------------- *
 *  Bulk / select mode
 * ---------------------------------------------------------------------- */
function toggleSelectMode(){
  State.ui.selectMode = !State.ui.selectMode;
  State.ui.selectedIds.clear();
  el('select-mode-btn').setAttribute('aria-pressed', String(State.ui.selectMode));
  updateBulkBar();
  renderTaskList();
}
function updateBulkBar(){
  const bar = el('bulk-bar');
  const count = State.ui.selectedIds.size;
  bar.hidden = !State.ui.selectMode;
  el('bulk-count').textContent = `${count} selected`;
}
function bulkComplete(){
  State.ui.selectedIds.forEach(id => {
    const t = State.tasks.find(x=>x.id===id);
    if(t){ t.completed = true; t.completedAt = Date.now(); }
  });
  persist();
  showToast(`${State.ui.selectedIds.size} task(s) completed`, 'success');
  toggleSelectMode();
  renderAll();
}
function bulkDelete(){
  const count = State.ui.selectedIds.size;
  State.tasks = State.tasks.filter(t => !State.ui.selectedIds.has(t.id));
  persist();
  showToast(`${count} task(s) deleted`, 'warning');
  toggleSelectMode();
  renderAll();
}

/* ---------------------------------------------------------------------- *
 *  Theme
 * ---------------------------------------------------------------------- */
function applyTheme(theme){
  document.body.setAttribute('data-theme', theme);
  State.settings.theme = theme;
  persist();
  document.querySelectorAll('.theme-dot').forEach(btn => {
    const active = btn.dataset.themeChoice === theme;
    btn.setAttribute('aria-checked', String(active));
  });
}

/* ---------------------------------------------------------------------- *
 *  Ripple micro-interaction
 * ---------------------------------------------------------------------- */
function attachRipple(btn){
  btn.addEventListener('click', function(e){
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - rect.left - size/2) + 'px';
    ripple.style.top = (e.clientY - rect.top - size/2) + 'px';
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 650);
  });
}

/* ---------------------------------------------------------------------- *
 *  Magnetic FAB
 * ---------------------------------------------------------------------- */
function attachMagnetic(elm, strength=14){
  elm.addEventListener('mousemove', (e) => {
    const rect = elm.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width/2;
    const y = e.clientY - rect.top - rect.height/2;
    elm.style.transform = `translate(${x/rect.width*strength}px, ${y/rect.height*strength}px)`;
  });
  elm.addEventListener('mouseleave', () => { elm.style.transform = ''; });
}

/* ---------------------------------------------------------------------- *
 *  Events / wiring
 * ---------------------------------------------------------------------- */
function wireEvents(){
  // Sidebar nav
  document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      State.ui.navFilter = null;
      State.ui.categoryFilter = 'all';
      State.ui.calendarSelectedDate = null;
      renderAll();
      closeMobileSidebar();
    });
  });
  document.querySelectorAll('.nav-item[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      State.ui.navFilter = btn.dataset.filter;
      State.ui.categoryFilter = 'all';
      State.ui.calendarSelectedDate = null;
      renderAll();
      closeMobileSidebar();
    });
  });

  // Filter chips
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(c => { c.classList.remove('is-active'); c.setAttribute('aria-selected','false'); });
      chip.classList.add('is-active'); chip.setAttribute('aria-selected','true');
      State.ui.filter = chip.dataset.filter;
      State.ui.navFilter = null;
      renderAll();
    });
  });

  el('priority-filter').addEventListener('change', (e) => { State.ui.priorityFilter = e.target.value; renderTaskList(); });
  el('sort-select').addEventListener('change', (e) => { State.ui.sort = e.target.value; renderTaskList(); });

  // Search
  el('search-input').addEventListener('input', (e) => { State.ui.search = e.target.value; renderTaskList(); });

  // Quick add
  el('quick-add-form').addEventListener('submit', handleQuickAdd);
  el('open-full-form-btn').addEventListener('click', () => openTaskModal());

  // Task modal
  el('modal-close-btn').addEventListener('click', closeTaskModal);
  el('modal-cancel-btn').addEventListener('click', closeTaskModal);
  el('task-form').addEventListener('submit', handleTaskFormSubmit);
  el('task-modal-overlay').addEventListener('click', (e) => { if(e.target.id === 'task-modal-overlay') closeTaskModal(); });

  // Category modal
  el('add-category-btn').addEventListener('click', () => {
    selectedSwatch = null; // start fresh each time — no swatch pre-selected
    renderSwatches();
    el('category-modal-overlay').hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => el('cat-name').focus(), 50);
  });
  const closeCatModal = closeCategoryModalOnly;
  el('cat-modal-close-btn').addEventListener('click', closeCatModal);
  el('cat-cancel-btn').addEventListener('click', closeCatModal);
  el('category-modal-overlay').addEventListener('click', (e) => { if(e.target.id === 'category-modal-overlay') closeCatModal(); });
  el('category-form').addEventListener('submit', handleCategoryFormSubmit);

  // FAB
  el('fab-add').addEventListener('click', () => openTaskModal());
  attachMagnetic(el('fab-add'));

  // Select mode / bulk
  el('select-mode-btn').addEventListener('click', toggleSelectMode);
  el('bulk-complete-btn').addEventListener('click', bulkComplete);
  el('bulk-delete-btn').addEventListener('click', bulkDelete);
  el('bulk-cancel-btn').addEventListener('click', toggleSelectMode);

  // Calendar nav
  el('cal-prev').addEventListener('click', () => {
    const d = State.ui.calendarViewDate; d.setMonth(d.getMonth()-1); renderCalendar();
  });
  el('cal-next').addEventListener('click', () => {
    const d = State.ui.calendarViewDate; d.setMonth(d.getMonth()+1); renderCalendar();
  });

  // Side panel toggle (mobile)
  el('side-panel-toggle').addEventListener('click', () => {
    const body = el('side-panel-body');
    const expanded = el('side-panel-toggle').getAttribute('aria-expanded') === 'true';
    body.style.display = expanded ? 'none' : '';
    el('side-panel-toggle').setAttribute('aria-expanded', String(!expanded));
  });

  // Theme switcher
  document.querySelectorAll('.theme-dot').forEach(btn => {
    btn.addEventListener('click', () => applyTheme(btn.dataset.themeChoice));
  });

  // Mobile sidebar
  el('mobile-menu-btn').addEventListener('click', openMobileSidebar);
  el('mobile-search-btn').addEventListener('click', () => { el('search-input').scrollIntoView({behavior:'smooth'}); el('search-input').focus(); });

  // Ripple on primary buttons
  document.querySelectorAll('.btn--primary, .fab').forEach(attachRipple);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if(e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA'){
      e.preventDefault(); el('search-input').focus();
    }
    if(e.key === 'n' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA'){
      e.preventDefault(); openTaskModal();
    }
    if(e.key === 'Escape'){
      if(!el('task-modal-overlay').hidden) closeTaskModal();
      if(!el('category-modal-overlay').hidden){ closeCategoryModalOnly(); }
      closeMobileSidebar();
    }
  });
}

function openMobileSidebar(){
  el('sidebar').classList.add('is-open');
  let backdrop = document.querySelector('.sidebar-backdrop');
  if(!backdrop){
    backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    backdrop.addEventListener('click', closeMobileSidebar);
    document.body.appendChild(backdrop);
  }
  requestAnimationFrame(() => backdrop.classList.add('is-visible'));
  el('mobile-menu-btn').setAttribute('aria-expanded','true');
}
function closeMobileSidebar(){
  el('sidebar').classList.remove('is-open');
  const backdrop = document.querySelector('.sidebar-backdrop');
  if(backdrop) backdrop.classList.remove('is-visible');
  el('mobile-menu-btn').setAttribute('aria-expanded','false');
}

/* ---------------------------------------------------------------------- *
 *  Init
 * ---------------------------------------------------------------------- */
function init(){
  initState();
  applyTheme(State.settings.theme || 'dusk');
  wireEvents();
  renderAll();
  // Refresh the arc's sun position and greeting every minute
  setInterval(() => { renderDayArc(); renderGreeting(); }, 60000);
}

document.addEventListener('DOMContentLoaded', init);
