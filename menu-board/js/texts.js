// 화면에 나오는 문구는 모두 여기에 모은다.
// index.html 의 data-text="키" (글자), data-text-label="키" (aria-label) 에 이 값이 들어간다.
// 메뉴 내용(처음 항목)과 칸 이름은 config.js 에 있다.
window.MENU_TEXTS = {
  // ---------- 페이지 ----------
  pageTitle: 'メニュー管理 | Sweet Afternoon',
  appTitle: 'メニュー管理',

  // ---------- 탭 ----------
  pageTabsLabel: 'メニューのページ',
  // config.js 의 pages[].id 별 탭 이름
  pageTabs: { front: '表（キャスト・フード）', back: '裏（ドリンク）', remote: 'リモート', set: 'セット' },

  // ---------- 시프트표로 이동 ----------
  toOtherApp: 'シフト管理へ',
  confirmSaveBeforeLeave: '保存していない変更があります。保存してから移動しますか？',
  confirmDiscardBeforeLeave: '保存せずに移動しますか？（変更は消えます）',

  // ---------- 포스터 ----------
  posterLabel: 'プレビュー',
  posterZoom: '拡大表示',
  posterHint: 'メニューの文字や見出しをタップすると、その欄を編集できます。',

  // ---------- 임시 이미지 ----------
  replaceImage: '画像を差し替え',
  resetImage: '元の画像に戻す',
  customImageNote: '仮の画像を使用中（この端末だけ）',
  imageReplaced: '画像を差し替えました。この端末だけに保存されます。',
  imageRatioWarning: '画像を差し替えました。ただし縦横の比率が元の画像と違うため、文字の位置がずれることがあります。',
  imageReplaceFailed: '画像を差し替えられませんでした。画像ファイル（png・jpg）を選んでください。',
  imageResetDone: '元の画像に戻しました。',
  confirmResetImage: 'このページの画像を元に戻します。よろしいですか？',
  // 포스터의 메모 표기. 예: — 少しお時間かかるものもあります —
  posterNote: (text) => `— ${text} —`,

  // ---------- 입력 ----------
  editorLabel: '入力',
  namePlaceholder: '品名',
  pricePlaceholder: '価格',
  priceLabel: '価格（例：1200yen）',
  titleLabel: '見出し',
  titlePlaceholder: '見出し',
  subLabel: '見出しの下の文字',
  textLabel: '文章',
  noteLabel: 'メモ',
  notePlaceholder: '例：少しお時間かかるものもあります',
  addNote: '＋ メモを追加',
  removeNote: 'メモを削除',
  addDivider: '＋ 区切りを追加',
  dividerLabel: '── 区切り ──',
  textPlaceholder: '文章',
  addItem: '＋ 品目を追加',
  removeItem: 'この行を削除',
  moveUp: '上へ移動',
  moveDown: '下へ移動',
  itemCount: (count, max) => `${count} / ${max}`,

  // ---------- 칸 편집 창 ----------
  sectionDialogLabel: '欄の編集',
  done: '完了',

  // ---------- 이미지 미리보기 창 ----------
  imageDialogLabel: '画像プレビュー',
  imageAlt: 'メニューの画像プレビュー',
  imageHint: '画像をタップすると拡大・縮小します。スマホの場合は、画像を長押しして写真に保存することもできます。',
  zoomIn: '拡大',
  zoomOut: '全体を表示',
  close: '閉じる',
  download: 'ダウンロード',

  // ---------- 데이터 이동 창 ----------
  dataTitle: 'データ移行',
  dataIntro: '別のスマホやパソコンにメニューを移すときに使います。',
  dataStepExport: '今の端末で「データを書き出す」を押し、できたファイルを送ります（AirDrop、LINE、メールなど）。',
  dataStepImport: '移したい端末でこの画面を開き、「データを読み込む」で受け取ったファイルを選びます。',
  dataNote: 'ファイルに入っている欄は読み込んだ内容で上書きされます。',
  dataExport: 'データを書き出す',
  dataImport: 'データを読み込む',

  // ---------- 아래 버튼 ----------
  resetPage: '初期内容に戻す',
  imagePreview: '画像プレビュー',
  print: '印刷',
  dataMove: 'データ移行',
  save: '保存',

  // ---------- 상태 메시지 ----------
  saved: '保存しました。',
  saveFailed: '保存できませんでした。ブラウザの保存容量を確認してください。',
  unsaved: '保存していない変更があります。',
  imageFailed: '画像を作成できませんでした。',
  // 파일을 직접 열었을 때(file://) 브라우저가 이미지 만들기를 막는 경우
  imageBlocked: '画像を作成できませんでした。ファイルを直接開いた場合は、サーバーのアドレス（https://…）で開いてください。',
  templateFailed: 'テンプレート画像を読み込めませんでした。assets フォルダと config.js の image を確認してください。',
  exported: 'メニューのデータを書き出しました。',
  importInvalid: 'このファイルは読み込めません。「データを書き出す」で作ったファイルを選んでください。',
  importEmpty: '読み込めるデータがありませんでした。',
  imported: (count) => `${count}欄のデータを読み込みました。`,

  // ---------- 확인 창 ----------
  confirmReset: (page) => `「${page}」を最初の内容に戻します。よろしいですか？`,
  confirmSaveBeforeExport: '保存していない変更があります。保存してから書き出しますか？',
  confirmImport: (count) => `${count}欄のデータを読み込みます。\n今の内容は上書きされます。よろしいですか？`,
};
