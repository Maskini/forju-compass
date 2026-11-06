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
    bulb:"M9 18h6m-5 3h4m-5-6a6 6 0 1 1 6 0l-1 2h-4z",
    page:"M6 3h8l4 4v14H6z M14 3v5h4 M9 12h6m-6 4h5",
    people:"M3 20v-2a5 5 0 0 1 10 0v2m2-7a5 5 0 0 1 6 5v2M8 4a3.5 3.5 0 1 0 .01 0m8 1a3 3 0 1 1 0 6",
    chat:"M21 11a9 9 0 0 1-9 9H4l-2 2 1.4-6A9 9 0 1 1 21 11z M8 11h.01m4 0h.01m4 0h.01"
  };
  function icon(name,parent){
    const ns="http://www.w3.org/2000/svg",svg=document.createElementNS(ns,"svg"),path=document.createElementNS(ns,"path");
    Object.entries({viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"1.7","stroke-linecap":"round","stroke-linejoin":"round","aria-hidden":"true"}).forEach(([k,v])=>svg.setAttribute(k,v));
    path.setAttribute("d",paths[name]);svg.append(path);parent.append(svg);
  }
  const wrap=el("div","dock",root), card=el("section","welcome",wrap);card.id="compass-welcome";
  image("forju-compass-logo.png","logo",card).alt="ForJu Compass";
  const dismiss=button("dismiss",card,()=>toggle(false));dismiss.textContent="×";
  const heading=el("h2","",card);image("origami/pink-airplane.png","plane",card);
  const intro=el("p","intro",card),note=el("p","notice",card),caption=el("h3","",card);
  const topics=["volunteer","projects","audience"];
  const entries=topics.map((topic,i)=>{
    const b=button("topic topic"+i,card,()=>open(topic));
    icon(["bulb","page","people"][i],el("span","mark",b));
    const label=el("span","",b);const arrow=el("span","arrow",b);arrow.textContent="→";return label;
  });
  const start=button("start",card,()=>open());
  icon("chat",start);const startLabel=el("span","",start);
  const go=el("span","",start);go.textContent="→";go.ariaHidden="true";
  const launcher=button("launcher",wrap,()=>toggle(card.hidden));
  launcher.setAttribute("aria-controls",card.id);
  const hint=el("span","hint",launcher),seal=el("span","seal",launcher);
  image("forju-compass-logo.png","star",seal);
  const dialog=el("dialog","drawer",root);dialog.setAttribute("aria-label","ForJu Compass");
  const close=button("close",dialog,()=>dialog.close());close.textContent="×";
  const frame=el("iframe","",dialog);frame.title="ForJu Compass";frame.allow="clipboard-write";frame.referrerPolicy="no-referrer";
  const recovery=el("section","recovery",dialog);
  const status=el("p","",recovery);status.setAttribute("role","status");
  const retry=button("start",recovery,loadFrame);
  const contact=el("a","",recovery);contact.target="_blank";contact.rel="noopener noreferrer";
  let waitTimer;
  function loadFrame(){
    clearTimeout(waitTimer);
    ready=false;recovery.hidden=false;retry.hidden=true;
    frame.hidden=true;
    status.textContent=language()==="en"?"Opening Compass…":"Compass wird geöffnet …";
    frame.src=origin+"/embed?widget=1&lang="+language();
    waitTimer=setTimeout(()=>{
      status.textContent=language()==="en"?"Chat is taking longer to open.":"Der Chat braucht länger zum Öffnen.";
      retry.hidden=false;
    },8000);
  }
  // The keyboard can shrink the host’s visual viewport while the iframe still
  // reports its full layout height. Size the dialog from the host in that case.
  function fitViewport(){
    const viewport=window.visualViewport;
    if(dialog.open && viewport && window.matchMedia("(max-width:640px)").matches){
      dialog.style.height=viewport.height+"px";
      dialog.style.top=viewport.offsetTop+"px";
    } else {
      dialog.style.removeProperty("height");
      dialog.style.removeProperty("top");
    }
  }
  let ready=false,queued=null,lastFocus=null,previousOverflow="";
  function language(){return (script.dataset.lang||document.documentElement.lang||"de").toLowerCase().startsWith("en")?"en":"de";}
  function send(){if(ready){frame.contentWindow.postMessage({type:"forju:open",lang:language(),topic:queued},origin);queued=null;}}
  function render(){
    const en=language()==="en";host.lang=en?"en":"de";
    contact.href="https://forju.at/"+language()+"/kontakt";
    contact.textContent=en?"Contact ForJu":"ForJu kontaktieren";
    retry.textContent=en?"Try again":"Erneut versuchen";
    heading.textContent=en?"Hello! I’m ForJu Compass":"Hallo! Ich bin ForJu Compass";
    intro.textContent=en?"Your AI assistant for our services, projects and association.":"Dein KI-Assistent für Fragen rund um unsere Angebote, Projekte und den Verein.";
    note.textContent=en?"ⓘ  I use AI to help you. Please leave out sensitive personal information.":"ⓘ  Ich nutze KI, um dir zu helfen. Bitte teile keine sensiblen personenbezogenen Daten mit mir.";
    caption.textContent=en?"Frequently asked questions":"Häufige Fragen";
    const labels=en?["How can I get involved?","What projects are there?","Who is ForJu for?"]:["Wie kann ich mich engagieren?","Welche Projekte gibt es aktuell?","Für wen ist ForJu?"];
    entries.forEach((label,i)=>{label.textContent=labels[i];});
    startLabel.textContent=en?"Open chat":"Chat öffnen";
    hint.textContent=en?"Questions? I’m here to help!":"Fragen? Ich bin für dich da!";
    launcher.setAttribute("aria-label",en?"ForJu Compass: chat assistance":"ForJu Compass: Chathilfe");
    close.ariaLabel=en?"Close chat":"Chat schließen";dismiss.ariaLabel=en?"Dismiss welcome":"Begrüßung schließen";
  }
  function toggle(show){card.hidden=!show;launcher.setAttribute("aria-expanded",String(show));if(!show)launcher.focus({preventScroll:true});}
  function open(topic=null){
    lastFocus=root.activeElement;queued=topic;card.hidden=true;launcher.setAttribute("aria-expanded","false");
    if(!frame.hasAttribute("src"))loadFrame();
    previousOverflow=document.body.style.overflow;document.body.style.overflow="hidden";
    dialog.showModal();fitViewport();
    window.visualViewport?.addEventListener("resize",fitViewport);
    window.visualViewport?.addEventListener("scroll",fitViewport);
    close.focus();send();
  }
  window.addEventListener("message",event=>{
    if(event.origin!==origin||event.source!==frame.contentWindow)return;
    if(event.data?.type==="forju:draft" && dialog.open && typeof event.data.open==="boolean"){
      dialog.toggleAttribute("data-draft",event.data.open);close.hidden=event.data.open;fitViewport();
    }
    if(event.data?.type==="forju:ready"){ready=true;clearTimeout(waitTimer);recovery.hidden=true;frame.hidden=false;if(dialog.open)send();}
    if(event.data?.type==="forju:close"&&dialog.open)dialog.close();
  });
  dialog.addEventListener("click",e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  dialog.addEventListener("close",()=>{
    dialog.removeAttribute("data-draft");close.hidden=false;
    window.visualViewport?.removeEventListener("resize",fitViewport);
    window.visualViewport?.removeEventListener("scroll",fitViewport);
    document.body.style.overflow=previousOverflow;(lastFocus?.getClientRects().length?lastFocus:launcher).focus({preventScroll:true});});
  new MutationObserver(()=>{render();if(dialog.open)send();}).observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});
  render();card.hidden=script.dataset.welcome==="closed";launcher.setAttribute("aria-expanded",String(!card.hidden));
})();
