let allSlots = [];
let currentUser = null;
let displayMonth = new Date();
let selectedDate = '';
let editorDate = '';
let draftSlots = [];
const memberOrder = ['四宮','るーゔ','ちなつ','しーた','Moon'];
const memberColors = {'四宮':'#a99ae8','るーゔ':'#55a9e5','ちなつ':'#e58b8b','しーた':'#d9b849','Moon':'#e69a54'};
const $ = id => document.getElementById(id);
const pad = n => String(n).padStart(2,'0');
const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const monthKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}`;
const safe = s => String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = await loadUser();
  if (!currentUser?.loggedIn) return;
  const today = new Date(); displayMonth = new Date(today.getFullYear(),today.getMonth(),1); selectedDate = isoDate(today);
  $('monthPicker').value = monthKey(displayMonth); $('copyMonth').value = monthKey(new Date(today.getFullYear(),today.getMonth()-1,1)); $('editDate').value = selectedDate; editorDate = selectedDate; populateBulkTimeOptions();
  $('prevMonth').addEventListener('click',()=>changeMonth(-1)); $('nextMonth').addEventListener('click',()=>changeMonth(1));
  $('monthPicker').addEventListener('change',()=>{if($('monthPicker').value){try{commitEditorToMonth();}catch(e){alert(e.message);$('monthPicker').value=monthKey(displayMonth);return;}const [y,m]=$('monthPicker').value.split('-').map(Number);displayMonth=new Date(y,m-1,1);selectedDate=isoDate(new Date(y,m-1,1));editorDate=selectedDate;$('editDate').value=selectedDate;renderAll();}});
  $('editDate').addEventListener('change',()=>{const val=$('editDate').value;if(!val)return;try{commitEditorToMonth();}catch(e){alert(e.message);$('editDate').value=editorDate;return;}if(val.slice(0,7)!==monthKey(displayMonth)){const [y,m]=val.slice(0,7).split('-').map(Number);displayMonth=new Date(y,m-1,1);$('monthPicker').value=monthKey(displayMonth);} selectedDate=val;editorDate=val;renderAll();});
  $('todayBtn').addEventListener('click',()=>{try{commitEditorToMonth();}catch(e){alert(e.message);return;}const d=new Date();displayMonth=new Date(d.getFullYear(),d.getMonth(),1);selectedDate=isoDate(d);editorDate=selectedDate;$('monthPicker').value=monthKey(displayMonth);$('editDate').value=selectedDate;renderAll();});
  $('addSlotBtn').addEventListener('click',()=>{draftSlots.push({start:'',end:''});renderEditor();});
  $('applyWeekdayBtn').addEventListener('click',applyWeekday);
  $('copyMonthBtn').addEventListener('click',copyMonth);
  $('saveMonthBtn').addEventListener('click',saveMonth);
  await loadSlots();
});
function changeMonth(delta){try{commitEditorToMonth();}catch(e){alert(e.message);return;}displayMonth=new Date(displayMonth.getFullYear(),displayMonth.getMonth()+delta,1);$('monthPicker').value=monthKey(displayMonth);const d=new Date(displayMonth.getFullYear(),displayMonth.getMonth(),1);selectedDate=isoDate(d);editorDate=selectedDate;$('editDate').value=selectedDate;renderAll();}
async function loadSlots(){const el=$('calendar');el.innerHTML='<p class="muted">読み込み中...</p>';try{const res=await gas('listSlots');if(!res.ok)throw new Error(res.error||'予定を取得できませんでした');allSlots=res.slots||[];renderAll();}catch(e){el.innerHTML=`<p class="empty">${safe(e.message)}</p>`;}}
function slotsForDate(date){return allSlots.filter(s=>s.date===date).sort((a,b)=>a.start.localeCompare(b.start));}
function mineForDate(date){return slotsForDate(date).filter(s=>s.member===currentUser.member).map(s=>({start:s.start,end:s.end}));}
function renderAll(){ $('monthPicker').value=monthKey(displayMonth); renderCalendar();renderDayDetails();draftSlots=mineForDate($('editDate').value||selectedDate).map(s=>({...s}));renderEditor(); }
function renderCalendar(){const cal=$('calendar');cal.innerHTML='';['月','火','水','木','金','土','日'].forEach(w=>{const e=document.createElement('div');e.className='weekday';e.textContent=w;cal.appendChild(e);});
 const first=new Date(displayMonth.getFullYear(),displayMonth.getMonth(),1);let offset=(first.getDay()+6)%7;const start=new Date(first);start.setDate(first.getDate()-offset);const total=42;
 for(let i=0;i<total;i++){const d=new Date(start);d.setDate(start.getDate()+i);const date=isoDate(d), isCurrent=d.getMonth()===displayMonth.getMonth();const cell=document.createElement('button');cell.type='button';cell.className='day-cell'+(!isCurrent?' outside':'')+(date===selectedDate?' selected':'');cell.disabled=!isCurrent;const num=document.createElement('div');num.className='day-num';num.textContent=d.getDate();cell.appendChild(num);
 if(isCurrent){const daySlots=slotsForDate(date);const mine=mineForDate(date);const overlaps=overlapsWithMe(daySlots);const common=commonIntervals(daySlots);const summary=document.createElement('div');summary.className='day-summary';
   if(mine.length){summary.innerHTML='<div class="mine-mark">自分 '+mine.map(s=>`${safe(s.start)}-${safe(s.end)}`).join('<br>')+'</div>';}
   else {summary.innerHTML='<div class="no-info">自分の登録なし</div>';}
   if(overlaps.length){summary.innerHTML+=`<div class="overlap-mark">共通 ${overlaps.length}人</div><div class="overlap-time">${overlaps.slice(0,2).map(o=>`${safe(o.member)} ${o.times.map(t=>`${safe(t.start)}-${safe(t.end)}`).join(', ')}`).join('<br>')}${overlaps.length>2?'<br>ほか'+(overlaps.length-2)+'人':''}</div>`;}
   if(common.length){summary.innerHTML+=`<span class="common-mark">全員 ${safe(common[0].start)}-${safe(common[0].end)}</span>`;}
   cell.appendChild(summary);cell.addEventListener('click',()=>{try{commitEditorToMonth();}catch(e){alert(e.message);return;}selectedDate=date;editorDate=date;$('editDate').value=date;renderAll();});}
 cal.appendChild(cell);}
}
function renderDayDetails(){const date=selectedDate||$('editDate').value;const d=new Date(date+'T00:00:00');$('detailDate').textContent=`${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日（${'日月火水木金土'[d.getDay()]}）`;
 const slots=slotsForDate(date);const host=$('dayDetails');const mine=mineForDate(date);const overlaps=overlapsWithMe(slots);
 let html='<section class="my-day-box"><h3>自分の空き時間</h3>';
 html+=mine.length?mine.map(s=>`<span class="time-chip mine-chip">${safe(s.start)}〜${safe(s.end)}</span>`).join(''):'<p class="small-note">この日に自分が登録した空き時間はありません。登録がないことは、空いていないという意味ではありません。</p>';
 html+='</section><section class="overlap-day-box"><h3>自分と時間が重なるメンバー</h3>';
 html+=overlaps.length?overlaps.map(o=>`<div class="member-slots"><div class="member-name"><span class="member-dot" style="background:${memberColors[o.member]||'#55a9e5'}"></span>${safe(o.member)}</div><div class="small-note">自分と共通して空いている時間</div>${o.times.map(t=>`<span class="time-chip overlap-chip">${safe(t.start)}〜${safe(t.end)}</span>`).join('')}</div>`).join(''):'<p class="small-note">自分と共通して空いている時間が見つかりませんでした。相手の空き時間が未登録の場合も、共通時間は判断できません。</p>';
 html+='</section><details class="all-members-details"><summary>メンバー全員の空き時間を確認</summary>';
 if(!slots.length){html+='<p class="muted">この日に登録された空き時間はありません。</p>';}
 else {html+=memberOrder.map(member=>{const list=slots.filter(s=>s.member===member);return `<div class="member-slots"><div class="member-name"><span class="member-dot" style="background:${memberColors[member]||'#55a9e5'}"></span> ${safe(member)}</div>${list.length?list.map(s=>`<span class="time-chip">${safe(s.start)}〜${safe(s.end)}</span>`).join(''):'<span class="muted">登録された空き時間なし</span>'}</div>`;}).join('');}
 html+='</details>';host.innerHTML=html;
 const common=commonIntervals(slots);const box=$('commonForDay');if(common.length){box.style.display='block';box.innerHTML='<h3>全員が共通して空いている時間</h3>'+common.map(s=>`<span class="time-chip">${safe(s.start)}〜${safe(s.end)}</span>`).join('');}else{box.style.display='block';box.innerHTML='<h3>全員共通の空き時間</h3><div class="small-note">登録された時間帯の中に、全員共通の時間は見つかりませんでした。未登録の人がいる場合は、共通時間を確定できません。</div>';}}
function overlapsWithMe(slots){
 const mine=slots.filter(s=>s.member===currentUser.member);const result=[];
 for(const member of memberOrder){if(member===currentUser.member)continue;const theirs=slots.filter(s=>s.member===member);const pieces=[];
   for(const a of mine)for(const b of theirs){const start=a.start>b.start?a.start:b.start;const end=a.end<b.end?a.end:b.end;if(start<end)pieces.push({start,end});}
   pieces.sort((a,b)=>a.start.localeCompare(b.start)||a.end.localeCompare(b.end));const merged=[];
   for(const piece of pieces){const last=merged[merged.length-1];if(last&&piece.start<=last.end){if(piece.end>last.end)last.end=piece.end;}else merged.push({...piece});}
   if(merged.length)result.push({member,times:merged});
 }
 return result;
}
function timeOptions(selected){
 const value=String(selected||'');
 let options='<option value="">選択</option>';
 for(let hour=0;hour<=23;hour++){const t=`${pad(hour)}:00`;options+=`<option value="${t}" ${value===t?'selected':''}>${hour}時</option>`;}
 // 以前に分単位で保存された値は勝手に丸めず、既存値として表示して保持する
 if(value && !/^\d{2}:00$/.test(value)) options+=`<option value="${safe(value)}" selected>${safe(value)}（既存データ）</option>`;
 return options;
}
function renderEditor(){const date=$('editDate').value;const d=date?new Date(date+'T00:00:00'):null;$('editDateLabel').textContent=d?`${d.getMonth()+1}月${d.getDate()}日の空き時間`:'日付を選んでください';const host=$('slotEditor');if(!draftSlots.length){host.innerHTML='<p class="small-note">この日は時間帯がまだ入力されていません。</p>';return;}host.innerHTML=draftSlots.map((s,i)=>`<div class="slot-row"><label>開始<select onchange="changeDraft(${i},'start',this.value)">${timeOptions(s.start)}</select></label><label>終了<select onchange="changeDraft(${i},'end',this.value)">${timeOptions(s.end)}</select></label><button type="button" class="remove-slot" onclick="removeDraft(${i})" aria-label="時間帯を削除">削除</button></div>`).join('');}
window.changeDraft=(i,key,value)=>{if(draftSlots[i])draftSlots[i][key]=value;};window.removeDraft=i=>{draftSlots.splice(i,1);renderEditor();};
function commitEditorToMonth(){const date=editorDate||$('editDate').value;if(!date||date.slice(0,7)!==monthKey(displayMonth))return;const cleaned=draftSlots.filter(s=>s.start&&s.end).map(s=>({member:currentUser.member,date,start:s.start,end:s.end}));if(draftSlots.some(s=>(s.start&&!s.end)||(!s.start&&s.end)|| (s.start&&s.end&&s.start>=s.end)))throw new Error(`${date} の時間帯を確認してください。開始と終了を正しく入力してください。`);allSlots=allSlots.filter(s=>!(s.member===currentUser.member&&s.date===date));allSlots.push(...cleaned);}
function populateBulkTimeOptions(){for(const id of ['bulkStart','bulkEnd']){const select=$(id);if(!select)return;select.innerHTML='<option value="">時刻を選択</option>'+Array.from({length:24},(_,hour)=>`<option value="${pad(hour)}:00">${hour}時</option>`).join('');} $('bulkStart').value='13:00';$('bulkEnd').value='18:00';}
function applyWeekday(){try{commitEditorToMonth();const weekday=$('weekdaySelect').value;const start=$('bulkStart').value;const end=$('bulkEnd').value;if(weekday===''||!start||!end){alert('曜日・開始時刻・終了時刻を選択してください。');return;}if(start>=end){alert('終了時刻は開始時刻より後にしてください。');return;}const y=displayMonth.getFullYear(),m=displayMonth.getMonth();for(let day=1;day<=new Date(y,m+1,0).getDate();day++){const d=new Date(y,m,day);if(d.getDay()===Number(weekday)){const date=isoDate(d);const existing=allSlots.filter(s=>s.member===currentUser.member&&s.date===date);if(!existing.some(s=>s.start===start&&s.end===end))allSlots.push({member:currentUser.member,date,start,end,id:'draft-'+date+'-'+start});}}selectedDate=$('editDate').value;draftSlots=mineForDate(selectedDate).map(s=>({...s}));renderAll();$('saveMessage').textContent='曜日の時間を追加しました。まだ保存されていません。';}catch(e){alert(e.message);}}
function copyMonth(){const value=$('copyMonth').value;if(!value){alert('コピー元の月を選んでください。');return;}if(value===monthKey(displayMonth)){alert('コピー元と編集先が同じ月です。別の月を選んでください。');return;}if(!confirm(`${value} の自分の空き時間を ${monthKey(displayMonth)} にコピーします。現在の編集内容は置き換わります。よろしいですか？`))return;const source=allSlots.filter(s=>s.member===currentUser.member&&s.date.slice(0,7)===value);const [y,m]=monthKey(displayMonth).split('-').map(Number);const days=new Date(y,m,0).getDate();allSlots=allSlots.filter(s=>!(s.member===currentUser.member&&s.date.slice(0,7)===monthKey(displayMonth)));source.forEach(s=>{const oldDay=Number(s.date.slice(8,10));if(oldDay<=days)allSlots.push({member:currentUser.member,date:`${monthKey(displayMonth)}-${pad(oldDay)}`,start:s.start,end:s.end,id:'draft-copy-'+oldDay+'-'+s.start});});editorDate=$('editDate').value;draftSlots=mineForDate(editorDate).map(s=>({...s}));renderAll();$('saveMessage').textContent='コピーしました。まだ保存されていません。';}
function normalizeTime(s){const m=s.match(/^(\d{1,2}):(\d{2})$/);if(!m||Number(m[1])>23||Number(m[2])>59)return null;return `${pad(Number(m[1]))}:${m[2]}`;}
async function saveMonth(){const msg=$('saveMessage');try{commitEditorToMonth();const key=monthKey(displayMonth);const slots=allSlots.filter(s=>s.member===currentUser.member&&s.date.slice(0,7)===key).map(s=>({date:s.date,start:s.start,end:s.end}));if(slots.length>100){throw new Error('登録数が多すぎます。月ごとの時間帯を100件以内にしてください。');}for(const s of slots){if(!/^\d{4}-\d{2}-\d{2}$/.test(s.date)||!s.start||!s.end||s.start>=s.end)throw new Error(`${s.date} の時間帯を確認してください。`);}if(!confirm(`${key} の自分の空き時間 ${slots.length}件を保存します。今月分の自分の登録内容を置き換えます。よろしいですか？`))return;msg.textContent='保存中...';$('saveMonthBtn').disabled=true;const res=await gas('saveMonth',{month:key,slots:JSON.stringify(slots)});if(!res.ok)throw new Error(res.error||'保存に失敗しました。');msg.textContent=`${key} の予定を ${slots.length}件保存しました。`;await loadSlots();}catch(e){msg.textContent=e.message;}finally{$('saveMonthBtn').disabled=false;}}
function commonIntervals(slots){if(!memberOrder.every(m=>slots.some(s=>s.member===m)))return[];const boundaries=[...new Set(slots.flatMap(s=>[s.start,s.end]))].sort();const pieces=[];for(let i=0;i<boundaries.length-1;i++){const start=boundaries[i],end=boundaries[i+1];if(start>=end)continue;if(memberOrder.every(member=>slots.some(s=>s.member===member&&s.start<=start&&s.end>=end))){const last=pieces[pieces.length-1];if(last&&last.end===start)last.end=end;else pieces.push({start,end});}}return pieces;}
