/* Presentation extension. Existing ARTIVO screens and Python API remain intact. */
const artiUI = {
  tab: "overview",
  data: null,
  search: "",
  category: "",
  page: 0,
  eventsFilter: "all",
  month: new Date(),
};
const artiRoles = [
  ["cliente", "Cliente"],
  ["musico", "Artista"],
  ["lider", "Líder"],
  ["empresa", "Empresa"],
  ["agencia", "Agencia"],
  ["admin", "Admin"],
];
const artiEmails = {
  cliente: "cliente",
  musico: "gary",
  lider: "lider",
  empresa: "business",
  agencia: "agencia",
  admin: "admin",
};
const artiCash = (v, c = "USD") =>
  new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: c,
    maximumFractionDigits: 2,
  }).format(Number(v || 0) / 100);
const artiName = (id) =>
  artiUI.data?.users.find((u) => u.id === id)?.name || "Por asignar";
const artiStatus = {
  CONFIRMED: "Confirmado",
  UPCOMING: "Próximo",
  CALL_TIME: "Hora de llegada",
  ARRIVAL_REQUIRED: "Llegada requerida",
  ARRIVED: "Presente",
  SETUP: "Preparando setup",
  SETUP_SUBMITTED: "Setup enviado",
  SETUP_VERIFIED: "Setup verificado",
  IN_PROGRESS: "En curso",
  COMPLETED: "Finalizado",
  SERVICE_VERIFIED: "Servicio verificado",
  INVOICED: "Facturado",
  SETTLED: "Liquidado",
  NO_SHOW: "Ausencia",
  DISPUTED: "En disputa",
  CANCELLED: "Cancelado",
  NEGOTIATING: "Negociando",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada",
  PAID: "Pagada",
  FINANCED: "Financiada",
  OPEN: "Abierta",
  FAILED: "Fallido",
  PROCESSING: "Procesando",
  OVERDUE: "Vencida",
};
const artiBadge = (s) =>
  `<span class="badge ${["NO_SHOW", "DISPUTED", "FAILED", "OVERDUE"].includes(s) ? "red" : ""}">${esc(artiStatus[s] || s)}</span>`;
const artiBtn = (label, attrs = "", light = true) =>
  `<button class="btn ${light ? "light" : ""} small" ${attrs}>${label}</button>`;
async function artiAction(path, data = {}, after) {
  try {
    const r = await api("/api/arti/" + path, data);
    toast(r.message || "Acción registrada");
    closeModal();
    await loadArti(state.renderVersion);
    if (after) await after(r);
    return r;
  } catch (e) {
    toast(e.message);
  }
}
async function loadArti(version) {
  const d = await api("/api/arti/workspace");
  if (version !== state.renderVersion) return;
  artiUI.data = d;
  renderArti();
}
function artiTabs() {
  const d = artiUI.data;
  return [
    ["overview", "Mi espacio"],
    ["opportunities", "Oportunidades"],
    ["offers", "Negociaciones"],
    ["events", "Eventos"],
    ["calendar", "Calendario"],
    ["teams", "Equipos"],
    ["finance", "Finanzas"],
    ["journal", "Guía ARTI"],
    ...(d.role === "ADMIN" ? [["admin", "Administración"]] : []),
  ];
}
function renderArti() {
  const d = artiUI.data;
  if (!d) return;
  const titles = {
      ARTIST: [
        "Tu talento, en acción.",
        "Descubre demanda, negocia y sigue cada evento.",
      ],
      LEADER: [
        "Tu equipo. Un solo escenario.",
        "Coordina músicos, fechas y oportunidades.",
      ],
      ENTERPRISE: [
        "Cada evento, bajo control.",
        "Publica demanda, contrata talento y coordina tus venues.",
      ],
      AGENCY: [
        "Conecta talento y demanda.",
        "Propón artistas, negocia condiciones y sigue tus comisiones.",
      ],
      ADMIN: [
        "El pulso de ARTI.",
        "Operaciones, riesgo y métricas de esta demostración.",
      ],
      CLIENT: [
        "El próximo gran momento.",
        "Descubre oportunidades y coordina tus eventos.",
      ],
    },
    t = titles[d.role];
  $("#content").innerHTML =
    `${head(t[0], t[1], artiBtn("Escenarios demo", 'id="arti-scenarios"', false))}<div class="arti-note">${icon("shield")} DEMO FUNCIONAL · personas, reputación, GPS y operaciones financieras ficticias</div><div class="arti-tabs" role="group" aria-label="Secciones de ARTI">${artiTabs()
      .map(
        ([id, label]) =>
          `<button data-arti-tab="${id}" class="${artiUI.tab === id ? "active" : ""}">${label}${id === "offers" ? ` <span>${d.offers.filter((f) => f.status === "NEGOTIATING").length}</span>` : ""}</button>`,
      )
      .join("")}</div><div id="arti-content"></div>`;
  $("#arti-scenarios").onclick = () => navigate("scenarios");
  $$("[data-arti-tab]").forEach(
    (b) =>
      (b.onclick = () => {
        artiUI.tab = b.dataset.artiTab;
        artiUI.page = 0;
        renderArti();
      }),
  );
  const f =
    {
      overview: artiOverview,
      opportunities: artiOpportunities,
      offers: artiOffers,
      events: artiEvents,
      calendar: artiCalendar,
      teams: artiTeams,
      finance: artiFinance,
      journal: artiJournal,
      admin: artiAdmin,
    }[artiUI.tab] || artiOverview;
  f();
  bindArtiCommon();
}
function bindArtiCommon() {
  for (const [sel, fn] of [
    ["[data-opp]", (b) => artiOpportunity(Number(b.dataset.opp))],
    ["[data-event]", (b) => artiEvent(Number(b.dataset.event))],
    ["[data-offer]", (b) => artiOffer(Number(b.dataset.offer))],
    ["[data-invoice]", (b) => artiInvoice(Number(b.dataset.invoice))],
  ])
    $$(sel).forEach((b) => (b.onclick = () => fn(b)));
}
function artiTotals(items, key) {
  const totals = {};
  items.forEach(
    (i) => (totals[i.currency] = (totals[i.currency] || 0) + (i[key] || 0)),
  );
  return (
    Object.entries(totals)
      .map(([c, v]) => artiCash(v, c))
      .join(" · ") || artiCash(0)
  );
}
function artiOverview() {
  const d = artiUI.data,
    e = d.events,
    active = e.filter((e) => !["SETTLED", "CANCELLED"].includes(e.status));
  $("#arti-content").innerHTML =
    `<div class="stats-grid"><div class="stat accent"><small>Eventos activos</small><strong>${active.length}</strong><span class="sub">${e.filter((e) => e.status === "NO_SHOW").length} requieren sustitución</span></div><div class="stat"><small>Oportunidades abiertas</small><strong>${d.opportunities.filter((o) => o.status === "OPEN").length}</strong><span class="sub">${d.opportunities.reduce((s, o) => s + o.dates.length, 0)} fechas publicadas</span></div><div class="stat"><small>En negociación</small><strong>${d.offers.filter((f) => f.status === "NEGOTIATING").length}</strong><span class="sub">Condiciones y horarios flexibles</span></div><div class="stat"><small>Servicios facturados</small><strong class="arti-amount">${artiTotals(d.invoices, "total")}</strong><span class="sub">Monedas separadas · importes demo</span></div></div>${d.credits.map((c) => `<section class="arti-credit"><div><div class="eyebrow">ARTI CREDIT · SIMULADO</div><h2>${artiName(c.owner_id)}</h2><p>NET ${c.terms} · ${c.status}</p></div><div><small>Límite</small><strong>${artiCash(c.limit, c.currency)}</strong></div><div><small>Utilizado</small><strong>${artiCash(c.used, c.currency)}</strong></div><div><small>Disponible</small><strong>${artiCash(c.limit - c.used, c.currency)}</strong></div>${artiBtn("Simular revisión", `data-credit="${c.id}"`)}</section>`).join("")}<div class="arti-overview-grid"><section class="panel"><div class="section-head"><h2>Tu siguiente paso</h2></div><div class="arti-quick">${[
      ["opportunities", "compass", "Explorar demanda"],
      ["offers", "chat", "Revisar propuestas"],
      ["events", "calendar", "Centro de eventos"],
      ["teams", "users", "Coordinar equipo"],
      ["finance", "wallet", "Facturas y cobros"],
      ["journal", "shield", "Cómo funciona ARTI"],
    ]
      .map(
        ([id, i, label]) =>
          `<button data-quick="${id}">${icon(i)}<span>${label}</span>${icon("arrow")}</button>`,
      )
      .join(
        "",
      )}</div></section><section class="panel"><h2>Eventos en seguimiento</h2>${active.slice(0, 4).map(artiEventRow).join("") || '<p class="muted">Acepta una propuesta para empezar.</p>'}</section></div><section class="panel"><h2>Notificaciones</h2>${
      d.notifications
        .slice(0, 5)
        .map(
          (n) =>
            `<p class="arti-notification">${esc(n.body)} <small>${dateStr(n.created_at)}</small></p>`,
        )
        .join("") ||
      '<p class="muted">Las propuestas, asignaciones y cambios de estado aparecerán aquí.</p>'
    }</section>`;
  $$("[data-quick]").forEach(
    (b) =>
      (b.onclick = () => {
        artiUI.tab = b.dataset.quick;
        renderArti();
      }),
  );
  $$("[data-credit]").forEach(
    (b) => (b.onclick = () => artiCredit(Number(b.dataset.credit))),
  );
}
function artiOpportunities() {
  const d = artiUI.data,
    can = ["CLIENT", "ENTERPRISE", "LEADER", "AGENCY"].includes(d.role),
    filtered = d.opportunities.filter(
      (o) =>
        (!artiUI.search ||
          [o.title, o.city, artiName(o.owner_id)]
            .join(" ")
            .toLowerCase()
            .includes(artiUI.search.toLowerCase())) &&
        (!artiUI.category || o.category === artiUI.category),
    );
  $("#arti-content").innerHTML =
    `<div class="arti-section-head"><div><h2>Demanda realista. Talento disponible.</h2><p class="muted">${filtered.length} oportunidades · precios por evento, fechas y condiciones visibles.</p></div>${can ? artiBtn("Publicar oportunidad", 'id="arti-create-opportunity"', false) : ""}</div><div class="arti-filters">${field("Buscar", "arti-search", "search", artiUI.search, 'placeholder="Empresa, ciudad o evento"')}${select("Categoría", "arti-category", [{ value: "", label: "Todas" }, ...[...new Set(d.opportunities.map((o) => o.category))].map((x) => ({ value: x, label: x }))], artiUI.category)}</div><div class="arti-opportunities">${filtered
      .slice(artiUI.page * 12, (artiUI.page + 1) * 12)
      .map((o) => {
        const events = d.events.filter(
            (e) => e.opportunity_id === o.id && e.status !== "CANCELLED",
          ),
          org = d.organizations.find((x) => x.owner_id === o.owner_id);
        return `<article class="arti-opportunity"><div class="arti-opportunity-cover"><span>${icon(o.category === "DJ" ? "disc" : "music")}</span><div><small>${esc(o.category.toUpperCase())} · ${esc(o.contract_type === "RESIDENCY" ? "RESIDENCIA" : "EVENTOS")}</small><h3>${esc(o.title)}</h3></div></div><div class="arti-opportunity-body"><strong>${esc(artiName(o.owner_id))}</strong><small>${org ? "Organización demo verificada" : "Solicitante demo"} · ${esc(o.city)}</small><div class="arti-rate">${artiCash(o.rate, o.currency)}<small>/ evento</small></div><div class="arti-facts"><span>${o.status === "OPEN" ? "Abierta" : "Cerrada"}</span><span>${o.dates.length} fechas</span><span>${o.quantity} plazas / fecha</span><span>NET ${o.terms}</span></div><p>${dateStr(o.dates[0].start)} · ${timeStr(o.dates[0].start)} – ${timeStr(o.dates[0].end)}</p><p class="muted">${esc(o.requirements)}</p>${artiBtn("Ver oportunidad", `data-opp="${o.id}"`, false)}</div></article>`;
      })
      .join(
        "",
      )}</div><div class="arti-pagination">${artiBtn("Anterior", 'id="arti-prev"')}<span>Página ${artiUI.page + 1} de ${Math.max(1, Math.ceil(filtered.length / 12))}</span>${artiBtn("Siguiente", 'id="arti-next"')}</div>`;
  $("#arti-search").onchange = (e) => {
    artiUI.search = e.target.value;
    artiUI.page = 0;
    renderArti();
  };
  $("#arti-category").onchange = (e) => {
    artiUI.category = e.target.value;
    artiUI.page = 0;
    renderArti();
  };
  $("#arti-prev").disabled = artiUI.page === 0;
  $("#arti-next").disabled = (artiUI.page + 1) * 12 >= filtered.length;
  $("#arti-prev").onclick = () => {
    artiUI.page--;
    renderArti();
  };
  $("#arti-next").onclick = () => {
    artiUI.page++;
    renderArti();
  };
  $("#arti-create-opportunity")?.addEventListener(
    "click",
    artiCreateOpportunity,
  );
}
function artiCreateOpportunity() {
  const d = artiUI.data,
    venues = d.venues.filter(
      (v) =>
        d.role !== "ENTERPRISE" ||
        d.organizations.find((o) => o.id === v.organization_id)?.owner_id ===
          state.user.id,
    ),
    date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  modal(
    "Publicar oportunidad",
    "Una fecha o una serie · todo se guarda en este navegador",
    `<form id="arti-opportunity-form"><div class="form-grid">${field("Título", "title", "text", "", 'required maxlength="120"')}${select(
      "Categoría",
      "category",
      ["DJ", "Pianista", "Cantante", "Banda", "Técnico"].map((x) => ({
        value: x,
        label: x,
      })),
    )}${select(
      "Venue",
      "venue_id",
      venues.map((v) => ({ value: v.id, label: v.name })),
    )}${select(
      "Moneda",
      "currency",
      ["USD", "DOP", "EUR"].map((x) => ({ value: x, label: x })),
    )}${field("Primera fecha", "date", "date", date, "required")}${field("Número de eventos", "count", "number", 1, 'min="1" max="1000" required')}${field("Repetir cada (días)", "interval_days", "number", 7, 'min="1" max="365" required')}${field("Plazas por fecha", "quantity", "number", 1, 'min="1" max="100" required')}${field("Inicio", "start_time", "time", "20:00", "required")}${field("Fin", "end_time", "time", "00:00", "required")}${field("Tarifa por evento", "rate", "number", 250, 'min="1" step="0.01" required')}${select(
      "Plazo de pago",
      "terms",
      [0, 30, 60, 90].map((x) => ({
        value: x,
        label: x ? "NET " + x : "Inmediato",
      })),
      90,
    )}${field("Límite de propuestas", "deadline", "date", date, "required")}<div class="field"><label><input type="checkbox" name="negotiable" checked> Permitir negociación</label></div><div class="field full"><label for="requirements">Requisitos</label><textarea id="requirements" name="requirements" required>Equipo propio, transporte y repertorio a acordar.</textarea></div></div><p class="legal">Call time: ${d.settings.call_minutes} minutos antes. La tarifa final depende del acuerdo.</p><p class="error"></p><div class="form-actions"><button class="btn" type="submit">Publicar oportunidad</button></div></form>`,
    true,
  );
  bindForm("#arti-opportunity-form", async (f) => {
    const r = await api("/api/arti/opportunities", {
      ...f,
      rate: Math.round(Number(f.rate) * 100),
      negotiable: !!f.negotiable,
    });
    toast(r.message);
    closeModal();
    artiUI.tab = "opportunities";
    await loadArti(state.renderVersion);
  });
}
function artiOpportunity(id) {
  const d = artiUI.data,
    o = d.opportunities.find((x) => x.id === id);
  if (!o) return;
  const own = o.owner_id === state.user.id,
    provider = ["ARTIST", "LEADER", "AGENCY"].includes(d.role),
    offer = d.offers.find(
      (f) =>
        f.opportunity_id === id &&
        f.provider_id === state.user.id &&
        f.status === "NEGOTIATING",
    ),
    venue = d.venues.find((v) => v.id === o.venue_id);
  modal(
    esc(o.title),
    `${esc(artiName(o.owner_id))} · ${esc(o.city)} · DEMO`,
    `<div class="arti-detail-hero"><strong>${artiCash(o.rate, o.currency)}<small> / evento</small></strong><span>${o.dates.length} fechas · NET ${o.terms}</span></div><div class="detail-grid"><div><small>VENUE</small><strong>${esc(venue.name)}</strong></div><div><small>REQUISITOS</small><strong>${esc(o.requirements)}</strong></div></div><p class="legal">Límite: ${esc(o.deadline)} · ${o.negotiable ? "Precio, horario y términos negociables" : "Condiciones fijas"}. Retención de ${d.settings.hold_minutes} minutos al enviar propuesta.</p><div class="section-head"><h3>Selecciona tus fechas</h3><button class="text-btn" id="arti-select-all">Todas disponibles</button></div><div class="arti-date-grid">${o.dates
      .map((date) => {
        const filled =
            o.slot_counts?.find((c) => c.date_id === date.id)?.booked || 0,
          hold = o.slot_counts?.find((c) => c.date_id === date.id)?.held || 0;
        return `<label class="arti-date"><input type="checkbox" name="arti-date" value="${date.id}" ${filled + hold >= date.capacity ? "disabled" : ""}><span><b>${dateStr(date.start)}</b><small>${timeStr(date.start)} – ${timeStr(date.end)}</small><small>${Math.max(0, date.capacity - filled - hold)} plazas disponibles ${hold ? "· " + hold + " en negociación" : ""}</small></span></label>`;
      })
      .join(
        "",
      )}</div>${offer ? `<p class="arti-note">Propuesta #${offer.id} activa · ${artiBtn("Abrir negociación", `data-offer="${offer.id}"`)}</p>` : ""}${
      own
        ? `<div class="section-head"><h3>Propuestas recibidas</h3></div>${
            d.offers
              .filter((f) => f.opportunity_id === id)
              .map(artiOfferRow)
              .join("") || '<p class="muted">Sin propuestas todavía.</p>'
          }<form id="arti-invite"><div class="form-grid">${select(
            "Invitar artista, líder o agencia",
            "user_id",
            d.users
              .filter((u) =>
                ["ARTIST", "LEADER", "AGENCY"].includes(ArtiDomain.role(u)),
              )
              .map((u) => ({
                value: u.id,
                label: u.name + " · " + ArtiDomain.role(u),
              })),
          )}</div><p class="error"></p><div class="form-actions"><button type="submit" class="btn">Invitar a las fechas seleccionadas</button></div></form>`
        : provider && !offer
          ? `<form id="arti-apply"><div class="form-grid">${field("Tu tarifa por evento (" + o.currency + ")", "rate", "number", o.rate / 100, 'required min="1" step="0.01"')}${field("Inicio propuesto", "start_time", "time", o.dates[0].start.slice(11, 16), "required")}${field("Fin propuesto", "end_time", "time", o.dates[0].end.slice(11, 16), "required")}${d.role === "LEADER" ? select("Equipo (opcional)", "team_id", [{ value: "", label: "Sin equipo" }, ...d.teams.filter((t) => t.leader_id === state.user.id).map((t) => ({ value: t.id, label: t.name }))]) : ""}<div class="field full"><label for="conditions">Condiciones propuestas</label><textarea id="conditions" name="conditions" required>${esc(o.requirements)}</textarea></div></div><p class="error"></p><div class="form-actions"><button type="submit" class="btn">Aplicar / negociar</button></div></form>`
          : ""
    }<div class="form-actions">${artiBtn("Guardar", 'id="arti-save-opp"')}${!own ? artiBtn("Declinar", 'id="arti-decline-opp"') : ""}</div>`,
    true,
  );
  $("#arti-select-all").onclick = () =>
    $$('[name="arti-date"]:not(:disabled)').forEach((x) => (x.checked = true));
  const dates = () =>
    $$('[name="arti-date"]:checked').map((x) => Number(x.value));
  if ($("#arti-apply"))
    bindForm("#arti-apply", async (f) => {
      const r = await api("/api/arti/opportunity/" + id + "/apply", {
        ...f,
        date_ids: dates(),
        rate: Math.round(Number(f.rate) * 100),
        team_id: f.team_id ? Number(f.team_id) : null,
      });
      toast(r.message);
      closeModal();
      artiUI.tab = "offers";
      await loadArti(state.renderVersion);
    });
  if ($("#arti-invite"))
    bindForm("#arti-invite", async (f) => {
      const r = await api("/api/arti/opportunity/" + id + "/invite", {
        user_id: Number(f.user_id),
        date_ids: dates(),
      });
      toast(r.message);
      closeModal();
      await loadArti(state.renderVersion);
    });
  $("#arti-save-opp").onclick = () => artiAction("opportunity/" + id + "/save");
  $("#arti-decline-opp")?.addEventListener("click", () =>
    artiAction("opportunity/" + id + "/decline"),
  );
  bindArtiCommon();
}
function artiOfferRow(f) {
  const d = artiUI.data,
    o = d.opportunities.find((o) => o.id === f.opportunity_id),
    r = f.rounds.at(-1),
    holds = d.holds.filter((h) => h.offer_id === f.id);
  return `<div class="booking-row"><div class="booking-info"><h3>${esc(o?.title || "Oportunidad")} · ${esc(artiName(f.provider_id))}</h3><p>${artiCash(r.rate, o?.currency)} / evento · ${f.date_ids.length} fechas · ${r.start_time}–${r.end_time}</p>${artiBadge(f.status)} ${holds.length ? `<small class="arti-hold" data-hold-until="${holds[0].expires}">Retención temporal</small>` : ""}</div>${artiBtn("Ver negociación", `data-offer="${f.id}"`)}</div>`;
}
function artiOffers() {
  $("#arti-content").innerHTML =
    `<section class="panel"><h2>Negociaciones y acuerdos</h2><p class="muted">Los cambios de precio, horario y condiciones quedan en el contrato y en la factura.</p>${artiUI.data.offers.map(artiOfferRow).join("") || empty("Tu siguiente acuerdo empieza aquí.", "Aplica a una oportunidad o invita talento.")}</section>`;
  artiTick();
}
function artiOffer(id) {
  const d = artiUI.data,
    f = d.offers.find((x) => x.id === id),
    o = d.opportunities.find((x) => x.id === f.opportunity_id),
    last = f.rounds.at(-1),
    can = f.status === "NEGOTIATING" && last.by !== state.user.id;
  modal(
    "Negociación #" + id,
    `${esc(o.title)} · ${f.date_ids.length} fechas`,
    `<div class="arti-negotiation">${f.rounds.map((r, i) => `<div class="arti-round ${r.by === state.user.id ? "mine" : ""}"><small>Ronda ${i + 1} · ${esc(artiName(r.by))}</small><strong>${artiCash(r.rate, o.currency)} / evento</strong><p>${esc(r.start_time)}–${esc(r.end_time)} · ${esc(r.conditions)}</p><small>${dateStr(r.at)}</small></div>`).join("")}</div><p>${artiBadge(f.status)}</p>${can ? `<form id="arti-counter"><div class="form-grid">${field("Contraoferta (" + o.currency + ")", "rate", "number", last.rate / 100, 'min="1" step="0.01" required')}${field("Inicio", "start_time", "time", last.start_time, "required")}${field("Fin", "end_time", "time", last.end_time, "required")}<div class="field full"><label for="conditions">Condiciones</label><textarea id="conditions" name="conditions" required>${esc(last.conditions)}</textarea></div></div><p class="error"></p><div class="form-actions"><button type="submit" class="btn light">Enviar contraoferta</button><button type="button" class="btn" id="arti-accept-offer">Aceptar acuerdo</button></div></form>` : f.status === "NEGOTIATING" ? '<p class="arti-note">Esperando respuesta de la otra parte. Cambia de cuenta demo para continuar.</p>' : ""}${f.status === "NEGOTIATING" ? `<div class="form-actions">${artiBtn("Rechazar y liberar fechas", 'id="arti-reject-offer"')}</div>` : ""}`,
    true,
  );
  if (can) {
    bindForm("#arti-counter", async (v) => {
      const r = await api("/api/arti/offer/" + id + "/counter", {
        ...v,
        rate: Math.round(Number(v.rate) * 100),
      });
      toast(r.message);
      await loadArti(state.renderVersion);
      artiOffer(id);
    });
    $("#arti-accept-offer").onclick = () =>
      artiAction("offer/" + id + "/accept", {}, (r) => {
        artiUI.tab = "events";
        renderArti();
        artiEvent(r.event_id);
      });
  }
  $("#arti-reject-offer")?.addEventListener("click", () =>
    artiAction("offer/" + id + "/reject"),
  );
}
function artiEventRow(e) {
  return `<div class="booking-row"><div class="booking-info"><h3>${esc(e.title)}</h3><p>${dateStr(e.start)} · ${timeStr(e.start)} · ${esc(artiName(e.performer_id))}</p>${artiBadge(e.status)} ${e.late_minutes ? '<span class="badge red">17 min tarde</span>' : ""}</div><div class="arti-row-end"><strong>${artiCash(e.rate, e.currency)}</strong>${artiBtn("Abrir evento", `data-event="${e.id}"`)}</div></div>`;
}
function artiEvents() {
  const d = artiUI.data,
    filter = artiUI.eventsFilter,
    events = d.events
      .filter(
        (e) =>
          filter === "all" ||
          (filter === "pending" &&
            !["SETTLED", "CANCELLED"].includes(e.status)) ||
          e.status === filter,
      )
      .sort((a, b) => a.start.localeCompare(b.start));
  $("#arti-content").innerHTML =
    `<div class="arti-section-head"><div><h2>Event Command Center</h2><p class="muted">Llegada, setup, servicio, evidencia y estado de pago.</p></div>${select(
      "Mostrar",
      "arti-event-filter",
      [
        ["all", "Todos"],
        ["pending", "Pendientes"],
        ["NO_SHOW", "Ausencias"],
        ["DISPUTED", "Disputas"],
        ["SETTLED", "Liquidados"],
      ].map(([value, label]) => ({ value, label })),
      filter,
    )}</div><section class="panel">${events.slice(0, 100).map(artiEventRow).join("") || empty("No hay eventos en este filtro.", "Confirma una propuesta para generar fechas.")}</section>`;
  $("#arti-event-filter").onchange = (e) => {
    artiUI.eventsFilter = e.target.value;
    renderArti();
  };
}
function artiEvent(id) {
  const d = artiUI.data,
    e = d.events.find((x) => x.id === id);
  if (!e) return;
  const owner = e.owner_id === state.user.id,
    provider = [e.performer_id, e.provider_id].includes(state.user.id),
    admin = d.role === "ADMIN",
    coordinator =
      owner ||
      e.provider_id === state.user.id ||
      e.agency_id === state.user.id ||
      admin,
    venue = d.venues.find((v) => v.id === e.venue_id),
    invoice = d.invoices.find((i) => i.event_id === id);
  modal(
    esc(e.title),
    "Evento / contrato #" + id + " · entorno simulado",
    `<div class="arti-event-top">${artiBadge(e.status)}<strong>${artiCash(e.rate, e.currency)}</strong></div><div class="arti-countdown"><small>CALL TIME EN</small><strong data-countdown="${e.call_time}" data-demo-now="${e.demo_clock_at || ""}" data-demo-received="${e.demo_clock_received || ""}">—</strong><span>Llegada ${timeStr(e.call_time)} · inicio ${timeStr(e.start)}</span></div><div class="detail-grid"><div><small>VENUE</small><strong>${esc(venue.name)}</strong><p>${venue.radius} m · geozona de muestra</p></div><div><small>PROVEEDOR / INTÉRPRETE</small><strong>${esc(artiName(e.provider_id))}</strong><p>${esc(artiName(e.performer_id))} · ${e.assignment || "Asignación directa"}</p></div><div><small>CONDICIONES ACORDADAS</small><strong>${esc(e.conditions)}</strong></div><div><small>HORARIO Y PAGO</small><strong>${timeStr(e.start)}–${timeStr(e.end)} · NET ${e.terms}</strong></div></div><div class="arti-gps ${e.checkin?.inside ? "inside" : ""}">${icon("pin")}<div><strong>${e.checkin?.inside ? "Dentro de geozona · GPS SIMULADO" : e.checkin ? "Fuera de geozona · GPS SIMULADO" : "Llegada sin registrar"}</strong><p>${e.checkin ? `${e.checkin.lat.toFixed(4)}, ${e.checkin.lng.toFixed(4)} · ${e.checkin.distance} m · ${e.checkin.simulated_arrival_at || e.checkin.captured_at}` : "El modo demo no accede al GPS real."}</p></div></div>${e.penalty ? `<div class="arti-penalty"><strong>Advertencia: ${e.late_minutes} minutos tarde</strong><p>Penalización propuesta ${artiCash(e.penalty.fee, e.currency)} · puntualidad ficticia ${e.penalty.score_before}% → ${e.penalty.score_after}% · ${e.penalty.status}</p><small>No se descuenta dinero automáticamente; puedes disputar.</small></div>` : ""}<div class="arti-event-actions">${artiBtn("Adelantar reloj 15 min", 'data-event-action="clock"')}${
      (provider || admin) &&
      [
        "CONFIRMED",
        "UPCOMING",
        "CALL_TIME",
        "ARRIVAL_REQUIRED",
        "NO_SHOW",
      ].includes(e.status)
        ? [
            ["arrival", "Simular llegada"],
            ["late", "Simular retraso"],
            ["outside", "Simular GPS fuera"],
            ["noshow", "Simular ausencia"],
          ]
            .map(([a, l]) => artiBtn(l, `data-event-action="${a}"`))
            .join("")
        : ""
    }${(provider || admin) && ["ARRIVED", "SETUP"].includes(e.status) ? artiBtn("Subir evidencia de ejemplo", 'data-event-action="setup"', false) : ""}${(owner || admin) && e.status === "SETUP_SUBMITTED" ? artiBtn("Verificar setup", 'data-event-action="verify_setup"', false) + artiBtn("Rechazar setup", 'data-event-action="reject_setup"') : ""}${(provider || admin) && e.status === "SETUP_VERIFIED" ? artiBtn("Iniciar evento", 'data-event-action="start"', false) : ""}${(provider || admin) && e.status === "IN_PROGRESS" ? artiBtn("Completar evento", 'data-event-action="complete"', false) : ""}${(owner || admin) && e.status === "COMPLETED" ? artiBtn("Verificar servicio y facturar", 'data-event-action="verify"', false) : ""}${admin && !["SETTLED", "DISPUTED", "NO_SHOW"].includes(e.status) ? artiBtn("Siguiente estado · presentador", 'data-event-action="next"') : ""}${invoice ? artiBtn("Ver factura", `data-invoice="${invoice.id}"`, false) : ""}${artiBtn("Abrir disputa", 'id="arti-open-dispute"')}</div>${
      coordinator &&
      !["SETTLED", "INVOICED", "SERVICE_VERIFIED"].includes(e.status)
        ? `<form id="arti-assignment"><div class="form-grid">${select(
            e.status === "NO_SHOW"
              ? "Candidatos para sustitución"
              : "Asignar artista",
            "artist_id",
            d.artists.map((a) => ({
              value: a.user_id,
              label:
                a.stage_name +
                " · " +
                a.city +
                " · US$" +
                a.demo_price_usd +
                " · muestra " +
                a.demo_stats.punctuality +
                "%",
            })),
            e.performer_id,
          )}<div class="field"><label>Disponibilidad</label><small>El sistema comprueba conflictos al confirmar. Distancia y reputación de muestra.</small></div></div><p class="error"></p><div class="form-actions"><button class="btn" type="submit">${e.status === "NO_SHOW" ? "Asignar sustituto" : "Asignar artista"}</button></div></form>`
        : ""
    }<h3>Evidencia del evento</h3><div class="arti-evidence">${e.evidence.map((x) => `<article><img src="${esc(x.url)}" alt="Setup demo"><p>${esc(x.at)} · ${esc(artiName(x.by))}</p><small>Evento #${x.event_id} · BOOKING_ONLY · asset mock</small></article>`).join("") || '<p class="muted">La foto de setup se registra después de la llegada.</p>'}</div><h3>Historial</h3><div class="arti-history">${e.history.map((h) => `<p><b>${esc(artiStatus[h.status] || h.status)}</b> · ${esc(artiName(h.by))} <small>${esc(h.at)}</small></p>`).join("") || '<p class="muted">El próximo cambio quedará registrado aquí.</p>'}</div>`,
    true,
  );
  $$("[data-event-action]").forEach(
    (b) =>
      (b.onclick = () => {
        const action = b.dataset.eventAction;
        artiAction(
          "event/" +
            id +
            "/" +
            (action === "reject_setup" ? "verify_setup" : action),
          action === "reject_setup" ? { accept: false } : {},
          () => artiEvent(id),
        );
      }),
  );
  $("#arti-open-dispute").onclick = () => {
    modal(
      "Disputar evento / penalización",
      "Caso ligado al evento #" + id,
      `<form id="arti-dispute-form"><div class="field"><label for="reason">Describe lo ocurrido</label><textarea name="reason" id="reason" required></textarea></div><p class="error"></p><div class="form-actions"><button type="submit" class="btn">Abrir disputa</button></div></form>`,
    );
    bindForm("#arti-dispute-form", async (f) => {
      const r = await api("/api/arti/event/" + id + "/dispute", f);
      toast(r.message);
      closeModal();
      await loadArti(state.renderVersion);
    });
  };
  if ($("#arti-assignment"))
    bindForm("#arti-assignment", async (f) => {
      const r = await api(
        "/api/arti/event/" +
          id +
          "/" +
          (e.status === "NO_SHOW" ? "replace" : "assign"),
        { artist_id: Number(f.artist_id) },
      );
      toast(r.message);
      await loadArti(state.renderVersion);
      artiEvent(id);
    });
  const assignment = $("#arti-assignment select");
  if (assignment && e.candidates)
    [...assignment.options].forEach((option) => {
      const c = e.candidates.find((c) => c.artist_id === Number(option.value));
      option.textContent += c
        ? " · " +
          (c.available ? "AVAILABLE" : "CONFLICT") +
          " · distancia demo " +
          c.distance_km +
          " km"
        : "";
      option.disabled = c ? !c.available : false;
    });
  bindArtiCommon();
  artiTick();
}
function artiTeams() {
  const d = artiUI.data;
  $("#arti-content").innerHTML =
    `<div class="arti-section-head"><div><h2>Tu red de talento</h2><p class="muted">Equipos, invitaciones y asignaciones de eventos.</p></div>${d.role === "LEADER" ? artiBtn("Crear equipo", 'id="arti-new-team"', false) : ""}</div><div class="arti-team-grid">${
      d.teams
        .map(
          (t) =>
            `<section class="panel"><div class="eyebrow">LÍDER · ${esc(artiName(t.leader_id))}</div><h2>${esc(t.name)}</h2>${t.members.map((m) => `<div class="arti-member"><div class="avatar">${esc(artiName(m.user_id)[0])}</div><div><b>${esc(artiName(m.user_id))}</b><small>${esc(m.instrument)} · ${m.status}</small></div>${m.user_id === state.user.id && m.status === "INVITED" ? artiBtn("Aceptar", `data-team-join="${t.id}"`) : ""}</div>`).join("")}${t.leader_id === state.user.id ? artiBtn("Invitar artista", `data-team-invite="${t.id}"`) : ""}<h3>Calendario del equipo</h3>${
              d.events
                .filter(
                  (e) => e.team_id === t.id || e.provider_id === t.leader_id,
                )
                .map(artiEventRow)
                .join("") ||
              '<p class="muted">Acepta una oportunidad con este equipo para asignar eventos.</p>'
            }</section>`,
        )
        .join("") ||
      empty(
        "Conecta con un equipo.",
        "Los equipos a los que perteneces aparecen aquí.",
        "users",
      )
    }</div>`;
  $("#arti-new-team")?.addEventListener("click", () => {
    modal(
      "Crear equipo",
      "Lidera y coordina tu talento",
      `<form id="arti-team-form">${field("Nombre del equipo", "name", "text", "", "required")}<p class="error"></p><div class="form-actions"><button class="btn" type="submit">Crear equipo</button></div></form>`,
    );
    bindForm("#arti-team-form", async (f) => {
      const r = await api("/api/arti/teams", f);
      toast(r.message);
      closeModal();
      await loadArti(state.renderVersion);
    });
  });
  $$("[data-team-invite]").forEach(
    (b) =>
      (b.onclick = () => {
        const id = Number(b.dataset.teamInvite);
        modal(
          "Invitar artista",
          "El artista podrá aceptar desde su vista.",
          `<form id="arti-member-form">${select(
            "Artista",
            "user_id",
            d.artists.map((a) => ({ value: a.user_id, label: a.stage_name })),
          )}${field("Instrumento / función", "instrument", "text", "", "required")}<p class="error"></p><div class="form-actions"><button class="btn" type="submit">Invitar</button></div></form>`,
        );
        bindForm("#arti-member-form", async (f) => {
          const r = await api("/api/arti/team/" + id + "/member", {
            ...f,
            user_id: Number(f.user_id),
          });
          toast(r.message);
          closeModal();
          await loadArti(state.renderVersion);
        });
      }),
  );
  $$("[data-team-join]").forEach(
    (b) =>
      (b.onclick = () =>
        artiAction("team/" + b.dataset.teamJoin + "/join", { accept: true })),
  );
}
function artiFinance() {
  const d = artiUI.data,
    pending = d.invoices.filter((i) => !i.customer_paid);
  $("#arti-content").innerHTML =
    `<div class="stats-grid"><div class="stat accent"><small>Facturas pendientes</small><strong class="arti-amount">${artiTotals(pending, "total")}</strong><span class="sub">NET 30 / 60 / 90 · simulado</span></div><div class="stat"><small>Liquidado al proveedor</small><strong class="arti-amount">${artiTotals(d.invoices, "net")}</strong><span class="sub">Después de comisiones y fees</span></div><div class="stat"><small>Factoring</small><strong>${d.financing.length}</strong><span class="sub">Partners ficticios</span></div><div class="stat"><small>Comisión de agencia</small><strong class="arti-amount">${artiTotals(d.invoices, "agency_fee")}</strong><span class="sub">Desglose por operación</span></div></div><section class="panel"><h2>Facturas y liquidación</h2><p class="muted">Importes separados por moneda. Ninguna operación mueve dinero real.</p>${d.invoices.map((i) => `<div class="booking-row"><div class="booking-info"><h3>${esc(i.number)} · ${esc(artiName(i.owner_id))}</h3><p>${artiCash(i.total, i.currency)} · NET ${i.terms} · vence ${esc(i.due)}</p>${artiBadge(i.status)} ${i.payout_status === "PAID_TODAY" ? '<span class="badge">Fast Pay · pagado hoy</span>' : ""}</div>${artiBtn("Abrir factura", `data-invoice="${i.id}"`)}</div>`).join("") || '<p class="muted">Verifica un servicio para generar su factura.</p>'}</section><section class="panel"><h2>Libro de movimientos · doble entrada</h2>${
      d.ledger
        .slice(-15)
        .reverse()
        .map(
          (l) =>
            `<div class="arti-ledger"><strong>${esc(l.reference)} · ${l.currency}</strong><div class="table-wrap"><table><thead><tr><th>Cuenta</th><th>Debe</th><th>Haber</th></tr></thead><tbody>${l.entries.map((x) => `<tr><td>${esc(x.account)}</td><td>${artiCash(x.debit, l.currency)}</td><td>${artiCash(x.credit, l.currency)}</td></tr>`).join("")}</tbody></table></div></div>`,
        )
        .join("") ||
      '<p class="muted">Las liquidaciones generan asientos equilibrados.</p>'
    }</section>`;
}
function artiInvoice(id) {
  const d = artiUI.data,
    i = d.invoices.find((x) => x.id === id),
    e = d.events.find((e) => e.id === i.event_id),
    f = d.financing.find((f) => f.invoice_id === id),
    insurance = d.insurance.find((x) => x.invoice_id === id),
    fee = Math.round((i.total * e.commission_bps) / 10000),
    financeFee = f?.fee || 0,
    fast = Math.round((i.total * d.settings.fastpay_bps) / 10000);
  modal(
    "Factura " + i.number,
    "Documento demo · sin validez fiscal",
    `<div class="arti-invoice"><header><h2>ARTI</h2>${artiBadge(i.status)}</header><p><b>Solicitante:</b> ${esc(artiName(i.owner_id))}<br><b>Proveedor:</b> ${esc(artiName(i.provider_id))}<br><b>Servicio:</b> ${esc(e.title)}<br><b>Evento:</b> ${dateStr(e.start)} · ${timeStr(e.start)}–${timeStr(e.end)}<br><b>Condiciones:</b> ${esc(e.conditions)}</p><div class="arti-invoice-total"><span>Total</span><strong>${artiCash(i.total, i.currency)}</strong></div><p>NET ${i.terms} · vence ${esc(i.due)} · ${i.customer_paid ? "empresa pagó" : "cuenta por cobrar a la empresa"}</p><div class="detail-grid"><div><small>COSTE FACTORING</small><strong>${artiCash(financeFee, i.currency)}</strong></div><div><small>COMISIÓN TOTAL</small><strong>${artiCash(fee, i.currency)}</strong></div><div><small>NETO ESTÁNDAR</small><strong>${artiCash(i.total - fee - financeFee, i.currency)}</strong></div><div><small>FEE FAST PAY</small><strong>${artiCash(fast, i.currency)}</strong></div><div><small>NETO FAST PAY</small><strong>${artiCash(i.total - fee - fast - financeFee, i.currency)}</strong></div></div></div>${f ? `<div class="arti-financial"><h3>Factoring · ${f.status}</h3><p>${esc(f.provider)} · anticipo ${artiCash(f.advance, i.currency)} · coste ${artiCash(f.fee, i.currency)}</p><small>Financiación ficticia · sin partner real ni desembolso.</small></div>` : ""}${insurance ? `<div class="arti-financial"><h3>Seguro demo · ${insurance.status}</h3><p>${esc(insurance.provider)} · cobertura ${artiCash(insurance.coverage, i.currency)} (${insurance.coverage_bps / 100}%)</p><small>No existe cobertura real.</small></div>` : ""}<div class="arti-event-actions">${!i.customer_paid ? `${d.role === "ADMIN" || state.user.id === i.owner_id ? artiBtn("Simular pago", 'data-invoice-action="pay"', false) + artiBtn("Simular fallo", 'data-invoice-action="failed"') + artiBtn("Simular procesamiento", 'data-invoice-action="processing"') + artiBtn("Simular vencimiento", 'data-invoice-action="overdue"') : ""}${!i.settled && (d.role === "ADMIN" || [i.provider_id, e.performer_id].includes(state.user.id)) ? artiBtn("Simular Fast Pay", 'data-invoice-action="fastpay"', false) : ""}${!i.settled && !f && (d.role === "ADMIN" || [i.owner_id, i.provider_id].includes(state.user.id)) ? artiBtn("Simular financiación", 'data-invoice-action="finance"') : ""}` : ""}${!insurance && (d.role === "ADMIN" || [i.owner_id, i.provider_id].includes(state.user.id)) ? artiBtn("Activar seguro demo", 'data-invoice-action="insurance"') : ""}${artiBtn("Descargar factura demo", 'id="arti-download-invoice"')}</div>${i.settled ? `<p class="arti-note">Neto liquidado ${artiCash(i.net, i.currency)} · ARTI ${artiCash(i.platform_fee, i.currency)} · agencia ${artiCash(i.agency_fee, i.currency)} · Fast Pay ${artiCash(i.fastpay_fee, i.currency)} · financiación ${artiCash(i.financing_fee, i.currency)}</p>` : ""}`,
    true,
  );
  $$("[data-invoice-action]").forEach(
    (b) =>
      (b.onclick = () => {
        const action = b.dataset.invoiceAction,
          mode = ["failed", "processing", "overdue"].includes(action);
        artiAction(
          "invoice/" + id + "/" + (mode ? "pay" : action),
          mode ? { mode: action } : {},
          () => artiInvoice(id),
        );
      }),
  );
  $("#arti-download-invoice").onclick = () => {
    const markup = `<!doctype html><html lang="es"><meta charset="utf-8"><title>${esc(i.number)}</title><body><h1>ARTI · FACTURA DEMO</h1><p>Sin validez fiscal. Operación ficticia.</p><h2>${esc(i.number)}</h2><p>Empresa: ${esc(artiName(i.owner_id))}</p><p>Proveedor: ${esc(artiName(i.provider_id))}</p><p>Servicio: ${esc(e.title)}</p><p>Horario: ${esc(e.start)} — ${esc(e.end)}</p><p>Condiciones: ${esc(e.conditions)}</p><p>Total: ${artiCash(i.total, i.currency)}</p><p>NET ${i.terms} · vence ${esc(i.due)}</p><p>Estado: ${esc(i.status)}</p></body></html>`,
      url = URL.createObjectURL(new Blob([markup], { type: "text/html" })),
      link = document.createElement("a");
    link.href = url;
    link.download = i.number + "-DEMO.html";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Factura demo descargada · puedes imprimirla como PDF");
  };
}
function artiCredit(id) {
  const c = artiUI.data.credits.find((x) => x.id === id);
  modal(
    "ARTI Credit · simulado",
    "No existe una línea de crédito real.",
    `<form id="arti-credit-form">${select(
      "Estado demo",
      "status",
      ["PENDING_REVIEW", "APPROVED", "LIMITED", "SUSPENDED", "REJECTED"].map(
        (x) => ({ value: x, label: x }),
      ),
      c.status,
    )}<p>Límite ${artiCash(c.limit, c.currency)} · utilizado ${artiCash(c.used, c.currency)}.</p><p class="error"></p><div class="form-actions"><button class="btn" type="submit">Simular decisión</button></div></form>`,
  );
  bindForm("#arti-credit-form", async (f) => {
    const r = await api("/api/arti/credit/" + id, f);
    toast(r.message);
    closeModal();
    await loadArti(state.renderVersion);
  });
}
function artiAdmin() {
  const d = artiUI.data;
  $("#arti-content").innerHTML = `<div class="stats-grid">${[
    ["Usuarios", d.users.length],
    ["Artistas", d.counts.artists],
    ["Empresas", d.counts.enterprises],
    ["Líderes", d.counts.leaders],
    ["Agencias", d.counts.agencies],
    ["Venues", d.counts.venues],
    ["Eventos", d.counts.events],
    ["Pagos", d.invoices.filter((i) => i.settled).length],
    ["Financiadas", d.financing.length],
    ["Fast Pay", d.invoices.filter((i) => i.fastpay_fee > 0).length],
    ["Atrasos", d.events.filter((e) => e.late_minutes > 0).length],
    ["Ausencias", d.events.filter((e) => e.status === "NO_SHOW").length],
    [
      "Disputas",
      d.disputes.filter((x) => !["RESOLVED", "REJECTED"].includes(x.status))
        .length,
    ],
  ]
    .map(
      ([l, n]) =>
        `<div class="stat"><small>${l}</small><strong>${n}</strong><span class="sub">Datos ficticios persistentes</span></div>`,
    )
    .join(
      "",
    )}</div><section class="panel"><h2>Métricas por moneda · demo</h2><p>GMV liquidado: ${artiTotals(
    d.invoices.filter((i) => i.settled),
    "total",
  )}</p><p>Pendiente: ${artiTotals(
    d.invoices.filter((i) => !i.customer_paid),
    "total",
  )}</p><p>Ingreso ARTI: ${artiTotals(d.invoices, "platform_fee")}</p></section><section class="panel"><h2>Reglas de simulación</h2><form id="arti-rules"><div class="form-grid">${[
    ["agency_share_of_commission_bps", "Parte de agencia sobre comisión (bps)"],
    ["hold_minutes", "Retención (min)"],
    ["round_limit", "Máximo de rondas"],
    ["commission_bps", "Comisión (bps)"],
    ["fastpay_bps", "Fast Pay (bps)"],
    ["factoring_bps", "Factoring (bps)"],
    ["late_fee", "Advertencia monetaria (centavos)"],
    ["call_minutes", "Llegada anticipada (min)"],
    ["checkin_radius", "Geozona (m)"],
  ]
    .map(([k, l]) => field(l, k, "number", d.settings[k], 'min="0" required'))
    .join(
      "",
    )}</div><p class="error"></p><div class="form-actions"><button class="btn" type="submit">Guardar reglas demo</button></div></form></section><section class="panel"><h2>Disputas y evidencia</h2>${d.disputes.map((x) => `<div class="booking-row"><div class="booking-info"><h3>Caso #${x.id} · evento #${x.event_id}</h3><p>${esc(x.reason)}</p>${artiBadge(x.status)}</div>${artiBtn("Revisar", `data-dispute="${x.id}"`)}</div>`).join("")}</section><section class="panel"><div class="section-head"><h2>Usuarios y reservas históricas</h2>${artiBtn("Abrir administración existente", 'id="arti-legacy-admin"')}</div><p class="muted">Se conserva el panel original de usuarios, reservas, suspensiones y reportes.</p></section><section class="panel"><h2>Registro de operaciones</h2>${
    d.audit
      .slice(0, 30)
      .map(
        (x) =>
          `<p class="arti-audit"><b>${esc(x.action)}</b> · ${esc(artiName(x.by))} · #${esc(x.entity)}<small>${esc(x.at)}</small></p>`,
      )
      .join("") ||
    '<p class="muted">Las próximas acciones quedarán registradas.</p>'
  }</section>`;
  bindForm("#arti-rules", async (f) => {
    const r = await api("/api/arti/settings", f);
    toast(r.message);
    await loadArti(state.renderVersion);
  });
  $("#arti-legacy-admin").onclick = () => navigate("admin");
  $$("[data-dispute]").forEach(
    (b) =>
      (b.onclick = () => {
        const id = Number(b.dataset.dispute),
          x = d.disputes.find((x) => x.id === id);
        modal(
          "Revisión de disputa #" + id,
          esc(x.reason),
          `<form id="arti-case-form">${select(
            "Decisión",
            "status",
            ["REVIEW", "REQUEST_EVIDENCE", "RESOLVED", "REJECTED"].map((x) => ({
              value: x,
              label: x,
            })),
          )}<div class="field"><label for="note">Nota de revisión</label><textarea id="note" name="note" required></textarea></div><p class="error"></p><div class="form-actions"><button type="button" class="btn light" data-event="${x.event_id}">Ver evidencia</button><button type="submit" class="btn">Registrar decisión</button></div></form>`,
        );
        bindForm("#arti-case-form", async (f) => {
          const r = await api("/api/arti/dispute/" + id, f);
          toast(r.message);
          closeModal();
          await loadArti(state.renderVersion);
        });
        bindArtiCommon();
      }),
  );
}
const artiLessons = [
  [
    "Tu primer acuerdo",
    "Explora oportunidades, elige fechas y propone tarifa, horario y condiciones. Aplicar genera una retención temporal; la otra parte debe aceptar.",
  ],
  [
    "Tu precio «desde»",
    "Es una referencia de perfil. La tarifa final corresponde a un evento, condiciones, moneda y volumen acordados.",
  ],
  [
    "Fechas y equipos",
    "Una serie puede aceptarse completa o parcialmente. El líder asigna intérpretes y el sistema impide horarios solapados.",
  ],
  [
    "Llegada y setup",
    "Call time aparece antes del inicio. En la demo puedes simular GPS dentro o fuera de geozona, llegada tarde y ausencia. Entrega evidencia y cambia a Empresa para verificarla.",
  ],
  [
    "NET 30 / 60 / 90",
    "El plazo indica cuántos días después del servicio vence la factura. No representa crédito real aprobado en esta demo.",
  ],
  [
    "Factoring y seguro",
    "Empresa → factura aceptada → partner simulado evalúa → anticipo → cobro al vencimiento. Las condiciones, costes y cobertura son ficticios; en producción dependen de aprobación y contratos con terceros.",
  ],
  [
    "Fast Pay",
    "Tras verificar el servicio, el proveedor puede simular un cobro anticipado. Se muestra comisión, fee y neto; la operación queda en el ledger y no admite duplicados.",
  ],
  [
    "Penalizaciones y disputas",
    "Una llegada tarde genera una advertencia revisable. No se descuenta dinero automáticamente. Admin puede revisar evidencia, pedir más información, resolver o rechazar.",
  ],
  [
    "Media y privacidad",
    "La demo tiene clips y evidencias locales. Su proveedor mock guarda referencias y metadatos; la arquitectura futura usa object storage, procesamiento y CDN.",
  ],
  [
    "Presenta ARTI en 5–10 minutos",
    "Escoge el escenario Negociación, cambia Empresa ↔ Artista, acuerda condiciones, abre el evento, registra llegada y setup, verifica como Empresa y muestra Factoring/Fast Pay desde Finanzas. Usa Admin para avanzar libremente.",
  ],
];
function artiJournal() {
  $("#arti-content").innerHTML =
    `<div class="arti-section-head"><div><h2>ARTI Journal</h2><p class="muted">Una guía breve para entender tu próximo paso.</p></div></div><div class="arti-journal">${artiLessons.map(([title, body], i) => `<details class="panel" ${i === 0 ? "open" : ""}><summary><span>${String(i + 1).padStart(2, "0")}</span><h3>${esc(title)}</h3>${icon("plus")}</summary><p>${esc(body)}</p></details>`).join("")}</div>`;
}
async function renderArtiScenarios(version) {
  const d = await api("/api/arti/workspace");
  if (version !== state.renderVersion) return;
  artiUI.data = d;
  $("#content").innerHTML =
    `${head("Explora ARTI. Vive cada flujo.", "Empresas, agencias, líderes y artistas conectados en una demo funcional.", artiBtn("Restaurar demo", 'id="arti-reset"'))}<div class="arti-note">Simulaciones persistentes en este navegador. Sin cobros, GPS ni cobertura reales.</div><div class="stats-grid">${[
      ["Artistas", d.counts.artists],
      ["Líderes", d.counts.leaders],
      ["Oportunidades", d.counts.opportunities],
      ["Eventos", d.counts.events],
    ]
      .map(
        ([k, v]) =>
          `<div class="stat"><small>${k}</small><strong>${v}</strong></div>`,
      )
      .join(
        "",
      )}</div><div class="arti-scenarios">${d.scenarios.map((s, i) => `<button data-scenario="${s.id}" class="arti-scenario"><span>${String(i + 1).padStart(2, "0")}</span><h2>${esc(s.title)}</h2><p>${esc(s.description)}</p><strong>Explorar escenario ↗</strong></button>`).join("")}</div><section class="panel"><h2>Tu demostración, paso a paso.</h2><p>Selecciona un escenario, cambia de perspectiva con el selector superior y realiza las acciones. Admin tiene un botón especial para avanzar el evento sin esperar el reloj. Al restaurar, solo se borra la copia de datos demo de este navegador.</p></section>`;
  $$("[data-scenario]").forEach(
    (b) =>
      (b.onclick = async () => {
        const r = await artiAction("scenario", { id: b.dataset.scenario });
        if (!r) return;
        const scene = b.dataset.scenario;
        await switchView(
          {
            team: "lider",
            enterprise: "empresa",
            replacement: "empresa",
            invoice: "empresa",
            factoring: "empresa",
            insurance: "empresa",
            mass: "empresa",
          }[scene] || "musico",
        );
        artiUI.tab = r.event_id
          ? "events"
          : b.dataset.scenario === "team"
            ? "teams"
            : b.dataset.scenario === "enterprise"
              ? "overview"
              : "opportunities";
        state.page = "arti";
        await render();
        if (r.event_id) artiEvent(r.event_id);
        else if (
          [
            "individual",
            "negotiation",
            "residency",
            "team",
            "enterprise",
            "mass",
          ].includes(b.dataset.scenario)
        )
          artiOpportunity(r.opportunity_id);
      }),
  );
  $("#arti-reset").onclick = () => {
    modal(
      "Restaurar datos de demostración",
      "Solo afecta a la copia demo de este navegador.",
      `<p class="profile-text">Se restauran publicaciones, reservas, eventos, negociaciones y finanzas de muestra. El código, la configuración y la base Python se conservan.</p><div class="form-actions"><button class="btn" id="arti-confirm-reset">Restaurar datos demo</button></div>`,
    );
    $("#arti-confirm-reset").onclick = async () => {
      const r = await api("/api/arti/reset", {});
      toast(r.message);
      closeModal();
      await switchView("admin");
      artiUI.tab = "overview";
    };
  };
}
function artiTick() {
  const format = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60]
      .map((n) => String(n).padStart(2, "0"))
      .join(":");
  };
  $$("[data-hold-until]").forEach((x) => {
    const ms = Date.parse(x.dataset.holdUntil) - Date.now();
    x.textContent =
      ms > 0
        ? "Fecha retenida · " + format(ms)
        : "Retención vencida · revalidar disponibilidad";
  });
  $$("[data-countdown]").forEach((x) => {
    const clock = x.dataset.demoNow
        ? Date.parse(x.dataset.demoNow) +
          (Date.now() - Date.parse(x.dataset.demoReceived))
        : Date.now(),
      ms = Date.parse(x.dataset.countdown) - clock;
    x.textContent = ms > 0 ? format(ms) : "Hora alcanzada · modo demo";
  });
}
setInterval(artiTick, 1000);
function artiUploadMedia() {
  modal(
    "Subir contenido",
    "MediaStorageProvider mock · solo en este navegador",
    `<form id="arti-upload-form"><div class="field"><label for="arti-file">Foto o video (hasta 8 MB)</label><input type="file" id="arti-file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" required></div>${field("Texto de publicación", "caption", "text", "Mi próximo escenario.", 'required maxlength="2200"')}<p class="legal">No se envía a un servidor. MOV se conserva como archivo de muestra; su reproducción depende del navegador. No hay transcoding ni antivirus reales.</p><p class="error"></p><div class="form-actions"><button type="submit" class="btn">Subir y publicar</button></div></form>`,
  );
  bindForm("#arti-upload-form", async (data) => {
    const file = $("#arti-file").files[0];
    if (!file || file.size > 8388608)
      throw Error("Selecciona un archivo de hasta 8 MB.");
    const data_url = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(Error("No pudimos leer el archivo."));
      reader.readAsDataURL(file);
    });
    const result = await api("/api/arti/media", {
      caption: data.caption,
      file: {
        name: file.name,
        mime_type: file.type,
        size: file.size,
        data_url,
      },
    });
    toast(result.message);
    closeModal();
    await navigate("feed");
  });
}
function artiSocialForm() {
  modal(
    "Publicar en la comunidad",
    "Talento, oportunidades y novedades profesionales.",
    `<form id="arti-social-form"><div class="field"><label for="body">Tu publicación</label><textarea name="body" id="body" maxlength="2200" required></textarea></div><p class="error"></p><div class="form-actions"><button class="btn" type="submit">Publicar</button></div></form>`,
  );
  bindForm("#arti-social-form", async (f) => {
    const r = await api("/api/arti/social", f);
    toast(r.message);
    closeModal();
    await loadFeed(state.renderVersion);
  });
}
function artiSocialComment(id) {
  const p = feedState.workspace.professional_posts.find((p) => p.id === id);
  modal(
    "Conversación profesional",
    esc(p.body),
    `<div>${p.comments.map((c) => `<div class="review"><b>${esc(feedState.workspace.users.find((u) => u.id === c.by)?.name)}</b><p>${esc(c.body)}</p></div>`).join("") || '<p class="muted">Inicia la conversación.</p>'}</div><form id="arti-social-comment"><div class="field"><label for="body">Comentario</label><textarea name="body" id="body" required maxlength="1000"></textarea></div><p class="error"></p><div class="form-actions"><button class="btn" type="submit">Comentar</button></div></form>`,
  );
  bindForm("#arti-social-comment", async (f) => {
    const r = await api("/api/arti/social/" + id + "/comment", f);
    toast(r.message);
    closeModal();
    await loadFeed(state.renderVersion);
  });
}
function artiCalendar() {
  const d = artiUI.data,
    m = artiUI.month,
    year = m.getFullYear(),
    month = m.getMonth(),
    key = year + "-" + String(month + 1).padStart(2, "0"),
    first = new Date(year, month, 1).getDay(),
    length = new Date(year, month + 1, 0).getDate();
  $("#arti-content").innerHTML =
    `<section class="panel"><div class="section-head"><h2>Calendario de eventos</h2><div class="arti-calendar-controls">${artiBtn("←", 'id="arti-month-prev"')}<strong>${esc(m.toLocaleDateString("es-DO", { month: "long", year: "numeric" }))}</strong>${artiBtn("→", 'id="arti-month-next"')}</div></div><div class="arti-month">${["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((x) => `<div class="arti-weekday">${x}</div>`).join("")}${Array.from({ length: first }, () => '<div class="arti-month-day blank"></div>').join("")}${Array.from(
      { length },
      (_, i) => {
        const date = key + "-" + String(i + 1).padStart(2, "0"),
          events = d.events.filter((e) => e.start.startsWith(date));
        return `<div class="arti-month-day"><span>${i + 1}</span>${events.map((e) => `<button data-event="${e.id}">${esc(e.title)}<small>${timeStr(e.start)} · ${artiStatus[e.status] || e.status}</small></button>`).join("")}</div>`;
      },
    ).join(
      "",
    )}</div></section><section class="panel"><h2>Fechas retenidas</h2>${d.holds.map((h) => `<p>${dateStr(h.start)} · ${timeStr(h.start)} · <small data-hold-until="${h.expires}"></small></p>`).join("") || '<p class="muted">Las propuestas activas mostrarán aquí sus retenciones.</p>'}</section>`;
  $("#arti-month-prev").onclick = () => {
    artiUI.month = new Date(year, month - 1, 1);
    renderArti();
  };
  $("#arti-month-next").onclick = () => {
    artiUI.month = new Date(year, month + 1, 1);
    renderArti();
  };
  artiTick();
}
async function artiAccounts() {
  const d = await api("/api/arti/workspace");
  modal(
    "Personajes de ARTI",
    "Todas las identidades son ficticias. Cada visitante tiene una copia independiente.",
    `<form id="arti-account-form">${select(
      "Cuenta demo",
      "email",
      d.users
        .filter((u) => !u.suspended)
        .map((u) => ({
          value: u.email,
          label: u.name + " · " + ArtiDomain.role(u),
        })),
      state.user.email,
    )}<p class="error"></p><div class="form-actions"><button class="btn" type="submit">Explorar como este personaje</button></div></form>`,
  );
  bindForm("#arti-account-form", async (f) => {
    state.user = await api("/api/auth/login", {
      email: f.email,
      password: "Artivo2026!",
    });
    history.replaceState(null, "", location.pathname);
    closeModal();
    await startSession();
  });
}
