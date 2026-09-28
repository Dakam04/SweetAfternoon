// 운영 중 바꿀 수 있는 값은 모두 여기에 모은다.
window.BOARD_CONFIG = {
  // localStorage 키. 바꾸면 기존에 저장한 스케줄이 보이지 않게 되므로 주의.
  storageKey: 'sweet-afternoon-schedule:v1',

  // 한 주의 시작 요일 (0=일, 1=월, … 6=토). 템플릿 첫 번째 카드가 이 요일이 된다.
  weekStartsOn: 1,

  // 하루에 넣을 수 있는 최대 인원
  maxRows: 10,

  // 포스터에 찍히는 요일 표기
  weekdayLabels: ['日', '月', '火', '水', '木', '金', '土'],

  // 휴무일: 이유를 비워 두면 closedLabel 로 표시
  closedLabel: 'お休み',
  // 휴무일 기본 메시지. 비워 두면 표시하지 않는다. 날짜별로 입력하면 그 값이 우선.
  closedMessage: '',
  // 휴무 이유·메시지 입력칸의 기본 후보 (입력했던 값도 자동으로 후보에 추가됨)
  closedPresets: ['臨時休業', '貸切営業'],
  closedMessagePresets: ['またのお帰りをお待ちしております'],

  font: '"Shippori Mincho", "Hiragino Mincho ProN", "Yu Mincho", serif',
  // 카드 색에 맞춘 글자색 (근무, 날짜, 이벤트 띠, 휴무 문구)
  inkColors: { pink: '#a94f71', blue: '#3f64a0' },
  // 카드 색 (휴무일 바탕)
  toneColors: { pink: '#f1b6cb', blue: '#a9cdee' },

  // 템플릿 이미지 파일. 이미지를 바꿀 때는 assets 폴더의 파일을 덮어쓰거나 이 경로를 바꾼다.
  templateImage: 'assets/template.png',

  // 템플릿 이미지 원본 크기(px)와 카드 위치.
  // heart: 하트 중심 [x, y] / area: 글자가 들어갈 영역 [x, y, 너비, 높이]
  // 위치를 맞출 때는 주소 끝에 ?guide 를 붙여 열면 영역과 좌표가 포스터 위에 표시된다.
  template: { width: 2535, height: 2662 },
  cards: [
    { tone: 'pink', heart: [186, 850], area: [150, 950, 427, 450] },
    { tone: 'blue', heart: [789, 850], area: [754, 950, 432, 450] },
    { tone: 'pink', heart: [1394, 850], area: [1357, 950, 429, 450] },
    { tone: 'blue', heart: [1997, 850], area: [1960, 950, 433, 450] },
    { tone: 'pink', heart: [490, 1634], area: [428, 1735, 480, 450] },
    { tone: 'blue', heart: [1092, 1634], area: [1031, 1735, 481, 450] },
    { tone: 'pink', heart: [1694, 1634], area: [1633, 1735, 482, 450] },
  ],

  // 포스터 글자 크기와 간격 (px, 템플릿 원본 기준)
  layout: {
    // 하트 안 날짜 숫자. 폭이 maxWidth 를 넘으면 자동으로 줄어든다. offsetY 는 하트 중심에서 아래로.
    heartNumber: { size: 76, maxWidth: 110, offsetY: 4 },
    // 글자 영역 오른쪽 위의 날짜 (예: 9/28(月)). offsetY 는 영역 위쪽 기준, 음수면 위로.
    dateLabel: { size: 34, offsetY: -12 },
    // 이벤트 띠. top 은 영역 위쪽에서 띠까지, gap 은 띠 아래와 근무 글자 사이.
    eventRibbon: { height: 66, top: 8, size: 36, gap: 16 },
    // 근무 글자. 인원이 많으면 maxSize 에서 자동으로 줄어든다. lineHeight 는 글자 크기의 배수.
    rows: { maxSize: 44, lineHeight: 1.6 },
    // 휴무 카드 글자 (— Holiday —, 휴무 이유, 메시지)
    closed: { headingSize: 34, reasonSize: 66, messageSize: 26 },
  },
};
