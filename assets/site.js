
(() => {
  const CHANNELS = [
    { id: "UCbqeKiSOC9TedGQ-stt_2nw", name: "Raqeem Live" },
    { id: "UCIdL3ni3y02jhIsLO7Rjc2A", name: "Raqeem Official" }
  ];
  const CACHE_KEY = "raqeem_youtube_cache_v5";
  const CACHE_AGE = 1000 * 60 * 60 * 6;
  const PAGE = 12;

  let allVideos = [], filteredVideos = [], category = "all", visible = PAGE, currentVideo = null, academyReady = false;

  const body = document.body;
  const header = document.getElementById("header");
  const siteView = document.getElementById("siteView");
  const academyView = document.getElementById("academyView");
  const menu = document.getElementById("mobileMenu");
  const menuBtn = document.getElementById("menuBtn");
  const closeMenuBtn = document.getElementById("closeMenu");
  const player = document.getElementById("player");
  const iframe = document.getElementById("youtubePlayer");

  function headerState(){ header.classList.toggle("scrolled", window.scrollY > 45 || body.classList.contains("academy-mode")); }
  addEventListener("scroll", headerState, {passive:true}); headerState();
  addEventListener("resize",()=>{
    if(innerWidth>1020 && menu.classList.contains("open")){
      closeMenu();
    }
  },{passive:true});

  const root = document.documentElement;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  root.dataset.input = "pointer";
  document.addEventListener("keydown", e => {
    if(!["Shift","Control","Alt","Meta"].includes(e.key)) root.dataset.input = "keyboard";
  }, true);
  document.addEventListener("pointerdown", () => { root.dataset.input = "pointer"; }, true);
  const scrollBehavior = () => reducedMotion.matches || root.dataset.input === "keyboard" ? "instant" : "smooth";
  const focusWithoutScroll = el => el?.focus({preventScroll:true});
  const hero = document.getElementById("home");

  let menuPreviousFocus = null, playerPreviousFocus = null, academyPreviousFocus = null;
  let savedSiteScroll = 0;
  function syncModalState(){
    const menuOpen = menu.classList.contains("open"), playerOpen = player.classList.contains("open");
    const locked = menuOpen || playerOpen;
    body.classList.toggle("lock", locked);
    header.inert = locked;
    siteView.inert = locked;
    academyView.inert = locked;
  }
  function openMenu(){
    if(menu.classList.contains("open")) return;
    if(player.classList.contains("open")) closePlayer(false);
    menuPreviousFocus = document.activeElement;
    menu.inert = false;
    menu.setAttribute("aria-hidden","false");
    menuBtn.setAttribute("aria-expanded","true");
    menu.classList.add("open");
    syncModalState();
    focusWithoutScroll(closeMenuBtn);
  }
  function closeMenu(restoreFocus=true){
    if(!menu.classList.contains("open")) return;
    menu.classList.remove("open");
    menuBtn.setAttribute("aria-expanded","false");
    syncModalState();
    if(restoreFocus) focusWithoutScroll(menuPreviousFocus?.getClientRects().length ? menuPreviousFocus : document.getElementById("brandHome"));
    else if(menu.contains(document.activeElement)) document.activeElement.blur();
    menu.inert = true;
    menu.setAttribute("aria-hidden","true");
  }
  menuBtn.addEventListener("click",openMenu);
  closeMenuBtn.addEventListener("click",()=>closeMenu());
  menu.addEventListener("click",e=>{if(e.target===menu) closeMenu();});

  function openAcademy(){
    if(!academyView.classList.contains("hidden")){
      closeMenu(false);
      focusWithoutScroll(academyView.querySelector("h1"));
      return;
    }
    academyPreviousFocus = menu.contains(document.activeElement) ? menuBtn : document.activeElement;
    savedSiteScroll = window.scrollY;
    closeMenu(false);
    hero.classList.add("intro-done");
    pauseHero();
    siteView.classList.add("hidden");
    academyView.classList.remove("hidden");
    body.classList.add("academy-mode");
    scrollTo({top:0,behavior:"instant"});
    history.replaceState(null,"","#academy");
    headerState();
    syncModalState();
    scheduleProgress();
    focusWithoutScroll(academyView.querySelector("h1"));
    if(!academyReady) initAcademy();
  }
  function closeAcademy(restoreFocus=true){
    if(academyView.classList.contains("hidden")) return;
    closePlayer(false);
    closeMenu(false);
    academyView.classList.add("hidden");
    siteView.classList.remove("hidden");
    body.classList.remove("academy-mode");
    history.replaceState(null,"","#home");
    scrollTo({top:savedSiteScroll,behavior:"instant"});
    headerState();
    syncModalState();
    scheduleProgress();
    if(restoreFocus) focusWithoutScroll(academyPreviousFocus?.getClientRects().length ? academyPreviousFocus : document.getElementById("brandHome"));
  }
  document.querySelectorAll("[data-open-academy]").forEach(el=>el.addEventListener("click",openAcademy));
  document.querySelectorAll("[data-close-academy]").forEach(el=>el.addEventListener("click",()=>closeAcademy()));
  // Resolve site anchors from either view; keyboard navigation remains immediate.
  document.querySelectorAll('a[href^="#"]').forEach(link=>{
    const target = document.getElementById(link.getAttribute("href").slice(1));
    if(!target || !siteView.contains(target)) return;
    link.addEventListener("click",e=>{
      e.preventDefault();
      closeMenu(false);
      closeAcademy(false);
      history.replaceState(null,"",link.getAttribute("href"));
      target.scrollIntoView({behavior:scrollBehavior(),block:"start"});
      target.tabIndex = -1;
      focusWithoutScroll(target);
    });
  });

  /* active nav */
  const navLinks=[...document.querySelectorAll("#nav a")];
  const mobileNavLinks=[...document.querySelectorAll("[data-mobile-section]")];
  const so=new IntersectionObserver(es=>es.forEach(e=>{
    if(!e.isIntersecting)return;
    navLinks.forEach(a=>a.classList.toggle("active",a.getAttribute("href")==="#"+e.target.id));
    mobileNavLinks.forEach(a=>a.classList.toggle("active",a.dataset.mobileSection===e.target.id));
  }),{rootMargin:"-42% 0px -48% 0px"});
  document.querySelectorAll("#siteView main section[id]").forEach(s=>so.observe(s));

  /* join */
  const roleBtns=[...document.querySelectorAll(".role-btn")];
  const roleInput=document.getElementById("joinRole");
  roleBtns.forEach(btn=>btn.addEventListener("click",()=>{
    roleBtns.forEach(b=>{b.classList.toggle("active",b===btn);b.setAttribute("aria-pressed",String(b===btn));});roleInput.value=btn.dataset.role;
  }));

  const joinForm=document.getElementById("joinForm");
  const joinSuccess=document.getElementById("joinSuccess");
  const status=document.getElementById("formStatus");
  joinForm.addEventListener("submit",e=>{
    e.preventDefault();
    const name=document.getElementById("fullName").value.trim();
    const phone=document.getElementById("phone").value.trim();
    const email=document.getElementById("email").value.trim();
    const city=document.getElementById("city").value.trim();
    const message=document.getElementById("message").value.trim();
    const role=roleInput.value;

    if(!name || !phone){
      status.textContent="اكتب الاسم ورقم الهاتف حتى نكمل.";
      status.style.color="#b42318";
      if(!name)document.getElementById("fullName").focus(); else document.getElementById("phone").focus();
      return;
    }

    const text=[
      "مرحبًا، أريد الانضمام إلى مبادرة رقيم.",
      "",
      "الصفة: "+role,
      "الاسم: "+name,
      "رقم الهاتف: "+phone,
      city ? "المحافظة/المدينة: "+city : "",
      email ? "البريد الإلكتروني: "+email : "",
      message ? "الرسالة: "+message : ""
    ].filter(Boolean).join("\n");

    const wa="https://wa.me/962791087449?text="+encodeURIComponent(text);
    const mail="mailto:raqeemimpact@gmail.com?subject="+encodeURIComponent("طلب انضمام إلى رقيم - "+role)+"&body="+encodeURIComponent(text);

    document.getElementById("whatsappLink").href=wa;
    document.getElementById("emailLink").href=mail;
    document.getElementById("successText").textContent="تم تجهيز طلبك كـ "+role+". راجعه وأرسله عبر واتساب أو البريد.";
    joinForm.style.display="none"; joinSuccess.classList.add("show");
    focusWithoutScroll(joinSuccess);
  });
  document.getElementById("editJoin").addEventListener("click",()=>{joinSuccess.classList.remove("show");joinForm.style.display="block";focusWithoutScroll(document.getElementById("fullName"));});

  /* academy */
  const search=document.getElementById("academySearch");
  const videoGrid=document.getElementById("videoGrid");
  const chips=document.getElementById("chips");
  const loadMore=document.getElementById("loadMore");
  const state=document.getElementById("academyState");
  const content=document.getElementById("academyContent");
  const noResults=document.getElementById("noResults");
  const sortOrder=document.getElementById("sortOrder");
  const refreshContent=document.getElementById("refreshContent");
  const academyNotice=document.getElementById("academyNotice");
  let academyLoading=false;
  const normalized=s=>String(s).toLowerCase().normalize("NFKC").replace(/[\u064B-\u065F\u0670\u0640]/g,"").replace(/[أإآ]/g,"ا").replace(/ى/g,"ي");

  function parseId(link=""){try{const u=new URL(link);return u.searchParams.get("v")||""}catch{const m=link.match(/[?&]v=([^&]+)/);return m?m[1]:""}}
  function cat(title=""){
    const t=title.toLowerCase();
    if(/\b(ai|chatgpt|gemini|prompt|lovable|agent)\b/.test(t)||["الذكاء","ذكاء اصطناعي","برومبت","مساعد ذكي"].some(k=>t.includes(k)))return"ai";
    if(["cyber","security","الأمن السيبراني","اختراق","هاكر","حماية","phishing","تصيد"].some(k=>t.includes(k)))return"cyber";
    if(["بودكاست","podcast","حوار","لقاء"].some(k=>t.includes(k)))return"podcast";
    if(["canva","excel","sheets","docs","powerpoint","word","رقمي","تصميم","مواقع","website","google"].some(k=>t.includes(k)))return"digital";
    return"other";
  }
  function catLabel(c){return({ai:"AI",cyber:"CYBER",digital:"DIGITAL",podcast:"PODCAST",other:"RAQEEM"})[c]||"RAQEEM"}
  function fmtDate(v){try{return new Intl.DateTimeFormat("ar-JO",{year:"numeric",month:"long",day:"numeric"}).format(new Date(v))}catch{return"—"}}
  function esc(s=""){return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}
  async function fetchJSON(url,timeout=12000){const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{signal:c.signal,cache:"no-store"});if(!r.ok)throw Error(r.status);return await r.json()}finally{clearTimeout(t)}}
  async function fetchChannel(ch){
    const rss=encodeURIComponent("https://www.youtube.com/feeds/videos.xml?channel_id="+ch.id);
    const data=await fetchJSON("https://api.rss2json.com/v1/api.json?rss_url="+rss);
    if(data.status!=="ok"||!Array.isArray(data.items))throw Error("rss");
    return data.items.map(item=>{
      const id=parseId(item.link); if(!id)return null;
      return{videoId:id,title:String(item.title||"محتوى رقيم").trim(),pubDate:item.pubDate||new Date().toISOString(),channel:ch.name,category:cat(item.title||"")}
    }).filter(Boolean);
  }
  function dedupe(vs){const m=new Map();vs.forEach(v=>{if(v&&!m.has(v.videoId))m.set(v.videoId,v)});return[...m.values()].sort((a,b)=>new Date(b.pubDate)-new Date(a.pubDate))}
  function readCache(){try{return JSON.parse(localStorage.getItem(CACHE_KEY)||"null")}catch{return null}}
  function writeCache(v){try{localStorage.setItem(CACHE_KEY,JSON.stringify({savedAt:Date.now(),videos:v}))}catch{}}
  async function initAcademy(force=false){
    if(academyLoading) return;
    academyLoading=true;academyReady=true;refreshContent.disabled=true;
    academyNotice.hidden=true;
    state.innerHTML='<div><div class="spinner" aria-hidden="true"></div><div class="state-title">جاري جلب محتوى رقيم</div><div class="state-copy">لحظات ونرتّب لك أحدث الفيديوهات.</div></div>';
    state.classList.remove("hidden");content.classList.add("hidden");
    const cache=readCache(),fresh=cache&&Date.now()-cache.savedAt<CACHE_AGE;
    try{
      if(!force&&fresh&&Array.isArray(cache.videos)&&cache.videos.length){allVideos=dedupe(cache.videos);mount();return;}
      const rs=await Promise.allSettled(CHANNELS.map(fetchChannel));
      const successful=rs.filter(r=>r.status==="fulfilled");
      if(!successful.length) throw Error("unavailable");
      const fetched=successful.flatMap(r=>r.value);
      allVideos=dedupe(fetched);
      if(!allVideos.length){
        state.innerHTML='<div><div class="state-title">لا يوجد محتوى متاح الآن</div><div class="state-copy">لم تُرجع القنوات فيديوهات حاليًا. جرّب التحديث لاحقًا.</div><button class="btn btn-ghost" id="retry" style="margin-top:15px">إعادة المحاولة</button></div>';
        document.getElementById("retry").onclick=()=>initAcademy(true);
        return;
      }
      if(successful.length===CHANNELS.length)writeCache(allVideos);
      mount();
      if(successful.length<CHANNELS.length){academyNotice.textContent="نعرض المحتوى المتاح من إحدى القناتين. يمكنك تحديث المحتوى لإعادة محاولة الاتصال بالقناة الأخرى.";academyNotice.hidden=false;}
    }catch{
      if(Array.isArray(cache?.videos)&&cache.videos.length){
        allVideos=dedupe(cache.videos);mount();
        academyNotice.textContent="تعذّر الاتصال الآن؛ نعرض آخر محتوى محفوظ على هذا الجهاز.";academyNotice.hidden=false;
      }else{
        state.innerHTML='<div><div class="state-title">تعذّر جلب المحتوى</div><div class="state-copy">تحقق من اتصال الإنترنت وأعد المحاولة.</div><button class="btn btn-ghost" id="retry" style="margin-top:15px">إعادة المحاولة</button></div>';
        document.getElementById("retry").onclick=()=>initAcademy(true);
      }
    }finally{academyLoading=false;refreshContent.disabled=false;}
  }
  function mount(){
    state.classList.add("hidden");content.classList.remove("hidden");
    const f=allVideos[0];
    const fi=document.getElementById("featuredImage");fi.src="https://img.youtube.com/vi/"+f.videoId+"/maxresdefault.jpg";fi.onerror=function(){this.onerror=null;this.src="https://img.youtube.com/vi/"+f.videoId+"/hqdefault.jpg"};
    fi.alt=f.title;document.getElementById("featuredTitle").textContent=f.title;document.getElementById("featuredChannel").textContent=f.channel;document.getElementById("featuredDate").textContent=fmtDate(f.pubDate);document.getElementById("contentCount").textContent=allVideos.length.toLocaleString("en-US");
    document.getElementById("featuredPlay").onclick=()=>openPlayer(f);document.getElementById("featuredShare").onclick=()=>share(f);
    category="all";visible=PAGE;search.value="";chips.querySelectorAll(".chip").forEach(c=>{c.classList.toggle("active",c.dataset.category==="all");c.setAttribute("aria-pressed",String(c.dataset.category==="all"));});apply();
  }
  function apply(){
    const term=normalized(search.value.trim());
    filteredVideos=allVideos.filter(v=>(category==="all"||v.category===category)&&(!term||normalized(v.title).includes(term)||normalized(v.channel).includes(term)));
    filteredVideos.sort((a,b)=>sortOrder.value==="title" ? a.title.localeCompare(b.title,"ar") : sortOrder.value==="oldest" ? new Date(a.pubDate)-new Date(b.pubDate) : new Date(b.pubDate)-new Date(a.pubDate));
    render();
  }
  function render(){
    const list=filteredVideos.slice(0,visible);document.getElementById("libraryCount").textContent=filteredVideos.length.toLocaleString("en-US")+" فيديو";
    if(!list.length){videoGrid.innerHTML="";noResults.classList.remove("hidden");loadMore.classList.add("hidden");return}
    noResults.classList.add("hidden");
    videoGrid.innerHTML=list.map(v=>`<article class="video-card" data-id="${esc(v.videoId)}" tabindex="0" role="button" aria-label="شاهد: ${esc(v.title)}" aria-haspopup="dialog"><div class="thumb"><img src="https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg" alt="${esc(v.title)}" loading="lazy" decoding="async" width="480" height="270"><span class="channel-tag">${esc(v.channel)}</span><span class="play">▶</span></div><div class="video-info"><div class="video-cat">${catLabel(v.category)}</div><h3 class="video-title">${esc(v.title)}</h3><div class="video-meta"><span>${fmtDate(v.pubDate)}</span><span>مجاني</span></div></div></article>`).join("");
    videoGrid.querySelectorAll(".video-card").forEach(card=>{
      const v=allVideos.find(x=>x.videoId===card.dataset.id);card.onclick=()=>openPlayer(v);card.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openPlayer(v)}};
    });
    loadMore.classList.toggle("hidden",visible>=filteredVideos.length);
  }
  search.addEventListener("input",()=>{visible=PAGE;apply()});
  sortOrder.addEventListener("change",()=>{visible=PAGE;apply();});
  refreshContent.addEventListener("click",()=>initAcademy(true));
  document.getElementById("resetFilters").addEventListener("click",()=>{
    search.value="";category="all";visible=PAGE;
    chips.querySelectorAll(".chip").forEach(c=>{c.classList.toggle("active",c.dataset.category==="all");c.setAttribute("aria-pressed",String(c.dataset.category==="all"));});
    apply();focusWithoutScroll(search);
  });
  function setLayout(layout){
    layout=layout==="list" ? "list" : "grid";
    videoGrid.dataset.layout=layout;
    document.querySelectorAll("[data-layout]").forEach(b=>{if(b.tagName==="BUTTON")b.setAttribute("aria-pressed",String(b.dataset.layout===layout));});
    try{localStorage.setItem("raqeem_content_layout",layout);}catch{}
  }
  document.querySelectorAll("button[data-layout]").forEach(b=>b.addEventListener("click",()=>setLayout(b.dataset.layout)));
  try{setLayout(localStorage.getItem("raqeem_content_layout"));}catch{setLayout("grid");}
  chips.addEventListener("click",e=>{const c=e.target.closest(".chip");if(!c)return;category=c.dataset.category;visible=PAGE;chips.querySelectorAll(".chip").forEach(x=>{x.classList.toggle("active",x===c);x.setAttribute("aria-pressed",String(x===c));});apply()});
  loadMore.onclick=()=>{visible+=PAGE;render()};
  document.querySelectorAll("[data-scroll]").forEach(b=>b.onclick=()=>document.getElementById(b.dataset.scroll)?.scrollIntoView({behavior:scrollBehavior()}));
  document.querySelectorAll("[data-focus-search]").forEach(b=>b.onclick=()=>{search.focus();search.scrollIntoView({behavior:scrollBehavior(),block:"center"})});

  function openPlayer(v){
    if(!v) return;
    playerPreviousFocus = document.activeElement;
    currentVideo=v;
    document.getElementById("playerYoutube").href="https://www.youtube.com/watch?v="+encodeURIComponent(v.videoId);
    document.getElementById("playerTitle").textContent=v.title;
    document.getElementById("playerChannel").textContent=v.channel;
    document.getElementById("playerDate").textContent=fmtDate(v.pubDate);
    iframe.src=`https://www.youtube.com/embed/${v.videoId}?autoplay=1&rel=0&modestbranding=1`;
    player.inert=false;
    player.setAttribute("aria-hidden","false");
    player.classList.add("open");
    syncModalState();
    focusWithoutScroll(document.getElementById("playerClose"));
  }
  function closePlayer(restoreFocus=true){
    if(!player.classList.contains("open")) return;
    iframe.src="";
    player.classList.remove("open");
    currentVideo=null;
    syncModalState();
    if(restoreFocus) focusWithoutScroll(playerPreviousFocus?.getClientRects().length ? playerPreviousFocus : document.getElementById("featuredPlay"));
    else if(player.contains(document.activeElement)) document.activeElement.blur();
    player.inert=true;
    player.setAttribute("aria-hidden","true");
  }
  document.getElementById("playerClose").onclick=()=>closePlayer();
  player.onclick=e=>{if(e.target===player)closePlayer();};
  async function share(v){const url="https://youtu.be/"+v.videoId;if(navigator.share){try{await navigator.share({title:v.title,text:"شاهد هذا المحتوى من منصة رقيم",url})}catch{}}else{try{await navigator.clipboard.writeText(url);alert("تم نسخ رابط الفيديو.")}catch{prompt("انسخ الرابط:",url)}}}
  document.getElementById("playerShare").onclick=()=>share(currentVideo);


  /* Scroll position feedback: event-driven, composited, never an idle loop. */
  const progress = document.querySelector(".scroll-progress");
  let progressFrame = 0;
  function updateProgress(){
    progressFrame = 0;
    const max = root.scrollHeight - innerHeight;
    const value = max > 0 ? Math.max(0,Math.min(1,scrollY/max)) : 0;
    progress.style.transform = `scaleX(${value})`;
  }
  function scheduleProgress(){
    if(!progressFrame) progressFrame=requestAnimationFrame(updateProgress);
  }
  addEventListener("scroll",scheduleProgress,{passive:true});
  addEventListener("resize",scheduleProgress,{passive:true});
  if("ResizeObserver" in window) new ResizeObserver(scheduleProgress).observe(body);
  updateProgress();

  /* Decorative video removed: photography is the primary storytelling medium. */
  function pauseHero(){}

  document.addEventListener("keydown",e=>{
    const overlay=player.classList.contains("open") ? player : menu.classList.contains("open") ? menu : null;
    if(e.key==="Tab" && overlay){
      const focusables=[...overlay.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),iframe,[tabindex]:not([tabindex="-1"])')].filter(el=>el.getClientRects().length);
      const first=focusables[0],last=focusables[focusables.length-1];
      if(first && (e.shiftKey && (document.activeElement===first || !overlay.contains(document.activeElement)))){e.preventDefault();focusWithoutScroll(last);}
      else if(last && (!e.shiftKey && (document.activeElement===last || !overlay.contains(document.activeElement)))){e.preventDefault();focusWithoutScroll(first);}
    }
    if(e.key==="Escape"){
      if(overlay===player)closePlayer();
      else if(overlay===menu)closeMenu();
      else if(!academyView.classList.contains("hidden"))closeAcademy();
    }
  });
  // Deep links run only after every dependency is initialized.
  // Configure the four real photographs in assets/gallery-config.js.
  document.querySelectorAll("[data-gallery]").forEach(card=>{
    const entry=window.RAQEEM_GALLERY?.[card.dataset.gallery];
    const img=card.querySelector("img"),placeholder=card.querySelector(".gallery-placeholder");
    if(!entry?.src) return;
    img.addEventListener("load",()=>{img.classList.add("is-loaded");placeholder.hidden=true;});
    img.addEventListener("error",()=>{img.hidden=true;img.classList.remove("is-loaded");placeholder.hidden=false;});
    img.alt=entry.alt||img.alt;
    img.hidden=false; // Keep lazy images in layout so loading can begin.
    img.src=entry.src;
  });
  if(location.hash==="#academy" || (!location.hash && body.dataset.startView==="academy")) openAcademy();
  body.classList.add("view-ready");
})();
