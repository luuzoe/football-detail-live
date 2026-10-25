const LEAGUES = [
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
const state = {league:'eng.1', day:0, tab:'matches', favOnly:false, events:[], detail:null, q:''};
let favs = [];
try { favs = JSON.parse(localStorage.getItem('fdl-favs') || '[]'); } catch(e) { favs = []; }
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const logo = t => (t && (t.logo || (t.logos && t.logos[0] && t.logos[0].href))) || '';
const teamName = t => (t && (t.displayName || t.name)) || '';

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
async function getJSON(url){
  const r = await fetch(url);
  if (!r.ok) throw new Error('fetch ' + r.status);
  return r.json();
}

function renderLeagues(){
  $('leagues').innerHTML = LEAGUES.map(l =>
    '<button class="' + (l.id === state.league ? 'active' : '') + '" onclick="pickLeague(\'' + l.id + '\')">' + esc(l.my) + '</button>').join('');
}
function renderDates(){
  const labels = {'-1':'မနေ့က', '0':'ဒီနေ့', '1':'မနက်ဖြန်'};
  $('dates').innerHTML = [-1,0,1].map(o =>
    '<button class="' + (o === state.day ? 'active' : '') + '" onclick="pickDay(' + o + ')">' + labels[o] + '<br><small>' + esc(yangonLabel(o)) + '</small></button>').join('');
}
function pickLeague(id){ state.league = id; state.detail = null; renderLeagues(); load(); }
function pickDay(o){ state.day = o; state.detail = null; renderDates(); load(); }
function setTab(t){
  state.tab = t; state.detail = null;
  $('tabMatches').className = 'tab' + (t === 'matches' ? ' active' : '');
  $('tabStandings').className = 'tab' + (t === 'standings' ? ' active' : '');
  load();
}
function toggleFavOnly(){
  state.favOnly = !state.favOnly;
  $('favBtn').className = 'tab fav' + (state.favOnly ? ' on' : '');
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

async function load(){
  if (state.detail) { renderDetail(); return; }
  if (state.tab === 'standings') return loadStandings();
  $('app').innerHTML = '<p class="loading">ပွဲစဉ်များ တင်နေသည်…</p>';
  try {
    const d = await getJSON('https://site.api.espn.com/apis/site/v2/sports/soccer/' + state.league + '/scoreboard?dates=' + yangonDate(state.day));
    state.events = d.events || [];
    renderMatches();
  } catch(e) {
    $('app').innerHTML = '<p class="empty">ဒေတာ ဆွဲမရပါ။ အင်တာနက် စစ်ပြီး ပြန်ကြိုးစားပါ။ (' + esc(e.message) + ')</p>';
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

function renderMatches(){
  const q = state.q.trim().toLowerCase();
  let evs = state.events.slice();
  if (q) evs = evs.filter(ev => {
    const [h, a] = teamsOf(ev);
    return (h && teamName(h.team).toLowerCase().includes(q)) || (a && teamName(a.team).toLowerCase().includes(q));
  });
  if (state.favOnly) evs = evs.filter(ev => {
    const [h, a] = teamsOf(ev);
    return (h && isFav(h.team.id)) || (a && isFav(a.team.id));
  });
  if (!evs.length){
    $('app').innerHTML = '<p class="empty">' + (state.favOnly ? 'အကြိုက်ဆုံး အသင်း မှတ်ထားတာ မရှိသေးပါ။ ကြယ်လေးကို နှိပ်ပြီး မှတ်ပါ။' : 'ဒီနေ့အတွက် ပွဲစဉ် မရှိပါ။') + '</p>';
    return;
  }
  const groups = {in:[], pre:[], post:[]};
  evs.forEach(ev => { const st = statusOf(ev).state; groups[st === 'in' ? 'in' : (st === 'post' ? 'post' : 'pre')].push(ev); });
  const lg = LEAGUES.find(l => l.id === state.league);
  let html = '<p class="section">' + esc(lg.my) + ' • ' + esc(yangonLabel(state.day)) + ' • ' + evs.length + ' ပွဲ</p>';
  const renderGroup = (title, list) => {
    if (!list.length) return '';
    let h = '<p class="section">' + title + '</p>';
    h += list.map(ev => {
      const c = compOf(ev); const [home, away] = teamsOf(ev);
      const st = statusOf(ev);
      const timeTxt = st.state === 'in' ? ('<span class="live-dot">● LIVE</span> ' + esc(st.clock || st.short)) : (st.state === 'post' ? esc(st.short || 'FT') : esc(myTime(ev.date)));
      const hScore = home ? home.score : ''; const aScore = away ? away.score : '';
      const hLoser = (st.state === 'post' && hScore !== '' && aScore !== '' && Number(hScore) < Number(aScore)) ? ' loser' : '';
      const aLoser = (st.state === 'post' && aScore !== '' && hScore !== '' && Number(aScore) < Number(hScore)) ? ' loser' : '';
      return '<button class="match" onclick="openDetail(\'' + ev.id + '\')">' +
        '<span class="time ' + (st.state === 'in' ? 'live' : '') + '">' + timeTxt + '</span>' +
        '<span class="teams">' +
          '<span class="teamrow' + hLoser + '"><img src="' + esc(logo(home.team)) + '" alt=""><span class="nm">' + esc(teamName(home.team)) + '</span><span class="sc">' + esc(hScore) + '</span></span>' +
          '<span class="teamrow' + aLoser + '"><img src="' + esc(logo(away.team)) + '" alt=""><span class="nm">' + esc(teamName(away.team)) + '</span><span class="sc">' + esc(aScore) + '</span></span>' +
        '</span>' + starBtn(home.team.id) + '</button>';
    }).join('');
    return h;
  };
  html += renderGroup('<span class="live-dot">●</span> တိုက်ရိုက် ကစားနေဆဲ', groups.in);
  html += renderGroup('⏰ မကစားရသေးသော ပွဲများ', groups.pre);
  html += renderGroup('✅ ပြီးဆုံးသွားသော ပွဲများ', groups.post);
  $('app').innerHTML = html;
}

async function openDetail(eventId){
  state.detail = {id: eventId, data: null};
  $('app').innerHTML = '<p class="loading">ပွဲအသေးစိတ် တင်နေသည်…</p>';
  try {
    let d = null;
    try { d = await getJSON('https://site.api.espn.com/apis/site/v2/sports/soccer/' + state.league + '/summary?event=' + encodeURIComponent(eventId)); }
    catch(e) { d = await getJSON('https://site.api.espn.com/apis/site/v2/sports/soccer/all/summary?event=' + encodeURIComponent(eventId)); }
    state.detail.data = d;
    renderDetail();
  } catch(e) {
    $('app').innerHTML = '<p class="empty">အသေးစိတ် ဆွဲမရပါ။ (' + esc(e.message) + ')</p><button class="back" onclick="backToList()">← ပြန်သွားပါ</button>';
  }
}
function backToList(){ state.detail = null; renderMatches(); }

function statMap(team){
  const m = {};
  (team.statistics || []).forEach(s => { m[s.name] = s; });
  return m;
}
function statVal(m, name){
  const s = m[name]; if (!s) return null;
  const v = parseFloat(s.displayValue);
  if (name === 'passPct' && !isNaN(v) && v <= 1) return Math.round(v * 100);
  if (name === 'shotPct' && !isNaN(v) && v <= 1) return Math.round(v * 100);
  return isNaN(v) ? s.displayValue : v;
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
  const lg = LEAGUES.find(l => l.id === state.league);
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
      '<p style="font-size:13px;color:#9fb0ba">ပွဲထွက် ၁၁ ဦး</p><ul>' + starters.map(pLine).join('') + '</ul>' +
      '<p style="font-size:13px;color:#9fb0ba;margin-top:12px">အရန်ခုံ</p><ul>' + subs.map(p => '<li class="sub">' + esc((p.athlete && p.athlete.displayName) || '') + '</li>').join('') + '</ul></div>';
  });
  if (!lineupHtml) lineupHtml = '<p class="empty">လူစာရင်း မထုတ်ပြန်သေးပါ။</p>';

  $('app').innerHTML = '<div class="detail"><button class="back" onclick="backToList()">← ပွဲစဉ်များ ပြန်သွားပါ</button>' +
    '<div class="scorehead"><div class="lg">' + esc(lg ? lg.my : '') + ' • ' + esc(statusTxt) + '</div>' +
    '<div class="teams2"><div><img src="' + esc(logo(home.team)) + '" alt=""><div>' + esc(teamName(home.team)) + '</div></div>' +
    '<div class="big">' + esc(home.score == null ? '-' : home.score) + ' - ' + esc(away.score == null ? '-' : away.score) + '</div>' +
    '<div><img src="' + esc(logo(away.team)) + '" alt=""><div>' + esc(teamName(away.team)) + '</div></div></div>' +
    '<div class="meta">' + esc(venue) + esc(att) + (broadcasts ? '<br>📺 ' + esc(broadcasts) : '') + '</div></div>' +
    '<h3>⏱️ ပွဲဖြစ်စဉ် (Timeline)</h3>' + tlHtml +
    '<h3>📊 ပွဲအတွင်း Stats နှိုင်းယှဉ်</h3><p style="font-size:13px;color:#9fb0ba;text-align:center">' + esc(teamName(home.team)) + ' (အစိမ်း) vs ' + esc(teamName(away.team)) + ' (မီးခိုး)</p>' + statsHtml +
    '<h3>👥 လူစာရင်း (Lineups)</h3><div class="lineup">' + lineupHtml + '</div>' +
    '</div>';
}

async function loadStandings(){
  $('app').innerHTML = '<p class="loading">အဆင့်ဇယား တင်နေသည်…</p>';
  try {
    const d = await getJSON('https://site.web.api.espn.com/apis/v2/sports/soccer/' + state.league + '/standings');
    const entries = (((d.children || [])[0] || {}).standings || {}).entries || [];
    const lg = LEAGUES.find(l => l.id === state.league);
    if (!entries.length){ $('app').innerHTML = '<p class="empty">အဆင့်ဇယား မရပါ။</p>'; return; }
    const get = (e, name) => { const s = (e.stats || []).find(x => x.name === name); return s ? s.displayValue : '-'; };
    let html = '<p class="section">' + esc(lg.my) + ' • အဆင့်ဇယား</p><div class="detail"><table><tr><th class="num">#</th><th>အသင်း</th><th class="num">ပွဲ</th><th class="num">နိုင်</th><th class="num">သရေ</th><th class="num">ရှုံး</th><th class="num">ဂိုးကွာ</th><th class="num">အမှတ်</th></tr>';
    entries.forEach((e, i) => {
      const t = e.team || {};
      const hl = isFav(t.id) ? ' class="hl"' : '';
      html += '<tr' + hl + '><td class="num">' + (i + 1) + '</td><td class="teamcell"><img src="' + esc(logo(t)) + '" alt="">' + esc(teamName(t)) + '</td>' +
        '<td class="num">' + esc(get(e, 'gamesPlayed')) + '</td><td class="num">' + esc(get(e, 'wins')) + '</td><td class="num">' + esc(get(e, 'ties')) + '</td><td class="num">' + esc(get(e, 'losses')) + '</td><td class="num">' + esc(get(e, 'pointDifferential')) + '</td><td class="num"><b>' + esc(get(e, 'points')) + '</b></td></tr>';
    });
    html += '</table></div>';
    $('app').innerHTML = html;
  } catch(e) {
    $('app').innerHTML = '<p class="empty">အဆင့်ဇယား ဆွဲမရပါ။ (' + esc(e.message) + ')</p>';
  }
}

$('search').addEventListener('input', e => { state.q = e.target.value; if (state.tab === 'matches' && !state.detail) renderMatches(); });
renderLeagues(); renderDates(); load();
setInterval(() => { if (!state.detail) load(); }, 60000);
