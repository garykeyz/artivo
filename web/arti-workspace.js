/* Role workspaces reuse the original domain, event center and financial actions. */
function roleNavigation() {
  return ArtiAccess.navigation(state.user);
}
function roleNavMarkup() {
  let last = "";
  return roleNavigation()
    .map((n) => {
      const heading =
        n.group !== last ? `<div class="nav-label">${n.group}</div>` : "";
      last = n.group;
      return (
        heading +
        `<button data-nav="${n.id}" data-tour="nav-${n.id}" class="${state.page === n.id ? "active" : ""}" aria-label="${esc(n.label)}">${icon(n.icon)}<span>${esc(n.label)}</span></button>`
      );
    })
    .join("");
}
const roleHeadings = {
  ARTIST: [
    "Encuentra tu próximo evento.",
    "Comparte tu talento, negocia y gestiona tus fechas.",
  ],
  LEADER: [
    "Coordina tu equipo.",
    "Oportunidades, miembros y asignaciones en un solo lugar.",
  ],
  ENTERPRISE: [
    "Encuentra el talento que necesitas.",
    "Publica demanda, contrata proveedores y sigue tus eventos.",
  ],
  AGENCY: [
    "Gestiona tu cartera de talento.",
    "Conecta artistas y empresas. Sigue propuestas y comisiones.",
  ],
  ADMIN: [
    "Controla ARTI.",
    "Operaciones, riesgo y actividad global de la demo.",
  ],
  CLIENT: [
    "Tu próximo momento empieza aquí.",
    "Descubre talento y sigue tus contrataciones.",
  ],
};
function roleQuickActions() {
  const ids = {
    ARTIST: ["opportunities", "calendar", "content", "income"],
    LEADER: ["opportunities", "teams", "assignments", "calendar"],
    ENTERPRISE: ["publish", "discover", "events", "invoices", "credit"],
    AGENCY: ["talent", "opportunities", "offers", "bookings"],
    ADMIN: ["users", "events", "disputes", "payments"],
    CLIENT: ["discover", "events", "bookings", "invoices"],
  }[ArtiAccess.role(state.user)];
  return ids.map((id) => ArtiAccess.route(state.user, id)).filter(Boolean);
}
async function loadRoleWorkspace(version) {
  const route = ArtiAccess.route(state.user, state.page);
  if (!route) throw Error("Este espacio no está disponible para tu rol.");
  const d = await api("/api/arti/workspace");
  if (version !== state.renderVersion) return;
  artiUI.data = d;
  artiUI.tab = route.tab;
  renderRoleWorkspace();
}
function renderRoleWorkspace() {
  const n = ArtiAccess.route(state.user, state.page);
  if (!n) {
    toast("Acceso denegado para este rol.");
    return;
  }
  const d = artiUI.data,
    r = d.role,
    titles = roleHeadings[r];
  $("#content").innerHTML =
    head(
      state.page === "space" ? titles[0] : n.label,
      state.page === "space"
        ? titles[1]
        : `${ArtiAccess.label(state.user)} · ${state.user.name}`,
      `<button class="btn light small" id="module-help">${icon("shield")} Guía de esta sección</button>`,
    ) +
    `<div class="arti-note">DEMO MODE · Datos y operaciones ficticias de tu espacio</div><div id="arti-content"></div>`;
  $("#module-help").onclick = () => artiModuleHelp(n.id);
  const renderers = {
    taxonomy: renderTaxonomyManager,
    overview: artiOverview,
    opportunities: artiOpportunities,
    "own-opportunities": artiOpportunities,
    offers: artiOffers,
    events: artiEvents,
    bookings: roleBookings,
    "artist-calendar": roleArtistCalendar,
    assignments: artiEvents,
    replacements: artiEvents,
    calendar: artiCalendar,
    teams: artiTeams,
    finance: roleFinance,
    content: roleContent,
    providers: () => roleDirectory("providers"),
    clients: () => roleDirectory("clients"),
    talent: () => roleDirectory("talent"),
    credit: roleCredit,
    analytics: roleAnalytics,
    admin: roleAdminDashboard,
    settings: renderMoneySettings,
    disputes: () => roleAdminSection("Disputas y evidencia"),
    penalties: () =>
      roleEventSubset((e) => e.late_minutes > 0 || e.status === "NO_SHOW"),
    verification: () =>
      roleEventSubset((e) =>
        [
          "ARRIVED",
          "SETUP",
          "SETUP_SUBMITTED",
          "SETUP_VERIFIED",
          "COMPLETED",
        ].includes(e.status),
      ),
    financing: () => roleFinancialList("financing"),
    insurance: () => roleFinancialList("insurance"),
    users: () => roleUsers(),
    artists: () => roleUsers("ARTIST"),
    leaders: () => roleUsers("LEADER"),
    enterprises: () => roleUsers("ENTERPRISE"),
    agencies: () => roleUsers("AGENCY"),
    moderation: () => roleModeration(),
    publish: artiCreateOpportunity,
    journal: artiJournal,
  };
  (renderers[n.tab] || artiOverview)();
  bindArtiCommon();
}
function roleBookings() {
  const d = artiUI.data;
  $("#arti-content").innerHTML =
    `<section class="panel"><h2>Bookings y contratos</h2><p class="muted">Fecha, proveedor, precio, horario y condiciones acordadas.</p>${d.events.map((e) => `<div class="booking-row"><div class="booking-info"><h3>Booking #${e.booking_id || e.id} · ${esc(e.title)}</h3><p>${dateStr(e.start)} · ${timeStr(e.start)}–${timeStr(e.end)} · ${artiCash(e.rate, e.currency)}</p><p>${esc(e.conditions || "Condiciones del servicio")}</p>${artiBadge(e.status)}</div>${artiBtn("Ver evento", `data-event="${e.id}"`)}</div>`).join("")}</section><button class="btn light" id="legacy-bookings">Ver reservas anteriores</button>`;
  $("#legacy-bookings").onclick = () => navigate("legacy-bookings");
}
function roleEventSubset(predicate) {
  const all = artiUI.data.events;
  artiUI.data.events = all.filter(predicate);
  artiEvents();
  artiUI.data.events = all;
}
function roleFinance() {
  if (artiUI.data.money) {
    renderMoneyFinance();
    return;
  }
  const d = artiUI.data,
    business = ["ENTERPRISE", "ADMIN", "CLIENT"].includes(d.role);
  if (business) {
    artiFinance();
    if (d.role === "CLIENT") $("#arti-content .stats-grid")?.remove();
    return;
  }
  const agency = d.role === "AGENCY";
  $("#arti-content").innerHTML =
    `<div class="stats-grid"><div class="stat accent"><small>${agency ? "Comisiones de agencia" : "Ingresos de servicios"}</small><strong class="arti-amount">${artiTotals(d.invoices, agency ? "agency_fee" : "net")}</strong><span class="sub">Importes simulados separados por moneda</span></div><div class="stat"><small>Servicios facturados</small><strong>${d.invoices.length}</strong></div><div class="stat"><small>Fast Pay</small><strong>${d.invoices.filter((i) => i.payout_status === "PAID_TODAY").length}</strong></div></div><section class="panel"><h2>${agency ? "Tus comisiones" : "Tus facturas y liquidaciones"}</h2><p>Consulta tu neto y Fast Pay disponible. La empresa puede trabajar con NET 30, 60 o 90.</p>${d.invoices.map((i) => `<div class="booking-row"><div class="booking-info"><h3>${esc(i.number)}</h3><p>${artiCash(agency ? i.agency_fee : i.net || i.total - (i.total * i.commission_bps) / 10000, i.currency)} · ${artiName(i.owner_id)}</p>${artiBadge(i.payout_status || i.status)}</div>${artiBtn("Ver liquidación", `data-invoice="${i.id}"`)}</div>`).join("")}</section>`;
}
function roleCredit() {
  const d = artiUI.data;
  $("#arti-content").innerHTML = d.credits
    .map(
      (c) =>
        `<section class="panel"><h2>${artiName(c.owner_id)}</h2><p>NET ${c.terms} · ${c.status}</p><div class="detail-grid"><div><small>LÍMITE</small><strong>${artiCash(c.limit, c.currency)}</strong></div><div><small>UTILIZADO</small><strong>${artiCash(c.used, c.currency)}</strong></div><div><small>DISPONIBLE</small><strong>${artiCash(c.limit - c.used, c.currency)}</strong></div></div>${artiBtn("Simular revisión", `data-credit="${c.id}"`)}</section>`,
    )
    .join("");
  $$("[data-credit]").forEach(
    (b) => (b.onclick = () => artiCredit(Number(b.dataset.credit))),
  );
}
function roleContent() {
  $("#arti-content").innerHTML =
    `<section class="panel"><h2>Tu contenido y portfolio</h2><p>Publica fotos y videos para que toda la red descubra tu talento.</p><div class="form-actions"><button class="btn" id="content-upload">Subir foto o video</button><button class="btn light" id="content-view">Ver mis publicaciones</button><button class="btn light" data-nav="profile">Editar perfil y tarifa</button></div><video class="arti-portfolio-video" src="demo-performance.mp4" poster="demo-stage.svg" controls playsinline aria-label="Video de muestra"></video></section>`;
  $("#content-upload").onclick = artiUploadMedia;
  $("#content-view").onclick = () => {
    feedState.mode = "mine";
    navigate("feed");
  };
  $("#arti-content [data-nav]").onclick = () => navigate("profile");
}
function roleDirectory(kind) {
  const d = artiUI.data;
  const ids = new Set(
    d.events.map((e) => (kind === "clients" ? e.owner_id : e.provider_id)),
  );
  const users =
    kind === "talent"
      ? d.users.filter((u) => ArtiAccess.role(u) === "ARTIST")
      : d.users.filter((u) => ids.has(u.id));
  $("#arti-content").innerHTML =
    `<section class="panel"><h2>${kind === "clients" ? "Tus clientes" : kind === "talent" ? "Talento profesional" : "Proveedores contratados"}</h2>${users.map((u) => `<div class="booking-row"><div class="booking-info"><h3>${esc(u.name)}</h3><p>${ArtiAccess.label(u)} · ${d.events.filter((e) => e.owner_id === u.id || e.provider_id === u.id).length} eventos relacionados</p></div>${ArtiAccess.role(u) === "ARTIST" ? artiBtn("Ver perfil", `data-artist="${u.id}"`) : artiBtn("Ver eventos", `data-directory-events="${u.id}"`)}</div>`).join("") || "<p>No hay contrataciones relacionadas todavía.</p>"}</section>`;
  bindArtistCards();
  $$("[data-directory-events]").forEach(
    (b) =>
      (b.onclick = () => {
        const events = d.events.filter((e) =>
          [e.owner_id, e.provider_id].includes(
            Number(b.dataset.directoryEvents),
          ),
        );
        modal(
          "Eventos relacionados",
          "Datos de tu espacio",
          events.map(artiEventRow).join(""),
        );
        bindArtiCommon();
      }),
  );
}
function roleAnalytics() {
  const d = artiUI.data;
  $("#arti-content").innerHTML = `<div class="stats-grid">${[
    ["Eventos", d.events.length],
    [
      "Completados",
      d.events.filter((e) =>
        ["COMPLETED", "SERVICE_VERIFIED", "INVOICED", "SETTLED"].includes(
          e.status,
        ),
      ).length,
    ],
    ["Propuestas", d.offers.length],
    ["Facturas", d.invoices.length],
  ]
    .map(
      ([l, v]) =>
        `<div class="stat"><small>${l}</small><strong>${v}</strong></div>`,
    )
    .join(
      "",
    )}</div><section class="panel"><h2>Resultados por moneda</h2><p>Volumen facturado: ${artiTotals(d.invoices, "total")}</p><p>Pendiente de pago: ${artiTotals(
    d.invoices.filter((i) => !i.customer_paid),
    "total",
  )}</p><p>Servicios: ${d.events.length}. Los resultados pertenecen ${d.role === "ADMIN" ? "a toda la plataforma" : "a tu empresa"}.</p></section>`;
}
function roleAdminDashboard() {
  artiAdmin();
  $$("#arti-content > section").forEach((s) => s.remove());
  $("#arti-content").insertAdjacentHTML(
    "beforeend",
    `<section class="panel"><h2>Control global</h2><div class="arti-quick">${roleQuickActions()
      .map(
        (n) =>
          `<button data-role-quick="${n.id}">${icon(n.icon)}${n.label}</button>`,
      )
      .join("")}</div></section>`,
  );
  bindRoleQuick();
}
function roleAdminSection(title) {
  artiAdmin();
  $$("#arti-content > *").forEach((el) => {
    if (!el.querySelector("h2")?.textContent.includes(title)) el.remove();
  });
}
async function roleUsers(filter) {
  try {
    const a = await api("/api/admin");
    if (
      state.page !==
      (filter
        ? {
            ARTIST: "artists",
            LEADER: "leaders",
            ENTERPRISE: "enterprises",
            AGENCY: "agencies",
          }[filter]
        : "users")
    )
      return;
    const users = a.users.filter(
      (u) => !filter || ArtiAccess.role(u) === filter,
    );
    $("#arti-content").innerHTML =
      `<section class="panel"><h2>Control de usuarios</h2>${users.map((u) => `<div class="booking-row"><div class="booking-info"><h3>${esc(u.name)}</h3><p>${ArtiAccess.label(u)} · ${u.suspended ? "Suspendido" : "Activo"}</p></div>${u.role !== "ADMIN" ? artiBtn(u.suspended ? "Reactivar" : "Suspender", `data-user-state="${u.id}"`) : ""}</div>`).join("")}</section>`;
    $$("[data-user-state]").forEach(
      (b) =>
        (b.onclick = async () => {
          try {
            await api("/api/admin/user", { id: Number(b.dataset.userState) });
            toast("Estado de cuenta actualizado");
            roleUsers(filter);
          } catch (e) {
            toast(e.message);
          }
        }),
    );
  } catch (e) {
    toast(e.message);
  }
}
async function roleModeration() {
  const a = await api("/api/admin");
  $("#arti-content").innerHTML =
    `<section class="panel"><h2>Reportes de contenido</h2>${a.reports.map((r) => `<div class="booking-row"><div class="booking-info"><h3>Reporte #${r.id}</h3><p>${esc(r.reason)}</p>${artiBadge(r.status)}</div>${r.status === "OPEN" ? artiBtn("Resolver", `data-resolve="${r.id}"`) : ""}</div>`).join("") || "<p>No hay reportes abiertos.</p>"}</section>`;
  $$("[data-resolve]").forEach(
    (b) =>
      (b.onclick = async () => {
        await api("/api/admin/report", { id: Number(b.dataset.resolve) });
        toast("Reporte resuelto");
        roleModeration();
      }),
  );
}
function roleFinancialList(key) {
  const d = artiUI.data;
  $("#arti-content").innerHTML =
    `<section class="panel"><h2>${key === "insurance" ? "Seguros ficticios" : "Financiaciones ficticias"}</h2>${d[key].map((x) => `<div class="booking-row"><div class="booking-info"><h3>${esc(x.provider)} · #${x.id}</h3><p>${esc(x.status)} · ${artiCash(x.advance || x.coverage, d.invoices.find((i) => i.id === x.invoice_id)?.currency)}</p></div>${artiBtn("Ver factura", `data-invoice="${x.invoice_id}"`)}</div>`).join("")}</section>`;
}
function bindRoleQuick() {
  $$("[data-role-quick]").forEach(
    (b) => (b.onclick = () => navigate(b.dataset.roleQuick)),
  );
}
function artiModuleHelp(id) {
  const descriptions = {
    opportunities:
      "Selecciona fechas, aplica o negocia. Una retención reserva temporalmente tu fecha; al aceptar se confirma y al rechazar se libera.",
    offers:
      "Cada parte acepta, rechaza o devuelve una propuesta. Precio, horario y condiciones acordados pasan al booking y factura.",
    calendar:
      "Consulta tu disponibilidad y fechas reservadas. Las retenciones temporales evitan comprometer el mismo horario.",
    events:
      "Llega a la hora de llamada. Haz check-in, registra setup y finaliza el servicio. GPS y evidencia son simulados.",
    credit:
      "NET 90 significa que la empresa tiene 90 días para pagar. Nuevos compromisos consumen crédito disponible.",
    income:
      "Fast Pay permite adelantar el cobro demo con una comisión visible. No equivale al pago de la empresa.",
    invoices:
      "El servicio verificado genera una factura. Factoring: un partner ficticio anticipa fondos y la empresa paga al vencimiento.",
    teams:
      "Invita artistas y espera su aceptación. Asigna solo miembros disponibles.",
  };
  modal(
    "Guía de esta sección",
    ArtiAccess.route(state.user, id)?.label || "ARTI",
    `<p class="profile-text">${esc(descriptions[id] || "Estas herramientas pertenecen a tu rol. Cada acción actualiza los datos de demostración en este navegador.")}</p><div class="form-actions"><button class="btn" id="module-tour">Guía de mi rol</button><button class="btn light" id="module-academy">ARTI Journal</button></div>`,
  );
  $("#module-tour").onclick = () => ArtiTutorial.open("role", true);
  $("#module-academy").onclick = () => navigate("help");
}
