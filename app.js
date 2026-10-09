function gas(action, data = {}) {
  if (!GAS_URL || GAS_URL.includes("ここにGAS")) return Promise.reject(new Error("config.js にGASのウェブアプリURLを設定してください。"));
  const params = new URLSearchParams({ action, ...data });
  return new Promise((resolve, reject) => {
    const callback = "gasCallback_" + Date.now() + "_" + Math.floor(Math.random()*100000);
    const script = document.createElement("script");
    const timer = setTimeout(() => { cleanup(); reject(new Error("GASとの通信がタイムアウトしました。ウェブアプリURLとデプロイ設定を確認してください。")); }, 15000);
    function cleanup(){ clearTimeout(timer); delete window[callback]; script.remove(); }
    window[callback] = result => { cleanup(); resolve(result); };
    script.onerror = () => { cleanup(); reject(new Error("GASに接続できません。ウェブアプリURLとデプロイ設定を確認してください。")); };
    params.set("callback", callback);
    params.set("token", sessionStorage.getItem("stakuro_token") || "");
    script.src = `${GAS_URL}?${params.toString()}`;
    document.head.appendChild(script);
  });
}
function setUserInfo(user) {
  const el=document.getElementById("userInfo"); if(!el) return;
  el.textContent = user && user.loggedIn ? `${user.member} さん` : "ログインしていません";
  document.getElementById("logoutBtn")?.classList.toggle("hidden", !(user&&user.loggedIn));
}
async function loadUser() {
  const token=sessionStorage.getItem("stakuro_token");
  if(!token){ location.href="login.html"; return null; }
  try {
    const res=await gas("me");
    if(!res.loggedIn){ sessionStorage.removeItem("stakuro_token"); sessionStorage.removeItem("stakuro_member"); location.href="login.html"; return null; }
    setUserInfo(res); return res;
  } catch(e) { setUserInfo(null); console.error(e); const el=document.getElementById("userInfo"); if(el) el.textContent=e.message; return null; }
}
document.addEventListener("DOMContentLoaded", () => {
  if (!location.pathname.endsWith("login.html")) loadUser();
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    try { await gas("logout"); } catch(e) { console.warn(e); }
    sessionStorage.removeItem("stakuro_token"); sessionStorage.removeItem("stakuro_member"); location.href="login.html";
  });
});
