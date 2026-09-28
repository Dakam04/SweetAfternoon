# DEVLOG-20260928-003 점선 복원, 글자색 선택 제거

## 원인
v1.2.0에서 참고 이미지를 "명조 굵은체 + 진한 글자색 + 가운데 정렬"로 해석해 점선을 없애고 글자색 선택을 추가했음.
사용자 확인 결과 참고 이미지의 의도는 글자색이 아니라 이미지 배경색 변경이었고, 이 기능은 넣지 않기로 함.

## 조치
- `drawRows()`: 점선 방식으로 복원. 명조 굵은체는 유지. 좁은 카드에서도 점선이 보이도록 기본 글자 크기 48→44, 점선 표시 최소 길이 size→size*0.5.
- 글자색 선택 UI, `settingsKey`, `textColors`, `state.settings`, `saveSettings()`, `renderColorSelect()` 제거.
- 글자색은 `inkColors`(카드 색별 고정색)로 지정.

## 검증
- 이전 버전의 설정 키(`sweet-afternoon-schedule:settings`)가 localStorage에 남아 있어도 오류 없이 동작함을 확인.
- PNG 출력에서 7개 카드 모두 점선 표시 확인.
