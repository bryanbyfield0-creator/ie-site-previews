const $=s=>document.querySelector(s), Q=new URLSearchParams(location.search);
let DATA=null, BRAND=null, RESULTS=[];
const PRESETS={
  fac:{company:"Precision Facility Solutions LLC",email:"bryanbyfield0@gmail.com",
    naics:"561210, 561720, 561730, 238220",keywords:"facilities, maintenance, janitorial, custodial, grounds, base operations",
    states:"CA",zip:"92401",elig:["sb"],nationwide:true},
  jan:{company:"Sample Janitorial Co. (consultant client)",email:"bryanbyfield0@gmail.com",
    naics:"561720, 561790",keywords:"janitorial, custodial, cleaning, floor care, carpet",
    states:"CA",zip:"90012",elig:["sb"],nationwide:false}
};
async function init(){
  const brands=await (await fetch("brands.json")).json();
  BRAND=brands[Q.get("brand")]||brands.default;
  ["name","primary","accent","logo"].forEach(k=>{ if(Q.get(k)) BRAND[k]=Q.get(k); });
  document.documentElement.style.setProperty("--p",BRAND.primary);
  document.documentElement.style.setProperty("--a",BRAND.accent);
  $("#bname").textContent=BRAND.name;
  $("#tagline").textContent=BRAND.tagline||"";
  document.title=BRAND.name;
  if(BRAND.logo){ $("#logo").src=BRAND.logo; $("#logo").hidden=false; }
  $("#fbrand").textContent=BRAND.name+(BRAND.by?" · "+BRAND.by:"");
  document.querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>{fill(PRESETS[b.dataset.p]);run();});
  $("#go").onclick=run;
  const saved=JSON.parse(localStorage.getItem("bf_profile")||"null");
  fill(Q.get("preset")?PRESETS[Q.get("preset")]:(saved||{email:BRAND.email||"bryanbyfield0@gmail.com"}));
  $("#meta").textContent="Loading bids…";
  try{
    DATA=await (await fetch("data/opps.json")).json();
    $("#meta").textContent=`${DATA.count.toLocaleString()} open federal notices · data updated ${DATA.generated.replace("T"," ").replace("Z"," UTC")}`;
  }catch(e){ $("#meta").textContent="Could not load bid data."; console.error(e); }
  if(Q.get("preset") && DATA) run();
}
function fill(p){
  if(!p) return;
  ["company","email","naics","keywords","states","zip"].forEach(k=>$("#"+k).value=p[k]||"");
  document.querySelectorAll("[data-e]").forEach(c=>c.checked=(p.elig||[]).includes(c.dataset.e));
  $("#nationwide").checked=!!p.nationwide;
}
function profile(){
  const sp=s=>s.split(",").map(x=>x.trim()).filter(Boolean);
  const elig={};
  document.querySelectorAll("[data-e]").forEach(c=>{if(c.checked) elig[c.dataset.e]=true;});
  const p={company:$("#company").value,email:$("#email").value,naics:sp($("#naics").value),
    keywords:sp($("#keywords").value),states:sp($("#states").value),zip:$("#zip").value,elig,
    nationwide:$("#nationwide").checked};
  localStorage.setItem("bf_profile",JSON.stringify({...p,naics:p.naics.join(", "),keywords:p.keywords.join(", "),
    states:p.states.join(", "),elig:Object.keys(elig)}));
  return p;
}
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fmt=d=>new Date(d).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"});
function run(){
  if(!DATA) return;
  const p=profile();
  RESULTS=BidScore.rank(DATA.rows,p,new Date(),100);
  $("#detail").hidden=true;
  $("#list").innerHTML=RESULTS.length
    ? `<p class="muted">Top ${RESULTS.length} matches. Click a bid for details and a supplier quote-request email.</p>`+
      RESULTS.map((r,i)=>`<div class="bid" data-i="${i}"><span class="sc" title="Fit score">${r.score}</span>
      <b>${esc(r.o.t)}</b><br>
      <span class="tag">${esc(r.o.ag)}</span><span class="tag">NAICS ${esc(r.o.n)}</span>
      ${r.o.sa?`<span class="tag">${esc(r.o.san)}</span>`:""}
      <span class="tag">${esc([r.o.pc,r.o.ps].filter(Boolean).join(", ")||"Location n/a")}</span>
      <span class="tag">Due ${fmt(r.o.dl)}</span>
      <div class="muted">${esc(r.why[0]||"")}</div></div>`).join("")
    : "<p>No matches. Try more NAICS codes or keywords.</p>";
  document.querySelectorAll(".bid").forEach(el=>el.onclick=()=>show(+el.dataset.i));
}
function show(i){
  const r=RESULTS[i], o=r.o, p=profile(), em=BidScore.rfqEmail(o,p), d=$("#detail");
  d.hidden=false;
  d.innerHTML=`<h2>3. Bid detail · fit score ${r.score}/100</h2>
  <h3>${esc(o.t)}</h3>
  <p><b>Agency:</b> ${esc(o.ag)} · ${esc(o.of)}<br>
  <b>Solicitation #:</b> ${esc(o.sol)} · <b>Type:</b> ${esc(o.ty)} · <b>Posted:</b> ${esc(o.pd)}<br>
  <b>Response due:</b> ${fmt(o.dl)}<br>
  <b>Set-aside:</b> ${esc(o.san||"None (full and open)")}<br>
  <b>Place of performance:</b> ${esc([o.pc,o.ps,o.pz].filter(Boolean).join(", ")||"not listed")}<br>
  <b>Estimated value:</b> not published in SAM.gov public data for open bids.<br>
  <a href="${BidScore.samLink(o)}" target="_blank" rel="noopener">Open the official notice on SAM.gov ↗</a></p>
  <h4>Why it fits</h4><ul class="why">${r.why.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
  ${r.warn.length?`<h4>Watch out</h4><ul class="warn">${r.warn.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}
  ${o.de?`<h4>Description excerpt</h4><p class="muted">${esc(o.de)}…</p>`:""}
  <h4>Supplier quote-request email (draft — nothing is sent)</h4>
  <p class="muted">Paste into your own email to a supplier or subcontractor. Asks for FOB Destination / drop-ship to the government site. Never uses a home address.</p>
  <textarea id="rfq">Subject: ${esc(em.subject)}\n\n${esc(em.body)}</textarea><br>
  <button id="copy" class="primary" type="button">Copy email</button> <span id="copied"></span>`;
  $("#copy").onclick=async()=>{
    const t=$("#rfq").value;
    try{await navigator.clipboard.writeText(t);}catch(e){$("#rfq").select();document.execCommand("copy");}
    $("#copied").textContent="Copied!";
  };
  d.scrollIntoView({behavior:"smooth"});
}
init();
