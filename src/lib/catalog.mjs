export function dateValue(date) {
  if (!date) return 0;
  return Date.parse(date.length === 7 ? `${date}-01` : date) || 0;
}
export function scoreMethod(method, stars = {}, now = Date.now()) {
  const age = Math.max(0, (now - dateValue(method.date)) / 86400000);
  const count = Math.max(0, ...method.code.filter(c => c.kind !== 'integration').map(c => stars[c.repo]?.count ?? 0));
  return method.importance * 20 + (method.status === 'verified' ? 12 : 0)
    + Math.max(0, 15 * (1 - age / 180)) + Math.min(5, Math.log10(count + 1));
}
export function recommend(methods, stars = {}, limit = 6, now = Date.now()) {
  const ranked = [...methods].sort((a,b) => Number(b.pinned)-Number(a.pinned) || scoreMethod(b,stars,now)-scoreMethod(a,stars,now) || a.id.localeCompare(b.id));
  const selected = ranked.filter(m => m.pinned).slice(0,limit);
  const categories = new Set(selected.map(m => m.category));
  for (const method of ranked) {
    if (selected.length >= limit) break;
    if (!categories.has(method.category)) { selected.push(method); categories.add(method.category); }
  }
  for (const method of ranked) {
    if (selected.length >= limit) break;
    if (!selected.includes(method)) selected.push(method);
  }
  return selected;
}
export function filterMethods(methods, query, category = 'all', codeOnly = false) {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return methods.filter(m => (category === 'all' || m.category === category)
    && (!codeOnly || m.code.some(c => !['unavailable', 'placeholder'].includes(c.availability)))
    && words.every(w => [m.name,m.title,m.summary,m.problem,m.solution,...m.tags].join(' ').toLocaleLowerCase().includes(w)));
}
export function todayInShanghai(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
export function chooseBrief(briefs, today = todayInShanghai()) {
  return [...briefs].filter(b => b.date <= today).sort((a,b) => b.date.localeCompare(a.date))[0] ?? null;
}
