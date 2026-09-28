'use strict';

// index.html 과 css, js 를 하나로 합쳐 dist/shift-board.html 을 만든다.
// 사용법: 프로젝트 폴더에서  node tools/build-single.js
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const scripts = ['js/config.js', 'js/template.js', 'js/app.js'];
let html = read('index.html');

// 원본에 없는 태그를 찾으면 조용히 넘어가지 않고 멈춘다.
function replaceOnce(target, replacement) {
  if (!html.includes(target)) {
    throw new Error(`index.html 에서 찾을 수 없습니다: ${target}`);
  }
  html = html.replace(target, () => replacement);
}

replaceOnce('<link rel="stylesheet" href="css/style.css">', `<style>\n${read('css/style.css')}</style>`);
for (const file of scripts) {
  replaceOnce(`  <script src="${file}" defer></script>\n`, '');
}
// 인라인 스크립트는 defer 가 적용되지 않으므로 body 끝에 둔다.
const inline = scripts.map((file) => `<script>\n${read(file)}</script>`).join('\n');
replaceOnce('</body>', `${inline}\n</body>`);

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const output = path.join(root, 'dist', 'shift-board.html');
fs.writeFileSync(output, html);
console.log(`作成しました: ${output} (${Math.round(fs.statSync(output).size / 1024)} KB)`);
