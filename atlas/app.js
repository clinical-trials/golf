(() => {
'use strict';
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const savedKey='first-tee-atlas:saved:v1';
const readSaved = value => {try {const list=JSON.parse(value||'[]');return new Set(Array.isArray(list)?list.filter(id=>CAMERAS.some(c=>c.id===id)):[]);}catch{return new Set();}};
let saved;try{saved=readSaved(localStorage.getItem(savedKey));}catch{saved=new Set();}
let continent='all',savedOnly=false,activeDetail=null,detailTrigger=null,toastTimer;
const countries=[...new Map(CAMERAS.map(c=>[c.countryCode,c.country])).entries()];
const countryFlags={US:'🇺🇸',CA:'🇨🇦',GB:'🇬🇧',NZ:'🇳🇿',CH:'🇨🇭',DE:'🇩🇪'};
const shortCountry={US:'United States',CA:'Canada',GB:'United Kingdom',NZ:'New Zealand',CH:'Switzerland',DE:'Germany'};
const bookmark='<svg viewBox="0 0 20 22" aria-hidden="true"><path d="M4 3h12v17l-6-4-6 4Z"/></svg>';
const play='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7 4 9 6-9 6Z"/></svg>';
const time=c=>new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',timeZone:c.timezone}).format(new Date());
const location=c=>[...new Set([c.city,c.state,c.country].filter(Boolean))].join(', ');
const areaKey=c=>`${c.countryCode}:${c.state}`;
function announce(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3400);}
window.addEventListener('atlas:announce',e=>announce(e.detail));
function updateSaved(){
 $('#saved-count').textContent=saved.size;
 $('#saved-filter').classList.toggle('active',savedOnly);$('#saved-filter').setAttribute('aria-pressed',savedOnly);
 $$('[data-save]').forEach(b=>{const c=CAMERAS.find(c=>c.id===b.dataset.save),yes=saved.has(c.id);b.setAttribute('aria-pressed',yes);b.setAttribute('aria-label',`${yes?'Unsave':'Save'} ${c.name}`);});
 const button=$('#detail-save');if(button&&activeDetail){button.setAttribute('aria-pressed',saved.has(activeDetail));button.textContent=saved.has(activeDetail)?'✓ Saved':'Save course';}
}
function saveCamera(id){const adding=!saved.has(id);adding?saved.add(id):saved.delete(id);let persistent=true;try{localStorage.setItem(savedKey,JSON.stringify([...saved]));}catch{persistent=false;}
 if(savedOnly)render();else updateSaved();
 announce(persistent?(adding?'Added to your saved courses':'Removed from saved courses'):'Saved for this visit. Browser storage is unavailable.');
}
function filtered(){const q=norm($('#search').value.trim()),country=$('#country').value,area=$('#state').value;
 const list=CAMERAS.filter(c=>(!q||norm([c.name,c.city,c.state,c.country,c.countryCode,c.continent,c.region,c.countryCode==='US'?'USA':c.countryCode==='GB'?'UK Great Britain':''].join(' ')).includes(q))&&(!country||c.countryCode===country)&&(!area||areaKey(c)===area)&&(continent==='all'||c.continent===continent)&&(!savedOnly||saved.has(c.id))&&(!$('#embedded-only').checked||c.embed));
 if($('#sort').value==='name')list.sort((a,b)=>a.name.localeCompare(b.name));
 if($('#sort').value==='country')list.sort((a,b)=>a.country.localeCompare(b.country)||a.name.localeCompare(b.name));return list;
}
function render(){const list=filtered();$('#result-count').innerHTML=`<strong>${String(list.length).padStart(2,'0')}</strong> ${savedOnly?'saved cameras':'cameras to explore'}`;
 $('#clear-filters').hidden=!($('#search').value||$('#country').value||$('#state').value||continent!=='all'||savedOnly||$('#embedded-only').checked);
 $('#camera-grid').innerHTML=list.map((c,i)=>`<article class="camera-card" style="--i:${Math.min(i,7)}">
 <div class="card-visual"><button class="card-image" data-watch="${c.id}" aria-label="Watch ${esc(c.name)}"><img src="${esc(c.image)}" alt="${esc(c.imageAlt)}" width="640" height="400" loading="lazy"><span class="image-shade"></span><span class="photo-label">${esc(c.imageLabel)}</span><span class="card-center-play">${play}</span></button><span class="country-badge"><span aria-hidden="true">${countryFlags[c.countryCode]}</span> ${esc(c.countryCode==='GB'?'UK':c.countryCode)}</span><button class="card-save" data-save="${c.id}" aria-label="Save ${esc(c.name)}" aria-pressed="${saved.has(c.id)}">${bookmark}</button><div class="card-overlay"><span>${esc(c.city)} · ${esc(c.state)}</span><h3><button data-detail="${c.id}">${esc(c.name)}</button></h3></div></div>
 <div class="card-bottom"><span class="card-time"><span class="time-icon" aria-hidden="true">◷</span><span data-time="${c.id}">${time(c)}</span><small>LOCAL</small></span><span class="camera-kind">${c.embed?'PLAYER':c.format?'STILL CAM':'ON SITE'}</span></div>
 <div class="card-actions"><button class="card-watch" data-watch="${c.id}">${play}${c.embed?'Watch camera':c.format?'View webcam':'Open camera'}<span aria-hidden="true">↗</span></button>${c.embed?`<button class="wall-add" data-add="${c.id}" aria-label="Add ${esc(c.name)} to live wall" title="Add to live wall">＋</button>`:`<button class="wall-add" data-detail="${c.id}" aria-label="Details about ${esc(c.name)}" title="Camera details">i</button>`}</div></article>`).join('');
 $('#empty').hidden=list.length>0;$('#empty-message').textContent=savedOnly&&saved.size===0?'Bookmark a course to keep your favorite views together.':'Try another country or a broader search.';
 $$('[data-region]').forEach(b=>{b.classList.toggle('active',b.dataset.region===continent);b.setAttribute('aria-pressed',b.dataset.region===continent);});
 $$('[data-tour]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.tour===$('#country').value));updateSaved();updateWallButtons();
}
function updateWallButtons(){const state=window.AtlasPlayer?.getState();if(!state)return;$$('[data-add]').forEach(b=>{const inWall=state.wallIds.includes(b.dataset.add);b.classList.toggle('in-wall',inWall);b.textContent=inWall?'✓':'＋';b.title=inWall?'Already selected in live wall':'Add to live wall';});}
window.addEventListener('atlas:playbackchange',updateWallButtons);
function updateAreas(){const country=$('#country').value;const cameras=CAMERAS.filter(c=>(!country||c.countryCode===country)&&(continent==='all'||c.continent===continent));const areas=[...new Map(cameras.map(c=>[areaKey(c),c.state])).entries()].sort((a,b)=>a[1].localeCompare(b[1]));$('#state').innerHTML='<option value="">All regions</option>'+areas.map(([key,label])=>`<option value="${esc(key)}">${esc(label)}</option>`).join('');}
function clearFilters(){continent='all';savedOnly=false;$('#search').value='';$('#country').value='';$('#embedded-only').checked=false;updateAreas();render();}
function chooseCountry(code){clearFilters();$('#country').value=code;updateAreas();render();$('#directory').scrollIntoView({behavior:'smooth'});$('#country').focus({preventScroll:true});}
function openDetails(id){const c=CAMERAS.find(c=>c.id===id);if(!c)return;activeDetail=id;detailTrigger=document.activeElement;
 $('#camera-detail').innerHTML=`<div class="detail-image"><img src="${esc(c.image)}" alt="${esc(c.imageAlt)}"><span class="photo-label">${esc(c.imageLabel)}</span></div><div class="detail-content"><p class="eyebrow">${esc(c.country)} / FIRST TEE</p><h2 id="detail-title">${esc(c.name)}</h2><p class="detail-location">${esc(location(c))}</p><p>${esc(c.description)}</p><dl class="detail-meta"><div><dt>THE VIEW</dt><dd>${esc(c.view)}</dd></div><div><dt>LOCAL TIME</dt><dd data-time="${c.id}">${time(c)}</dd></div><div><dt>FORMAT</dt><dd>${c.embed?'Embedded operator player':c.format||'Operator website'}</dd></div><div><dt>SOURCE REVIEWED</dt><dd>October 15, 2026</dd></div></dl><div class="detail-actions"><button id="detail-watch" class="primary-button">${c.embed?'Watch this first tee':'View camera options'} ↗</button><button id="detail-save" class="secondary-button">Save course</button></div><p class="source-note">${esc(c.note||'Camera availability is managed by the operator.')}<br>Preview: ${esc(c.credit)}. <a href="${esc(c.source)}" target="_blank" rel="noopener noreferrer">Official source ↗</a>${c.evidence?` · <a href="${esc(c.evidence)}" target="_blank" rel="noopener noreferrer">First-tee evidence ↗</a>`:''}</p></div>`;
 $('#camera-dialog').setAttribute('aria-labelledby','detail-title');$('#detail-save').addEventListener('click',()=>saveCamera(id));$('#detail-watch').addEventListener('click',()=>{$('#camera-dialog').close();window.AtlasPlayer.watch(id,true);});updateSaved();$('#camera-dialog').showModal();
}
$('#camera-grid').addEventListener('click',event=>{const b=event.target.closest('button');if(!b)return;if(b.dataset.save){const id=b.dataset.save;saveCamera(id);($(`[data-save="${id}"]`)||$('#saved-filter')).focus({preventScroll:true});}else if(b.dataset.watch)window.AtlasPlayer.watch(b.dataset.watch,true);else if(b.dataset.add)window.AtlasPlayer.add(b.dataset.add);else if(b.dataset.detail)openDetails(b.dataset.detail);});
$('#country').innerHTML='<option value="">All countries</option>'+countries.slice().sort((a,b)=>a[1].localeCompare(b[1])).map(([code,label])=>`<option value="${code}">${esc(label)}</option>`).join('');
$('#continent-filters').innerHTML=[...new Set(CAMERAS.map(c=>c.continent))].map(c=>`<button class="chip" data-region="${esc(c)}" aria-pressed="false">${esc(c)}</button>`).join('');
$('#country-tour').innerHTML=['US','CA','GB','NZ','CH','DE'].map(code=>{const cs=CAMERAS.filter(c=>c.countryCode===code),c=cs[0];return `<button class="country-stop" data-tour="${code}" aria-pressed="false"><span class="country-stop-top"><span class="country-code">${code==='GB'?'UK':code}</span><span aria-hidden="true">↗</span></span><strong>${esc(shortCountry[code])}</strong><span class="country-stop-bottom">${cs.length} ${cs.length===1?'camera':'cameras'}<span>${countryFlags[code]}</span></span></button>`;}).join('');
$('#country-tour').addEventListener('click',e=>{const b=e.target.closest('[data-tour]');if(b)chooseCountry(b.dataset.tour);});
$('#search').addEventListener('input',render);$('#country').addEventListener('change',()=>{continent='all';updateAreas();render();});$('#state').addEventListener('change',render);$('#sort').addEventListener('change',render);$('#embedded-only').addEventListener('change',render);
$('.region-filters').addEventListener('click',e=>{const b=e.target.closest('[data-region]');if(b){continent=b.dataset.region;$('#country').value='';updateAreas();render();}});
$('#saved-filter').addEventListener('click',()=>{savedOnly=!savedOnly;render();});$('#saved-nav').addEventListener('click',()=>{clearFilters();savedOnly=true;render();$('#directory').scrollIntoView({behavior:'smooth'});$('#saved-filter').focus({preventScroll:true});});
$('#reset').addEventListener('click',clearFilters);$('#clear-filters').addEventListener('click',clearFilters);
[$('#coverage-button'),$('#footer-coverage')].forEach(b=>b.addEventListener('click',()=>$('#coverage-dialog').showModal()));
$$('dialog').forEach(dialog=>{$('.close-dialog',dialog).addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});});
$('#camera-dialog').addEventListener('close',()=>{const trigger=detailTrigger;activeDetail=null;detailTrigger=null;$('#camera-detail').replaceChildren();if(trigger?.isConnected)trigger.focus({preventScroll:true});});
$('#source-list').innerHTML='<h3>Camera sources</h3>'+CAMERAS.map(c=>`<a href="${esc(c.source)}" target="_blank" rel="noopener noreferrer"><span>${esc(c.name)}</span><span>↗</span></a>`).join('');
$('#course-count').textContent=CAMERAS.length;$('#country-count').textContent=countries.length;$('#all-count').textContent=CAMERAS.length;
window.addEventListener('storage',e=>{if(e.key===savedKey||e.key===null){saved=readSaved(e.newValue);if(savedOnly)render();else updateSaved();}});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!document.body.classList.contains('cinema-mode')&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)&&!document.activeElement.isContentEditable&&!$('dialog[open]')){e.preventDefault();$('#search').focus();$('#directory').scrollIntoView({behavior:'smooth'});}});
setInterval(()=>{$$('[data-time]').forEach(el=>{const c=CAMERAS.find(c=>c.id===el.dataset.time);if(c)el.textContent=time(c);});},30000);
updateAreas();render();
})();
