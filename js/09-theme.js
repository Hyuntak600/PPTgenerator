(function(){
  const btn=document.getElementById("themeBtn"); if(!btn) return;
  const root=document.documentElement;
  const ic=n=>typeof icon==="function"?icon(n):""; // 01-core.js의 아이콘 함수가 없어도 버튼이 멈추지 않게
  const LABEL={dark:ic("moon")+"다크",light:ic("sun")+"라이트"};
  // 다크/라이트 두 가지만. 저장된 값이 없는 첫 방문에는 기기 설정을 한 번만 참고해 시작 모드를 정하고,
  // 버튼을 누르면 그때부터 고른 값이 저장된다.
  let mode=root.getAttribute("data-theme");
  if(mode!=="dark" && mode!=="light") mode=(window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
  function apply(save){
    root.setAttribute("data-theme",mode);
    btn.innerHTML=LABEL[mode];
    if(save){ try{ localStorage.setItem("subtitleTheme",mode); }catch(e){} }
  }
  btn.addEventListener("click",()=>{ mode = mode==="dark" ? "light" : "dark"; apply(true); });
  apply(false);
})();
(function(){
  const seg=document.getElementById("boldSeg"); if(!seg) return;
  const root=document.documentElement;
  function show(){
    const on=root.getAttribute("data-slide-bold")==="1";
    seg.querySelectorAll("button").forEach(b=>b.classList.toggle("active",(b.dataset.bold==="1")===on));
  }
  seg.addEventListener("click",e=>{
    const b=e.target.closest("button"); if(!b) return;
    if(b.dataset.bold==="1") root.setAttribute("data-slide-bold","1"); else root.removeAttribute("data-slide-bold");
    try{ localStorage.setItem("subtitleSlideBold", b.dataset.bold); }catch(err){}
    show();
    if(typeof recomputeAllFits==="function") recomputeAllFits();
  });
  show();
})();
