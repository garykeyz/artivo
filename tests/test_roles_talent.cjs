const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const A = require("../web/arti-access.js");
const T = require("../web/arti-talent.js");
const D = require("../web/arti-domain.js");
const demo = require("../web/demo.js");
function fixture() {
  let db = demo.initialize(JSON.parse(fs.readFileSync("web/demo-data.json")));
  D.ensure(db);
  const user = (name) =>
    typeof name === "number"
      ? db.users.find((u) => u.id === name)
      : db.users.find((u) => u.email === name + "@artivo.demo");
  const call = (name, path, data) => {
    const draft = structuredClone(db),
      result = demo.dispatch(
        draft,
        path.startsWith("/api/") ? path : "/api/arti/" + path,
        data,
        user(name).id,
      );
    db = draft;
    return result;
  };
  return {
    user,
    call,
    get db() {
      return db;
    },
  };
}
test("all six roles see feed and help but only their own workspaces", () => {
  for (const role of [
    "CLIENT",
    "ARTIST",
    "LEADER",
    "ENTERPRISE",
    "AGENCY",
    "ADMIN",
  ]) {
    const n = A.navigation(role);
    assert.ok(n.some((n) => n.id === "feed"));
    assert.ok(n.some((n) => n.id === "help"));
    assert.ok(n.every((n) => A.can(role, n.permission)));
  }
  assert.equal(A.route("ARTIST", "credit"), null);
  assert.equal(A.route("ARTIST", "users"), null);
  assert.equal(A.route("ENTERPRISE", "teams"), null);
  assert.equal(A.route("LEADER", "settings"), null);
  assert.equal(A.route("AGENCY", "insurance"), null);
  assert.ok(A.route("ADMIN", "taxonomy"));
  assert.ok(A.route("ADMIN", "moderation"));
});
test("permissions reject domain and legacy admin attempts, preserve independent financial visibility", () => {
  const f = fixture();
  for (const path of ["settings", "taxonomy", "credit/1"])
    assert.throws(() => f.call("gary", path, {}), /permiso|Admin/);
  assert.throws(
    () =>
      f.call("business", "team/1/member", { user_id: 2, instrument: "Piano" }),
    /permiso/,
  );
  assert.throws(
    () => f.call("agencia", "/api/admin/settings", { commission_bps: 2000 }),
    /Admin/,
  );
  const w = f.call("gary", "workspace");
  assert.equal(w.credits.length, 0);
  assert.equal(w.financing.length, 0);
  assert.equal(w.insurance.length, 0);
  assert.equal(w.ledger.length, 0);
  assert.ok(w.users.every((u) => !u.email));
});
test("tutorial status, progress, role and module persist independently and validate input", () => {
  const f = fixture();
  assert.equal(f.call("gary", "tutorial").status, "NOT_STARTED");
  f.call("gary", "tutorial", { status: "IN_PROGRESS", step: 3 });
  assert.equal(f.call("gary", "tutorial").step, 3);
  assert.equal(f.call("business", "tutorial").status, "NOT_STARTED");
  f.call("business", "tutorial", { status: "SKIPPED", step: 0 });
  assert.equal(f.call("business", "tutorial").status, "SKIPPED");
  assert.equal(f.call("gary", "tutorial?module=general").status, "NOT_STARTED");
  f.call("gary", "tutorial", { status: "COMPLETED", step: 7 });
  assert.equal(f.call("gary", "tutorial").status, "COMPLETED");
  assert.throws(
    () => f.call("gary", "tutorial", { status: "BAD", step: 0 }),
    /inválido/,
  );
  assert.throws(
    () => f.call("gary", "tutorial", { status: "IN_PROGRESS", step: 99 }),
    /número/,
  );
  for (const r of [
    "CLIENT",
    "ARTIST",
    "LEADER",
    "ENTERPRISE",
    "AGENCY",
    "ADMIN",
  ])
    assert.ok(A.steps(r).every((s) => A.route(r, s.page)));
});
test("additive universal talent seed covers every root, minimum populations, media, availability and events", () => {
  const f = fixture(),
    db = f.db;
  for (const cat of T.categoryOptions(db)) {
    const profiles = db.artists.filter((p) => p.primary_category === cat.key);
    assert.ok(profiles.length, cat.key);
    assert.ok(
      profiles.every((p) =>
        db.posts.some((post) => post.artist_id === p.user_id),
      ),
    );
    assert.ok(
      profiles.every((p) =>
        db.availability.some((a) => a.artist_id === p.user_id),
      ),
    );
    assert.ok(
      db.arti.opportunities.some((o) => o.category_key === cat.key) ||
        ["MUSIC", "DJ", "VOCAL", "BAND"].includes(cat.key),
    );
  }
  for (const [specialty, count] of [
    ["Sound Engineer", 3],
    ["Lighting Technician", 3],
    ["Lighting Designer", 2],
    ["Video Technician", 2],
    ["Stage Manager", 2],
    ["Stagehand", 2],
    ["Dancer", 3],
    ["Dance Crew", 2],
    ["Acrobat", 2],
    ["Aerialist", 2],
    ["Host / MC", 2],
    ["Event Photographer", 2],
    ["Videographer", 2],
    ["Production Manager", 2],
    ["Technical Director", 2],
    ["AV Technician", 2],
    ["Equipment Provider", 2],
    ["Production Company", 2],
  ])
    assert.ok(
      db.artists.filter((p) => p.specialties.some((s) => s.name === specialty))
        .length >= count,
      specialty,
    );
  const counts = [
    db.users.length,
    db.arti.events.length,
    db.arti.opportunities.length,
  ];
  D.ensure(db);
  assert.deepEqual(counts, [
    db.users.length,
    db.arti.events.length,
    db.arti.opportunities.length,
  ]);
});
test("search distinguishes technical category, skill, certification and multiple specialties", () => {
  const f = fixture();
  const audio = f.call(
    "business",
    "/api/artists?talent_category=AUDIO&skill=Dante",
  );
  assert.equal(audio.length, 3);
  assert.ok(audio.every((p) => p.primary_category === "AUDIO"));
  const lighting = f.call(
    "business",
    "/api/artists?talent_category=LIGHTING&skill=Art-Net",
  );
  assert.equal(lighting.length, 5);
  const aerial = f.call(
    "business",
    "/api/artists?talent_category=ACROBATICS&certified=1",
  );
  assert.equal(aerial.length, 0);
});
test("technical negotiation produces a contractual four-hour call and full operation through payment", () => {
  const f = fixture(),
    profile = f.db.artists.find((p) =>
      p.specialties.some((s) => s.name === "Lighting Technician"),
    ),
    o = f.db.arti.opportunities.find((o) => o.category_key === "LIGHTING");
  const id = f.call(profile.user_id, "opportunity/" + o.id + "/apply", {
    date_ids: [2],
    rate: 20000,
    start_time: "20:00",
    end_time: "00:00",
    conditions: "US$200 + transportation",
  }).id;
  f.call("business", "offer/" + id + "/counter", {
    rate: 18000,
    start_time: "20:00",
    end_time: "00:00",
    conditions: "Transporte incluido",
  });
  const eventId = f.call(
      profile.user_id,
      "offer/" + id + "/accept",
      {},
    ).event_id,
    e = f.db.arti.events.find((e) => e.id === eventId);
  assert.equal((Date.parse(e.start) - Date.parse(e.call_time)) / 60000, 240);
  assert.equal(e.operational_minutes, 480);
  assert.equal(e.rate, 18000);
  assert.equal(e.booking_type, "TECHNICAL_BOOKING");
  f.call(profile.user_id, "event/" + eventId + "/arrival", {});
  assert.throws(
    () =>
      f.call(profile.user_id, "event/" + eventId + "/technical", {
        stage: "READY",
      }),
    /orden/,
  );
  for (const stage of [
    "LOAD_IN",
    "SETUP_STARTED",
    "SETUP_COMPLETED",
    "SOUNDCHECK",
    "READY",
  ])
    f.call(profile.user_id, "event/" + eventId + "/technical", { stage });
  f.call(profile.user_id, "event/" + eventId + "/setup", {});
  f.call("business", "event/" + eventId + "/verify_setup", {});
  f.call(profile.user_id, "event/" + eventId + "/start", {});
  f.call(profile.user_id, "event/" + eventId + "/complete", {});
  assert.throws(
    () => f.call("business", "event/" + eventId + "/verify", {}),
    /strike/,
  );
  for (const stage of ["STRIKE_STARTED", "STRIKE_COMPLETED"])
    f.call(profile.user_id, "event/" + eventId + "/technical", { stage });
  f.call("business", "event/" + eventId + "/verify", {});
  const invoice = f.db.arti.invoices.find((i) => i.event_id === eventId);
  f.call(profile.user_id, "invoice/" + invoice.id + "/fastpay", {});
  assert.equal(
    f.db.arti.invoices.find((i) => i.id === invoice.id).payout_status,
    "PAID_TODAY",
  );
  assert.equal(
    f.db.arti.invoices.find((i) => i.id === invoice.id).customer_paid,
    false,
  );
  f.call("business", "invoice/" + invoice.id + "/pay", {});
  assert.equal(
    f.db.arti.invoices.find((i) => i.id === invoice.id).customer_paid,
    true,
  );
});
test("matching and assignment reject incompatible profession and unverified sensitive documents", () => {
  const f = fixture(),
    p = f.db.artists.find((p) => p.primary_category === "ACROBATICS"),
    o = f.db.arti.opportunities.find((o) => o.category_key === "ACROBATICS");
  assert.throws(
    () =>
      f.call(p.user_id, "opportunity/" + o.id + "/apply", {
        date_ids: [2],
        rate: o.rate,
        start_time: "20:00",
        end_time: "00:00",
        conditions: o.requirements,
      }),
    /documentos/,
  );
  assert.throws(
    () =>
      f.call(p.user_id, "certification/" + p.user_id + "/verify", {
        id: 1,
        approve: true,
      }),
    /Admin/,
  );
  f.call("admin", "certification/" + p.user_id + "/verify", {
    id: 1,
    approve: true,
  });
  assert.equal(
    f.call("business", "/api/artists?talent_category=ACROBATICS&certified=1")
      .length,
    1,
  );
  assert.ok(
    f.call(p.user_id, "opportunity/" + o.id + "/apply", {
      date_ids: [2],
      rate: o.rate,
      start_time: "20:00",
      end_time: "00:00",
      conditions: o.requirements,
    }).id,
  );
  const light = f.db.arti.events.find(
    (e) => e.category_key === "LIGHTING" && e.status === "CONFIRMED",
  );
  assert.throws(
    () =>
      f.call("business", "event/" + light.id + "/replace", { artist_id: 2 }),
    /incompatibles/,
  );
});
test("package booking produces profession slots, rejects double occupancy and supports a two-engineer team", () => {
  const f = fixture(),
    o = f.db.arti.opportunities.find(
      (o) => o.title === "FOH Engineer + Monitor Engineer",
    ),
    audio = f.db.artists.filter((p) => p.primary_category === "AUDIO");
  const id = f.call("lider", "opportunity/" + o.id + "/apply", {
    date_ids: [1],
    rate: 55000,
    start_time: "20:00",
    end_time: "00:00",
    conditions: "FOH US$300 + Monitor US$250",
  }).id;
  const eid = f.call("business", "offer/" + id + "/accept", {}).event_id;
  assert.equal(
    f.db.arti.events.find((e) => e.id === eid).staffing_assignments.length,
    2,
  );
  f.call("lider", "event/" + eid + "/assign_slot", {
    slot_id: "1-1",
    provider_id: audio[0].user_id,
  });
  assert.throws(
    () =>
      f.call("lider", "event/" + eid + "/assign_slot", {
        slot_id: "2-1",
        provider_id: audio[0].user_id,
      }),
    /otra plaza/,
  );
  f.call("lider", "event/" + eid + "/assign_slot", {
    slot_id: "2-1",
    provider_id: audio[1].user_id,
  });
  const summary = T.staffingSummary(f.db, o);
  assert.equal(summary.total, 2);
  assert.equal(summary.filled, 2);
  assert.equal(summary.missing, 0);
  assert.ok(
    D.conflict(
      f.db,
      audio[0].user_id,
      f.db.arti.events.find((e) => e.id === eid).start,
      f.db.arti.events.find((e) => e.id === eid).end,
    ),
  );
  const mass = f.db.arti.opportunities.find(
    (o) => o.title === "30 profesionales · 20 eventos",
  );
  assert.equal(T.staffingSummary(f.db, mass).total, 600);
});
test("taxonomy administration creates, edits, disables and reorders without deleting old records", () => {
  const f = fixture(),
    initial = f.db.arti.taxonomy.length;
  f.call("admin", "taxonomy", {
    kind: "CATEGORY",
    name: "New Specialty",
    technical: true,
  });
  const n = f.db.arti.taxonomy.at(-1);
  f.call("admin", "taxonomy/" + n.id + "/edit", { name: "New Service" });
  f.call("admin", "taxonomy/" + n.id + "/reorder", { order: 0 });
  f.call("admin", "taxonomy/" + n.id + "/disable", {});
  assert.equal(f.db.arti.taxonomy.length, initial + 1);
  assert.equal(f.db.arti.taxonomy.at(-1).enabled, false);
  assert.equal(f.db.arti.taxonomy.at(-1).name, "New Service");
  assert.equal(f.db.arti.taxonomy.at(-1).order, 0);
});
test("professional profile allows cross-discipline identities, structured rates and pending documents", () => {
  const f = fixture(),
    tax = f.db.arti.taxonomy,
    specialties = tax.filter(
      (t) =>
        t.kind === "SPECIALTY" && ["Pianist", "Resort DJ"].includes(t.name),
    );
  f.call("gary", "talent_profile", {
    primary_category: "MUSIC",
    entity_type: "INDIVIDUAL",
    specialties: specialties.map((t) => t.id),
    skills: [],
    rates: { event_rate: 25000, hourly_rate: 5000 },
    currency: "USD",
    years_experience: 9,
  });
  const p = f.db.artists.find((p) => p.user_id === 2);
  assert.equal(p.specialties.length, 2);
  assert.equal(p.rates.hourly_rate, 5000);
  assert.ok(T.compatible(p, { category_key: "DJ" }));
  f.call("gary", "certification/2", {
    name: "Demo training",
    issuer: "Sample school",
    document: "Synthetic reference",
    issue_date: "2026-01-01",
    expiration_date: "2027-01-01",
  });
  assert.equal(
    f.db.artists.find((p) => p.user_id === 2).certifications[0]
      .verification_status,
    "PENDING",
  );
  f.call("gary", "talent_availability", {
    status: "VACATION",
    start: "2028-02-10T09:00",
    end: "2028-02-11T18:00",
  });
  assert.ok(
    f.db.availability.some(
      (a) =>
        a.artist_id === 2 &&
        a.kind === "BLOCKED" &&
        a.start.startsWith("2028-02-10"),
    ),
  );
});
