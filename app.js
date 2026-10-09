function gas(action, data = {}) {
  if (!GAS_URL || GAS_URL.includes("ここにGAS")) {
    return Promise.reject(new Error("config.js にGASのウェブアプリURLを設定してください。"));
  }
  const params = new URLSearchParams({action, ...data});
  return fetch(`${GAS_URL}?${params.toString()}`, {
    method: "GET",
    credentials: "include"
  }).then(async r => {
    const text = await r.text();
    try { return JSON.parse(text); }
    catch { throw new Error("GASからJSONではない応答が返りました。"); }
  });
}

function setUserInfo(user) {
  const el = document.getElementById("userInfo");
  if (!el) return;
  if (user && user.loggedIn) {
    el.textContent = `${user.member} さん`;
    document.getElementById("logoutBtn")?.classList.remove("hidden");
  } else {
    el.textContent = "ログインしていません";
  }
}

async function loadUser() {
  try {
    const res = await gas("me");
    if (!res.ok || !res.loggedIn) {
      // GAS側のGoogleアカウント認証ページへ誘導
      const loginUrl = res.loginUrl;
      if (loginUrl && !location.pathname.endsWith("login.html")) {
        location.href = loginUrl;
        return null;
      }
    }
    setUserInfo(res);
    return res;
  } catch (e) {
    setUserInfo(null);
    console.error(e);
    return null;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadUser();
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    try {
      const res = await gas("logout");
      if (res.loginUrl) location.href = res.loginUrl;
    } catch(e) {
      alert(e.message);
    }
  });
});
