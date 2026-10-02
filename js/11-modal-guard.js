// 안내 창(모달) 바깥을 "눌렀다 뗐을 때만" 닫는다. 창 안에서 글자를 드래그하다가 바깥에서 마우스를 놓거나,
// 바깥에서 눌러 안으로 끌어온 경우에는 click 이 바깥 배경에 잡혀 창이 저절로 닫히던 문제를 막는다.
(function(){
  let downTarget = null;
  const remember = e => { downTarget = e.target; };
  document.addEventListener("mousedown", remember, true);
  document.addEventListener("touchstart", remember, true);
  document.addEventListener("click", e => {
    const t = e.target;
    if (t && t.classList && t.classList.contains("patch-overlay") && downTarget !== t) { e.stopPropagation(); e.stopImmediatePropagation(); }
  }, true);
})();
