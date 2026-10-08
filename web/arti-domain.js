/* Additive ARTI demo domain. All providers below are simulations; never money/GPS verification. */
(function (root) {
  "use strict";
  const payments =
    typeof module !== "undefined"
      ? require("./arti-payments.js")
      : root.ArtiPayments;
  const talent =
    typeof module !== "undefined"
      ? require("./arti-talent.js")
      : root.ArtiTalent;
  const access =
    typeof module !== "undefined"
      ? require("./arti-access.js")
      : root.ArtiAccess;
  const copy = (v) => JSON.parse(JSON.stringify(v));
  const now = () => new Date().toISOString();
  const next = (list) => Math.max(0, ...list.map((x) => x.id || 0)) + 1;
  const fail = (message) => {
    throw Error(message);
  };
  const num = (v, min = 1, max = 1e9) => {
    const n = Number(v);
    if (
      typeof v === "boolean" ||
      !Number.isSafeInteger(n) ||
      n < min ||
      n > max
    )
      fail("Introduce un número válido.");
    return n;
  };
  const text = (v, max = 2000) => {
    if (typeof v !== "string" || !v.trim() || v.length > max)
      fail("Completa los campos obligatorios.");
    return v.trim();
  };
  const https = (v) => {
    let u;
    try {
      u = new URL(v);
    } catch {
      fail("Usa una URL HTTPS.");
    }
    if (u.protocol !== "https:" || u.username || u.password)
      fail("Usa una URL HTTPS.");
    return u.href;
  };
  const stamp = (date, time) => date + "T" + time + "-04:00";
  const day = (base, n) => {
    const d = new Date(base + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const role = (u) =>
    u.demo_role ||
    {
      ARTIST: "ARTIST",
      BUSINESS: "ENTERPRISE",
      ADMIN: "ADMIN",
      CLIENT: "CLIENT",
    }[u.role];
  const providerRoles = ["ARTIST", "LEADER", "AGENCY"];
  const ownerRoles = ["CLIENT", "ENTERPRISE", "LEADER", "AGENCY"];
  const stages = [
    "CONFIRMED",
    "UPCOMING",
    "CALL_TIME",
    "ARRIVAL_REQUIRED",
    "ARRIVED",
    "SETUP",
    "SETUP_SUBMITTED",
    "SETUP_VERIFIED",
    "IN_PROGRESS",
    "COMPLETED",
    "SERVICE_VERIFIED",
    "INVOICED",
    "SETTLED",
  ];
  const scenarios = [
    [
      "individual",
      "Artista individual",
      "Una fecha, una propuesta y un contrato.",
    ],
    [
      "negotiation",
      "Precio y horario",
      "US$250 → 300 → 275; transporte y horario pactados.",
    ],
    [
      "residency",
      "Residencia de 24 eventos",
      "Aceptar todas o seleccionar fechas.",
    ],
    ["team", "Líder y equipo", "Miembros, asignaciones y calendario."],
    [
      "enterprise",
      "Contratación empresarial",
      "Publicar demanda y elegir propuestas.",
    ],
    ["late", "Llegada tarde", "17 minutos, advertencia y disputa."],
    [
      "replacement",
      "Ausencia y sustitución",
      "Detectar riesgo y elegir sustituto disponible.",
    ],
    ["invoice", "Factura NET 90", "Servicio verificado y vencimiento."],
    ["factoring", "Factoring", "Anticipo, coste y cobro al vencimiento."],
    ["fastpay", "Fast Pay", "Cobro anticipado y fee transparente."],
    ["insurance", "Seguro de crédito", "Póliza y cobertura ficticias."],
    ["mass", "Contratación masiva", "Plazas, disponibilidad y seguimiento."],
  ].map(([id, title, description]) => ({ id, title, description }));
  class PaymentProvider {
    pay() {
      fail("Proveedor de pago no configurado.");
    }
  }
  class FinancingProvider {
    quote() {
      fail("Proveedor financiero no configurado.");
    }
  }
  class InsuranceProvider {
    issue() {
      fail("Seguro no configurado.");
    }
  }
  class MediaStorageProvider {
    upload() {
      fail("Almacenamiento no configurado.");
    }
    generateUploadUrl() {
      fail("Almacenamiento no configurado.");
    }
    deleteMedia() {
      fail("Almacenamiento no configurado.");
    }
    getMetadata() {
      fail("Almacenamiento no configurado.");
    }
    generateThumbnail() {
      fail("Procesamiento no configurado.");
    }
    processVideo() {
      fail("Procesamiento no configurado.");
    }
    publishMedia() {
      fail("Publicación no configurada.");
    }
    setVisibility() {
      fail("Privacidad no configurada.");
    }
  }
  class NotificationProvider {
    send() {
      fail("Notificaciones no configuradas.");
    }
  }
  class GeolocationProvider {
    locate() {
      fail("Ubicación no configurada.");
    }
  }
  class MockPaymentProvider extends PaymentProvider {
    pay(invoice, mode = "success") {
      return {
        demo: true,
        reference: "DEMO-PAY-" + invoice.id,
        status:
          mode === "failed"
            ? "FAILED"
            : mode === "processing"
              ? "PROCESSING"
              : mode === "overdue"
                ? "OVERDUE"
                : "PAID",
        at: now(),
      };
    }
  }
  class MockFinancingProvider extends FinancingProvider {
    quote(i, c) {
      return {
        demo: true,
        provider: "Demo Factoring Provider",
        advance: Math.floor((i.total * c.advance_bps) / 10000),
        fee: Math.round((i.total * c.factoring_bps) / 10000),
        status: "APPROVED",
      };
    }
  }
  class MockInsuranceProvider extends InsuranceProvider {
    issue(i, c) {
      return {
        demo: true,
        provider: "Demo Credit Insurer",
        coverage: Math.round((i.total * c.insurance_coverage_bps) / 10000),
        coverage_bps: c.insurance_coverage_bps,
        status: "ACTIVE",
        reference: "DEMO-POL-" + i.id,
      };
    }
  }
  class MockMediaStorageProvider extends MediaStorageProvider {
    generateUploadUrl() {
      return {
        demo: true,
        method: "VISITOR_LOCAL",
        expires_at: new Date(Date.now() + 900000).toISOString(),
      };
    }
    deleteMedia(asset) {
      return { ...asset, status: "DELETED", demo: true };
    }
    getMetadata(asset) {
      return { ...asset, demo: true };
    }
    generateThumbnail() {
      return { url: "demo-stage.svg", demo: true };
    }
    processVideo(asset) {
      return { ...asset, processing_status: "SIMULATED", demo: true };
    }
    publishMedia(asset) {
      return { ...asset, status: "READY", demo: true };
    }
    setVisibility(asset, visibility) {
      if (
        ![
          "PUBLIC",
          "FOLLOWERS_ONLY",
          "PRIVATE",
          "ENTERPRISE_ONLY",
          "BOOKING_ONLY",
          "TEAM_ONLY",
          "ADMIN_ONLY",
        ].includes(visibility)
      )
        fail("Visibilidad inválida.");
      return { ...asset, visibility, demo: true };
    }
    upload(d) {
      if (d.file) {
        if (
          ![
            "image/jpeg",
            "image/png",
            "image/webp",
            "video/mp4",
            "video/webm",
            "video/quicktime",
            "audio/mpeg",
            "audio/wav",
            "application/pdf",
          ].includes(d.file.mime_type) ||
          num(d.file.size, 1, 104857600) < 1 ||
          (!d.file.storage_key &&
            (typeof d.file.data_url !== "string" ||
              !d.file.data_url.startsWith(
                "data:" + d.file.mime_type + ";base64,",
              )))
        )
          fail("Archivo inválido: foto o video de hasta 8 MB.");
      }
      return {
        demo: true,
        id:
          "DEMO-MEDIA-" +
          Date.now() +
          "-" +
          Math.random().toString(36).slice(2),
        url: d.file?.storage_key
          ? "arti-media://" + d.file.storage_key
          : d.url || "demo-stage.svg",
        storage_key: d.file?.storage_key || null,
        size_bytes: d.file?.size || 0,
        duration_seconds: d.file?.duration || null,
        thumbnail_url: "demo-stage.svg",
        cdn_url: d.file?.storage_key
          ? "arti-media://" + d.file.storage_key
          : null,
        file_name: d.file?.name || "",
        processing_status: "SIMULATED",
        mime_type: d.mime_type || "image/svg+xml",
        status: "READY",
        visibility: d.visibility || "PUBLIC",
        storage_provider: "MOCK_LOCAL",
      };
    }
  }
  class MockNotificationProvider extends NotificationProvider {
    send(user_id, body) {
      return { user_id, body, demo: true, read: false, created_at: now() };
    }
  }
  class MockGeolocationProvider extends GeolocationProvider {
    locate(venue, mode) {
      return {
        demo: true,
        lat: venue.lat + (mode === "outside" ? 0.02 : 0),
        lng: venue.lng,
        accuracy: 10,
        distance: mode === "outside" ? 2200 : 0,
        inside: mode !== "outside",
        captured_at: now(),
        method: "SIMULATED_GPS",
      };
    }
  }
  const mocks = {
    payment: new MockPaymentProvider(),
    financing: new MockFinancingProvider(),
    insurance: new MockInsuranceProvider(),
    media: new MockMediaStorageProvider(),
    notification: new MockNotificationProvider(),
    gps: new MockGeolocationProvider(),
  };
  function addUser(db, name, email, demo_role) {
    const u = {
      id: next(db.users),
      name,
      email: email + "@artivo.demo",
      role: demo_role === "ARTIST" ? "ARTIST" : "BUSINESS",
      demo_role,
      suspended: 0,
    };
    db.users.push(u);
    return u;
  }
  function ensure(db) {
    if (db.arti?.version === 1) {
      db.arti.settings.agency_share_of_commission_bps ??= 5000;
      db.arti.professional_posts ||= [];
      talent.seed(db);
      payments.initialize(db);
      return db.arti;
    }
    const base = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Santo_Domingo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const a = (db.arti = {
      version: 1,
      demo: true,
      base,
      settings: {
        hold_minutes: 15,
        round_limit: 8,
        call_minutes: 60,
        setup_minutes: 15,
        commission_bps: db.settings.commission_bps,
        agency_share_of_commission_bps: 5000,
        fastpay_bps: 200,
        factoring_bps: 225,
        advance_bps: 9000,
        insurance_coverage_bps: 9000,
        late_fee: 2500,
        late_score_points: 2,
        checkin_radius: 250,
      },
      organizations: [],
      venues: [],
      opportunities: [],
      offers: [],
      holds: [],
      events: [],
      teams: [],
      invoices: [],
      ledger: [],
      payments: [],
      financing: [],
      insurance: [],
      professional_posts: [],
      disputes: [],
      media: [],
      notifications: [],
      audit: [],
      credits: [],
      saved: [],
      declined: [],
      selected_scenario: null,
    });
    const names = [
      "Maria Santos",
      "Alex Rivera",
      "Pedro Méndez",
      "Lucía Torres",
    ];
    while (db.artists.length < 10) {
      const i = db.artists.length - 6,
        u = addUser(
          db,
          names[i] || "Artista Demo " + i,
          "artista" + i,
          "ARTIST",
        ),
        template = db.artists[i % 6];
      db.artists.push({
        ...copy(template),
        user_id: u.id,
        stage_name: u.name,
        photo: "demo-stage.svg",
        media_url: "demo-performance.mp4",
        rate: 7000,
        active: 1,
      });
      db.availability.push({
        id: next(db.availability),
        artist_id: u.id,
        start: base + "T00:00",
        end: day(base, 730) + "T23:59",
        kind: "AVAILABLE",
      });
    }
    for (const n of ["Caribbean Live Band", "Isla Soul Band"]) {
      const u = addUser(db, n, "band" + db.artists.length, "ARTIST");
      db.artists.push({
        ...copy(db.artists[0]),
        user_id: u.id,
        stage_name: n,
        category_id: 6,
        photo: "demo-stage.svg",
        media_url: "demo-performance.mp4",
        rate: 18000,
      });
      db.availability.push({
        id: next(db.availability),
        artist_id: u.id,
        start: base + "T00:00",
        end: day(base, 730) + "T23:59",
        kind: "AVAILABLE",
      });
    }
    db.artists.forEach((p, i) => {
      if (
        !db.availability.some(
          (v) =>
            v.artist_id === p.user_id &&
            v.kind === "AVAILABLE" &&
            v.end >= day(base, 730) + "T23:59",
        )
      )
        db.availability.push({
          id: next(db.availability),
          artist_id: p.user_id,
          start: base + "T00:00",
          end: day(base, 730) + "T23:59",
          kind: "AVAILABLE",
        });
      p.demo_stats = {
        rating: 4.6 + (i % 4) / 10,
        punctuality: 96 + (i % 4),
        completed: 42 + i * 7,
      };
      p.demo_price_usd = i === 0 ? 250 : 150 + i * 10;
      p.instruments = ["Piano", "Voz", "Guitarra", "DJ"][i % 4];
      p.experience = "Trayectoria de muestra · " + (5 + i) + " años";
      p.cover = "demo-stage.svg";
      p.media_url ||= "demo-performance.mp4";
      if (
        !db.posts.some(
          (x) => x.artist_id === p.user_id && x.media_type === "VIDEO",
        )
      )
        db.posts.push({
          id: next(db.posts),
          artist_id: p.user_id,
          caption: "Portfolio demo · ensayo y talento disponible para eventos.",
          media_type: "VIDEO",
          media_url: "demo-performance.mp4",
          created_at: now().slice(0, 19).replace("T", " "),
        });
    });
    const leaders = Array.from({ length: 5 }, (_, i) =>
      addUser(
        db,
        [
          "Carlos Rivera",
          "Ana Gómez",
          "Luis Herrera",
          "Camila Ruiz",
          "Diego Santana",
        ][i],
        i ? "leader" + i : "lider",
        "LEADER",
      ),
    );
    const agencies = Array.from({ length: 3 }, (_, i) =>
      addUser(
        db,
        [
          "Caribbean Entertainment Agency",
          "Isla Talent Agency",
          "Escena Producciones",
        ][i],
        i ? "agency" + i : "agencia",
        "AGENCY",
      ),
    );
    const enterprise = db.users.find((u) => u.email === "business@artivo.demo");
    enterprise.demo_role = "ENTERPRISE";
    enterprise.name = "Grand Caribe Resort";
    const enterprises = [
      enterprise,
      ...Array.from({ length: 4 }, (_, i) =>
        addUser(
          db,
          [
            "Punta Cana Luxury Hotel",
            "Caribbean Events Group",
            "Mar Azul Resorts",
            "Casa de Música",
          ][i],
          "enterprise" + i,
          "ENTERPRISE",
        ),
      ),
    ];
    for (const [i, u] of [...enterprises, ...agencies].entries()) {
      a.organizations.push({
        id: i + 1,
        owner_id: u.id,
        name: u.name,
        type: role(u),
        verification: "DEMO_VERIFIED",
      });
      if (role(u) === "ENTERPRISE")
        a.credits.push({
          id: i + 1,
          owner_id: u.id,
          currency: "USD",
          limit: 5000000,
          used: 1850000,
          status: "APPROVED",
          terms: 90,
          demo: true,
        });
    }
    for (const [i, u] of [...enterprises, ...leaders, ...agencies].entries()) {
      a.professional_posts.push({
        id: i + 1,
        owner_id: u.id,
        body:
          role(u) === "ENTERPRISE"
            ? "Buscamos talento para nuestra programación. Consulta nuestras oportunidades."
            : role(u) === "LEADER"
              ? "Nuestro equipo prepara una nueva temporada. Conectemos talento y escenarios."
              : "Representamos talento y coordinamos producciones para eventos.",
        likes: [],
        comments: [],
        saves: [],
        created_at: now(),
        demo: true,
      });
    }
    for (let i = 0; i < 10; i++) {
      a.venues.push({
        id: i + 1,
        organization_id: 1 + Math.floor(i / 2),
        name:
          [
            "Main Stage",
            "Beach Club",
            "Pool Venue",
            "Convention Center",
            "Lobby Piano Bar",
          ][i % 5] +
          " · " +
          enterprises[Math.floor(i / 2)].name,
        city: "Punta Cana",
        country: "DO",
        timezone: "America/Santo_Domingo",
        lat: 18.582,
        lng: -68.405,
        radius: a.settings.checkin_radius,
      });
    }
    leaders.forEach((u, i) =>
      a.teams.push({
        id: i + 1,
        leader_id: u.id,
        name: [
          "Caribbean Live Band",
          "Isla Soul",
          "Banda Coral",
          "Tropical Jazz",
          "Noche Latina",
        ][i],
        members: db.artists.slice(0, 5).map((p, j) => ({
          user_id: p.user_id,
          instrument: ["Piano", "Bajo", "Batería", "Voz", "Guitarra"][j],
          status: "ACCEPTED",
        })),
      }),
    );
    for (let i = 0; i < 50; i++) {
      const dates = Array.from({ length: i === 0 ? 24 : 2 }, (_, j) => ({
        id: j + 1,
        start: stamp(
          day(
            base,
            i === 0 ? 8 + Math.floor(j / 2) * 7 + (j % 2) : 45 + i * 3 + j,
          ),
          "20:00",
        ),
        end: stamp(
          day(
            base,
            i === 0 ? 9 + Math.floor(j / 2) * 7 + (j % 2) : 46 + i * 3 + j,
          ),
          "00:00",
        ),
        capacity: i === 0 ? 1 : 2,
      }));
      a.opportunities.push({
        id: i + 1,
        owner_id: enterprises[i % 5].id,
        origin_id: enterprises[i % 5].id,
        title:
          i === 0
            ? "Residencia DJ · 24 fechas"
            : [
                "Banda en vivo",
                "Noche de piano",
                "DJ Beach Club",
                "Voces para eventos",
                "Producción y sonido",
              ][i % 5] +
              " · " +
              (i + 1),
        category:
          i === 0
            ? "DJ"
            : ["Banda", "Pianista", "DJ", "Cantante", "Técnico"][i % 5],
        city: "Punta Cana",
        venue_id: (i % 10) + 1,
        currency: "USD",
        rate: i === 0 ? 25000 : 20000 + (i % 6) * 5000,
        quantity: i === 0 ? 1 : 2,
        terms: i === 0 ? 90 : [30, 60, 90][i % 3],
        requirements:
          "Equipo propio · presentación profesional · repertorio acordado",
        contract_type: i === 0 ? "RESIDENCY" : "SERIES",
        negotiable: true,
        visibility: "PUBLIC",
        deadline: day(base, 30),
        dates,
        status: "OPEN",
        created_at: now(),
        demo: true,
      });
    }
    for (let i = 0; i < 100; i++) {
      const o = a.opportunities[i < 98 ? 1 + Math.floor(i / 2) : 0],
        date = o.dates[i < 98 ? i % 2 : i - 98],
        p = db.artists[i % db.artists.length],
        status =
          i < 20
            ? "SETTLED"
            : i < 35
              ? "INVOICED"
              : i === 35
                ? "NO_SHOW"
                : i === 36
                  ? "DISPUTED"
                  : i < 40
                    ? "ARRIVED"
                    : "CONFIRMED",
        past = i < 40;
      const e = {
        id: i + 1,
        opportunity_id: o.id,
        date_id: date.id,
        owner_id: o.owner_id,
        provider_id: i === 40 ? leaders[0].id : p.user_id,
        performer_id: p.user_id,
        agency_id: i % 10 === 0 ? agencies[0].id : null,
        team_id: i === 40 ? 1 : null,
        venue_id: o.venue_id,
        title: o.title,
        currency: o.currency,
        rate: o.rate,
        terms: o.terms,
        start: past ? stamp(day(base, -45 + i), "20:00") : date.start,
        end: past ? stamp(day(base, -44 + i), "00:00") : date.end,
        call_time: "",
        status,
        original_provider_id: p.user_id,
        conditions: "Equipo propio · transporte incluido",
        commission_bps: a.settings.commission_bps,
        late_minutes: i === 37 ? 17 : 0,
        setup: past ? "VERIFIED" : "PENDING",
        evidence: [],
        history: [{ status, at: now(), by: 9, demo: true }],
        demo: true,
      };
      e.call_time = new Date(
        Date.parse(e.start) - a.settings.call_minutes * 60000,
      ).toISOString();
      if (past) {
        date.start = e.start;
        date.end = e.end;
      }
      a.events.push(e);
      if (i < 35) {
        const inv = invoice(a, e);
        if (i < 20) {
          inv.status = "PAID";
          inv.customer_paid = true;
          ledger(a, inv, "customer-payment-" + inv.id, [
            ["DEMO_CASH", inv.total, 0],
            ["ACCOUNTS_RECEIVABLE", 0, inv.total],
          ]);
          settle(a, inv, e, i % 4 === 0);
          a.payments.push({
            id: next(a.payments),
            invoice_id: inv.id,
            ...mocks.payment.pay(inv),
          });
        }
      }
    }
    a.opportunities
      .filter((o) => o.dates.every((d) => Date.parse(d.end) < Date.now()))
      .forEach((o) => {
        o.status = "CLOSED";
        o.deadline = o.dates[0].start.slice(0, 10);
      });
    for (let i = 0; i < 5; i++) {
      const o = a.opportunities[i + 25],
        p = db.artists[i],
        f = {
          id: i + 1,
          opportunity_id: o.id,
          provider_id: p.user_id,
          team_id: null,
          agency_id: null,
          status: "NEGOTIATING",
          date_ids: [1],
          rounds: [
            {
              by: o.owner_id,
              rate: o.rate,
              start_time: "20:00",
              end_time: "00:00",
              conditions: o.requirements,
              at: now(),
            },
            {
              by: p.user_id,
              rate: o.rate + 5000,
              start_time: "21:00",
              end_time: "01:00",
              conditions: "Transporte incluido",
              at: now(),
            },
          ],
        };
      a.offers.push(f);
    }
    for (const index of [38, 39]) {
      const e = a.events[index];
      a.disputes.push({
        id: next(a.disputes),
        event_id: e.id,
        opened_by: e.owner_id,
        reason: "Discrepancia de servicio · caso demo",
        status: "REVIEW",
        previous_status: e.status,
        created_at: now(),
        history: [],
      });
      e.previous_status = e.status;
      e.status = "DISPUTED";
    }
    a.disputes.push({
      id: next(a.disputes),
      event_id: 37,
      opened_by: a.events[36].owner_id,
      reason: "Llegada tarde · evidencia pendiente de revisión",
      status: "OPEN",
      created_at: now(),
      history: [],
    });
    for (let i = 20; i < 23; i++) {
      const inv = a.invoices[i];
      const q = mocks.financing.quote(inv, a.settings);
      a.financing.push({ id: i - 19, invoice_id: inv.id, ...q });
      if (i === 20) inv.status = "FINANCED";
      a.insurance.push({
        id: i - 19,
        invoice_id: inv.id,
        ...mocks.insurance.issue(inv, a.settings),
      });
    }
    talent.seed(db);
    payments.initialize(db);
    return a;
  }
  function log(a, u, action, entity) {
    a.audit.unshift({
      id: next(a.audit),
      by: u.id,
      action,
      entity,
      at: now(),
      demo: true,
    });
  }
  function notify(a, id, body) {
    a.notifications.unshift({
      id: next(a.notifications),
      ...mocks.notification.send(id, body),
    });
  }
  function get(a, table, id) {
    return (
      a[table].find((x) => x.id === Number(id)) ||
      fail("Registro no encontrado.")
    );
  }
  function participant(e, u) {
    if (
      role(u) !== "ADMIN" &&
      ![
        e.owner_id,
        e.provider_id,
        e.performer_id,
        e.agency_id,
        ...(e.settlement_splits || []).map((s) => s.provider_id),
      ].includes(u.id)
    )
      fail("Esta operación pertenece a otros participantes.");
  }
  function range(start, end) {
    if (
      !Number.isFinite(Date.parse(start)) ||
      !Number.isFinite(Date.parse(end)) ||
      Date.parse(end) <= Date.parse(start) ||
      Date.parse(end) - Date.parse(start) > 86400000
    )
      fail("Horario inválido.");
  }
  function conflict(
    db,
    artist,
    start,
    end,
    exclude = 0,
    offerId = 0,
    legacyExclude = 0,
    callMinutes = null,
  ) {
    const a = ensure(db),
      call = new Date(
        Date.parse(start) - (callMinutes ?? a.settings.call_minutes) * 60000,
      ).toISOString(),
      over = (s, e) =>
        Date.parse(s) < Date.parse(end) && Date.parse(e) > Date.parse(call);
    return (
      db.bookings.some(
        (b) =>
          b.id !== legacyExclude &&
          b.artist_id === artist &&
          ["PAYMENT_PENDING", "CONFIRMED", "IN_PROGRESS", "DISPUTED"].includes(
            b.status,
          ) &&
          over(b.start + "-04:00", b.end + "-04:00"),
      ) ||
      db.availability.some(
        (b) =>
          b.artist_id === artist &&
          b.kind === "BLOCKED" &&
          over(b.start + "-04:00", b.end + "-04:00"),
      ) ||
      a.events.some(
        (e) =>
          e.id !== exclude &&
          (e.performer_id === artist ||
            e.staffing_assignments?.some((s) => s.provider_id === artist)) &&
          !["CANCELLED", "SETTLED"].includes(e.status) &&
          over(e.call_time, e.end),
      ) ||
      a.holds.some(
        (h) =>
          h.offer_id !== offerId &&
          h.provider_id === artist &&
          Date.parse(h.expires) > Date.now() &&
          over(h.start, h.end),
      )
    );
  }
  function invoice(a, e) {
    let i = a.invoices.find((x) => x.event_id === e.id);
    if (i) return i;
    i = {
      id: next(a.invoices),
      number: "INV-" + (10000 + next(a.invoices)),
      event_id: e.id,
      owner_id: e.owner_id,
      provider_id: e.provider_id,
      currency: e.currency,
      total: e.rate,
      terms: e.terms,
      due: day(e.end.slice(0, 10), e.terms),
      status: "ACCEPTED",
      customer_paid: false,
      created_at: now(),
      demo: true,
    };
    a.invoices.push(i);
    ledger(a, i, "invoice-issued-" + i.id, [
      ["ACCOUNTS_RECEIVABLE", i.total, 0],
      ["SERVICE_CLEARING", 0, i.total],
    ]);
    return i;
  }
  function ledger(a, i, reference, entries) {
    if (a.ledger.some((x) => x.reference === reference)) return;
    let balance = 0;
    entries.forEach(([account, debit, credit]) => (balance += debit - credit));
    if (balance !== 0) fail("El asiento no está equilibrado.");
    a.ledger.push({
      id: next(a.ledger),
      invoice_id: i.id,
      currency: i.currency,
      reference,
      entries: entries.map(([account, debit, credit]) => ({
        account,
        debit,
        credit,
      })),
      at: now(),
      demo: true,
    });
  }
  function settle(a, i, e, fast) {
    if (i.settled) return;
    const commission = Math.round((i.total * e.commission_bps) / 10000),
      fastFee = fast
        ? Math.round((i.total * a.settings.fastpay_bps) / 10000)
        : 0,
      agency = e.agency_id
        ? Math.floor(
            (commission * (a.settings.agency_share_of_commission_bps || 0)) /
              10000,
          )
        : 0,
      financingFee = a.financing.find((f) => f.invoice_id === i.id)?.fee || 0;
    ledger(a, i, "settlement-" + i.id, [
      ["SERVICE_CLEARING", i.total, 0],
      ["PROVIDER_PAYABLE", 0, i.total - commission - fastFee - financingFee],
      ["FINANCING_FEE_RECOVERY", 0, financingFee],
      ["ARTI_REVENUE", 0, commission - agency],
      ["AGENCY_PAYABLE", 0, agency],
      ["FASTPAY_REVENUE", 0, fastFee],
    ]);
    i.settled = true;
    i.net = i.total - commission - fastFee - financingFee;
    i.financing_fee = financingFee;
    i.platform_fee = commission - agency;
    i.agency_fee = agency;
    i.fastpay_fee = fastFee;
    i.payout_status = fast ? "PAID_TODAY" : "PAID";
    ledger(a, i, "provider-payout-" + i.id, [
      ["PROVIDER_PAYABLE", i.net, 0],
      ["DEMO_CASH", 0, i.net],
    ]);
    e.status = "SETTLED";
  }
  function terms(o, r, date) {
    const dateKey = date.start.slice(0, 10),
      start = stamp(dateKey, r.start_time);
    let end = stamp(dateKey, r.end_time);
    if (Date.parse(end) <= Date.parse(start))
      end = stamp(day(dateKey, 1), r.end_time);
    range(start, end);
    return { start, end };
  }
  function route(db, path, data, u) {
    const a = ensure(db),
      url = new URL(path, "https://arti.demo"),
      p = url.pathname.replace("/api/arti", "").split("/").filter(Boolean),
      write = data !== undefined;
    data = data || {};
    if (root.ARTI_DEMO_MODE === false)
      fail("Los servicios reales todavía no están configurados.");
    if (!u || u.suspended) fail("Selecciona una cuenta demo activa.");
    const r = role(u),
      admin = r === "ADMIN";
    a.media_settings ||= {
      maximum_bytes: 8388608,
      maximum_duration_seconds: 180,
      formats: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "video/mp4",
        "video/webm",
        "video/quicktime",
        "audio/mpeg",
        "audio/wav",
        "application/pdf",
      ],
    };
    if (p[0] === "media_settings") {
      if (!write) return copy(a.media_settings);
      if (!admin) fail("Solo Admin configura archivos.");
      a.media_settings.maximum_bytes = num(data.maximum_bytes, 1024, 104857600);
      a.media_settings.maximum_duration_seconds = num(
        data.maximum_duration_seconds,
        1,
        3600,
      );
      log(a, u, "MEDIA_SETTINGS_UPDATED", null);
      return { message: "Límites de archivos actualizados" };
    }
    if (p[0] === "asset") {
      const asset = a.media.find((x) => x.id === p[1]);
      const mediaAccess =
        typeof module !== "undefined"
          ? require("./arti-media.js")
          : root.ArtiMedia;
      if (!asset || !mediaAccess.allowed(db, asset, u))
        fail("Archivo privado.");
      return copy(asset);
    }
    const requiredPermission = access.apiPermission(url.pathname, write);
    if (requiredPermission) access.assert(u, requiredPermission);
    if (p[0] === "demo_accounts" && !write)
      return {
        users: db.users
          .filter((x) => x.email.endsWith("@artivo.demo"))
          .map(({ id, name, email, role, demo_role, suspended }) => ({
            id,
            name,
            email,
            role,
            demo_role,
            suspended,
            profession:
              db.artists
                .find((p) => p.user_id === id)
                ?.specialties.map((s) => s.name)
                .join(" / ") || "",
          })),
      };
    if (p[0] === "tutorial") {
      a.tutorials ||= {};
      const key =
        String(u.id) +
        ":" +
        r +
        ":" +
        (data.module || url.searchParams.get("module") || "role");
      const current = a.tutorials[key] || { status: "NOT_STARTED", step: 0 };
      if (!write) return copy(current);
      if (
        !["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "SKIPPED"].includes(
          data.status,
        )
      )
        fail("Estado de tutoría inválido.");
      const limit = access.steps(u).length;
      const step = num(data.step ?? 0, 0, Math.max(limit - 1, 0));
      a.tutorials[key] = { status: data.status, step, updated_at: now() };
      return copy(a.tutorials[key]);
    }
    if (p[0] === "conversation") {
      a.conversations ||= [];
      if (!p[1]) {
        if (!write)
          return a.conversations.filter((c) => c.participants.includes(u.id));
        const other = db.users.find(
          (x) => x.id === Number(data.user_id) && !x.suspended,
        );
        if (!other || other.id === u.id)
          fail("Elige otro participante activo.");
        let c = a.conversations.find(
          (c) =>
            c.participants.includes(u.id) && c.participants.includes(other.id),
        );
        if (!c) {
          c = {
            id: next(a.conversations),
            participants: [u.id, other.id],
            messages: [],
          };
          a.conversations.push(c);
        }
        return copy(c);
      }
      const c = a.conversations.find((c) => c.id === Number(p[1]));
      if (!c || !c.participants.includes(u.id)) fail("Conversación privada.");
      if (write) {
        c.messages.push({
          id: next(c.messages),
          sender_id: u.id,
          body: text(data.body, 3000),
          at: now(),
        });
        notify(
          a,
          c.participants.find((id) => id !== u.id),
          "Nuevo mensaje profesional en ARTI.",
        );
      }
      return copy(c);
    }
    const monetary = payments.route(
      db,
      url.pathname,
      write ? data : undefined,
      u,
    );
    if (monetary) return monetary;
    const extended = talent.route(
      db,
      url.pathname,
      data && write ? data : undefined,
      u,
      conflict,
    );
    if (extended) return extended;
    if (p[0] === "workspace" && !write) {
      const events = a.events.filter(
        (e) =>
          admin ||
          [
            e.owner_id,
            e.provider_id,
            e.performer_id,
            e.agency_id,
            ...(e.settlement_splits || []).map((s) => s.provider_id),
          ].includes(u.id),
      );
      const ids = events.map((e) => e.id);
      return {
        role: r,
        money: payments.workspace(db, u),
        settings: a.settings,
        taxonomy: a.taxonomy,
        equipment: a.equipment.filter((e) => admin || e.owner_id === u.id),
        talent_availability: (a.talent_availability || []).filter(
          (x) => admin || x.user_id === u.id,
        ),
        penalty_rules: admin ? a.penalty_rules : [],
        professional_posts: a.professional_posts.filter(
          (p) =>
            !p.media_url ||
            (typeof module !== "undefined"
              ? require("./arti-media.js")
              : root.ArtiMedia
            ).allowed(
              db,
              a.media.find((x) => x.url === p.media_url),
              u,
            ),
        ),
        community_follows: (a.community_follows || []).filter(
          (x) => x.user_id === u.id,
        ),
        media_settings: a.media_settings,
        organizations: a.organizations,
        venues: a.venues,
        opportunities: a.opportunities
          .filter(
            (o) => o.visibility === "PUBLIC" || o.owner_id === u.id || admin,
          )
          .map((o) => ({
            ...o,
            staffing_summary: talent.staffingSummary(db, o),
            slot_counts: o.dates.map((d) => ({
              date_id: d.id,
              booked: a.events.filter(
                (e) =>
                  e.opportunity_id === o.id &&
                  e.date_id === d.id &&
                  e.status !== "CANCELLED",
              ).length,
              held: a.holds.filter(
                (h) =>
                  h.opportunity_id === o.id &&
                  h.date_id === d.id &&
                  Date.parse(h.expires) > Date.now(),
              ).length,
            })),
          })),
        offers: a.offers.filter(
          (f) =>
            admin ||
            f.provider_id === u.id ||
            get(a, "opportunities", f.opportunity_id).owner_id === u.id,
        ),
        holds: a.holds.filter(
          (h) =>
            Date.parse(h.expires) > Date.now() &&
            (admin ||
              h.provider_id === u.id ||
              get(a, "opportunities", h.opportunity_id).owner_id === u.id),
        ),
        events: events.map((e) => ({
          ...e,
          candidates: db.artists
            .filter((p) =>
              talent.qualified(p, {
                category_key: e.category_key,
                skills: e.required_skills,
                requires_certification: e.requires_certification,
              }),
            )
            .map((p) => ({
              artist_id: p.user_id,
              available:
                !db.users.find((u) => u.id === p.user_id)?.suspended &&
                !conflict(db, p.user_id, e.start, e.end, e.id),
              distance_km: 5 + (p.user_id % 10),
              demo: true,
            })),
        })),
        teams: a.teams.filter(
          (t) =>
            admin ||
            t.leader_id === u.id ||
            t.members.some((m) => m.user_id === u.id),
        ),
        artists: db.artists.map((p) =>
          admin || p.user_id === u.id
            ? p
            : {
                ...p,
                certifications: p.certifications?.map(
                  ({ document, ...c }) => c,
                ),
              },
        ),
        users: admin
          ? db.users
          : db.users.map(({ id, name, role, demo_role, suspended }) => ({
              id,
              name,
              role,
              demo_role,
              suspended,
            })),
        credits: a.credits.filter((c) => admin || c.owner_id === u.id),
        invoices: a.invoices.filter((i) => ids.includes(i.event_id)),
        ledger: ["ADMIN", "ENTERPRISE"].includes(r)
          ? a.ledger.filter((l) =>
              ids.includes(get(a, "invoices", l.invoice_id).event_id),
            )
          : [],
        financing: ["ADMIN", "ENTERPRISE"].includes(r)
          ? a.financing.filter((f) =>
              ids.includes(get(a, "invoices", f.invoice_id).event_id),
            )
          : [],
        insurance: ["ADMIN", "ENTERPRISE"].includes(r)
          ? a.insurance.filter((f) =>
              ids.includes(get(a, "invoices", f.invoice_id).event_id),
            )
          : [],
        disputes: a.disputes.filter((d) => ids.includes(d.event_id)),
        notifications: a.notifications.filter((n) => n.user_id === u.id),
        audit: admin ? a.audit : a.audit.filter((x) => x.by === u.id),
        scenarios,
        selected_scenario: a.selected_scenario,
        saved: a.saved.filter((x) => x.user_id === u.id),
        declined: a.declined.filter((x) => x.user_id === u.id),
        counts: {
          artists: db.artists.length,
          leaders: db.users.filter((x) => role(x) === "LEADER").length,
          agencies: db.users.filter((x) => role(x) === "AGENCY").length,
          enterprises: a.credits.length,
          venues: a.venues.length,
          opportunities: a.opportunities.length,
          events: a.events.length,
        },
      };
    }
    if (!write) fail("Ruta no disponible.");
    if (p[0] === "community_follow") {
      a.community_follows ||= [];
      const other = db.users.find(
        (x) => x.id === Number(data.user_id) && !x.suspended,
      );
      if (!other || other.id === u.id) fail("Perfil inválido.");
      const i = a.community_follows.findIndex(
        (x) => x.user_id === u.id && x.followed_id === other.id,
      );
      if (i >= 0) a.community_follows.splice(i, 1);
      else a.community_follows.push({ user_id: u.id, followed_id: other.id });
      return {
        message: i >= 0 ? "Seguimiento actualizado" : "Siguiendo este perfil",
      };
    }
    if (p[0] === "social") {
      if (p.length === 1) {
        a.professional_posts.unshift({
          id: next(a.professional_posts),
          owner_id: u.id,
          body: text(data.body, 2200),
          likes: [],
          comments: [],
          saves: [],
          created_at: now(),
          demo: true,
        });
        log(a, u, "PROFESSIONAL_POST", a.professional_posts[0].id);
        return { message: "Publicación profesional creada" };
      }
      const post = get(a, "professional_posts", p[1]);
      if (
        post.media_url &&
        !(
          typeof module !== "undefined"
            ? require("./arti-media.js")
            : root.ArtiMedia
        ).allowed(
          db,
          a.media.find((x) => x.url === post.media_url),
          u,
        )
      )
        fail("Contenido privado.");
      if (p[2] === "comment") {
        post.comments.push({
          by: u.id,
          body: text(data.body, 1000),
          at: now(),
        });
      } else if (["like", "save"].includes(p[2])) {
        const key = p[2] === "like" ? "likes" : "saves",
          index = post[key].indexOf(u.id);
        if (index < 0) post[key].push(u.id);
        else post[key].splice(index, 1);
      } else fail("Acción social inválida.");
      return { message: "Interacción registrada" };
    }
    if (p[0] === "scenario") {
      const s =
        scenarios.find((s) => s.id === data.id) || fail("Escenario inválido.");
      a.selected_scenario = s.id;
      let target, opportunity;
      if (
        [
          "individual",
          "negotiation",
          "residency",
          "team",
          "enterprise",
          "mass",
        ].includes(s.id)
      ) {
        const source = a.opportunities.find((o) => o.id === 1),
          count =
            s.id === "individual" || s.id === "negotiation"
              ? 1
              : s.id === "team"
                ? 20
                : 24;
        opportunity = {
          ...copy(source),
          id: next(a.opportunities),
          title: "Escenario · " + s.title,
          category:
            s.id === "individual" || s.id === "negotiation"
              ? "Pianista"
              : s.id === "team"
                ? "Banda"
                : "DJ",
          quantity: s.id === "mass" ? 2 : 1,
          deadline: day(a.base, 365),
          dates: Array.from({ length: count }, (_, j) => ({
            id: j + 1,
            start: stamp(
              day(
                a.base,
                210 +
                  [
                    "individual",
                    "negotiation",
                    "residency",
                    "team",
                    "enterprise",
                    "mass",
                  ].indexOf(s.id) +
                  j * 7,
              ),
              "20:00",
            ),
            end: stamp(
              day(
                a.base,
                211 +
                  [
                    "individual",
                    "negotiation",
                    "residency",
                    "team",
                    "enterprise",
                    "mass",
                  ].indexOf(s.id) +
                  j * 7,
              ),
              "00:00",
            ),
            capacity: s.id === "mass" ? 2 : 1,
          })),
        };
        a.opportunities.unshift(opportunity);
        a.scenario_opportunity = opportunity.id;
      }
      if (
        [
          "late",
          "replacement",
          "invoice",
          "factoring",
          "fastpay",
          "insurance",
        ].includes(s.id)
      ) {
        const o = a.opportunities.find((o) => o.id === 1),
          status =
            s.id === "late"
              ? "ARRIVAL_REQUIRED"
              : s.id === "replacement"
                ? "NO_SHOW"
                : "SERVICE_VERIFIED";
        target = {
          ...copy(a.events[50]),
          id: next(a.events),
          provider_id: 2,
          performer_id: 2,
          owner_id: 8,
          agency_id: null,
          team_id: null,
          title: "Escenario · " + s.title,
          opportunity_id: o.id,
          date_id: 1,
          status,
          rate: s.id === "factoring" || s.id === "insurance" ? 800000 : 50000,
          terms: 90,
          evidence: [],
          history: [],
          late_minutes: 0,
          setup: "PENDING",
        };
        let scenarioOffset = 0;
        while (
          conflict(
            db,
            2,
            stamp(day(a.base, scenarioOffset), "20:00"),
            stamp(day(a.base, scenarioOffset + 1), "00:00"),
          ) &&
          scenarioOffset < 730
        )
          scenarioOffset++;
        const scenarioDate = day(a.base, scenarioOffset);
        target.start = stamp(scenarioDate, "20:00");
        target.end = stamp(day(scenarioDate, 1), "00:00");
        target.venue_id = 1;
        target.call_time = new Date(
          Date.parse(target.start) - a.settings.call_minutes * 60000,
        ).toISOString();
        const scenarioOpportunity = {
          ...copy(o),
          id: next(a.opportunities),
          title: target.title,
          venue_id: 1,
          owner_id: 8,
          rate: target.rate,
          dates: [{ id: 1, start: target.start, end: target.end, capacity: 1 }],
          quantity: 1,
          contract_type: "SINGLE",
          deadline: day(a.base, 365),
        };
        a.opportunities.unshift(scenarioOpportunity);
        target.opportunity_id = scenarioOpportunity.id;
        target.history.push({ status, at: now(), by: u.id, demo: true });
        target.demo_clock_at = new Date(
          Date.parse(target.call_time) - 17 * 60000,
        ).toISOString();
        target.demo_clock_received = now();
        a.events.push(target);
        if (status === "SERVICE_VERIFIED") {
          invoice(a, target);
          target.status = "INVOICED";
        }
        a.scenario_event = target.id;
      }
      log(a, u, "SCENARIO_SELECTED", s.id);
      return {
        message: "Escenario preparado · " + s.title,
        event_id: target?.id,
        opportunity_id: opportunity?.id || 1,
      };
    }
    if (p[0] === "opportunities" && p.length === 1) {
      if (!ownerRoles.includes(r) && !admin)
        fail("Esta cuenta no puede publicar oportunidades.");
      const currency = data.currency;
      if (!["USD", "DOP", "EUR"].includes(currency)) fail("Moneda inválida.");
      const venue = get(a, "venues", data.venue_id),
        org = get(a, "organizations", venue.organization_id);
      if (r === "ENTERPRISE" && org.owner_id !== u.id)
        fail("Elige un venue de tu empresa.");
      const dates = [];
      const count = num(data.count, 1, 1000),
        interval = num(data.interval_days, 1, 365),
        date = text(data.date, 10),
        startTime = text(data.start_time, 5),
        endTime = text(data.end_time, 5);
      for (let j = 0; j < count; j++) {
        const t = terms(
          null,
          { start_time: startTime, end_time: endTime },
          { start: stamp(day(date, j * interval), startTime) },
        );
        if (Date.parse(t.start) < Date.now())
          fail("Selecciona fechas futuras.");
        dates.push({ id: j + 1, ...t, capacity: num(data.quantity, 1, 100) });
      }
      const o = {
        id: next(a.opportunities),
        owner_id: u.id,
        origin_id: u.id,
        title: text(data.title, 120),
        category: text(data.category, 60),
        category_key: data.category_key || null,
        payment_model: data.payment_model || "PROTECTED_V2",
        service_id: data.service_id || data.category_key || "music:live",
        booking_type:
          data.booking_type ||
          (talent.category(db, data.category_key)?.technical
            ? "TECHNICAL_BOOKING"
            : "MUSIC_BOOKING"),
        call_minutes: num(
          data.call_minutes ?? a.settings.call_minutes,
          0,
          1440,
        ),
        demand_type: data.demand_type || "INDIVIDUAL OPPORTUNITY",
        required_skills: (data.required_skills || []).map((x) => text(x, 120)),
        requires_certification:
          !!data.requires_certification ||
          !!talent.category(db, data.category_key)?.sensitive,
        staffing: data.staffing || [],
        operational_schedule: data.operational_schedule || {},
        city: venue.city,
        venue_id: venue.id,
        currency,
        rate: num(data.rate),
        quantity: num(data.quantity, 1, 100),
        terms: num(data.terms, 0, 90),
        requirements: text(data.requirements),
        negotiable: data.negotiable !== false,
        contract_type: count > 1 ? "SERIES" : "SINGLE",
        deadline: text(data.deadline, 10),
        visibility: "PUBLIC",
        dates,
        status: "OPEN",
        created_at: now(),
        demo: true,
      };
      if (
        o.category_key &&
        o.category_key !== "FULL_PRODUCTION" &&
        !talent.category(db, o.category_key)?.enabled
      )
        fail("Categoría deshabilitada.");
      if (
        !Array.isArray(o.staffing) ||
        o.staffing.some(
          (x) =>
            !talent.category(db, x.category_key)?.enabled ||
            !Number.isSafeInteger(Number(x.quantity)) ||
            Number(x.quantity) < 1 ||
            Number(x.quantity) > 100,
        )
      )
        fail("Plazas de staffing inválidas.");
      o.staffing = o.staffing.map((x, i) => ({
        id: i + 1,
        category_key: x.category_key,
        label: text(x.label || x.category_key, 120),
        quantity: Number(x.quantity),
        skills: x.skills || [],
      }));
      if (Date.parse(o.deadline + "T23:59:59-04:00") < Date.now())
        fail("La fecha límite ya pasó.");
      a.opportunities.unshift(o);
      notify(a, 2, "Nueva oportunidad: " + o.title);
      log(a, u, "OPPORTUNITY_PUBLISHED", o.id);
      return { message: "Oportunidad publicada", id: o.id };
    }
    if (p[0] === "opportunity") {
      const o = get(a, "opportunities", p[1]);
      if (o.visibility !== "PUBLIC" && !admin && o.owner_id !== u.id)
        fail("Oportunidad privada.");
      const action = p[2];
      if (
        action === "apply" &&
        o.category_key &&
        o.category_key !== "FULL_PRODUCTION" &&
        !talent.category(db, o.category_key)?.enabled
      )
        fail("Categoría deshabilitada.");
      if (action === "invite") {
        if (o.owner_id !== u.id) fail("Solo el solicitante invita.");
        const invited = db.users.find(
          (x) => x.id === num(data.user_id) && !x.suspended,
        );
        if (!invited || !providerRoles.includes(role(invited)))
          fail("Proveedor inválido.");
        const result = route(
          db,
          "/api/arti/opportunity/" + o.id + "/apply",
          {
            ...data,
            rate: o.rate,
            conditions: o.requirements,
            start_time: o.dates[0].start.slice(11, 16),
            end_time: o.dates[0].end.slice(11, 16),
          },
          invited,
        );
        get(a, "offers", result.id).rounds.pop();
        notify(a, invited.id, "Invitación recibida: " + o.title);
        log(a, u, "PROVIDER_INVITED", result.id);
        return { message: "Invitación enviada", id: result.id };
      }
      if (["save", "decline"].includes(action)) {
        const key = action === "save" ? "saved" : "declined",
          old = a[key].findIndex(
            (x) => x.user_id === u.id && x.opportunity_id === o.id,
          );
        if (old >= 0) a[key].splice(old, 1);
        else a[key].push({ user_id: u.id, opportunity_id: o.id });
        return {
          message:
            action === "save"
              ? "Guardado actualizado"
              : "Preferencia actualizada",
        };
      }
      if (action === "apply") {
        if (!providerRoles.includes(r) || o.owner_id === u.id)
          fail(
            "Selecciona un artista, líder o agencia diferente al solicitante.",
          );
        if (
          o.status !== "OPEN" ||
          Date.parse(o.deadline + "T23:59:59-04:00") < Date.now()
        )
          fail("La oportunidad está cerrada.");
        if (
          a.offers.some(
            (f) =>
              f.opportunity_id === o.id &&
              f.provider_id === u.id &&
              !["REJECTED", "EXPIRED"].includes(f.status),
          )
        )
          fail("Ya tienes una propuesta activa.");
        const ids = [
          ...new Set((data.date_ids || []).map((x) => num(x, 1, 1000))),
        ];
        if (!ids.length || ids.some((id) => !o.dates.some((d) => d.id === id)))
          fail("Selecciona al menos una fecha válida.");
        const team = data.team_id ? get(a, "teams", data.team_id) : null;
        if (team && team.leader_id !== u.id)
          fail("Ese equipo no te pertenece.");
        const profile = db.artists.find((p) => p.user_id === u.id);
        if (
          r === "ARTIST" &&
          !o.staffing?.length &&
          !talent.qualified(profile, {
            category_key: o.category_key,
            skills: o.required_skills,
            requires_certification: o.requires_certification,
          })
        )
          fail(
            "Tu perfil no cumple categoría, habilidades o documentos verificados requeridos.",
          );
        if (
          o.staffing?.length &&
          r === "ARTIST" &&
          profile?.entity_type === "INDIVIDUAL"
        )
          fail(
            "Esta oportunidad requiere una propuesta de equipo, crew o agencia.",
          );
        const f = {
          id: next(a.offers),
          opportunity_id: o.id,
          provider_id: u.id,
          team_id: team?.id || null,
          agency_id: r === "AGENCY" ? u.id : null,
          date_ids: ids,
          status: "NEGOTIATING",
          rounds: [
            {
              by: o.owner_id,
              rate: o.rate,
              start_time: o.dates[0].start.slice(11, 16),
              end_time: o.dates[0].end.slice(11, 16),
              conditions: o.requirements,
              at: now(),
            },
            {
              by: u.id,
              rate: num(data.rate),
              start_time: text(data.start_time, 5),
              end_time: text(data.end_time, 5),
              conditions: text(data.conditions),
              at: now(),
            },
          ],
        };
        if (
          !o.negotiable &&
          (f.rounds[1].rate !== o.rate ||
            f.rounds[1].conditions !== o.requirements ||
            f.rounds[1].start_time !== f.rounds[0].start_time ||
            f.rounds[1].end_time !== f.rounds[0].end_time)
        )
          fail("Esta oportunidad no permite contraofertas.");
        for (const id of ids) {
          const d = get({ dates: o.dates }, "dates", id),
            t = terms(o, f.rounds.at(-1), d);
          if (
            r === "ARTIST" &&
            conflict(db, u.id, t.start, t.end, 0, 0, 0, o.call_minutes)
          )
            fail("Hay un conflicto de agenda en las fechas seleccionadas.");
          if (
            a.events.filter(
              (e) =>
                e.opportunity_id === o.id &&
                e.date_id === id &&
                e.status !== "CANCELLED",
            ).length +
              a.holds.filter(
                (h) =>
                  h.opportunity_id === o.id &&
                  h.date_id === id &&
                  Date.parse(h.expires) > Date.now(),
              ).length >=
            d.capacity
          )
            fail("Una de las fechas ya no tiene plazas.");
          a.holds.push({
            id: next(a.holds),
            offer_id: f.id,
            opportunity_id: o.id,
            provider_id: u.id,
            date_id: id,
            ...t,
            expires: new Date(
              Date.now() + a.settings.hold_minutes * 60000,
            ).toISOString(),
          });
        }
        a.offers.push(f);
        notify(a, o.owner_id, "Nueva propuesta para " + o.title);
        log(a, u, "OFFER_SENT", f.id);
        return {
          message: "Propuesta enviada · fechas reservadas temporalmente",
          id: f.id,
        };
      }
    }
    if (p[0] === "offer") {
      const f = get(a, "offers", p[1]),
        o = get(a, "opportunities", f.opportunity_id);
      if (![f.provider_id, o.owner_id].includes(u.id))
        fail("No participas en esta negociación.");
      if (f.status !== "NEGOTIATING") fail("Esta propuesta ya fue respondida.");
      const action = p[2],
        last = f.rounds.at(-1);
      if (action === "counter") {
        if (!o.negotiable) fail("No admite negociación.");
        if (last.by === u.id) fail("Espera la respuesta de la otra parte.");
        if (f.rounds.length >= a.settings.round_limit)
          fail("Se alcanzó el máximo de rondas.");
        const round = {
          by: u.id,
          rate: num(data.rate),
          start_time: text(data.start_time, 5),
          end_time: text(data.end_time, 5),
          conditions: text(data.conditions),
          at: now(),
        };
        for (const id of f.date_ids)
          terms(
            o,
            round,
            o.dates.find((d) => d.id === id),
          );
        f.rounds.push(round);
        a.holds
          .filter((h) => h.offer_id === f.id)
          .forEach((h) => {
            Object.assign(
              h,
              terms(
                o,
                round,
                o.dates.find((d) => d.id === h.date_id),
              ),
            );
            h.expires = new Date(
              Date.now() + a.settings.hold_minutes * 60000,
            ).toISOString();
          });
        notify(a, last.by, "Contraoferta recibida");
        log(a, u, "COUNTER_OFFER", f.id);
        return { message: "Contraoferta enviada" };
      }
      if (action === "reject") {
        f.status = "REJECTED";
        a.holds = a.holds.filter((h) => h.offer_id !== f.id);
        log(a, u, "OFFER_REJECTED", f.id);
        return { message: "Propuesta rechazada · fechas liberadas" };
      }
      if (action === "accept") {
        if (last.by === u.id)
          fail("Solo la otra parte puede aceptar esta propuesta.");
        if (Date.parse(o.deadline + "T23:59:59-04:00") < Date.now())
          fail("La oportunidad expiró.");
        const created = [];
        for (const id of f.date_ids) {
          const d = o.dates.find((d) => d.id === id),
            t = terms(o, last, d);
          if (Date.parse(t.start) < Date.now()) fail("La fecha ya pasó.");
          if (
            a.events.filter(
              (e) =>
                e.opportunity_id === o.id &&
                e.date_id === id &&
                e.status !== "CANCELLED",
            ).length >= d.capacity
          )
            fail("Ya no hay plazas disponibles.");
          const performer =
            role(db.users.find((x) => x.id === f.provider_id)) === "ARTIST"
              ? f.provider_id
              : null;
          if (
            performer &&
            conflict(db, performer, t.start, t.end, 0, f.id, 0, o.call_minutes)
          )
            fail("Conflicto de calendario.");
          created.push({
            id: next(a.events) + created.length,
            opportunity_id: o.id,
            date_id: id,
            offer_id: f.id,
            owner_id: o.owner_id,
            provider_id: f.provider_id,
            performer_id: performer,
            team_id: f.team_id,
            agency_id: f.agency_id,
            venue_id: o.venue_id,
            title: o.title,
            ...t,
            call_time: new Date(
              Date.parse(t.start) -
                (o.call_minutes ?? a.settings.call_minutes) * 60000,
            ).toISOString(),
            payment_model: o.payment_model,
            service_id: o.service_id || "music:live",
            booking_type: o.booking_type || "MUSIC_BOOKING",
            category_key: o.category_key,
            required_skills: o.required_skills || [],
            requires_certification: o.requires_certification,
            staffing_assignments: talent.assignments(o),
            technical_stage: "PENDING",
            operational_schedule: o.operational_schedule || {},
            operational_minutes:
              (Date.parse(t.end) - Date.parse(t.start)) / 60000 +
              (o.call_minutes ?? a.settings.call_minutes),
            rate: last.rate,
            currency: o.currency,
            terms: o.terms,
            conditions: last.conditions,
            commission_bps: a.settings.commission_bps,
            status: "CONFIRMED",
            setup: "PENDING",
            evidence: [],
            history: [],
            demo: true,
          });
        }
        for (let x = 0; x < created.length; x++)
          for (let y = x + 1; y < created.length; y++)
            if (
              Date.parse(created[x].call_time) < Date.parse(created[y].end) &&
              Date.parse(created[x].end) > Date.parse(created[y].call_time)
            )
              fail("Las fechas del acuerdo se solapan.");
        const credit = a.credits.find(
          (c) => c.owner_id === o.owner_id && c.currency === o.currency,
        );
        if (o.payment_model === "PROTECTED_V2" && o.terms > 0 && !credit)
          fail(
            "Este plazo requiere crédito demo aprobado en la moneda del contrato.",
          );
        if (credit && o.terms > 0) {
          const total = created.reduce((s, e) => s + e.rate, 0);
          if (
            !["APPROVED", "LIMITED"].includes(credit.status) ||
            credit.used + total > credit.limit
          )
            fail("Crédito demo no disponible para este acuerdo.");
          credit.used += total;
          created.forEach((e) => (e.credit_reserved = true));
        }
        a.events.push(...created);
        created.forEach((e) => {
          payments.register(db, e);
          if (e.fee_snapshot) e.commission_bps = e.fee_snapshot.bps;
        });
        f.status = "ACCEPTED";
        f.accepted_by = u.id;
        f.accepted_at = now();
        a.holds = a.holds.filter((h) => h.offer_id !== f.id);
        notify(
          a,
          f.provider_id,
          "Reserva confirmada · " + created.length + " fechas",
        );
        log(a, u, "BOOKING_CONFIRMED", f.id);
        return {
          message: "Contrato confirmado · " + created.length + " eventos",
          event_id: created[0].id,
        };
      }
    }
    if (p[0] === "teams" && p.length === 1) {
      if (r !== "LEADER") fail("Solo un líder puede crear equipos.");
      const t = {
        id: next(a.teams),
        leader_id: u.id,
        name: text(data.name, 100),
        members: [],
      };
      a.teams.push(t);
      log(a, u, "TEAM_CREATED", t.id);
      return { message: "Equipo creado", id: t.id };
    }
    if (p[0] === "team") {
      const t = get(a, "teams", p[1]);
      if (p[2] === "member") {
        if (t.leader_id !== u.id) fail("Este equipo no te pertenece.");
        const artist = db.artists.find(
          (x) => x.user_id === Number(data.user_id),
        );
        if (!artist) fail("Selecciona un artista.");
        if (t.members.some((m) => m.user_id === artist.user_id))
          fail("Ya forma parte del equipo.");
        t.members.push({
          user_id: artist.user_id,
          instrument: text(data.instrument, 80),
          status: "INVITED",
        });
        notify(a, artist.user_id, "Invitación al equipo " + t.name);
        return { message: "Invitación enviada" };
      }
      if (p[2] === "join") {
        const m =
          t.members.find((m) => m.user_id === u.id) ||
          fail("No tienes una invitación.");
        m.status = data.accept === false ? "DECLINED" : "ACCEPTED";
        return { message: "Invitación respondida" };
      }
    }
    if (p[0] === "event") {
      const e = get(a, "events", p[1]);
      participant(e, u);
      const action = p[2];
      if (
        e.payment_model === "PROTECTED_V2" &&
        e.funds_status === "PAYMENT_REQUIRED" &&
        ["arrival", "late", "setup", "start", "next"].includes(action)
      )
        fail("El cliente debe pagar para confirmar la reserva protegida.");
      if (
        e.booking_type === "TECHNICAL_BOOKING" &&
        action === "start" &&
        e.technical_stage !== "READY"
      )
        fail("Completa load-in, setup y soundcheck antes del show.");
      if (
        e.booking_type === "TECHNICAL_BOOKING" &&
        action === "verify" &&
        e.technical_stage !== "STRIKE_COMPLETED"
      )
        fail("Completa strike antes de verificar el servicio.");
      if (action === "clock") {
        e.demo_clock_at = new Date(
          Date.parse(
            e.demo_clock_at ||
              new Date(Date.parse(e.call_time) - 17 * 60000).toISOString(),
          ) +
            num(data.minutes || 15, 1, 180) * 60000,
        ).toISOString();
        e.demo_clock_received = now();
        log(a, u, "DEMO_CLOCK_ADVANCED", e.id);
        return { message: "Reloj del evento adelantado 15 minutos" };
      }
      if (action === "assign" || action === "replace") {
        if (
          !admin &&
          u.id !== e.owner_id &&
          u.id !== e.provider_id &&
          u.id !== e.agency_id
        )
          fail("Solo el coordinador puede asignar.");
        if (
          [
            "CANCELLED",
            "DISPUTED",
            "SETTLED",
            "INVOICED",
            "SERVICE_VERIFIED",
          ].includes(e.status)
        )
          fail("El servicio ya fue verificado.");
        const artist =
          db.artists.find((x) => x.user_id === num(data.artist_id)) ||
          fail("Artista inválido.");
        if (
          !talent.qualified(artist, {
            category_key: e.category_key,
            skills: e.required_skills,
            requires_certification: e.requires_certification,
          })
        )
          fail("Profesión, habilidades o certificación incompatibles.");
        if (db.users.find((x) => x.id === artist.user_id)?.suspended)
          fail("Cuenta suspendida.");
        if (conflict(db, artist.user_id, e.start, e.end, e.id))
          fail("Conflicto de agenda: elige otro artista.");
        e.original_provider_id ||= e.performer_id;
        e.performer_id = artist.user_id;
        e.assignment = "ASSIGNED";
        if (action === "replace") {
          e.status = "CONFIRMED";
          e.setup = "PENDING";
          e.replacement_at = now();
          if (role(db.users.find((u) => u.id === e.provider_id)) === "ARTIST")
            e.provider_id = artist.user_id;
        }
        e.history.push({
          status:
            action === "replace" ? "REPLACEMENT_ASSIGNED" : "ARTIST_ASSIGNED",
          by: u.id,
          performer_id: artist.user_id,
          at: now(),
          demo: true,
        });
        log(a, u, "ARTIST_" + action.toUpperCase(), e.id);
        notify(a, artist.user_id, "Evento asignado: " + e.title);
        return {
          message:
            action === "replace" ? "Sustituto asignado" : "Artista asignado",
        };
      }
      if (action === "dispute") {
        const d = {
          id: next(a.disputes),
          event_id: e.id,
          opened_by: u.id,
          reason: text(data.reason),
          status: "OPEN",
          created_at: now(),
          history: [],
          previous_status: e.status,
          cancellation_snapshot: e.cancellation ? copy(e.cancellation) : null,
        };
        a.disputes.push(d);
        e.previous_status = e.status;
        e.status = "DISPUTED";
        payments.afterEvent(db, e);
        log(a, u, "DISPUTE_OPENED", d.id);
        return { message: "Disputa abierta · liquidación detenida" };
      }
      if (e.status === "DISPUTED")
        fail("Resuelve la disputa antes de continuar.");
      if (action === "next") {
        if (!admin)
          fail("El avance libre está reservado al presentador Admin.");
        const at = stages.indexOf(e.status);
        if (at < 0 || at === stages.length - 1)
          fail("No hay un siguiente estado.");
        const to = stages[at + 1];
        if (to === "SETUP_SUBMITTED")
          e.evidence.push({
            id: next(e.evidence),
            ...mocks.media.upload({}),
            by: e.performer_id || e.provider_id,
            at: now(),
            event_id: e.id,
            booking_id: e.id,
          });
        if (to === "ARRIVED")
          e.checkin = mocks.gps.locate(get(a, "venues", e.venue_id), "inside");
        if (to === "SETUP_VERIFIED") {
          e.setup = "VERIFIED";
          if (e.booking_type === "TECHNICAL_BOOKING")
            e.technical_stage = "READY";
        }
        if (to === "COMPLETED" && e.booking_type === "TECHNICAL_BOOKING")
          e.technical_stage = "STRIKE_COMPLETED";
        if (to === "INVOICED") invoice(a, e);
        if (to === "SETTLED")
          route(db, "/api/arti/invoice/" + invoice(a, e).id + "/pay", {}, u);
        e.status = to;
      } else if (["arrival", "late", "outside", "noshow"].includes(action)) {
        if (
          ![
            "CONFIRMED",
            "UPCOMING",
            "CALL_TIME",
            "ARRIVAL_REQUIRED",
            "NO_SHOW",
          ].includes(e.status)
        )
          fail("La llegada ya fue registrada.");
        if (!admin && ![e.performer_id, e.provider_id].includes(u.id))
          fail("Solo el proveedor registra llegada.");
        e.checkin = mocks.gps.locate(
          get(a, "venues", e.venue_id),
          action === "outside" ? "outside" : "inside",
        );
        e.status =
          action === "noshow"
            ? "NO_SHOW"
            : action === "outside"
              ? "ARRIVAL_REQUIRED"
              : "ARRIVED";
        e.late_minutes = action === "late" ? 17 : 0;
        e.checkin.received_at = now();
        e.checkin.simulated_arrival_at = new Date(
          Date.parse(e.call_time) + e.late_minutes * 60000,
        ).toISOString();
        if (e.late_minutes) {
          e.penalty = {
            fee:
              a.penalty_rules?.find(
                (rule) =>
                  rule.category_key === e.category_key &&
                  e.late_minutes >= rule.delay_minutes,
              )?.fee ?? a.settings.late_fee,
            currency: e.currency,
            status: "WARNING",
            score_before: 98,
            score_after: 98 - a.settings.late_score_points,
            demo: true,
          };
          notify(a, e.owner_id, "Llegada con 17 minutos de retraso");
        }
        if (action === "noshow")
          notify(a, e.owner_id, "Evento en riesgo · requiere sustituto");
      } else if (action === "setup") {
        if (!admin && ![e.provider_id, e.performer_id].includes(u.id))
          fail("Solo el proveedor entrega evidencia.");
        if (!["ARRIVED", "SETUP"].includes(e.status))
          fail("Registra llegada antes del setup.");
        const media = mocks.media.upload({
          url: data.url ? https(data.url) : undefined,
          visibility: "BOOKING_ONLY",
        });
        e.evidence.push({
          id: next(e.evidence),
          ...media,
          by: u.id,
          at: now(),
          event_id: e.id,
          booking_id: e.id,
          location: e.checkin,
        });
        e.status = "SETUP_SUBMITTED";
        e.setup = "SUBMITTED";
      } else if (action === "verify_setup") {
        if (!admin && u.id !== e.owner_id)
          fail("Solo el solicitante verifica el setup.");
        if (e.status !== "SETUP_SUBMITTED")
          fail("Todavía no hay setup pendiente.");
        e.setup = data.accept === false ? "REJECTED" : "VERIFIED";
        e.status = data.accept === false ? "ARRIVED" : "SETUP_VERIFIED";
      } else if (action === "start") {
        if (!admin && ![e.provider_id, e.performer_id].includes(u.id))
          fail("Solo el proveedor inicia.");
        if (
          e.staffing_assignments?.length &&
          e.staffing_assignments.some((s) => !s.provider_id)
        )
          fail("Completa todas las plazas antes de iniciar el paquete.");
        if (!e.performer_id && !e.staffing_assignments?.length)
          fail("Asigna un intérprete antes de iniciar el evento.");
        if (e.status !== "SETUP_VERIFIED")
          fail("El setup debe estar verificado.");
        e.status = "IN_PROGRESS";
      } else if (action === "complete") {
        if (!admin && ![e.provider_id, e.performer_id].includes(u.id))
          fail("Solo el proveedor completa.");
        if (e.status !== "IN_PROGRESS") fail("El evento no está en curso.");
        e.status = "COMPLETED";
      } else if (action === "verify") {
        if (!admin && u.id !== e.owner_id)
          fail("Solo el solicitante verifica el servicio.");
        if (e.status !== "COMPLETED")
          fail("Espera la finalización del servicio.");
        e.status = "INVOICED";
        invoice(a, e);
      } else fail("Acción no disponible.");
      payments.afterEvent(db, e);
      e.history.push({ status: e.status, by: u.id, at: now(), demo: true });
      log(a, u, "EVENT_" + action.toUpperCase(), e.id);
      return {
        message: {
          arrival: "Llegada simulada registrada",
          late: "Retraso y advertencia registrados",
          outside: "Fuera de geozona simulada",
          noshow: "Ausencia registrada · evento en riesgo",
          setup: "Evidencia enviada",
          verify_setup: "Revisión de setup registrada",
          start: "Evento iniciado",
          complete: "Evento completado",
          verify: "Servicio verificado · factura generada",
          next: "Estado avanzado",
        }[action],
      };
    }
    if (p[0] === "invoice") {
      const i = get(a, "invoices", p[1]),
        e = get(a, "events", i.event_id);
      participant(e, u);
      if (e.status === "DISPUTED") fail("La factura tiene una disputa.");
      const action = p[2];
      if (action === "finance") {
        if (!admin && u.id !== i.owner_id && u.id !== i.provider_id)
          fail("No puedes financiar esta factura.");
        if (i.settled || a.financing.some((f) => f.invoice_id === i.id))
          fail("Esta factura ya fue pagada o financiada.");
        const q = mocks.financing.quote(i, a.settings);
        a.financing.push({ id: next(a.financing), invoice_id: i.id, ...q });
        i.status = "FINANCED";
        ledger(a, i, "advance-" + i.id, [
          ["DEMO_CASH", q.advance, 0],
          ["FACTOR_LIABILITY", 0, q.advance],
        ]);
        log(a, u, "FINANCING_SIMULATED", i.id);
        return { message: "Factoring simulado aprobado" };
      }
      if (action === "insurance") {
        if (!admin && ![i.owner_id, i.provider_id].includes(u.id))
          fail("No puedes emitir esta póliza.");
        if (a.insurance.some((x) => x.invoice_id === i.id))
          fail("Ya existe cobertura demo.");
        a.insurance.push({
          id: next(a.insurance),
          invoice_id: i.id,
          ...mocks.insurance.issue(i, a.settings),
        });
        log(a, u, "INSURANCE_SIMULATED", i.id);
        return { message: "Cobertura ficticia activada" };
      }
      if (action === "pay" || action === "fastpay") {
        if (action === "pay" && !admin && u.id !== i.owner_id)
          fail("Solo el solicitante simula el pago.");
        if (
          action === "fastpay" &&
          !admin &&
          ![i.provider_id, e.performer_id].includes(u.id)
        )
          fail("Solo el proveedor solicita Fast Pay.");
        if (
          (action === "fastpay" && i.settled) ||
          (action === "pay" && i.customer_paid)
        )
          fail("Esta factura ya fue liquidada.");
        const payment = mocks.payment.pay(i, data.mode || "success");
        a.payments.push({ id: next(a.payments), invoice_id: i.id, ...payment });
        if (payment.status === "PAID") {
          const financed = a.financing.find((f) => f.invoice_id === i.id);
          if (financed && action === "pay") {
            ledger(a, i, "factor-repay-" + i.id, [
              ["FACTOR_LIABILITY", financed.advance, 0],
              ["FINANCING_COST", financed.fee, 0],
              ["DEMO_CASH", 0, financed.advance + financed.fee],
            ]);
            financed.status = "SETTLED";
          }
          if (action === "pay") {
            i.status = "PAID";
            i.customer_paid = true;
            ledger(a, i, "customer-payment-" + i.id, [
              ["DEMO_CASH", i.total, 0],
              ["ACCOUNTS_RECEIVABLE", 0, i.total],
            ]);
            if (i.fastpay_funding)
              ledger(a, i, "fastpay-repay-" + i.id, [
                ["FASTPAY_LIABILITY", i.fastpay_funding, 0],
                ["DEMO_CASH", 0, i.fastpay_funding],
              ]);
            const credit = a.credits.find(
              (c) => c.owner_id === e.owner_id && c.currency === e.currency,
            );
            if (credit && e.credit_reserved) {
              credit.used = Math.max(0, credit.used - e.rate);
              e.credit_reserved = false;
            }
          } else if (!financed) {
            i.fastpay_funding =
              i.total -
              Math.round((i.total * e.commission_bps) / 10000) -
              Math.round((i.total * a.settings.fastpay_bps) / 10000);
            ledger(a, i, "fastpay-funding-" + i.id, [
              ["DEMO_CASH", i.fastpay_funding, 0],
              ["FASTPAY_LIABILITY", 0, i.fastpay_funding],
            ]);
          }
          settle(a, i, e, action === "fastpay");
        } else i.status = payment.status;
        log(a, u, "PAYMENT_" + payment.status, i.id);
        return {
          message:
            payment.status === "PAID"
              ? action === "fastpay"
                ? "Fast Pay simulado · pagado hoy"
                : "Pago simulado y liquidado"
              : "Pago simulado · " + payment.status,
        };
      }
    }
    if (p[0] === "dispute") {
      if (!admin) fail("Solo Admin resuelve casos.");
      const d = get(a, "disputes", p[1]),
        e = get(a, "events", d.event_id);
      if (
        !["REVIEW", "REQUEST_EVIDENCE", "RESOLVED", "REJECTED"].includes(
          data.status,
        )
      )
        fail("Estado inválido.");
      d.status = data.status;
      d.history.push({
        status: d.status,
        by: u.id,
        note: text(data.note),
        at: now(),
      });
      if (["RESOLVED", "REJECTED"].includes(d.status)) {
        e.status = d.previous_status || e.previous_status || "ARRIVED";
        if (e.penalty)
          e.penalty.status = d.status === "RESOLVED" ? "REVERSED" : "REVIEWED";
      }
      payments.afterEvent(db, e);
      log(a, u, "DISPUTE_" + d.status, d.id);
      return { message: "Disputa actualizada" };
    }
    if (p[0] === "credit") {
      const c = get(a, "credits", p[1]);
      if (!admin && c.owner_id !== u.id) fail("Crédito de otra empresa.");
      if (
        ![
          "APPROVED",
          "LIMITED",
          "SUSPENDED",
          "PENDING_REVIEW",
          "REJECTED",
        ].includes(data.status)
      )
        fail("Estado inválido.");
      c.status = data.status;
      log(a, u, "CREDIT_SIMULATED", c.id);
      return { message: "Estado de crédito demo actualizado" };
    }
    if (p[0] === "settings") {
      if (!admin) fail("Solo Admin configura reglas.");
      for (const [key, min, max] of [
        ["hold_minutes", 1, 120],
        ["round_limit", 2, 30],
        ["agency_share_of_commission_bps", 0, 10000],
        ["commission_bps", 0, 3000],
        ["fastpay_bps", 0, 3000],
        ["factoring_bps", 0, 3000],
        ["advance_bps", 0, 10000],
        ["insurance_coverage_bps", 0, 10000],
        ["late_fee", 0, 100000],
        ["call_minutes", 0, 180],
        ["checkin_radius", 10, 2000],
      ])
        if (data[key] !== undefined) a.settings[key] = num(data[key], min, max);
      log(a, u, "RULES_UPDATED", null);
      return { message: "Reglas de demo actualizadas" };
    }
    if (p[0] === "artist_profile") {
      if (r !== "ARTIST") fail("Perfil de artista requerido.");
      const profile =
        db.artists.find((p) => p.user_id === u.id) ||
        fail("Perfil no encontrado.");
      profile.demo_price_usd = num(data.price_from, 1, 100000);
      profile.instruments = text(data.instruments, 200);
      profile.experience = text(data.experience, 500);
      log(a, u, "DEMO_PROFILE_UPDATED", u.id);
      return { message: "Perfil profesional demo actualizado" };
    }
    if (p[0] === "media") {
      if (!access.can(u, "media.create"))
        fail("Permiso de contenido requerido.");
      if (
        data.file &&
        (!a.media_settings.formats.includes(data.file.mime_type) ||
          data.file.size > a.media_settings.maximum_bytes ||
          Number(data.file.duration || 0) >
            a.media_settings.maximum_duration_seconds)
      )
        fail("Formato, tamaño o duración fuera de los límites.");
      const media = mocks.media.upload({
        url: data.url ? https(data.url) : undefined,
        file: data.file,
        mime_type: data.file?.mime_type || data.mime_type,
        visibility: data.visibility || "PUBLIC",
      });
      mocks.media.setVisibility(media, media.visibility);
      media.event_id = data.event_id ? Number(data.event_id) : null;
      media.team_id = data.team_id ? Number(data.team_id) : null;
      if (data.file && r === "ARTIST")
        db.posts.unshift({
          id: next(db.posts),
          artist_id: u.id,
          media_url: media.url,
          media_type: data.file.mime_type.startsWith("video/")
            ? "VIDEO"
            : data.file.mime_type.startsWith("audio/")
              ? "AUDIO"
              : data.file.mime_type === "application/pdf"
                ? "DOCUMENT"
                : "IMAGE",
          caption: text(
            data.caption || "Mi portfolio · archivo local demo",
            2200,
          ),
          created_at: now().slice(0, 19).replace("T", " "),
        });
      if (data.file && r !== "ARTIST")
        a.professional_posts.unshift({
          id: next(a.professional_posts),
          owner_id: u.id,
          body: text(data.caption || "Novedad profesional", 2200),
          media_url: media.url,
          media_type: data.file.mime_type.startsWith("video/")
            ? "VIDEO"
            : data.file.mime_type.startsWith("audio/")
              ? "AUDIO"
              : data.file.mime_type === "application/pdf"
                ? "DOCUMENT"
                : "IMAGE",
          likes: [],
          comments: [],
          saved: [],
          created_at: now(),
          demo: true,
        });
      a.media.push({ ...media, owner_id: u.id, created_at: now() });
      log(a, u, "MEDIA_UPLOADED", media.id);
      return { message: "Media de demostración añadida", media };
    }
    fail("Acción no disponible en ARTI.");
  }
  root.ArtiDomain = {
    ensure,
    route,
    role,
    conflict,
    scenarios,
    seedDemoData: ensure,
    providers: mocks,
    interfaces: {
      PaymentProvider,
      FinancingProvider,
      InsuranceProvider,
      MediaStorageProvider,
      NotificationProvider,
      GeolocationProvider,
    },
    stages,
  };
  if (typeof module !== "undefined") module.exports = root.ArtiDomain;
})(typeof window !== "undefined" ? window : globalThis);
