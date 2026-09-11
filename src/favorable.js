// Reproducible supporting/draining element reference; not a full pattern/seasonal diagnosis.
const CYCLE=['木','火','土','金','水'];
export function favorableReference(b){
 if(!b)return {status:'missing',element:null,reason:'填写出生资料后自动推导'};
 if(b.unknown||b.boundaries?.length||!b.solar?.lonSource?.startsWith('city:'))return {status:'incomplete',element:null,reason:b.unknown?'时辰不详，暂不定喜用':b.boundaries?.length?'接近节气或换日分界，请核对时间':'请核对出生城市'};
 const i=CYCLE.indexOf(b.dayMaster.element),strength=b.fiveElements?.dayMasterStrength?.label;
 if(i<0||!['偏强','偏弱'].includes(strength))return {status:'balanced',element:null,reason:'强弱接近均衡，暂用中性配色'};
 const weak=strength==='偏弱',element=CYCLE[(i+(weak?4:1))%5];return {status:'reference',element,secondary:weak?CYCLE[i]:CYCLE[(i+2)%5],method:'扶抑参考',reason:`${b.dayMaster.stem}${b.dayMaster.element}日主${strength}，${weak?`取${element}生${CYCLE[i]}，以印星生扶`:`取${CYCLE[i]}生${element}，以食伤泄秀`}`};
}
const PALETTES={
 木:[['原木苔绿',['#677C5A','#B89A73','#F0EADD'],['苔绿','原木','米白']],['竹青雅居',['#84978A','#D9CBB2','#EEECE5'],['竹青','浅橡木','暖白']],['深林棉麻',['#354F43','#BAAC93','#E5DBCA'],['森林绿','亚麻','燕麦']]],
 火:[['暖陶暮色',['#A8513D','#D0A48C','#F1E3D2'],['陶红','杏色','奶油']],['藕紫暖灰',['#886B7B','#B4A69D','#E9E1D5'],['藕紫','暖灰','米白']],['赭石木色',['#AB704D','#C5A582','#F2E7D6'],['赭石','浅木','象牙']]],
 土:[['沙丘棉麻',['#B8996B','#D7C6A6','#F0E7D7'],['驼色','亚麻','米白']],['麦田原木',['#AC8A53','#C9B393','#E6DDD0'],['麦黄','橡木','暖灰']],['陶土浅咖',['#A87E63','#C9B1A0','#EDE3D8'],['陶土','浅咖','燕麦']]],
 金:[['月白浅金',['#E9E6DC','#BCA675','#737875'],['月白','香槟金','灰绿']],['银灰原木',['#AEB4B5','#D0BDA5','#F3EEE5'],['银灰','浅木','暖白']],['珍珠岩灰',['#E4DECB','#8C9391','#C2B69C'],['珍珠白','岩灰','浅驼']]],
 水:[['深蓝雾白',['#354C64','#9EAEB8','#EEECE5'],['深蓝','雾蓝','米白']],['墨色暖木',['#303E42','#B09A7B','#E6DDD0'],['墨青','暖木','亚麻']],['湖蓝浅灰',['#638A96','#C0C9C8','#F0EADF'],['湖蓝','浅灰','暖白']]],
 neutral:[['米白原木',['#EEE5D5','#BBA17C','#71806A'],['米白','原木','鼠尾草']],['暖灰棉麻',['#B0A79B','#DCD0BB','#EEE9DF'],['暖灰','亚麻','象牙']],['雾蓝燕麦',['#839CA8','#C9B99F','#ECE6DD'],['雾蓝','燕麦','米白']]]
};
export function paletteGroups(element){return PALETTES[element]||PALETTES.neutral;}
