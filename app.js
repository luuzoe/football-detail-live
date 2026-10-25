const LEAGUES9 = [
  {id:'eng.1', my:'ပရီးမီးယားလိဂ်', en:'Premier League'},
  {id:'esp.1', my:'လာလီဂါ', en:'La Liga'},
  {id:'ita.1', my:'စီးရီးအေ', en:'Serie A'},
  {id:'ger.1', my:'ဘွန်ဒက်စ်လီဂါ', en:'Bundesliga'},
  {id:'fra.1', my:'လီဂူး ၁', en:'Ligue 1'},
  {id:'ned.1', my:'အီရီဒီဗီစီ', en:'Eredivisie'},
  {id:'por.1', my:'ပေါ်တူဂီလိဂ်', en:'Primeira Liga'},
  {id:'uefa.champions', my:'ချန်ပီယံလိဂ်', en:'Champions League'},
  {id:'uefa.europa', my:'ယူရိုပါလိဂ်', en:'Europa League'},
];
const LEAGUES = [{id:'all', my:'⭐ အားလုံး', en:'All'}].concat(LEAGUES9);
const STATS = [
  ['possessionPct','ဘောလုံးပိုင်ဆိုင်မှု'],
  ['totalShots','ကန်ချက် စုစုပေါင်း'],
  ['shotsOnTarget','ဂိုးပေါက်တည့် ကန်ချက်'],
  ['wonCorners','ထောင့်ကန်ဘော'],
  ['foulsCommitted','ပြစ်ဒဏ်ကျူးလွန်မှု'],
  ['saves','ဂိုးသမား ကယ်တင်မှု'],
  ['totalPasses','ဘောလုံးပေးပို့မှု'],
  ['passPct','ပေးပို့မှု မှန်ကန်နှုန်း'],
  ['totalTackles','ဖျက်ထုတ်မှု'],
  ['offsides','လူကျွံဘော'],
  ['yellowCards','အဝါကတ်'],
];
const state = {league:'all', day:0, tab:'matches', favOnly:false, events:[], detail:null, team:null, q:'', stale:false};
let favs = [];
try { favs = JSON.parse(localStorage.getItem('fdl-favs') || '[]'); } catch(e) { favs = []; }
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const logo = t => (t && (t.logo || (t.logos && t.logos[0] && t.logos[0].href))) || '';
const teamName = t => (t && (t.displayName || t.name)) || '';
const lgName = id => { const l = LEAGUES.find(x => x.id === id); return l ? l.my : id; };

function yangonDate(offset){
  const d = new Date(Date.now() + offset * 86400000);
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Yangon', year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(d);
  const g = {}; parts.forEach(p => g[p.type] = p.value);
  return g.year + g.month + g.day;
}
function yangonLabel(offset){
  const d = new Date(Date.now() + offset * 86400000);
  return new Intl.DateTimeFormat('my', {timeZone:'Asia/Yangon', weekday:'short', day:'numeric', month:'short'}).format(d);
}
function myTime(iso){
  try { return new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Yangon', hour:'2-digit', minute:'2-digit', hour12:false}).format(new Date(iso)); }
  catch(e){ return ''; }
}
function myDate(iso){
  try { return new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Yangon', day:'2-digit', month:'short'}).format(new Date(iso)); }
  catch(e){ return ''; }
}
async function fetchTimeout(url, ms){
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try { const r = await fetch(url, {signal: c.signal}); if (!r.ok) throw new Error('fetch ' + r.status); return r.json(); }
  finally { clearTimeout(t); }
}
async function getJSON(url){
  try { return await fetchTimeout(url, 12000); }
  catch(e) { return await fetchTimeout(url, 12000); }
}
function cacheKey(lg, day){ return 'fdl-cache-v3-' + lg + '-' + yangonDate(day); }
function saveCache(lg, day, events){ try { localStorage.setItem(cacheKey(lg, day), JSON.stringify({t: Date.now(), events: events})); } catch(e) {} }
function readCache(lg, day){ try { const v = JSON.parse(localStorage.getItem(cacheKey(lg, day)) || 'null'); return v && v.events ? v.events : null; } catch(e) { return null; } }

function renderLeagues(){
  $('leagues').innerHTML = LEAGUES.map(l =>
    '<button class="' + (l.id === state.league ? 'active' : '') + '" onclick="pickLeague(\'' + l.id + '\')">' + esc(l.my) + '</button>').join('');
}
function renderDates(){
  const labels = {'-1':'မနေ့က', '0':'ဒီနေ့', '1':'မနက်ဖြန်'};
  $('dates').innerHTML = [-1,0,1,2,3,4,5].map(o =>
    '<button class="' + (o === state.day ? 'active' : '') + '" onclick="pickDay(' + o + ')">' + (labels[o] || '') + '<br><small>' + esc(yangonLabel(o)) + '</small></button>').join('');
}
function pickLeague(id){ state.league = id; state.detail = null; state.team = null; renderLeagues(); load(); }
function pickDay(o){ state.day = o; state.detail = null; state.team = null; renderDates(); load(); }
function setTab(t){
  state.tab = t; state.detail = null; state.team = null;
  const map = {matches:'navMatches', standings:'navStandings', scorers:'navScorers', news:'navNews'};
  Object.keys(map).forEach(k => { $(map[k]).className = 'navbtn' + (k === t ? ' active' : ''); });
  load();
}
function toggleFavOnly(){
  state.favOnly = !state.favOnly;
  $('favBtn').className = 'favbtn' + (state.favOnly ? ' on' : '');
  if (state.tab === 'matches') renderMatches(); else load();
}
function toggleFav(id, ev){
  if (ev) ev.stopPropagation();
  const i = favs.indexOf(String(id));
  if (i >= 0) favs.splice(i, 1); else favs.push(String(id));
  try { localStorage.setItem('fdl-favs', JSON.stringify(favs)); } catch(e) {}
  renderMatches();
}
function isFav(id){ return favs.indexOf(String(id)) >= 0; }
function starBtn(id){
  return '<button class="star ' + (isFav(id) ? '' : 'off') + '" onclick="toggleFav(\'' + id + '\',event)" title="အကြိုက်ဆုံးမှတ်ပါ">' + (isFav(id) ? '★' : '☆') + '</button>';
}
function effLeague(){ return state.league === 'all' ? 'eng.1' : state.league; }

async function load(){
  if (state.detail) { renderDetail(); return; }
  if (state.team) { renderTeam(); return; }
  if (state.tab === 'standings') return loadStandings();
  if (state.tab === 'scorers') return loadScorers();
  if (state.tab === 'news') return loadNews();
  return loadMatches();
}
async function loadMatches(){
  $('app').innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel"></div>';
  state.stale = false;
  if (state.league === 'all'){
    const results = await Promise.allSettled(LEAGUES9.map(async lg => {
      try {
        const d = await getJSON('https://site.api.espn.com/apis/site/v2/sports/soccer/' + lg.id + '/scoreboard?dates=' + yangonDate(state.day));
        const evs = d.events || [];
        saveCache(lg.id, state.day, evs);
        return {lg: lg.id, events: evs};
      } catch(e) {
        const cached = readCache(lg.id, state.day);
        if (cached) { state.stale = true; return {lg: lg.id, events: cached}; }
        return {lg: lg.id, events: []};
      }
    }));
    state.events = [];
    results.forEach(r => { if (r.status === 'fulfilled') (r.value.events || []).forEach(ev => { ev._lg = r.value.lg; state.events.push(ev); }); });
    renderMatches();
    return;
  }
  try {
    const d = await getJSON('https://site.api.espn.com/apis/site/v2/sports/soccer/' + state.league + '/scoreboard?dates=' + yangonDate(state.day));
    state.events = d.events || [];
    state.events.forEach(ev => { ev._lg = state.league; });
    saveCache(state.league, state.day, state.events);
    renderMatches();
  } catch(e) {
    const cached = readCache(state.league, state.day);
    if (cached){ state.stale = true; state.events = cached; state.events.forEach(ev => { ev._lg = state.league; }); renderMatches(); }
    else $('app').innerHTML = '<p class="empty">ဒေတာ ဆွဲမရပါ။ အင်တာနက်နှေးနေတာ ဖြစ်နိုင်ပါတယ်။ ပြန်ကြိုးစားပါ။</p>';
  }
}

function compOf(ev){ return ev.competitions && ev.competitions[0]; }
function teamsOf(ev){
  const c = compOf(ev); if (!c) return [null, null];
  const home = c.competitors.find(x => x.homeAway === 'home') || c.competitors[0];
  const away = c.competitors.find(x => x.homeAway === 'away') || c.competitors[1];
  return [home, away];
}
function statusOf(ev){
  const s = ev.status || {};
  const t = s.type || {};
  return {state: t.state || s.state || 'pre', short: t.shortDetail || t.detail || '', clock: (s.displayClock || '')};
}
function sortedEvents(list){
  const st = ev => statusOf(ev).state;
  return list.slice().sort((a, b) => {
    const rank = x => st(x) === 'in' ? 0 : (st(x) === 'pre' ? 1 : 2);
    return rank(a) - rank(b);
  });
}
function matchCard(ev){
  const [home, away] = teamsOf(ev);
  const st = statusOf(ev);
  const timeTxt = st.state === 'in' ? '<span class="livepill">LIVE ' + esc(st.clock || '') + '</span>' : (st.state === 'post' ? esc(st.short || 'FT') : esc(myTime(ev.date)));
  const hScore = home ? home.score : ''; const aScore = away ? away.score : '';
  const hLoser = (st.state === 'post' && hScore !== '' && aScore !== '' && Number(hScore) < Number(aScore)) ? ' loser' : '';
  const aLoser = (st.state === 'post' && aScore !== '' && hScore !== '' && Number(aScore) < Number(hScore)) ? ' loser' : '';
  const lg = ev._lg || state.league;
  return '<button class="match" onclick="openDetail(\'' + ev.id + '\',\'' + lg + '\')">' +
    '<span class="time ' + (st.state === 'in' ? 'live' : '') + '">' + timeTxt + '</span>' +
    '<span class="teams">' +
      '<span class="teamrow' + hLoser + '"><img loading="lazy" src="' + esc(logo(home.team)) + '" alt=""><span class="nm">' + esc(teamName(home.team)) + '</span><span class="sc">' + esc(hScore) + '</span></span>' +
      '<span class="teamrow' + aLoser + '"><img loading="lazy" src="' + esc(logo(away.team)) + '" alt=""><span class="nm">' + esc(teamName(away.team)) + '</span><span class="sc">' + esc(aScore) + '</span></span>' +
    '</span>' + starBtn(home.team.id) + '</button>';
}
function filterEvents(evs){
  const q = state.q.trim().toLowerCase();
  let out = evs.slice();
  if (q) out = out.filter(ev => {
    const [h, a] = teamsOf(ev);
    return (h && teamName(h.team).toLowerCase().includes(q)) || (a && teamName(a.team).toLowerCase().includes(q));
  });
  if (state.favOnly) out = out.filter(ev => {
    const [h, a] = teamsOf(ev);
    return (h && isFav(h.team.id)) || (a && isFav(a.team.id));
  });
  return out;
}
function renderMatches(){
  const evs = filterEvents(state.events);
  if (!evs.length){
    $('app').innerHTML = '<p class="empty">' + (state.favOnly ? 'အကြိုက်ဆုံး အသင်း မှတ်ထားတာ မရှိသေးပါ။ ကြယ်လေးကို နှိပ်ပြီး မှတ်ပါ။' : 'ဒီရက်အတွက် ပွဲစဉ် မရှိပါ။') + '</p>';
    return;
  }
  let html = '';
  if (state.stale) html += '<div class="stalenote">⚠️ အင်တာနက်နှေးလို့ နောက်ဆုံးသိမ်းထားတဲ့ ဒေတာကို ပြနေပါတယ်။ အင်တာနက်ကောင်းရင် ပြန်ဖွင့်ပါ။</div>';
  if (state.league === 'all'){
    html += '<p class="section">အားလုံးလိဂ် • ' + esc(yangonLabel(state.day)) + ' • ' + evs.length + ' ပွဲ</p>';
    LEAGUES9.forEach(lg => {
      const list = sortedEvents(evs.filter(ev => ev._lg === lg.id));
      if (!list.length) return;
      html += '<p class="section">' + esc(lg.my) + ' • ' + list.length + ' ပွဲ</p>' + list.map(matchCard).join('');
    });
  } else {
    const lg = LEAGUES.find(l => l.id === state.league);
    html += '<p class="section">' + esc(lg.my) + ' • ' + esc(yangonLabel(state.day)) + ' • ' + evs.length + ' ပွဲ</p>';
    const groups = {in:[], pre:[], post:[]};
    evs.forEach(ev => { const st = statusOf(ev).state; groups[st === 'in' ? 'in' : (st === 'post' ? 'post' : 'pre')].push(ev); });
    if (groups.in.length) html += '<p class="section"><span style="color:#d92d20">●</span> တိုက်ရိုက် ကစားနေဆဲ</p>' + groups.in.map(matchCard).join('');
    if (groups.pre.length) html += '<p class="section">⏰ မကစားရသေးသော ပွဲများ</p>' + groups.pre.map(matchCard).join('');
    if (groups.post.length) html += '<p class="section">✅ ပြီးဆုံးသွားသော ပွဲများ</p>' + groups.post.map(matchCard).join('');
  }
  $('app').innerHTML = html;
}

async function openDetail(eventId, lg){
  const league = lg && lg !== 'all' ? lg : effLeague();
  state.detail = {id: eventId, league: league, data: null};
  $('app').innerHTML = '<div class="skel"></div><div class="skel"></div>';
  try {
    let d = null;
    try { d = await getJSON('https://site.api.espn.com/apis/site/v2/sports/soccer/' + league + '/summary?event=' + encodeURIComponent(eventId)); }
    catch(e) { d = await getJSON('https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=' + encodeURIComponent(eventId)); }
    state.detail.data = d;
    renderDetail();
  } catch(e) {
    $('app').innerHTML = '<p class="empty">အသေးစိတ် ဆွဲမရပါ။ အင်တာနက်စစ်ပြီး ပြန်ကြိုးစားပါ။</p><button class="back" onclick="backToList()">← ပြန်သွားပါ</button>';
  }
}
function backToList(){ state.detail = null; state.team = null; load(); }
function statMap(team){ const m = {}; (team.statistics || []).forEach(s => { m[s.name] = s; }); return m; }
function statVal(m, name){
  const s = m[name]; if (!s) return null;
  const v = parseFloat(s.displayValue);
  if ((name === 'passPct' || name === 'shotPct') && !isNaN(v) && v <= 1) return Math.round(v * 100);
  return isNaN(v) ? s.displayValue : v;
}
function resultBadge(r){
  const c = r === 'W' ? '#0b9e5f' : (r === 'L' ? '#d92d20' : '#8fa3ad');
  return '<span style="display:inline-block;min-width:22px;text-align:center;background:' + c + ';color:#fff;font-weight:800;border-radius:5px;padding:1px 3px;font-size:12px">' + esc(r) + '</span>';
}
function renderDetail(){
  const d = state.detail.data;
  if (!d) return;
  const h = d.header || {};
  const comp = (h.competitions && h.competitions[0]) || {};
  const competitors = comp.competitors || [];
  const home = competitors.find(x => x.homeAway === 'home') || competitors[0] || {};
  const away = competitors.find(x => x.homeAway === 'away') || competitors[1] || {};
  const st = (comp.status && comp.status.type) || {};
  const statusTxt = st.shortDetail || st.detail || '';
  const venue = d.gameInfo && d.gameInfo.venue ? d.gameInfo.venue.fullName + (d.gameInfo.venue.address ? ' • ' + d.gameInfo.venue.address.city + ', ' + d.gameInfo.venue.address.country : '') : '';
  const att = d.gameInfo && d.gameInfo.attendance ? ' • ပရိသတ် ' + Number(d.gameInfo.attendance).toLocaleString() + ' ဦး' : '';
  const broadcasts = (d.broadcasts || []).map(b => b.names && b.names.join(', ')).filter(Boolean).join(' • ');
  const bsTeams = (d.boxscore && d.boxscore.teams) || [];
  const bsHome = bsTeams.find(t => t.homeAway === 'home') || bsTeams[0];
  const bsAway = bsTeams.find(t => t.homeAway === 'away') || bsTeams[1];
  let statsHtml = '';
  if (bsHome && bsAway){
    const mh = statMap(bsHome), ma = statMap(bsAway);
    statsHtml = STATS.map(([name, label]) => {
      const hv = statVal(mh, name), av = statVal(ma, name);
      if (hv == null && av == null) return '';
      const hn = Number(hv) || 0, an = Number(av) || 0;
      const hpct = (hn + an) === 0 ? 50 : Math.round(hn / (hn + an) * 100);
      const suffix = (name === 'possessionPct' || name === 'passPct') ? '%' : '';
      return '<div class="statrow"><div class="label"><b>' + esc(hv == null ? '-' : hv) + suffix + '</b><span>' + esc(label) + '</span><b>' + esc(av == null ? '-' : av) + suffix + '</b></div>' +
        '<div class="bar"><div class="h" style="width:' + hpct + '%"></div><div class="a" style="width:' + (100 - hpct) + '%"></div></div></div>';
    }).join('');
    if (!statsHtml) statsHtml = '<p class="empty">ဒီပွဲအတွက် stats မထုတ်ပြန်သေးပါ။</p>';
  } else {
    statsHtml = '<p class="empty">ဒီပွဲအတွက် stats မထုတ်ပြန်သေးပါ။</p>';
  }
  const keepTypes = ['Goal', 'Yellow Card', 'Red Card', 'Substitution', 'Penalty'];
  const events = (d.keyEvents || []).filter(k => {
    const t = (k.type && k.type.text) || '';
    return keepTypes.some(p => t.indexOf(p) === 0 || t === p);
  });
  let tlHtml = '';
  if (events.length){
    tlHtml = '<ul class="timeline">' + events.map(k => {
      const t = (k.type && k.type.text) || '';
      const icon = t.indexOf('Goal') === 0 ? '⚽' : (t.indexOf('Red') === 0 ? '🟥' : (t.indexOf('Yellow') === 0 ? '🟨' : '🔄'));
      const txt = k.shortText || k.text || t;
      return '<li><span class="min">' + esc((k.clock && k.clock.displayValue) || '') + '\'</span><span>' + icon + ' ' + esc(txt) + '</span></li>';
    }).join('') + '</ul>';
  } else {
    tlHtml = '<p class="empty">ပွဲ မစသေးလို့ timeline မရှိသေးပါ။</p>';
  }
  let commHtml = '';
  const comm = (d.commentary || []).filter(c => c.text).slice(-40).reverse();
  if (comm.length){
    commHtml = '<h3>💬 Live စာသား Commentary</h3><ul class="timeline">' + comm.map(c => {
      const min = c.time && c.time.displayValue ? c.time.displayValue : '';
      return '<li><span class="min">' + esc(min) + '</span><span>' + esc(c.text) + '</span></li>';
    }).join('') + '</ul>';
  }
  let lineupHtml = '';
  (d.rosters || []).forEach(r => {
    const starters = (r.roster || []).filter(p => p.starter);
    const subs = (r.roster || []).filter(p => !p.starter);
    const pLine = p => {
      const a = p.athlete || {};
      const gs = (p.stats || []).find(s => s.name === 'totalGoals');
      const as = (p.stats || []).find(s => s.name === 'goalAssists');
      const extra = [];
      if (gs && Number(gs.displayValue) > 0) extra.push('⚽' + gs.displayValue);
      if (as && Number(as.displayValue) > 0) extra.push('🅰' + as.displayValue);
      return '<li>' + esc(p.jersey ? p.jersey + '. ' : '') + esc(a.displayName || a.fullName || '') + ' <small>(' + esc((p.position && p.position.abbreviation) || '') + ')</small> ' + extra.join(' ') + '</li>';
    };
    lineupHtml += '<div><h4>' + esc(teamName(r.team)) + ' <small>• ' + esc(r.formation || '') + '</small></h4>' +
      '<p style="font-size:13px;color:#5b6b75">ပွဲထွက် ၁၁ ဦး</p><ul>' + starters.map(pLine).join('') + '</ul>' +
      '<p style="font-size:13px;color:#5b6b75;margin-top:12px">အရန်ခုံ</p><ul>' + subs.map(p => '<li class="sub">' + esc((p.athlete && p.athlete.displayName) || '') + '</li>').join('') + '</ul></div>';
  });
  if (!lineupHtml) lineupHtml = '<p class="empty">လူစာရင်း မထုတ်ပြန်သေးပါ။</p>';
  let h2hHtml = '';
  const h2h = (d.seasonseries || []).find(s => s.type === 'head-to-head');
  if (h2h){
    h2hHtml = '<h3>⚔️ ထိပ်တိုက်တွေ့ဆုံမှု (H2H)</h3><p style="font-size:14px">' + esc(h2h.summary || h2h.seriesScore || '') + ' • ' + esc(h2h.shortSummary || 'နောက်ဆုံးတွေ့ဆုံမှုများ') + '</p>';
    if (h2h.events && h2h.events.length){
      h2hHtml += '<ul class="timeline">' + h2h.events.slice(0, 5).map(e => {
        const comps = e.competitors || [];
        const hh = comps.find(x => x.homeAway === 'home'); const aa = comps.find(x => x.homeAway === 'away');
        return '<li><span class="min">' + esc(myDate(e.date)) + '</span><span>' + esc(teamName(hh && hh.team)) + ' ' + esc(hh && hh.score != null ? hh.score : '') + ' - ' + esc(aa && aa.score != null ? aa.score : '') + ' ' + esc(teamName(aa && aa.team)) + '</span></li>';
      }).join('') + '</ul>';
    }
  }
  let formHtml = '<h3>📈 နောက်ဆုံး ၅ ပွဲ Form</h3>';
  (d.lastFiveGames || []).forEach(x => {
    formHtml += '<p style="font-size:14px;font-weight:700;margin:10px 0 4px">' + esc(teamName(x.team)) + '</p>';
    formHtml += '<p style="margin:0 0 8px">' + (x.events || []).map(ev => resultBadge(ev.gameResult || '?')).join(' ') +
      ' <span style="color:#5b6b75;font-size:13px">' + (x.events || []).map(ev => esc(ev.opponent ? ev.opponent.displayName : '') + ' ' + esc(ev.score || '')).join(' • ') + '</span></p>';
  });
  const dl = state.detail.league;
  $('app').innerHTML = '<div class="detail"><button class="back" onclick="backToList()">← ပွဲစဉ်များ ပြန်သွားပါ</button>' +
    '<div class="scorehead"><div class="lg">' + esc(lgName(dl)) + ' • ' + esc(statusTxt) + '</div>' +
    '<div class="teams2"><div onclick="openTeam(\'' + (home.team && home.team.id) + '\',\'' + dl + '\')" style="cursor:pointer"><img loading="lazy" src="' + esc(logo(home.team)) + '" alt=""><div class="tname">' + esc(teamName(home.team)) + '</div><small style="color:#0b9e5f">အသင်းစာမျက်နှာ →</small></div>' +
    '<div class="big">' + esc(home.score == null ? '-' : home.score) + ' - ' + esc(away.score == null ? '-' : away.score) + '</div>' +
    '<div onclick="openTeam(\'' + (away.team && away.team.id) + '\',\'' + dl + '\')" style="cursor:pointer"><img loading="lazy" src="' + esc(logo(away.team)) + '" alt=""><div class="tname">' + esc(teamName(away.team)) + '</div><small style="color:#0b9e5f">အသင်းစာမျက်နှာ →</small></div></div>' +
    '<div class="meta">' + esc(venue) + esc(att) + (broadcasts ? '<br>📺 ' + esc(broadcasts) : '') + '</div></div>' +
    '<h3>⏱️ ပွဲဖြစ်စဉ် (Timeline)</h3>' + tlHtml + commHtml +
    '<h3>📊 ပွဲအတွင်း Stats နှိုင်းယှဉ်</h3><p style="font-size:13px;color:#5b6b75;text-align:center">' + esc(teamName(home.team)) + ' (အစိမ်း) vs ' + esc(teamName(away.team)) + ' (မီးခိုး)</p>' + statsHtml +
    '<h3>👥 လူစာရင်း (Lineups)</h3><div class="lineup">' + lineupHtml + '</div>' +
    h2hHtml + formHtml + '</div>';
}

async function loadScorers(){
  const lg = effLeague();
  $('app').innerHTML = '<div class="skel"></div><div class="skel"></div>';
  try {
    const d = await getJSON('https://site.api.espn.com/apis/site/v2/sports/soccer/' + lg + '/statistics');
    const renderList = (statName, title, valLabel) => {
      const s = (d.stats || []).find(x => x.name === statName);
      if (!s || !s.leaders.length) return '<p class="empty">' + title + ' မရပါ။</p>';
      let h = '<p class="section">' + title + '</p><div class="detail"><table><tr><th class="num">#</th><th>ကစားသမား</th><th>အသင်း</th><th class="num">' + valLabel + '</th></tr>';
      s.leaders.slice(0, 20).forEach((l, i) => {
        const a = l.athlete || {}; const t = a.team || {};
        h += '<tr><td class="num">' + (i + 1) + '</td><td>' + esc(a.displayName || '') + '</td><td class="teamcell"><img loading="lazy" src="' + esc(logo(t)) + '" alt="">' + esc(teamName(t)) + '</td><td class="num"><b>' + esc(l.value) + '</b></td></tr>';
      });
      return h + '</table></div>';
    };
    $('app').innerHTML = '<p class="section">' + esc(lgName(lg)) + ' • ရာသီစာရင်း</p>' +
      renderList('goalsLeaders', '⚽ ဂိုးသွင်းအများဆုံး (အယောက် ၂၀)', 'ဂိုး') +
      renderList('assistsLeaders', '🅰 ဂိုးဖန်တီးအများဆုံး (အယောက် ၂၀)', 'ဖန်တီးမှု');
  } catch(e) {
    $('app').innerHTML = '<p class="empty">ဂိုးသွင်းစာရင်း ဆွဲမရပါ။ အင်တာနက်စစ်ပြီး ပြန်ကြိုးစားပါ။</p>';
  }
}
async function loadNews(){
  const lg = effLeague();
  $('app').innerHTML = '<div class="skel"></div><div class="skel"></div>';
  try {
    const d = await getJSON('https://site.api.espn.com/apis/site/v2/sports/soccer/' + lg + '/news?limit=20');
    const arts = d.articles || [];
    if (!arts.length){ $('app').innerHTML = '<p class="empty">သတင်း မရှိပါ။</p>'; return; }
    $('app').innerHTML = '<p class="section">' + esc(lgName(lg)) + ' • သတင်းများ (ESPN, အင်္ဂလိပ်လို)</p>' + arts.map(a => {
      const img = (a.images && a.images[0] && a.images[0].url) || '';
      const href = (a.links && a.links.web && a.links.web.href) || '#';
      return '<a class="match" style="text-decoration:none" href="' + esc(href) + '" target="_blank" rel="noopener">' +
        (img ? '<img loading="lazy" src="' + esc(img) + '" alt="" style="width:72px;height:48px;object-fit:cover;border-radius:8px;flex-shrink:0">' : '') +
        '<span class="teams"><span style="font-weight:700;line-height:1.4">' + esc(a.headline || '') + '</span><br><small style="color:#5b6b75">' + esc(a.description || '') + '</small></span></a>';
    }).join('');
  } catch(e) {
    $('app').innerHTML = '<p class="empty">သတင်း ဆွဲမရပါ။ အင်တာနက်စစ်ပြီး ပြန်ကြိုးစားပါ။</p>';
  }
}
async function openTeam(teamId, lg){
  const league = lg && lg !== 'all' ? lg : effLeague();
  state.team = {id: String(teamId), league: league, info: null, sched: null};
  $('app').innerHTML = '<div class="skel"></div><div class="skel"></div>';
  try {
    const info = await getJSON('https://site.api.espn.com/apis/site/v2/sports/soccer/' + league + '/teams/' + encodeURIComponent(teamId)).catch(() => null);
    const sched = await getJSON('https://site.api.espn.com/apis/site/v2/sports/soccer/' + league + '/teams/' + encodeURIComponent(teamId) + '/schedule').catch(() => null);
    if (state.team) { state.team.info = info; state.team.sched = sched; }
    renderTeam();
  } catch(e) {
    $('app').innerHTML = '<p class="empty">အသင်းအချက်အလက် ဆွဲမရပါ။</p><button class="back" onclick="backToList()">← ပြန်သွားပါ</button>';
  }
}
function renderTeam(){
  const t = state.team; if (!t) return;
  const info = (t.info && t.info.team) || {};
  const rec = info.record && info.record.items && info.record.items[0];
  let recTxt = '';
  if (rec){
    const gm = {}; (rec.stats || []).forEach(s => { gm[s.name] = s.value; });
    recTxt = 'ပွဲ ' + (gm.gamesPlayed || '-') + ' • နိုင် ' + (gm.wins || '-') + ' • သရေ ' + (gm.ties || '-') + ' • ရှုံး ' + (gm.losses || '-') + ' • အမှတ် ' + (gm.points || '-') + ' • အဆင့် ' + (gm.rank || '-');
  }
  const evs = (t.sched && t.sched.events) || [];
  let schedHtml = '<p class="empty">နောက်ဆုံးပွဲများ မရပါ။</p>';
  if (evs.length){
    schedHtml = '<ul class="timeline">' + evs.slice(0, 10).map(e => {
      const c = e.competitions && e.competitions[0];
      const st = (c && c.status && c.status.type) || {};
      return '<li><span class="min">' + esc(myDate(e.date)) + '</span><span>' + esc(e.name || '') + ' — <b>' + esc(st.shortDetail || '') + '</b></span></li>';
    }).join('') + '</ul>';
  }
  $('app').innerHTML = '<div class="detail"><button class="back" onclick="backToList()">← ပြန်သွားပါ</button>' +
    '<div class="scorehead"><img loading="lazy" src="' + esc(logo(info)) + '" alt="" style="width:64px;height:64px;object-fit:contain"><div style="font-size:22px;font-weight:900;margin-top:6px">' + esc(teamName(info) || ('အသင်း ' + t.id)) + '</div>' +
    '<div class="meta">' + esc(recTxt) + (info.abbreviation ? '<br>ကုဒ်: ' + esc(info.abbreviation) : '') + '</div></div>' +
    '<h3>🕐 နောက်ဆုံးပွဲများ</h3>' + schedHtml + '</div>';
}
async function loadStandings(){
  const lg = effLeague();
  $('app').innerHTML = '<div class="skel"></div><div class="skel"></div>';
  try {
    const d = await getJSON('https://site.web.api.espn.com/apis/v2/sports/soccer/' + lg + '/standings');
    const entries = (((d.children || [])[0] || {}).standings || {}).entries || [];
    if (!entries.length){ $('app').innerHTML = '<p class="empty">အဆင့်ဇယား မရပါ။</p>'; return; }
    const get = (e, name) => { const s = (e.stats || []).find(x => x.name === name); return s ? s.displayValue : '-'; };
    let html = '<p class="section">' + esc(lgName(lg)) + ' • အဆင့်ဇယား</p><div class="detail"><table><tr><th class="num">#</th><th>အသင်း</th><th class="num">ပွဲ</th><th class="num">နိုင်</th><th class="num">သရေ</th><th class="num">ရှုံး</th><th class="num">ဂိုးကွာ</th><th class="num">အမှတ်</th></tr>';
    entries.forEach((e, i) => {
      const t = e.team || {};
      const hl = isFav(t.id) ? ' class="hl"' : '';
      html += '<tr' + hl + ' onclick="openTeam(\'' + t.id + '\',\'' + lg + '\')" style="cursor:pointer"><td class="num">' + (i + 1) + '</td><td class="teamcell"><img loading="lazy" src="' + esc(logo(t)) + '" alt="">' + esc(teamName(t)) + '</td>' +
        '<td class="num">' + esc(get(e, 'gamesPlayed')) + '</td><td class="num">' + esc(get(e, 'wins')) + '</td><td class="num">' + esc(get(e, 'ties')) + '</td><td class="num">' + esc(get(e, 'losses')) + '</td><td class="num">' + esc(get(e, 'pointDifferential')) + '</td><td class="num"><b>' + esc(get(e, 'points')) + '</b></td></tr>';
    });
    html += '</table></div>';
    $('app').innerHTML = html;
  } catch(e) {
    $('app').innerHTML = '<p class="empty">အဆင့်ဇယား ဆွဲမရပါ။ အင်တာနက်စစ်ပြီး ပြန်ကြိုးစားပါ။</p>';
  }
}

$('search').addEventListener('input', e => { state.q = e.target.value; if (state.tab === 'matches' && !state.detail && !state.team) renderMatches(); });
renderLeagues(); renderDates(); load();
setInterval(() => { if (state.tab === 'matches' && !state.detail && !state.team) loadMatches(); }, 60000);
