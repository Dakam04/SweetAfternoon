'use strict';

const CONFIG = window.BOARD_CONFIG;
const TEXTS = window.BOARD_TEXTS;

// iOS 15 이하 Safari 에는 canvas roundRect 가 없어서 같은 모양을 직접 그린다.
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function roundRect(x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    this.moveTo(x + radius, y);
    this.arcTo(x + w, y, x + w, y + h, radius);
    this.arcTo(x + w, y + h, x, y + h, radius);
    this.arcTo(x, y + h, x, y, radius);
    this.arcTo(x, y, x + w, y, radius);
    this.closePath();
  };
}
const ROW_FIELDS = ['name', 'time'];
// 주소에 ?guide 가 있으면 포스터 위에 카드 영역과 좌표를 표시한다.
const SHOW_GUIDE = new URLSearchParams(window.location.search).has('guide');

const state = {
  weekOffset: 0,
  // { 'YYYY-MM-DD': { closed, closedNote, closedMessage, event, rows: [{ name, time }] } }
  schedule: {},
  dirty: false,
  template: null,
};

// ---------- 날짜 ----------

function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = (start.getDay() - CONFIG.weekStartsOn + 7) % 7;
  return addDays(start, -diff);
}

function weekStart(offset) {
  return addDays(startOfWeek(new Date()), offset * 7);
}

function weekDates(offset) {
  const start = weekStart(offset);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

// 주의 4번째 날이 속한 달을 그 주의 달로 본다. (월요일 시작이면 ISO 주차와 같은 기준)
function weekTitle(offset) {
  const dates = weekDates(offset);
  const anchor = dates[3];
  const nth = Math.floor((anchor.getDate() - 1) / 7) + 1;
  const range = `${shortDate(dates[0])}〜${shortDate(dates[6])}`;
  return { title: TEXTS.weekTitle(anchor.getFullYear(), anchor.getMonth() + 1, nth), range };
}

function shortDate(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function dateLabel(date) {
  return `${shortDate(date)}(${CONFIG.weekdayLabels[date.getDay()]})`;
}

// ---------- 저장소 ----------

function emptyDay() {
  return { closed: false, closedNote: '', closedMessage: '', event: '', rows: [] };
}

function loadSchedule() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(CONFIG.storageKey)) || {};
  } catch (err) {
    console.error('保存されたシフトを読み込めませんでした', err);
  }
  // 예전 버전 데이터에는 없는 필드가 있으므로 기본값을 채운다.
  for (const key of Object.keys(saved)) {
    saved[key] = { ...emptyDay(), ...saved[key] };
  }
  return saved;
}

// 빈 날은 빼고, 저장·내보내기에 쓸 형태로 정리한다.
function cleanSchedule() {
  const cleaned = {};
  for (const [key, day] of Object.entries(state.schedule)) {
    const rows = day.rows.filter((row) => row.name.trim() || row.time.trim());
    const texts = {
      closedNote: day.closedNote.trim(),
      closedMessage: day.closedMessage.trim(),
      event: day.event.trim(),
    };
    if (day.closed || rows.length > 0 || texts.event) {
      cleaned[key] = { closed: day.closed, ...texts, rows };
    }
  }
  return cleaned;
}

function saveSchedule() {
  try {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(cleanSchedule()));
  } catch (err) {
    console.error('シフトの保存に失敗しました', err);
    setStatus(TEXTS.saveFailed, true);
    return false;
  }
  setDirty(false);
  setStatus(TEXTS.saved);
  return true;
}

function getDay(key) {
  if (!state.schedule[key]) {
    state.schedule[key] = emptyDay();
  }
  return state.schedule[key];
}

// ---------- 상태 표시 ----------

function setStatus(message, isError = false) {
  const node = document.getElementById('status');
  node.textContent = message;
  node.classList.toggle('is-error', isError);
}

function setDirty(dirty) {
  state.dirty = dirty;
  if (dirty) {
    setStatus(TEXTS.unsaved);
  }
}

function markChanged() {
  setDirty(true);
  drawPoster();
}

// ---------- 주 탭 ----------

// 이번 주 기준 상대 표기 (今週, 3週前, 2週後 …)
function relativeWeekLabel(offset) {
  if (TEXTS.relativeWeeks[offset]) {
    return TEXTS.relativeWeeks[offset];
  }
  return offset < 0 ? TEXTS.weeksAgo(-offset) : TEXTS.weeksLater(offset);
}

// 고른 날짜가 이번 주에서 몇 주 떨어져 있는지 계산한다.
function weekOffsetOf(date) {
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  const toUtc = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((toUtc(startOfWeek(date)) - toUtc(startOfWeek(new Date()))) / oneWeek);
}

function renderWeekNav() {
  const { title, range } = weekTitle(state.weekOffset);
  document.getElementById('week-title').textContent = title;
  document.getElementById('week-range').textContent = `${range}（${relativeWeekLabel(state.weekOffset)}）`;
  document.getElementById('week-today').disabled = state.weekOffset === 0;
  document.getElementById('week-picker').value = toKey(weekStart(state.weekOffset));
}

// ---------- 입력 화면 ----------

function renderEditor() {
  const container = document.getElementById('days');
  container.replaceChildren(...weekDates(state.weekOffset).map((date, index) => renderDayPanel(date, index)));
}

function field(labelText, control, className) {
  const label = document.createElement('label');
  label.className = `field ${className || ''}`;
  const caption = document.createElement('span');
  caption.className = 'field__label';
  caption.textContent = labelText;
  label.append(caption, control);
  return label;
}

function textInput(fieldName, value, placeholder, maxLength) {
  const input = document.createElement('input');
  input.dataset.field = fieldName;
  input.value = value;
  input.placeholder = placeholder;
  input.maxLength = maxLength;
  input.autocomplete = 'off';
  return input;
}

function renderDayPanel(date, index) {
  const key = toKey(date);
  const day = getDay(key);
  const panel = document.createElement('article');
  panel.className = `day day--${CONFIG.cards[index].tone}`;
  panel.classList.toggle('is-closed', day.closed);
  panel.dataset.key = key;

  const head = document.createElement('header');
  head.className = 'day__head';
  const title = document.createElement('h2');
  title.textContent = dateLabel(date);
  const closed = document.createElement('label');
  closed.className = 'switch';
  const closedInput = document.createElement('input');
  closedInput.type = 'checkbox';
  closedInput.dataset.field = 'closed';
  closedInput.checked = day.closed;
  const closedText = document.createElement('span');
  closedText.textContent = TEXTS.closed;
  closed.append(closedInput, closedText);
  head.append(title, closed);

  const closedNote = field(TEXTS.closedNote, renderCombo('closedNote', day.closedNote, CONFIG.closedLabel, 20), 'day__closed-note');
  const closedMessage = field(
    TEXTS.closedMessage,
    renderCombo('closedMessage', day.closedMessage, CONFIG.closedMessage || TEXTS.closedMessagePlaceholder, 30),
    'day__closed-note',
  );
  const event = field(TEXTS.event, renderCombo('event', day.event, TEXTS.eventPlaceholder, 20), 'day__event');

  const rows = document.createElement('div');
  rows.className = 'day__rows';
  day.rows.forEach((row, rowIndex) => rows.append(renderRow(row, rowIndex)));

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'day__add';
  add.dataset.action = 'add-row';
  add.textContent = TEXTS.addRow;
  add.disabled = day.rows.length >= CONFIG.maxRows;

  panel.append(head, closedNote, closedMessage, event, rows, add);
  return panel;
}

function renderRow(row, rowIndex) {
  const line = document.createElement('div');
  line.className = 'row';
  line.dataset.index = String(rowIndex);

  const time = textInput('time', row.time, TEXTS.timePlaceholder, 12);
  time.setAttribute('aria-label', TEXTS.timeLabel);

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'row__remove';
  remove.dataset.action = 'remove-row';
  remove.textContent = '×';
  remove.setAttribute('aria-label', TEXTS.removeRow);

  line.append(renderCombo('name', row.name, TEXTS.namePlaceholder, 12), time, remove);
  return line;
}

function handleEditorInput(event) {
  const panel = event.target.closest('.day');
  const fieldName = event.target.dataset.field;
  if (!panel || !fieldName) {
    return;
  }
  const day = getDay(panel.dataset.key);
  if (fieldName === 'closed') {
    day.closed = event.target.checked;
    panel.classList.toggle('is-closed', day.closed);
  } else if (ROW_FIELDS.includes(fieldName)) {
    const index = Number(event.target.closest('.row').dataset.index);
    day.rows[index][fieldName] = event.target.value;
  } else {
    day[fieldName] = event.target.value;
  }
  markChanged();
}

function handleEditorClick(event) {
  const action = event.target.dataset.action;
  const panel = event.target.closest('.day');
  if (!panel || !action) {
    return;
  }
  const day = getDay(panel.dataset.key);
  if (action === 'add-row' && day.rows.length < CONFIG.maxRows) {
    day.rows.push({ name: '', time: '' });
  } else if (action === 'remove-row') {
    day.rows.splice(Number(event.target.closest('.row').dataset.index), 1);
  } else {
    return;
  }
  refreshPanels();
  if (action === 'add-row') {
    event.currentTarget.querySelector(`.day[data-key="${panel.dataset.key}"] .row:last-child input`)?.focus();
  }
  markChanged();
}

// 행 추가·삭제처럼 구조가 바뀌면 목록과 열려 있는 모달을 함께 다시 그린다.
function refreshPanels() {
  renderEditor();
  const dialog = document.getElementById('day-dialog');
  if (dialog.open) {
    renderDialog(Number(dialog.dataset.index));
  }
}

// ---------- 콤보박스 (직접 입력 + 후보 목록) ----------

let comboId = 0;

function renderCombo(fieldName, value, placeholder, maxLength) {
  comboId += 1;
  const wrap = document.createElement('div');
  wrap.className = 'combo';

  const input = textInput(fieldName, value, placeholder, maxLength);
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', `combo-list-${comboId}`);
  input.setAttribute('aria-label', placeholder);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'combo__toggle';
  toggle.tabIndex = -1;
  toggle.setAttribute('aria-label', TEXTS.showOptions);
  toggle.textContent = '▾';

  const list = document.createElement('ul');
  list.className = 'combo__list';
  list.id = `combo-list-${comboId}`;
  list.setAttribute('role', 'listbox');
  list.hidden = true;

  wrap.append(input, toggle, list);
  return wrap;
}

// 후보는 지금까지 입력한 값에서 만든다. 휴무 이유는 설정의 기본 후보도 포함.
function comboOptions(fieldName) {
  const presets = { closedNote: CONFIG.closedPresets, closedMessage: CONFIG.closedMessagePresets };
  const values = new Set(presets[fieldName] || []);
  for (const day of Object.values(state.schedule)) {
    if (fieldName === 'name') {
      day.rows.forEach((row) => row.name.trim() && values.add(row.name.trim()));
    } else if (day[fieldName]?.trim()) {
      values.add(day[fieldName].trim());
    }
  }
  return [...values].sort((a, b) => a.localeCompare(b, 'ja'));
}

function openCombo(input, showAll) {
  const list = input.parentElement.querySelector('.combo__list');
  const query = showAll ? '' : input.value.trim();
  const options = comboOptions(input.dataset.field).filter((option) => option !== input.value && option.includes(query));
  list.replaceChildren(
    ...options.map((option, i) => {
      const item = document.createElement('li');
      item.id = `${list.id}-${i}`;
      item.setAttribute('role', 'option');
      item.textContent = option;
      return item;
    }),
  );
  list.hidden = options.length === 0;
  input.setAttribute('aria-expanded', String(!list.hidden));
  input.removeAttribute('aria-activedescendant');
}

function closeCombo(input) {
  input.parentElement.querySelector('.combo__list').hidden = true;
  input.setAttribute('aria-expanded', 'false');
  input.removeAttribute('aria-activedescendant');
}

function chooseOption(input, value) {
  input.value = value;
  // 직접 입력한 것과 같은 경로로 상태를 바꾼다.
  input.dispatchEvent(new Event('input', { bubbles: true }));
  closeCombo(input);
}

function moveActiveOption(input, step) {
  const list = input.parentElement.querySelector('.combo__list');
  const items = [...list.children];
  if (list.hidden || items.length === 0) {
    openCombo(input, true);
    return;
  }
  const current = items.findIndex((item) => item.id === input.getAttribute('aria-activedescendant'));
  const next = items[(current + step + items.length) % items.length];
  items.forEach((item) => item.classList.toggle('is-active', item === next));
  input.setAttribute('aria-activedescendant', next.id);
  next.scrollIntoView({ block: 'nearest' });
}

function setupCombos() {
  const isCombo = (node) => node?.getAttribute?.('role') === 'combobox';

  document.addEventListener('focusin', (event) => {
    if (isCombo(event.target)) {
      openCombo(event.target, true);
    }
  });
  document.addEventListener('focusout', (event) => {
    if (isCombo(event.target)) {
      closeCombo(event.target);
    }
  });
  document.addEventListener('input', (event) => {
    if (isCombo(event.target) && event.isTrusted) {
      openCombo(event.target, false);
    }
  });
  // mousedown/touch 에서 기본 동작을 막아야 입력칸 포커스가 유지된 채로 선택된다.
  document.addEventListener('pointerdown', (event) => {
    const option = event.target.closest('.combo__list [role="option"]');
    const toggle = event.target.closest('.combo__toggle');
    if (!option && !toggle) {
      return;
    }
    event.preventDefault();
    const input = event.target.closest('.combo').querySelector('input');
    if (option) {
      chooseOption(input, option.textContent);
    } else if (input.parentElement.querySelector('.combo__list').hidden) {
      input.focus();
      openCombo(input, true);
    } else {
      closeCombo(input);
    }
  });
  document.addEventListener('keydown', (event) => {
    if (!isCombo(event.target)) {
      return;
    }
    const input = event.target;
    const list = input.parentElement.querySelector('.combo__list');
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      moveActiveOption(input, event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Enter' && input.hasAttribute('aria-activedescendant')) {
      event.preventDefault();
      chooseOption(input, document.getElementById(input.getAttribute('aria-activedescendant')).textContent);
    } else if (event.key === 'Escape' && !list.hidden) {
      // 모달이 같이 닫히지 않도록 목록만 닫는다.
      event.preventDefault();
      event.stopPropagation();
      closeCombo(input);
    }
  });
}

// ---------- 수정 모달 ----------

function renderDialog(index) {
  const date = weekDates(state.weekOffset)[index];
  document.getElementById('dialog-body').replaceChildren(renderDayPanel(date, index));
}

function openDayDialog(index) {
  const dialog = document.getElementById('day-dialog');
  dialog.dataset.index = String(index);
  renderDialog(index);
  dialog.showModal();
  // 기본으로는 첫 입력칸(하트)에 포커스가 가서 휴대폰 키보드가 뜬다. 완료 버튼으로 옮긴다.
  dialog.querySelector('[data-action="close-dialog"]').focus();
}

// 포스터 위 클릭 좌표를 템플릿 좌표로 바꿔 어느 카드인지 찾는다.
function cardIndexAt(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / rect.width;
  const x = (clientX - rect.left) * scale;
  const y = (clientY - rect.top) * scale;
  const margin = 50;
  return CONFIG.cards.findIndex(({ heart, area: [ax, ay, w, h] }) =>
    x >= ax - margin && x <= ax + w + margin && y >= heart[1] - margin * 2 && y <= ay + h + margin,
  );
}

// ---------- 포스터 ----------

function setFont(ctx, weight, size) {
  ctx.font = `${weight} ${size}px ${CONFIG.font}`;
}

// 글자가 maxWidth 를 넘으면 크기를 줄여서 반환한다.
function fitFont(ctx, text, weight, size, maxWidth) {
  setFont(ctx, weight, size);
  const width = ctx.measureText(text).width;
  if (width > maxWidth) {
    size *= maxWidth / width;
    setFont(ctx, weight, size);
  }
  return size;
}

function drawPoster(withGuide = SHOW_GUIDE) {
  const canvas = document.getElementById('poster');
  const { width, height } = CONFIG.template;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(state.template, 0, 0, width, height);

  weekDates(state.weekOffset).forEach((date, index) => {
    const card = CONFIG.cards[index];
    const color = CONFIG.inkColors[card.tone];
    const day = state.schedule[toKey(date)] || emptyDay();
    const [x, y, w, h] = card.area;
    let area = { x, y, w, h };

    drawHeartNumber(ctx, card, String(date.getDate()));
    drawDateLabel(ctx, card, date, color);
    if (day.event.trim()) {
      area = drawEventRibbon(ctx, card, day.event.trim(), color);
    }
    if (day.closed) {
      const reason = day.closedNote.trim() || CONFIG.closedLabel;
      drawClosed(ctx, card, area, reason, day.closedMessage.trim() || CONFIG.closedMessage, color);
    } else {
      drawRows(ctx, area, day.rows.filter((row) => row.name.trim() || row.time.trim()), color);
    }
  });

  if (withGuide) {
    drawGuide(ctx);
  }
}

// 카드마다 글자 영역(점선 사각형)과 하트 중심(십자), 그 좌표를 그린다.
function drawGuide(ctx) {
  const label = (text, x, y) => {
    const width = ctx.measureText(text).width;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(x - 4, y - 4, width + 8, 36);
    ctx.fillStyle = '#d6004f';
    ctx.fillText(text, x, y);
  };
  ctx.save();
  ctx.strokeStyle = '#d6004f';
  ctx.lineWidth = 4;
  ctx.font = '600 28px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  CONFIG.cards.forEach((card, index) => {
    const [x, y, w, h] = card.area;
    const [hx, hy] = card.heart;
    ctx.setLineDash([16, 10]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(hx - 40, hy);
    ctx.lineTo(hx + 40, hy);
    ctx.moveTo(hx, hy - 40);
    ctx.lineTo(hx, hy + 40);
    ctx.stroke();
    // 이벤트 띠를 가리지 않도록 영역 아래쪽에 적는다.
    label(`#${index + 1} area [${x}, ${y}, ${w}, ${h}]`, x + 8, y + h - 40);
    label(`heart [${hx}, ${hy}]`, hx + 48, hy + 44);
  });
  ctx.restore();
}

function drawHeartNumber(ctx, card, label) {
  const [x, y] = card.heart;
  const { size, maxWidth, offsetY } = CONFIG.layout.heartNumber;
  ctx.save();
  fitFont(ctx, label, 700, size, maxWidth);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(120, 60, 90, 0.35)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y + offsetY);
  ctx.restore();
}

function drawDateLabel(ctx, card, date, color) {
  const [x, y, w] = card.area;
  const { size, offsetY } = CONFIG.layout.dateLabel;
  setFont(ctx, 500, size);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.75;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(dateLabel(date), x + w, y + offsetY);
  ctx.globalAlpha = 1;
}

// 카드 윗부분에 이벤트 띠를 그리고, 남은 글자 영역을 돌려준다.
function drawEventRibbon(ctx, card, text, color) {
  const [x, y, w, h] = card.area;
  const { height: ribbonH, top: ribbonTop, size, gap } = CONFIG.layout.eventRibbon;
  const top = y + ribbonTop;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, top, w, ribbonH, ribbonH / 2);
  ctx.fill();

  const label = TEXTS.posterEvent(text);
  fitFont(ctx, label, 700, size, w - 40);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, top + ribbonH / 2 + 2);

  const used = ribbonTop + ribbonH + gap;
  return { x, y: y + used, w, h: h - used };
}

function drawClosed(ctx, card, area, reason, message, color) {
  const { x, y, w, h } = area;
  const { headingSize, reasonSize, messageSize } = CONFIG.layout.closed;
  const centerX = x + w / 2;
  // 메시지가 없으면 나머지 글자를 조금 내려 가운데를 맞춘다.
  const centerY = y + h / 2 + (message ? 0 : 24);

  // 카드 색으로 옅게 칠하고 점선 테두리를 둘러 근무일과 구분한다.
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x - 6, y, w + 12, h, 24);
  ctx.fillStyle = CONFIG.toneColors[card.tone];
  ctx.globalAlpha = 0.28;
  ctx.fill();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.setLineDash([2, 10]);
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  setFont(ctx, 500, headingSize);
  ctx.globalAlpha = 0.7;
  ctx.fillText(TEXTS.posterClosedHeading, centerX, centerY - 88);
  ctx.globalAlpha = 1;

  fitFont(ctx, reason, 700, reasonSize, w - 40);
  ctx.fillText(reason, centerX, centerY - 10);

  setFont(ctx, 500, 30);
  ctx.fillText('♡', centerX, centerY + 58);

  if (message) {
    fitFont(ctx, message, 500, messageSize, w - 30);
    ctx.globalAlpha = 0.8;
    ctx.fillText(message, centerX, centerY + 110);
    ctx.globalAlpha = 1;
  }
}

function drawRows(ctx, area, rows, color) {
  if (rows.length === 0) {
    return;
  }
  const { x, y, w, h } = area;
  const { maxSize, lineHeight: lineRatio } = CONFIG.layout.rows;
  const baseSize = Math.min(maxSize, h / (rows.length * lineRatio));
  const lineHeight = baseSize * lineRatio;
  const top = y + (h - lineHeight * rows.length) / 2 + lineHeight / 2;

  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.textBaseline = 'middle';

  rows.forEach((row, i) => {
    const centerY = top + i * lineHeight;
    const name = row.name.trim();
    const time = row.time.trim();

    // 이름과 시간이 한 줄에 다 들어가도록 글자 크기를 줄인다.
    let size = baseSize;
    setFont(ctx, 700, size);
    const needed = ctx.measureText(name).width + ctx.measureText(time).width + size * 1.5;
    if (needed > w) {
      size *= w / needed;
      setFont(ctx, 700, size);
    }

    // 이름은 왼쪽, 시간은 오른쪽, 그 사이를 점선으로 잇는다.
    const nameWidth = ctx.measureText(name).width;
    const timeWidth = ctx.measureText(time).width;
    ctx.textAlign = 'left';
    ctx.fillText(name, x, centerY);
    ctx.textAlign = 'right';
    ctx.fillText(time, x + w, centerY);

    const gap = size * 0.4;
    const leaderStart = x + nameWidth + gap;
    const leaderEnd = x + w - timeWidth - gap;
    if (leaderEnd - leaderStart > size * 0.5) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = size * 0.1;
      ctx.lineCap = 'round';
      ctx.setLineDash([0.1, size * 0.28]);
      ctx.beginPath();
      ctx.moveTo(leaderStart, centerY + size * 0.3);
      ctx.lineTo(leaderEnd, centerY + size * 0.3);
      ctx.stroke();
      ctx.restore();
    }
  });
}

// ---------- 버튼 ----------

function copyPreviousWeek() {
  const current = weekDates(state.weekOffset);
  const hasData = current.some((date) => {
    const day = state.schedule[toKey(date)];
    return day && (day.closed || day.event || day.rows.some((row) => row.name || row.time));
  });
  if (hasData && !confirm(TEXTS.confirmCopyPrev)) {
    return;
  }
  // 요일마다 반복되는 근무와 휴무만 복사하고, 날짜에 딸린 이벤트는 비운다.
  current.forEach((date) => {
    const source = state.schedule[toKey(addDays(date, -7))];
    state.schedule[toKey(date)] = source
      ? {
          ...emptyDay(),
          closed: source.closed,
          closedNote: source.closedNote,
          closedMessage: source.closedMessage,
          rows: source.rows.map((row) => ({ ...row })),
        }
      : emptyDay();
  });
  renderEditor();
  markChanged();
}

function clearWeek() {
  if (!confirm(TEXTS.confirmClear)) {
    return;
  }
  weekDates(state.weekOffset).forEach((date) => {
    state.schedule[toKey(date)] = emptyDay();
  });
  renderEditor();
  markChanged();
}

// 저장될 PNG 를 그대로 보여주고, 그 자리에서 내려받는다.
// 휴대폰에서는 미리보기 이미지를 길게 눌러 사진 앱에 저장할 수도 있다.
function openImagePreview() {
  const canvas = document.getElementById('poster');
  try {
    // 가이드는 저장 이미지에 넣지 않는다. toBlob 은 호출한 순간의 그림을 복사하므로 바로 다시 그려도 된다.
    if (SHOW_GUIDE) {
      drawPoster(false);
    }
    canvas.toBlob(showImagePreview, 'image/png');
  } catch (err) {
    // file:// 로 열면 템플릿 이미지가 다른 출처로 취급되어 SecurityError 가 난다.
    console.error('画像を作成できませんでした', err);
    setStatus(TEXTS.imageBlocked, true);
  } finally {
    if (SHOW_GUIDE) {
      drawPoster();
    }
  }
}

function showImagePreview(blob) {
  if (!blob) {
    setStatus(TEXTS.imageFailed, true);
    return;
  }
  const dialog = document.getElementById('image-dialog');
  const url = URL.createObjectURL(blob);
  const fileName = `shift_${toKey(weekStart(state.weekOffset))}.png`;
  document.getElementById('image-preview').src = url;
  const link = document.getElementById('image-download');
  link.href = url;
  link.download = fileName;
  setImageZoom(false);
  dialog.showModal();
}

function closeImagePreview() {
  const image = document.getElementById('image-preview');
  URL.revokeObjectURL(image.src);
  image.removeAttribute('src');
}

// 전체 보기 ↔ 원본 크기 보기. 원본 크기에서는 누른 곳이 화면 가운데 오도록 스크롤한다.
function setImageZoom(zoomed, clickEvent) {
  const viewport = document.getElementById('image-viewport');
  const image = document.getElementById('image-preview');
  let ratioX = 0.5;
  let ratioY = 0.5;
  if (clickEvent) {
    const rect = image.getBoundingClientRect();
    ratioX = (clickEvent.clientX - rect.left) / rect.width;
    ratioY = (clickEvent.clientY - rect.top) / rect.height;
  }
  viewport.classList.toggle('is-zoomed', zoomed);
  document.querySelector('[data-action="toggle-zoom"]').textContent = zoomed ? TEXTS.zoomOut : TEXTS.zoomIn;
  if (zoomed) {
    viewport.scrollLeft = image.offsetWidth * ratioX - viewport.clientWidth / 2;
    viewport.scrollTop = image.offsetHeight * ratioY - viewport.clientHeight / 2;
  }
}

// ---------- 데이터 내보내기·가져오기 (다른 기기로 옮기기) ----------

const EXPORT_FORMAT = 'sweet-afternoon-shift';

function exportData() {
  if (state.dirty) {
    if (!confirm(TEXTS.confirmSaveBeforeExport)) {
      return;
    }
    if (!saveSchedule()) {
      return;
    }
  }
  const data = { format: EXPORT_FORMAT, version: 1, exportedAt: new Date().toISOString(), schedule: cleanSchedule() };
  const fileName = `shift-data_${toKey(new Date()).replaceAll('-', '')}.json`;
  const file = new File([JSON.stringify(data, null, 2)], fileName, { type: 'application/json' });

  // 휴대폰에서는 공유 창(AirDrop, LINE, メール 등)으로 바로 보낸다. 안 되면 파일로 내려받는다.
  const isTouch = window.matchMedia('(pointer: coarse)').matches;
  if (isTouch && navigator.canShare?.({ files: [file] })) {
    navigator.share({ files: [file], title: fileName }).catch((err) => {
      if (err.name !== 'AbortError') {
        console.error('共有に失敗しました', err);
        downloadFile(file);
      }
    });
  } else {
    downloadFile(file);
  }
  setStatus(TEXTS.exported(Object.keys(data.schedule).length));
}

function downloadFile(file) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(file);
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

// 가져온 파일의 하루 데이터를 앱 형식으로 맞춘다. 형식이 틀리면 null.
function normalizeDay(value) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.rows)) {
    return null;
  }
  const text = (v) => (typeof v === 'string' ? v : '');
  return {
    closed: value.closed === true,
    closedNote: text(value.closedNote),
    closedMessage: text(value.closedMessage),
    event: text(value.event),
    rows: value.rows
      .filter((row) => row && typeof row === 'object')
      .slice(0, CONFIG.maxRows)
      .map((row) => ({ name: text(row.name), time: text(row.time) })),
  };
}

async function importData(file) {
  let data;
  try {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('file too large');
    }
    data = JSON.parse(await file.text());
    if (data?.format !== EXPORT_FORMAT || typeof data.schedule !== 'object') {
      throw new Error('unknown format');
    }
  } catch (err) {
    console.error('読み込みに失敗しました', err);
    setStatus(TEXTS.importInvalid, true);
    return;
  }

  const imported = {};
  for (const [key, value] of Object.entries(data.schedule)) {
    const day = normalizeDay(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(key) && day) {
      imported[key] = day;
    }
  }
  const count = Object.keys(imported).length;
  if (count === 0 || !confirm(TEXTS.confirmImport(count))) {
    if (count === 0) {
      setStatus(TEXTS.importEmpty, true);
    }
    return;
  }
  Object.assign(state.schedule, imported);
  if (saveSchedule()) {
    setStatus(TEXTS.imported(count));
  }
  document.getElementById('data-dialog').close();
  selectWeek(state.weekOffset);
}

function handleAction(action) {
  const actions = {
    save: saveSchedule,
    print: () => window.print(),
    download: openImagePreview,
    'copy-prev': copyPreviousWeek,
    clear: clearWeek,
    data: () => document.getElementById('data-dialog').showModal(),
  };
  actions[action]?.();
}

// ---------- 시작 ----------

function selectWeek(offset) {
  state.weekOffset = offset;
  renderWeekNav();
  renderEditor();
  drawPoster();
}

function loadTemplate() {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('テンプレート画像を読み込めませんでした'));
    image.src = CONFIG.templateImage;
  });
}

// index.html 의 data-text / data-text-label / data-text-alt 에 texts.js 의 문구를 넣는다.
function applyTexts() {
  document.title = TEXTS.pageTitle;
  document.querySelectorAll('[data-text]').forEach((node) => {
    node.textContent = TEXTS[node.dataset.text];
  });
  document.querySelectorAll('[data-text-label]').forEach((node) => {
    node.setAttribute('aria-label', TEXTS[node.dataset.textLabel]);
  });
  document.querySelectorAll('[data-text-alt]').forEach((node) => {
    node.alt = TEXTS[node.dataset.textAlt];
  });
}

async function init() {
  applyTexts();
  state.schedule = loadSchedule();
  try {
    state.template = await loadTemplate();
  } catch (err) {
    console.error(err);
    setStatus(TEXTS.templateFailed, true);
    return;
  }

  selectWeek(0);
  setupCombos();
  if (SHOW_GUIDE) {
    setStatus(TEXTS.guideOn);
  }
  // 웹폰트가 늦게 도착하면 다시 그린다.
  Promise.all([document.fonts.load(`700 40px ${CONFIG.font}`), document.fonts.load(`500 40px ${CONFIG.font}`)])
    .then(() => drawPoster())
    .catch((err) => console.error('フォントの読み込みに失敗しました', err));

  document.querySelector('.week-nav').addEventListener('click', (event) => {
    const move = event.target.closest('button[data-week]')?.dataset.week;
    const next = { prev: state.weekOffset - 1, next: state.weekOffset + 1, today: 0 }[move];
    if (next !== undefined) {
      selectWeek(next);
    }
  });
  document.getElementById('week-picker').addEventListener('change', (event) => {
    if (event.target.value) {
      const [y, m, d] = event.target.value.split('-').map(Number);
      selectWeek(weekOffsetOf(new Date(y, m - 1, d)));
    }
  });

  const dialog = document.getElementById('day-dialog');
  for (const container of [document.getElementById('days'), dialog]) {
    container.addEventListener('input', handleEditorInput);
    container.addEventListener('click', handleEditorClick);
  }
  dialog.querySelector('[data-action="close-dialog"]').addEventListener('click', () => dialog.close());

  const imageDialog = document.getElementById('image-dialog');
  imageDialog.querySelector('[data-action="close-image"]').addEventListener('click', () => imageDialog.close());
  imageDialog.addEventListener('close', closeImagePreview);

  const dataDialog = document.getElementById('data-dialog');
  const importInput = document.getElementById('import-file');
  dataDialog.querySelector('[data-action="export"]').addEventListener('click', exportData);
  dataDialog.querySelector('[data-action="import"]').addEventListener('click', () => importInput.click());
  dataDialog.querySelector('[data-action="close-data"]').addEventListener('click', () => dataDialog.close());
  importInput.addEventListener('change', () => {
    if (importInput.files[0]) {
      importData(importInput.files[0]);
    }
    // 같은 파일을 다시 골라도 change 가 일어나도록 비운다.
    importInput.value = '';
  });
  const imageViewport = document.getElementById('image-viewport');
  const isZoomed = () => imageViewport.classList.contains('is-zoomed');
  document.getElementById('image-preview').addEventListener('click', (event) => setImageZoom(!isZoomed(), event));
  imageDialog.querySelector('[data-action="toggle-zoom"]').addEventListener('click', () => setImageZoom(!isZoomed()));
  document.querySelector('.poster__zoom').addEventListener('click', openImagePreview);
  // 모달에서 고친 값을 목록에도 반영한다.
  dialog.addEventListener('close', renderEditor);

  const poster = document.getElementById('poster');
  poster.addEventListener('click', (event) => {
    const index = cardIndexAt(poster, event.clientX, event.clientY);
    if (index >= 0) {
      openDayDialog(index);
    }
  });
  poster.addEventListener('mousemove', (event) => {
    poster.style.cursor = cardIndexAt(poster, event.clientX, event.clientY) >= 0 ? 'pointer' : 'default';
  });
  document.querySelector('.actions').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (button) {
      handleAction(button.dataset.action);
    }
  });
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      saveSchedule();
    }
  });
  window.addEventListener('beforeunload', (event) => {
    if (state.dirty) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
