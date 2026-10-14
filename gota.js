/* Botones de vidrio (vidrio.css): el reflejo sigue al cursor y el clic lanza una onda. */
(function(){
  var SEL=".btn,.nav-auth-btn:not(.is-logged-in),.cr-select-btn,.cr-analyze-btn,.cr-outline-btn,.ct-select-btn,.ct-camera-btn,.ct-analyze-btn,.fha-learn-btn,.official-report-btn,.auth-social-btn,.refresh-btn,.auth-cta-btn";
  var quieto=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function punto(el,e){
    var r=el.getBoundingClientRect();
    return {x:e.clientX-r.left,y:e.clientY-r.top,w:r.width,h:r.height};
  }

  document.addEventListener("pointermove",function(e){
    var el=e.target.closest&&e.target.closest(SEL);
    if(!el)return;
    var p=punto(el,e);
    el.style.setProperty("--gx",p.x+"px");
    el.style.setProperty("--gy",p.y+"px");
  },{passive:true});

  document.addEventListener("pointerdown",function(e){
    if(quieto)return;
    var el=e.target.closest&&e.target.closest(SEL);
    if(!el||el.disabled)return;
    var p=punto(el,e);
    var onda=document.createElement("span");
    onda.className="gota-onda";
    onda.style.left=p.x+"px";
    onda.style.top=p.y+"px";
    /* La onda crece lo justo para cubrir el botón desde el punto tocado. */
    var lejos=Math.max(Math.hypot(p.x,p.y),Math.hypot(p.w-p.x,p.y),Math.hypot(p.x,p.h-p.y),Math.hypot(p.w-p.x,p.h-p.y));
    onda.style.setProperty("--gota-escala",Math.ceil(lejos/10*1.15));
    el.appendChild(onda);
    onda.addEventListener("animationend",function(){onda.remove()});
  });
})();
