document.addEventListener("DOMContentLoaded",()=>{
  const form=document.getElementById("loginForm"), message=document.getElementById("loginMessage");
  form.addEventListener("submit",async e=>{
    e.preventDefault(); message.textContent="ログイン中...";
    const member=document.getElementById("member").value, pin=document.getElementById("pin").value;
    try {
      const res=await gas("login",{member,pin});
      if(!res.ok) throw new Error(res.error||"ログインできませんでした。");
      sessionStorage.setItem("stakuro_token",res.token); sessionStorage.setItem("stakuro_member",res.member);
      location.href="index.html";
    } catch(err) { message.textContent=err.message; }
  });
});
