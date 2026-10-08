#!/usr/bin/env node
/* Reproduce a fresh fixture; never read a browser state or SQLite user database. */
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const { initialize } = require("../web/demo.js");
const { seedDemoData } = require("../web/arti-domain.js");
const db = initialize(
  JSON.parse(fs.readFileSync(path.join(root, "web/demo-data.json"))),
);
seedDemoData(db);
const output = process.argv.indexOf("--output");
if (output >= 0) {
  if (!process.argv[output + 1]) throw Error("Indica un archivo de salida.");
  fs.writeFileSync(process.argv[output + 1], JSON.stringify(db, null, 2));
}
console.log(
  JSON.stringify(
    {
      artists: db.artists.length,
      leaders: db.users.filter((u) => u.demo_role === "LEADER").length,
      agencies: db.users.filter((u) => u.demo_role === "AGENCY").length,
      enterprises: db.arti.credits.length,
      venues: db.arti.venues.length,
      opportunities: db.arti.opportunities.length,
      events: db.arti.events.length,
      invoices: db.arti.invoices.length,
      payments: db.arti.payments.length,
    },
    null,
    2,
  ),
);
