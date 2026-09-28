// 화면과 포스터에 나오는 문구는 모두 여기에 모은다.
// index.html 의 data-text="키" (글자), data-text-label="키" (aria-label) 에 이 값이 들어간다.
// 휴무 이유·메시지 기본값과 후보, 요일 표기는 config.js 에 있다.
window.BOARD_TEXTS = {
  // ---------- 페이지 ----------
  pageTitle: 'シフト管理 | Sweet Afternoon',
  appTitle: 'シフト管理',

  // ---------- 주 이동 ----------
  weekNavLabel: '週の移動',
  prevWeek: '前の週',
  nextWeek: '次の週',
  thisWeek: '今週',
  pickDate: '日付で移動',
  // 상단 주 제목. 예: 2026年9月 第4週
  weekTitle: (year, month, nth) => `${year}年${month}月 第${nth}週`,
  // 이번 주와의 거리. 여기에 없는 거리는 weeksAgo / weeksLater 로 표시
  relativeWeeks: { '-1': '先週', 0: '今週', 1: '来週', 2: '再来週' },
  weeksAgo: (n) => `${n}週前`,
  weeksLater: (n) => `${n}週後`,

  // ---------- 포스터 ----------
  posterLabel: 'プレビュー',
  posterZoom: '拡大表示',
  posterHint: 'ポスターの枠をタップすると、その日を編集できます。',
  posterClosedHeading: '— Holiday —',
  // 이벤트 띠 문구. 예: ♡ 生誕祭 ♡
  posterEvent: (text) => `♡ ${text} ♡`,
  // 주소에 ?guide 를 붙여 열었을 때
  guideOn: 'ガイド表示中：枠の位置は js/config.js の cards で調整します。保存画像にはガイドは入りません。',

  // ---------- 입력 ----------
  editorLabel: '入力',
  closed: 'お休み',
  closedNote: 'お休みの理由',
  closedMessage: 'メッセージ（任意）',
  closedMessagePlaceholder: '例：またのお帰りをお待ちしております',
  event: 'イベント',
  eventPlaceholder: '例：生誕祭、コラボイベント',
  namePlaceholder: '名前',
  timePlaceholder: '17:00-L',
  timeLabel: '時間',
  addRow: '＋ キャストを追加',
  removeRow: 'この行を削除',
  showOptions: '候補を表示',

  // ---------- 1일 편집 창 ----------
  dayDialogLabel: '1日の編集',
  done: '完了',

  // ---------- 이미지 미리보기 창 ----------
  imageDialogLabel: '画像プレビュー',
  imageAlt: 'シフト表の画像プレビュー',
  imageHint: '画像をタップすると拡大・縮小します。スマホの場合は、画像を長押しして写真に保存することもできます。',
  zoomIn: '拡大',
  zoomOut: '全体を表示',
  close: '閉じる',
  download: 'ダウンロード',

  // ---------- 데이터 이동 창 ----------
  dataTitle: 'データ移行',
  dataIntro: '別のスマホやパソコンにシフトを移すときに使います。',
  dataStepExport: '今の端末で「データを書き出す」を押し、できたファイルを送ります（AirDrop、LINE、メールなど）。',
  dataStepImport: '移したい端末でこの画面を開き、「データを読み込む」で受け取ったファイルを選びます。',
  dataNote: '同じ日付のシフトは読み込んだ内容で上書きされます。それ以外の日付はそのまま残ります。',
  dataExport: 'データを書き出す',
  dataImport: 'データを読み込む',

  // ---------- 아래 버튼 ----------
  copyPrev: '前週をコピー',
  clearWeek: 'この週をクリア',
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
  templateFailed: 'テンプレート画像を読み込めませんでした。assets フォルダと config.js の templateImage を確認してください。',
  exported: (count) => `${count}日分のデータを書き出しました。`,
  importInvalid: 'このファイルは読み込めません。「データを書き出す」で作ったファイルを選んでください。',
  importEmpty: '読み込めるデータがありませんでした。',
  imported: (count) => `${count}日分のデータを読み込みました。`,

  // ---------- 확인 창 ----------
  confirmCopyPrev: 'この週の内容を前週の内容で上書きします。よろしいですか？',
  confirmClear: 'この週の入力内容をすべて消します。よろしいですか？',
  confirmSaveBeforeExport: '保存していない変更があります。保存してから書き出しますか？',
  confirmImport: (count) =>
    `${count}日分のデータを読み込みます。\n` +
    '同じ日付の内容は読み込んだデータで上書きされ、それ以外の日付はそのまま残ります。よろしいですか？',
};
