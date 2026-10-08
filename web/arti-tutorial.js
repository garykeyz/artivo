/* Persistent per-user tours. Navigation changes the real workspace, never business state. */
const ArtiTutorial = (() => {
  let active = false,
    steps = [],
    progress = { status: "NOT_STARTED", step: 0 },
    module = "role",
    userId = null;
  const general = () => [
    {
      page: "feed",
      title: "Una red para todos",
      body: "Comparte y descubre publicaciones, videos y perfiles. Seguir, guardar y comentar están disponibles en la capa social.",
    },
    {
      page: "discover",
      title: "Personas y talento",
      body: "Explora perfiles y portfolio. Las acciones de contratación y coordinación dependen de tu rol.",
    },
    {
      page: "space",
      title: "Tu propio espacio",
      body: "La navegación distingue Social, Operación, Finanzas y Ayuda. Solo aparecen herramientas autorizadas para tu rol.",
    },
    {
      page: "messages",
      title: "Conversaciones",
      body: "Tus conversaciones se relacionan con solicitudes y reservas. Otros usuarios no pueden ver tus mensajes privados.",
    },
    {
      page: "help",
      title: "Aprende a tu ritmo",
      body: "Aquí puedes repetir tu guía, consultar Journal o conocer los escenarios de demostración.",
    },
  ];
  async function save(status, step = progress.step) {
    progress = await api("/api/arti/tutorial", { status, step, module });
  }
  function clear() {
    active = false;
    $("#tutorial-root").innerHTML = "";
    window.removeEventListener("resize", position);
    window.removeEventListener("scroll", position, true);
  }
  function position() {
    const target = $(steps[progress.step]?.target || "#content"),
      spot = $("#tutorial-spot");
    if (!target || !spot) return;
    const b = target.getBoundingClientRect();
    spot.style.left = Math.max(8, b.left) + "px";
    spot.style.top = Math.max(8, b.top) + "px";
    spot.style.width =
      Math.max(0, Math.min(b.width, innerWidth - Math.max(8, b.left) - 8)) +
      "px";
    spot.style.height =
      Math.max(0, Math.min(b.height, innerHeight - Math.max(8, b.top) - 8)) +
      "px";
  }
  async function show() {
    if (userId !== state.user?.id) return clear();
    const s = steps[progress.step];
    if (!s) return finish();
    closeModal();
    await navigate(s.page);
    if (!active || userId !== state.user?.id) return;
    $("#tutorial-root").innerHTML =
      `<div class="tutorial-shield"></div><div id="tutorial-spot" class="tutorial-spot"></div><section class="tutorial-card" role="dialog" aria-modal="true" aria-label="ARTI Tutorial"><div class="tutorial-top"><span>${ArtiAccess.label(state.user)} · ${progress.step + 1} / ${steps.length}</span><button id="tour-pause" aria-label="Pausar tutoría">×</button></div><progress max="${steps.length}" value="${progress.step + 1}"></progress><h2>${esc(s.title)}</h2><p>${esc(s.body)}</p><div class="tutorial-controls"><button class="text-btn" id="tour-skip">Omitir guía</button><button class="btn light small" id="tour-back" ${progress.step === 0 ? "disabled" : ""}>Atrás</button><button class="btn small" id="tour-next">${progress.step === steps.length - 1 ? "Finalizar" : "Siguiente"}</button></div></section>`;
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    $("#tour-pause").onclick = clear;
    $("#tour-skip").onclick = skipConfirm;
    $("#tour-back").onclick = () => advance(-1);
    $("#tour-next").onclick = () =>
      progress.step === steps.length - 1 ? finish() : advance(1);
    $("#tour-next").focus();
  }
  async function advance(delta) {
    try {
      await save("IN_PROGRESS", progress.step + delta);
      await show();
    } catch (e) {
      toast(e.message);
    }
  }
  async function finish() {
    await save("COMPLETED");
    clear();
    modal(
      "Ya estás listo para moverte en ARTI.",
      "100% · Tutorial completado",
      `<p>Tu guía seguirá disponible desde Ayuda.</p><div class="form-actions"><button class="btn" id="tour-explore">Explorar ARTI</button></div>`,
    );
    $("#tour-explore").onclick = closeModal;
  }
  function skipConfirm() {
    const wasActive = active;
    clear();
    modal(
      "¿Seguro que quieres omitir la guía?",
      "Puedes volver desde Ayuda cuando quieras.",
      `<div class="form-actions"><button class="btn light" id="skip-continue">Continuar tutoría</button><button class="btn" id="skip-confirm">Omitir</button></div>`,
    );
    $("#skip-continue").onclick = async () => {
      if (wasActive) {
        active = true;
        await show();
      } else await open(module, true);
    };
    $("#skip-confirm").onclick = async () => {
      await save("SKIPPED");
      closeModal();
      toast("Guía omitida · disponible en Ayuda");
    };
  }
  async function open(kind = "role", restart = false) {
    clear();
    closeModal();
    module = kind;
    userId = state.user.id;
    steps = kind === "general" ? general() : ArtiAccess.steps(state.user);
    progress = await api("/api/arti/tutorial?module=" + kind);
    if (restart || progress.status !== "IN_PROGRESS")
      await save("IN_PROGRESS", 0);
    active = true;
    await show();
  }
  async function welcome() {
    clear();
    module = "role";
    userId = state.user.id;
    steps = ArtiAccess.steps(state.user);
    progress = await api("/api/arti/tutorial");
    if (
      userId !== state.user.id ||
      ["SKIPPED", "COMPLETED"].includes(progress.status)
    )
      return;
    const resume = progress.status === "IN_PROGRESS";
    modal(
      resume ? "Continuar donde lo dejaste" : "Bienvenido a ARTI",
      `${state.user.name} · ${ArtiAccess.label(state.user)}`,
      `<p class="profile-text">${resume ? "Tu guía guardó el paso " + (progress.step + 1) + "." : "Vamos a enseñarte cómo funciona tu espacio. Descubre, conecta y realiza tus operaciones con herramientas propias de tu rol."}</p><div class="form-actions"><button class="btn" id="welcome-start">${resume ? "Continuar" : "Comenzar tutoría"}</button>${resume ? '<button class="btn light" id="welcome-restart">Empezar de nuevo</button>' : ""}<button class="text-btn" id="welcome-skip">Omitir guía</button></div>`,
    );
    $("#welcome-start").onclick = () => open("role", !resume);
    $("#welcome-restart")?.addEventListener("click", () => open("role", true));
    $("#welcome-skip").onclick = skipConfirm;
  }
  function helpMenu() {
    modal(
      "¿Cómo funciona ARTI?",
      `Ayuda para ${ArtiAccess.label(state.user)}`,
      `<div class="help-options"><button class="btn light" id="help-general">Tutoría general</button><button class="btn" id="help-role">Guía de mi rol</button><button class="btn light" id="help-functions">Ver funciones · Journal</button><button class="text-btn" id="help-restart">Reiniciar tutoría</button></div>`,
    );
    $("#help-general").onclick = () => open("general");
    $("#help-role").onclick = () => open("role");
    $("#help-functions").onclick = () => navigate("help");
    $("#help-restart").onclick = () => open("role", true);
  }
  document.addEventListener("keydown", (e) => {
    const card = document.querySelector(".tutorial-card");
    if (!card || e.key !== "Tab") return;
    const buttons = [...card.querySelectorAll("button")].filter(
      (b) => !b.disabled,
    );
    if (e.shiftKey && document.activeElement === buttons[0]) {
      e.preventDefault();
      buttons.at(-1).focus();
    } else if (!e.shiftKey && document.activeElement === buttons.at(-1)) {
      e.preventDefault();
      buttons[0].focus();
    }
  });
  return { welcome, open, clear, helpMenu };
})();
function renderRoleHelp() {
  $("#content").innerHTML =
    head(
      "ARTI Journal · Aprende y muévete.",
      "Primeros pasos y ayuda para tu rol.",
      `<button class="btn" id="help-launch">Abrir tutorial</button>`,
    ) + `<div id="arti-content"></div>`;
  artiJournal();
  $("#help-launch").onclick = ArtiTutorial.helpMenu;
  $("#arti-content").insertAdjacentHTML(
    "afterbegin",
    `<div class="academy-categories">${["Primeros pasos", "Para artistas", "Para líderes", "Para empresas", "Para agencias", "Pagos", "Factoring", "Fast Pay", "Booking", "Puntualidad", "Verificación", "Seguridad"].map((t) => `<button class="btn light small" data-lesson-category="${t}">${t}</button>`).join("")}</div>`,
  );
  $$("[data-lesson-category]").forEach(
    (b) =>
      (b.onclick = () => {
        const lessons = {
          "Primeros pasos": [
            "Muévete en ARTI",
            "El feed es universal. Tu workspace muestra herramientas de tu rol. Abre la guía interactiva para recorrerlo.",
          ],
          "Para artistas": [
            "Tu próximo evento",
            "Publica portfolio, define tarifa y disponibilidad, aplica o negocia, realiza check-in y consulta tus ingresos.",
          ],
          "Para líderes": [
            "Coordina talento",
            "Crea equipo, espera consentimiento de miembros y asigna artistas disponibles a cada evento.",
          ],
          "Para empresas": [
            "Contrata a escala",
            "Publica una oportunidad con varias fechas, revisa propuestas, verifica servicios y gestiona facturas.",
          ],
          "Para agencias": [
            "Conecta oferta y demanda",
            "Propón talento, negocia condiciones y consulta bookings y comisiones.",
          ],
          Pagos: [
            "NET 30 / 60 / 90",
            "El plazo indica cuántos días tiene la empresa para pagar desde el servicio facturado. Los pagos de esta demo son ficticios.",
          ],
          Factoring: [
            "Adelantar una factura",
            "US$10,000 contratados → factura NET 90 → anticipo del partner → pago al vencimiento. La aprobación y costes dependerían del partner real.",
          ],
          "Fast Pay": [
            "Cobrar antes",
            "Consulta el importe neto, comisión y disponibilidad en tu factura. El anticipo al proveedor y el pago de empresa son operaciones distintas.",
          ],
          Booking: [
            "Reserva de fecha",
            "Una retención temporal evita reservar dos veces el mismo horario mientras negocias. Aceptar confirma; rechazar libera.",
          ],
          Puntualidad: [
            "Llega a la hora de llamada",
            "La hora de llamada permite preparar el servicio, normalmente una hora antes. El retraso demo genera advertencia y admite disputa.",
          ],
          Verificación: [
            "Check-in y setup",
            "GPS simulado registra llegada; evidencia de setup debe ser verificada antes de iniciar el evento. No solicita tu ubicación real.",
          ],
          Seguridad: [
            "Permisos y datos",
            "Las acciones se autorizan por rol y participación. Esta demo pública guarda datos por navegador y no ofrece autenticación de producción.",
          ],
        };
        const [title, body] = lessons[b.dataset.lessonCategory];
        modal(
          title,
          b.dataset.lessonCategory,
          `<p class="profile-text">${esc(body)}</p><button class="btn" id="academy-tour">Abrir guía de mi rol</button>`,
        );
        $("#academy-tour").onclick = () => ArtiTutorial.open("role");
      }),
  );
}
