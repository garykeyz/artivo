/* Universal professional discovery, profile fields, staffing and taxonomy tools. */
const talentSearch = {
  category: "",
  specialty: "",
  skill: "",
  experience: "",
  rating: "",
  equipment: "",
  language: "",
  certified: false,
  enterprise_ready: false,
};
async function loadTalentSearch() {
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  if (state.city) p.set("city", state.city);
  for (const [key, value] of Object.entries(talentSearch))
    if (value)
      p.set(key === "category" ? "talent_category" : key, String(value));
  if (state.active) p.set("active", "1");
  state.artists = await api("/api/artists?" + p);
  renderTalentDiscover();
}
function renderTalentDiscover() {
  const d = artiUI.data || feedState.workspace,
    tax = d?.taxonomy || [],
    cat = tax.find(
      (c) => c.key === talentSearch.category && c.kind === "CATEGORY",
    ),
    options = (kind) =>
      tax.filter(
        (t) => t.enabled && t.kind === kind && (!cat || t.parent_id === cat.id),
      );
  const artists = state.favorites
    ? state.artists.filter((p) => p.favorite)
    : state.artists;
  $("#content").innerHTML =
    head(
      state.favorites
        ? "Tu selección de talento."
        : "Descubre talento para cada momento.",
      "Artistas, técnicos, performers, crews y proveedores en una sola red.",
    ) +
    `<form id="talent-search-form" class="panel"><div class="form-grid">${field("Buscar talento", "talent-query", "search", state.q, 'placeholder="FOH, dancer, DMX, DJ…"')}${select(
      "Categoría de talento",
      "talent-category",
      [
        { value: "", label: "Todo el ecosistema" },
        ...tax
          .filter((t) => t.enabled && t.kind === "CATEGORY")
          .sort((a, b) => a.order - b.order)
          .map((t) => ({ value: t.key, label: t.name })),
      ],
      talentSearch.category,
    )}${select("Especialidad", "talent-specialty", [{ value: "", label: "Todas" }, ...options("SPECIALTY").map((t) => ({ value: t.name, label: t.name }))], talentSearch.specialty)}${select(cat?.key === "LIGHTING" ? "Protocolo / programación" : cat?.key === "AUDIO" ? "Consola / FOH / RF / Dante" : cat?.key === "DANCE" ? "Estilo / performance" : "Habilidad", "talent-skill", [{ value: "", label: "Todas" }, ...options("SKILL").map((t) => ({ value: t.name, label: t.name }))], talentSearch.skill)}${select("Ciudad", "talent-city", [{ value: "", label: "Todas" }, ...state.boot.cities.map((c) => ({ value: c.name, label: c.name }))], state.city)}${field("Experiencia mínima (años)", "talent-experience", "number", talentSearch.experience, 'min="0" max="80"')}${select(
      "Equipo",
      "talent-equipment",
      [
        { value: "", label: "Cualquiera" },
        { value: "HAS_EQUIPMENT", label: "Dispone de equipo" },
        { value: "REQUIRES_EQUIPMENT", label: "Requiere equipo" },
      ],
      talentSearch.equipment,
    )}${select(
      "Rating demo mínimo",
      "talent-rating",
      [
        { value: "", label: "Todos" },
        { value: "4", label: "4+" },
        { value: "4.5", label: "4.5+" },
      ],
      talentSearch.rating,
    )}${field("Idioma", "talent-language", "text", talentSearch.language, 'placeholder="English, Español"')}<label><input type="checkbox" id="talent-certified" ${talentSearch.certified ? "checked" : ""}> Documentación verificada demo</label><label><input type="checkbox" id="talent-ready" ${talentSearch.enterprise_ready ? "checked" : ""}> Enterprise ready demo</label></div><div class="form-actions"><button class="btn" type="submit">Buscar talento</button><button class="btn light" type="button" id="talent-clear">Limpiar filtros</button></div></form><div class="section-head"><h2>${artists.length} profesionales</h2><small>Reputación y disponibilidad de muestra</small></div><div class="artists-grid">${artists.map(talentCard).join("")}</div>`;
  $("#talent-category").onchange = async (e) => {
    talentSearch.category = e.target.value;
    talentSearch.specialty = "";
    talentSearch.skill = "";
    await loadTalentSearch();
  };
  $("#talent-search-form").onsubmit = async (e) => {
    e.preventDefault();
    state.q = $("#talent-query").value;
    state.city = $("#talent-city").value;
    Object.assign(talentSearch, {
      specialty: $("#talent-specialty").value,
      skill: $("#talent-skill").value,
      experience: $("#talent-experience").value,
      rating: $("#talent-rating").value,
      equipment: $("#talent-equipment").value,
      language: $("#talent-language").value,
      certified: $("#talent-certified").checked,
      enterprise_ready: $("#talent-ready").checked,
    });
    await loadTalentSearch();
  };
  $("#talent-clear").onclick = async () => {
    Object.keys(talentSearch).forEach((k) => (talentSearch[k] = ""));
    state.q = "";
    state.city = "";
    await loadTalentSearch();
  };
  bindArtistCards();
}
function talentCard(p) {
  return `<article class="artist-card"><div class="card-image"><img src="${esc(p.photo || "demo-stage.svg")}" alt="${esc(p.stage_name)}" loading="lazy"><span class="card-category">${esc(p.profile_type || "ARTIST")} · ${esc(p.entity_type || "INDIVIDUAL")}</span></div><div class="card-body"><h3>${esc(p.stage_name)}</h3><p>${esc((p.specialties || []).map((s) => s.name).join(" / ") || p.category)}</p><p class="muted">${esc(p.city)} · ${p.years_experience || 0} años</p><div class="tags">${(
    p.skills || []
  )
    .slice(0, 3)
    .map((s) => `<span class="tag">${esc(s)}</span>`)
    .join(
      "",
    )}</div><p>★ ${p.demo_stats?.rating || "Nuevo"} · ${p.active ? "Disponible" : "Consultar agenda"} · demo</p><div class="card-footer"><strong>Desde ${artiCash(p.rates?.event_rate || p.demo_price_usd * 100, p.rates?.currency || "USD")}</strong><button class="btn light small" data-artist="${p.user_id}">Ver perfil</button></div></div></article>`;
}
function talentProfileSummary(p) {
  const rates = p.rates || {};
  return `<section class="talent-professional-summary"><div class="eyebrow">${esc(p.profile_type || "MUSICIAN")} · ${esc(p.entity_type || "INDIVIDUAL")}</div><h3>${esc((p.specialties || []).map((s) => s.name).join(" / "))}</h3><div class="tags">${(p.skills || []).map((s) => `<span class="tag">${esc(s)}</span>`).join("")}</div><div class="detail-grid"><div><small>EXPERIENCIA</small><strong>${p.years_experience || 0} años · ${esc(String(p.projects || ""))}</strong></div><div><small>EQUIPO</small><strong>${p.equipment_mode === "HAS_EQUIPMENT" ? "Equipo propio" : "Requiere equipo"} · ${esc(p.hardware_experience || p.equipment || "Consultar")}</strong></div><div><small>SOFTWARE</small><strong>${esc(p.software_experience || "Consultar")}</strong></div><div><small>SETUP / TEARDOWN</small><strong>${p.setup_minutes || 60} / ${p.teardown_minutes || 30} minutos</strong></div></div>${p.primary_category === "ACROBATICS" ? `<p>Espacio: ${esc(p.space_required)} · altura: ${p.ceiling_height} m · suelo: ${esc(p.floor_requirements)}</p><p>${esc(p.safety_requirements)}</p>` : ""}<details><summary>Estructura de tarifas</summary><div class="detail-grid">${ArtiTalent.rateKeys
    .filter((k) => rates[k])
    .map(
      (k) =>
        `<div><small>${esc(k.replaceAll("_", " "))}</small><strong>${artiCash(rates[k], rates.currency)}</strong></div>`,
    )
    .join(
      "",
    )}</div></details><h3>Documentos y certificaciones</h3>${(p.certifications || []).map((c) => `<p><b>${esc(c.name)}</b> · ${esc(c.issuer)} · ${esc(c.verification_status)} · vence ${esc(c.expiration_date || "Sin fecha")}</p>`).join("") || '<p class="muted">No declara certificaciones verificadas.</p>'}<small>Las verificaciones y badges son ficticios; no acreditan cualificación real.</small></section>`;
}
async function talentProfileForm() {
  const d = await api("/api/arti/workspace");
  artiUI.data = d;
  const p = d.artists.find((p) => p.user_id === state.user.id),
    tax = d.taxonomy;
  if (!p) return;
  modal(
    "¿Qué haces en ARTI?",
    "Perfil profesional · varias especialidades y habilidades",
    `<form id="talent-profile-form"><div class="form-grid">${select(
      "Categoría principal",
      "primary_category",
      tax
        .filter((t) => t.kind === "CATEGORY" && t.enabled)
        .map((t) => ({ value: t.key, label: t.name })),
      p.primary_category,
    )}${select(
      "Tipo de profesional o equipo",
      "entity_type",
      ArtiTalent.types.map((t) => ({ value: t, label: t })),
      p.entity_type,
    )}${field("Años de experiencia", "years_experience", "number", p.years_experience, 'min="0" max="80"')}${select(
      "Equipo",
      "equipment_mode",
      [
        { value: "HAS_EQUIPMENT", label: "Tengo equipo" },
        { value: "REQUIRES_EQUIPMENT", label: "Requiero equipo" },
      ],
      p.equipment_mode,
    )}</div><div id="talent-specialty-fields"></div><details open><summary>Experiencia y requisitos</summary><div class="form-grid">${["hardware_experience", "software_experience", "projects", "venues_worked", "space_required", "safety_requirements", "floor_requirements", "professional_level", "languages"].map((k) => field(k.replaceAll("_", " "), k, "text", String(p[k] || ""))).join("")}${["ceiling_height", "setup_minutes", "teardown_minutes", "group_size"].map((k) => field(k.replaceAll("_", " "), k, "number", p[k] || 0, 'min="0"')).join("")}</div></details><details><summary>Tarifas por tipo de servicio</summary><div class="form-grid">${select(
      "Moneda",
      "currency",
      ["USD", "DOP", "EUR"].map((x) => ({ value: x, label: x })),
      p.rates?.currency || "USD",
    )}${ArtiTalent.rateKeys.map((k) => field(k.replaceAll("_", " "), k, "number", (p.rates?.[k] || 0) / 100, 'min="0" step="0.01"')).join("")}<label><input type="checkbox" name="custom_quote" checked> Cotización personalizada</label></div></details><p class="error"></p><div class="form-actions"><button class="btn" type="submit">Guardar capacidades y tarifas</button></div></form>`,
    true,
  );
  const selected = new Set(p.specialties.map((s) => s.name)),
    skills = new Set(p.skills);
  const draw = () => {
    const cat = tax.find(
      (t) => t.key === $("#primary_category").value && t.kind === "CATEGORY",
    );
    $("#talent-specialty-fields").innerHTML =
      `<h3>Especialidades (puedes combinar profesiones)</h3><div class="talent-check-grid">${tax
        .filter(
          (t) =>
            t.kind === "SPECIALTY" &&
            t.enabled &&
            (t.parent_id === cat.id || selected.has(t.name)),
        )
        .map(
          (t) =>
            `<label><input type="checkbox" name="specialties" value="${t.id}" ${selected.has(t.name) ? "checked" : ""}> ${esc(t.name)}</label>`,
        )
        .join("")}</div><h3>Habilidades</h3><div class="talent-check-grid">${tax
        .filter(
          (t) =>
            t.kind === "SKILL" &&
            t.enabled &&
            (t.parent_id === cat.id || skills.has(t.name)),
        )
        .map(
          (t) =>
            `<label><input type="checkbox" name="skills" value="${t.id}" ${skills.has(t.name) ? "checked" : ""}> ${esc(t.name)}</label>`,
        )
        .join("")}</div>`;
    $$("[name=specialties]").forEach(
      (x) =>
        (x.onchange = () =>
          x.checked
            ? selected.add(tax.find((t) => t.id === Number(x.value)).name)
            : selected.delete(tax.find((t) => t.id === Number(x.value)).name)),
    );
    $$("[name=skills]").forEach(
      (x) =>
        (x.onchange = () =>
          x.checked
            ? skills.add(tax.find((t) => t.id === Number(x.value)).name)
            : skills.delete(tax.find((t) => t.id === Number(x.value)).name)),
    );
  };
  $("#primary_category").onchange = draw;
  draw();
  bindForm("#talent-profile-form", async (f) => {
    await api("/api/arti/talent_profile", {
      ...f,
      specialties: tax
        .filter((t) => t.kind === "SPECIALTY" && selected.has(t.name))
        .map((t) => t.id),
      skills: tax
        .filter((t) => t.kind === "SKILL" && skills.has(t.name))
        .map((t) => t.id),
      rates: Object.fromEntries(
        ArtiTalent.rateKeys.map((k) => [k, Math.round(Number(f[k]) * 100)]),
      ),
    });
    state.boot = await api("/api/bootstrap");
    closeModal();
    toast("Perfil profesional actualizado");
    await navigate("profile");
  });
}
async function talentDocuments() {
  const p = await api("/api/arti/talent_profile");
  modal(
    "Tus documentos de muestra",
    "Cada documento queda pendiente hasta revisión Admin.",
    `<div>${p.certifications.map((c) => `<p>${esc(c.name)} · ${esc(c.verification_status)}</p>`).join("")}</div><form id="talent-doc-form">${field("Nombre", "name", "text", "", "required")}${field("Emisor", "issuer", "text", "", "required")}${field("Fecha de emisión", "issue_date", "date", today())}${field("Vencimiento", "expiration_date", "date", "")}${field("Referencia documental demo", "document", "text", "Documento sintético de muestra", "required")}<p class="error"></p><div class="form-actions"><button class="btn">Registrar documento</button></div></form>`,
  );
  bindForm("#talent-doc-form", async (f) => {
    await api("/api/arti/certification/" + state.user.id, f);
    closeModal();
    toast("Documento pendiente de revisión demo");
  });
}
function talentStaffingMarkup(e) {
  if (!e.staffing_assignments?.length) return "";
  const coordinator =
    ["ADMIN"].includes(ArtiAccess.role(state.user)) ||
    [e.owner_id, e.provider_id, e.agency_id].includes(state.user.id);
  return `<section class="panel"><h3>Staffing por profesión</h3><p>${e.staffing_assignments.filter((s) => s.provider_id).length} / ${e.staffing_assignments.length} plazas cubiertas</p>${e.staffing_assignments.map((s) => `<div class="staffing-row"><div><b>${esc(s.label)} · ${s.id}</b><small>${s.provider_id ? artiName(s.provider_id) : "UNASSIGNED"}</small></div>${coordinator ? `<button class="btn light small" data-staffing-slot="${s.id}">Asignar / sustituir</button>` : ""}</div>`).join("")}</section>`;
}
function bindTalentEvent(e) {
  $$("[data-staffing-slot]").forEach(
    (b) =>
      (b.onclick = () => {
        const slot = e.staffing_assignments.find(
            (s) => s.id === b.dataset.staffingSlot,
          ),
          profiles = artiUI.data.artists.filter((p) =>
            ArtiTalent.qualified(p, slot),
          );
        modal(
          "Asignar profesional",
          slot.label,
          `<form id="staffing-assign-form">${select(
            "Profesional compatible",
            "provider_id",
            profiles.map((p) => ({
              value: p.user_id,
              label:
                p.stage_name +
                " · " +
                p.specialties.map((s) => s.name).join(" / "),
            })),
          )}<p>La disponibilidad y conflictos se comprueban al guardar.</p><p class="error"></p><div class="form-actions"><button class="btn">Asignar plaza</button></div></form>`,
        );
        bindForm("#staffing-assign-form", async (f) => {
          await api("/api/arti/event/" + e.id + "/assign_slot", {
            slot_id: slot.id,
            provider_id: Number(f.provider_id),
          });
          await loadArti(state.renderVersion);
          artiEvent(e.id);
          toast("Plaza asignada");
        });
      }),
  );
  $("#technical-next")?.addEventListener("click", () => {
    const stage = [
      "LOAD_IN",
      "SETUP_STARTED",
      "SETUP_COMPLETED",
      "SOUNDCHECK",
      "READY",
      "STRIKE_STARTED",
      "STRIKE_COMPLETED",
    ][
      [
        "LOAD_IN",
        "SETUP_STARTED",
        "SETUP_COMPLETED",
        "SOUNDCHECK",
        "READY",
        "STRIKE_STARTED",
        "STRIKE_COMPLETED",
      ].indexOf(e.technical_stage) + 1
    ];
    artiAction("event/" + e.id + "/technical", { stage }, () =>
      artiEvent(e.id),
    );
  });
}
function talentTechnicalMarkup(e) {
  if (e.booking_type !== "TECHNICAL_BOOKING") return "";
  const actor =
    ArtiAccess.role(state.user) === "ADMIN" ||
    [e.performer_id, e.provider_id].includes(state.user.id);
  return `<section class="panel"><h3>Operación técnica</h3><p>Call ${timeStr(e.call_time)} → load-in → setup → soundcheck → ready → show → strike</p><p>Duración operativa: ${e.operational_minutes} minutos · ${esc(e.technical_stage || "PENDING")}</p>${actor && e.technical_stage !== "STRIKE_COMPLETED" ? '<button class="btn light small" id="technical-next">Siguiente fase técnica</button>' : ""}</section>`;
}
async function renderTaxonomyManager() {
  const d = await api("/api/arti/taxonomy");
  $("#arti-content").innerHTML =
    `<section class="panel"><div class="section-head"><h2>Taxonomía configurable</h2><button class="btn small" id="taxonomy-create">Crear</button></div>${select("Tipo de registro", "taxonomy-kind", [{ value: "", label: "Todos" }, ...d.kinds.map((k) => ({ value: k, label: k }))])}<div id="taxonomy-list"></div></section><section class="panel"><h2>Documentos pendientes · verificación demo</h2>${artiUI.data.artists.flatMap((p) => p.certifications.map((c) => `<div class="booking-row"><div class="booking-info"><h3>${esc(p.stage_name)} · ${esc(c.name)}</h3><p>${esc(c.issuer)} · ${esc(c.verification_status)} · ${esc(c.document)}</p></div><button class="btn light small" data-cert-profile="${p.user_id}" data-cert-id="${c.id}">Revisar documento</button></div>`)).join("")}</section>`;
  const draw = () => {
    $("#taxonomy-list").innerHTML = d.nodes
      .filter(
        (n) =>
          !$("#taxonomy-kind").value || n.kind === $("#taxonomy-kind").value,
      )
      .sort((a, b) => a.order - b.order)
      .map(
        (n) =>
          `<div class="taxonomy-row"><div><b>${esc(n.name)}</b><small>${n.kind} · ${esc(d.nodes.find((p) => p.id === n.parent_id)?.name || "Raíz")} · ${n.enabled ? "Activa" : "Deshabilitada"} · orden ${n.order}</small></div><button class="text-btn" data-tax-edit="${n.id}">Editar</button><button class="text-btn" data-tax-toggle="${n.id}">${n.enabled ? "Deshabilitar" : "Activar"}</button><button class="text-btn" data-tax-order="${n.id}">Orden</button></div>`,
      )
      .join("");
    for (const [attr, action] of [
      ["edit", "edit"],
      ["toggle", "disable"],
      ["order", "reorder"],
    ])
      $$("[data-tax-" + attr + "]").forEach(
        (b) =>
          (b.onclick = () => {
            const n = d.nodes.find(
              (n) =>
                n.id ===
                Number(
                  b.dataset[
                    { edit: "taxEdit", toggle: "taxToggle", order: "taxOrder" }[
                      attr
                    ]
                  ],
                ),
            );
            if (action === "disable")
              return artiAction("taxonomy/" + n.id + "/disable", {
                enabled: !n.enabled,
              });
            modal(
              "Editar taxonomía",
              n.name,
              `<form id="tax-update">${field(action === "edit" ? "Nombre" : "Orden", action === "edit" ? "name" : "order", action === "edit" ? "text" : "number", action === "edit" ? n.name : n.order, "required")}<p class="error"></p><button class="btn">Guardar</button></form>`,
            );
            bindForm("#tax-update", async (f) => {
              await api("/api/arti/taxonomy/" + n.id + "/" + action, f);
              closeModal();
              await renderTaxonomyManager();
              toast("Taxonomía actualizada");
            });
          }),
      );
  };
  $("#taxonomy-kind").onchange = draw;
  draw();
  $("#taxonomy-create").onclick = () => {
    modal(
      "Crear categoría o capacidad",
      "La taxonomía crece sin modificar el código.",
      `<form id="tax-create">${field("Nombre", "name", "text", "", "required")}${select(
        "Tipo",
        "kind",
        d.kinds.map((k) => ({ value: k, label: k })),
      )}${select("Categoría padre", "parent_id", [{ value: "", label: "Raíz" }, ...d.nodes.filter((t) => t.kind === "CATEGORY").map((t) => ({ value: t.id, label: t.name }))])}<label><input type="checkbox" name="technical"> Perfil técnico</label><label><input type="checkbox" name="sensitive"> Requiere documentos verificados</label><p class="error"></p><button class="btn">Crear registro</button></form>`,
    );
    bindForm("#tax-create", async (f) => {
      await api("/api/arti/taxonomy", {
        ...f,
        technical: !!f.technical,
        sensitive: !!f.sensitive,
      });
      closeModal();
      renderTaxonomyManager();
      toast("Registro creado");
    });
  };
  $$("[data-cert-profile]").forEach(
    (b) =>
      (b.onclick = () => {
        modal(
          "Revisar documento",
          "Verificación de muestra, sin acreditación real.",
          `<p>Revisa el documento sintético del perfil antes de registrar la decisión.</p><div class="form-actions"><button class="btn" id="cert-approve">Aprobar demo</button><button class="btn light" id="cert-reject">Rechazar</button></div>`,
        );
        for (const [selector, approve] of [
          ["#cert-approve", true],
          ["#cert-reject", false],
        ])
          $(selector).onclick = async () => {
            await api(
              "/api/arti/certification/" + b.dataset.certProfile + "/verify",
              { id: Number(b.dataset.certId), approve },
            );
            await loadArti(state.renderVersion);
            closeModal();
            toast("Revisión de documento registrada");
          };
      }),
  );
}
function addTalentProfileControls() {
  const p = state.boot.profile;
  $("#content").insertAdjacentHTML(
    "afterbegin",
    `<section class="panel"><h2>${p.profile_type === "TECHNICIAN" ? "Tu perfil técnico" : p.profile_type === "DANCER" ? "Tu perfil de danza" : "Tus capacidades profesionales"}</h2><p>${esc(p.primary_category)} · ${esc(p.entity_type)} · ${esc(p.specialties.map((s) => s.name).join(" / "))}</p><div class="form-actions"><button class="btn" id="professional-edit">Especialidades, habilidades y tarifas</button><button class="btn light" id="professional-documents">Documentos y certificaciones</button><button class="btn light" id="professional-equipment">Equipamiento</button><button class="btn light" id="professional-availability">Disponibilidad por estado</button></div></section>`,
  );
  $("#professional-edit").onclick = talentProfileForm;
  $("#professional-documents").onclick = talentDocuments;
  $("#professional-equipment").onclick = talentEquipmentForm;
  $("#professional-availability").onclick = talentAvailabilityForm;
}
function addTalentProfileActions(p) {
  $(".modal .profile-head").insertAdjacentHTML(
    "afterend",
    talentProfileSummary(p),
  );
  const role = ArtiAccess.role(state.user);
  if (role !== "CLIENT") $("#book-artist")?.remove();
  if (role === "CLIENT" && $("#book-artist"))
    $("#book-artist").onclick = async () => {
      artiUI.data = await api("/api/arti/workspace");
      moneyClientRequest(p);
    };
  const actions =
    role === "ENTERPRISE"
      ? ["Invitar a oportunidad", "invite"]
      : role === "LEADER"
        ? ["Invitar al equipo", "team"]
        : role === "AGENCY"
          ? ["Proponer talento", "propose"]
          : ["Ver portfolio", "portfolio"];
  $(".modal .form-actions").insertAdjacentHTML(
    "beforeend",
    `<button class="btn light" id="professional-context">${actions[0]}</button><button class="btn light" id="professional-follow">Seguir perfil</button><button class="btn light" id="professional-message">Mensaje</button>`,
  );
  $("#professional-message").onclick = () =>
    openProfessionalConversation(p.user_id);
  $("#professional-follow").onclick = async () => {
    const r = await api("/api/follows", { artist_id: p.user_id });
    toast(r.following ? "Siguiendo perfil" : "Seguimiento actualizado");
  };
  $("#professional-context").onclick = async () => {
    if (actions[1] === "portfolio") {
      document
        .querySelector(".modal video")
        ?.scrollIntoView({ block: "center" });
      return;
    }
    artiUI.data = await api("/api/arti/workspace");
    if (actions[1] === "team") {
      const teams = artiUI.data.teams.filter(
        (t) => t.leader_id === state.user.id,
      );
      modal(
        "Invitar al equipo",
        p.stage_name,
        `<form id="profile-team-invite">${select(
          "Equipo",
          "team_id",
          teams.map((t) => ({ value: t.id, label: t.name })),
        )}<p class="error"></p><button class="btn">Invitar</button></form>`,
      );
      bindForm("#profile-team-invite", async (f) => {
        await api("/api/arti/team/" + f.team_id + "/member", {
          user_id: p.user_id,
          instrument: p.specialties.map((s) => s.name).join(" / "),
        });
        closeModal();
        toast("Invitación enviada; requiere aceptación");
      });
    } else {
      const opportunities = artiUI.data.opportunities.filter((o) =>
        actions[1] === "invite"
          ? o.owner_id === state.user.id
          : ArtiTalent.compatible(p, { category_key: o.category_key }),
      );
      modal(
        actions[0],
        p.stage_name,
        `<p>Selecciona una oportunidad para negociar fechas y condiciones.</p>${
          opportunities
            .slice(0, 20)
            .map(
              (o) =>
                `<button class="btn light" data-opp="${o.id}">${esc(o.title)}</button>`,
            )
            .join("") || "<p>Publica una oportunidad primero.</p>"
        }`,
      );
      bindArtiCommon();
    }
  };
}
function talentOpportunityStaffing(o) {
  const s = o.staffing_summary;
  return `<section class="panel"><h3>${o.staffing?.length ? "Staffing y paquete" : "Servicio profesional"}</h3><p>${esc(o.service_id || o.category)} · ${esc(o.booking_type || "MUSIC_BOOKING")} · call ${o.call_minutes ?? 60} min antes</p>${s ? `<div class="staffing-totals"><span>Total requerido <b>${s.total}</b></span><span>Cubierto <b>${s.filled}</b></span><span>Negociando <b>${s.negotiating}</b></span><span>Faltante <b>${s.missing}</b></span></div>` : ""}${(o.staffing || []).map((s) => `<p>${esc(s.label)} · ${s.quantity} por evento · ${esc(s.skills.join(", "))}</p>`).join("")}${o.requires_certification ? "<p>Requiere documentación verificada demo antes de contratar. No acredita certificaciones reales.</p>" : ""}</section>`;
}
function talentEquipmentForm() {
  modal(
    "Equipamiento",
    "Declara qué tienes y qué debe proporcionar el venue.",
    `<form id="equipment-form">${field("Categoría", "category", "text", "Audio", "required")}${field("Modelo / descripción", "model", "text", "", "required")}${select(
      "Disponibilidad",
      "mode",
      [
        { value: "HAS_EQUIPMENT", label: "Equipo propio" },
        { value: "REQUIRES_EQUIPMENT", label: "Requiere equipo" },
      ],
    )}<p class="error"></p><button class="btn">Guardar equipo</button></form>`,
  );
  bindForm("#equipment-form", async (f) => {
    await api("/api/arti/equipment", f);
    closeModal();
    toast("Equipo asociado a tu perfil");
  });
}
function talentAvailabilityForm() {
  modal(
    "Disponibilidad profesional",
    "Por hora, día o rango.",
    `<form id="talent-availability-form">${select(
      "Estado",
      "status",
      [
        "AVAILABLE",
        "TENTATIVE",
        "RESERVED",
        "BOOKED",
        "UNAVAILABLE",
        "TRAVELING",
        "ON_ASSIGNMENT",
        "VACATION",
      ].map((s) => ({ value: s, label: s })),
    )}${field("Desde", "start", "datetime-local", today() + "T09:00", "required")}${field("Hasta", "end", "datetime-local", today() + "T18:00", "required")}<p class="error"></p><button class="btn">Guardar disponibilidad</button></form>`,
  );
  bindForm("#talent-availability-form", async (f) => {
    await api("/api/arti/talent_availability", f);
    closeModal();
    toast("Disponibilidad actualizada");
  });
}
function bindStaffingBuilder(rows, d) {
  const draw = () => {
    $("#staffing-builder").innerHTML = rows
      .map(
        (row, i) =>
          `<div class="staffing-builder-row" data-staffing-index="${i}">${select(
            "Profesión",
            "staffing-category-" + i,
            d.taxonomy
              .filter((t) => t.kind === "CATEGORY" && t.enabled)
              .map((t) => ({ value: t.key, label: t.name })),
            row.category_key,
          )}${field("Especialidad / descripción", "staffing-label-" + i, "text", row.label || "", "required")}${field("Cantidad por evento", "staffing-quantity-" + i, "number", row.quantity || 1, 'min="1" max="100" required')}<button class="text-btn" type="button" data-remove-staffing="${i}">Quitar</button></div>`,
      )
      .join("");
    $$("[data-remove-staffing]").forEach(
      (b) =>
        (b.onclick = () => {
          const values = readStaffingBuilder();
          rows.splice(0, rows.length, ...values);
          rows.splice(Number(b.dataset.removeStaffing), 1);
          draw();
        }),
    );
  };
  $("#staffing-add").onclick = () => {
    const values = readStaffingBuilder();
    rows.splice(0, rows.length, ...values, {
      category_key: "AUDIO",
      label: "Sound Engineer",
      quantity: 1,
    });
    draw();
  };
  draw();
}
function readStaffingBuilder() {
  return $$("[data-staffing-index]").map((el) => {
    const i = el.dataset.staffingIndex;
    return {
      category_key: $("#staffing-category-" + i).value,
      label: $("#staffing-label-" + i).value,
      quantity: Number($("#staffing-quantity-" + i).value),
      skills: [],
    };
  });
}
function roleArtistCalendar() {
  artiCalendar();
  $("#arti-content").insertAdjacentHTML(
    "afterbegin",
    '<div class="form-actions"><button class="btn light" id="calendar-availability">Configurar disponibilidad</button></div>',
  );
  $("#calendar-availability").onclick = talentAvailabilityForm;
}
function appendTalentScenarios(d) {
  const scenes = [
    [
      "Operación de iluminación",
      "LIGHTING",
      "Técnico · call 16:00, show 20:00, setup y strike.",
    ],
    ["Show de danza", "DANCE", "Especialidades y negociación para performers."],
    [
      "Aerialist y seguridad",
      "ACROBATICS",
      "Documentos pendientes y revisión de Admin.",
    ],
    ["FOH + Monitor", "PACKAGE_FOH", "Propuesta de equipo y dos assignments."],
    [
      "30 profesionales · 20 eventos",
      "PACKAGE_MASS",
      "600 plazas, categorías y cobertura.",
    ],
    [
      "Producción completa",
      "PACKAGE_SUMMER",
      "Programa de 40 eventos, crews y pagos.",
    ],
  ];
  $("#content .arti-scenarios").insertAdjacentHTML(
    "beforeend",
    scenes
      .map(
        ([title, key, description], i) =>
          `<button class="arti-scenario" data-talent-scene="${key}"><span>${String(13 + i).padStart(2, "0")}</span><h2>${title}</h2><p>${description}</p><strong>Explorar escenario ↗</strong></button>`,
      )
      .join(""),
  );
  $$("[data-talent-scene]").forEach(
    (b) =>
      (b.onclick = async () => {
        const key = b.dataset.talentScene;
        if (key.startsWith("PACKAGE")) {
          await switchView("lider");
          closeModal();
          await navigate("opportunities");
          const match =
            key === "PACKAGE_FOH"
              ? "FOH Engineer"
              : key === "PACKAGE_MASS"
                ? "30 profesionales"
                : "Summer Entertainment";
          const o = artiUI.data.opportunities.find((o) =>
            o.title.startsWith(match),
          );
          artiOpportunity(o.id);
        } else {
          const e = d.events.find(
              (e) => e.category_key === key && e.status === "CONFIRMED",
            ),
            accounts = await api("/api/arti/demo_accounts"),
            user = accounts.users.find((u) => u.id === e.provider_id);
          ArtiTutorial.clear();
          state.user = await api("/api/auth/login", {
            email: user.email,
            password: "Artivo2026!",
          });
          history.replaceState(null, "", location.pathname);
          await startSession();
          closeModal();
          await navigate("events");
          artiEvent(e.id);
        }
      }),
  );
}
