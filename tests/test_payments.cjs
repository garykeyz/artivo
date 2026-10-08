const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  demo = require("../web/demo.js"),
  D = require("../web/arti-domain.js"),
  P = require("../web/arti-payments.js");
function fixture() {
  const db = demo.initialize(JSON.parse(fs.readFileSync("web/demo-data.json")));
  D.ensure(db);
  const admin = db.users.find((u) => u.role === "ADMIN");
  const u = (id) => db.users.find((u) => u.id === id);
  const call = (id, path, data) =>
    D.route(db, "/api/arti/" + path, data, u(id));
  return {
    db,
    admin,
    u,
    call,
    newEvent(hours = 12, amount = 100000) {
      const id = call(admin.id, "money_demo", { hours, amount }).event_id;
      return db.arti.events.find((e) => e.id === id);
    },
  };
}
test("exact cancellation windows include boundaries and use venue timezone", () => {
  const f = fixture(),
    e = f.newEvent(),
    at = "2026-10-10T20:00:00-04:00";
  e.start = at;
  for (const [h, bps] of [
    [168.5, 0],
    [168, 1000],
    [72.01, 1000],
    [72, 2500],
    [24.01, 2500],
    [24, 5000],
    [5, 5000],
  ]) {
    const p = P.CancellationPolicyEngine.preview(
      e,
      new Date(Date.parse(at) - h * 3600000).toISOString(),
    );
    assert.equal(p.rule.penalty_bps, bps);
    assert.equal(p.refund + p.provider_compensation, 100000);
  }
  e.start = "2026-10-10T20:00:00";
  const p = P.CancellationPolicyEngine.preview(e, "2026-10-10T15:00:00");
  assert.equal(p.hours, 5);
  assert.equal(p.timezone, "America/Santo_Domingo");
  e.start = "2026-10-11T20:00:00";
  assert.equal(
    P.CancellationPolicyEngine.preview(e, "2026-10-10T15:00:00").hours,
    29,
  );
});
test("official amounts, review without mutation, idempotence and single instance cancellation", () => {
  for (const [hours, refund, comp] of [
    [240, 100000, 0],
    [120, 90000, 10000],
    [48, 75000, 25000],
    [12, 50000, 50000],
    [5, 50000, 50000],
  ]) {
    const f = fixture(),
      e = f.newEvent(hours),
      before = f.db.arti.events
        .filter((x) => x.id !== e.id)
        .map((x) => x.status);
    const p = f.call(e.owner_id, "money_event/" + e.id + "/cancel", {
      confirm: false,
    });
    assert.equal(p.preview.refund, refund);
    assert.equal(e.status, "CONFIRMED");
    f.call(e.owner_id, "money_event/" + e.id + "/cancel", { confirm: true });
    assert.equal(e.cancellation.provider_compensation, comp);
    assert.equal(e.status, "CANCELLED");
    assert.deepEqual(
      f.db.arti.events.filter((x) => x.id !== e.id).map((x) => x.status),
      before,
    );
    f.call(e.owner_id, "money_event/" + e.id + "/cancel", { confirm: true });
    assert.equal(f.db.arti.money.cancellations.length, 1);
    const l = f.db.arti.money.ledger.find(
      (x) => x.reference === "cancel-" + e.id,
    );
    assert.equal(l.booking_id, e.id);
    assert.ok(l.transaction_id);
    assert.ok(l.cancellation_id);
    assert.equal(
      l.entries.reduce((s, x) => s + x.debit - x.credit, 0),
      0,
    );
  }
});
test("payment acceptance and collection do not immediately pay provider", () => {
  const f = fixture(),
    e = f.newEvent();
  assert.equal(e.payment_status, "PAID");
  assert.equal(e.payout_status, "PENDING");
  assert.equal(
    f.db.arti.money.earnings.filter((x) => x.event_id === e.id).length,
    0,
  );
  assert.throws(
    () =>
      f.call(e.provider_id, "money_event/" + e.id + "/pay", {
        accepted_terms: true,
      }),
    /cliente/,
  );
  assert.throws(
    () =>
      f.call(e.provider_id, "money_event/" + e.id + "/fastpay", {
        confirm: true,
      }),
    /beneficiario|verificado/,
  );
  e.status = "SERVICE_VERIFIED";
  P.afterEvent(f.db, e);
  assert.equal(e.payout_status, "SCHEDULED");
  assert.equal(
    f.db.arti.money.earnings.filter((x) => x.event_id === e.id).length,
    1,
  );
  P.afterEvent(f.db, e);
  assert.equal(
    f.db.arti.money.earnings.filter((x) => x.event_id === e.id).length,
    1,
  );
});
test("cancel compensation is separate, dispute holds payouts and refunds, resolution restores", () => {
  const f = fixture(),
    e = f.newEvent();
  f.call(e.owner_id, "money_event/" + e.id + "/cancel", { confirm: true });
  const earning = f.db.arti.money.earnings.find((x) => x.event_id === e.id);
  assert.equal(earning.type, "CANCELLATION_COMPENSATION");
  assert.equal(earning.net, 50000);
  e.status = "DISPUTED";
  P.afterEvent(f.db, e);
  assert.equal(earning.status, "ON_HOLD");
  assert.throws(
    () =>
      f.call(e.provider_id, "money_event/" + e.id + "/fastpay", {
        confirm: true,
      }),
    /disponible|verificado/,
  );
  const r = f.db.arti.money.refunds.find((x) => x.event_id === e.id);
  assert.throws(() => f.call(e.owner_id, "refund/" + r.id, {}), /disputa/);
  e.status = "CANCELLED";
  P.afterEvent(f.db, e);
  assert.equal(earning.status, "SCHEDULED");
  f.call(e.owner_id, "refund/" + r.id, {});
  const count = f.db.arti.money.ledger.length;
  f.call(e.owner_id, "refund/" + r.id, {});
  assert.equal(f.db.arti.money.ledger.length, count);
});
test("provider cancellation and force majeure use independent paths", () => {
  const f = fixture(),
    e = f.newEvent();
  f.call(e.provider_id, "money_event/" + e.id + "/cancel", {
    actor: "PROVIDER",
    confirm: true,
  });
  assert.equal(e.cancellation.refund, 100000);
  assert.equal(e.cancellation.provider_compensation, 0);
  assert.equal(f.db.arti.money.incidents.at(-1).status, "NEEDS_REPLACEMENT");
  const x = f.newEvent();
  f.call(x.owner_id, "money_event/" + x.id + "/cancel", {
    actor: "FORCE_MAJEURE",
    confirm: true,
  });
  assert.equal(x.status, "DISPUTED");
  assert.equal(f.db.arti.money.cancellations.length, 1);
  f.call(f.admin.id, "money_event/" + x.id + "/resolve_force", {
    refund: false,
  });
  assert.equal(x.status, "CONFIRMED");
});
test("payout batches and Fast Pay cannot liquidate the same income twice", () => {
  const f = fixture(),
    gary = f.u(2),
    m = f.db.arti.money;
  const r = f.call(2, "payout/create", { frequency: "WEEKLY" }),
    b = r.batches[0],
    earning = m.earnings.find((x) => x.id === b.earning_ids[0]);
  assert.throws(
    () =>
      f.call(2, "money_event/" + earning.event_id + "/fastpay", {
        confirm: true,
      }),
    /reservado/,
  );
  f.call(2, "payout/" + b.id, { mode: "FAILED" });
  assert.equal(b.status, "FAILED");
  f.call(2, "payout/" + b.id, { mode: "PROCESSING" });
  assert.equal(b.status, "PROCESSING");
  f.call(2, "payout/" + b.id, { mode: "PAID" });
  const count = m.ledger.length;
  f.call(2, "payout/" + b.id, { mode: "PAID" });
  assert.equal(m.ledger.length, count);
  assert.ok(
    b.earning_ids.every(
      (id) => m.earnings.find((x) => x.id === id).status === "PAID",
    ),
  );
});
test("configurable fee snapshots and cancellation policy preserve existing contracts", () => {
  const f = fixture(),
    e = f.newEvent(),
    old = structuredClone(e.cancellation_policy),
    tiers = f.db.arti.money.settings.fee_tiers.map((t) => ({ ...t, bps: 700 }));
  f.call(f.admin.id, "money_settings", {
    fee_tiers: tiers,
    cancellation: f.db.arti.money.settings.cancellation.map((p) => ({
      ...p,
      penalty_bps: 2000,
    })),
  });
  assert.deepEqual(e.cancellation_policy, old);
  const x = f.newEvent();
  assert.equal(x.fee_snapshot.bps, 700);
  assert.equal(x.cancellation_policy[0].penalty_bps, 2000);
  assert.throws(
    () => f.call(2, "money_settings", { fee_tiers: tiers }),
    /Admin/,
  );
});
test("split beneficiaries receive exact rounded compensation and can request their own Fast Pay", () => {
  const f = fixture(),
    e = f.newEvent(12, 100001);
  e.staffing_assignments = [{ provider_id: 3 }, { provider_id: 4 }];
  f.call(f.admin.id, "money_event/" + e.id + "/splits", {
    splits: [
      { provider_id: 2, share_bps: 3000 },
      { provider_id: 3, share_bps: 4000 },
      { provider_id: 4, share_bps: 3000 },
    ],
  });
  f.call(e.owner_id, "money_event/" + e.id + "/cancel", { confirm: true });
  const list = f.db.arti.money.earnings.filter((x) => x.event_id === e.id);
  assert.equal(
    list.reduce((s, x) => s + x.net, 0),
    50001,
  );
  f.call(3, "money_event/" + e.id + "/fastpay", { confirm: true });
  assert.equal(list.find((x) => x.provider_id === 3).status, "PAID");
  assert.equal(list.find((x) => x.provider_id === 2).status, "SCHEDULED");
});
test("weekly Tuesday, fortnightly and monthly dates and fee limits", () => {
  const f = fixture(),
    m = f.db.arti.money;
  m.frequencies[2] = "WEEKLY";
  assert.equal(
    P.nextPayoutDate(f.db, 2, "2026-10-11T20:00:00-04:00"),
    "2026-10-13",
  );
  m.frequencies[2] = "MONTHLY";
  assert.equal(
    P.nextPayoutDate(f.db, 2, "2026-10-08T20:00:00-04:00"),
    "2026-11-01",
  );
  const q = P.PricingEngine.fastPay(f.db, { net: 24000, currency: "USD" });
  assert.equal(q.fee, 1500);
  assert.equal(q.net, 22500);
  assert.equal(q.arti_margin, 1400);
});
test("private assets and certificates are filtered and binary bytes are excluded from business records", () => {
  const f = fixture();
  const asset = f.call(2, "media", {
    caption: "Private portfolio",
    visibility: "PRIVATE",
    file: {
      name: "test.png",
      mime_type: "image/png",
      size: 10,
      storage_key: "test-object",
    },
  }).media;
  assert.equal(asset.url, "arti-media://test-object");
  assert.ok(!JSON.stringify(asset).includes("base64"));
  assert.throws(() => f.call(8, "asset/" + asset.id), /privado/);
  assert.equal(f.call(2, "asset/" + asset.id).visibility, "PRIVATE");
  const visible = demo.dispatch(f.db, "/api/feed", undefined, 8);
  assert.ok(!visible.posts.some((p) => p.media_url === asset.url));
  const w = f.call(8, "workspace");
  assert.ok(w.artists.every((p) => p.certifications.every((c) => !c.document)));
});
test("professional conversations restrict read and write to their two participants", () => {
  const f = fixture(),
    c = f.call(2, "conversation", { user_id: 8 });
  f.call(2, "conversation/" + c.id, { body: "Coordinar sonido y luces" });
  assert.equal(f.call(8, "conversation/" + c.id).messages.length, 1);
  assert.throws(() => f.call(3, "conversation/" + c.id), /privada/);
  assert.throws(
    () => f.call(f.admin.id, "conversation/" + c.id, { body: "Unauthorized" }),
    /privada/,
  );
  assert.equal(f.call(2, "conversation", { user_id: 8 }).id, c.id);
});
test("legacy reservations use the same exact cancellation engine and retain old history", () => {
  const f = fixture(),
    b = f.db.bookings.find((b) => b.status === "CONFIRMED"),
    start = new Date(Date.now() + 12 * 3600000);
  b.start = start.toISOString().slice(0, 16);
  b.end = new Date(+start + 2 * 3600000).toISOString().slice(0, 16);
  const held = f.db.payments.find((p) => p.booking_id === b.id);
  held.status = "HELD";
  const r = f.call(b.client_id, "legacy_cancel/" + b.id, { confirm: false });
  assert.equal(r.preview.rule.penalty_bps, 5000);
  assert.equal(b.status, "CONFIRMED");
  f.call(b.client_id, "legacy_cancel/" + b.id, { confirm: true });
  assert.equal(b.cancellation.refund, Math.round(b.amount * 50));
  assert.ok(f.db.arti.events.find((e) => e.legacy_booking_id === b.id));
  assert.equal(b.status, "REFUNDED");
});
test("low income cannot produce a Fast Pay fee greater than available earnings", () => {
  const f = fixture(),
    q = P.PricingEngine.fastPay(f.db, { net: 500, currency: "USD" });
  assert.equal(q.net + q.fee, 500);
});
