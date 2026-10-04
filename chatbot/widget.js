/*! Website chat assistant v1 · free, no API keys · (c) 2026 Bryan Byfield
 * Usage: <script>window.CHAT_BOT={...config...}</script><script src="widget.js" defer></script>
 * Answers common questions with a keyword FAQ engine and turns visitors into
 * quote requests (opens the visitor's email app addressed to the business).   */
(function (root) {
  "use strict";
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var IE_CITIES = ["adelanto","apple valley","banning","beaumont","bloomington","calimesa","canyon lake","cherry valley","chino","chino hills","claremont","colton","corona","crestline","eastvale","fontana","grand terrace","hemet","hesperia","highland","jurupa valley","lake arrowhead","lake elsinore","loma linda","mentone","menifee","montclair","moreno valley","murrieta","norco","ontario","oak hills","perris","phelan","pomona","rancho cucamonga","redlands","rialto","riverside","running springs","san bernardino","san jacinto","sun city","temecula","twin peaks","upland","victorville","wildomar","winchester","yucaipa","big bear","lucerne valley","palm springs","los angeles","orange county","irvine","anaheim","french valley","nuevo","mead valley","wrightwood","blue jay","cedar glen","rimforest","lake gregory","barstow","yucca valley","joshua tree","mira loma","eastvale","glen avon","march","highgrove","lytle creek","devore","muscoy","alta loma","etiwanda","la verne","san dimas","walnut","diamond bar"];
  var STOP = {"and":1,"the":1,"of":1,"a":1,"for":1,"to":1,"&":1,"with":1,"your":1,"our":1,"we":1,"too":1,"service":1,"services":1,"more":1,"in":1,"on":1,"at":1,"repair":0};

  var GENERIC = {"cleaning":1,"clean":1,"cleanup":1,"washing":1,"wash":0,"repair":1,"repairs":1,"removal":1,"installation":1,"system":1,"systems":1,"detailing":1,"detail":1,"services":1,"service":1,"general":1,"other":1,"full":1,"more":1,"shop":0,"mobile":0};
  function norm(s) { return (" " + String(s || "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9@.+ ]+/g, " ").replace(/\s+/g, " ") + " "); }
  function has(t, k) { k = norm(k).trim(); if (!k) return false; return t.indexOf(" " + k) !== -1; } // prefix match on word start ("clean" hits "cleaning")
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fmtH(h) { var m = Math.round((h % 1) * 60), hh = Math.floor(h), ap = hh >= 12 && hh < 24 ? "PM" : "AM", d = hh % 12 || 12; return d + (m ? ":" + (m < 10 ? "0" : "") + m : "") + " " + ap; }
  function nowPT(date) {
    var d = date || new Date();
    try {
      var p = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", weekday: "short", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(d), o = {};
      p.forEach(function (x) { o[x.type] = x.value; });
      var wd = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(o.weekday);
      return { day: wd, hour: (parseInt(o.hour, 10) % 24) + parseInt(o.minute, 10) / 60 };
    } catch (e) { return { day: d.getDay(), hour: d.getHours() + d.getMinutes() / 60 }; }
  }

  function Engine(cfg) {
    this.c = cfg; this.state = null; this.lead = {};
    var self = this;
    // service keywords: every meaningful word of every service name + configured synonyms
    this.svc = (cfg.services || []).map(function (s) {
      var name = typeof s === "string" ? s : s.name, keys = (typeof s === "object" && s.keys) ? s.keys.slice() : [];
      norm(name).trim().split(" ").forEach(function (w) { if (w.length > 3 && !STOP[w] && !GENERIC[w]) keys.push(w); });
      return { name: name, desc: (typeof s === "object" && s.desc) || "", keys: keys };
    });
    this.areaWords = (cfg.areas || []).map(function (a) { return norm(a).trim(); });
  }
  Engine.prototype.phoneLine = function () { var c = this.c; return c.phone ? "call or text " + c.phone : (c.email ? "email " + c.email : "use the contact page"); };
  Engine.prototype.hoursText = function (date, q) {
    var c = this.c, h = c.hours;
    if (!h) return c.hoursNote || ("Hours aren't posted online. The quickest way to get a time is a quote request, or " + this.phoneLine() + ".");
    var n = nowPT(date), today = h[n.day], open = today && n.hour >= today[0] && n.hour < today[1];
    var lines = [], i, groups = [];
    for (i = 1; i <= 7; i++) { var d = i % 7, v = h[d], key = v ? v.join("-") : "x", last = groups[groups.length - 1];
      if (last && last.key === key) last.end = d; else groups.push({ key: key, start: d, end: d, v: v }); }
    groups.forEach(function (g) { var nm = DAYS[g.start].slice(0, 3) + (g.end !== g.start ? "–" + DAYS[g.end].slice(0, 3) : "");
      lines.push(nm + ": " + (g.v ? fmtH(g.v[0]) + "–" + fmtH(g.v[1]) : ((c.dayNotes && c.dayNotes[g.start] && g.start === g.end) ? c.dayNotes[g.start] : "Closed"))); });
    var st = open ? "We're open right now (until " + fmtH(today[1]) + ")." : "We're closed right now.", ask = -1;
    if (q) { DAYS.forEach(function (dn, i) { if (q.indexOf(" " + dn.toLowerCase()) !== -1 || q.indexOf(" " + dn.toLowerCase().slice(0, 3) + " ") !== -1) ask = i; });
      if (q.indexOf(" today") !== -1) ask = n.day; if (q.indexOf(" tomorrow") !== -1) ask = (n.day + 1) % 7; if (q.indexOf(" weekend") !== -1) ask = h[6] ? 6 : 0; }
    if (ask >= 0) st = (h[ask] ? "Yes, on " + DAYS[ask] + " we're open " + fmtH(h[ask][0]) + "–" + fmtH(h[ask][1]) + "." : ((c.dayNotes && c.dayNotes[ask]) ? DAYS[ask] + ": " + c.dayNotes[ask] + "." : "Sorry, we're closed on " + DAYS[ask] + "s.")) + (ask === n.day ? (open ? " (We're open right now.)" : "") : "");
    return st + "\n" + lines.join("\n") + (c.hoursNote ? "\n" + c.hoursNote : "");
  };
  Engine.prototype.mainChips = function () { return ["Services", "Areas served", "Hours", "Get a free quote"]; };
  Engine.prototype.findCity = function (t) {
    var best = null;
    IE_CITIES.concat(this.areaWords).forEach(function (cty) { if (cty && t.indexOf(" " + cty + " ") !== -1 && (!best || cty.length > best.length)) best = cty; });
    var z = t.match(/ (9[0-6]\d{3}) /); if (!best && z) best = z[1];
    return best;
  };
  Engine.prototype.cityAnswer = function (cty) {
    var c = this.c, title = cty.replace(/\b[a-z]/g, function (m) { return m.toUpperCase(); });
    var inList = this.areaWords.some(function (a) { return a === cty; });
    if (inList) return "Yes, we serve " + title + "." + (c.areaNote ? " " + c.areaNote : "") + " Want a free quote?";
    return "We're based in " + c.city + " and serve " + c.areaText + ". " + (/^\d/.test(cty) ? "For ZIP " + cty : title) + " may well be in range. Send a quick quote request and we'll confirm.";
  };
  Engine.prototype.answer = function (raw) {
    var c = this.c, t = norm(raw), self = this, R = function (text, chips, extra) { return { text: text, chips: chips || self.mainChips(), action: extra || null }; };
    if (!t.trim()) return R("Ask me anything about " + c.name + ", or tap a button below.");
    if (this.state) return this.step(raw, t);
    // custom FAQs first (most specific)
    var faqs = c.faqs || [], i, j;
    var best = null, bestScore = 0;
    for (i = 0; i < faqs.length; i++) { var sc = 0; for (j = 0; j < faqs[i].keys.length; j++) if (has(t, faqs[i].keys[j])) sc += norm(faqs[i].keys[j]).trim().split(" ").length + 0.5;
      if (sc > bestScore) { bestScore = sc; best = faqs[i]; } }
    var I = {
      quote: ["quote","estimate","bid","price","pricing","prices","cost","costs","how much","rate","rates","charge","book","booking","schedule","appointment","appt","come out","hire","cotizacion","precio","cuanto"],
      services: ["service","services","what do you do","what do you offer","offer","do you do","do you","can you","menu","list","packages","options","help with"],
      areas: ["area","areas","serve","service area","where","location","located","address","come to","travel","near","nearby","city","cities","zip","far"],
      hours: ["hour","hours","open","close","closed","closing","opening","when","today","tomorrow","weekend","saturday","sunday","monday","tuesday","wednesday","thursday","friday","holiday","horario","available","availability"],
      contact: ["phone","call","number","text","contact","email","reach","talk","speak","human","person","owner","someone","real person"],
      greet: ["hi","hello","hey","yo","good morning","good afternoon","good evening","hola","sup"],
      thanks: ["thanks","thank you","thx","ty","appreciate","gracias","awesome","great","perfect","cool","ok","okay"],
      pay: ["pay","payment","card","credit","cash","zelle","venmo","financing","finance","check"],
      ins: ["insured","insurance","license","licensed","bonded","certified"],
      about: ["who are you","about","how long","years","experience","owner","family","reviews","rating","trust","why you","why choose"],
      bye: ["bye","goodbye","later","thats all","nothing else","no thanks"]
    };
    var score = {}; Object.keys(I).forEach(function (k) { score[k] = 0; I[k].forEach(function (w) { if (has(t, w)) score[k] += norm(w).trim().split(" ").length; }); });
    // service mentions
    var hits = this.svc.map(function (s) { var sc = 0, seen = {}; s.keys.forEach(function (k) { if (!seen[k] && has(t, k)) { seen[k] = 1; sc += k.length; } }); return { s: s, sc: sc }; })
      .filter(function (h) { return h.sc > 0; }).sort(function (a, b) { return b.sc - a.sc; }).map(function (h) { return h.s; });
    var cty = this.findCity(t);
    if (best && bestScore >= 1.5) return R(best.a, best.chips);
    if (score.quote) { var pre = /how much|price|pricing|cost|rate|charge|precio|cuanto/.test(t) ? (c.priceNote || "Every job is a little different, so pricing depends on the size and details.") + " " : "";
      if (hits.length) this.lead.service = hits[0].name;
      return this.startQuote(pre); }
    if (cty) return R(this.cityAnswer(cty), ["Get a free quote", "Services", "Hours"]);
    var generic = /(what|which) (kind of |type of |other )?(services|do you do|do you offer|else do you|can you do|work)|services do you|your services|list|menu|all (of )?(your|the) services|what you do|what do you guys do/.test(t);
    if (generic) hits = [];
    if (hits.length && !score.hours) { var s0 = hits[0]; return R("Yes, we do " + s0.name + "." + (s0.desc ? " " + s0.desc : "") + " Want a free quote for it?", ["Get a free quote", "Services", "Areas served"], { setService: s0.name }); }
    var order = ["hours", "areas", "contact", "pay", "ins", "about", "services", "bye", "thanks", "greet"], top = null;
    order.forEach(function (k) { if (score[k] && (!top || score[k] > score[top])) top = k; });
    switch (top) {
      case "services": return R("Here's what " + c.short + " does:\n" + this.svc.map(function (s) { return "• " + s.name + (s.desc ? " — " + s.desc : ""); }).join("\n") + "\nAsk about any of these, or get a free quote.", ["Get a free quote", "Areas served", "Hours"]);
      case "areas": return R("We're based in " + c.city + " and serve " + c.areaText + "." + (c.areaNote ? " " + c.areaNote : "") + " Tell me your city and I'll check.", ["Get a free quote", "Services", "Hours"]);
      case "hours": return R(this.hoursText(null, t), ["Get a free quote", "Contact", "Services"]);
      case "contact": if (c.contactNote) return R(c.contactNote, ["Get a free quote", "Hours"], { contact: true }); return R("You can " + this.phoneLine() + (c.phone && c.email ? ", or email " + c.email : "") + ". Or leave your details here and we'll reach out.", ["Get a free quote", "Hours"], { contact: true });
      case "pay": return R(c.payNote || "Payment options are confirmed with your quote. Want me to start one?", ["Get a free quote", "Contact"]);
      case "ins": return R(c.insNote || ("Great question. Ask about licensing and insurance when we confirm your quote, or " + this.phoneLine() + "."), ["Get a free quote", "Contact"]);
      case "about": return R(c.about || (c.name + " is a local " + c.trade.toLowerCase() + " business in " + c.city + "."), ["Services", "Get a free quote"]);
      case "bye": return R("Thanks for stopping by! If you need anything, I'm right here.", ["Get a free quote"]);
      case "thanks": return R("You're welcome! Anything else I can help with?");
      case "greet": return R("Hi! 👋 I can answer questions about " + c.short + " or get you a free quote in under a minute.");
    }
    return R("Sorry, I didn't catch that. I can help with services, areas we serve, hours, or a free quote. Or " + this.phoneLine() + ".", null, { fallback: true });
  };
  Engine.prototype.startQuote = function (pre) {
    this.state = "name";
    return { text: (pre || "") + "Let's get you a free quote. It takes about a minute.\nFirst, what's your name?", chips: ["Cancel"], action: { quote: "start" } };
  };
  Engine.prototype.step = function (raw, t) {
    var c = this.c, L = this.lead, v = String(raw).trim(), self = this;
    if (/^ ?(cancel|stop|nevermind|never mind|quit|exit|start over) ?$/.test(t)) { this.state = null; return { text: "No problem, I stopped the quote. Anything else?", chips: this.mainChips() }; }
    switch (this.state) {
      case "name":
        if (v.length < 2 || v.length > 60) return { text: "What name should we use for the quote?", chips: ["Cancel"] };
        L.name = v.replace(/^(my name is|i am|im|it's|its|this is)\s+/i, "").replace(/^\w/, function (m) { return m.toUpperCase(); });
        this.state = "email"; return { text: "Thanks, " + L.name.split(" ")[0] + "! What's the best email to send your quote to?", chips: ["Cancel"] };
      case "email":
        var m = v.match(/[^\s@]+@[^\s@]+\.[a-z]{2,}/i);
        if (!m) return { text: "Hmm, that doesn't look like an email. Could you double-check it? (like name@example.com)", chips: ["Cancel"] };
        L.email = m[0]; this.state = "phone"; return { text: "Got it. A phone number for quick questions? (optional)", chips: ["Skip", "Cancel"] };
      case "phone":
        var digits = v.replace(/\D/g, "");
        if (/^ ?(skip|no|none|n a|na|no thanks) ?$/.test(t)) L.phone = "";
        else if (digits.length >= 10 && digits.length <= 11) L.phone = v;
        else return { text: "Please enter a 10-digit phone number, or tap Skip.", chips: ["Skip", "Cancel"] };
        if (L.service) { this.state = "details"; return { text: "What do you need done for " + L.service + "? A few details help us quote accurately" + (c.detailHint ? " (" + c.detailHint + ")" : "") + ".", chips: ["Cancel"] }; }
        this.state = "service"; return { text: "Which service do you need?", chips: this.svc.map(function (s) { return s.name; }).concat(["Something else"]) };
      case "service":
        var hit = this.svc.filter(function (s) { return norm(s.name) === norm(v) || s.keys.some(function (k) { return has(t, k); }); })[0];
        L.service = hit ? hit.name : (/something else/i.test(v) ? "Other" : (v.split(" ").length > 3 ? "Other" : v.slice(0, 80)));
        if (!hit && v.split(" ").length > 3) { L.details = v.slice(0, 600); this.state = "where"; return { text: "Got it. What city or ZIP is the job in?", chips: ["Cancel"] }; }
        this.state = "details"; return { text: "Tell me a bit about the job" + (c.detailHint ? " (" + c.detailHint + ")" : "") + ".", chips: ["Cancel"] };
      case "details":
        if (v.length < 3) return { text: "Just a few words about the job is plenty.", chips: ["Cancel"] };
        L.details = v.slice(0, 600); this.state = "where"; return { text: "Last one: what city or ZIP is the job in?", chips: ["Cancel"] };
      case "where":
        if (v.length < 2) return { text: "Which city or ZIP code?", chips: ["Cancel"] };
        L.where = v.slice(0, 80); this.state = null;
        return { text: "Perfect, " + L.name.split(" ")[0] + ". Here's your request. Tap the button to send it to " + c.short + " and they'll get back to you" + (c.replyNote ? " " + c.replyNote : "") + ".", chips: ["Start over", "Services"], action: { quote: "done", lead: this.summary() } };
    }
    this.state = null; return { text: "Let's start again. How can I help?", chips: this.mainChips() };
  };
  Engine.prototype.summary = function () {
    var L = this.lead, c = this.c;
    var body = "Hi " + c.short + ",\n\nI'd like a quote.\n\nName: " + L.name + "\nEmail: " + L.email + (L.phone ? "\nPhone: " + L.phone : "") + "\nService: " + (L.service || "-") + "\nLocation: " + L.where + "\nDetails: " + L.details + "\n\n(Sent from the chat on your website)";
    var subject = "Quote request: " + (L.service || c.trade) + " - " + L.name;
    return { name: L.name, email: L.email, phone: L.phone, service: L.service, where: L.where, details: L.details, subject: subject, body: body,
      mailto: c.email ? "mailto:" + c.email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body) : null,
      sms: c.phone ? "sms:" + c.phone.replace(/[^\d+]/g, "") + "?&body=" + encodeURIComponent(subject + ". " + L.details + " (" + L.where + "). Reply to " + L.email) : null,
      tel: c.phone ? "tel:" + c.phone.replace(/[^\d+]/g, "") : null };
  };
  Engine.prototype.reset = function () { this.state = null; this.lead = {}; };

  if (typeof module !== "undefined" && module.exports) module.exports = { Engine: Engine, norm: norm };
  if (typeof document === "undefined" || !root.CHAT_BOT) return;

  // ---------------- UI ----------------
  var C = root.CHAT_BOT, E = new Engine(C);
  C.short = C.short || C.name; C.areaText = C.areaText || (C.areas && C.areas.length ? C.areas.join(", ") : C.city + " and nearby");
  var col = C.color || "#1d4ed8", col2 = C.color2 || col, ink = C.accentInk || "#fff", off = C.offset || 20, offM = C.offsetMobile == null ? off : C.offsetMobile;
  var host = document.createElement("div"); host.id = "chat-bot-host"; host.style.cssText = "position:fixed;z-index:2147483000;right:0;bottom:0;width:0;height:0";
  var sh = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;
  var css = ":host{all:initial}*{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}" +
    ".lb{position:fixed;right:20px;bottom:" + off + "px;width:62px;height:62px;border-radius:50%;border:0;cursor:pointer;background:linear-gradient(135deg," + col + "," + col2 + ");color:" + ink + ";box-shadow:0 10px 30px rgba(0,0,0,.28);display:flex;align-items:center;justify-content:center;transition:transform .2s}" +
    ".lb:hover{transform:scale(1.06)}.lb svg{width:28px;height:28px;fill:currentColor}.lb .dot{position:absolute;top:3px;right:3px;width:14px;height:14px;border-radius:50%;background:#22c55e;border:2px solid #fff}" +
    ".tip{position:fixed;right:92px;bottom:" + (off + 8) + "px;max-width:240px;background:#fff;color:#111;padding:11px 14px;border-radius:14px 14px 4px 14px;box-shadow:0 8px 28px rgba(0,0,0,.18);font-size:14px;line-height:1.35;cursor:pointer;animation:pop .35s ease}" +
    ".tip b{display:block;margin-bottom:2px}.tip .x{position:absolute;top:-8px;left:-8px;width:22px;height:22px;border-radius:50%;border:0;background:#111;color:#fff;font-size:13px;cursor:pointer;line-height:22px;padding:0}" +
    "@keyframes pop{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}" +
    ".pn{position:fixed;right:20px;bottom:" + (off + 76) + "px;width:380px;max-width:calc(100vw - 24px);height:600px;max-height:calc(100vh - " + (off + 96) + "px);background:#f6f7f9;border-radius:18px;box-shadow:0 24px 60px rgba(0,0,0,.3);display:flex;flex-direction:column;overflow:hidden;animation:pop .25s ease}" +
    ".hd{background:linear-gradient(135deg," + col + "," + col2 + ");color:" + ink + ";padding:14px 14px 14px 16px;display:flex;align-items:center;gap:11px}" +
    ".av{width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;flex:none;border:2px solid rgba(255,255,255,.45)}" +
    ".ti{flex:1;min-width:0}.ti b{display:block;font-size:15.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ti span{font-size:12.5px;opacity:.88}.ti span:before{content:'';display:inline-block;width:8px;height:8px;border-radius:50%;background:#22c55e;margin-right:6px;vertical-align:1px}" +
    ".cl{background:rgba(255,255,255,.18);border:0;color:inherit;width:34px;height:34px;border-radius:50%;cursor:pointer;font-size:20px;line-height:34px;padding:0}" +
    ".ms{flex:1;overflow-y:auto;padding:16px 12px 8px;display:flex;flex-direction:column;gap:8px;-webkit-overflow-scrolling:touch}" +
    ".m{max-width:85%;padding:10px 13px;border-radius:16px;font-size:14.5px;line-height:1.42;white-space:pre-line;word-wrap:break-word;animation:pop .2s ease}" +
    ".b{background:#fff;color:#1f2937;border-bottom-left-radius:5px;align-self:flex-start;box-shadow:0 1px 2px rgba(0,0,0,.06)}.u{background:" + col + ";color:" + ink + ";align-self:flex-end;border-bottom-right-radius:5px}" +
    ".ty{align-self:flex-start;background:#fff;border-radius:16px;padding:12px 14px;display:flex;gap:4px}.ty i{width:7px;height:7px;border-radius:50%;background:#9ca3af;animation:bl 1s infinite}.ty i:nth-child(2){animation-delay:.15s}.ty i:nth-child(3){animation-delay:.3s}@keyframes bl{0%,60%,100%{opacity:.3}30%{opacity:1}}" +
    ".ch{display:flex;flex-wrap:wrap;gap:7px;padding:4px 12px 10px}.ch button{border:1.5px solid " + col + ";background:#fff;color:" + col + ";border-radius:999px;padding:7px 13px;font-size:13.5px;font-weight:600;cursor:pointer}.ch button:hover{background:" + col + ";color:" + ink + "}" +
    ".cd{align-self:stretch;background:#fff;border-radius:14px;padding:13px;font-size:13.5px;color:#1f2937;box-shadow:0 1px 3px rgba(0,0,0,.08);border-top:4px solid " + col + "}.cd dl{margin:0 0 10px;display:grid;grid-template-columns:auto 1fr;gap:4px 10px}.cd dt{color:#6b7280}.cd dd{margin:0;word-break:break-word}" +
    ".cd a,.cd button{display:block;text-align:center;text-decoration:none;border-radius:10px;padding:11px;font-weight:700;font-size:14.5px;margin-top:7px;cursor:pointer;border:0;width:100%}.cd .p{background:" + col + ";color:" + ink + "}.cd .s{background:#eef0f3;color:#111}" +
    ".ft{display:flex;gap:8px;padding:10px;background:#fff;border-top:1px solid #e5e7eb}.ft input{flex:1;border:1.5px solid #d1d5db;border-radius:999px;padding:11px 15px;font-size:16px;outline:none;min-width:0;color:#111;background:#fff}.ft input:focus{border-color:" + col + "}" +
    ".ft button{width:44px;height:44px;border-radius:50%;border:0;background:" + col + ";color:" + ink + ";cursor:pointer;display:flex;align-items:center;justify-content:center;flex:none}.ft svg{width:20px;height:20px;fill:currentColor}" +
    ".pw{text-align:center;font-size:11px;color:#9ca3af;padding:0 0 8px;background:#fff}.pw a{color:#9ca3af}" +
    "@media(max-width:640px){.lb{right:14px;bottom:" + offM + "px;width:58px;height:58px}.tip{right:80px;bottom:" + (offM + 6) + "px;max-width:200px;font-size:13.5px}" +
    ".pn{right:0;bottom:0;width:100vw;max-width:100vw;height:100%;max-height:100%;border-radius:0}.pn{height:100dvh;max-height:100dvh}.ft{padding-bottom:calc(10px + env(safe-area-inset-bottom))}}";
  var ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3C6.5 3 2 6.8 2 11.5c0 2.4 1.2 4.6 3.1 6.1L4.5 21l3.9-2c1.1.3 2.3.5 3.6.5 5.5 0 10-3.8 10-8.5S17.5 3 12 3zm-4 9.7a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4zm4 0a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4zm4 0a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4z"/></svg>';
  sh.innerHTML = "<style>" + css + "</style>" +
    '<button class="lb" aria-label="Chat with ' + esc(C.short) + '" title="Questions? Chat with us">' + ICON + '<span class="dot"></span></button>';
  var lb = sh.querySelector(".lb"), pn = null, ms, chEl, inp, tip = null, opened = false;
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function scroll() { ms.scrollTop = ms.scrollHeight; }
  function addMsg(text, who) { var m = el("div", "m " + who); m.textContent = text; ms.appendChild(m); scroll(); return m; }
  function chips(list) { chEl.innerHTML = ""; (list || []).forEach(function (t) { var b = el("button", null); b.type = "button"; b.textContent = t; b.onclick = function () { send(t); }; chEl.appendChild(b); }); }
  function card(L) {
    var d = el("div", "cd"), rows = [["Name", L.name], ["Email", L.email]].concat(L.phone ? [["Phone", L.phone]] : []).concat([["Service", L.service || "-"], ["Location", L.where], ["Details", L.details]]);
    d.innerHTML = "<dl>" + rows.map(function (r) { return "<dt>" + r[0] + "</dt><dd>" + esc(r[1]) + "</dd>"; }).join("") + "</dl>" +
      (L.mailto ? '<a class="p" data-act="mail" href="' + esc(L.mailto) + '" target="_top">✉️ Send quote request</a>' : "") +
      (L.sms ? '<a class="' + (L.mailto ? "s" : "p") + '" data-act="sms" href="' + esc(L.sms) + '">💬 Text it instead</a>' : "") +
      (L.tel ? '<a class="s" data-act="tel" href="' + esc(L.tel) + '">📞 Call ' + esc(C.phone) + "</a>" : "") +
      '<button class="s" data-act="copy" type="button">Copy request</button>';
    d.querySelector('[data-act="copy"]').onclick = function () { var b = this; try { navigator.clipboard.writeText(L.subject + "\n\n" + L.body).then(function () { b.textContent = "Copied ✓"; }); } catch (e) { b.textContent = "Select & copy the details above"; } };
    var a = d.querySelector('[data-act="mail"]'); if (a) a.addEventListener("click", function () { setTimeout(function () { addMsg("Your email app should open with everything filled in. Just hit send. If it didn't open, " + (C.phone ? "text or call " + C.phone : "email " + C.email) + ".", "b"); }, 600); });
    ms.appendChild(d); scroll();
    if (typeof C.onLead === "function") try { C.onLead(L); } catch (e) {}
  }
  function reply(r) {
    var ty = el("div", "ty", "<i></i><i></i><i></i>"); ms.appendChild(ty); scroll(); chips([]);
    setTimeout(function () { ty.remove(); addMsg(r.text, "b"); if (r.action && r.action.lead) card(r.action.lead); if (r.action && r.action.setService) E.lead.service = r.action.setService; chips(r.chips); if (window.matchMedia && !window.matchMedia("(max-width:640px)").matches) inp.focus(); }, Math.min(900, 350 + r.text.length * 4));
  }
  function send(text) {
    text = String(text || "").trim(); if (!text) return; addMsg(text, "u"); inp.value = "";
    var r;
    if (/^start over$/i.test(text)) { E.reset(); r = { text: "Sure. What can I help you with?", chips: E.mainChips() }; }
    else if (/^(get a free quote|get a quote)$/i.test(text) && !E.state) { var keep = E.lead.service; E.reset(); E.lead.service = keep; r = E.startQuote(""); }
    else if (/^areas served$/i.test(text) && !E.state) r = E.answer("what areas do you serve");
    else if (/^contact$/i.test(text) && !E.state) r = E.answer("contact");
    else r = E.answer(text);
    reply(r);
  }
  function build() {
    pn = el("div", "pn"); pn.setAttribute("role", "dialog"); pn.setAttribute("aria-label", "Chat with " + C.short);
    pn.innerHTML = '<div class="hd"><div class="av">' + esc(C.avatar || C.short.replace(/[^A-Za-z0-9 ]/g, "").split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase()) + '</div><div class="ti"><b>' + esc(C.short) + '</b><span>' + esc(C.status || "Online · replies instantly") + '</span></div><button class="cl" aria-label="Close chat">×</button></div>' +
      '<div class="ms" aria-live="polite"></div><div class="ch"></div><form class="ft"><input type="text" placeholder="Type your question…" aria-label="Message" autocomplete="off" enterkeyhint="send"><button type="submit" aria-label="Send"><svg viewBox="0 0 24 24"><path d="M2 21 23 12 2 3v7l15 2-15 2z"/></svg></button></form>' +
      '<div class="pw">' + (C.credit || "Virtual assistant · answers are automated") + "</div>";
    sh.appendChild(pn);
    ms = pn.querySelector(".ms"); chEl = pn.querySelector(".ch"); inp = pn.querySelector("input");
    pn.querySelector(".cl").onclick = toggle; pn.querySelector("form").onsubmit = function (e) { e.preventDefault(); send(inp.value); };
    addMsg(C.welcome || ("Hi! 👋 Welcome to " + C.name + ". I can answer questions about our services, areas, and hours, or get you a free quote in about a minute."), "b");
    chips(E.mainChips());
  }
  function toggle() {
    if (tip) { tip.remove(); tip = null; }
    if (!pn) build(); else pn.style.display = pn.style.display === "none" ? "flex" : "none";
    opened = pn.style.display !== "none"; lb.style.display = opened && window.matchMedia("(max-width:640px)").matches ? "none" : "flex";
    if (!opened) lb.style.display = "flex";
    if (opened && !window.matchMedia("(max-width:640px)").matches) inp.focus();
  }
  lb.onclick = toggle;
  root.ChatBot = { open: function () { if (!opened) toggle(); }, send: function (t) { if (!opened) toggle(); send(t); }, engine: E };
  function mount() {
    document.body.appendChild(host);
    var mob = window.matchMedia && window.matchMedia("(max-width:640px)").matches;
    if (C.autoOpen && !mob) setTimeout(function () { if (!opened) toggle(); }, C.autoOpen === true ? 900 : C.autoOpen);
    else setTimeout(function () { if (opened) return; tip = el("div", "tip", '<button class="x" aria-label="Dismiss">×</button><b>' + esc(C.tipTitle || "Questions? 👋") + "</b>" + esc(C.tipText || "Get a free quote in about a minute.")); sh.appendChild(tip);
      tip.onclick = function (e) { if (e.target.className === "x") { tip.remove(); tip = null; } else toggle(); }; }, C.tipDelay || 2500);
  }
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);
})(typeof window !== "undefined" ? window : this);
