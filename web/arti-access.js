/* Shared role policy: navigation, route guards, provider checks and tutorial steps. */
(function (root) {
  "use strict";
  const role = (u) =>
    typeof u === "string"
      ? { BUSINESS: "ENTERPRISE" }[u] || u
      : u?.demo_role || { BUSINESS: "ENTERPRISE" }[u?.role] || u?.role;
  const common = [
    "feed.view",
    "post.create",
    "media.create",
    "profile.view",
    "discover.view",
    "message.use",
    "help.view",
    "opportunity.view",
    "tutorial.manage",
  ];
  const grants = {
    CLIENT: [
      "opportunity.create",
      "booking.create",
      "booking.manage",
      "invoice.view",
      "payment.view",
      "payment.manage",
    ],
    ARTIST: [
      "team.view",
      "opportunity.apply",
      "opportunity.negotiate",
      "booking.manage",
      "event.checkin",
      "media.create",
      "payment.view",
      "invoice.view",
      "calendar.manage",
    ],
    LEADER: [
      "opportunity.apply",
      "opportunity.negotiate",
      "opportunity.create",
      "team.manage",
      "booking.manage",
      "event.checkin",
      "event.assign",
      "payment.view",
      "invoice.view",
    ],
    ENTERPRISE: [
      "opportunity.create",
      "opportunity.manage",
      "opportunity.negotiate",
      "booking.create",
      "booking.manage",
      "event.verify_setup",
      "event.assign",
      "payment.view",
      "payment.manage",
      "invoice.view",
      "invoice.manage",
      "credit.view",
      "finance.view",
      "analytics.view",
    ],
    AGENCY: [
      "opportunity.apply",
      "opportunity.negotiate",
      "opportunity.create",
      "booking.manage",
      "event.assign",
      "payment.view",
      "invoice.view",
    ],
    ADMIN: [
      "admin.users",
      "admin.system",
      "admin.risk",
      "admin.moderation",
      "finance.manage",
      "credit.manage",
      "analytics.view",
    ],
  };
  const permissions = (u) =>
    role(u) === "ADMIN"
      ? [...new Set([...common, ...Object.values(grants).flat()])]
      : [...common, ...(grants[role(u)] || [])];
  const can = (u, p) => !u?.suspended && permissions(u).includes(p);
  const assert = (u, p) => {
    if (!can(u, p))
      throw Error(
        "No tienes permiso para esta acción: " +
          p +
          (p.startsWith("admin.") ? " · Solo Admin" : ""),
      );
  };
  const item = (
    id,
    label,
    group = "OPERACIÓN",
    permission = "booking.manage",
    icon = "grid",
    tab = id,
  ) => ({ id, label, group, permission, icon, tab });
  const social = [
    item("feed", "Inicio · Feed", "SOCIAL", "feed.view", "home"),
    item("discover", "Descubrir", "SOCIAL", "discover.view", "compass"),
    item("messages", "Mensajes", "SOCIAL", "message.use", "chat"),
  ];
  const help = [
    item("profile", "Mi perfil", "TU CUENTA", "profile.view", "user"),
    item("help", "Ayuda · Tutorial", "AYUDA", "help.view", "shield"),
    item("scenarios", "Escenarios demo", "DEMO MODE", "help.view", "bolt"),
  ];
  const op = (id, label, tab = id, p = "booking.manage", i = "calendar") =>
    item(id, label, "OPERACIÓN", p, i, tab);
  const fin = (id, label, p = "payment.view", tab = "finance") =>
    item(id, label, "FINANZAS", p, "wallet", tab);
  const nav = {
    CLIENT: [
      op("space", "Mi espacio", "overview"),
      op("events", "Mis eventos"),
      op("bookings", "Mis reservas", "bookings"),
      item("favorites", "Favoritos", "SOCIAL", "discover.view", "heart"),
      fin("invoices", "Mis facturas", "invoice.view"),
      ...help,
    ],
    ARTIST: [
      op("space", "Mi espacio", "overview"),
      op(
        "opportunities",
        "Oportunidades",
        "opportunities",
        "opportunity.apply",
        "compass",
      ),
      op("calendar", "Mi calendario", "artist-calendar", "calendar.manage"),
      op("events", "Mis eventos"),
      op("bookings", "Mis bookings", "bookings"),
      op(
        "team-invitations",
        "Invitaciones de equipo",
        "teams",
        "team.view",
        "users",
      ),
      op(
        "content",
        "Mi contenido",
        "content",
        "post.create",
        "media.create",
        "music",
      ),
      fin("income", "Mis ingresos"),
      ...help,
    ],
    LEADER: [
      op("space", "Mi espacio", "overview"),
      op(
        "opportunities",
        "Oportunidades",
        "opportunities",
        "opportunity.apply",
        "compass",
      ),
      op("teams", "Mi equipo", "teams", "team.manage", "users"),
      op("calendar", "Calendario del equipo", "calendar"),
      op("assignments", "Asignaciones", "assignments", "event.assign"),
      op("events", "Eventos"),
      op("bookings", "Bookings"),
      op("replacements", "Sustituciones", "replacements", "event.assign"),
      op("offers", "Negociaciones", "offers", "opportunity.negotiate", "chat"),
      fin("income", "Ingresos y liquidaciones"),
      ...help,
    ],
    ENTERPRISE: [
      op("space", "Mi espacio", "overview"),
      op(
        "publish",
        "Publicar oportunidad",
        "publish",
        "opportunity.create",
        "plus",
      ),
      op(
        "opportunities",
        "Mis oportunidades",
        "own-opportunities",
        "opportunity.manage",
        "compass",
      ),
      op("events", "Eventos"),
      op("providers", "Proveedores", "providers"),
      op("bookings", "Bookings"),
      op("offers", "Negociaciones", "offers", "opportunity.negotiate", "chat"),
      fin("invoices", "Facturación", "invoice.view"),
      fin("credit", "Crédito", "credit.view", "credit"),
      fin("payments", "Pagos", "payment.manage"),
      op("analytics", "Analytics", "analytics", "analytics.view", "grid"),
      ...help,
    ],
    AGENCY: [
      op("space", "Mi espacio", "overview"),
      op("talent", "Talento", "talent"),
      op(
        "opportunities",
        "Oportunidades",
        "opportunities",
        "opportunity.apply",
        "compass",
      ),
      op("offers", "Propuestas", "offers", "opportunity.negotiate", "chat"),
      op("bookings", "Bookings"),
      op("calendar", "Calendario"),
      fin("commissions", "Comisiones"),
      op("clients", "Clientes", "clients"),
      ...help,
    ],
    ADMIN: [
      op("space", "Dashboard", "admin", "admin.system", "grid"),
      ...["users", "artists", "leaders", "enterprises", "agencies"].map(
        (id, i) =>
          op(
            id,
            ["Usuarios", "Artistas", "Líderes", "Empresas", "Agencias"][i],
            id,
            "admin.users",
            "users",
          ),
      ),
      op("opportunities", "Oportunidades", "opportunities", "opportunity.view"),
      op("bookings", "Bookings"),
      op("events", "Eventos"),
      op("verification", "Verificación", "verification", "admin.risk"),
      op("disputes", "Disputas", "disputes", "admin.risk"),
      op("penalties", "Penalizaciones", "penalties", "admin.risk"),
      ...["payments", "invoices", "credit", "financing", "insurance"].map(
        (id, i) =>
          fin(
            id,
            ["Pagos", "Facturas", "Crédito", "Financing", "Insurance"][i],
            "finance.manage",
            id === "credit"
              ? "credit"
              : id === "financing" || id === "insurance"
                ? id
                : "finance",
          ),
      ),
      op("analytics", "Analytics", "analytics", "analytics.view"),
      op("moderation", "Moderación", "moderation", "admin.moderation"),
      op("settings", "Configuración", "settings", "admin.system"),
      op("taxonomy", "Taxonomía de talento", "taxonomy", "admin.system"),
      ...help,
    ],
  };
  function navigation(u) {
    return [...social, ...(nav[role(u)] || [])].filter((n) =>
      can(u, n.permission),
    );
  }
  function route(u, id) {
    return navigation(u).find((n) => n.id === id) || null;
  }
  const tabPermission = {
    overview: "booking.manage",
    opportunities: "opportunity.view",
    offers: "opportunity.negotiate",
    events: "booking.manage",
    calendar: "booking.manage",
    teams: "team.manage",
    finance: "payment.view",
    journal: "help.view",
    admin: "admin.system",
  };
  function tabs(u) {
    return Object.entries(tabPermission)
      .filter(([id, p]) => can(u, p))
      .map(([id]) => id);
  }
  function apiPermission(path, write) {
    const p = path.replace("/api/arti/", "").split("/");
    if (p[0] === "tutorial") return "tutorial.manage";
    if (!write) return null;
    if (p[0] === "settings") return "admin.system";
    if (p[0] === "credit") return "credit.view";
    if (p[0] === "dispute" && p[1]) return "admin.risk";
    if (p[0] === "team") return p[2] === "join" ? null : "team.manage";
    if (p[0] === "opportunities") return "opportunity.create";
    if (p[0] === "opportunity")
      return p[2] === "apply"
        ? "opportunity.apply"
        : p[2] === "invite"
          ? "opportunity.create"
          : null;
    if (p[0] === "media") return "media.create";
    return null;
  }
  const step = (page, title, body, target = "#content") => ({
    page,
    title,
    body,
    target,
  });
  const feed = step(
    "feed",
    "Este es tu Feed",
    "ARTI incluye artistas, técnicos, performers, crews, agencias y empresas. Toda la red comparte publicaciones, videos, perfiles y oportunidades. Las prioridades y acciones se adaptan a tu rol.",
  );
  const opportunities = step(
    "opportunities",
    "Oportunidades y negociación",
    "Elige fechas disponibles. Puedes aceptar, rechazar o negociar precio, horario y condiciones. Ejemplo: US$250 → US$300 → US$275 + transporte.",
  );
  const event = step(
    "events",
    "Llegada y servicio",
    "Hora de llamada: 19:00; evento: 20:00. El centro de eventos muestra la cuenta atrás, check-in con GPS simulado, evidencia de setup y finalización.",
  );
  const steps = {
    ARTIST: [
      feed,
      step(
        "discover",
        "Descubre tu comunidad",
        "Explora perfiles y sigue artistas. En Oportunidades encontrarás demanda compatible con tu categoría y ciudad.",
      ),
      opportunities,
      step(
        "calendar",
        "Tu calendario",
        "Configura tu disponibilidad. Las reservas y retenciones temporales evitan fechas incompatibles.",
      ),
      event,
      step(
        "events",
        "Setup y evidencia",
        "Abre un evento y simula la llegada. Envía el setup de muestra y espera la verificación de la empresa.",
      ),
      step(
        "income",
        "Tus ingresos",
        "Las empresas pueden pagar a 30, 60 o 90 días. Consulta Fast Pay para recibir antes cuando esté disponible; los importes y pagos aquí son ficticios.",
      ),
      step(
        "profile",
        "Tu perfil profesional",
        "Sube fotos, videos y portfolio. Define tu tarifa desde, instrumentos y experiencia.",
      ),
    ],
    LEADER: [
      feed,
      opportunities,
      step(
        "teams",
        "Tu equipo",
        "Crea un equipo, invita artistas y espera que acepten. Cada miembro conserva su propia agenda.",
      ),
      step(
        "calendar",
        "Calendario del equipo",
        "Consulta las fechas confirmadas del equipo antes de asumir nuevos compromisos.",
      ),
      step(
        "assignments",
        "Asigna cada evento",
        "Abre un evento para asignar un miembro. Los candidatos indican disponibilidad y conflictos.",
      ),
      event,
      step(
        "replacements",
        "Sustituciones",
        "Ante una ausencia, solicita un sustituto y revisa su disponibilidad antes de asignarlo.",
      ),
      step(
        "offers",
        "Negociaciones",
        "Puedes proponer condiciones y aceptar varias fechas; el importe y horario acordados pasan al contrato.",
      ),
      step(
        "income",
        "Liquidaciones",
        "Revisa las facturas de tus servicios y el neto después de comisiones.",
      ),
    ],
    ENTERPRISE: [
      feed,
      step(
        "discover",
        "Descubre talento",
        "Abre perfiles, revisa portfolio y disponibilidad, e invita proveedores a tus oportunidades.",
      ),
      step(
        "publish",
        "Publica una oportunidad",
        "Define venue, fechas, presupuesto, hora de llamada, requisitos y NET 30/60/90. Publicar crea demanda visible en el feed.",
      ),
      step(
        "offers",
        "Contrata y negocia",
        "Revisa propuestas y negocia precio, horario y condiciones. La aceptación confirma fechas y genera bookings.",
      ),
      step(
        "opportunities",
        "Series de eventos",
        "Una oportunidad puede tener muchas fechas y varias plazas por fecha. Revisa reservas y retenciones.",
      ),
      step(
        "providers",
        "Tus proveedores",
        "Artistas, líderes y agencias contratados aparecen según los eventos de tu empresa.",
      ),
      step(
        "invoices",
        "Facturación",
        "Verificar el servicio genera una factura única con las condiciones pactadas.",
      ),
      step(
        "credit",
        "Crédito de empresa",
        "Consulta límite, utilizado y disponible. Los compromisos a plazo consumen el crédito de muestra.",
      ),
      step(
        "payments",
        "Pago a plazo",
        "Simula pago, procesamiento, fallo o vencimiento desde la factura.",
      ),
      step(
        "invoices",
        "Factoring explicado",
        "Contratación US$10,000 → factura NET 90 → partner adelanta fondos → empresa paga al vencimiento. Es una demostración: una operación real dependería de aprobación y condiciones del partner.",
      ),
      step(
        "analytics",
        "Tus resultados",
        "Consulta eventos y facturación de tu empresa, separados por moneda.",
      ),
    ],
    AGENCY: [
      feed,
      step(
        "talent",
        "Tu cartera de talento",
        "Explora artistas y revisa su portfolio y disponibilidad.",
      ),
      opportunities,
      step(
        "offers",
        "Propuestas y negociación",
        "Propón talento y negocia fechas, tarifa y condiciones con la empresa.",
      ),
      step(
        "bookings",
        "Gestiona bookings",
        "Consulta contratos y asigna talento desde el evento cuando seas su coordinador.",
      ),
      step(
        "commissions",
        "Tus comisiones",
        "La comisión de agencia es una parte de la comisión total, visible al liquidar el servicio.",
      ),
      step(
        "clients",
        "Tus clientes",
        "Consulta las empresas relacionadas con tus eventos.",
      ),
    ],
    ADMIN: [
      step(
        "space",
        "Controla ARTI",
        "Consulta el estado global de la plataforma y las métricas demo.",
      ),
      step(
        "users",
        "Usuarios",
        "Revisa identidades de muestra y suspende o reactiva cuentas desde el control de usuarios.",
      ),
      step(
        "events",
        "Eventos globales",
        "Inspecciona eventos y utiliza el avance manual de estados para presentar el flujo completo.",
      ),
      step(
        "verification",
        "Verificación",
        "Revisa llegada, setup y servicio. La ubicación y evidencia son simuladas.",
      ),
      step(
        "penalties",
        "Riesgo y puntualidad",
        "Inspecciona atrasos, ausencias y advertencias. Los efectos son de demostración.",
      ),
      step(
        "disputes",
        "Disputas",
        "Revisa evidencia, solicita más información, resuelve o rechaza casos.",
      ),
      step(
        "payments",
        "Finanzas globales",
        "Consulta facturas, pagos, financiación y seguros ficticios; no se mueve dinero real.",
      ),
      step(
        "analytics",
        "Analytics",
        "Visualiza GMV, pagos y actividad global, con monedas separadas.",
      ),
      step(
        "settings",
        "Configuración",
        "Las reglas modifican futuras simulaciones. Los contratos existentes conservan sus condiciones.",
      ),
      feed,
    ],
    CLIENT: [
      feed,
      step(
        "discover",
        "Encuentra talento",
        "Explora perfiles, fotos, videos y disponibilidad antes de solicitar un artista.",
      ),
      step(
        "bookings",
        "Tus reservas",
        "Solicita, negocia y confirma el servicio desde tus reservas.",
      ),
      step(
        "events",
        "Tus eventos",
        "Sigue los eventos contratados y verifica el servicio.",
      ),
      step(
        "invoices",
        "Tus facturas",
        "Consulta las condiciones de tus contrataciones y simula el pago.",
      ),
      step(
        "profile",
        "Tu perfil",
        "Actualiza tus datos de demostración y explora la guía cuando quieras.",
      ),
    ],
  };
  // Buyers discover supply; providers combine demand with their professional community.
  const feedPolicy = (u) => {
    const r = role(u),
      hiring = ["CLIENT", "ENTERPRISE"].includes(r);
    return {
      hiring,
      opportunities: !hiring,
      primary: hiring ? "discover" : "publish",
      title: hiring
        ? "Encuentra el talento para tu evento."
        : "Tu próximo trabajo empieza aquí.",
      subtitle: hiring
        ? "Descubre artistas, bandas, equipos y servicios. Conoce su trabajo y contrata."
        : "Encuentra oportunidades y conecta con quienes hacen posible cada evento.",
    };
  };
  const feedPostVisible = (viewer, author, mode = "all") =>
    mode === "mine" ||
    !feedPolicy(viewer).hiring ||
    ["ARTIST", "LEADER", "AGENCY"].includes(role(author));
  const api = {
    feedPolicy,
    feedPostVisible,
    role,
    permissions,
    can,
    assert,
    navigation,
    route,
    tabs,
    apiPermission,
    steps: (u) => steps[role(u)] || [],
    label: (u) =>
      ({
        CLIENT: "Cliente",
        ARTIST: "Artista",
        LEADER: "Líder",
        ENTERPRISE: "Empresa",
        AGENCY: "Agencia",
        ADMIN: "Admin",
      })[role(u)] || role(u),
  };
  root.ArtiAccess = api;
  if (typeof module !== "undefined") module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
