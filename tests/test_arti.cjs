const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const D = require("../web/arti-domain.js");
const demo = require("../web/demo.js");
const seed = JSON.parse(fs.readFileSync("web/demo-data.json"));
function fixture() {
  let db = demo.initialize(seed);
  D.ensure(db);
  const user = (name) =>
    db.users.find((u) => u.email === name + "@artivo.demo");
  const call = (name, path, data) => {
    const draft = structuredClone(db);
    const result = demo.dispatch(
      draft,
      "/api/arti/" + path,
      data,
      user(name).id,
    );
    db = draft;
    return result;
  };
  return {
    call,
    user,
    get db() {
      return db;
    },
  };
}
function offer(f, name = "gary", date = 3) {
  return f.call(name, "opportunity/1/apply", {
    date_ids: [date],
    rate: 30000,
    start_time: "21:00",
    end_time: "01:00",
    conditions: "Transporte incluido",
  }).id;
}
function accepted(f) {
  const id = offer(f);
  return f.call("business", "offer/" + id + "/accept", {}).event_id;
}
function invoice(f) {
  const eventId = accepted(f);
  for (const [actor, action] of [
    ["gary", "arrival"],
    ["gary", "setup"],
    ["business", "verify_setup"],
    ["gary", "start"],
    ["gary", "complete"],
    ["business", "verify"],
  ])
    f.call(actor, "event/" + eventId + "/" + action, {});
  return f.db.arti.invoices.find((i) => i.event_id === eventId);
}
test("additive seed has all populations and 50 opportunities / 100 events", () => {
  const f = fixture(),
    a = f.db.arti;
  assert.equal(50, a.opportunities.length);
  assert.equal(100, a.events.length);
  assert.ok(f.db.artists.length >= 10);
  assert.equal(5, f.db.users.filter((u) => D.role(u) === "LEADER").length);
  assert.equal(3, f.db.users.filter((u) => D.role(u) === "AGENCY").length);
  assert.equal(5, a.credits.length);
  assert.equal(10, a.venues.length);
  assert.equal(3, f.db.artists.filter((p) => p.category_id === 6).length);
  assert.ok(a.disputes.length > 1);
  assert.ok(a.payments.length > 1);
  assert.ok(a.invoices.filter((i) => i.fastpay_fee > 0).length > 1);
  assert.ok(f.db.artists.every((p) => p.media_url));
  const counts = [a.events.length, f.db.users.length];
  D.ensure(f.db);
  assert.deepEqual(counts, [a.events.length, f.db.users.length]);
});
test("negotiation price, schedule and conditions reach booking / invoice unchanged", () => {
  const f = fixture(),
    id = offer(f);
  f.call("business", "offer/" + id + "/counter", {
    rate: 27500,
    start_time: "21:00",
    end_time: "01:00",
    conditions: "Transporte incluido",
  });
  f.call("gary", "offer/" + id + "/counter", {
    rate: 27500,
    start_time: "21:00",
    end_time: "01:00",
    conditions: "Transporte + comida",
  });
  const e = f.call("business", "offer/" + id + "/accept", {});
  const event = f.db.arti.events.find((x) => x.id === e.event_id);
  assert.equal(27500, event.rate);
  assert.equal("21:00", event.start.slice(11, 16));
  assert.equal("01:00", event.end.slice(11, 16));
  assert.equal("Transporte + comida", event.conditions);
  assert.equal(4, f.db.arti.offers.find((x) => x.id === id).rounds.length);
  assert.equal(0, f.db.arti.holds.filter((h) => h.offer_id === id).length);
});
test("self acceptance and nonparticipants blocked; transaction preserves state on failure", () => {
  const f = fixture(),
    id = offer(f),
    before = JSON.stringify(f.db);
  assert.throws(
    () => f.call("gary", "offer/" + id + "/accept", {}),
    /otra parte/,
  );
  assert.equal(JSON.stringify(f.db), before);
  assert.throws(
    () => f.call("cliente", "offer/" + id + "/counter", { rate: 1 }),
    /No participas/,
  );
});
test("holds expire and rejection releases dates", () => {
  const f = fixture(),
    id = offer(f);
  assert.ok(f.call("gary", "workspace").holds.some((h) => h.offer_id === id));
  f.db.arti.holds
    .filter((h) => h.offer_id === id)
    .forEach((h) => (h.expires = "2000-01-01T00:00:00Z"));
  assert.equal(
    0,
    f.call("gary", "workspace").holds.filter((h) => h.offer_id === id).length,
  );
  f.call("gary", "offer/" + id + "/reject", {});
  assert.equal(0, f.db.arti.holds.filter((h) => h.offer_id === id).length);
});
test("one-capacity slot cannot be promised twice; private slot counts remain accurate", () => {
  const f = fixture();
  accepted(f);
  assert.throws(() => offer(f, "elena"), /plazas/);
  const o = f.call("elena", "workspace").opportunities.find((o) => o.id === 1);
  assert.equal(1, o.slot_counts.find((c) => c.date_id === 3).booked);
});
test("service verification separates supplier from requester and yields unique invoice", () => {
  const f = fixture(),
    i = invoice(f);
  assert.equal("ACCEPTED", i.status);
  assert.equal(30000, i.total);
  assert.equal(90, i.terms);
  assert.throws(
    () => f.call("gary", "event/" + i.event_id + "/verify", {}),
    /solicitante/,
  );
  assert.equal(
    1,
    f.db.arti.invoices.filter((x) => x.event_id === i.event_id).length,
  );
  assert.throws(() =>
    f.call("business", "event/" + i.event_id + "/arrival", {}),
  );
});
test("fastpay and finance are mocks with balanced ledger, unique payout and correct fees", () => {
  const f = fixture(),
    i = invoice(f);
  f.call("gary", "invoice/" + i.id + "/finance", {});
  f.call("gary", "invoice/" + i.id + "/insurance", {});
  f.call("gary", "invoice/" + i.id + "/fastpay", {});
  const paid = f.db.arti.invoices.find((x) => x.id === i.id);
  assert.equal(25725, paid.net);
  assert.equal(600, paid.fastpay_fee);
  assert.equal("PAID_TODAY", paid.payout_status);
  assert.throws(
    () => f.call("gary", "invoice/" + i.id + "/fastpay", {}),
    /liquidada/,
  );
  for (const l of f.db.arti.ledger)
    assert.equal(
      l.entries.reduce((s, x) => s + x.debit - x.credit, 0),
      0,
    );
  assert.equal(
    "APPROVED",
    f.db.arti.financing.find((x) => x.invoice_id === i.id).status,
  );
  assert.equal(false, !!paid.customer_paid);
  f.call("business", "invoice/" + i.id + "/pay", {});
  assert.equal(
    "SETTLED",
    f.db.arti.financing.find((x) => x.invoice_id === i.id).status,
  );
  assert.equal(
    1,
    f.db.arti.ledger.filter((x) => x.reference === "provider-payout-" + i.id)
      .length,
  );
});
test("failed, processing, overdue payments do not create settlement", () => {
  const f = fixture(),
    i = invoice(f);
  for (const mode of ["failed", "processing", "overdue"]) {
    f.call("business", "invoice/" + i.id + "/pay", { mode });
    assert.equal(
      false,
      !!f.db.arti.invoices.find((x) => x.id === i.id).settled,
    );
  }
  f.call("business", "invoice/" + i.id + "/pay", {});
  assert.equal(true, f.db.arti.invoices.find((x) => x.id === i.id).settled);
});
test("late warning is reversible; dispute stops payout and only admin resolves", () => {
  const f = fixture(),
    eventId = accepted(f);
  f.call("gary", "event/" + eventId + "/late", {});
  assert.equal(17, f.db.arti.events.find((e) => e.id === eventId).late_minutes);
  f.call("gary", "event/" + eventId + "/dispute", {
    reason: "GPS demo discrepante",
  });
  const d = f.db.arti.disputes.at(-1);
  assert.throws(
    () =>
      f.call("business", "dispute/" + d.id, {
        status: "RESOLVED",
        note: "Revisado",
      }),
    /Admin/,
  );
  f.call("admin", "dispute/" + d.id, {
    status: "RESOLVED",
    note: "Evidencia revisada",
  });
  assert.equal(
    "REVERSED",
    f.db.arti.events.find((e) => e.id === eventId).penalty.status,
  );
});
test("teams require leader ownership and member consent", () => {
  const f = fixture();
  assert.throws(() => f.call("gary", "teams", { name: "Invalid" }), /líder/);
  const t = f.call("lider", "teams", { name: "Nueva Banda" });
  f.call("lider", "team/" + t.id + "/member", {
    user_id: 2,
    instrument: "Piano",
  });
  assert.equal(
    "INVITED",
    f.db.arti.teams.find((x) => x.id === t.id).members[0].status,
  );
  f.call("gary", "team/" + t.id + "/join", { accept: true });
  assert.equal(
    "ACCEPTED",
    f.db.arti.teams.find((x) => x.id === t.id).members[0].status,
  );
});
test("owner invitation can be accepted by invited provider", () => {
  const f = fixture(),
    r = f.call("business", "opportunity/1/invite", {
      user_id: 2,
      date_ids: [4],
    });
  const result = f.call("gary", "offer/" + r.id + "/accept", {});
  assert.ok(result.event_id);
});
test("enterprise publishes series into marketplace / existing feed adapter remains intact", () => {
  const f = fixture(),
    r = f.call("business", "opportunities", {
      title: "Viernes en vivo",
      venue_id: 1,
      category: "Pianista",
      currency: "EUR",
      rate: 27500,
      date: f.db.arti.base.slice(0, 4) * 1 + 1 + "-10-10",
      start_time: "20:00",
      end_time: "00:00",
      count: 13,
      interval_days: 7,
      quantity: 2,
      terms: 60,
      requirements: "Equipo propio",
      deadline: "2027-10-09",
    });
  const o = f
    .call("gary", "workspace")
    .opportunities.find((x) => x.id === r.id);
  assert.equal(13, o.dates.length);
  assert.equal("EUR", o.currency);
  assert.throws(
    () => f.call("business", "opportunities", { venue_id: 3 }),
    /Moneda|venue/,
  );
});
test("scenario seeds are functional and configuration survives reset", () => {
  const f = fixture();
  for (const s of D.scenarios)
    assert.ok(f.call("admin", "scenario", { id: s.id }).message);
  f.call("admin", "settings", { fastpay_bps: 300 });
  const codeCount = f.db.users.length;
  f.call("admin", "reset", {});
  assert.equal(300, f.db.arti.settings.fastpay_bps);
  assert.equal(100, f.db.arti.events.length);
  assert.equal(50, f.db.arti.opportunities.length);
  assert.equal(codeCount, f.db.users.length);
});
test("mock media validates MIME and size and writes a local portfolio post", () => {
  const f = fixture(),
    n = f.db.posts.length;
  f.call("gary", "media", {
    caption: "Portfolio nuevo",
    file: {
      mime_type: "image/png",
      size: 10,
      data_url: "data:image/png;base64,aGVsbG8=",
    },
  });
  assert.equal(n + 1, f.db.posts.length);
  assert.throws(() =>
    f.call("gary", "media", {
      file: {
        mime_type: "text/html",
        size: 10,
        data_url: "data:text/html;base64,aA==",
      },
    }),
  );
});
test("DEMO_MODE false cannot activate simulated financial services", () => {
  const f = fixture();
  global.ARTI_DEMO_MODE = false;
  try {
    assert.throws(() => f.call("admin", "workspace"), /reales/);
  } finally {
    delete global.ARTI_DEMO_MODE;
  }
});
test("legacy calendar cannot accept over a new ARTI booking including call time", () => {
  const f = fixture(),
    eid = accepted(f),
    e = f.db.arti.events.find((x) => x.id === eid);
  assert.equal(
    false,
    demo.free(f.db, 2, e.start.slice(0, 16), e.end.slice(0, 16)),
  );
});
test("nonparticipant event / invoice / evidence access is blocked", () => {
  const f = fixture(),
    i = invoice(f);
  assert.throws(
    () => f.call("cliente", "invoice/" + i.id + "/finance", {}),
    /participantes/,
  );
  assert.equal(
    false,
    f.call("cliente", "workspace").events.some((x) => x.id === i.event_id),
  );
});
test("credit is reserved for NET terms and released by enterprise payment, not early payout", () => {
  const f = fixture(),
    before = f.db.arti.credits.find((c) => c.owner_id === 8).used,
    i = invoice(f);
  assert.equal(
    before + i.total,
    f.db.arti.credits.find((c) => c.owner_id === 8).used,
  );
  f.call("gary", "invoice/" + i.id + "/fastpay", {});
  assert.equal(
    before + i.total,
    f.db.arti.credits.find((c) => c.owner_id === 8).used,
  );
  f.call("business", "invoice/" + i.id + "/pay", {});
  assert.equal(before, f.db.arti.credits.find((c) => c.owner_id === 8).used);
});
test("professional posts and interactions persist under enterprise identity", () => {
  const f = fixture();
  f.call("business", "social", { body: "Convocatoria de talento" });
  const p = f.db.arti.professional_posts[0];
  f.call("gary", "social/" + p.id + "/like", {});
  f.call("gary", "social/" + p.id + "/comment", {
    body: "Disponible para negociar",
  });
  assert.equal(1, f.db.arti.professional_posts[0].likes.length);
  assert.equal(1, f.db.arti.professional_posts[0].comments.length);
});
test("demo clock advances without mutating original scheduled start or server time", () => {
  const f = fixture(),
    eid = accepted(f),
    start = f.db.arti.events.find((e) => e.id === eid).start;
  f.call("gary", "event/" + eid + "/clock", {});
  const e = f.db.arti.events.find((e) => e.id === eid);
  assert.equal(start, e.start);
  assert.equal(120000, Date.parse(e.call_time) - Date.parse(e.demo_clock_at));
});
test("presenter advances the complete operational cycle and actually pays invoice once", () => {
  const f = fixture();
  const eid = accepted(f);
  for (let n = 0; n < 12; n++) f.call("admin", "event/" + eid + "/next", {});
  const e = f.db.arti.events.find((e) => e.id === eid),
    i = f.db.arti.invoices.find((i) => i.event_id === eid);
  assert.equal("SETTLED", e.status);
  assert.equal(true, i.customer_paid);
  assert.equal("PAID", i.status);
  assert.equal(
    1,
    f.db.arti.ledger.filter((x) => x.reference === "provider-payout-" + i.id)
      .length,
  );
  assert.throws(
    () => f.call("admin", "event/" + eid + "/next", {}),
    /siguiente/,
  );
});
