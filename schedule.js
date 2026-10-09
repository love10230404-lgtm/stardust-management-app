let allSlots = [];
let currentUser = null;

const memberOrder = ["四宮","るーゔ","ちなつ","しーた","Moon"];

document.addEventListener("DOMContentLoaded", async () => {
  currentUser = await loadUser();
  if (!currentUser?.loggedIn) return;

  const today = new Date();
  const iso = d => { const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0"); return `${y}-${m}-${day}`; };
  document.getElementById("date").value = iso(today);
  document.getElementById("searchFrom").value = iso(today);
  const week = new Date(today); week.setDate(week.getDate()+14);
  document.getElementById("searchTo").value = iso(week);

  document.getElementById("scheduleForm").addEventListener("submit", saveSlot);
  document.getElementById("reloadBtn").addEventListener("click", loadSlots);
  document.getElementById("searchBtn").addEventListener("click", searchCommon);

  await loadSlots();
});

async function loadSlots() {
  const list = document.getElementById("scheduleList");
  list.textContent = "読み込み中...";
  try {
    const res = await gas("listSlots");
    if (!res.ok) throw new Error(res.error || "取得に失敗しました");
    allSlots = res.slots || [];
    renderSlots();
  } catch(e) {
    list.innerHTML = `<div class="empty">${escapeHtml(e.message)}</div>`;
  }
}

async function saveSlot(e) {
  e.preventDefault();
  const date = document.getElementById("date").value;
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;
  const msg = document.getElementById("formMessage");

  if (start >= end) {
    msg.textContent = "終了時刻は開始時刻より後にしてください。";
    return;
  }
  msg.textContent = "登録中...";
  try {
    const res = await gas("addSlot",{date,start,end});
    if (!res.ok) throw new Error(res.error || "登録に失敗しました");
    msg.textContent = "登録しました。";
    document.getElementById("start").value = "";
    document.getElementById("end").value = "";
    await loadSlots();
  } catch(e) {
    msg.textContent = e.message;
  }
}

function renderSlots() {
  const list = document.getElementById("scheduleList");
  if (!allSlots.length) {
    list.innerHTML = `<div class="empty">まだ登録がありません。</div>`;
    return;
  }
  const grouped = {};
  allSlots.forEach(s => {
    (grouped[s.date] ||= []).push(s);
  });

  let html = "";
  Object.keys(grouped).sort().forEach(date => {
    html += `<h3>${formatDate(date)}</h3>`;
    grouped[date].sort((a,b)=>a.start.localeCompare(b.start)).forEach(s => {
      const mine = currentUser && s.email === currentUser.email;
      html += `<div class="schedule-item">
        ${mine ? `<button class="delete-btn" onclick="deleteSlot('${s.id}')">削除</button>` : ""}
        <div class="member">${escapeHtml(s.member)}</div>
        <div class="time">${s.start} ～ ${s.end}</div>
      </div>`;
    });
  });
  list.innerHTML = html;
}

async function deleteSlot(id) {
  if (!confirm("この空き時間を削除しますか？")) return;
  try {
    const res = await gas("deleteSlot",{id});
    if (!res.ok) throw new Error(res.error || "削除に失敗しました");
    await loadSlots();
  } catch(e) { alert(e.message); }
}

function searchCommon() {
  const from = document.getElementById("searchFrom").value;
  const to = document.getElementById("searchTo").value;
  const count = Number(document.getElementById("requiredCount").value);
  const out = document.getElementById("commonResults");

  if (!from || !to || from > to) {
    out.innerHTML = `<div class="empty">検索期間を正しく指定してください。</div>`;
    return;
  }

  const results = [];
  for (const date of uniqueDates(from,to)) {
    const slots = allSlots.filter(s => s.date === date);
    const boundaries = [...new Set(slots.flatMap(s => [s.start,s.end]))].sort();
    for (let i=0;i<boundaries.length-1;i++) {
      const a=boundaries[i], b=boundaries[i+1];
      if (a >= b) continue;
      const available = memberOrder.filter(member =>
        slots.some(s => s.member===member && s.start<=a && s.end>=b)
      );
      if (available.length >= count) {
        results.push({date,start:a,end:b,members:available});
      }
    }
  }

  // 隣接する時間帯を同じメンバー条件ごとにまとめる
  const merged=[];
  results.forEach(r=>{
    const last=merged[merged.length-1];
    const key=r.members.join(",");
    if(last && last.date===r.date && last.end===r.start && last.members.join(",")===key){
      last.end=r.end;
    } else merged.push({...r});
  });

  if(!merged.length){
    out.innerHTML = `<div class="empty">条件に合う時間が見つかりませんでした。</div>`;
    return;
  }

  out.innerHTML = merged.map(r=>`
    <div class="result">
      <strong>${formatDate(r.date)}</strong><br>
      ${r.start} ～ ${r.end}<br>
      <span>${r.members.join("・")}</span>
    </div>`).join("");
}

function uniqueDates(from,to){
  const set=new Set();
  allSlots.forEach(s=>{if(s.date>=from&&s.date<=to)set.add(s.date)});
  return [...set].sort();
}
function formatDate(date){
  const d=new Date(date+"T00:00:00");
  const w=["日","月","火","水","木","金","土"][d.getDay()];
  return `${date.replaceAll("-","/")}（${w}）`;
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
}
