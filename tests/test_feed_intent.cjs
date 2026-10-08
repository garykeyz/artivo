const { test } = require("node:test");
const assert = require("node:assert/strict");
const A = require("../web/arti-access.js");
const demo = require("../web/demo.js");
const D = require("../web/arti-domain.js");
const fs = require("node:fs");
test("clients and enterprises discover services without a recruitment feed", () => {
  for (const viewer of [
    { role: "CLIENT" },
    { role: "BUSINESS" },
    { role: "BUSINESS", demo_role: "ENTERPRISE" },
  ]) {
    assert.equal(A.feedPolicy(viewer).hiring, true);
    assert.equal(A.feedPolicy(viewer).opportunities, false);
    assert.equal(A.feedPolicy(viewer).primary, "discover");
    for (const author of ["CLIENT", "ENTERPRISE", "ARTIST", "LEADER", "AGENCY"])
      assert.equal(
        A.feedPostVisible(viewer, author),
        ["ARTIST", "LEADER", "AGENCY"].includes(author),
      );
    assert.equal(A.feedPostVisible(viewer, "ENTERPRISE", "mine"), true);
  }
});
test("all provider types retain the hybrid opportunities and community feed", () => {
  for (const viewer of [
    { role: "ARTIST", profile_type: "TECHNICIAN" },
    { role: "ARTIST", profile_type: "COMPANY" },
    { role: "BUSINESS", demo_role: "LEADER" },
    { role: "BUSINESS", demo_role: "AGENCY" },
  ]) {
    assert.equal(A.feedPolicy(viewer).hiring, false);
    assert.equal(A.feedPolicy(viewer).opportunities, true);
    for (const author of ["CLIENT", "ENTERPRISE", "ARTIST", "LEADER", "AGENCY"])
      assert.equal(A.feedPostVisible(viewer, author), true);
  }
});
test("seeded buyer community excludes employers and retains teams and agencies", () => {
  const db = demo.initialize(JSON.parse(fs.readFileSync("web/demo-data.json")));
  D.ensure(db);
  const buyer = { role: "CLIENT" };
  const visible = db.arti.professional_posts.filter((p) =>
    A.feedPostVisible(
      buyer,
      db.users.find((u) => u.id === p.owner_id),
    ),
  );
  assert.ok(visible.length > 0);
  assert.ok(
    visible.every((p) =>
      ["ARTIST", "LEADER", "AGENCY"].includes(
        A.role(db.users.find((u) => u.id === p.owner_id)),
      ),
    ),
  );
  assert.ok(visible.length < db.arti.professional_posts.length);
});
