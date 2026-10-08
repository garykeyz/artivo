/* Protected booking demo: configurable pricing, cancellation and payout engines.
   Separate from historical settlement records; no external transactions. */
(function (root) {
  "use strict";
  const copy = (x) => JSON.parse(JSON.stringify(x)),
    next = (a) => Math.max(0, ...a.map((x) => x.id || 0)) + 1;
  const now = () => new Date().toISOString();
  const integer = (x, min = 0, max = 1e12) => {
    const n = Number(x);
    if (!Number.isSafeInteger(n) || n < min || n > max)
      throw Error("Importe o regla inválidos.");
    return n;
  };
  const role = (u) =>
    u.demo_role || { BUSINESS: "ENTERPRISE" }[u.role] || u.role;
  class PayoutProvider {
    payout() {
      throw Error("PayoutProvider required");
    }
    status() {
      throw Error("PayoutProvider required");
    }
  }
  class MockPayoutProvider extends PayoutProvider {
    payout(recipient, amount, currency, mode = "PAID") {
      return {
        recipient,
        amount,
        currency,
        status:
          mode === "FAILED"
            ? "FAILED"
            : mode === "PROCESSING"
              ? "PROCESSING"
              : "PAID",
        provider: "MockPayoutProvider",
        demo: true,
      };
    }
    status(p) {
      return p.status;
    }
  }
  class FastPayProvider {
    quote() {
      throw Error("FastPayProvider required");
    }
  }
  class MockFastPayProvider extends FastPayProvider {
    quote(net, currency, rule) {
      if (currency !== rule.currency)
        throw Error("Fast Pay no configurado para esta moneda.");
      const fee = Math.min(
        net,
        rule.maximum_fee,
        Math.max(
          rule.minimum_fee,
          Math.round((net * rule.percentage_bps) / 10000) + rule.fixed_fee,
        ),
      );
      return {
        net: Math.max(0, net - fee),
        fee,
        provider_cost: rule.provider_cost,
        arti_margin: Math.max(0, fee - rule.provider_cost),
        demo: true,
      };
    }
  }
  const payoutProvider = new MockPayoutProvider(),
    fastPayProvider = new MockFastPayProvider();
  function audit(a, by, action, id) {
    a.audit.unshift({
      id: next(a.audit),
      by,
      action,
      entity: id,
      at: now(),
      demo: true,
    });
  }
  function notify(a, id, body) {
    a.notifications.unshift({
      id: next(a.notifications),
      user_id: id,
      body,
      created_at: now(),
      demo: true,
      read: false,
    });
  }
  function ledger(a, reference, event_id, currency, entries) {
    if (a.money.ledger.some((l) => l.reference === reference)) return;
    const rows = entries.map(([account, debit, credit]) => ({
      account,
      debit: integer(debit),
      credit: integer(credit),
    }));
    if (rows.reduce((s, r) => s + r.debit - r.credit, 0) !== 0)
      throw Error("Asiento financiero desequilibrado.");
    a.money.ledger.push({
      id: next(a.money.ledger),
      reference,
      event_id,
      booking_id: event_id,
      transaction_id:
        a.money.payments.find((p) => p.event_id === event_id)?.id || null,
      cancellation_id:
        a.money.cancellations.find((c) => c.event_id === event_id)?.id || null,
      currency,
      entries: rows,
      at: now(),
      demo: true,
    });
  }
  function initialize(db) {
    const a = db.arti;
    for (const v of a.venues) v.timezone ||= "America/Santo_Domingo";
    if (a.money) {
      describeRules(a.money.settings.cancellation);
      seedClientBookings(db);
      return a.money;
    }
    a.money = {
      version: 1,
      settings: {
        payout_weekday: 2,
        default_frequency: "WEEKLY",
        fee_basis: "rolling_30_day_gmv",
        fee_tiers: [
          { name: "START", max: 2500000, bps: 600 },
          { name: "GROW", max: 10000000, bps: 500 },
          { name: "PRO", max: 25000000, bps: 400 },
          { name: "SCALE", max: 50000000, bps: 350 },
          { name: "STRATEGIC", max: 1e12, bps: 300 },
        ],
        fastpay: {
          currency: "USD",
          minimum_fee: 1500,
          percentage_bps: 500,
          fixed_fee: 0,
          maximum_fee: 100000,
          provider_cost: 100,
          eligibility: "SERVICE_VERIFIED",
          arti_margin: 0,
        },
        cancellation: [
          {
            max_hours: 24,
            penalty_bps: 5000,
            provider_share_bps: 10000,
            arti_share_bps: 0,
            processing_share_bps: 0,
            tax_share_bps: 0,
          },
          {
            max_hours: 72,
            penalty_bps: 2500,
            provider_share_bps: 10000,
            arti_share_bps: 0,
            processing_share_bps: 0,
            tax_share_bps: 0,
          },
          {
            max_hours: 168,
            penalty_bps: 1000,
            provider_share_bps: 10000,
            arti_share_bps: 0,
            processing_share_bps: 0,
            tax_share_bps: 0,
          },
          {
            max_hours: 1e6,
            penalty_bps: 0,
            provider_share_bps: 10000,
            arti_share_bps: 0,
            processing_share_bps: 0,
            tax_share_bps: 0,
          },
        ],
        payment_bps: 0,
        insurance_bps: 0,
        infrastructure_fixed: 0,
        enterprise_overrides: {},
        force_majeure: "MANUAL_REVIEW",
      },
      payments: [],
      earnings: [],
      batches: [],
      refunds: [],
      cancellations: [],
      incidents: [],
      ledger: [],
      frequencies: {},
      volume_demo: { "8:USD": 18200000 },
      jobs: [],
    };
    const m = a.money;
    const maria = db.users.find((u) => u.name === "Maria Santos"),
      agency = db.users.find((u) => u.email === "agencia@artivo.demo");
    if (maria) m.frequencies[maria.id] = "BIWEEKLY";
    if (agency) m.frequencies[agency.id] = "MONTHLY";
    // New professional services adopt this model; existing ARTIVO contracts are preserved.
    for (const o of a.opportunities)
      if (o.category_key) o.payment_model = "PROTECTED_V2";
    const source = copy(a.opportunities[0]);
    source.id = next(a.opportunities);
    source.title = "Booking protegido · DJ US$500";
    source.rate = 50000;
    source.terms = 0;
    source.payment_model = "PROTECTED_V2";
    source.category_key = "DJ";
    source.service_id = "dj:protected";
    source.booking_type = "MUSIC_BOOKING";
    source.call_minutes = 60;
    source.quantity = 1;
    source.staffing = [];
    source.dates = source.dates.slice(0, 1).map((d) => ({ ...d, capacity: 1 }));
    a.opportunities.push(source);
    // Completed earnings fixtures with separate prepaid funds and planned payouts.
    const d = new Date();
    const stamp = (offset) => {
      const x = new Date(d);
      x.setUTCDate(x.getUTCDate() + offset);
      return x.toISOString().slice(0, 10);
    };
    for (const [i, amount] of [25000, 30000, 27500, 40000].entries()) {
      const start = stamp(i - 3) + "T20:00-04:00",
        end = stamp(i - 3) + "T23:00-04:00";
      const e = {
        id: next(a.events),
        booking_id: next(a.events),
        owner_id: 8,
        provider_id: 2,
        performer_id: 2,
        venue_id: 1,
        title: "Semana demo · servicio " + (i + 1),
        opportunity_id: source.id,
        date_id: 0,
        start,
        end,
        call_time: new Date(Date.parse(start) - 3600000).toISOString(),
        rate: amount,
        currency: "USD",
        terms: 0,
        conditions: "Servicio completado de muestra · payout semanal",
        status: "INVOICED",
        setup: "VERIFIED",
        evidence: [],
        history: [],
        commission_bps: 400,
        payment_model: "PROTECTED_V2",
        demo: true,
      };
      a.events.push(e);
      register(db, e);
      fund(db, e, { id: 8, role: "BUSINESS", demo_role: "ENTERPRISE" }, true);
      release(db, e);
    }
    for (const [id, frequency, amount] of [
      [maria?.id, "BIWEEKLY", 30000],
      [agency?.id, "MONTHLY", 75000],
    ])
      if (id) {
        const e = {
          ...copy(a.events.at(-1)),
          id: next(a.events),
          booking_id: next(a.events),
          provider_id: id,
          performer_id:
            role(db.users.find((u) => u.id === id)) === "ARTIST" ? id : null,
          title: frequency + " · liquidación demo",
          rate: amount,
          fee_snapshot: null,
          payout_status: "PENDING",
          funds_status: "PAYMENT_REQUIRED",
          payment_status: "PENDING",
          payout_frequency: frequency,
          finance_timeline: [],
          commission_bps: 400,
          payment_model: "PROTECTED_V2",
          history: [],
          status: "INVOICED",
        };
        a.events.push(e);
        register(db, e);
        fund(db, e, { id: 8, role: "BUSINESS", demo_role: "ENTERPRISE" }, true);
        release(db, e);
      }
    describeRules(m.settings.cancellation);
    seedClientBookings(db);
    return m;
  }
  function seedClientBookings(db) {
    const a = db.arti,
      m = a.money;
    if (m.client_seed_version) return;
    m.client_seed_version = 1;
    const client = db.users.find((u) => (u.demo_role || u.role) === "CLIENT");
    if (!client) return;
    for (const [offset, amount, paid] of [
      [10, 50000, false],
      [21, 150000, true],
    ]) {
      const day = new Date(Date.now() + offset * 86400000)
          .toISOString()
          .slice(0, 10),
        start = day + "T20:00:00-04:00";
      const e = {
        id: next(a.events),
        owner_id: client.id,
        provider_id: 2,
        performer_id: 2,
        venue_id: 1,
        title: paid
          ? "Celebración privada · reserva pagada"
          : "Noche de piano · confirmar reserva",
        start,
        end: day + "T23:00:00-04:00",
        call_time: day + "T19:00:00-04:00",
        rate: amount,
        currency: "USD",
        terms: 0,
        status: "CONFIRMED",
        setup: "PENDING",
        evidence: [],
        history: [],
        conditions: "Equipo incluido · transporte acordado",
        payment_model: "PROTECTED_V2",
        demo: true,
      };
      e.booking_id = e.id;
      a.events.push(e);
      register(db, e);
      if (paid) fund(db, e, client, true);
    }
  }
  function describeRules(rows) {
    rows.forEach((p, i) =>
      Object.assign(p, {
        id: p.id || i + 1,
        name:
          p.max_hours <= 24
            ? "≤24 HOURS / SAME DAY"
            : p.max_hours <= 72
              ? "≤3 DAYS"
              : p.max_hours <= 168
                ? "≤7 DAYS"
                : "+7 DAYS",
        min_hours_before_event: i ? rows[i - 1].max_hours : 0,
        max_hours_before_event: p.max_hours,
        client_refund_percentage: 100 - p.penalty_bps / 100,
        provider_compensation_percentage:
          (p.penalty_bps * p.provider_share_bps) / 1e6,
        penalty_percentage: p.penalty_bps / 100,
        arti_fee_treatment: "CONFIGURED_POOL_SHARE",
        payment_processing_treatment: "CONFIGURED_POOL_SHARE",
        active: p.active !== false,
        priority: p.priority || i + 1,
      }),
    );
    return rows;
  }
  class PricingEngine {
    static calculateFees(db, e) {
      const m = db.arti.money,
        s = m.settings,
        basis = s.fee_basis;
      const paid = m.payments.filter(
        (p) =>
          p.owner_id === e.owner_id &&
          p.currency === e.currency &&
          p.status === "PAID",
      );
      const start = new Date();
      if (basis === "monthly_gmv") start.setUTCDate(1);
      else if (basis === "annual_gmv") start.setUTCMonth(0, 1);
      else start.setUTCDate(start.getUTCDate() - 30);
      const calculated = paid
          .filter((p) => Date.parse(p.at) >= start)
          .reduce((v, p) => v + p.amount, 0),
        volume = m.volume_demo[e.owner_id + ":" + e.currency] ?? calculated,
        tier = s.fee_tiers.find((t) => volume <= t.max) || s.fee_tiers.at(-1);
      const bps = e.fee_snapshot?.bps ?? tier.bps,
        gross = e.rate,
        platform_fee = Math.round((gross * bps) / 10000),
        payment_fee = Math.round((gross * s.payment_bps) / 10000),
        insurance_fee = Math.round((gross * s.insurance_bps) / 10000);
      return {
        gross,
        platform_fee,
        payment_fee,
        insurance_fee,
        financing_fee: 0,
        provider_payout: Math.max(
          0,
          gross - platform_fee - payment_fee - insurance_fee,
        ),
        tier: tier.name,
        bps,
        basis,
        volume,
        currency: e.currency,
        demo: true,
      };
    }
    static fastPay(db, earning) {
      return fastPayProvider.quote(
        earning.net,
        earning.currency,
        db.arti.money.settings.fastpay,
      );
    }
  }
  function nextPayoutDate(db, provider, completed_at) {
    const s = db.arti.money.settings,
      frequency = db.arti.money.frequencies[provider] || s.default_frequency;
    const t = new Date(completed_at || now()),
      local = new Date(t.getTime() - 4 * 3600000);
    let x = new Date(local.toISOString().slice(0, 10) + "T12:00:00Z");
    if (frequency === "MONTHLY") {
      x.setUTCMonth(x.getUTCMonth() + 1, 1);
    } else {
      const weekday = x.getUTCDay(),
        sunday = new Date(x);
      sunday.setUTCDate(x.getUTCDate() + ((7 - weekday) % 7));
      x = sunday;
      x.setUTCDate(
        x.getUTCDate() + (((s.payout_weekday || 7) - 0 + 7) % 7) || 7,
      );
      if (frequency === "BIWEEKLY") {
        const anchor = new Date("2026-01-06T12:00:00Z");
        const week = Math.floor((x - anchor) / (7 * 86400000));
        if (week % 2 !== 0) x.setUTCDate(x.getUTCDate() + 7);
      }
    }
    return x.toISOString().slice(0, 10);
  }
  function register(db, e) {
    if (e.payment_model !== "PROTECTED_V2") return;
    const m = db.arti.money;
    e.timezone ||=
      db.arti.venues.find((v) => v.id === e.venue_id)?.timezone ||
      "America/Santo_Domingo";
    e.fee_snapshot ||= PricingEngine.calculateFees(db, e);
    e.cancellation_policy ||= copy(
      m.settings.enterprise_overrides[e.owner_id] || m.settings.cancellation,
    ).map((p, i) => ({
      ...p,
      id: i + 1,
      name:
        p.max_hours <= 24
          ? "≤24 HOURS / SAME DAY"
          : p.max_hours <= 72
            ? "≤3 DAYS"
            : p.max_hours <= 168
              ? "≤7 DAYS"
              : "+7 DAYS",
      min_hours_before_event: i ? m.settings.cancellation[i - 1].max_hours : 0,
      max_hours_before_event: p.max_hours,
      client_refund_percentage: 100 - p.penalty_bps / 100,
      provider_compensation_percentage:
        (p.penalty_bps * p.provider_share_bps) / 1e6,
      penalty_percentage: p.penalty_bps / 100,
      arti_fee_treatment: "CONFIGURED_POOL_SHARE",
      payment_processing_treatment: "CONFIGURED_POOL_SHARE",
      active: p.active !== false,
      priority: p.priority || i + 1,
    }));
    e.payout_frequency ||=
      m.frequencies[e.provider_id] || m.settings.default_frequency;
    e.funds_status ||= e.terms > 0 ? "CREDIT_APPROVED" : "PAYMENT_REQUIRED";
    e.payment_status ||= e.terms > 0 ? "DEFERRED" : "PENDING";
    e.payout_status ||= "PENDING";
    e.expected_payout = e.fee_snapshot.provider_payout;
    e.expected_payout_date = nextPayoutDate(db, e.provider_id, e.end);
    e.finance_timeline ||= [
      { status: "BOOKING_CREATED", at: now() },
      { status: e.funds_status, at: now() },
    ];
  }
  function releaseCredit(db, e) {
    if (e.credit_reserved) {
      const c = db.arti.credits.find(
        (c) => c.owner_id === e.owner_id && c.currency === e.currency,
      );
      if (c) c.used = Math.max(0, c.used - e.rate);
      e.credit_reserved = false;
    }
  }
  function fund(db, e, u, termsAccepted) {
    const a = db.arti,
      m = a.money;
    register(db, e);
    if (role(u) !== "ADMIN" && u.id !== e.owner_id)
      throw Error("Solo el cliente paga esta reserva.");
    if (m.payments.some((p) => p.event_id === e.id && p.status === "PAID"))
      return { message: "Pago ya confirmado · sin duplicar" };
    if (!termsAccepted)
      throw Error("Acepta las condiciones demo y la política de cancelación.");
    if (e.status === "CANCELLED") throw Error("La reserva fue cancelada.");
    const p = {
      id: next(m.payments),
      event_id: e.id,
      owner_id: e.owner_id,
      amount: e.rate,
      currency: e.currency,
      status: "PAID",
      at: now(),
      provider: "MockPaymentProvider",
      demo: true,
    };
    m.payments.push(p);
    e.funds_status = "FUNDED";
    e.payment_status = "PAID";
    e.protected = true;
    releaseCredit(db, e);
    e.finance_timeline.push(
      { status: "PAYMENT_CONFIRMED", at: now() },
      { status: "BOOKING_FUNDED", at: now() },
    );
    ledger(a, "fund-" + e.id, e.id, e.currency, [
      ["DEMO_PAYMENT_CLEARING", e.rate, 0],
      [
        m.earnings.some(
          (x) => x.event_id === e.id && x.type !== "CANCELLATION_COMPENSATION",
        )
          ? "DEMO_CREDIT_RECEIVABLE"
          : "PROTECTED_BOOKING_FUNDS",
        0,
        e.rate,
      ],
    ]);
    audit(a, u.id, "BOOKING_FUNDED", e.id);
    notify(
      a,
      e.provider_id,
      "Booking funded · pago demo confirmado. Tu ingreso se libera al verificar el servicio.",
    );
    const i = a.invoices.find((i) => i.event_id === e.id);
    if (i) {
      i.customer_paid = true;
      i.status = "PAID";
    }
    return { message: "Pago simulado confirmado · booking FUNDED" };
  }
  function release(db, e) {
    const a = db.arti,
      m = a.money;
    register(db, e);
    if (
      e.payment_model !== "PROTECTED_V2" ||
      m.earnings.some((x) => x.event_id === e.id)
    )
      return;
    if (
      e.status === "DISPUTED" ||
      !["FUNDED", "CREDIT_APPROVED"].includes(e.funds_status)
    )
      return;
    if (!["SERVICE_VERIFIED", "INVOICED", "SETTLED"].includes(e.status)) return;
    const f = e.fee_snapshot,
      net = f.provider_payout;
    const entry = {
      id: next(m.earnings),
      event_id: e.id,
      provider_id: e.provider_id,
      owner_id: e.owner_id,
      gross: e.rate,
      net,
      fees: f.platform_fee + f.payment_fee + f.insurance_fee,
      platform_fee: f.platform_fee,
      payment_fee: f.payment_fee,
      insurance_fee: f.insurance_fee,
      financing_fee: 0,
      fastpay_fee: 0,
      currency: e.currency,
      status: "SCHEDULED",
      available: true,
      payout_date: e.expected_payout_date,
      frequency: e.payout_frequency,
      completed_at: now(),
      demo: true,
    };
    m.earnings.push(entry);
    e.payout_status = "SCHEDULED";
    e.finance_timeline.push(
      { status: "EARNINGS_AVAILABLE", at: now() },
      { status: "PAYOUT_SCHEDULED", at: now() },
    );
    ledger(a, "earnings-" + e.id, e.id, e.currency, [
      [
        e.funds_status === "FUNDED"
          ? "PROTECTED_BOOKING_FUNDS"
          : "DEMO_CREDIT_RECEIVABLE",
        e.rate,
        0,
      ],
      ["PROVIDER_PAYABLE", 0, net],
      ["PLATFORM_FEE", 0, f.platform_fee],
      ["PAYMENT_COST", 0, f.payment_fee],
      ["INSURANCE_COST", 0, f.insurance_fee],
    ]);
    audit(a, e.provider_id, "EARNINGS_RELEASED", e.id);
    notify(
      a,
      e.provider_id,
      "Servicio verificado · " +
        (net / 100).toFixed(2) +
        " " +
        e.currency +
        " disponible. Próximo payout: " +
        e.expected_payout_date +
        ". Fast Pay disponible.",
    );
  }
  function zonedTimestamp(value, timezone = "America/Santo_Domingo") {
    if (/Z$|[+-]\d\d:\d\d$/.test(value)) return Date.parse(value);
    const base = Date.parse(value + "Z");
    if (!Number.isFinite(base)) throw Error("Timestamp inválido.");
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(new Date(base))
        .map((x) => [x.type, x.value]),
    );
    const local = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    return base - (local - base);
  }
  class CancellationPolicyEngine {
    static calculateCancellationWindow(e, at = now()) {
      const timezone = e.timezone || "America/Santo_Domingo",
        milliseconds =
          zonedTimestamp(e.start, timezone) - zonedTimestamp(at, timezone);
      if (!Number.isFinite(milliseconds)) throw Error("Fecha inválida.");
      return {
        milliseconds,
        hours: milliseconds / 3600000,
        minutes: milliseconds / 60000,
        seconds: milliseconds / 1000,
        timezone,
        event_at: e.start,
        cancellation_at: at,
      };
    }
    static getApplicablePolicy(e, window) {
      const active = e.cancellation_policy
        .filter((p) => p.active !== false)
        .sort((a, b) => a.max_hours - b.max_hours);
      if (!active.length) throw Error("No hay política activa.");
      return active.find((p) => window.hours <= p.max_hours) || active.at(-1);
    }
    static calculatePenalty(e, policy, actor = "CLIENT") {
      return actor === "PROVIDER"
        ? 0
        : Math.round((e.rate * policy.penalty_bps) / 10000);
    }
    static calculateClientRefund(e, pool) {
      return e.funds_status === "FUNDED" ? e.rate - pool : 0;
    }
    static calculateProviderCompensation(pool, policy) {
      return Math.round((pool * policy.provider_share_bps) / 10000);
    }
    static calculateArtiFeeImpact(pool, policy) {
      return Math.round((pool * policy.arti_share_bps) / 10000);
    }
    static generateCancellationBreakdown(e, at = now(), actor = "CLIENT") {
      const window = this.calculateCancellationWindow(e, at);
      if (actor === "FORCE_MAJEURE")
        return {
          ...window,
          status: "MANUAL_REVIEW",
          refund: null,
          provider_compensation: null,
        };
      if (window.hours < 0)
        throw Error("El evento ya comenzó. Abre una disputa.");
      const policy = this.getApplicablePolicy(e, window),
        funded = e.funds_status === "FUNDED",
        pool = funded ? this.calculatePenalty(e, policy, actor) : 0,
        provider_compensation = this.calculateProviderCompensation(
          pool,
          policy,
        ),
        arti_fee = this.calculateArtiFeeImpact(pool, policy),
        processing_cost = Math.round(
          (pool * policy.processing_share_bps) / 10000,
        ),
        taxes = pool - provider_compensation - arti_fee - processing_cost;
      return {
        ...window,
        original_booking_amount: e.rate,
        refund: this.calculateClientRefund(e, pool),
        penalty: pool,
        provider_compensation,
        arti_fee,
        processing_cost,
        taxes,
        status: "PREVIEW",
        actor,
        rule: copy(policy),
        funded,
      };
    }
    static preview(...args) {
      return this.generateCancellationBreakdown(...args);
    }
  }

  class PayoutEngine {
    static calculateEligibleBalance(db, provider, currency) {
      return db.arti.money.earnings.filter(
        (e) =>
          (!provider || e.provider_id === provider) &&
          (!currency || e.currency === currency) &&
          ["SCHEDULED", "AVAILABLE", "FAILED"].includes(e.status) &&
          db.arti.events.find((x) => x.id === e.event_id)?.status !==
            "DISPUTED",
      );
    }
    static createPayoutBatch(db, u, frequency, simulated = true) {
      const a = db.arti,
        m = a.money,
        admin = role(u) === "ADMIN",
        eligible = this.calculateEligibleBalance(
          db,
          admin ? null : u.id,
        ).filter(
          (e) =>
            (!frequency || e.frequency === frequency) &&
            (!e.batch_id ||
              m.batches.find((b) => b.id === e.batch_id)?.status ===
                "FAILED") &&
            (simulated || e.payout_date <= now().slice(0, 10)),
        );
      if (!eligible.length)
        return {
          message: "Sin ingresos nuevos elegibles para payout",
          batch: null,
        };
      const currencies = [...new Set(eligible.map((e) => e.currency))],
        batches = [];
      for (const currency of currencies) {
        const list = eligible.filter((e) => e.currency === currency),
          b = {
            id: next(m.batches),
            frequency: frequency || "MIXED",
            currency,
            earning_ids: list.map((e) => e.id),
            provider_ids: [...new Set(list.map((e) => e.provider_id))],
            gross: list.reduce((s, e) => s + e.gross, 0),
            fees: list.reduce((s, e) => s + e.fees, 0),
            net: list.reduce((s, e) => s + e.net, 0),
            status: "SCHEDULED",
            created_at: now(),
            demo: true,
          };
        m.batches.push(b);
        list.forEach((e) => {
          e.batch_id = b.id;
          e.status = "SCHEDULED";
        });
        batches.push(b);
      }
      audit(a, u.id, "PAYOUT_BATCH_CREATED", batches[0].id);
      return {
        message: "Batch programado · " + eligible.length + " ingresos",
        batches,
      };
    }
    static markPayoutProcessing(db, b) {
      if (b.status === "PAID") return;
      b.status = "PROCESSING";
      for (const id of b.earning_ids) {
        const earning = db.arti.money.earnings.find((e) => e.id === id);
        if (earning.status === "PAID") continue;
        earning.status = "PROCESSING";
      }
    }
    static handleFailure(db, b) {
      if (b.status === "PAID")
        throw Error("Un payout pagado no puede fallar de nuevo.");
      b.status = "FAILED";
      for (const id of b.earning_ids)
        db.arti.money.earnings.find((e) => e.id === id).status = "FAILED";
    }
    static completePayout(db, b, u, mode = "PAID") {
      const a = db.arti,
        m = a.money;
      if (b.status === "PAID")
        return { message: "Payout ya completado · sin duplicar" };
      if (
        role(u) !== "ADMIN" &&
        (b.provider_ids.length !== 1 || b.provider_ids[0] !== u.id)
      )
        throw Error("Batch de otro proveedor.");
      const entries = b.earning_ids.map((id) =>
        m.earnings.find((e) => e.id === id),
      );
      if (
        entries.some(
          (x) =>
            a.events.find((e) => e.id === x.event_id)?.status === "DISPUTED" ||
            ["ON_HOLD", "DISPUTED"].includes(x.status),
        )
      )
        throw Error("Fondos en disputa: payout en espera.");
      if (entries.some((x) => x.status === "PAID" || x.batch_id !== b.id))
        throw Error("Ingreso liquidado por otra operación.");
      this.markPayoutProcessing(db, b);
      const result = payoutProvider.payout(
        b.provider_ids,
        b.net,
        b.currency,
        mode,
      );
      if (result.status === "FAILED") {
        this.handleFailure(db, b);
        return { message: "Payout simulado fallido · puedes reintentar" };
      }
      if (result.status === "PROCESSING")
        return { message: "Payout en procesamiento simulado" };
      for (const earning of entries) {
        if (earning.status === "PAID") continue;
        earning.status = "PAID";
        earning.paid_at = now();
        const e = a.events.find((e) => e.id === earning.event_id);
        e.payout_status = "PAID";
        e.finance_timeline.push(
          { status: "PAYOUT_PROCESSING", at: now() },
          { status: "PAID", at: now() },
        );
        ledger(a, "payout-" + earning.id, e.id, earning.currency, [
          ["PROVIDER_PAYABLE", earning.net, 0],
          ["DEMO_PAYOUT_CLEARING", 0, earning.net],
        ]);
        notify(a, earning.provider_id, "Tu payout simulado fue completado.");
      }
      b.status = "PAID";
      b.paid_at = now();
      audit(a, u.id, "PAYOUT_COMPLETED", b.id);
      return { message: "Payout completado · dinero ficticio", batch: b };
    }
    static calculateFees(db, e) {
      return PricingEngine.calculateFees(db, e);
    }
    static applyAdjustments(db, e) {
      return e;
    }
    static createLedgerEntries(db, ...args) {
      return ledger(db.arti, ...args);
    }
  }
  function financialEvent(db, id, u) {
    const e = db.arti.events.find((e) => e.id === Number(id));
    if (!e || e.payment_model !== "PROTECTED_V2")
      throw Error("Booking protegido no encontrado.");
    if (
      role(u) !== "ADMIN" &&
      ![
        e.owner_id,
        e.provider_id,
        e.agency_id,
        ...(e.settlement_splits || []).map((s) => s.provider_id),
      ].includes(u.id)
    )
      throw Error("Booking de otros participantes.");
    register(db, e);
    return e;
  }
  function fastpay(db, e, u, confirmed) {
    const a = db.arti,
      m = a.money;
    if (
      role(u) !== "ADMIN" &&
      !m.earnings.some((x) => x.event_id === e.id && x.provider_id === u.id)
    )
      throw Error("Solo el beneficiario solicita Fast Pay.");
    const earning = m.earnings.find(
      (x) =>
        x.event_id === e.id && (role(u) === "ADMIN" || x.provider_id === u.id),
    );
    if (!earning || e.status === "DISPUTED")
      throw Error(
        "Fast Pay solo después del servicio verificado y disponible.",
      );
    if (earning.status === "PAID")
      return { message: "Ingreso ya liquidado · sin duplicar" };
    if (["PROCESSING", "ON_HOLD", "DISPUTED"].includes(earning.status))
      throw Error("El ingreso no está disponible para Fast Pay.");
    if (
      earning.batch_id &&
      ["SCHEDULED", "PROCESSING"].includes(
        m.batches.find((b) => b.id === earning.batch_id)?.status,
      )
    )
      throw Error("Ingreso reservado para payout programado.");
    const quote = PricingEngine.fastPay(db, earning);
    if (!confirmed) return { quote, earning };
    const oldNet = earning.net;
    earning.fastpay_fee = quote.fee;
    earning.fees += quote.fee;
    earning.net = quote.net;
    earning.status = "PAID";
    earning.paid_at = now();
    earning.fastpay = true;
    e.payout_status = "PAID_TODAY";
    e.finance_timeline.push(
      { status: "FAST_PAY_REQUESTED", at: now() },
      { status: "FAST_PAY_COMPLETED", at: now() },
    );
    ledger(a, "fastpay-" + earning.id, e.id, e.currency, [
      ["PROVIDER_PAYABLE", oldNet, 0],
      ["DEMO_PAYOUT_CLEARING", 0, quote.net],
      ["FAST_PAY_FEE", 0, quote.fee],
    ]);
    audit(a, u.id, "FAST_PAY_COMPLETED", e.id);
    notify(a, e.provider_id, "Fast Pay completado · fee y neto registrados.");
    const invoice = a.invoices.find((i) => i.event_id === e.id);
    if (invoice) {
      invoice.payout_status = "PAID_TODAY";
      invoice.net = quote.net;
      invoice.fastpay_fee = quote.fee;
    }
    return {
      message:
        "Fast Pay completado · " +
        (quote.net / 100).toFixed(2) +
        " " +
        e.currency,
      quote,
    };
  }
  function cancel(db, e, u, data) {
    const a = db.arti,
      m = a.money,
      actor = data.actor || "CLIENT";
    if (!["CLIENT", "PROVIDER", "FORCE_MAJEURE"].includes(actor))
      throw Error("Parte de cancelación inválida.");
    if (
      actor === "FORCE_MAJEURE" &&
      role(u) !== "ADMIN" &&
      ![e.owner_id, e.provider_id].includes(u.id)
    )
      throw Error("No eres participante.");
    if (
      role(u) !== "ADMIN" &&
      ((actor === "CLIENT" && u.id !== e.owner_id) ||
        (actor === "PROVIDER" && u.id !== e.provider_id))
    )
      throw Error("No puedes cancelar por esta parte.");
    if (m.cancellations.some((c) => c.event_id === e.id))
      return { message: "Cancelación ya registrada · sin duplicar" };
    if (["INVOICED", "SETTLED", "COMPLETED"].includes(e.status))
      throw Error("Servicio ya realizado: abre una disputa.");
    if (e.status === "DISPUTED")
      throw Error("Resuelve la disputa antes de cancelar.");
    if (data.manual_resolution && role(u) !== "ADMIN")
      throw Error("Solo Admin decide una revisión manual.");
    const at =
      role(u) === "ADMIN" && data.simulated_at ? data.simulated_at : now();
    const preview =
      data.manual_resolution && role(u) === "ADMIN"
        ? {
            ...CancellationPolicyEngine.calculateCancellationWindow(e, at),
            original_booking_amount: e.rate,
            refund: e.funds_status === "FUNDED" ? e.rate : 0,
            penalty: 0,
            provider_compensation: 0,
            arti_fee: 0,
            processing_cost: 0,
            taxes: 0,
            status: "MANUAL_DECISION",
            actor,
            rule: { name: "Fuerza mayor · resolución manual" },
            funded: e.funds_status === "FUNDED",
          }
        : CancellationPolicyEngine.preview(e, at, actor);
    if (!data.confirm) return { preview };
    if (actor === "FORCE_MAJEURE" && !data.manual_resolution) {
      e.previous_status = e.status;
      e.status = "DISPUTED";
      e.payout_status = "ON_HOLD";
      afterEvent(db, e);
      m.incidents.push({
        id: next(m.incidents),
        event_id: e.id,
        type: "FORCE_MAJEURE",
        status: "MANUAL_REVIEW",
        reason: data.reason || "Caso de muestra",
        at: now(),
      });
      return {
        message: "Fuerza mayor · revisión manual, sin penalidad automática",
      };
    }
    const record = {
      id: next(m.cancellations),
      event_id: e.id,
      booking_id: e.id,
      transaction_id: m.payments.find((p) => p.event_id === e.id)?.id,
      actor,
      currency: e.currency,
      ...preview,
      at,
      processed_at: now(),
      status: "CANCELLED",
      demo: true,
    };
    m.cancellations.push(record);
    e.status = "CANCELLED";
    releaseCredit(db, e);
    notify(
      a,
      e.owner_id,
      "Tu cancelación fue procesada. Reembolso: " +
        (preview.refund / 100).toFixed(2) +
        " " +
        e.currency,
    );
    e.assignment = "RELEASED";
    e.history.push({
      status:
        actor === "CLIENT"
          ? "CANCELLED_BY_CLIENT"
          : actor === "FORCE_MAJEURE"
            ? "CANCELLED_FORCE_MAJEURE"
            : "CANCELLED_BY_PROVIDER",
      at,
      by: u.id,
      demo: true,
    });
    e.cancellation = copy(record);
    e.finance_timeline.push({
      status:
        actor === "CLIENT"
          ? "CANCELLED_BY_CLIENT"
          : actor === "FORCE_MAJEURE"
            ? "CANCELLED_FORCE_MAJEURE"
            : "CANCELLED_BY_PROVIDER",
      at: now(),
    });
    if (preview.funded) {
      ledger(a, "cancel-" + e.id, e.id, e.currency, [
        ["PROTECTED_BOOKING_FUNDS", e.rate, 0],
        ["CLIENT_REFUND_PAYABLE", 0, preview.refund],
        ["PROVIDER_PAYABLE", 0, preview.provider_compensation],
        ["CANCELLATION_PLATFORM_FEE", 0, preview.arti_fee],
        ["CANCELLATION_PROCESSING", 0, preview.processing_cost],
        ["CANCELLATION_TAX", 0, preview.taxes],
      ]);
      m.refunds.push({
        id: next(m.refunds),
        event_id: e.id,
        owner_id: e.owner_id,
        amount: preview.refund,
        currency: e.currency,
        status: "PENDING",
        demo: true,
      });
    }
    if (preview.provider_compensation) {
      const splits = e.settlement_splits?.length
        ? e.settlement_splits
        : [{ provider_id: e.provider_id, share_bps: 10000 }];
      let allocated = 0;
      for (const [index, split] of splits.entries()) {
        const amount =
          index === splits.length - 1
            ? preview.provider_compensation - allocated
            : Math.floor(
                (preview.provider_compensation * split.share_bps) / 10000,
              );
        allocated += amount;
        m.earnings.push({
          id: next(m.earnings),
          event_id: e.id,
          provider_id: split.provider_id,
          owner_id: e.owner_id,
          gross: amount,
          net: amount,
          fees: 0,
          currency: e.currency,
          status: "SCHEDULED",
          available: true,
          payout_date: nextPayoutDate(db, split.provider_id, now()),
          frequency: m.frequencies[split.provider_id] || e.payout_frequency,
          type: "CANCELLATION_COMPENSATION",
          completed_at: now(),
          demo: true,
        });
        notify(
          a,
          split.provider_id,
          "Cancelación tardía · compensación " +
            (amount / 100).toFixed(2) +
            " " +
            e.currency +
            " programada.",
        );
      }
      e.payout_status = "SCHEDULED";
    }

    if (actor === "PROVIDER") {
      m.incidents.push({
        id: next(m.incidents),
        event_id: e.id,
        type: "PROVIDER_CANCELLATION",
        status: "NEEDS_REPLACEMENT",
        penalty_review_pending: true,
        reputation_review_pending: true,
        at: now(),
        reason: data.reason || "Cancelación proveedor",
        demo: true,
      });
      notify(
        a,
        e.owner_id,
        "Proveedor canceló · booking liberado, reembolso y sustitución disponibles.",
      );
    } else
      notify(
        a,
        e.provider_id,
        "Booking cancelado · compensación protegida: " +
          (preview.provider_compensation / 100).toFixed(2) +
          " " +
          e.currency,
      );
    audit(a, u.id, "CANCELLATION_PROCESSED", e.id);
    return {
      message: "Cancelación registrada · reembolso y compensación calculados",
      cancellation: record,
    };
  }
  function settingsUpdate(m, data) {
    if (
      data.default_frequency &&
      !["WEEKLY", "BIWEEKLY", "MONTHLY"].includes(data.default_frequency)
    )
      throw Error("Frecuencia inválida.");
    if (data.default_frequency)
      m.settings.default_frequency = data.default_frequency;
    if (data.payout_weekday !== undefined)
      m.settings.payout_weekday = integer(data.payout_weekday, 0, 6);
    if (data.fee_basis) {
      if (
        ![
          "monthly_gmv",
          "rolling_30_day_gmv",
          "annual_gmv",
          "enterprise_contract_tier",
        ].includes(data.fee_basis)
      )
        throw Error("Base de volumen inválida.");
      m.settings.fee_basis = data.fee_basis;
    }
    if (data.fee_tiers) {
      if (!Array.isArray(data.fee_tiers) || !data.fee_tiers.length)
        throw Error("Tabla de fees vacía.");
      let max = 0;
      m.settings.fee_tiers = data.fee_tiers.map((t) => {
        const v = integer(t.max, 1);
        if (v <= max) throw Error("Los límites deben aumentar.");
        max = v;
        return {
          name: String(t.name).slice(0, 50),
          max: v,
          bps: integer(t.bps, 0, 3000),
        };
      });
    }
    if (data.cancellation) {
      if (!Array.isArray(data.cancellation) || !data.cancellation.length)
        throw Error("Política vacía.");
      let threshold = 0;
      m.settings.cancellation = data.cancellation.map((p) => {
        const hours = integer(p.max_hours, 0, 1e6);
        if (hours <= threshold) throw Error("Los umbrales deben aumentar.");
        threshold = hours;
        const row = {
          max_hours: hours,
          penalty_bps: integer(p.penalty_bps, 0, 10000),
          active: p.active !== false,
          priority: integer(p.priority || 1, 1, 10000),
          provider_share_bps: integer(p.provider_share_bps, 0, 10000),
          arti_share_bps: integer(p.arti_share_bps || 0, 0, 10000),
          processing_share_bps: integer(p.processing_share_bps || 0, 0, 10000),
          tax_share_bps: integer(p.tax_share_bps || 0, 0, 10000),
        };
        if (
          row.provider_share_bps +
            row.arti_share_bps +
            row.processing_share_bps +
            row.tax_share_bps !==
          10000
        )
          throw Error("El pool debe distribuirse al 100%.");
        return row;
      });
    }
    if (data.fastpay) {
      const f = data.fastpay;
      if (!["USD", "DOP", "EUR"].includes(f.currency))
        throw Error("Moneda inválida.");
      m.settings.fastpay = {
        ...m.settings.fastpay,
        ...f,
        minimum_fee: integer(f.minimum_fee),
        percentage_bps: integer(f.percentage_bps, 0, 3000),
        fixed_fee: integer(f.fixed_fee),
        maximum_fee: integer(f.maximum_fee),
        provider_cost: integer(f.provider_cost),
      };
      if (m.settings.fastpay.minimum_fee > m.settings.fastpay.maximum_fee)
        throw Error("Mínimo mayor al máximo.");
    }
    for (const key of ["payment_bps", "insurance_bps"])
      if (data[key] !== undefined)
        m.settings[key] = integer(data[key], 0, 3000);
    if (data.infrastructure_fixed !== undefined)
      m.settings.infrastructure_fixed = integer(data.infrastructure_fixed);
  }
  function workspace(db, u) {
    const m = db.arti.money,
      admin = role(u) === "ADMIN",
      events = db.arti.events.filter(
        (e) =>
          admin ||
          [
            e.owner_id,
            e.provider_id,
            e.agency_id,
            ...(e.settlement_splits || []).map((s) => s.provider_id),
          ].includes(u.id),
      ),
      ids = events.map((e) => e.id);
    return {
      settings: admin
        ? m.settings
        : {
            default_frequency: m.settings.default_frequency,
            payout_weekday: m.settings.payout_weekday,
            fastpay: m.settings.fastpay,
            cancellation: m.settings.cancellation,
          },
      frequency: m.frequencies[u.id] || m.settings.default_frequency,
      payments: m.payments.filter(
        (x) => admin || x.owner_id === u.id || ids.includes(x.event_id),
      ),
      earnings: m.earnings.filter((x) => admin || x.provider_id === u.id),
      batches: m.batches.filter((b) => admin || b.provider_ids.includes(u.id)),
      refunds: m.refunds.filter((x) => admin || x.owner_id === u.id),
      cancellations: m.cancellations.filter((x) => ids.includes(x.event_id)),
      incidents: m.incidents.filter((x) => ids.includes(x.event_id)),
      ledger: admin
        ? m.ledger
        : m.ledger.filter((l) => ids.includes(l.event_id)),
      jobs: admin ? m.jobs : [],
      demo: true,
    };
  }
  function route(db, path, data, u) {
    const a = db.arti,
      m = a.money,
      p = path.replace("/api/arti/", "").split("/"),
      admin = role(u) === "ADMIN";
    if (p[0] === "legacy_cancel") {
      const b = db.bookings.find((b) => b.id === Number(p[1]));
      if (!b || (!admin && ![b.client_id, b.artist_id].includes(u.id)))
        throw Error("Reserva de otros participantes.");
      const prior = a.events.find((e) => e.legacy_booking_id === b.id);
      if (prior?.status === "CANCELLED")
        return {
          message: "Cancelación ya registrada",
          cancellation: prior.cancellation,
          event: prior,
        };
      const held = db.payments.find(
        (p) => p.booking_id === b.id && p.status === "HELD",
      );
      const e = prior || {
        cancellation_policy: b.cancellation_policy,
        id: next(a.events),
        legacy_booking_id: b.id,
        owner_id: b.client_id,
        provider_id: b.artist_id,
        performer_id: b.artist_id,
        venue_id: 1,
        title: b.title,
        start: b.start.replace(" ", "T") + "-04:00",
        end: b.end.replace(" ", "T") + "-04:00",
        rate: Math.round(b.amount * 100),
        currency: "DOP",
        terms: 0,
        status: "CONFIRMED",
        payment_model: "PROTECTED_V2",
        history: [],
        evidence: [],
        conditions: b.description || "Reserva anterior",
        demo: true,
      };
      register(db, e);
      e.funds_status = held ? "FUNDED" : "PAYMENT_REQUIRED";
      const actor = u.id === b.artist_id ? "PROVIDER" : "CLIENT";
      const preview = CancellationPolicyEngine.preview(e, now(), actor);
      if (!data?.confirm) return { preview, event: e };
      if (!prior) a.events.push(e);
      if (held) {
        e.funds_status = "PAYMENT_REQUIRED";
        fund(db, e, { id: b.client_id, role: "CLIENT" }, true);
        held.refund_amount = preview.refund / 100;
        held.status = "REFUNDED";
      }
      const result = cancel(db, e, u, { actor, confirm: true });
      b.status = held ? "REFUNDED" : "CANCELLED";
      b.cancellation = copy(result.cancellation);
      return { ...result, event: e };
    }
    if (p[0] === "money_settings") {
      if (!admin) throw Error("Solo Admin configura los pagos.");
      if (!data) return m.settings;
      settingsUpdate(m, data);
      describeRules(m.settings.cancellation);
      audit(a, u.id, "MONEY_SETTINGS_UPDATED", null);
      return {
        message:
          "Reglas financieras actualizadas · contratos existentes conservan su política",
      };
    }
    if (p[0] === "payout_frequency") {
      if (!data)
        return {
          frequency: m.frequencies[u.id] || m.settings.default_frequency,
        };
      if (!["WEEKLY", "BIWEEKLY", "MONTHLY"].includes(data.frequency))
        throw Error("Frecuencia inválida.");
      m.frequencies[u.id] = data.frequency;
      for (const e of m.earnings.filter(
        (e) =>
          e.provider_id === u.id && e.status === "SCHEDULED" && !e.batch_id,
      )) {
        e.frequency = data.frequency;
        e.payout_date = nextPayoutDate(db, u.id, e.completed_at);
      }
      return { message: "Frecuencia demo actualizada" };
    }
    if (p[0] === "payout") {
      if (!data) throw Error("Acción de payout requerida.");
      if (p[1] === "create")
        return PayoutEngine.createPayoutBatch(db, u, data.frequency, true);
      const b = m.batches.find((b) => b.id === Number(p[1]));
      if (!b) throw Error("Batch inexistente.");
      return PayoutEngine.completePayout(db, b, u, data.mode || "PAID");
    }
    if (p[0] === "money_demo") {
      if (!admin) throw Error("Solo Admin controla el reloj demo.");
      const hours = Number(data.hours);
      if (![240, 120, 48, 12, 5, 10].includes(hours))
        throw Error("Ventana demo inválida.");
      const amount = integer(data.amount || 50000, 100, 100000000);
      const start = new Date(Date.now() + hours * 3600000).toISOString();
      const e = {
        id: next(a.events),
        owner_id: 8,
        provider_id: 2,
        performer_id: 2,
        venue_id: 1,
        title: "Protección demo · " + hours + " horas",
        start,
        end: new Date(Date.parse(start) + 3 * 3600000).toISOString(),
        call_time: new Date(Date.parse(start) - 3600000).toISOString(),
        rate: amount,
        currency: "USD",
        terms: 0,
        status: "CONFIRMED",
        conditions: "Instancia individual de demostración",
        history: [],
        evidence: [],
        payment_model: "PROTECTED_V2",
        demo: true,
      };
      e.booking_id = e.id;
      a.events.push(e);
      register(db, e);
      fund(db, e, u, true);
      return {
        message: "Booking demo financiado · revisa antes de cancelar",
        event_id: e.id,
      };
    }
    if (p[0] === "money_jobs") {
      if (!admin) throw Error("Solo Admin simula jobs.");
      for (const e of a.events) release(db, e);
      const batches = PayoutEngine.createPayoutBatch(
        db,
        u,
        data.frequency || null,
        true,
      );
      m.jobs.push({
        id: next(m.jobs),
        name: "PAYOUT_CALCULATION_NOTIFICATIONS",
        status: "COMPLETED",
        at: now(),
        demo: true,
      });
      return batches;
    }
    if (p[0] === "refund") {
      const refund = m.refunds.find((r) => r.id === Number(p[1]));
      if (!refund) throw Error("Reembolso inexistente.");
      if (!admin && refund.owner_id !== u.id)
        throw Error("Reembolso de otro cliente.");
      if (a.events.find((e) => e.id === refund.event_id)?.status === "DISPUTED")
        throw Error("Reembolso en disputa: espera resolución.");
      if (refund.status === "PAID")
        return { message: "Reembolso ya procesado · sin duplicar" };
      if (data.mode === "FAILED") {
        refund.status = "FAILED";
        return { message: "Reembolso simulado fallido" };
      }
      refund.status = "PAID";
      refund.paid_at = now();
      ledger(a, "refund-" + refund.id, refund.event_id, refund.currency, [
        ["CLIENT_REFUND_PAYABLE", refund.amount, 0],
        ["DEMO_PAYMENT_CLEARING", 0, refund.amount],
      ]);
      audit(a, u.id, "REFUND_PROCESSED", refund.id);
      return { message: "Reembolso procesado · dinero ficticio" };
    }
    if (p[0] === "money_event") {
      const e = financialEvent(db, p[1], u);
      if (p[2] === "splits") {
        if (!admin && u.id !== e.provider_id)
          throw Error("Solo el coordinador configura distribución.");
        if (
          !Array.isArray(data.splits) ||
          !data.splits.length ||
          data.splits.reduce(
            (s, x) => s + integer(x.share_bps, 1, 10000),
            0,
          ) !== 10000
        )
          throw Error("Las participaciones deben sumar 100%.");
        const valid = [
          e.provider_id,
          ...(e.staffing_assignments || []).map((s) => s.provider_id),
        ].filter(Boolean);
        if (data.splits.some((x) => !valid.includes(Number(x.provider_id))))
          throw Error("Beneficiario ajeno al booking.");
        e.settlement_splits = data.splits.map((x) => ({
          provider_id: Number(x.provider_id),
          share_bps: integer(x.share_bps, 1, 10000),
        }));
        return { message: "Distribución de compensación guardada" };
      }
      if (p[2] === "resolve_force") {
        if (!admin) throw Error("Solo Admin revisa fuerza mayor.");
        const incident = m.incidents.find(
          (i) =>
            i.event_id === e.id &&
            i.type === "FORCE_MAJEURE" &&
            i.status === "MANUAL_REVIEW",
        );
        if (!incident) throw Error("Sin revisión pendiente.");
        e.status = e.previous_status || "CONFIRMED";
        incident.status = "RESOLVED";
        afterEvent(db, e);
        if (data.refund === true)
          return cancel(db, e, u, {
            actor: "FORCE_MAJEURE",
            manual_resolution: true,
            confirm: true,
          });
        return { message: "Revisión resuelta · booking continúa" };
      }
      if (p[2] === "pay") return fund(db, e, u, data.accepted_terms === true);
      if (p[2] === "cancel") return cancel(db, e, u, data);
      if (p[2] === "fastpay") return fastpay(db, e, u, data.confirm === true);
      if (p[2] === "preview")
        return {
          fees: e.fee_snapshot,
          cancellation: CancellationPolicyEngine.preview(e),
          payout_date: e.expected_payout_date,
        };
    }
    if (p[0] === "invoice" && data) {
      const inv = a.invoices.find((i) => i.id === Number(p[1])),
        e = a.events.find((e) => e.id === inv?.event_id);
      if (e?.payment_model === "PROTECTED_V2") {
        if (p[2] === "pay") return fund(db, e, u, true);
        if (p[2] === "fastpay") return fastpay(db, e, u, true);
      }
    }
    return null;
  }
  function afterEvent(db, e) {
    if (e.payment_model !== "PROTECTED_V2") return;
    const m = db.arti.money;
    if (e.status === "DISPUTED") {
      for (const earning of m.earnings.filter(
        (x) => x.event_id === e.id && x.status !== "PAID",
      )) {
        earning.previous_status = earning.status;
        earning.status = "ON_HOLD";
      }
      e.payout_status = "ON_HOLD";
    } else {
      for (const earning of m.earnings.filter(
        (x) => x.event_id === e.id && x.status === "ON_HOLD",
      ))
        earning.status = earning.previous_status || "SCHEDULED";
      release(db, e);
    }
  }
  root.ArtiPayments = {
    initialize,
    register,
    afterEvent,
    workspace,
    route,
    release,
    ledger,
    PricingEngine,
    PayoutEngine,
    CancellationPolicyEngine,
    nextPayoutDate,
    providers: { payout: payoutProvider, fastpay: fastPayProvider },
    interfaces: { PayoutProvider, FastPayProvider },
    MockPayoutProvider,
    MockFastPayProvider,
  };
  if (typeof module !== "undefined") module.exports = root.ArtiPayments;
})(typeof window !== "undefined" ? window : globalThis);
