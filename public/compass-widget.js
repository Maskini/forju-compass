/* ForJu Compass in-page launcher. No visitor credentials, page text or cookies are read. */
(() => {
  const script = document.currentScript;
  if (!script || document.querySelector("forju-compass-widget")) return;
  const origin = new URL(script.src).origin;
  const host = document.createElement("forju-compass-widget");
  host.hidden=true;
  document.body.append(host);
  const root = host.attachShadow({mode:"open"});
  const styles = document.createElement("link");
  styles.addEventListener("load",()=>{host.hidden=false;});
  styles.rel="stylesheet"; styles.href=origin+"/compass-widget.css";root.append(styles);
  const el=(tag,cls,parent)=>{const n=document.createElement(tag);n.className=cls;parent.append(n);return n;};
  const button=(cls,parent,fn)=>{const b=el("button",cls,parent);b.type="button";b.addEventListener("click",fn);return b;};
  const image=(file,cls,parent)=>{const i=el("img",cls,parent);i.src=origin+"/forju/"+file;i.alt="";return i;};
  const paths={
    expand:"M14 4h6v6m0-6-7 7M10 20H4v-6m0 6 7-7",
    restore:"M20 4l-6 6m0-6v6h6M4 20l6-6m-6 0h6v6",
    trash:"M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6m4-6v6",
    bulb:"M9 18h6m-5 3h4m-5-6a6 6 0 1 1 6 0l-1 2h-4z",
    page:"M6 3h8l4 4v14H6z M14 3v5h4 M9 12h6m-6 4h5",
    people:"M3 20v-2a5 5 0 0 1 10 0v2m2-7a5 5 0 0 1 6 5v2M8 4a3.5 3.5 0 1 0 .01 0m8 1a3 3 0 1 1 0 6"
  };
  function icon(name,parent){
    const ns="http://www.w3.org/2000/svg",svg=document.createElementNS(ns,"svg"),path=document.createElementNS(ns,"path");
    Object.entries({viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"1.7","stroke-linecap":"round","stroke-linejoin":"round","aria-hidden":"true"}).forEach(([k,v])=>svg.setAttribute(k,v));
    path.setAttribute("d",paths[name]);svg.append(path);parent.append(svg);return path;
  }
  const wrap=el("div","dock",root), card=el("section","welcome",wrap);card.id="compass-welcome";
  image("forju-compass-logo.png","logo",card).alt="ForJu Compass";
  const dismiss=button("dismiss",card,()=>toggleWelcome(false));dismiss.textContent="\u00d7";
  const heading=el("h2","",card);
  const intro=el("p","intro",card),note=el("p","notice",card);
  const topics=["volunteer","projects","audience"];
  const entries=topics.map((topic,i)=>{
    const b=button("topic topic"+i,card,()=>open(topic));
    icon(["bulb","page","people"][i],el("span","mark",b));
    const label=el("span","",b);const arrow=el("span","arrow",b);arrow.textContent="\u2192";return label;
  });
  const start=button("start fj-action",card,()=>open());
  const startLabel=el("span","",start);
  const go=el("span","",start);go.textContent="\u2192";go.ariaHidden="true";
  const launcher = button("launcher", wrap, () => {
    if (dialog.open) closeChat();
    else if (started) open();
    else toggleWelcome(card.hidden);
  });
  const seal=el("span","seal",launcher),hint=el("span","hint",launcher);
  image("compass-mark.webp","star",seal);
  const dialog=el("dialog","drawer",root);dialog.setAttribute("aria-label","ForJu Compass");
  dialog.id = "compass-conversation";
  // A host-side handle covers only the iframe's non-interactive logo area.
  // Pointer capture lets the drag continue across the cross-origin iframe.
  const move = button("move",dialog,event=>{
    if (suppressMoveClick && event.detail !== 0) { suppressMoveClick=false; return; }
    togglePositions(positions.hidden);
  });
  const positions=el("div","positions",dialog);positions.hidden=true;positions.id="compass-positions";
  positions.setAttribute("role","group");
  move.setAttribute("aria-controls",positions.id);move.setAttribute("aria-expanded","false");
  const positionButtons=["left","right","reset"].map(side=>button("position",positions,()=>{
    const bounds=dialog.getBoundingClientRect();
    position=side==="reset"?null:{x:side==="left"?12:window.innerWidth-bounds.width-12,y:bounds.top};
    paintPosition();togglePositions(false);move.focus({preventScroll:true});
  }));
  const resize = button("resize", dialog, () => {
    expanded = !expanded;
    applyLayout();
  });
  const resizeIcon = icon("expand", resize);
  const clear = button("clear",dialog,()=>{
    if(ready) frame.contentWindow.postMessage({type:"forju:clear-request"},origin);
  });
  icon("trash",clear);
  const close=button("close",dialog,closeChat);close.textContent="\u00d7";
  const frame=el("iframe","",dialog);frame.title="ForJu Compass";frame.allow="clipboard-write";frame.referrerPolicy="no-referrer";
  const recovery=el("section","recovery",dialog);
  const status=el("p","",recovery);status.setAttribute("role","status");
  const retry=button("start fj-action",recovery,loadFrame);
  const contact=el("a","",recovery);contact.target="_blank";contact.rel="noopener noreferrer";
  let waitTimer;
  function loadFrame(){
    clearTimeout(waitTimer);
    ready=false;recovery.hidden=false;retry.hidden=true;
    frame.hidden=true;
    status.textContent=language()==="en"?"Opening Compass\u2026":"Compass wird ge\u00f6ffnet \u2026";
    frame.src=origin+"/embed?widget=1&lang="+language();
    waitTimer=setTimeout(()=>{
      status.textContent=language()==="en"?"Chat is taking longer to open.":"Der Chat braucht l\u00e4nger zum \u00d6ffnen.";
      retry.hidden=false;
    },8000);
  }
  // The keyboard can shrink the host\u2019s visual viewport while the iframe still
  // reports its full layout height. Size the dialog from the host in that case.
  function fitViewport(){
    const viewport=window.visualViewport;
    if(dialog.open && viewport && phone.matches){
      dialog.style.height=viewport.height+"px";
      dialog.style.top=viewport.offsetTop+"px";
    } else {
      dialog.style.removeProperty("height");
      if(!canMove() || !position)dialog.style.removeProperty("top");
    }
  }
  const phone = window.matchMedia("(max-width:640px)");
  let ready = false, queued = null, started = false, expanded = false;
  let savedOverflow = null;
  let position=null, drag=null, suppressMoveClick=false;
  function canMove(){
    return dialog.open && !phone.matches && !expanded &&
      !["data-draft","data-report","data-clear"].some(name=>dialog.hasAttribute(name));
  }
  function paintPosition(){
    if(canMove() && position){
      const bounds=dialog.getBoundingClientRect(),gap=12;
      position.x=Math.max(gap,Math.min(position.x,window.innerWidth-bounds.width-gap));
      position.y=Math.max(gap,Math.min(position.y,window.innerHeight-bounds.height-gap));
      Object.assign(dialog.style,{left:position.x+"px",top:position.y+"px",right:"auto",bottom:"auto"});
    } else {
      for(const property of ["left","top","right","bottom"])dialog.style.removeProperty(property);
    }
  }
  function togglePositions(show){
    positions.hidden=!show || !canMove();
    move.setAttribute("aria-expanded",String(!positions.hidden));
  }
  function finishDrag(cancel=false){
    if(!drag)return;
    const previous=drag;
    drag=null;
    if(cancel){position=previous.position;paintPosition();}
    suppressMoveClick=previous.moved;
    dialog.removeAttribute("data-dragging");
    if(move.hasPointerCapture(previous.id))move.releasePointerCapture(previous.id);
  }
  move.addEventListener("pointerdown",event=>{
    if(!canMove() || !event.isPrimary || event.button!==0)return;
    const bounds=dialog.getBoundingClientRect();
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:bounds.left,top:bounds.top,position:position?{...position}:null,moved:false};
    suppressMoveClick=false;
    move.setPointerCapture(event.pointerId);
  });
  move.addEventListener("pointermove",event=>{
    if(!drag || event.pointerId!==drag.id)return;
    const x=event.clientX-drag.x,y=event.clientY-drag.y;
    if(!drag.moved && Math.hypot(x,y)<4)return;
    event.preventDefault();drag.moved=true;togglePositions(false);
    dialog.setAttribute("data-dragging","");
    position={x:drag.left+x,y:drag.top+y};paintPosition();
  });
  move.addEventListener("pointerup",()=>finishDrag());
  move.addEventListener("pointercancel",()=>finishDrag(true));
  move.addEventListener("lostpointercapture",()=>finishDrag());
  move.addEventListener("keydown",event=>{
    const vectors={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
    if(!canMove() || (!vectors[event.key] && event.key!=="Home"))return;
    event.preventDefault();togglePositions(false);
    if(event.key==="Home")position=null;
    else{
      const bounds=dialog.getBoundingClientRect(),step=event.shiftKey?40:16,[x,y]=vectors[event.key];
      position={x:bounds.left+x*step,y:bounds.top+y*step};
    }
    paintPosition();
  });
  document.addEventListener("pointerdown",event=>{
    if(!positions.hidden && !event.composedPath().includes(positions) && !event.composedPath().includes(move))togglePositions(false);
  });
  window.addEventListener("resize",()=>{
    if(dialog.open){finishDrag();paintPosition();fitViewport();}
  });
  function language(){return (script.dataset.lang||document.documentElement.lang||"de").toLowerCase().startsWith("en")?"en":"de";}
  function send(){if(ready){frame.contentWindow.postMessage({type:"forju:open",lang:language(),topic:queued},origin);queued=null;}}
  function render(){
    const en=language()==="en";host.lang=en?"en":"de";
    contact.href="https://forju.at/"+language()+"/kontakt";
    contact.textContent=en?"Contact ForJu":"ForJu kontaktieren";
    retry.textContent=en?"Try again":"Erneut versuchen";
    heading.textContent=en?"What would you like to do?":"Was m\u00f6chtest du machen?";
    intro.textContent=en?"Ask about a workshop, find support or tell us about your project idea.":"Frag nach einem Workshop, finde Unterst\u00fctzung oder erz\u00e4hl uns von deiner Projektidee.";
    note.textContent=en?"Please keep confidential details out of the chat.":"Lass vertrauliche Angaben bitte aus dem Chat.";
    const labels=en?["How can I get involved?","What projects are there?","Who is ForJu for?"]:["Wie kann ich mich engagieren?","Welche Projekte gibt es aktuell?","F\u00fcr wen ist ForJu?"];
    entries.forEach((label,i)=>{label.textContent=labels[i];});
    startLabel.textContent=en?"Open chat":"Chat \u00f6ffnen";
    updateControls();
    close.ariaLabel=en?"Close chat":"Chat schlie\u00dfen";dismiss.ariaLabel=en?"Dismiss welcome":"Begr\u00fc\u00dfung schlie\u00dfen";
    clear.ariaLabel=en?"Clear conversation":"Gespr\u00e4ch l\u00f6schen";clear.title=clear.ariaLabel;
    move.ariaLabel=en?"Move chat":"Chat verschieben";
    move.title=en?"Drag to move. Use arrow keys, or click for positions.":"Zum Verschieben ziehen. Mit Pfeiltasten bewegen oder f\u00fcr Positionen klicken.";
    positions.setAttribute("aria-label",en?"Chat position":"Chatposition");
    positionButtons.forEach((b,i)=>{b.textContent=(en?["Left","Right","Reset position"]:["Links","Rechts","Position zur\u00fccksetzen"])[i];});
  }
  function updateControls() {
    const en = language() === "en";
    const draft = dialog.hasAttribute("data-draft");
    const report = dialog.hasAttribute("data-report");
    const clearing = dialog.hasAttribute("data-clear");
    move.hidden = !canMove();
    if(move.hidden){finishDrag();togglePositions(false);}
    resize.hidden = phone.matches || draft || report || clearing;
    close.hidden = draft || report || clearing;
    clear.hidden = !ready || draft || report || clearing;
    const resizeLabel = expanded
      ? (en ? "Restore compact chat" : "Chat verkleinern")
      : (en ? "Expand chat" : "Chat vergr\u00f6\u00dfern");
    resize.setAttribute("aria-label", resizeLabel);
    resize.title = resizeLabel;
    resizeIcon.setAttribute("d", expanded ? paths.restore : paths.expand);
    wrap.hidden = dialog.open && (phone.matches || expanded || draft || clearing);
    launcher.setAttribute("aria-controls", started ? dialog.id : card.id);
    launcher.setAttribute("aria-expanded", String(dialog.open || !card.hidden));
    const launcherLabel = dialog.open ? (en ? "Minimize chat" : "Chat minimieren")
      : started ? (en ? "Resume chat" : "Chat fortsetzen")
      : (en ? "ForJu Compass: chat assistance" : "ForJu Compass: Chathilfe");
    hint.textContent = en ? "Questions? I\u2019m here to help!" : "Fragen? Ich bin f\u00fcr dich da!";
    hint.hidden = dialog.open || !card.hidden;
    launcher.setAttribute("aria-label", launcherLabel);
    launcher.title = launcherLabel;
  }
  function toggleWelcome(show) {
    card.hidden = !show;
    updateControls();
    (show ? start : launcher).focus({preventScroll:true});
  }
  function lockPage(lock) {
    if (lock && savedOverflow === null) {
      savedOverflow = document.body.style.overflowY;
      document.body.style.overflowY = "hidden";
    } else if (!lock && savedOverflow !== null) {
      document.body.style.overflowY = savedOverflow;
      savedOverflow = null;
    }
  }
  function applyLayout() {
    // Reading the host site remains possible beside both desktop chat sizes.
    // A phone or the project form uses a modal, with focus and scrolling inside.
    const modal = phone.matches || dialog.hasAttribute("data-draft");
    const changingMode = dialog.open && dialog.matches(":modal") !== modal;
    const wasInFrame = root.activeElement === frame;
    dialog.toggleAttribute("data-expanded", expanded && !phone.matches);
    if (changingMode) dialog.close();
    if (!dialog.open) {
      if (modal) dialog.showModal();
      else dialog.show();
    }
    lockPage(modal);
    paintPosition();
    updateControls();
    fitViewport();
    if (changingMode && wasInFrame) frame.focus({preventScroll:true});
  }
  function open(topic=null) {
    if (dialog.open) return;
    started = true;
    queued = topic;
    card.hidden = true;
    if (!frame.hasAttribute("src")) loadFrame();
    applyLayout();
    window.visualViewport?.addEventListener("resize", fitViewport);
    window.visualViewport?.addEventListener("scroll", fitViewport);
    close.focus({preventScroll:true});
    send();
  }
  phone.addEventListener("change", () => { if (dialog.open) applyLayout(); });
  wrap.addEventListener("keydown", event => {
    if (event.key === "Escape" && !card.hidden) {
      event.preventDefault();
      toggleWelcome(false);
    }
  });
  dialog.addEventListener("keydown", event => {
    if(event.key==="Escape" && (drag || !positions.hidden)){
      event.preventDefault();event.stopPropagation();finishDrag(true);togglePositions(false);move.focus({preventScroll:true});return;
    }
    if (event.key === "Escape" && !dialog.hasAttribute("data-draft") && !dialog.hasAttribute("data-clear")) {
      event.preventDefault();
      closeChat();
    }
  });
  window.addEventListener("message",event=>{
    if(event.origin!==origin||event.source!==frame.contentWindow)return;
    if(event.data?.type==="forju:clear-dialog" && dialog.open && typeof event.data.open==="boolean"){
      dialog.toggleAttribute("data-clear",event.data.open);
      updateControls();
      if(!event.data.open) clear.focus({preventScroll:true});
    }
    if(event.data?.type==="forju:report" && dialog.open && typeof event.data.open==="boolean"){
      dialog.toggleAttribute("data-report",event.data.open);
      updateControls();
    }
    if(event.data?.type==="forju:draft" && dialog.open && typeof event.data.open==="boolean"){
      dialog.toggleAttribute("data-draft",event.data.open);
      applyLayout();
      frame.contentWindow.postMessage({type:"forju:draft-layout",open:event.data.open},origin);
    }
    if(event.data?.type==="forju:ready"){ready=true;clearTimeout(waitTimer);recovery.hidden=true;frame.hidden=false;updateControls();if(dialog.open)send();}
    if(event.data?.type==="forju:close"&&dialog.open&&!dialog.hasAttribute("data-draft")&&!dialog.hasAttribute("data-clear"))closeChat();
  });
  dialog.addEventListener("cancel", event => {
    event.preventDefault();
    if (!dialog.hasAttribute("data-draft") && !dialog.hasAttribute("data-clear")) closeChat();
  });
  // Restore the host control after the browser completes closing the iframe's
  // dialog. Immediate focus alone can be lost during Firefox's close handling.
  // A layout change closes and reopens the dialog; do not steal focus then.
  dialog.addEventListener("close", () => {
    if (!dialog.open) launcher.focus({preventScroll:true});
  });
  function closeChat() {
    if (!dialog.open) return;
    finishDrag();togglePositions(false);
    dialog.close();
    dialog.removeAttribute("data-draft");
    window.visualViewport?.removeEventListener("resize", fitViewport);
    window.visualViewport?.removeEventListener("scroll", fitViewport);
    lockPage(false);
    updateControls();
    launcher.focus({preventScroll:true});
  }
  new MutationObserver(()=>{render();if(dialog.open)send();}).observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});
  card.hidden = script.dataset.welcome !== "open";
  render();
})();
