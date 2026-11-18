// Korean-name Set 18 final-board snapshots, source: SeeMeta, patch 18.6 (2026-11-16).
// These are FINAL boards, NOT invented level-by-level build-up guides.
const source = 'https://seemeta.com/ko/tft/set-18';
const finalBoard = (id,name,units) => ({
  id,name,source,patch:'18.6',kind:'final-board',items:[],
  finalUnits:units,stages:[{level:9,units}]
});
export const metaGuides = [
  // Independently sourced level-by-level route. Do not conflate this with the
  // distinct Sivir/Ashe final-board snapshot below.
  {id:'sivir-amumu-build',name:'전쟁기계 시비르 · 아무무 (레벨별 공략)',
    source:'https://gaintime.tistory.com/entry/롤토체스-전쟁기계-시비르-아무무-덱-공략｜템-추천부터-빌드업까지롤토체스-시즌18',
    patch:'18.6',kind:'level-guide',items:[],
    stages:[
      {level:5,units:['라칸','요릭','카르마','세주아니','유나라']},
      {level:6,units:['요릭','카르마','세주아니','유나라','바위 게','바이']},
      {level:7,units:['라칸','요릭','세주아니','바위 게','바이','시비르','아무무']},
      {level:8,units:['요릭','세주아니','바위 게','바이','시비르','자이라','아무무','마오카이']},
      {level:9,units:['요릭','바위 게','세주아니','바이','아무무','자이라','시비르','마오카이','애쉬']}
    ],finalUnits:['요릭','바위 게','세주아니','바이','아무무','자이라','시비르','마오카이','애쉬']},
  finalBoard('sivir-ashe','전쟁기계 시비르 & 애쉬',['시비르','애쉬','마오카이','라칸','바이','아무무','타릭','케넨']),
  {...finalBoard('master-yi','적응가 마스터 이',['마스터 이','렝가','니달리','요릭','심술두꺼비','돌거북','바이','코그모','세트']),itemByUnit:{'마스터 이':['구인수의 격노검','밤의 끝자락','거인의 결의'],'렝가':['구인수의 격노검','밤의 끝자락','거인의 결의'],'바이':['가고일 돌갑옷','워모그의 갑옷','정령의 형상'],'코그모':['무한의 대검','쇼진의 창','붉은 덩굴정령']},itemSource:'https://bunnymuffins.lol/meta/'},
  finalBoard('draven','전쟁기계 드레이븐',['드레이븐','장로 드래곤','마오카이','파수꾼','아무무','이즈리얼','타릭','케넨','아이번']),
  {...finalBoard('brambleback','협곡야수 덩굴정령',['덩굴정령','장로 드래곤','돌거북','불타는 묘목','조약돌','어스름늑대','바위 게','파수꾼','타릭']),itemByUnit:{'돌거북':['가고일 돌갑옷','워모그의 갑옷','정령의 형상'],'덩굴정령':['도적의 장갑'],'장로 드래곤':['무한의 대검','최후의 속삭임','스테락의 도전']},itemSource:'https://lolchess.gg/builder/guide/6de116733f57ef4ffcd12d39d929b608abe7cea8?hl=ko&type=guide'},
  finalBoard('aphelios','나무정령 아펠리오스',['아펠리오스','이즈리얼','릴리아','자야','오른','르블랑','알리스타','다이애나','헤카림'])
];
