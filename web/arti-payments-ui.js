/* Presentation of the existing protected booking engines, visitor-local demo. */
function moneyPolicy(e) {
  return `<p>Tu proveedor ha reservado esta fecha para ti. Las cancelaciones tardías pueden generar un reembolso parcial.</p><div class="money-policy">${e.cancellation_policy.map((p) => `<div><b>${esc(p.name)}</b><span>${100 - p.penalty_bps / 100}% reembolso · ${(p.penalty_bps * p.provider_share_bps) / 1e6}% compensación</span></div>`).join("")}</div><p class="legal">Esta política protege parcialmente al proveedor cuando el cliente cancela con poca anticipación. La penalización y el fee de ARTI son conceptos separados.</p>`;
}
async function moneyRefresh(id) {
  artiUI.data = await api("/api/arti/workspace");
  if (id) artiEvent(id);
  else renderRoleWorkspace();
}
async function moneyCall(path, data, id) {
  try {
    const r = await api("/api/arti/" + path, data);
    toast(r.message || "Operación demo actualizada");
    await moneyRefresh(id);
    return r;
  } catch (err) {
    toast(err.message);
  }
}
function appendMoneyEvent(e) {
  if (e.payment_model !== "PROTECTED_V2") return;
  const body =
    $("#modal .modal-body") ||
    $("#modal-body") ||
    $("#modal form")?.parentElement;
  // Modal markup uses #modal-content in this app.
  const target = body || $(".modal");
  if (!target) return;
  const f = e.fee_snapshot,
    canPay = state.user.id === e.owner_id || artiUI.data.role === "ADMIN";
  target.insertAdjacentHTML(
    "beforeend",
    `<section class="panel money-event"><h3>Protección de tu booking</h3><p>${esc(e.timezone)} · ${esc(e.payment_status)} · ${esc(e.funds_status)}</p><div class="detail-grid"><div><small>PRECIO</small><strong>${artiCash(e.rate, e.currency)}</strong></div><div><small>FEE ARTI DEL SERVICIO (${f.bps / 100}%)</small><strong>${artiCash(f.platform_fee, e.currency)}</strong></div><div><small>NETO AL COMPLETAR EL SERVICIO</small><strong>${artiCash(f.provider_payout, e.currency)}</strong></div><div><small>PRÓXIMA LIQUIDACIÓN</small><strong>${esc(e.expected_payout_date)}</strong></div></div><p>Estado del cobro al cliente: ${esc(e.payment_status)}. Estado del payout: ${esc(e.payout_status)}.</p>${moneyPolicy(e)}<div class="form-actions">${canPay && e.payment_status !== "PAID" && e.status !== "CANCELLED" ? '<button class="btn" id="money-pay">Pagar y confirmar · demo</button>' : ""}${!["CANCELLED", "DISPUTED", "COMPLETED", "INVOICED", "SETTLED"].includes(e.status) ? '<button class="btn light" id="money-cancel">Revisar cancelación</button><button class="btn light" id="money-force">Fuerza mayor</button>' : ""}</div>${e.cancellation ? `<p><b>${e.cancellation.actor === "CLIENT" ? "Cancelado por el cliente" : "Cancelado por el proveedor"}</b> · compensación ${artiCash(e.cancellation.provider_compensation, e.currency)} · reembolso ${artiCash(e.cancellation.refund, e.currency)}</p>` : ""}<details><summary>Historial de pagos y liquidaciones</summary>${e.finance_timeline.map((t) => `<p>${esc(t.status)} · ${esc(t.at)}</p>`).join("")}</details></section>`,
  );
  if (
    e.cancellation?.actor === "PROVIDER" &&
    (canPay || artiUI.data.role === "ADMIN")
  ) {
    target.insertAdjacentHTML(
      "beforeend",
      '<button class="btn" id="money-find-replacement">Buscar reemplazo</button>',
    );
    $("#money-find-replacement").onclick = () => {
      closeModal();
      navigate("discover");
    };
  }
  $("#money-pay")?.addEventListener("click", () => moneyCheckout(e));
  $("#money-cancel")?.addEventListener("click", () => moneyCancelReview(e));
  if (
    (state.user.id === e.provider_id || artiUI.data.role === "ADMIN") &&
    e.staffing_assignments?.length &&
    e.status !== "CANCELLED"
  ) {
    target.insertAdjacentHTML(
      "beforeend",
      '<button class="btn light" id="money-split-edit">Distribuir compensación del equipo</button>',
    );
    $("#money-split-edit").onclick = () => moneySplitReview(e);
  }
  $("#money-force")?.addEventListener("click", () =>
    moneyCancelReview(e, "FORCE_MAJEURE"),
  );
}
function moneyCheckout(e) {
  modal(
    "Pagar y confirmar",
    "Pago ficticio · fondos protegidos hasta verificar el servicio",
    `<p><b>${esc(e.title)}</b> · ${dateStr(e.start)} ${timeStr(e.start)} · ${artiCash(e.rate, e.currency)}</p>${moneyPolicy(e)}<form id="money-checkout"><label class="money-accept"><input type="checkbox" name="accepted" required> Acepto la política de cancelación y las condiciones de esta reserva.</label><div class="form-actions"><button type="submit" class="btn">Pagar y confirmar · demo</button><button type="button" class="btn light" id="money-back">Volver</button></div><p class="error"></p></form>`,
  );
  $("#money-back").onclick = () => artiEvent(e.id);
  bindForm("#money-checkout", async () => {
    const r = await api("/api/arti/money_event/" + e.id + "/pay", {
      accepted_terms: true,
    });
    toast(r.message);
    await moneyRefresh(e.id);
  });
}
async function moneyCancelReview(e, actor, legacyId) {
  try {
    actor ||= state.user.id === e.provider_id ? "PROVIDER" : "CLIENT";
    const r = await api(
        "/api/arti/" +
          (legacyId
            ? "legacy_cancel/" + legacyId
            : "money_event/" + e.id + "/cancel"),
        { actor, confirm: false },
      ),
      p = r.preview;
    const seconds = Math.max(0, Math.floor(p.seconds)),
      duration =
        Math.floor(seconds / 3600) +
        "h " +
        Math.floor((seconds % 3600) / 60) +
        "m " +
        (seconds % 60) +
        "s";
    modal(
      "Revisar cancelación",
      "Booking #" + e.id + " · " + e.timezone,
      p.status === "MANUAL_REVIEW"
        ? `<p>Fuerza mayor requiere revisión manual. No se aplica automáticamente una penalización.</p><textarea id="force-reason" placeholder="Describe lo ocurrido"></textarea><div class="form-actions"><button class="btn" id="money-confirm-cancel">Solicitar revisión</button><button class="btn light" id="money-keep">Mantener reserva</button></div>`
        : `<p><b>${esc(e.title)}</b></p><p>Tiempo restante: <b>${duration}</b> · evento ${dateStr(e.start)} ${timeStr(e.start)}</p><p>Regla aplicable: ${actor === "PROVIDER" ? "Cancelación del proveedor · reembolso completo" : esc(p.rule.name)}</p><div class="detail-grid">${[
            ["Reserva", e.rate],
            ["Reembolso al cliente", p.refund],
            ["Compensación al proveedor", p.provider_compensation],
            ["Penalización total", p.penalty],
            ["Fee ARTI de cancelación", p.arti_fee],
            ["Procesamiento", p.processing_cost],
            ["Impuestos", p.taxes],
          ]
            .map(
              ([l, v]) =>
                `<div><small>${l}</small><strong>${artiCash(v, e.currency)}</strong></div>`,
            )
            .join(
              "",
            )}</div><p>La compensación se programa como un ingreso separado. Esta acción afecta únicamente a esta fecha.</p><div class="form-actions"><button class="btn" id="money-confirm-cancel">Confirmar cancelación</button><button class="btn light" id="money-keep">Mantener reserva</button></div>`,
    );
    $("#money-keep").onclick = () =>
      legacyId ? openBooking(legacyId) : artiEvent(e.id);
    $("#money-confirm-cancel").onclick = async () => {
      if (legacyId) {
        await api("/api/arti/legacy_cancel/" + legacyId, { confirm: true });
        state.bookings = await api("/api/bookings");
        closeModal();
        await render();
        await openBooking(legacyId);
      } else
        await moneyCall(
          "money_event/" + e.id + "/cancel",
          { actor, confirm: true, reason: $("#force-reason")?.value },
          e.id,
        );
    };
  } catch (err) {
    toast(err.message);
  }
}
function renderMoneyFinance() {
  const d = artiUI.data,
    m = d.money,
    admin = d.role === "ADMIN",
    client = ["CLIENT", "ENTERPRISE"].includes(d.role),
    own = m.earnings;
  $("#arti-content").innerHTML =
    `<section class="panel"><h2>${client ? "Tus pagos y reembolsos" : "Tus ingresos y liquidaciones"}</h2><p>Pago del cliente y cobro del profesional tienen estados separados. Todas las operaciones son ficticias.</p>${
      !client
        ? `<div class="detail-grid"><div><small>INGRESOS DISPONIBLES</small><strong>${artiTotals(
            own.filter((e) =>
              ["SCHEDULED", "AVAILABLE", "FAILED"].includes(e.status),
            ),
            "net",
          )}</strong></div><div><small>COMPENSACIONES DE CANCELACIÓN</small><strong>${artiTotals(
            own.filter((e) => e.type === "CANCELLATION_COMPENSATION"),
            "gross",
          )}</strong></div><div><small>YA PAGADO</small><strong>${artiTotals(
            own.filter((e) => e.status === "PAID"),
            "net",
          )}</strong></div></div><div class="form-actions"><label>Frecuencia <select id="money-frequency">${["WEEKLY", "BIWEEKLY", "MONTHLY"].map((v, i) => `<option value="${v}" ${v === m.frequency ? "selected" : ""}>${["Semanal · martes", "Quincenal", "Mensual"][i]}</option>`).join("")}</select></label><button class="btn light" id="money-save-frequency">Guardar frecuencia</button><button class="btn" id="money-create-batch">Simular liquidación programada</button></div>`
        : ""
    }</section>${!client ? `<section class="panel"><h3>Servicios e ingresos por concepto</h3>${own.map((x) => `<div class="booking-row"><div class="booking-info"><h3>${esc(d.events.find((e) => e.id === x.event_id)?.title || "Booking #" + x.event_id)}</h3><p>${x.type === "CANCELLATION_COMPENSATION" ? "Compensación por cancelación" : "Servicio completado"} · bruto ${artiCash(x.gross, x.currency)} · fees ${artiCash(x.fees, x.currency)} · neto ${artiCash(x.net, x.currency)}</p><p>Próximo payout: ${esc(x.payout_date)} · ${esc(x.frequency)}</p>${artiBadge(x.status)}</div><div>${artiBtn("Ver booking", `data-event="${x.event_id}"`)}${["SCHEDULED", "AVAILABLE", "FAILED"].includes(x.status) && !x.batch_id ? artiBtn("Fast Pay", `data-money-fast="${x.event_id}"`) : ""}</div></div>`).join("") || "<p>Verifica un servicio para liberar su ingreso.</p>"}</section>` : ""}<section class="panel"><h3>Pagos del cliente</h3>${m.payments.map((p) => `<p>Booking #${p.event_id} · ${artiCash(p.amount, p.currency)} · ${esc(p.status)}</p>`).join("") || "<p>Sin pagos registrados.</p>"}</section><section class="panel"><h3>Reembolsos</h3>${m.refunds.map((r) => `<div class="booking-row"><p>Booking #${r.event_id} · ${artiCash(r.amount, r.currency)} · ${esc(r.status)}</p>${r.status !== "PAID" ? artiBtn("Simular reembolso", `data-money-refund="${r.id}"`) : ""}</div>`).join("") || "<p>Sin reembolsos.</p>"}</section><section class="panel"><h3>Liquidaciones programadas</h3>${m.batches.map((b) => `<div class="booking-row"><p>Batch #${b.id} · ${esc(b.frequency)} · ${artiCash(b.net, b.currency)} · ${esc(b.status)}</p>${b.status !== "PAID" ? `<div>${artiBtn("Completar", `data-money-batch="${b.id}" data-mode="PAID"`)}${artiBtn("Procesando", `data-money-batch="${b.id}" data-mode="PROCESSING"`)}${artiBtn("Simular fallo", `data-money-batch="${b.id}" data-mode="FAILED"`)}</div>` : ""}</div>`).join("") || "<p>Aún no se ha creado una liquidación.</p>"}</section><section class="panel"><h3>Facturas anteriores</h3>${d.invoices
      .filter(
        (i) =>
          d.events.find((e) => e.id === i.event_id)?.payment_model !==
          "PROTECTED_V2",
      )
      .map(
        (i) =>
          `<div class="booking-row"><p>${esc(i.number)} · ${artiCash(d.role === "AGENCY" ? i.agency_fee || 0 : i.total, i.currency)}</p>${artiBtn("Ver factura", `data-invoice="${i.id}"`)}</div>`,
      )
      .join(
        "",
      )}</section>${admin ? moneyAdminReport(m) + moneyEconomics(m) : ""}`;
  bindArtiCommon();
  $("#money-save-frequency")?.addEventListener("click", () =>
    moneyCall("payout_frequency", { frequency: $("#money-frequency").value }),
  );
  $("#money-create-batch")?.addEventListener("click", () =>
    moneyCall("payout/create", { frequency: admin ? null : m.frequency }),
  );
  $$("[data-money-fast]").forEach(
    (b) => (b.onclick = () => moneyFastReview(Number(b.dataset.moneyFast))),
  );
  $$("[data-money-refund]").forEach(
    (b) => (b.onclick = () => moneyCall("refund/" + b.dataset.moneyRefund, {})),
  );
  $$("[data-money-batch]").forEach(
    (b) =>
      (b.onclick = () =>
        moneyCall("payout/" + b.dataset.moneyBatch, { mode: b.dataset.mode })),
  );
}
async function moneyFastReview(id) {
  try {
    const r = await api("/api/arti/money_event/" + id + "/fastpay", {
        confirm: false,
      }),
      q = r.quote;
    modal(
      "Cobrar hoy con Fast Pay",
      "Dinero ficticio · revisa el fee antes de confirmar",
      `<p>Ingreso disponible: ${artiCash(r.earning.net, r.earning.currency)}</p><p>Fee Fast Pay: ${artiCash(q.fee, r.earning.currency)}</p><h3>Recibirías ${artiCash(q.net, r.earning.currency)}</h3><div class="form-actions"><button class="btn" id="money-fast-confirm">Confirmar Fast Pay demo</button><button class="btn light" id="money-fast-back">Volver</button></div>`,
    );
    $("#money-fast-back").onclick = closeModal;
    $("#money-fast-confirm").onclick = async () => {
      const result = await moneyCall("money_event/" + id + "/fastpay", {
        confirm: true,
      });
      if (result) closeModal();
    };
  } catch (err) {
    toast(err.message);
  }
}
function moneyAdminReport(m) {
  const c = m.cancellations,
    n = c.length,
    late = c.filter((x) => x.penalty > 0).length;
  return `<section class="panel"><h3>Cancelaciones y protección</h3><p>Total ${n} · clientes ${c.filter((x) => x.actor === "CLIENT").length} · proveedores ${c.filter((x) => x.actor === "PROVIDER").length} · tardías ${late} · disputadas ${artiUI.data.disputes.filter((d) => m.cancellations.some((c) => c.event_id === d.event_id)).length}</p><p>Reembolsos: ${artiTotals(c, "refund")} · compensación: ${artiTotals(c, "provider_compensation")} · penalizaciones: ${artiTotals(c, "penalty")} · ingreso ARTI por cancelación: ${artiTotals(c, "arti_fee")}</p><p>Tasa de cancelación: ${((100 * n) / Math.max(1, artiUI.data.events.length)).toFixed(1)}% · tardías: ${((100 * late) / Math.max(1, n)).toFixed(1)}% · promedio de reembolso USD: ${artiCash(Math.round(c.filter((x) => x.currency === "USD").reduce((s, x) => s + x.refund, 0) / Math.max(1, c.filter((x) => x.currency === "USD").length)), "USD")}</p></section>`;
}
function renderMoneySettings() {
  const m = artiUI.data.money,
    s = m.settings;
  roleAdminSection("Reglas de simulación");
  $("#arti-content").insertAdjacentHTML(
    "beforeend",
    `<section class="panel"><h2>Políticas de cancelación</h2><p>Se aplican a nuevas reservas; cada contrato conserva una copia auditable.</p><form id="money-rules">${s.cancellation.map((p, i) => `<div class="money-rule" data-rule="${i}"><b>${p.max_hours <= 24 ? "≤24 horas / mismo día" : p.max_hours <= 72 ? "≤3 días" : p.max_hours <= 168 ? "≤7 días" : "+7 días"}</b><label>Hasta horas <input type="number" name="hours${i}" value="${p.max_hours}" min="1" max="1000000"></label><label>Penalización % <input type="number" name="penalty${i}" value="${p.penalty_bps / 100}" min="0" max="100" step="0.01"></label><label>Pool al proveedor % <input type="number" name="share${i}" value="${p.provider_share_bps / 100}" min="0" max="100" step="0.01"></label><label>Pool ARTI % <input type="number" name="arti${i}" value="${p.arti_share_bps / 100}" min="0" max="100" step="0.01"></label><label>Procesamiento % <input type="number" name="processing${i}" value="${p.processing_share_bps / 100}" min="0" max="100" step="0.01"></label><label>Impuestos % <input type="number" name="tax${i}" value="${p.tax_share_bps / 100}" min="0" max="100" step="0.01"></label></div>`).join("")}<h3>Liquidaciones y Fast Pay</h3><label>Frecuencia por defecto <select name="frequency">${["WEEKLY", "BIWEEKLY", "MONTHLY"].map((x) => `<option ${x === s.default_frequency ? "selected" : ""}>${x}</option>`).join("")}</select></label>${field("Fast Pay porcentaje", "fastpercent", "number", s.fastpay.percentage_bps / 100, 'min="0" max="30" step="0.01"')}${field("Fast Pay mínimo USD", "fastmin", "number", s.fastpay.minimum_fee / 100, 'min="0"')}${field("Fast Pay máximo USD", "fastmax", "number", s.fastpay.maximum_fee / 100, 'min="0"')}<h3>Fee ARTI por volumen</h3>${s.fee_tiers.map((t, i) => field(t.name + " · hasta " + artiCash(t.max, "USD"), "tier" + i, "number", t.bps / 100, 'min="0" max="30" step="0.01"')).join("")}<p class="error"></p><button class="btn" type="submit">Guardar reglas</button></form></section><section class="panel"><h3>Simular cancelación con reloj demo</h3><p>Cada botón crea una reserva individual pagada de US$500 y abre la revisión. Las fechas existentes se conservan.</p><div class="form-actions">${[
      [240, "10 días"],
      [120, "5 días"],
      [48, "2 días"],
      [12, "12 horas"],
      [5, "Mismo día · 5 horas"],
      [10, "Mismo día · US$1,500"],
    ]
      .map(([h, l]) => artiBtn(l, `data-money-demo="${h}"`))
      .join(
        "",
      )}</div></section><section class="panel"><h3>Fuerza mayor · revisión manual</h3>${
      m.incidents
        .filter((x) => x.status === "MANUAL_REVIEW")
        .map(
          (x) =>
            `<div class="booking-row"><p>Booking #${x.event_id} · ${esc(x.reason)}</p>${artiBtn("Continuar reserva", `data-force="${x.event_id}"`)}${artiBtn("Reembolso completo", `data-force="${x.event_id}" data-refund="yes"`)}</div>`,
        )
        .join("") || "<p>Sin revisiones pendientes.</p>"
    }</section>${moneyAdminReport(m)}`,
  );
  moneyMediaSettings();
  bindForm("#money-rules", async (f) => {
    const cancellation = s.cancellation.map((p, i) => ({
      ...p,
      max_hours: Number(f["hours" + i]),
      penalty_bps: Math.round(Number(f["penalty" + i]) * 100),
      provider_share_bps: Math.round(Number(f["share" + i]) * 100),
      arti_share_bps: Math.round(Number(f["arti" + i]) * 100),
      processing_share_bps: Math.round(Number(f["processing" + i]) * 100),
      tax_share_bps: Math.round(Number(f["tax" + i]) * 100),
    }));
    const r = await api("/api/arti/money_settings", {
      cancellation,
      default_frequency: f.frequency,
      fee_tiers: s.fee_tiers.map((t, i) => ({
        ...t,
        bps: Math.round(Number(f["tier" + i]) * 100),
      })),
      fastpay: {
        ...s.fastpay,
        percentage_bps: Math.round(Number(f.fastpercent) * 100),
        minimum_fee: Math.round(Number(f.fastmin) * 100),
        maximum_fee: Math.round(Number(f.fastmax) * 100),
      },
    });
    toast(r.message);
    await moneyRefresh();
  });
  $$("[data-money-demo]").forEach(
    (b) =>
      (b.onclick = async () => {
        const r = await api("/api/arti/money_demo", {
          hours: Number(b.dataset.moneyDemo),
          amount: Number(b.dataset.moneyDemo) === 10 ? 150000 : 50000,
        });
        artiUI.data = await api("/api/arti/workspace");
        await moneyCancelReview(
          artiUI.data.events.find((e) => e.id === r.event_id),
          "CLIENT",
        );
      }),
  );
  $$("[data-force]").forEach(
    (b) =>
      (b.onclick = () =>
        moneyCall("money_event/" + b.dataset.force + "/resolve_force", {
          refund: b.dataset.refund === "yes",
        })),
  );
}
function moneyClientRequest(p) {
  const date = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
  modal(
    "Solicitar reserva protegida",
    p.stage_name + " · requiere aceptación del profesional",
    `<form id="money-client-request">${field("Evento", "title", "text", "Mi próximo evento", 'required maxlength="120"')}${field("Fecha", "date", "date", date, "required")}${field("Inicio", "start", "time", "20:00", "required")}${field("Fin", "end", "time", "23:00", "required")}${field("Tarifa USD", "rate", "number", p.demo_price_usd || 250, 'min="1" step="0.01" required')}${select(
      "Venue",
      "venue",
      artiUI.data.venues.map((v) => ({ value: v.id, label: v.name })),
    )}<label>Condiciones <textarea name="conditions" required>Servicio, equipo y transporte a acordar.</textarea></label><p>Después de aceptar el profesional, podrás revisar la política y simular el pago.</p><p class="error"></p><button class="btn">Enviar solicitud</button></form>`,
  );
  bindForm("#money-client-request", async (f) => {
    const cat = p.primary_category || "MUSIC";
    const o = await api("/api/arti/opportunities", {
      title: f.title,
      category: cat,
      category_key: cat,
      venue_id: Number(f.venue),
      currency: "USD",
      date: f.date,
      count: 1,
      interval_days: 1,
      quantity: 1,
      start_time: f.start,
      end_time: f.end,
      rate: Math.round(Number(f.rate) * 100),
      terms: 0,
      deadline: f.date,
      requirements: f.conditions,
      negotiable: true,
    });
    await api("/api/arti/opportunity/" + o.id + "/invite", {
      user_id: p.user_id,
      date_ids: [1],
    });
    toast("Solicitud enviada al profesional demo");
    closeModal();
    await navigate("bookings");
  });
}
function moneySplitReview(e) {
  const ids = [
    ...new Set(
      [
        e.provider_id,
        ...(e.staffing_assignments || []).map((x) => x.provider_id),
      ].filter(Boolean),
    ),
  ];
  modal(
    "Distribuir protección del equipo",
    "Las participaciones deben sumar 100%",
    `<form id="money-splits">${ids.map((id) => field(artiName(id) + " (%)", "split" + id, "number", (e.settlement_splits?.find((x) => x.provider_id === id)?.share_bps || 0) / 100, 'min="0" max="100" step="0.01"')).join("")}<p class="error"></p><button class="btn">Guardar distribución</button></form>`,
  );
  bindForm("#money-splits", async (f) => {
    const splits = ids
      .filter((id) => Number(f["split" + id]) > 0)
      .map((id) => ({
        provider_id: id,
        share_bps: Math.round(Number(f["split" + id]) * 100),
      }));
    await api("/api/arti/money_event/" + e.id + "/splits", { splits });
    await moneyRefresh(e.id);
  });
}
function appendMoneyScenarios() {
  const t = $("#content");
  t.insertAdjacentHTML(
    "beforeend",
    `<section class="panel"><h2>Pagos y cancelación protegida</h2><p>Explora reembolso, protección del profesional y liquidaciones con fondos ficticios.</p><button class="btn" id="money-scenario">Abrir controles de cancelación</button><button class="btn light" id="money-payout-scenario">Ver ingresos semanales de Gary</button></section>`,
  );
  $("#money-scenario").onclick = async () => {
    await switchView("admin");
    $("#tutorial-root").innerHTML = "";
    await navigate("settings");
  };
  $("#money-payout-scenario").onclick = async () => {
    await switchView("musico");
    $("#tutorial-root").innerHTML = "";
    await navigate("income");
  };
}

function moneyMediaMarkup(p) {
  return p.media_type === "VIDEO"
    ? `<video class="arti-portfolio-video" src="${esc(p.media_url)}" controls playsinline></video>`
    : p.media_type === "AUDIO"
      ? `<audio src="${esc(p.media_url)}" controls aria-label="Audio de la publicación"></audio>`
      : p.media_type === "DOCUMENT"
        ? `<a class="btn light" href="${esc(p.media_url)}" target="_blank" rel="noopener">Ver documento</a>`
        : `<img class="arti-portfolio-video" src="${esc(p.media_url)}" alt="Contenido profesional">`;
}
function moneyEconomics(m) {
  return `<section class="panel"><h3>Economía de los bookings protegidos</h3>${[
    ...new Set(m.payments.map((x) => x.currency)),
  ]
    .map((currency) => {
      const list = m.earnings.filter((x) => x.currency === currency),
        gmv = m.payments
          .filter((x) => x.currency === currency)
          .reduce((s, x) => s + x.amount, 0),
        platform = list.reduce((s, x) => s + (x.platform_fee || 0), 0),
        fast = list.reduce((s, x) => s + (x.fastpay_fee || 0), 0),
        providerCost =
          list.filter((x) => x.fastpay).length *
          m.settings.fastpay.provider_cost,
        infra = m.settings.infrastructure_fixed,
        net = platform + fast - providerCost - infra;
      return `<p><b>${currency}</b> · cobros ${artiCash(gmv, currency)} · fee ARTI ${artiCash(platform, currency)} · fee Fast Pay ${artiCash(fast, currency)} · coste proveedor ${artiCash(providerCost, currency)} · infraestructura demo ${artiCash(infra, currency)} · margen estimado ${artiCash(net, currency)}</p>`;
    })
    .join(
      "",
    )}<p class="legal">Solo registros protegidos; los contratos históricos mantienen su contabilidad. Los costes son supuestos configurables, no gastos reales.</p></section>`;
}
function moneyMediaSettings() {
  const limits = artiUI.data.media_settings;
  $("#arti-content").insertAdjacentHTML(
    "beforeend",
    `<section class="panel"><h3>Archivos y video</h3><p>Bytes guardados fuera del estado de negocio, en un almacén de objetos local. Procesamiento y CDN son simulados.</p><form id="money-media-limits">${field("Tamaño máximo MB", "maxmb", "number", limits.maximum_bytes / 1048576, 'min="0.01" max="100" step="0.01" required')}${field("Duración máxima segundos", "maxduration", "number", limits.maximum_duration_seconds, 'min="1" max="3600" required')}<p>Formatos: ${esc(limits.formats.join(", "))}</p><p class="error"></p><button class="btn light">Guardar límites</button></form></section>`,
  );
  bindForm("#money-media-limits", async (f) => {
    await api("/api/arti/media_settings", {
      maximum_bytes: Math.round(Number(f.maxmb) * 1048576),
      maximum_duration_seconds: Number(f.maxduration),
    });
    toast("Límites de archivos actualizados");
    await moneyRefresh();
  });
}
