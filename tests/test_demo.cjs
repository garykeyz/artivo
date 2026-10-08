const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { dispatch, initialize } = require("../web/demo.js");
const seed = JSON.parse(
  fs.readFileSync(
    require("node:path").join(__dirname, "../web/demo-data.json"),
    "utf8",
  ),
);
const setup = () => {
  const db = initialize(seed);
  return {
    db,
    client: (p, d) => dispatch(db, p, d, 1),
    artist: (p, d) => dispatch(db, p, d, 2),
    admin: (p, d) => dispatch(db, p, d, 9),
  };
};
const event = () => {
  const d = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  return {
    artist_id: 2,
    title: "Prueba de jazz",
    city: "Punta Cana",
    location: "Casa Tropical",
    amount: 10000,
    start: d + "T20:00",
    end: d + "T23:00",
  };
};
test("Public export never contains secrets, sessions or private DB records", () => {
  assert(!seed.users.some((u) => "password" in u));
  assert(!("sessions" in seed));
  assert(!("payments" in seed));
  assert.equal(seed.users.length, 9);
});
test("Both views receive their role-specific data", () => {
  const { client, artist } = setup();
  assert.equal(client("/api/bootstrap").user.role, "CLIENT");
  assert.equal(artist("/api/bootstrap").user.role, "ARTIST");
  assert.throws(() => client("/api/wallet"));
  assert.equal(artist("/api/wallet").profit, 6200);
});
test("Shared visitor-local booking cycle through both views", () => {
  const { db, client, artist } = setup();
  const b = client("/api/bookings", event());
  artist(`/api/bookings/${b.id}/action`, { action: "accept" });
  client(`/api/bookings/${b.id}/action`, { action: "pay" });
  artist(`/api/bookings/${b.id}/action`, { action: "start" });
  client(`/api/bookings/${b.id}/action`, { action: "complete" });
  assert.equal(artist("/api/wallet").income, 18000);
  assert.equal(artist("/api/wallet").commission, 1800);
  client(`/api/bookings/${b.id}/review`, {
    rating: 5,
    comment: "Una experiencia excelente",
  });
  assert.equal(client("/api/artists/2").rating, 5);
  assert.throws(() =>
    client(`/api/bookings/${b.id}/action`, { action: "complete" }),
  );
  assert.equal(db.transactions.length, 2);
});
test("Overlapping acceptances and repeated payments are rejected", () => {
  const { db, client, artist } = setup();
  const b = client("/api/bookings", event());
  const second = dispatch(db, "/api/bookings", event(), 8);
  artist(`/api/bookings/${b.id}/action`, { action: "accept" });
  assert.throws(() =>
    artist(`/api/bookings/${second.id}/action`, { action: "accept" }),
  );
  client(`/api/bookings/${b.id}/action`, { action: "pay" });
  assert.throws(() =>
    client(`/api/bookings/${b.id}/action`, { action: "pay" }),
  );
});
test("Counteroffer changes negotiated amount and commission", () => {
  const { client, artist } = setup();
  const b = client("/api/bookings", event());
  artist(`/api/bookings/${b.id}/action`, { action: "counter", amount: 12000 });
  const updated = client(`/api/bookings/${b.id}/action`, {
    action: "accept_counter",
  });
  assert.equal(updated.amount, 12000);
  assert.equal(updated.commission, 1200);
});
test("Feed likes, saves, follows and comments are persisted in state", () => {
  const { client } = setup();
  const p = client("/api/feed").posts[0];
  client(`/api/posts/${p.id}/like`, {});
  client(`/api/posts/${p.id}/save`, {});
  client(`/api/posts/${p.id}/follow`, {});
  client(`/api/posts/${p.id}/comment`, { body: "¡Qué buena música!" });
  assert.equal(client("/api/feed?mode=saved").posts.length, 1);
  const updated = client(`/api/posts/${p.id}`);
  assert.equal(updated.like_count, 1);
  assert.equal(updated.comment_count, 1);
  assert(updated.following);
  client(`/api/posts/${p.id}/like`, {});
  assert.equal(client(`/api/posts/${p.id}`).like_count, 0);
});
test("Artist publishes; client cannot impersonate an artist", () => {
  const { client, artist } = setup();
  const d = {
    caption: "Una nueva sesión",
    media_type: "IMAGE",
    media_url: "https://example.com/photo.jpg",
    artist_id: 3,
  };
  assert.throws(() => client("/api/posts", d));
  const p = artist("/api/posts", d);
  assert.equal(p.artist_id, 2);
  assert(artist("/api/feed?mode=mine").posts.some((x) => x.id === p.id));
});
test("Video URLs and financial amounts are validated", () => {
  const { client, artist } = setup();
  assert.throws(() =>
    artist("/api/posts", {
      caption: "Video",
      media_type: "VIDEO",
      media_url: "javascript:alert(1)",
    }),
  );
  assert.throws(() => client("/api/bookings", { ...event(), amount: -100 }));
  assert.throws(() => client("/api/bookings", { ...event(), amount: NaN }));
  assert.throws(() =>
    artist("/api/expenses", {
      category: "Gasolina",
      date: "bad",
      description: "Gas",
      amount: 50,
    }),
  );
});
test("Foreign booking and chat access is blocked", () => {
  const { db, client } = setup();
  const b = client("/api/bookings", event());
  assert.throws(() =>
    dispatch(db, `/api/bookings/${b.id}/messages`, undefined, 3),
  );
  assert.throws(() =>
    dispatch(db, `/api/bookings/${b.id}/action`, { action: "pay" }, 3),
  );
});
test("Free cancellation refunds and frees the calendar slot", () => {
  const { db, client, artist } = setup();
  const b = client("/api/bookings", event());
  artist(`/api/bookings/${b.id}/action`, { action: "accept" });
  client(`/api/bookings/${b.id}/action`, { action: "pay" });
  const r = client(`/api/bookings/${b.id}/action`, { action: "cancel" });
  assert.equal(r.status, "REFUNDED");
  assert.equal(
    db.payments.find((p) => p.booking_id === b.id).status,
    "REFUNDED",
  );
  assert.equal(artist("/api/wallet").income, 8000);
});
test("Dispute is resolved through admin, with one financial entry", () => {
  const { client, artist, admin } = setup();
  client("/api/bookings/3/action", {
    action: "dispute",
    reason: "Prueba de revisión",
  });
  assert.throws(() =>
    client("/api/bookings/3/action", { action: "resolve_release" }),
  );
  admin("/api/bookings/3/action", { action: "resolve_release" });
  assert.equal(artist("/api/wallet").income, 16000);
  assert.throws(() =>
    admin("/api/bookings/3/action", { action: "resolve_release" }),
  );
});
test("External earnings and expenses update real profit", () => {
  const { artist } = setup();
  artist("/api/income", { amount: 5000, description: "Evento externo" });
  artist("/api/expenses", {
    amount: 500,
    description: "Gasolina",
    category: "Gasolina",
    date: new Date().toISOString().slice(0, 10),
    booking_id: 1,
  });
  assert.equal(artist("/api/wallet").profit, 10700);
});
test("Static site uses relative assets under a repository subpath", () => {
  const html = fs.readFileSync(
    require("node:path").join(__dirname, "../dist/index.html"),
    "utf8",
  );
  assert(!/(?:src|href)="\//.test(html));
  assert(html.includes("preview-config.js"));
  assert(html.indexOf("demo.js") < html.indexOf("app.js"));
});
