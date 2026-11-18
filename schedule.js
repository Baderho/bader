(() => {
  // Existing schedule administration publishes this GitHub-hosted JSON file.
  // Do not substitute local placeholder records for genuine published courses.
  const RAW_URL = 'https://raw.githubusercontent.com/Baderho/bader/main/courses.json';
  const list = document.getElementById('publicCoursesList');
  const safe = (value) => String(value ?? '').trim();
  const setState = (heading, body) => {
    list.replaceChildren();
    const state = document.createElement('div');
    state.className = 'course-state';
    const h = document.createElement('h3'); h.textContent = heading;
    const p = document.createElement('p'); p.textContent = body;
    const link = document.createElement('a'); link.href = 'mailto:raqeemimpact@gmail.com'; link.textContent = 'تواصل معنا للاستفسار ↗';
    state.append(h, p, link); list.append(state);
  };
  const addDetail = (parent, label, value) => {
    const row = document.createElement('div'); row.className = 'course-info';
    const k = document.createElement('strong'); k.textContent = label;
    const v = document.createElement('span'); v.textContent = value;
    row.append(k, v); parent.append(row);
  };
  const isValidExternal = (value) => {
    try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; }
    catch { return null; }
  };
  async function fetchCourses() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 14000);
    try {
      const response = await fetch(RAW_URL + '?v=' + Date.now(), {signal:controller.signal, cache:'no-store'});
      if (!response.ok) throw Error('Unable to fetch');
      const data = await response.json();
      if (!Array.isArray(data)) throw Error('Invalid schedule format');
      const courses = data.filter(c => c && safe(c.name) && safe(c.date) && safe(c.time) && safe(c.loc));
      list.replaceChildren();
      if (!courses.length) {setState('لا توجد دورات معلنة حاليًا','يمكنك متابعة صفحات رقيم للتعرف على الدورات الجديدة عند الإعلان عنها.');return;}
      for (const c of courses) {
        const card = document.createElement('article'); card.className = 'course-item';
        const h = document.createElement('h3'); h.textContent = safe(c.name); card.append(h);
        addDetail(card,'التاريخ',safe(c.date));addDetail(card,'الوقت',safe(c.time));addDetail(card,'المكان',safe(c.loc));
        const url = isValidExternal(c.wa);
        if (url) {const a = document.createElement('a'); a.className = 'course-cta'; a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = 'التسجيل والتفاصيل ↗';card.append(a);}
        list.append(card);
      }
    } catch (error) {setState('تعذّر تحميل المواعيد الآن','المواعيد غير متاحة مؤقتًا. يمكنك التواصل معنا مباشرة أو إعادة المحاولة لاحقًا.');}
    finally {clearTimeout(timeout);list.setAttribute('aria-busy','false');}
  }
  fetchCourses();
})();
