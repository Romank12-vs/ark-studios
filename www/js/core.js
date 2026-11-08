/* ARK Studios core: pure helpers shared by the app and its tests (no DOM access). */
(function(){
"use strict";
const STEPS=[{k:'final',l:'Final'},{k:'edit',l:'Edit'},{k:'choreo',l:'Choreo'},{k:'teach',l:'Teach'},{k:'practice',l:'Practice'}];
const uid=()=>Date.now().toString(36).slice(-4)+Math.random().toString(36).slice(2,8);
const pad=n=>String(n).padStart(2,'0');
const isoOf=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const todayISO=()=>isoOf(new Date());
function addDays(iso,n){const d=new Date(iso+'T00:00:00');d.setDate(d.getDate()+n);return isoOf(d)}
function daysLeft(iso){if(!iso) return null;const t=new Date(todayISO()+'T00:00:00');return Math.round((new Date(iso+'T00:00:00')-t)/864e5)}
function fmtDate(iso,opt){if(!iso) return '';try{return new Date(iso+'T00:00:00').toLocaleDateString('en-IN',opt||{day:'numeric',month:'short',year:'numeric'})}catch(e){return iso}}
function dayLabel(iso){const d=daysLeft(iso);if(d===0) return 'Today';if(d===1) return 'Tomorrow';if(d===-1) return 'Yesterday';return fmtDate(iso,{weekday:'short',day:'numeric',month:'short'})}
function fmtTime(t){if(!t) return '';const [h,m]=t.split(':').map(Number);const ap=h>=12?'pm':'am';return ((h%12)||12)+(m?':'+pad(m):'')+' '+ap}
function parseDur(v){v=String(v||'').trim().replace('.',':');if(!v) return 0;if(v.includes(':')){const [m,s]=v.split(':');return (parseInt(m)||0)*60+(parseInt(s)||0)}return Math.round((parseFloat(v)||0)*60)}
function fmtDur(sec){sec=Math.round(sec||0);if(!sec) return '';const m=Math.floor(sec/60),s=sec%60;return m+':'+pad(s)}
const money=n=>'₹'+Math.round(n||0).toLocaleString('en-IN');
const num=v=>{const n=parseFloat(String(v||'').replace(/[^\d.-]/g,''));return isFinite(n)?n:0};
function waNumber(phone){let d=String(phone||'').replace(/\D/g,'');if(d.length===11&&d[0]==='0') d=d.slice(1);if(d.length===10) d='91'+d;return d}
const waHref=(phone,text)=>`https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(text)}`;
const V1_TPL={
 full:"Hi {client} 😊\n\n*{event}* ka choreography update:\n\n{statusList}\n\n✅ {readyCount}/{totalCount} songs ready.\n\n— {studio}",
 finalize:"Hi {client} 😊\n\n{event} ke liye ye songs abhi final karne baaki hain:\n\n{finalizeList}\n\nPlease jaldi confirm kar dijiye taaki editing aur choreography start ho sake 🙏\n\n— {studio}",
 practice:"Hi {client} 😊\n\nIn songs ki choreography ho chuki hai, bas practice baaki hai:\n\n{practiceList}\n\nRoz ek baar video dekh ke practice kar lijiye 💃 Event mein sirf {daysLeft} din bache hain!\n\n— {studio}",
 custom:"Hi {client} 😊\n\n\n\n— {studio}"};
const LEAD_CHOICES=[30,60,120];
const remDefaults=()=>({rehearsal:false,leadMins:60,digest:false,digestTime:'09:00'});
function blank(){return {v:2,clients:[],settings:{name:'',studio:'',phone:'',upi:'',lang:'hinglish',theme:'auto',templates:{},reminders:remDefaults(),lastAutoBackupAt:0,lastSharedBackupAt:0,backupNudgeSnoozedUntil:0},updatedAt:0}}
function normalize(s){
  const b=blank(); s=s&&typeof s==='object'?s:{};
  const st=s.settings||{};
  const rm=st.reminders&&typeof st.reminders==='object'?st.reminders:{},rd=remDefaults();
  b.settings={...b.settings,...st,templates:{},reminders:{
    rehearsal:rm.rehearsal===true,
    leadMins:LEAD_CHOICES.includes(rm.leadMins)?rm.leadMins:rd.leadMins,
    digest:rm.digest===true,
    digestTime:typeof rm.digestTime==='string'&&/^\d{2}:\d{2}$/.test(rm.digestTime)?rm.digestTime:rd.digestTime}};
  const tp=st.templates||{};
  if(s.v===2) b.settings.templates={...tp};
  else Object.keys(tp).forEach(k=>{if(tp[k]&&tp[k]!==V1_TPL[k]) b.settings.templates[k==='full'?'update':k]=tp[k]}); // keep only v1 templates she edited
  b.clients=(Array.isArray(s.clients)?s.clients:[]).map(c=>({
    id:c.id||uid(),name:c.name||'Client',phone:c.phone||'',event:c.event||'',date:c.date||'',venue:c.venue||'',
    status:c.status||'booked',source:c.source||'',notes:c.notes||'',createdAt:c.createdAt||Date.now(),
    songsIncluded:c.songsIncluded||'',rehearsalsIncluded:c.rehearsalsIncluded||'',
    performances:(c.performances||[]).map(p=>({id:p.id||uid(),title:p.title||'Performance',type:p.type||'',format:p.format||'',people:p.people||'',props:p.props||'',
      performers:(p.performers||[]).map(x=>({id:x.id||uid(),name:x.name||''})),
      songs:(p.songs||[]).map(x=>({id:x.id||uid(),title:x.title||'Song',artist:x.artist||'',dur:x.dur||0,cut:x.cut||'',ref:x.ref||'',tutorial:x.tutorial||'',notes:x.notes||'',steps:x.steps||{}}))})),
    rehearsals:(c.rehearsals||[]).map(r=>({id:r.id||uid(),date:r.date||todayISO(),time:r.time||'',mins:r.mins||90,place:r.place||'Studio',perfIds:r.perfIds||[],notes:r.notes||'',status:r.status||'planned',attendance:r.attendance||{}})),
    charges:(c.charges||[]).map(x=>({id:x.id||uid(),label:x.label||'Charge',amount:num(x.amount)})),
    payments:(c.payments||[]).map(x=>({id:x.id||uid(),date:x.date||todayISO(),amount:num(x.amount),mode:x.mode||'UPI',note:x.note||''}))
  }));
  b.updatedAt=s.updatedAt||0; return b;
}
function nextIdx(s){for(let i=0;i<STEPS.length;i++) if(!s.steps[STEPS[i].k]) return i;return 5}
const doneN=s=>STEPS.filter(st=>s.steps[st.k]).length;
// Next-step wording for one-row songs: "Teach next" in the row, "Taught" on its tick button.
const NEXT_VERB=['Finalise','Edit','Choreograph','Teach','Practise'];
const DONE_VERB=['Finalised','Edited','Choreographed','Taught','Practised'];
const nextStepKey=s=>{const i=nextIdx(s);return i<5?STEPS[i].k:null};
const nextStepLabel=s=>{const i=nextIdx(s);return i<5?NEXT_VERB[i]+' next':'Ready'};
const nextStepDoneLabel=s=>{const i=nextIdx(s);return i<5?DONE_VERB[i]:null};
const songsOf=c=>c.performances.flatMap(p=>p.songs);
const readyOf=c=>songsOf(c).filter(s=>nextIdx(s)===5).length;
function totals(c){const total=c.charges.reduce((a,x)=>a+x.amount,0),paid=c.payments.reduce((a,x)=>a+x.amount,0);return {total,paid,bal:total-paid}}
const isActive=c=>c.status==='booked'||c.status==='enquiry';
function upcomingReh(c){const t=todayISO();return c.rehearsals.filter(r=>r.status==='planned'&&r.date>=t).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time))}

/* ---------- backups ---------- */
const BACKUP_MARKER='ark-studios';
const backupFileName=iso=>'ark-studios-backup-'+iso+'.json';
function parseBackup(text){
  let d;
  try{d=JSON.parse(String(text||'').trim())}catch(e){throw new Error('not-a-backup')}
  if(!d||typeof d!=='object'||!Array.isArray(d.clients)) throw new Error('not-a-backup');
  return d;
}

const api={LEAD_CHOICES,STEPS,V1_TPL,uid,pad,isoOf,todayISO,addDays,daysLeft,fmtDate,dayLabel,fmtTime,parseDur,fmtDur,money,num,waNumber,waHref,nextIdx,doneN,nextStepKey,nextStepLabel,nextStepDoneLabel,songsOf,readyOf,totals,isActive,upcomingReh,blank,normalize,BACKUP_MARKER,backupFileName,parseBackup};
if(typeof module!=='undefined'&&module.exports) module.exports=api; else window.TaalCore=api;
})();
