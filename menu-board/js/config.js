// 운영 중 바꿀 수 있는 값은 모두 여기에 모은다.
// セット 메뉴에서 같이 쓰는 모양
const SET_TITLE = '#2f5596';
const SET_PRICE = { fontSize: 96, priceFont: 'bodoni', priceStyle: 'italic', priceWeight: 500, unitScale: 0.72, priceColor: '#3d63a3' };
// 설명 줄의 숫자·영문(800yen 등)은 가격처럼 이탤릭으로
const SET_LATIN = { family: 'bodoni', style: 'italic', weight: 500, scale: 1.1 };

window.MENU_CONFIG = {
  // localStorage 키. 바꾸면 기존에 저장한 메뉴가 보이지 않게 되므로 주의.
  storageKey: 'sweet-afternoon-menu:v1',

  // 글꼴. 각 칸의 fontFamily 에 'mincho' / 'title' / 'serif' / 'bodoni' 로 고른다.
  fonts: {
    mincho: '"Shippori Mincho", "Hiragino Mincho ProN", "Yu Mincho", serif',
    title: '"Playfair Display", "Times New Roman", serif',
    serif: '"Playfair Display", "Times New Roman", serif',
    bodoni: '"Bodoni Moda", "Times New Roman", serif',
  },
  // 메뉴 글자색, 이름과 가격 사이 점선 색, 목록 앞 별 모양 색
  inkColor: '#3d5786',
  leaderColor: '#9db6d6',
  bulletColor: '#7d9dcb',

  // 만들어지는 이미지의 가로 크기(px). 클수록 인쇄가 선명하다.
  outputWidth: 2108,

  // 템플릿 이미지의 글자를 지울 때 쓰는 바탕색.
  // 보통은 이미지에서 자동으로 읽어 오고, 읽을 수 없을 때(file:// 로 열었을 때)만 이 색을 쓴다.
  // 리본 위 제목은 바탕색으로 덮지 않고 글자 부분만 주변 색으로 메운다.
  paperColor: '#fdfdfd',

  // 메뉴판 페이지(탭). 탭 순서대로 나온다.
  //   image: 템플릿 이미지 경로
  //   template: 좌표의 기준 크기(px). 아래 좌표는 모두 이 크기 기준이다.
  //             같은 디자인의 고해상도 이미지로 바꿀 때는 그대로 두면 된다.
  //
  // sections: 페이지 안에서 고칠 수 있는 칸
  //   type: 'price' (이름 + 가격, 점선으로 연결) / 'list' (✦ + 이름) / 'text' (가운데 한 줄)
  //   areas: 글자가 들어갈 영역 [x, y, 너비, 높이]. 여러 개면 왼쪽 열부터 차례로 채운다.
  //   erase: 템플릿에 원래 찍힌 글자를 지울 영역. 없으면 areas 를 지운다.
  //   lineHeight: 한 줄 높이. 영역에 다 안 들어가면 자동으로 줄 간격과 글자를 줄인다.
  //   fontSize / priceSize: 글자 크기, letterSpacing: 글자 간격(px)
  //   maxItems: 넣을 수 있는 최대 줄 수
  //   items / text: 처음 내용 (「初期内容に戻す」를 누르면 이 내용으로 돌아간다)
  //   title: 리본 위 제목 (text 칸과 같은 형식). areas 는 원래 제목이 있던 자리로, 여기를 지우고 가운데에 새로 쓴다.
  //   sub: text 칸 아래의 작은 글자 (Alcohol 아래의 アルコール 등)
  //   note: 메모 (「メモを追加」로 넣는 한 줄). areas 를 주면 그 자리에, 없으면 칸 맨 위에 쓴다.
  //         text 는 처음 메모, noteSize 는 메모 글자 크기
  //   inpaint: true 면 바탕색으로 덮지 않고 글자 부분만 주변 색으로 메운다 (리본 위 글자용)
  //   fontFamily: 'mincho' / 'title' / 'serif', fontWeight, fontStyle('italic'), color: 칸마다 글꼴·굵기·색을 바꿀 때
  //   gradient: [색, 색, …] 을 주면 글자 왼쪽 끝부터 오른쪽 끝까지 차례로 그라데이션으로 칠한다 (color 대신)
  //   arc: 리본 곡선을 따라 가운데가 양끝보다 올라가는 높이(px), condense: 글자 폭 비율 (1 = 그대로)
  //   align: 'left' 면 영역 왼쪽부터 쓴다 (기본은 가운데)
  //   type: 'fields' 는 품목 목록 없이 이름 붙은 한 줄들(fields)만 있는 칸 (セット 메뉴)
  //   fields: 칸 안의 한 줄들 [{ key, label, text, areas, … }]. kind: 'price' 면 큰 가격으로, after: true 면 편집 화면에서 품목 아래에 둔다.
  //   bullet: 'heart' 면 목록 앞 표시를 ♡ 로
  //   type: 'capsule' 은 리모트 메뉴처럼 품목마다 둥근 칸을 그리고, 품목 이름을 「---」로 두면 구분 장식이 들어간다.
  pages: [
    {
      id: 'set',
      image: 'assets/menu-set.png',
      template: { width: 1055, height: 1491 },
      sections: [
        {
          id: 'oneSet',
          label: '1セット',
          type: 'fields',
          areas: [],
          fields: [
            { key: 'title', label: '見出し', text: '1セット', areas: [[150, 425, 280, 62]], erase: [[200, 425, 180, 62]], inpaint: true, fontSize: 52, fontWeight: 700, letterSpacing: 1, latin: { family: 'bodoni', weight: 500, scale: 1.25 }, color: SET_TITLE },
            { key: 'price', label: '価格', kind: 'price', text: '1,600yen', areas: [[130, 565, 340, 100]], ...SET_PRICE },
            { key: 'detail', label: '内訳', text: '(チャージ800yen + ドリンク800yen)', areas: [[88, 682, 420, 40]], fontSize: 22, letterSpacing: 0.5, latin: SET_LATIN },
            { key: 'memo', label: '注意書き', text: '※ワンドリンクオーダー制', areas: [[150, 797, 285, 36]], fontSize: 21, letterSpacing: 2 },
          ],
        },
        {
          id: 'teaSet',
          label: 'お茶会セット',
          type: 'list',
          bullet: 'heart',
          fields: [
            { key: 'title1', label: '見出し（1行目）', text: 'メイドさんと一緒に', areas: [[620, 425, 320, 38]], erase: [[630, 425, 300, 38]], inpaint: true, fontSize: 31, fontWeight: 700, letterSpacing: 0.5, color: SET_TITLE },
            { key: 'title2', label: '見出し（2行目）', text: 'お茶会セット', areas: [[620, 465, 330, 48]], erase: [[655, 465, 260, 48]], inpaint: true, fontSize: 42, fontWeight: 700, letterSpacing: 1, color: SET_TITLE },
            { key: 'price', label: '価格', kind: 'price', text: '2,500yen', areas: [[615, 570, 345, 100]], ...SET_PRICE },
            { key: 'footer', label: '下の一文', after: true, text: 'から選べます♡', areas: [[592, 872, 250, 32]], erase: [[588, 872, 185, 32]], align: 'left', fontSize: 22, letterSpacing: 2 },
          ],
          areas: [[597, 693, 250, 150]],
          erase: [[588, 693, 227, 150]],
          lineHeight: 50,
          fontSize: 27,
          letterSpacing: 3,
          maxItems: 5,
          items: ['ダージリン', 'アールグレイ', 'オリジナル'],
        },
        {
          id: 'nomihodai',
          label: '飲み放題',
          type: 'fields',
          areas: [],
          fields: [
            { key: 'title', label: '見出し', text: '飲み放題', areas: [[395, 1045, 295, 75]], inpaint: true, fontSize: 58, fontWeight: 700, letterSpacing: 14, color: SET_TITLE },
            { key: 'detail1', label: '説明（1行目）', text: '自動延長・チャージを含む', areas: [[398, 1147, 275, 32]], fontSize: 22, letterSpacing: 2 },
            { key: 'detail2', label: '説明（2行目）', text: '※2名様以上から！', areas: [[440, 1185, 190, 30]], fontSize: 20, letterSpacing: 2 },
            { key: 'male', label: '価格（♂）', kind: 'price', text: '3000yen', areas: [[296, 1232, 225, 75]], align: 'left', ...SET_PRICE },
            { key: 'female', label: '価格（♀）', kind: 'price', text: '2500yen', areas: [[631, 1232, 225, 75]], align: 'left', ...SET_PRICE },
          ],
        },
        {
          id: 'tax',
          label: '下の一文',
          type: 'text',
          areas: [[352, 1372, 362, 28]],
          fontSize: 16,
          letterSpacing: 1.5,
          text: 'お会計の際に、別途tax10%頂戴致します。',
        },
      ],
    },
    {
      id: 'front',
      image: 'assets/menu-front.png',
      template: { width: 1054, height: 1492 },
      sections: [
        {
          id: 'cast',
          label: 'Cast Menu',
          type: 'price',
          title: {
            text: 'Cast Menu',
            areas: [[398, 293, 258, 58]],
            inpaint: true,
            fontFamily: 'title',
            fontSize: 42,
            fontWeight: 600,
            condense: 0.9,
            arc: 8,
            gradient: ['#74a0d6', '#7eaad9', '#9ccbe3', '#7eaad9', '#74a0d6'],
          },
          areas: [[216, 410, 604, 230]],
          erase: [[205, 410, 625, 228]],
          lineHeight: 44.3,
          fontSize: 23,
          priceSize: 25,
          letterSpacing: 3,
          maxItems: 10,
          items: [
            { name: 'キャストドリンク', price: '1200yen' },
            { name: 'キャストショット', price: '1500yen' },
            { name: 'チェキ', price: '1000yen' },
            { name: 'キャストプラス', price: '300yen' },
            { name: '宿題チェキ', price: '1500yen' },
          ],
        },
        {
          id: 'food',
          label: 'Food',
          type: 'price',
          note: {
            areas: [[355, 800, 345, 28]],
            fontSize: 14,
            letterSpacing: 2,
            text: '少しお時間かかるものもあります',
          },
          title: {
            text: 'Food',
            areas: [[455, 693, 135, 55]],
            inpaint: true,
            fontFamily: 'title',
            fontSize: 42,
            fontWeight: 600,
            condense: 0.9,
            arc: 8,
            gradient: ['#74a0d6', '#7eaad9', '#9ccbe3', '#7eaad9', '#74a0d6'],
          },
          areas: [[335, 835, 480, 220]],
          erase: [[325, 835, 500, 220]],
          lineHeight: 45,
          fontSize: 23,
          priceSize: 25,
          letterSpacing: 3,
          maxItems: 10,
          items: [
            { name: '味噌汁', price: '300yen' },
            { name: 'ミックスナッツ', price: '500yen' },
            { name: 'バニラアイス', price: '500yen' },
            { name: '抹茶アイス', price: '800yen' },
            { name: 'パンケーキ', price: '1000yen' },
          ],
        },
        {
          id: 'karaoke',
          label: 'Karaoke',
          type: 'price',
          title: {
            text: 'Karaoke',
            areas: [[430, 1130, 190, 60]],
            inpaint: true,
            fontFamily: 'title',
            fontSize: 42,
            fontWeight: 600,
            condense: 0.9,
            arc: 8,
            gradient: ['#74a0d6', '#7eaad9', '#9ccbe3', '#7eaad9', '#74a0d6'],
          },
          areas: [[340, 1240, 448, 96]],
          erase: [[330, 1240, 470, 96]],
          lineHeight: 44,
          fontSize: 23,
          priceSize: 25,
          letterSpacing: 3,
          maxItems: 5,
          items: [
            { name: '歌リク', price: '500yen' },
            { name: 'デュエット', price: '1000yen' },
          ],
        },
        {
          id: 'tax',
          label: '下の一文',
          type: 'text',
          areas: [[395, 1399, 265, 24]],
          fontSize: 13,
          letterSpacing: 1.5,
          text: 'お会計の際に tax10%頂戴致します',
        },
      ],
    },
    {
      id: 'back',
      image: 'assets/menu-back.png',
      template: { width: 1054, height: 1492 },
      sections: [
        {
          id: 'alcoholTitle',
          label: 'Alcohol',
          type: 'text',
          areas: [[398, 281, 246, 78]],
          inpaint: true,
          fontFamily: 'title',
          fontSize: 50,
          fontWeight: 600,
          condense: 0.9,
          arc: 10,
          gradient: ['#74a0d6', '#7eaad9', '#9ccbe3', '#7eaad9', '#74a0d6'],
          text: 'Alcohol',
          sub: {
            areas: [[466, 366, 124, 30]],
            inpaint: true,
            fontSize: 19,
            letterSpacing: 4,
            text: 'アルコール',
          },
        },
        {
          id: 'beer',
          label: 'ビール',
          type: 'list',
          title: {
            text: 'ビール',
            areas: [[183, 437, 135, 32]],
            erase: [[178, 437, 78, 32]],
            align: 'left',
            inpaint: true,
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: 4,
          },
          areas: [[107, 490, 245, 48]],
          lineHeight: 30,
          fontSize: 21,
          letterSpacing: 2,
          maxItems: 4,
          items: ['瓶ビール'],
        },
        {
          id: 'whisky',
          label: 'ウィスキー',
          type: 'list',
          title: {
            text: 'ウィスキー',
            areas: [[183, 580, 135, 32]],
            erase: [[178, 580, 124, 32]],
            align: 'left',
            inpaint: true,
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: 4,
          },
          areas: [[107, 636, 245, 40]],
          lineHeight: 30,
          fontSize: 21,
          letterSpacing: 2,
          maxItems: 4,
          items: ['角'],
        },
        {
          id: 'chuhai',
          label: '酎ハイ',
          type: 'list',
          title: {
            text: '酎ハイ',
            areas: [[183, 715, 135, 34]],
            erase: [[178, 715, 80, 34]],
            align: 'left',
            inpaint: true,
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: 4,
          },
          areas: [[107, 772, 245, 120]],
          lineHeight: 30,
          fontSize: 21,
          letterSpacing: 2,
          maxItems: 7,
          items: ['プレーン', 'レモン', 'ライム', 'カルピス'],
        },
        {
          id: 'liqueur',
          label: 'リキュール系',
          type: 'list',
          title: {
            text: 'リキュール系',
            areas: [[470, 436, 150, 34]],
            erase: [[466, 436, 145, 34]],
            align: 'left',
            inpaint: true,
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: 4,
          },
          areas: [[408, 485, 250, 320]],
          // 오른쪽 아래 칵테일 그림은 지우지 않도록 두 번에 나눠 지운다. 긴 품목은 그림 위에 겹쳐 쓴다.
          erase: [[404, 485, 256, 182], [404, 667, 138, 140]],
          lineHeight: 28.85,
          fontSize: 21,
          letterSpacing: 2,
          maxItems: 16,
          items: ['ピーチ', 'カシス', 'ミスティア', 'ストロベリー', 'アールグレイ', 'ヨーグルト', 'カルーア', 'パッソア', 'ジン', 'ウォッカ', 'テキーラ'],
        },
        {
          id: 'shochu',
          label: '焼酎',
          type: 'list',
          title: {
            text: '焼酎',
            areas: [[803, 438, 115, 34]],
            erase: [[798, 438, 64, 34]],
            align: 'left',
            inpaint: true,
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: 4,
          },
          areas: [[742, 487, 200, 86]],
          lineHeight: 28,
          fontSize: 21,
          letterSpacing: 2,
          maxItems: 6,
          items: ['麦', '芋', '茉莉花'],
        },
        {
          id: 'fruitWine',
          label: '果実酒',
          type: 'list',
          title: {
            text: '果実酒',
            areas: [[800, 610, 120, 32]],
            erase: [[796, 610, 88, 32]],
            align: 'left',
            inpaint: true,
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: 4,
          },
          areas: [[742, 658, 200, 58]],
          lineHeight: 28,
          fontSize: 21,
          letterSpacing: 2,
          maxItems: 5,
          items: ['南高梅酒', 'ゆず酒'],
        },
        {
          id: 'shot',
          label: 'ショット',
          type: 'list',
          title: {
            text: 'ショット',
            areas: [[795, 756, 120, 34]],
            erase: [[792, 756, 104, 34]],
            align: 'left',
            inpaint: true,
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: 4,
          },
          areas: [[742, 801, 205, 108]],
          lineHeight: 27.7,
          fontSize: 21,
          letterSpacing: 2,
          maxItems: 7,
          items: ['テキーラ', 'テキーラローズ', 'コカレロ', 'クライナー'],
        },
        {
          id: 'nonAlcoholTitle',
          label: 'Non-alcohol',
          type: 'text',
          areas: [[388, 978, 300, 74]],
          inpaint: true,
          fontFamily: 'title',
          fontSize: 50,
          fontWeight: 600,
          condense: 0.9,
          arc: 10,
          gradient: ['#74a0d6', '#7eaad9', '#9ccbe3', '#7eaad9', '#74a0d6'],
          text: 'Non-alcohol',
          sub: {
            areas: [[440, 1046, 170, 34]],
            inpaint: true,
            fontSize: 19,
            letterSpacing: 4,
            text: 'ノンアルコール',
          },
        },
        {
          id: 'softDrink',
          label: 'ソフトドリンク',
          type: 'list',
          title: {
            text: 'ソフトドリンク',
            areas: [[270, 1120, 170, 32]],
            erase: [[266, 1120, 168, 32]],
            align: 'left',
            inpaint: true,
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: 4,
          },
          // 왼쪽 열을 다 채우지 않고 두 열에 고르게 나눈다.
          areas: [[275, 1165, 240, 180], [580, 1150, 250, 195]],
          lineHeight: 29.5,
          fontSize: 21,
          letterSpacing: 2,
          maxItems: 20,
          items: ['コーラ', 'ジンジャーエール', 'ソーダ', 'オレンジ', 'リンゴ', 'マンゴー', 'グレープフルーツ', '烏龍茶', '緑茶', 'ジャスミン茶', 'ミルク', 'コーヒー'],
        },
        {
          id: 'tax',
          label: '下の一文',
          type: 'text',
          areas: [[385, 1413, 285, 26]],
          fontSize: 13,
          letterSpacing: 1.5,
          text: 'お会計の際に tax10%頂戴致します',
        },
      ],
    },
    {
      id: 'remote',
      image: 'assets/menu-remote.png',
      template: { width: 1024, height: 1536 },
      sections: [
        {
          id: 'remoteTitle',
          label: 'REMOTE MENU',
          type: 'text',
          areas: [[340, 224, 345, 38]],
          inpaint: true,
          fontFamily: 'serif',
          fontSize: 32,
          fontWeight: 500,
          letterSpacing: 7,
          color: '#7088ab',
          text: 'REMOTE MENU',
        },
        {
          id: 'remote',
          label: 'Remote Menu',
          type: 'capsule',
          // 칸들이 들어갈 영역. 품목이 적으면 위아래 가운데에 모은다.
          areas: [[152, 327, 722, 978]],
          erase: [[140, 318, 746, 992]],
          // 둥근 칸 높이, 칸 간격, 구분 장식이 차지하는 높이
          capsule: { height: 68, pitch: 79.5, dividerSpace: 33 },
          // 원래 이미지에서 잘라 쓰는 리본 아이콘과 구분 장식 [x, y, 너비, 높이]
          iconRect: [186, 338, 54, 50],
          dividerRect: [405, 560, 215, 34],
          fontSize: 27,
          letterSpacing: 2,
          priceSize: 44,
          priceFont: 'serif',
          priceStyle: 'italic',
          priceWeight: 500,
          priceColor: '#cf6fa3',
          // 가격 끝의 글자 단위(yen, 円 등)는 이 비율로 작게 쓴다.
          unitScale: 0.6,
          color: '#5a6e8e',
          leader: { color: '#c9cbd6', step: 11, radius: 1.7 },
          maxItems: 16,
          items: [
            { name: 'キャストドリンク', price: '1,100yen' },
            { name: 'ノンアル缶もの', price: '880yen' },
            { name: 'キャストショット', price: '1,400yen' },
            { name: '---' },
            { name: 'シャンメリー', price: '4,400yen' },
            { name: 'オリジナルライト', price: '11,000yen' },
            { name: 'オリシャン', price: '33,000yen' },
            { name: 'オリシャンロゼ', price: '55,000yen' },
            { name: '和歌山みかんポン', price: '7,700yen' },
            { name: 'エンジェルブラック', price: '176,000yen' },
            { name: 'エンジェルロゼ', price: '220,000yen' },
            { name: 'デキャンタフラワー', price: '220,000yen' },
            { name: 'アルマンドゴールド', price: '165,000yen' },
          ],
        },
      ],
    },
  ],
};
