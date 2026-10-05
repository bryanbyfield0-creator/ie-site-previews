/* Bid Finder scoring: rule-based, no AI, explainable. Works in browser and Node. */
(function(root){
const SA_REQ={SBA:"sb",SBP:"sb","[\"SBA\"]":"sb","8A":"8a","8AN":"8a",HZC:"hubzone",HZS:"hubzone",SDVOSBC:"sdvosb",SDVOSBS:"sdvosb",
 WOSB:"wosb",WOSBSS:"wosb",EDWOSB:"edwosb",EDWOSBSS:"edwosb",VSA:"vosb",VSS:"vosb",ISBEE:"isbee",IEE:"isbee",BICiv:"isbee",LAS:"local"};
const SA_LABEL={sb:"small business",'8a':"8(a)",hubzone:"HUBZone",sdvosb:"service-disabled veteran-owned",wosb:"women-owned",edwosb:"economically disadvantaged women-owned",vosb:"veteran-owned",isbee:"Indian/tribal",local:"local-area"};
function eligible(req,el){ if(!req) return true; if(el[req]) return true;
  if(req==="wosb"&&el.edwosb) return true; if(req==="vosb"&&el.sdvosb) return true; return false; }
function daysLeft(dl,now){ return (new Date(dl)-now)/864e5; }
function score(o,p,now){
  now=now||new Date(); let s=0; const why=[], warn=[];
  const naics=(p.naics||[]).map(String);
  if(naics.includes(o.n)){ s+=40; why.push(`Exact match on your NAICS ${o.n}.`); }
  else if(naics.some(n=>n.slice(0,4)===String(o.n).slice(0,4))){ s+=25; why.push(`Close industry match (NAICS ${o.n} is in the same 4-digit group as yours).`); }
  else if(naics.some(n=>n.slice(0,3)===String(o.n).slice(0,3))){ s+=12; why.push(`Related industry (NAICS ${o.n}, same 3-digit sector).`); }
  const text=(o.t+" "+o.de).toLowerCase(), title=o.t.toLowerCase(); let kw=0; const hits=[];
  (p.keywords||[]).forEach(k=>{k=k.trim().toLowerCase(); if(!k) return;
    if(title.includes(k)){kw+=10;hits.push(k);} else if(text.includes(k)){kw+=5;hits.push(k);} });
  if(kw){ s+=Math.min(kw,25); why.push(`Mentions what you do: ${hits.slice(0,4).join(", ")}.`); }
  const req=SA_REQ[o.sa]||(o.sa?"other":"");
  if(req && req!=="other"){
    if(eligible(req,p.elig||{})){ s+=20; why.push(`Set aside for ${SA_LABEL[req]} firms, which you said you are, so big companies can't bid.`); }
    else { s-=40; warn.push(`Reserved for ${SA_LABEL[req]} firms. You did not check that box, so you likely can't bid as prime.`); }
  } else if(o.sa){ warn.push(`Special set-aside (${o.san}); check eligibility.`); }
  else { warn.push("Full and open (no set-aside): larger companies can compete."); }
  const st=(p.states||[]).map(x=>x.toUpperCase()), z3=(p.zip||"").slice(0,3);
  if(o.ps && st.includes(o.ps)){ s+=10; why.push(`Work is in ${o.pc?o.pc+", ":""}${o.ps}, inside your area.`);
    if(z3 && o.pz && Math.abs(+o.pz.slice(0,3)-+z3)<=10){ s+=12; why.push("Place of performance is near your ZIP (approximate, by ZIP prefix)."); } }
  else if(!o.ps){ s+=3; } else if(st.length && !p.nationwide){ s-=10; warn.push(`Work is in ${o.ps}, outside your listed states.`); }
  const d=daysLeft(o.dl,now);
  if(d<3){ s-=10; warn.push(`Due in under 3 days (${Math.max(0,d).toFixed(1)} days).`); }
  else if(d<=30){ s+=8; why.push(`Due in ${Math.round(d)} days, enough time to get supplier quotes.`); }
  if(o.ty==="Combined Synopsis/Solicitation"||o.ty==="Solicitation"){ s+=5; why.push("Open solicitation: you can submit a bid now."); }
  else if(o.ty==="Sources Sought"){ s-=5; warn.push("Sources Sought = market research. No bid yet, but answering gets you on the buyer's radar."); }
  else if(o.ty==="Presolicitation"){ warn.push("Presolicitation: the actual bid comes later. Watch it."); }
  return {score:Math.max(0,Math.min(100,Math.round(s))),why,warn};
}
function rank(rows,p,now,limit){
  return rows.map(o=>Object.assign({o},score(o,p,now))).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.o.dl.localeCompare(b.o.dl)).slice(0,limit||200);
}
function samLink(o){ return `https://sam.gov/opp/${o.id}/view`; }
function rfqEmail(o,p){
  const due=new Date(o.dl), dueStr=due.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
  const quoteBy=new Date(due-3*864e5).toLocaleDateString("en-US",{month:"short",day:"numeric"});
  const loc=[o.pc,o.ps,o.pz].filter(Boolean).join(", ")||"the government delivery location in the solicitation";
  const co=p.company||"[Your Company]", em=p.email||"[your email]";
  return {subject:`Quote request: ${o.t.slice(0,70)} (Sol. ${o.sol||"n/a"})`,
  body:`Hello,

${co} is preparing a quote for a U.S. government solicitation and would like your pricing.

Solicitation: ${o.sol||"n/a"} - ${o.t}
Agency: ${o.ag}
SAM.gov notice: ${samLink(o)}
Delivery/performance location: ${loc}

Please quote:
1. Unit and extended price for the items/services in the attached or linked requirement
2. FOB Destination pricing, drop-shipped directly to the government location above (freight included)
3. Lead time / earliest delivery or start date after award
4. Quote validity (please hold at least 30 days)
5. Country of origin and any brand/part numbers, if applicable

We need your quote by ${quoteBy} (the government deadline is ${dueStr}).

Please reply by email to ${em}.

Thank you,
${co}
${em}`};
}
const api={score,rank,samLink,rfqEmail,SA_LABEL};
if(typeof module!=="undefined") module.exports=api; else root.BidScore=api;
})(this);
