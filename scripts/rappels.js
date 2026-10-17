const admin = require("firebase-admin");
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const WINDOW = 10; // minutes de tolérance si GitHub démarre en retard

(async () => {
  const db = admin.firestore();
  const snap = await db.doc("app/state").get();
  if (!snap.exists) return console.log("Pas de données.");
  const S = snap.data();
  const parts = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const g = t => parts.find(p => p.type === t).value;
  const today = `${g("year")}-${g("month")}-${g("day")}`;
  if (S.day !== today) return console.log("Pas le jour du trajet.");
  const now = +g("hour") * 60 + +g("minute");
  const mins = h => { if (!h) return null; const [a, b] = h.split(":"); return +a * 60 + +b; };
  const due = target => target !== null && now - target >= 0 && now - target <= WINDOW;

  const sentRef = db.doc("app/sent");
  let sent = (await sentRef.get()).data() || {};
  if (sent.day !== today) sent = { day: today, keys: {} };

  const msgs = [];
  const dep = mins(S.depart);
  if (dep !== null && due(dep - 30)) msgs.push({ key: `dep30|${S.depart}`, title: "🚀 Départ dans 30 min", body: `Le conducteur part à ${S.depart}.`, all: true });
  for (const r of S.riders || []) {
    const p = mins(r.pickup);
    if (p === null) continue;
    if (due(p - 15)) msgs.push({ key: `p15|${r.id}|${r.pickup}`, title: "🛰 Ramassage dans 15 min", body: `${r.name} sera récupéré à ${r.pickup}.`, ids: ["driver", r.id] });
    if (due(p)) msgs.push({ key: `p0|${r.id}|${r.pickup}`, title: "📍 C’est l’heure !", body: `Ramassage de ${r.name} maintenant.`, ids: ["driver", r.id] });
  }
  const todo = msgs.filter(m => !sent.keys[m.key]);
  if (!todo.length) return console.log("Rien à envoyer.");

  const toks = (await db.collection("tokens").get()).docs.map(d => ({ t: d.id, id: d.data().riderId }));
  for (const m of todo) {
    sent.keys[m.key] = Date.now();
    const targets = toks.filter(x => m.all || m.ids.includes(x.id)).map(x => x.t);
    if (!targets.length) { console.log("Aucun appareil pour", m.key); continue; }
    const res = await admin.messaging().sendEachForMulticast({ tokens: targets, data: { title: m.title, body: m.body }, webpush: { headers: { Urgency: "high" } } });
    console.log(m.title, "→", res.successCount, "ok /", res.failureCount, "échecs");
    res.responses.forEach((r, i) => { if (!r.success && /not-registered|invalid-registration/.test((r.error && r.error.code) || "")) db.collection("tokens").doc(targets[i]).delete(); });
  }
  await sentRef.set(sent);
})().catch(e => { console.error(e); process.exit(1); });
