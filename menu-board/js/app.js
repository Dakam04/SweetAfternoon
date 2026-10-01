'use strict';

const CONFIG = window.MENU_CONFIG;
const TEXTS = window.MENU_TEXTS;
const ITEM_FIELDS = ['name', 'price'];
// capsule 칸에서 이 이름의 행은 품목 대신 구분 장식이 된다.
const DIVIDER = '---';

const state = {
  pageIndex: 0,
  // { pageId: { sectionId: { title, note, items: [{ name, price }] } | { text, sub } } }
  // note 가 null 이면 메모 없음
  menu: {},
  dirty: false,
  // pages 와 같은 순서의, 원래 글자를 지운 템플릿 (canvas)
  bases: [],
  // { sectionId: { icon, divider } } 원래 이미지에서 잘라 둔 장식 (canvas)
  sprites: {},
  // pages 와 같은 순서로, 임시 이미지를 쓰고 있는지
  customImages: [],
};

// ---------- 메뉴 데이터 ----------

function currentPage() {
  return CONFIG.pages[state.pageIndex];
}

function findSection(page, sectionId) {
  return page.sections.find((section) => section.id === sectionId);
}

// 칸 안의 이름 붙은 한 줄들 (fields) 의 처음 내용 / 저장된 내용
function fieldValues(section, saved) {
  return Object.fromEntries(
    (section.fields || []).map((field) => [field.key, typeof saved?.[field.key] === 'string' ? saved[field.key] : field.text || '']),
  );
}

function defaultSection(section) {
  if (section.type === 'text') {
    return { text: section.text || '', sub: section.sub?.text || '' };
  }
  if (section.type === 'fields') {
    return { fields: fieldValues(section) };
  }
  // list 의 처음 항목은 글자만 적어 두었으므로 price 형식으로 맞춘다.
  const items = (section.items || []).map((item) => (typeof item === 'string' ? { name: item } : item));
  return {
    title: section.title?.text || '',
    note: section.note?.text ?? null,
    fields: fieldValues(section),
    items: items.map((item) => ({ name: item.name || '', price: item.price || '' })),
  };
}

function defaultPage(page) {
  return Object.fromEntries(page.sections.map((section) => [section.id, defaultSection(section)]));
}

// 저장·가져온 칸 하나를 앱 형식으로 맞춘다. 형식이 틀리면 null.
function normalizeSection(section, value) {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const text = (v) => (typeof v === 'string' ? v : '');
  if (section.type === 'text') {
    if (typeof value.text !== 'string') {
      return null;
    }
    return { text: value.text, sub: typeof value.sub === 'string' ? value.sub : section.sub?.text || '' };
  }
  if (section.type === 'fields') {
    return { fields: fieldValues(section, value.fields) };
  }
  if (!Array.isArray(value.items)) {
    return null;
  }
  return {
    // 제목이 없던 예전 데이터는 처음 제목을 쓴다.
    title: typeof value.title === 'string' ? value.title : section.title?.text || '',
    // 메모는 지운 상태(null)도 그대로 살린다.
    note: typeof value.note === 'string' || value.note === null ? value.note : section.note?.text ?? null,
    fields: fieldValues(section, value.fields),
    items: value.items
      .filter((item) => item && typeof item === 'object')
      .slice(0, section.maxItems)
      .map((item) => ({ name: text(item.name), price: text(item.price) })),
  };
}

// 저장된 내용을 읽고, 없는 칸은 처음 내용으로 채운다.
function loadMenu() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(CONFIG.storageKey)) || {};
  } catch (err) {
    console.error('保存されたメニューを読み込めませんでした', err);
  }
  const menu = {};
  for (const page of CONFIG.pages) {
    menu[page.id] = defaultPage(page);
    for (const section of page.sections) {
      const value = normalizeSection(section, saved[page.id]?.[section.id]);
      if (value) {
        menu[page.id][section.id] = value;
      }
    }
  }
  return menu;
}

function saveMenu() {
  try {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(state.menu));
  } catch (err) {
    console.error('メニューの保存に失敗しました', err);
    setStatus(TEXTS.saveFailed, true);
    return false;
  }
  setDirty(false);
  setStatus(TEXTS.saved);
  return true;
}

function sectionData(pageId, sectionId) {
  return state.menu[pageId][sectionId];
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
  drawPage(state.pageIndex);
}

// ---------- 탭 ----------

function renderTabs() {
  const tabs = document.getElementById('page-tabs');
  tabs.replaceChildren(
    ...CONFIG.pages.map((page, index) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'page-tabs__tab';
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(index === state.pageIndex));
      tab.dataset.index = String(index);
      tab.textContent = pageLabel(page);
      return tab;
    }),
  );
}

function pageLabel(page) {
  return TEXTS.pageTabs[page.id] || page.id;
}

function selectPage(index) {
  state.pageIndex = index;
  renderTabs();
  document.querySelectorAll('#posters canvas').forEach((canvas, i) => {
    canvas.hidden = i !== index;
  });
  renderImageControls();
  renderEditor();
}

// ---------- 입력 화면 ----------

function renderEditor() {
  const page = currentPage();
  document.getElementById('sections').replaceChildren(...page.sections.map((section) => renderSectionPanel(page, section)));
}

function textInput(fieldName, value, placeholder, maxLength) {
  const input = document.createElement('input');
  input.dataset.field = fieldName;
  input.value = value;
  input.placeholder = placeholder;
  input.maxLength = maxLength;
  input.autocomplete = 'off';
  input.setAttribute('aria-label', placeholder);
  return input;
}

function field(labelText, control) {
  const label = document.createElement('label');
  label.className = 'field';
  const caption = document.createElement('span');
  caption.className = 'field__label';
  caption.textContent = labelText;
  label.append(caption, control);
  return label;
}

function iconButton(action, label, text) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'item__button';
  button.dataset.action = action;
  button.textContent = text;
  button.setAttribute('aria-label', label);
  return button;
}

function renderSectionPanel(page, section) {
  const data = sectionData(page.id, section.id);
  const panel = document.createElement('article');
  panel.className = `section section--${section.type}`;
  panel.dataset.section = section.id;

  const head = document.createElement('header');
  head.className = 'section__head';
  const title = document.createElement('h2');
  title.textContent = section.label;
  head.append(title);

  if (section.type === 'fields') {
    panel.append(head, ...fieldInputs(section, data, false));
    return panel;
  }

  if (section.type === 'text') {
    const fields = [field(section.sub ? TEXTS.titleLabel : TEXTS.textLabel, textInput('text', data.text, TEXTS.textPlaceholder, 40))];
    if (section.sub) {
      fields.push(field(TEXTS.subLabel, textInput('sub', data.sub, TEXTS.textPlaceholder, 30)));
    }
    panel.append(head, ...fields);
    return panel;
  }

  const titleInput = section.title ? textInput('title', data.title, TEXTS.titlePlaceholder, 20) : null;
  titleInput?.setAttribute('aria-label', TEXTS.titleLabel);

  const count = document.createElement('span');
  count.className = 'section__count';
  count.textContent = TEXTS.itemCount(data.items.length, section.maxItems);
  head.append(count);

  const items = document.createElement('div');
  items.className = 'section__items';
  data.items.forEach((item, index) => items.append(renderItem(section, item, index, data.items.length)));

  const full = data.items.length >= section.maxItems;
  const buttons = document.createElement('div');
  buttons.className = 'section__buttons';
  buttons.append(addButton('add-item', TEXTS.addItem, full));
  if (section.type === 'capsule') {
    buttons.append(addButton('add-divider', TEXTS.addDivider, full));
  }

  if (data.note === null) {
    buttons.append(addButton('add-note', TEXTS.addNote, false));
  }

  panel.append(
    head,
    ...(titleInput ? [field(TEXTS.titleLabel, titleInput)] : []),
    ...fieldInputs(section, data, false),
    ...noteField(data),
    items,
    buttons,
    ...fieldInputs(section, data, true),
  );
  return panel;
}

// 칸 안의 이름 붙은 한 줄들. after: true 인 줄은 품목 목록 아래에 둔다.
function fieldInputs(section, data, after) {
  return (section.fields || [])
    .filter((spec) => Boolean(spec.after) === after)
    .map((spec) => {
      const input = textInput('fields', data.fields[spec.key], spec.label, 40);
      input.dataset.key = spec.key;
      return field(spec.label, input);
    });
}

// 메모 입력칸 (메모가 있을 때만). 오른쪽 ×로 메모를 없앤다.
function noteField(data) {
  if (data.note === null) {
    return [];
  }
  const line = document.createElement('div');
  line.className = 'note';
  const input = textInput('note', data.note, TEXTS.notePlaceholder, 30);
  line.append(input, iconButton('remove-note', TEXTS.removeNote, '×'));
  return [field(TEXTS.noteLabel, line)];
}

function addButton(action, text, disabled) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'section__add';
  button.dataset.action = action;
  button.textContent = text;
  button.disabled = disabled;
  return button;
}

function renderItem(section, item, index, total) {
  const line = document.createElement('div');
  line.className = 'item';
  line.dataset.index = String(index);
  if (section.type === 'capsule' && item.name === DIVIDER) {
    const label = document.createElement('span');
    label.className = 'item__divider';
    label.textContent = TEXTS.dividerLabel;
    line.append(label);
  } else {
    line.append(textInput('name', item.name, TEXTS.namePlaceholder, 20));
  }
  if (section.type === 'capsule' && item.name === DIVIDER) {
    line.append(document.createElement('span'));
  } else {
    const price = textInput('price', item.price, TEXTS.pricePlaceholder, 12);
    price.setAttribute('aria-label', TEXTS.priceLabel);
    line.append(price);
  }
  const up = iconButton('move-up', TEXTS.moveUp, '↑');
  up.disabled = index === 0;
  const down = iconButton('move-down', TEXTS.moveDown, '↓');
  down.disabled = index === total - 1;
  line.append(up, down, iconButton('remove-item', TEXTS.removeItem, '×'));
  return line;
}

function handleEditorInput(event) {
  const panel = event.target.closest('.section');
  const fieldName = event.target.dataset.field;
  if (!panel || !fieldName) {
    return;
  }
  const data = sectionData(currentPage().id, panel.dataset.section);
  if (ITEM_FIELDS.includes(fieldName)) {
    data.items[Number(event.target.closest('.item').dataset.index)][fieldName] = event.target.value;
  } else if (fieldName === 'fields') {
    data.fields[event.target.dataset.key] = event.target.value;
  } else {
    data[fieldName] = event.target.value;
  }
  markChanged();
}

function handleEditorClick(event) {
  const button = event.target.closest('button[data-action]');
  const panel = event.target.closest('.section');
  if (!button || !panel) {
    return;
  }
  const action = button.dataset.action;
  const section = findSection(currentPage(), panel.dataset.section);
  const data = sectionData(currentPage().id, section.id);
  if (action === 'add-note' || action === 'remove-note') {
    data.note = action === 'add-note' ? '' : null;
    refreshPanels();
    if (action === 'add-note') {
      event.currentTarget.querySelector(`.section[data-section="${section.id}"] [data-field="note"]`)?.focus();
    }
    markChanged();
    return;
  }
  const { items } = data;
  const index = Number(button.closest('.item')?.dataset.index);
  let focusIndex = null;

  if (action === 'add-item' && items.length < section.maxItems) {
    items.push({ name: '', price: '' });
    focusIndex = items.length - 1;
  } else if (action === 'add-divider' && items.length < section.maxItems) {
    items.push({ name: DIVIDER, price: '' });
  } else if (action === 'remove-item') {
    items.splice(index, 1);
  } else if (action === 'move-up' && index > 0) {
    [items[index - 1], items[index]] = [items[index], items[index - 1]];
  } else if (action === 'move-down' && index < items.length - 1) {
    [items[index], items[index + 1]] = [items[index + 1], items[index]];
  } else {
    return;
  }
  refreshPanels();
  if (focusIndex !== null) {
    event.currentTarget.querySelector(`.section[data-section="${section.id}"] .item[data-index="${focusIndex}"] input`)?.focus();
  }
  markChanged();
}

// 행 추가·삭제처럼 구조가 바뀌면 목록과 열려 있는 모달을 함께 다시 그린다.
function refreshPanels() {
  renderEditor();
  const dialog = document.getElementById('section-dialog');
  if (dialog.open) {
    renderDialog(dialog.dataset.section);
  }
}

// ---------- 수정 모달 ----------

function renderDialog(sectionId) {
  const page = currentPage();
  document.getElementById('dialog-body').replaceChildren(renderSectionPanel(page, findSection(page, sectionId)));
}

function openSectionDialog(sectionId) {
  const dialog = document.getElementById('section-dialog');
  dialog.dataset.section = sectionId;
  renderDialog(sectionId);
  dialog.showModal();
  // 기본으로는 첫 입력칸에 포커스가 가서 휴대폰 키보드가 뜬다. 완료 버튼으로 옮긴다.
  dialog.querySelector('[data-action="close-dialog"]').focus();
}

// 포스터 위 클릭 좌표를 템플릿 좌표로 바꿔 어느 칸인지 찾는다.
function sectionAt(canvas, clientX, clientY) {
  const page = currentPage();
  const rect = canvas.getBoundingClientRect();
  const scale = page.template.width / rect.width;
  const x = (clientX - rect.left) * scale;
  const y = (clientY - rect.top) * scale;
  const margin = 8;
  return page.sections.find((section) =>
    [...section.areas, ...[section.title, section.sub, section.note, ...(section.fields || [])].flatMap((spec) => spec?.areas || [])].some(
      ([ax, ay, w, h]) => x >= ax - margin && x <= ax + w + margin && y >= ay - margin && y <= ay + h + margin,
    ),
  );
}

// ---------- 포스터 ----------

function setFont(ctx, weight, size, family = 'mincho', style = 'normal') {
  ctx.font = `${style} ${weight} ${size}px ${CONFIG.fonts[family]}`;
}

// 글자 사이를 벌려 쓴다. canvas letterSpacing 을 못 쓰는 브라우저가 있어 한 글자씩 그린다.
function spacedWidth(ctx, text, spacing) {
  const chars = [...text];
  return chars.reduce((sum, char) => sum + ctx.measureText(char).width, 0) + spacing * Math.max(0, chars.length - 1);
}

function drawSpaced(ctx, text, x, y, spacing, align = 'left') {
  const width = spacedWidth(ctx, text, spacing);
  let cursor = align === 'left' ? x : align === 'right' ? x - width : x - width / 2;
  ctx.textAlign = 'left';
  for (const char of text) {
    ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width + spacing;
  }
  return width;
}

// 글자가 maxWidth 를 넘으면 크기와 간격을 줄여서 [크기, 간격] 을 돌려준다.
function fitText(ctx, text, weight, size, spacing, maxWidth, family) {
  setFont(ctx, weight, size, family);
  const width = spacedWidth(ctx, text, spacing);
  if (width > maxWidth) {
    const ratio = maxWidth / width;
    size *= ratio;
    spacing *= ratio;
    setFont(ctx, weight, size, family);
  }
  return [size, spacing];
}

// ---------- 원래 글자 지우기 ----------

// 페이지마다 한 번, 템플릿 이미지에서 원래 글자를 지운 바탕을 만들어 둔다.
// 품목 자리는 주변 바탕색으로 덮고, 리본 위 제목은 글자 부분만 주변 색으로 메운다.
function buildBase(page, image) {
  const scale = image.naturalWidth / page.template.width;
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  const toPixels = (rect) => {
    const [x, y, w, h] = rect.map((v) => v * scale);
    return [Math.floor(x), Math.floor(y), Math.ceil(w), Math.ceil(h)];
  };

  // 지우기 전에, 칸을 다시 그릴 때 쓸 아이콘과 구분 장식을 잘라 둔다.
  for (const section of page.sections) {
    if (section.iconRect || section.dividerRect) {
      state.sprites[section.id] = {
        icon: section.iconRect && cropCanvas(canvas, toPixels(section.iconRect)),
        divider: section.dividerRect && cropCanvas(canvas, toPixels(section.dividerRect)),
      };
    }
  }

  for (const spec of eraseSpecs(page)) {
    for (const rect of spec.erase || spec.areas) {
      const pixels = toPixels(rect);
      try {
        if (spec.inpaint) {
          inpaintRect(ctx, pixels, scale);
        } else {
          ctx.fillStyle = paperColor(ctx, pixels);
          ctx.fillRect(...pixels);
        }
      } catch (err) {
        // file:// 로 열면 이미지 픽셀을 읽을 수 없다. 설정의 바탕색으로 덮는다.
        ctx.fillStyle = CONFIG.paperColor;
        ctx.fillRect(...pixels);
      }
    }
  }
  return canvas;
}

function cropCanvas(source, [x, y, w, h]) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(source, x, y, w, h, 0, 0, w, h);
  return canvas;
}

// 지워야 할 곳: 각 칸과 그 칸의 제목
function eraseSpecs(page) {
  return page.sections.flatMap((section) =>
    [section.type !== 'fields' && section, section.title, section.sub, section.note?.areas && section.note, ...(section.fields || [])].filter(Boolean),
  );
}

// 영역 테두리의 밝은 점들의 평균색
function paperColor(ctx, [x, y, w, h]) {
  const strips = [ctx.getImageData(x, y, w, 2), ctx.getImageData(x, y + h - 2, w, 2), ctx.getImageData(x, y, 2, h), ctx.getImageData(x + w - 2, y, 2, h)];
  const sum = [0, 0, 0];
  let count = 0;
  for (const { data } of strips) {
    for (let i = 0; i < data.length; i += 4) {
      // 글자나 그림이 걸친 점은 빼고 종이 부분만 쓴다.
      if (data[i] + data[i + 1] + data[i + 2] > 720) {
        sum[0] += data[i];
        sum[1] += data[i + 1];
        sum[2] += data[i + 2];
        count += 1;
      }
    }
  }
  return count > 0 ? `rgb(${sum.map((v) => Math.round(v / count)).join(' ')})` : CONFIG.paperColor;
}

// 영역 안에서 주변보다 진한 파란 글자 부분을 찾아, 바깥 색을 안쪽으로 번지게 해서 메운다.
// 리본의 그라데이션과 곡선 테두리가 그대로 이어진다.
function inpaintRect(ctx, [x, y, w, h], scale) {
  const image = ctx.getImageData(x, y, w, h);
  const { data } = image;
  const size = w * h;
  const light = new Float32Array(size);
  for (let i = 0; i < size; i += 1) {
    light[i] = data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2];
  }
  // 영역에서 밝은 쪽 20% 의 밝기를 바탕으로 보고, 그보다 확실히 어두운 파란 점을 글자로 본다.
  const threshold = Float32Array.from(light).sort()[Math.floor(size * 0.8)] - 40;
  let mask = new Uint8Array(size);
  for (let i = 0; i < size; i += 1) {
    mask[i] = light[i] < threshold && data[i * 4 + 2] - data[i * 4] > 12 ? 1 : 0;
  }
  // 글자 가장자리의 옅은 부분까지 지우도록 넓힌다.
  for (let step = 0; step < Math.max(2, Math.round(2 * scale)); step += 1) {
    const grown = mask.slice();
    for (let i = 0; i < size; i += 1) {
      if (mask[i]) {
        const px = i % w;
        if (px > 0) grown[i - 1] = 1;
        if (px < w - 1) grown[i + 1] = 1;
        if (i >= w) grown[i - w] = 1;
        if (i < size - w) grown[i + w] = 1;
      }
    }
    mask = grown;
  }

  // 영역 가장자리는 메울 때 기준이 되므로 남긴다.
  const holes = [];
  const average = [0, 0, 0];
  let kept = 0;
  for (let i = 0; i < size; i += 1) {
    const px = i % w;
    const edge = px === 0 || px === w - 1 || i < w || i >= size - w;
    if (mask[i] && !edge) {
      holes.push(i);
    } else {
      for (let c = 0; c < 3; c += 1) average[c] += data[i * 4 + c];
      kept += 1;
    }
  }
  if (holes.length === 0) {
    return;
  }
  const pixels = new Float32Array(size * 3);
  for (let i = 0; i < size; i += 1) {
    for (let c = 0; c < 3; c += 1) pixels[i * 3 + c] = data[i * 4 + c];
  }
  for (const i of holes) {
    for (let c = 0; c < 3; c += 1) pixels[i * 3 + c] = average[c] / kept;
  }
  // 구멍마다 상하좌우 평균으로 바꾸기를 되풀이한다. (해상도가 높을수록 더 많이)
  const rounds = Math.round(300 * scale);
  const row = w * 3;
  for (let round = 0; round < rounds; round += 1) {
    for (const i of holes) {
      for (let c = 0; c < 3; c += 1) {
        const k = i * 3 + c;
        pixels[k] = (pixels[k - 3] + pixels[k + 3] + pixels[k - row] + pixels[k + row]) / 4;
      }
    }
  }
  for (const i of holes) {
    for (let c = 0; c < 3; c += 1) data[i * 4 + c] = pixels[i * 3 + c];
  }
  ctx.putImageData(image, x, y);
}

// ---------- 포스터 그리기 ----------

function drawPage(pageIndex) {
  const page = CONFIG.pages[pageIndex];
  const canvas = document.querySelectorAll('#posters canvas')[pageIndex];
  const { width, height } = page.template;
  const scale = CONFIG.outputWidth / width;
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  // 좌표는 template 크기 기준으로 쓰고, 출력 크기로 늘려 그린다.
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.drawImage(state.bases[pageIndex], 0, 0, width, height);
  ctx.textBaseline = 'middle';

  for (const section of page.sections) {
    const data = sectionData(page.id, section.id);
    if (section.type === 'text') {
      drawTextLine(ctx, section, data.text.trim());
      if (section.sub) {
        drawTextLine(ctx, section.sub, data.sub.trim());
      }
      continue;
    }
    if (section.title) {
      drawTextLine(ctx, section.title, data.title.trim());
    }
    for (const spec of section.fields || []) {
      const value = data.fields[spec.key].trim();
      if (spec.kind === 'price') {
        drawBigPrice(ctx, spec, value);
      } else {
        drawTextLine(ctx, spec, value);
      }
    }
    if (section.type === 'fields') {
      continue;
    }
    const layout = drawNote(ctx, section, data.note?.trim());
    ctx.fillStyle = CONFIG.inkColor;
    const items = data.items.filter((item) => item.name.trim() || item.price.trim());
    if (section.type === 'capsule') {
      drawCapsules(ctx, layout, items);
    } else {
      drawItems(ctx, layout, items);
    }
  }
}

// 한 줄 (안내문, 제목). spec 은 text 칸 또는 칸의 title.
function drawTextLine(ctx, spec, text) {
  if (!text) {
    return;
  }
  if (spec.latin) {
    drawMixedLine(ctx, spec, text);
    return;
  }
  const [x, y, w, h] = spec.areas[0];
  const family = spec.fontFamily || 'mincho';
  const condense = spec.condense || 1;
  // 원래 제목 자리보다 조금 넘치는 것까지 허용하고, 그보다 길면 줄인다.
  const [, spacing] = fitText(ctx, text, spec.fontWeight || 500, spec.fontSize, spec.letterSpacing || 0, (w * 1.05) / condense, family);
  // 글꼴마다 글자 높이 기준이 달라서, 실제 글자 모양의 위아래를 재서 영역 가운데에 맞춘다.
  ctx.textBaseline = 'alphabetic';
  const ink = ctx.measureText(text);
  const baseline = y + h / 2 + (ink.actualBoundingBoxAscent - ink.actualBoundingBoxDescent) / 2;
  if (spec.gradient || spec.arc || condense !== 1) {
    drawStyledText(ctx, spec, text, baseline, spacing);
  } else {
    ctx.fillStyle = spec.color || CONFIG.inkColor;
    drawSpaced(ctx, text, spec.align === 'left' ? x : x + w / 2, baseline, spacing, spec.align === 'left' ? 'left' : 'center');
  }
  ctx.textBaseline = 'middle';
}

// 일본어는 명조, 숫자·영문(800yen 등)은 latin 에 정한 글꼴(이탤릭 세리프 등)로 섞어 쓴다.
function drawMixedLine(ctx, spec, text) {
  const [x, y, w, h] = spec.areas[0];
  const latin = spec.latin;
  const weight = spec.fontWeight || 500;
  const parts = text.split(/([A-Za-z0-9][A-Za-z0-9,.%]*)/).filter(Boolean);
  const isLatin = (part) => /^[A-Za-z0-9]/.test(part);
  const setPartFont = (part, size) => {
    if (isLatin(part)) {
      setFont(ctx, latin.weight || weight, size * (latin.scale || 1), latin.family, latin.style || 'normal');
    } else {
      setFont(ctx, weight, size, spec.fontFamily || 'mincho');
    }
  };
  const measure = (size, spacing) =>
    parts.reduce((sum, part) => {
      setPartFont(part, size);
      return sum + (isLatin(part) ? ctx.measureText(part).width : spacedWidth(ctx, part, spacing)) + spacing;
    }, -spacing);

  let size = spec.fontSize;
  let spacing = spec.letterSpacing || 0;
  const natural = measure(size, spacing);
  if (natural > w * 1.05) {
    size *= (w * 1.05) / natural;
    spacing *= (w * 1.05) / natural;
  }
  const total = measure(size, spacing);
  let cursor = spec.align === 'left' ? x : x + w / 2 - total / 2;
  const baseline = y + h / 2 + size * 0.35;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = spec.color || CONFIG.inkColor;
  for (const part of parts) {
    setPartFont(part, size);
    if (isLatin(part)) {
      ctx.textAlign = 'left';
      ctx.fillText(part, cursor, baseline);
      cursor += ctx.measureText(part).width + spacing;
    } else {
      cursor += drawSpaced(ctx, part, cursor, baseline, spacing) + spacing;
    }
  }
  ctx.textBaseline = 'middle';
}

// 제목용: 리본 곡선을 따라 글자를 휘게(arc) 쓰고, 글자 폭을 좁히고(condense), 그라데이션으로 칠한다.
// 글자를 따로 그린 판에 모양만 찍고 그 위에 그라데이션을 덮은 뒤 포스터에 옮긴다.
function drawStyledText(ctx, spec, text, baseline, spacing) {
  const [x, y, w, h] = spec.areas[0];
  const scale = ctx.getTransform().a;
  const margin = h;
  const layer = document.createElement('canvas');
  layer.width = Math.ceil((w + margin * 2) * scale);
  layer.height = Math.ceil((h + margin * 2) * scale);
  const lc = layer.getContext('2d');
  lc.setTransform(scale, 0, 0, scale, -(x - margin) * scale, -(y - margin) * scale);
  lc.font = ctx.font;
  lc.textBaseline = 'alphabetic';
  lc.textAlign = 'center';
  lc.fillStyle = spec.color || CONFIG.inkColor;

  const condense = spec.condense || 1;
  const chars = [...text];
  const widths = chars.map((char) => lc.measureText(char).width * condense);
  const total = widths.reduce((sum, v) => sum + v, 0) + spacing * (chars.length - 1);
  const centerX = spec.align === 'left' ? x + total / 2 : x + w / 2;
  // arc: 가운데가 양끝보다 얼마나 올라가는지(px). 원의 반지름으로 바꿔 글자를 원을 따라 놓는다.
  const rise = spec.arc || 0;
  const radius = rise > 0 ? (total / 2) ** 2 / (2 * rise) + rise / 2 : 0;
  const top = baseline - rise / 2;

  let cursor = 0;
  chars.forEach((char, i) => {
    const offset = cursor + widths[i] / 2 - total / 2;
    const angle = radius ? offset / radius : 0;
    const px = radius ? centerX + radius * Math.sin(angle) : centerX + offset;
    const py = radius ? top + radius * (1 - Math.cos(angle)) : baseline;
    lc.save();
    lc.translate(px, py);
    lc.rotate(angle);
    lc.scale(condense, 1);
    lc.fillText(char, 0, 0);
    lc.restore();
    cursor += widths[i] + spacing;
  });

  if (spec.gradient) {
    // 글자 왼쪽 끝부터 오른쪽 끝까지 색을 차례로 칠한다.
    const left = centerX - total / 2;
    const fill = lc.createLinearGradient(left, 0, left + total, 0);
    spec.gradient.forEach((color, i) => fill.addColorStop(i / (spec.gradient.length - 1), color));
    lc.globalCompositeOperation = 'source-in';
    lc.fillStyle = fill;
    lc.fillRect(x - margin, y - margin, w + margin * 2, h + margin * 2);
  }

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(layer, Math.floor((x - margin) * scale), Math.floor((y - margin) * scale));
  ctx.restore();
}

// 메모를 쓰고, 품목을 그릴 칸 정보를 돌려준다.
// 메모 자리가 정해져 있지 않은 칸은 맨 위 한 줄을 메모에 쓰고, 품목은 그만큼 아래로 내린다.
function drawNote(ctx, section, note) {
  if (!note) {
    return section;
  }
  const text = TEXTS.posterNote(note);
  if (section.note?.areas) {
    drawTextLine(ctx, section.note, text);
    return section;
  }
  const noteHeight = (section.capsule?.height || section.lineHeight) * 0.8;
  const [x, y, w] = section.areas[0];
  drawTextLine(ctx, {
    areas: [[x, y, w, noteHeight]],
    fontSize: section.noteSize || section.fontSize * 0.7,
    letterSpacing: 1,
    color: section.color,
  }, text);
  return { ...section, areas: section.areas.map(([ax, ay, aw, ah]) => [ax, ay + noteHeight, aw, ah - noteHeight]) };
}

// 리모트 메뉴: 품목마다 둥근 칸을 그리고 아이콘·이름·점선·가격을 넣는다.
// 칸이 많으면 간격과 글자를 줄이고, 적으면 영역의 위아래 가운데에 모은다.
function drawCapsules(ctx, section, items) {
  if (items.length === 0) {
    return;
  }
  const [x, y, w, h] = section.areas[0];
  const { height, pitch, dividerSpace } = section.capsule;
  const dividers = items.filter((item) => item.name === DIVIDER).length;
  const rows = items.length - dividers;
  const natural = rows * pitch - (pitch - height) + dividers * dividerSpace;
  const ratio = Math.min(1, h / natural);
  const fontRatio = ratio < 1 ? Math.max(0.6, ratio * 1.05) : 1;
  const sprites = state.sprites[section.id] || {};
  let top = y + (h - natural * ratio) / 2;

  for (const item of items) {
    if (item.name === DIVIDER) {
      if (sprites.divider) {
        const dw = section.dividerRect[2] * fontRatio;
        const dh = section.dividerRect[3] * fontRatio;
        const space = dividerSpace * ratio;
        // 구분 장식은 앞 칸과 다음 칸 사이 틈의 가운데에 둔다.
        const centerY = top - (pitch - height) * ratio / 2 + (space + (pitch - height) * ratio) / 2;
        ctx.drawImage(sprites.divider, x + w / 2 - dw / 2, centerY - dh / 2, dw, dh);
      }
      top += dividerSpace * ratio;
      continue;
    }
    const capsuleH = height * ratio;
    drawCapsule(ctx, x, top, w, capsuleH);
    const centerY = top + capsuleH / 2;
    if (sprites.icon) {
      const [, , iw, ih] = section.iconRect;
      const scale = Math.min(1, capsuleH / ih * 0.8);
      ctx.drawImage(sprites.icon, x + 60 - (iw * scale) / 2, centerY - (ih * scale) / 2, iw * scale, ih * scale);
    }
    drawCapsuleRow(ctx, section, x, w, centerY, item, fontRatio);
    top += pitch * ratio;
  }
}

function drawCapsule(ctx, x, y, w, h) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.shadowColor = 'rgba(150, 160, 200, 0.25)';
  ctx.shadowBlur = 4;
  ctx.fillStyle = '#fdfdff';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#dfe3ef';
  ctx.stroke();
  ctx.restore();
}

function drawCapsuleRow(ctx, section, x, w, centerY, item, fontRatio) {
  const nameX = x + 111;
  const priceRight = x + w - 22;
  const priceWidth = drawPrice(ctx, section, item.price.trim(), priceRight, centerY, section.priceSize * fontRatio);

  const name = item.name.trim();
  ctx.fillStyle = section.color || CONFIG.inkColor;
  const nameRoom = priceRight - priceWidth - nameX - 30;
  const [nameSize, spacing] = fitText(ctx, name, 500, section.fontSize * fontRatio, (section.letterSpacing || 0) * fontRatio, nameRoom);
  const nameWidth = drawSpaced(ctx, name, nameX, centerY, spacing);
  if (name && priceWidth) {
    drawLeader(ctx, section, nameX + nameWidth + nameSize * 0.8, priceRight - priceWidth - nameSize * 1.4, centerY, nameSize);
  }
}

// 가격을 오른쪽 끝에 맞춰 쓰고 폭을 돌려준다. 끝의 글자 단위(yen 등)는 작게 쓴다.
// 가격을 숫자와 끝의 글자 단위(yen 등)로 나누고 각각의 폭을 잰다.
function measurePrice(ctx, section, price, size) {
  const family = section.priceFont || 'mincho';
  const style = section.priceStyle || 'normal';
  const weight = section.priceWeight || 500;
  const match = section.unitScale ? price.match(/^(.*?\d[\d,.]*)\s*([^\d\s][^\d]*)$/) : null;
  const [number, unit] = match ? [match[1], match[2]] : [price, ''];
  setFont(ctx, weight, size * (section.unitScale || 1), family, style);
  const unitWidth = unit ? ctx.measureText(unit).width : 0;
  setFont(ctx, weight, size, family, style);
  const numberWidth = ctx.measureText(number).width;
  return { family, style, weight, number, unit, numberWidth, unitWidth };
}

// 큰 가격 한 줄 (セット 메뉴). 영역 가운데(align: 'left' 면 왼쪽)에 맞추고, 넘치면 줄인다.
function drawBigPrice(ctx, spec, price) {
  if (!price) {
    return;
  }
  const [x, y, w, h] = spec.areas[0];
  let size = spec.fontSize;
  const { numberWidth, unitWidth } = measurePrice(ctx, spec, price, size);
  if (numberWidth + unitWidth > w) {
    size *= w / (numberWidth + unitWidth);
  }
  const width = (numberWidth + unitWidth) * (size / spec.fontSize);
  const right = spec.align === 'left' ? x + width : x + w / 2 + width / 2;
  drawPrice(ctx, spec, price, right, y + h / 2, size);
}

function drawPrice(ctx, section, price, right, centerY, size) {
  if (!price) {
    return 0;
  }
  const { family, style, weight, number, unit, numberWidth, unitWidth } = measurePrice(ctx, section, price, size);

  ctx.save();
  ctx.fillStyle = section.priceColor || CONFIG.inkColor;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const baseline = centerY + size * 0.3;
  ctx.fillText(number, right - unitWidth - numberWidth, baseline);
  if (unit) {
    setFont(ctx, weight, size * section.unitScale, family, style);
    ctx.fillText(unit, right - unitWidth, baseline);
  }
  ctx.restore();
  return numberWidth + unitWidth;
}

// 이름과 가격 사이 점선
function drawLeader(ctx, section, start, end, centerY, size) {
  const style = section.leader || {};
  if (end - start < size) {
    return;
  }
  ctx.save();
  ctx.fillStyle = style.color || CONFIG.leaderColor;
  const step = style.step || size * 0.24;
  const radius = style.radius || size * 0.045;
  for (let dotX = start; dotX <= end; dotX += step) {
    ctx.beginPath();
    ctx.arc(dotX, centerY + size * 0.12, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// 항목을 영역(열)마다 고르게 나눠 위에서부터 채운다. 넘치면 줄 간격과 글자를 줄인다.
function drawItems(ctx, section, items) {
  if (items.length === 0) {
    return;
  }
  const perColumn = Math.ceil(items.length / section.areas.length);
  const lineHeight = Math.min(section.lineHeight, ...section.areas.map((area) => area[3] / perColumn));
  const ratio = lineHeight / section.lineHeight;
  // 줄 간격만큼 다 줄이면 너무 작아지므로 글자는 조금 덜 줄인다.
  const fontRatio = ratio < 1 ? Math.max(0.6, ratio * 1.1) : 1;

  items.forEach((item, i) => {
    const area = section.areas[Math.floor(i / perColumn)];
    const centerY = area[1] + lineHeight * ((i % perColumn) + 0.5);
    if (section.type === 'price') {
      drawPriceRow(ctx, section, area, centerY, item, fontRatio);
    } else {
      drawListRow(ctx, section, area, centerY, item, fontRatio);
    }
  });
}

function drawPriceRow(ctx, section, [x, , w], centerY, item, fontRatio) {
  const name = item.name.trim();
  const price = item.price.trim();
  const priceSize = section.priceSize * fontRatio;

  setFont(ctx, 500, priceSize);
  const priceWidth = price ? ctx.measureText(price).width : 0;
  ctx.textAlign = 'right';
  ctx.fillText(price, x + w, centerY);

  // 이름은 가격과 점선 자리를 남기고 들어가도록 줄인다.
  const nameRoom = w - priceWidth - priceSize * 1.5;
  const [nameSize, spacing] = fitText(ctx, name, 500, section.fontSize * fontRatio, (section.letterSpacing || 0) * fontRatio, nameRoom);
  const nameWidth = drawSpaced(ctx, name, x, centerY, spacing);

  if (name && price) {
    const gap = nameSize * 0.7;
    drawLeader(ctx, section, x + nameWidth + gap, x + w - priceWidth - gap, centerY, nameSize);
  }
}

// ✦ + 이름. 가격을 넣었으면 오른쪽 끝에 쓰고 점선으로 잇는다.
function drawListRow(ctx, section, [x, , w], centerY, item, fontRatio) {
  let size = section.fontSize * fontRatio;
  let letterSpacing = (section.letterSpacing || 0) * fontRatio;
  const name = item.name.trim();
  const price = item.price.trim();
  const right = x + w;
  const bulletX = x + 8;
  if (section.bullet === 'heart') {
    drawHeart(ctx, bulletX, centerY, size * 0.42);
  } else {
    drawSparkle(ctx, bulletX, centerY, size * 0.36);
  }
  const textX = bulletX + size * (section.bullet === 'heart' ? 1.25 : 1.1);

  // 이름과 가격이 한 줄에 다 안 들어가면 둘을 같이 줄인다.
  if (price) {
    setFont(ctx, 500, size);
    const nameNatural = spacedWidth(ctx, name, letterSpacing);
    setFont(ctx, 500, size * 0.95);
    const needed = nameNatural + size * 1.2 + ctx.measureText(price).width;
    const ratio = Math.min(1, (right - textX) / needed);
    size *= ratio;
    letterSpacing *= ratio;
  }

  let priceWidth = 0;
  if (price) {
    setFont(ctx, 500, size * 0.95);
    priceWidth = ctx.measureText(price).width;
    ctx.textAlign = 'right';
    ctx.fillText(price, right, centerY);
  }
  const nameRoom = right - textX - (price ? priceWidth + size * 1.2 : 0);
  const [nameSize, spacing] = fitText(ctx, name, 500, size, letterSpacing, nameRoom);
  const nameWidth = drawSpaced(ctx, name, textX, centerY, spacing);
  if (name && price) {
    drawLeader(ctx, section, textX + nameWidth + nameSize * 0.6, right - priceWidth - nameSize * 0.6, centerY, nameSize);
  }
}


// 목록 앞의 하트(♡ 테두리)
function drawHeart(ctx, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy + r * 0.85);
  ctx.bezierCurveTo(cx - r * 1.3, cy - r * 0.05, cx - r * 0.75, cy - r * 1.05, cx, cy - r * 0.45);
  ctx.bezierCurveTo(cx + r * 0.75, cy - r * 1.05, cx + r * 1.3, cy - r * 0.05, cx, cy + r * 0.85);
  ctx.closePath();
  ctx.fillStyle = 'rgb(255 255 255 / 0.7)';
  ctx.fill();
  ctx.strokeStyle = CONFIG.inkColor;
  ctx.lineWidth = r * 0.16;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}

// 목록 앞의 반짝이(✦ 모양 테두리)
function drawSparkle(ctx, cx, cy, r) {
  const inner = r * 0.28;
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 4; i += 1) {
    const angle = (Math.PI / 2) * i - Math.PI / 2;
    const next = angle + Math.PI / 4;
    ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    ctx.lineTo(cx + Math.cos(next) * inner, cy + Math.sin(next) * inner);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgb(255 255 255 / 0.6)';
  ctx.fill();
  ctx.strokeStyle = CONFIG.bulletColor;
  ctx.lineWidth = r * 0.2;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}

function drawAllPages() {
  CONFIG.pages.forEach((_, index) => drawPage(index));
}

// ---------- 버튼 ----------

function resetPage() {
  const page = currentPage();
  if (!confirm(TEXTS.confirmReset(pageLabel(page)))) {
    return;
  }
  state.menu[page.id] = defaultPage(page);
  renderEditor();
  markChanged();
}

// 저장될 PNG 를 그대로 보여주고, 그 자리에서 내려받는다.
// 휴대폰에서는 미리보기 이미지를 길게 눌러 사진 앱에 저장할 수도 있다.
function openImagePreview() {
  const canvas = document.querySelectorAll('#posters canvas')[state.pageIndex];
  try {
    canvas.toBlob(showImagePreview, 'image/png');
  } catch (err) {
    // file:// 로 열면 템플릿 이미지가 다른 출처로 취급되어 SecurityError 가 난다.
    console.error('画像を作成できませんでした', err);
    setStatus(TEXTS.imageBlocked, true);
  }
}

function showImagePreview(blob) {
  if (!blob) {
    setStatus(TEXTS.imageFailed, true);
    return;
  }
  const dialog = document.getElementById('image-dialog');
  const url = URL.createObjectURL(blob);
  document.getElementById('image-preview').src = url;
  const link = document.getElementById('image-download');
  link.href = url;
  link.download = `menu_${currentPage().id}.png`;
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

const EXPORT_FORMAT = 'sweet-afternoon-menu';

function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function exportData() {
  if (state.dirty) {
    if (!confirm(TEXTS.confirmSaveBeforeExport)) {
      return;
    }
    if (!saveMenu()) {
      return;
    }
  }
  const data = { format: EXPORT_FORMAT, version: 1, exportedAt: new Date().toISOString(), menu: state.menu };
  const fileName = `menu-data_${toKey(new Date())}.json`;
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
  setStatus(TEXTS.exported);
}

function downloadFile(file) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(file);
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

async function importData(file) {
  let data;
  try {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('file too large');
    }
    data = JSON.parse(await file.text());
    if (data?.format !== EXPORT_FORMAT || typeof data.menu !== 'object') {
      throw new Error('unknown format');
    }
  } catch (err) {
    console.error('読み込みに失敗しました', err);
    setStatus(TEXTS.importInvalid, true);
    return;
  }

  const imported = [];
  for (const page of CONFIG.pages) {
    for (const section of page.sections) {
      const value = normalizeSection(section, data.menu[page.id]?.[section.id]);
      if (value) {
        imported.push([page.id, section.id, value]);
      }
    }
  }
  if (imported.length === 0) {
    setStatus(TEXTS.importEmpty, true);
    return;
  }
  if (!confirm(TEXTS.confirmImport(imported.length))) {
    return;
  }
  for (const [pageId, sectionId, value] of imported) {
    state.menu[pageId][sectionId] = value;
  }
  if (saveMenu()) {
    setStatus(TEXTS.imported(imported.length));
  }
  document.getElementById('data-dialog').close();
  renderEditor();
  drawAllPages();
}

// 시프트표로 옮길 때, 저장하지 않은 변경이 있으면 저장할지 먼저 묻는다.
function leaveTo(url) {
  if (state.dirty) {
    if (confirm(TEXTS.confirmSaveBeforeLeave)) {
      if (!saveMenu()) {
        return;
      }
    } else if (!confirm(TEXTS.confirmDiscardBeforeLeave)) {
      return;
    }
  }
  // 이미 물어봤으므로 창을 떠날 때의 경고는 띄우지 않는다.
  state.dirty = false;
  location.href = url;
}

function handleAction(action) {
  const actions = {
    save: saveMenu,
    print: () => window.print(),
    download: openImagePreview,
    reset: resetPage,
    data: () => document.getElementById('data-dialog').showModal(),
  };
  actions[action]?.();
}

// ---------- 임시 이미지 (이 기기에만 저장) ----------

// 급할 때 템플릿 이미지를 서버에 올리기 전에 바꿔 쓰는 용도.
// 이미지는 커서 localStorage 대신 IndexedDB 에 페이지별로 저장한다.
const IMAGE_DB = { name: 'sweet-afternoon-menu-images', store: 'images' };

function openImageDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IMAGE_DB.name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(IMAGE_DB.store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function imageDb(mode, action) {
  const db = await openImageDb();
  return new Promise((resolve, reject) => {
    const request = action(db.transaction(IMAGE_DB.store, mode).objectStore(IMAGE_DB.store));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).finally(() => db.close());
}

// 저장된 임시 이미지. 없거나 읽을 수 없으면 null.
async function loadCustomImage(pageId) {
  try {
    const blob = await imageDb('readonly', (store) => store.get(pageId));
    return blob ? await loadImage(URL.createObjectURL(blob)) : null;
  } catch (err) {
    console.error('仮の画像を読み込めませんでした', err);
    return null;
  }
}

async function replaceImage(file) {
  const page = currentPage();
  let image;
  try {
    image = await loadImage(URL.createObjectURL(file));
    await imageDb('readwrite', (store) => store.put(file, page.id));
  } catch (err) {
    console.error('画像を差し替えられませんでした', err);
    setStatus(TEXTS.imageReplaceFailed, true);
    return;
  }
  useImage(state.pageIndex, image, true);
  // 비율이 다르면 글자 위치가 어긋나므로 알려 준다.
  const ratio = image.naturalWidth / image.naturalHeight / (page.template.width / page.template.height);
  setStatus(Math.abs(ratio - 1) > 0.02 ? TEXTS.imageRatioWarning : TEXTS.imageReplaced, Math.abs(ratio - 1) > 0.02);
}

async function resetImage() {
  const page = currentPage();
  if (!confirm(TEXTS.confirmResetImage)) {
    return;
  }
  try {
    await imageDb('readwrite', (store) => store.delete(page.id));
    useImage(state.pageIndex, await loadImage(page.image), false);
  } catch (err) {
    console.error('元の画像に戻せませんでした', err);
    setStatus(TEXTS.templateFailed, true);
    return;
  }
  setStatus(TEXTS.imageResetDone);
}

function useImage(pageIndex, image, custom) {
  state.bases[pageIndex] = buildBase(CONFIG.pages[pageIndex], image);
  state.customImages[pageIndex] = custom;
  drawPage(pageIndex);
  renderImageControls();
}

// 지금 탭이 임시 이미지를 쓰고 있으면 표시하고 「元の画像に戻す」를 보여 준다.
function renderImageControls() {
  const custom = Boolean(state.customImages[state.pageIndex]);
  document.getElementById('custom-image-note').hidden = !custom;
  document.querySelector('[data-action="reset-image"]').hidden = !custom;
}

// ---------- 시작 ----------

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`テンプレート画像を読み込めませんでした: ${src}`));
    image.src = src;
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
  state.menu = loadMenu();
  try {
    // 임시 이미지가 저장되어 있으면 그것을, 없으면 원래 템플릿을 쓴다.
    const customs = await Promise.all(CONFIG.pages.map((page) => loadCustomImage(page.id)));
    const images = await Promise.all(CONFIG.pages.map((page, index) => customs[index] || loadImage(page.image)));
    state.customImages = customs.map(Boolean);
    state.bases = CONFIG.pages.map((page, index) => buildBase(page, images[index]));
  } catch (err) {
    console.error(err);
    setStatus(TEXTS.templateFailed, true);
    return;
  }

  const posters = document.getElementById('posters');
  posters.replaceChildren(...CONFIG.pages.map(() => document.createElement('canvas')));
  drawAllPages();
  selectPage(0);
  // 웹폰트가 늦게 도착하면 다시 그린다.
  Promise.all([
    document.fonts.load(`700 40px ${CONFIG.fonts.mincho}`),
    document.fonts.load(`500 40px ${CONFIG.fonts.mincho}`),
    document.fonts.load(`600 40px ${CONFIG.fonts.title}`),
    document.fonts.load(`italic 500 40px ${CONFIG.fonts.serif}`),
    document.fonts.load(`italic 500 40px ${CONFIG.fonts.bodoni}`),
    document.fonts.load(`500 40px ${CONFIG.fonts.bodoni}`),
    document.fonts.load(`500 40px ${CONFIG.fonts.serif}`),
  ])
    .then(drawAllPages)
    .catch((err) => console.error('フォントの読み込みに失敗しました', err));

  document.getElementById('page-tabs').addEventListener('click', (event) => {
    const tab = event.target.closest('[role="tab"]');
    if (tab) {
      selectPage(Number(tab.dataset.index));
    }
  });

  const dialog = document.getElementById('section-dialog');
  for (const container of [document.getElementById('sections'), dialog]) {
    container.addEventListener('input', handleEditorInput);
    container.addEventListener('click', handleEditorClick);
  }
  dialog.querySelector('[data-action="close-dialog"]').addEventListener('click', () => dialog.close());
  // 모달에서 고친 값을 목록에도 반영한다.
  dialog.addEventListener('close', renderEditor);

  const imageDialog = document.getElementById('image-dialog');
  imageDialog.querySelector('[data-action="close-image"]').addEventListener('click', () => imageDialog.close());
  imageDialog.addEventListener('close', closeImagePreview);
  const imageViewport = document.getElementById('image-viewport');
  const isZoomed = () => imageViewport.classList.contains('is-zoomed');
  document.getElementById('image-preview').addEventListener('click', (event) => setImageZoom(!isZoomed(), event));
  imageDialog.querySelector('[data-action="toggle-zoom"]').addEventListener('click', () => setImageZoom(!isZoomed()));
  document.querySelector('.poster__zoom').addEventListener('click', openImagePreview);

  const imageFile = document.getElementById('image-file');
  document.querySelector('[data-action="replace-image"]').addEventListener('click', () => imageFile.click());
  document.querySelector('[data-action="reset-image"]').addEventListener('click', resetImage);
  imageFile.addEventListener('change', () => {
    if (imageFile.files[0]) {
      replaceImage(imageFile.files[0]);
    }
    imageFile.value = '';
  });

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

  posters.addEventListener('click', (event) => {
    if (event.target.tagName !== 'CANVAS') {
      return;
    }
    const section = sectionAt(event.target, event.clientX, event.clientY);
    if (section) {
      openSectionDialog(section.id);
    }
  });
  posters.addEventListener('mousemove', (event) => {
    if (event.target.tagName !== 'CANVAS') {
      return;
    }
    event.target.style.cursor = sectionAt(event.target, event.clientX, event.clientY) ? 'pointer' : 'default';
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
      saveMenu();
    }
  });
  document.querySelector('.app-switch').addEventListener('click', (event) => {
    event.preventDefault();
    leaveTo(event.currentTarget.href);
  });
  window.addEventListener('beforeunload', (event) => {
    if (state.dirty) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
