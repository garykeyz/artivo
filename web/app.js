document.addEventListener(
  "error",
  (e) => {
    if (
      e.target.tagName === "IMG" &&
      !e.target.src.endsWith("/artist-placeholder.svg")
    )
      e.target.src = "artist-placeholder.svg";
  },
  true,
);
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const money = (n) => "RD$ " + Number(n || 0).toLocaleString("es-DO");
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santo_Domingo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const asDate = (s) =>
  new Date(
    s.includes(" ")
      ? s.replace(" ", "T") + "Z"
      : /Z$|[+-]\d\d:\d\d$/.test(s)
        ? s
        : s + "-04:00",
  );
const dateStr = (s) =>
  asDate(s).toLocaleDateString("es-DO", {
    timeZone: "America/Santo_Domingo",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const timeStr = (s) =>
  asDate(s).toLocaleTimeString("es-DO", {
    timeZone: "America/Santo_Domingo",
    hour: "numeric",
    minute: "2-digit",
  });
const icons = {
  home: '<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5z"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18"/>',
  chat: '<path d="M21 11a8 8 0 0 1-8 8H6l-4 3V11a9 9 0 0 1 19 0Z"/><path d="M7 10h10M7 14h6"/>',
  wallet:
    '<path d="M3 7V5a2 2 0 0 1 2-2h13v4M3 7h16a2 2 0 0 1 2 2v10H5a2 2 0 0 1-2-2z"/><path d="M21 11h-6v5h6m-3-2.5h.01"/>',
  heart:
    '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  users:
    '<circle cx="9" cy="8" r="3"/><path d="M2 21v-3a7 7 0 0 1 14 0v3M17 5a3 3 0 0 1 0 6m2 3a6 6 0 0 1 3 5v2"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  logout: '<path d="M9 3H3v18h6m5-16 7 7-7 7m-6-7h13"/>',
  music:
    '<path d="M9 18V5l12-2v13M9 8l12-2"/><ellipse cx="5" cy="18" rx="4" ry="3"/><ellipse cx="17" cy="16" rx="4" ry="3"/>',
  disc: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="M7 7a7 7 0 0 1 5-2m0 14a7 7 0 0 0 5-2"/>',
  piano:
    '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M7 5v8h3V5m4 0v8h3V5M8 13v7m8-7v7"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2m-7 9v4m-4 0h8"/>',
  guitar:
    '<path d="m14 10 6-7 2 2-7 7m-6-3c-2-1-4 0-4 2s-2 2-3 4c-1 3 3 7 6 6 2-1 2-3 4-3s3-2 2-4z"/><circle cx="8" cy="15" r="2"/>',
  shield:
    '<path d="M12 2 3 6v7c0 5 9 9 9 9s9-4 9-9V6z"/><path d="m8 12 3 3 5-6"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-7z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
};
icons.more =
  '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>';
icons.bookmark = '<path d="M6 3h12v18l-6-4-6 4z"/>';
icons.send = '<path d="m22 2-7 20-4-9-9-4zM11 13 22 2"/>';
const icon = (n) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[n] || icons.music}</svg>`;
const brand = () =>
  '<div class="brand"><span class="brand-mark">a</span><span class="brand-name">ARTIVO</span></div>';
const state = {
  user: null,
  boot: null,
  page: "discover",
  artists: [],
  bookings: [],
  category: "",
  q: "",
  city: "",
  active: false,
  favorites: false,
  bookingFilter: "all",
  chatId: null,
  auth: "login",
  resetToken: null,
  month: new Date(today() + "T12:00:00"),
  renderVersion: 0,
};
async function api(path, data) {
  if (window.ARTIVO_STATIC_DEMO) return window.ArtivoDemo.request(path, data);
  const r = await fetch(path, {
    method: data === undefined ? "GET" : "POST",
    headers: data === undefined ? {} : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  let result;
  try {
    result = await r.json();
  } catch {
    throw Error("No se pudo conectar con ARTIVO.");
  }
  if (!r.ok) {
    if (r.status === 401 && state.user) {
      state.user = null;
      renderAuth();
    }
    throw Error(result.error || "No se pudo completar la operación.");
  }
  return result;
}
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $("#toast").classList.remove("show"), 3500);
}
function empty(title, description, i = "compass") {
  return `<div class="empty">${icon(i)}<h3>${esc(title)}</h3><p>${esc(description)}</p></div>`;
}
function field(label, name, type = "text", value = "", extra = "") {
  return `<div class="field"><label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" value="${esc(value)}" ${extra}></div>`;
}
function select(label, name, options, value = "", extra = "") {
  return `<div class="field"><label for="${name}">${label}</label><select id="${name}" name="${name}" ${extra}>${options.map((o) => `<option value="${esc(o.value)}" ${String(value) === String(o.value) ? "selected" : ""}>${esc(o.label)}</option>`).join("")}</select></div>`;
}
function formData(form) {
  return Object.fromEntries(new FormData(form));
}
function modal(title, subtitle, body, wide = false) {
  $("#modal-root").innerHTML =
    `<div class="modal-overlay"><section class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-head"><div><h2>${title}</h2><p>${subtitle}</p></div><button class="close" aria-label="Cerrar">×</button></div>${body}</section></div>`;
  $(".close").onclick = closeModal;
  $(".modal-overlay").onclick = (e) => {
    if (e.target.classList.contains("modal-overlay")) closeModal();
  };
  modal.previous = document.activeElement;
  setTimeout(() => $(".modal input,.modal button")?.focus(), 0);
}
function closeModal() {
  $("#modal-root").innerHTML = "";
  modal.previous?.focus();
}
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
  if (e.key === "Tab" && $(".modal")) {
    const list = [
      ...$(".modal").querySelectorAll("button,input,select,textarea,a[href]"),
    ].filter((x) => !x.disabled);
    if (e.shiftKey && document.activeElement === list[0]) {
      e.preventDefault();
      list.at(-1)?.focus();
    } else if (!e.shiftKey && document.activeElement === list.at(-1)) {
      e.preventDefault();
      list[0]?.focus();
    }
  }
});
function bindForm(selector, fn) {
  $(selector).onsubmit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget,
      button = form.querySelector('[type="submit"]'),
      error = form.querySelector(".error");
    button.disabled = true;
    if (error) error.textContent = "";
    try {
      await fn(formData(form), form);
    } catch (err) {
      if (error) error.textContent = err.message;
      else toast(err.message);
    } finally {
      button.disabled = false;
    }
  };
}
function renderAuth() {
  if (window.ARTIVO_STATIC_DEMO) {
    renderDemoWelcome();
    return;
  }
  state.renderVersion++;
  const register = state.auth === "register",
    recover = state.auth === "recover",
    reset = state.auth === "reset";
  $("#app").innerHTML =
    `<main class="auth-layout"><section class="auth-story">${brand()}<div class="auth-story-content"><div class="eyebrow">TALENTO ACTIVO. BAJO DEMANDA.</div><h1>Los mejores momentos<br>tienen <span>talento.</span></h1><p>Encuentra a ese artista que convierte tu evento en una experiencia inolvidable. O haz de tu talento tu próximo trabajo.</p></div></section><section class="auth-form-wrap"><div class="auth-form"><div class="auth-tabs"><button data-auth="login" class="${!register ? "active" : ""}">Iniciar sesión</button><button data-auth="register" class="${register ? "active" : ""}">Crear cuenta</button></div><h2>${register ? "Tu próxima oportunidad." : recover ? "Recupera tu cuenta." : reset ? "Una nueva contraseña." : "Qué bueno verte."}</h2><p>${register ? "Tu talento y tus eventos, en un solo lugar." : recover ? "Introduce el correo con el que creaste tu cuenta." : reset ? "Elige una contraseña de al menos 8 caracteres." : "Entra a ARTIVO y haz que algo increíble suceda."}</p><form id="auth-form">${register ? field("Nombre o empresa", "name", "text", "", 'required maxlength="80" autocomplete="name"') : ""}${!reset ? field("Correo electrónico", "email", "email", "", 'required autocomplete="email"') : ""}${!recover ? field("Contraseña", "password", "password", "", 'required minlength="8" maxlength="256" autocomplete="' + (register || reset ? "new-password" : "current-password") + '"') : ""}${
      register
        ? select("Quiero usar ARTIVO como", "role", [
            { value: "CLIENT", label: "Cliente · Quiero contratar talento" },
            { value: "ARTIST", label: "Artista · Quiero recibir reservas" },
            { value: "BUSINESS", label: "Business · Contrato para mi empresa" },
          ])
        : ""
    }${!register && !recover && !reset ? '<div class="auth-links"><small>Tu próxima experiencia empieza aquí.</small><button type="button" id="recover-link">Olvidé mi contraseña</button></div>' : ""}<p class="error" role="alert"></p><button class="btn" type="submit">${register ? "Crear mi cuenta" : recover ? "Recuperar acceso" : reset ? "Actualizar contraseña" : "Entrar a ARTIVO"} ${icon("arrow")}</button></form>${state.boot?.demo !== false ? `<div class="demo-options"><small>ELIGE TU VISTA DE DEMOSTRACIÓN</small><div class="demo-buttons"><button data-demo="cliente">Cliente</button><button data-demo="gary">Músico</button><button data-demo="business">Business</button><button data-demo="admin">Admin</button></div><p class="legal">${state.boot?.static_demo ? "Datos en este navegador" : "Datos persistentes"} · Pagos de prueba</p></div>` : ""}</div></section></main>`;
  $$("[data-auth]").forEach(
    (b) =>
      (b.onclick = () => {
        state.auth = b.dataset.auth;
        renderAuth();
      }),
  );
  $("#recover-link")?.addEventListener("click", () => {
    state.auth = "recover";
    renderAuth();
  });
  bindForm("#auth-form", async (d) => {
    if (recover) {
      const r = await api("/api/auth/recover", d);
      if (r.demo_reset_token) {
        state.resetToken = r.demo_reset_token;
        state.auth = "reset";
        renderAuth();
        toast("Modo local: enlace de recuperación abierto.");
      } else toast(r.message);
      return;
    }
    if (reset) {
      const r = await api("/api/auth/reset", { ...d, token: state.resetToken });
      state.auth = "login";
      renderAuth();
      toast(r.message);
      return;
    }
    state.user = await api("/api/auth/" + (register ? "register" : "login"), d);
    await startSession();
  });
  $$("[data-demo]").forEach(
    (b) =>
      (b.onclick = async () => {
        b.disabled = true;
        try {
          state.user = await api("/api/auth/login", {
            email: b.dataset.demo + "@artivo.demo",
            password: "Artivo2026!",
          });
          await startSession();
        } catch (e) {
          toast(e.message);
          b.disabled = false;
        }
      }),
  );
}
async function startSession() {
  state.boot = await api("/api/bootstrap");
  state.user = state.boot.user;
  state.category = "";
  state.q = "";
  state.city = "";
  state.active = false;
  state.favorites = false;
  state.bookings = [];
  state.chatId = null;
  feedState.mode = "all";
  state.page =
    state.user.role === "ARTIST"
      ? "dashboard"
      : state.user.role === "ADMIN"
        ? "admin"
        : "feed";
  await render();
}
function navItems() {
  const artist = state.user.role === "ARTIST",
    admin = state.user.role === "ADMIN";
  return admin
    ? [
        ["admin", "shield", "Administración"],
        ["bookings", "calendar", "Reservas"],
        ["profile", "user", "Mi cuenta"],
      ]
    : [
        ["feed", "home", "Inicio · Feed"],
        ...(artist ? [["dashboard", "grid", "Mi actividad"]] : []),
        ["discover", "compass", "Buscar artistas"],
        ["bookings", "calendar", artist ? "Mis reservas" : "Mis eventos"],
        ["messages", "chat", "Mensajes"],
        ...(artist
          ? [
              ["calendar", "calendar", "Mi agenda"],
              ["wallet", "wallet", "Mi cartera"],
            ]
          : [["favorites", "heart", "Favoritos"]]),
        ["profile", "user", "Mi perfil"],
      ];
}
function mobileNav() {
  const ids =
    state.user.role === "ARTIST"
      ? ["dashboard", "feed", "bookings", "wallet", "profile"]
      : state.user.role === "ADMIN"
        ? ["admin", "bookings", "profile"]
        : ["feed", "discover", "bookings", "messages", "profile"];
  const labels = {
    dashboard: "Actividad",
    feed: state.user.role === "ARTIST" ? "Feed" : "Inicio",
    discover: "Buscar",
    bookings: "Reservas",
    calendar: "Agenda",
    wallet: "Cartera",
    profile: "Perfil",
  };
  return ids
    .map((id) => navItems().find((n) => n[0] === id))
    .filter(Boolean)
    .map(
      ([id, i, label]) =>
        `<button data-nav="${id}" class="${id === state.page ? "active" : ""}">${icon(i)}${labels[id] || label}</button>`,
    )
    .join("");
}
function viewSwitcher() {
  if (!state.boot.demo || !state.user.email.endsWith("@artivo.demo")) return "";
  return `<div class="view-switch" role="group" aria-label="Vista de demostración"><button data-view="cliente" class="${state.user.role === "CLIENT" ? "active" : ""}">${icon("user")}<span>Cliente</span></button><button data-view="musico" class="${state.user.role === "ARTIST" ? "active" : ""}">${icon("music")}<span>Músico</span></button></div>`;
}
async function switchView(view) {
  closeModal();
  try {
    $$("[data-view]").forEach((b) => (b.disabled = true));
    state.user = await api("/api/auth/login", {
      email: (view === "musico" ? "gary" : "cliente") + "@artivo.demo",
      password: "Artivo2026!",
    });
    const u = new URL(location.href);
    u.search = "?view=" + view;
    history.replaceState(null, "", u);
    await startSession();
  } catch (e) {
    toast(e.message);
    $$("[data-view]").forEach((b) => (b.disabled = false));
  }
}
function shell() {
  const nav = navItems(),
    item = nav.find((n) => n[0] === state.page) || nav[0];
  $("#app").innerHTML =
    `<aside class="sidebar">${brand()}<div class="tagline">TALENTO EN MOVIMIENTO</div><div class="nav-label">TU ESPACIO</div><nav class="nav">${nav.map(([id, i, label]) => `<button data-nav="${id}" class="${id === state.page ? "active" : ""}">${icon(i)}<span>${label}</span></button>`).join("")}</nav><div class="sidebar-bottom"><div class="pro-card">${icon("bolt")}<h4>${state.user.role === "ARTIST" ? "Tu talento, más lejos." : "Haz que sea inolvidable."}</h4><p>${state.user.role === "ARTIST" ? "Activa tu perfil y conecta con nuevas oportunidades." : "El artista perfecto para cada uno de tus momentos."}</p><button data-nav="${state.user.role === "ARTIST" ? "profile" : "discover"}">${state.user.role === "ARTIST" ? "Completar mi perfil" : "Explorar artistas"} ↗</button></div><div class="account"><div class="avatar">${esc(
      state.user.name
        .split(" ")
        .map((x) => x[0])
        .slice(0, 2)
        .join(""),
    )}</div><div><strong>${esc(state.user.name)}</strong><small>${{ ARTIST: "Cuenta artista", CLIENT: "Cuenta cliente", BUSINESS: "ARTIVO Business", ADMIN: "Administrador" }[state.user.role]}</small></div><button id="logout" title="Cerrar sesión">${icon("logout")}</button></div></div></aside><div class="workspace"><header class="topbar"><div class="breadcrumb">Tu espacio <span>/</span> <b>${item[2]}</b></div><div class="mobile-brand">${brand()}</div><div class="top-actions">${viewSwitcher()}<span class="location">${icon("pin")} República Dominicana</span><button class="icon-btn" data-nav="${state.user.role === "ADMIN" ? "admin" : "messages"}" title="${state.user.role === "ADMIN" ? "Administración" : "Abrir mensajes"}">${icon(state.user.role === "ADMIN" ? "shield" : "chat")}</button><button class="icon-btn" data-nav="profile" title="Abrir perfil"><span class="avatar">${esc(state.user.name[0])}</span></button></div></header><main id="content" class="content"><div class="loading">Preparando tu espacio…</div></main></div><nav class="mobile-menu">${mobileNav()}</nav>${state.boot.static_demo ? '<div class="demo-banner"><span class="dot"></span>Demo · datos en este navegador <button class="text-btn" id="demo-info">Cómo funciona</button></div>' : ""}`;
  $$("[data-nav]").forEach((b) => (b.onclick = () => navigate(b.dataset.nav)));
  $$("[data-view]").forEach(
    (b) => (b.onclick = () => switchView(b.dataset.view)),
  );
  $("#demo-info")?.addEventListener("click", demoInfo);
  $("#logout").onclick = async () => {
    await api("/api/auth/logout", {});
    state.user = null;
    state.auth = "login";
    closeModal();
    renderAuth();
  };
}
async function navigate(page) {
  state.page = page;
  state.favorites = page === "favorites";
  closeModal();
  await render();
  window.scrollTo(0, 0);
}
async function render() {
  const version = ++state.renderVersion;
  shell();
  try {
    if (state.page === "feed") {
      await loadFeed(version);
    } else if (state.page === "discover" || state.page === "favorites") {
      await loadArtists();
      if (version !== state.renderVersion) return;
      renderDiscover();
    } else if (state.page === "profile") {
      renderProfile();
    } else if (state.page === "wallet") {
      const w = await api("/api/wallet");
      if (version !== state.renderVersion) return;
      renderWallet(w);
    } else if (state.page === "admin") {
      const a = await api("/api/admin");
      if (version !== state.renderVersion) return;
      renderAdmin(a);
    } else {
      state.bookings = await api("/api/bookings");
      if (version !== state.renderVersion) return;
      if (state.page === "bookings") renderBookings();
      else if (state.page === "messages") await renderMessages();
      else if (state.page === "calendar") {
        const slots = await api("/api/availability");
        if (version === state.renderVersion) renderCalendar(slots);
      } else await renderDashboard();
    }
  } catch (e) {
    if (version === state.renderVersion && $("#content"))
      $("#content").innerHTML = empty(
        "No pudimos cargar esta pantalla",
        e.message,
      );
  }
}
async function loadArtists() {
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  if (state.category) p.set("category", state.category);
  if (state.city) p.set("city", state.city);
  if (state.active) p.set("active", "1");
  state.artists = await api("/api/artists?" + p);
}
function head(title, subtitle, button = "") {
  return `<div class="page-head"><div><div class="eyebrow">TU TALENTO. TU MOMENTO.</div><h1>${title}</h1><p>${subtitle}</p></div>${button}</div>`;
}
function card(a) {
  return `<article class="artist-card"><div class="card-image"><img src="${esc(a.photo || "")}" alt="${esc(a.stage_name)}" loading="lazy"><span class="status-pill"><span class="dot"></span>${a.active ? "Disponible" : "Agenda bajo consulta"}</span>${state.user.role === "CLIENT" || state.user.role === "BUSINESS" ? `<button class="save-btn ${a.favorite ? "saved" : ""}" data-save="${a.user_id}" title="${a.favorite ? "Quitar de favoritos" : "Guardar artista"}">${icon("heart")}</button>` : ""}<span class="card-category">${icon(a.icon)} ${esc(a.category)}</span></div><div class="card-body"><div class="card-title"><h3>${esc(a.stage_name)} ${a.verified ? '<span class="verified" title="Identidad verificada">✓</span>' : ""}</h3><span class="rating"><span class="star">★</span> ${a.rating || "Nuevo"}${a.review_count ? " (" + a.review_count + ")" : ""}</span></div><div class="card-location">${icon("pin")} ${esc(a.city)}</div><div class="tags">${a.genres
    .split("·")
    .slice(0, 3)
    .map((t) => `<span class="tag">${esc(t.trim())}</span>`)
    .join(
      "",
    )}</div><div class="card-footer"><div class="price"><small>Desde</small><strong>${money(a.rate)}</strong> <span>/ evento</span></div><button class="btn light" data-artist="${a.user_id}">Ver perfil ${icon("arrow")}</button></div></div></article>`;
}
function renderDiscover() {
  const artists = state.favorites
    ? state.artists.filter((a) => a.favorite)
    : state.artists;
  $("#content").innerHTML =
    `${head(state.favorites ? "Tu selección de talento." : "Un artista. Mil posibilidades.", state.favorites ? "Tus favoritos, listos para tu próximo evento." : "Encuentra el talento que hace único tu próximo evento.")} ${!state.favorites ? `<section class="hero"><div class="hero-photo"></div><div class="hero-copy"><div class="eyebrow"><span class="dot"></span> EL MOMENTO ES AHORA</div><h2>Tu próximo evento<br>merece <span>algo increíble.</span></h2><p>Conecta con artistas locales. Encuentra tu estilo.<br>Reserva talento y deja que la magia suceda.</p><button class="btn lime" id="hero-search">Encuentra tu artista ${icon("arrow")}</button></div><div class="hero-badge"><div class="avatar">${icon("music")}</div><div><strong>Talento que se siente.</strong><small>De la primera nota al último aplauso.</small></div></div></section>` : ""}<form id="search-form" class="search-box"><div class="search-field"><label for="query">¿QUÉ TALENTO BUSCAS?</label><input id="query" name="q" placeholder="Artista, instrumento o estilo…" value="${esc(state.q)}"></div><div class="search-field"><label for="city-search">UBICACIÓN</label><select id="city-search" name="city"><option value="">Todas las ciudades</option>${state.boot.cities.map((c) => `<option ${state.city === c.name ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div><div class="search-field"><label for="category-search">CATEGORÍA</label><select id="category-search" name="category"><option value="">Cualquier talento</option>${state.boot.categories.map((c) => `<option value="${c.id}" ${String(c.id) === state.category ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div><button class="btn" type="submit">${icon("search")} Buscar</button></form><div class="categories"><button class="category ${!state.category ? "active" : ""}" data-category="">${icon("grid")} Todos</button>${state.boot.categories.map((c) => `<button class="category ${state.category === String(c.id) ? "active" : ""}" data-category="${c.id}">${icon(c.icon)} ${esc(c.name === "DJ" ? "DJs" : c.name + "s")}</button>`).join("")}</div><div class="section-head"><div><h2>${state.favorites ? "Artistas que te encantan" : "Talento para tu próximo momento"}</h2><p>${artists.length} artistas · Ordenados por relevancia</p></div><div class="controls"><label class="toggle"><input type="checkbox" id="active-filter" ${state.active ? "checked" : ""}> Disponibles ahora</label><button class="text-btn" id="advanced">Más filtros ↗</button></div></div><div class="artists-grid">${artists.map(card).join("")}</div>${!artists.length ? empty("Todavía no hay artistas aquí", state.favorites ? "Guarda artistas con el corazón para encontrarlos aquí." : "Prueba otra categoría, ciudad o término de búsqueda.") : ""}<div class="how-strip"><div><h3>Un gran evento empieza con una buena conexión.</h3><p>Del descubrimiento al aplauso, estamos contigo.</p></div><div class="how-steps"><span><b>1</b> Descubre</span><span><b>2</b> Solicita</span><span><b>3</b> Disfruta</span></div></div>${state.boot.demo ? '<p class="demo-foot">ARTIVO · Perfiles de demostración · Pagos de prueba</p>' : ""}`;
  $("#search-form").onsubmit = async (e) => {
    e.preventDefault();
    const d = formData(e.currentTarget);
    Object.assign(state, { q: d.q, city: d.city, category: d.category });
    await refreshArtists();
  };
  $$("[data-category]").forEach(
    (b) =>
      (b.onclick = async () => {
        state.category = b.dataset.category;
        await refreshArtists();
      }),
  );
  $("#active-filter").onchange = async (e) => {
    state.active = e.target.checked;
    await refreshArtists();
  };
  $("#hero-search")?.addEventListener("click", () => {
    $("#query").focus();
    $("#search-form").scrollIntoView({ behavior: "smooth", block: "center" });
  });
  $("#advanced").onclick = advancedFilters;
  bindArtistCards();
}
async function refreshArtists() {
  try {
    await loadArtists();
    renderDiscover();
  } catch (e) {
    toast(e.message);
  }
}
function bindArtistCards() {
  $$("[data-artist]").forEach(
    (b) => (b.onclick = () => openArtist(b.dataset.artist)),
  );
  $$("[data-save]").forEach(
    (b) =>
      (b.onclick = async () => {
        try {
          await api("/api/favorites", { artist_id: Number(b.dataset.save) });
          await refreshArtists();
        } catch (e) {
          toast(e.message);
        }
      }),
  );
}
function advancedFilters() {
  modal(
    "Encuentra tu match",
    "Filtra por presupuesto y disponibilidad para tu evento.",
    `<form id="advanced-form"><div class="form-grid">${field("Presupuesto máximo (RD$)", "budget", "number", "", 'min="500" max="1000000"')}${field("Inicio del evento", "start", "datetime-local")}${field("Fin del evento", "end", "datetime-local")}</div><p class="error"></p><div class="form-actions"><button class="btn" type="submit">Ver artistas compatibles</button></div></form>`,
  );
  bindForm("#advanced-form", async (d) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(d)) if (v) p.set(k, v);
    if (state.category) p.set("category", state.category);
    if (state.city) p.set("city", state.city);
    if (state.q) p.set("q", state.q);
    if (state.active) p.set("active", "1");
    state.artists = await api("/api/artists?" + p);
    closeModal();
    renderDiscover();
    toast("Resultados filtrados por horario y presupuesto.");
  });
}
async function openArtist(id) {
  try {
    const a = await api("/api/artists/" + id);
    modal(
      esc(a.stage_name),
      `${esc(a.category)} · ${esc(a.city)}`,
      `<div class="profile-cover"><img src="${esc(a.photo)}" alt="${esc(a.stage_name)}"></div><div class="profile-head"><div><span class="badge">${a.active ? "Disponible para solicitudes" : "No recibe solicitudes ahora"}</span><p class="profile-text"><span class="star">★</span> ${a.rating || "Sin reseñas aún"} · ${a.completed} servicios completados</p></div><strong>${money(a.rate)}<small> / evento</small></strong></div><p class="profile-text">${esc(a.bio)}</p><div class="tags">${a.genres
        .split("·")
        .map((t) => `<span class="tag">${esc(t)}</span>`)
        .join(
          "",
        )}</div><div class="detail-grid"><div><small>EQUIPO INCLUIDO</small><strong>${esc(a.equipment || "Consultar con el artista")}</strong></div><div><small>ZONA DE SERVICIO</small><strong>${esc(a.city)} · Radio de ${a.radius} km</strong></div></div>${a.media_url ? `<p><a class="btn light" href="${esc(a.media_url)}" target="_blank" rel="noopener">Ver presentación ↗</a></p>` : ""}<div class="section-head"><h3>Disponibilidad publicada</h3></div>${
        a.availability.length
          ? a.availability
              .slice(0, 8)
              .map(
                (s) =>
                  `<div class="availability-item"><span>${dateStr(s.start)} ${timeStr(s.start)} → ${dateStr(s.end)} ${timeStr(s.end)}</span><span class="badge ${s.kind === "BLOCKED" ? "red" : ""}">${s.kind === "AVAILABLE" ? "Disponible" : "Bloqueado"}</span></div>`,
              )
              .join("")
          : '<p class="muted">El artista aún no ha publicado horarios.</p>'
      }<div class="section-head"><h3>Lo que dicen sus clientes</h3></div>${a.reviews.length ? a.reviews.map((r) => `<div class="review"><strong>${esc(r.name)}</strong> <span class="star">${"★".repeat(r.rating)}</span><p>${esc(r.comment)}</p></div>`).join("") : '<p class="muted">Sé parte de sus primeras experiencias en ARTIVO.</p>'}<div class="form-actions"><button class="text-btn" id="report-artist">Reportar perfil</button>${["CLIENT", "BUSINESS"].includes(state.user.role) ? `<button class="btn" id="book-artist" ${a.active ? "" : "disabled"}>Solicitar artista ${icon("arrow")}</button>` : ""}</div>`,
      true,
    );
    $("#book-artist")?.addEventListener("click", () => requestArtist(a));
    $("#report-artist").onclick = () => reportForm("ARTIST", a.user_id);
  } catch (e) {
    toast(e.message);
  }
}
function requestArtist(a) {
  const day = new Date(today() + "T12:00:00");
  day.setDate(day.getDate() + 2);
  const date = day.toISOString().slice(0, 10);
  modal(
    "Un gran momento empieza aquí.",
    `Solicita a ${esc(a.stage_name)} · ${esc(a.category)}`,
    `<form id="request-form"><div class="form-grid">${field("Nombre del evento", "title", "text", "", 'required maxlength="120" placeholder="Cena en Casa Tropical"')}${field("Presupuesto del servicio (RD$)", "amount", "number", a.rate, 'required min="500" max="1000000"')}${field("Inicio", "start", "datetime-local", date + "T20:00", "required")}${field("Fin", "end", "datetime-local", date + "T23:00", "required")}${field("Ciudad", "city", "text", a.city, "required readonly")}${field("Lugar del evento", "location", "text", "", 'required maxlength="200" placeholder="Nombre del local y dirección"')}<div class="field full"><label for="description">Cuéntale sobre tu evento</label><textarea id="description" name="description" maxlength="2000" placeholder="Estilo musical, público y requerimientos…"></textarea></div></div><div class="summary"><div class="line"><span>Precio propuesto</span><strong id="request-total">${money(a.rate)}</strong></div><small>El artista acepta o propone otra tarifa. Pagas después de su aceptación. La comisión del ${state.boot.commission_bps / 100}% se descuenta del ingreso del artista.</small></div><p class="error"></p><div class="form-actions"><button class="btn" type="submit">Enviar solicitud ${icon("arrow")}</button></div></form>`,
  );
  $("#amount").oninput = (e) =>
    ($("#request-total").textContent = money(e.target.value));
  bindForm("#request-form", async (d) => {
    const b = await api("/api/bookings", {
      ...d,
      amount: Number(d.amount),
      artist_id: a.user_id,
    });
    closeModal();
    await navigate("bookings");
    toast("Solicitud enviada. El artista ya puede responder.");
    openBooking(b.id);
  });
}
const statuses = {
  PENDING: "Solicitud pendiente",
  COUNTER_OFFER: "Contraoferta",
  PAYMENT_PENDING: "Pendiente de pago",
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "En curso",
  COMPLETED: "Completado",
  PAID_OUT: "Completado · Pagado",
  CANCELLED: "Cancelado",
  DISPUTED: "En disputa",
  REFUNDED: "Reembolsado",
};
function badge(b) {
  return `<span class="badge ${["PENDING", "COUNTER_OFFER", "PAYMENT_PENDING"].includes(b.status) ? "pending" : ["CANCELLED", "DISPUTED", "REFUNDED"].includes(b.status) ? "red" : ""}">${statuses[b.status] || b.status}</span>`;
}
function bookingRow(b) {
  return `<div class="booking-row"><img class="booking-thumb" src="${esc(b.photo)}" alt=""><div class="booking-info"><h3>${esc(b.title)}</h3><p>${esc(state.user.role === "ARTIST" ? b.client_name : b.artist_name)} · ${dateStr(b.start)} · ${timeStr(b.start)}</p>${badge(b)}</div><div class="booking-right"><strong>${money(b.amount)}</strong><button class="btn light small" data-booking="${b.id}">Ver detalles ${icon("arrow")}</button></div></div>`;
}
function bindBookings() {
  $$("[data-booking]").forEach(
    (b) => (b.onclick = () => openBooking(b.dataset.booking)),
  );
}
function renderBookings() {
  const filters = [
    ["all", "Todas"],
    ["pending", "Solicitudes"],
    ["upcoming", "Próximas"],
    ["completed", "Completadas"],
    ["cancelled", "Canceladas"],
  ];
  const filtered = state.bookings.filter(
    (b) =>
      state.bookingFilter === "all" ||
      (state.bookingFilter === "pending" &&
        ["PENDING", "COUNTER_OFFER", "PAYMENT_PENDING"].includes(b.status)) ||
      (state.bookingFilter === "upcoming" &&
        ["CONFIRMED", "IN_PROGRESS"].includes(b.status)) ||
      (state.bookingFilter === "completed" && b.status === "PAID_OUT") ||
      (state.bookingFilter === "cancelled" &&
        ["CANCELLED", "REFUNDED", "DISPUTED"].includes(b.status)),
  );
  $("#content").innerHTML =
    head(
      state.user.role === "ARTIST"
        ? "Tu próxima gran presentación."
        : "Tus momentos, organizados.",
      "Cada solicitud y cada reserva, en un mismo lugar.",
      ["CLIENT", "BUSINESS"].includes(state.user.role)
        ? '<button class="btn" id="new-booking">' +
            icon("plus") +
            " Nueva reserva</button>"
        : "",
    ) +
    `<div class="filters">${filters.map(([id, l]) => `<button data-filter="${id}" class="${state.bookingFilter === id ? "active" : ""}">${l}</button>`).join("")}</div><div class="panel">${filtered.length ? filtered.map(bookingRow).join("") : empty("Aún no hay reservas en esta vista", "Las solicitudes y sus respuestas aparecerán aquí.", "calendar")}</div>`;
  $$("[data-filter]").forEach(
    (b) =>
      (b.onclick = () => {
        state.bookingFilter = b.dataset.filter;
        renderBookings();
      }),
  );
  $("#new-booking")?.addEventListener("click", () => navigate("discover"));
  bindBookings();
}
async function openBooking(id) {
  try {
    if (!state.bookings.length) state.bookings = await api("/api/bookings");
    const b = state.bookings.find((b) => b.id === Number(id));
    if (!b) throw Error("Reserva no encontrada.");
    const artist = state.user.id === b.artist_id,
      client = state.user.id === b.client_id;
    let actions = "";
    const btn = (action, label, cl = "") =>
      `<button class="btn ${cl}" data-action="${action}">${label}</button>`;
    if (artist && b.status === "PENDING")
      actions +=
        btn("accept", "Aceptar solicitud") +
        btn("counter", "Hacer contraoferta", "light") +
        btn("reject", "Rechazar", "danger");
    if (client && b.status === "COUNTER_OFFER")
      actions += btn("accept_counter", "Aceptar " + money(b.counter_amount));
    if (client && b.status === "PAYMENT_PENDING")
      actions += btn(
        "pay",
        state.boot.demo ? "Confirmar pago de prueba" : "Pagar reserva",
      );
    if (artist && b.status === "CONFIRMED")
      actions += btn("start", "Iniciar servicio");
    if (client && b.status === "IN_PROGRESS")
      actions += btn("complete", "Confirmar servicio completado");
    if (client && b.status === "PAID_OUT" && !b.review_rating)
      actions += btn("review", "Calificar experiencia");
    if (
      (client || artist) &&
      ["PENDING", "COUNTER_OFFER", "PAYMENT_PENDING", "CONFIRMED"].includes(
        b.status,
      )
    )
      actions += btn("cancel", "Cancelar", "danger");
    if ((client || artist) && ["CONFIRMED", "IN_PROGRESS"].includes(b.status))
      actions += btn("dispute", "Abrir disputa", "light");
    if (state.user.role === "ADMIN" && b.status === "DISPUTED")
      actions +=
        btn("resolve_refund", "Resolver: reembolsar", "danger") +
        btn("resolve_release", "Resolver: liberar pago");
    modal(
      "Detalles de tu reserva",
      `Reserva #${b.id} · ${esc(b.title)}`,
      `${badge(b)}<div class="panel"><div class="detail-grid"><div><small>ARTISTA</small><strong>${esc(b.artist_name)}</strong></div><div><small>CLIENTE</small><strong>${esc(b.client_name)}</strong></div><div><small>FECHA Y HORARIO</small><strong>${dateStr(b.start)}<br>${timeStr(b.start)} – ${timeStr(b.end)}</strong></div><div><small>UBICACIÓN DEL EVENTO</small><strong>${esc(b.city)} · ${esc(b.location)}</strong></div></div>${b.description ? `<p class="profile-text">${esc(b.description)}</p>` : ""}</div><div class="summary"><div class="line"><span>Precio del servicio</span><strong>${money(b.amount)}</strong></div>${b.counter_amount && b.status === "COUNTER_OFFER" ? `<div class="line"><span>Contraoferta del artista</span><strong>${money(b.counter_amount)}</strong></div>` : ""}<div class="line"><span>Comisión de plataforma (descontada al artista)</span><span>${money(b.commission)}</span></div><div class="line total"><span>${artist ? "Ingreso neto del artista" : "Total del cliente"}</span><strong>${money(artist ? b.amount - b.commission : b.amount)}</strong></div></div>${state.boot.demo ? '<div class="notice">Modo demostración: los pagos y la liberación de fondos son simulados. Puedes iniciar y completar el servicio antes de su fecha para probar el ciclo.</div>' : ""}<p class="legal">Cancelación gratuita del cliente hasta ${state.boot.free_cancel_hours} horas antes del evento. Las cancelaciones posteriores requieren revisión mediante disputa.</p><div class="actions">${actions}</div><div class="form-actions"><button class="btn light" id="booking-chat">${icon("chat")} Abrir conversación</button></div>`,
    );
    $("#booking-chat").onclick = () => {
      state.chatId = b.id;
      navigate("messages");
    };
    $$("[data-action]").forEach(
      (button) =>
        (button.onclick = async () => {
          const act = button.dataset.action;
          if (act === "counter") {
            return bookingInput(
              b,
              "counter",
              "Proponer una tarifa",
              field(
                "Tu tarifa (RD$)",
                "amount",
                "number",
                b.amount,
                'required min="500" max="1000000"',
              ),
            );
          }
          if (act === "dispute") {
            return bookingInput(
              b,
              "dispute",
              "Cuéntanos qué ocurrió",
              '<div class="field"><label for="reason">Motivo y detalles</label><textarea id="reason" name="reason" required maxlength="2000"></textarea></div>',
            );
          }
          if (act === "review") {
            return reviewForm(b);
          }
          if (act === "cancel" || act.startsWith("resolve_")) {
            modal(
              act === "cancel"
                ? "Cancelar esta reserva"
                : "Resolver la disputa",
              "Revisa el resultado antes de confirmar.",
              `<p class="profile-text">${act === "resolve_release" ? "El ingreso se acreditará a la cartera del artista." : act === "resolve_refund" ? "El pago simulado se devolverá al cliente y el horario quedará libre." : "La reserva se cancelará. Si corresponde, el pago de prueba se reembolsará."}</p><div class="form-actions"><button class="btn danger" id="confirm-action">Confirmar</button></div>`,
            );
            $("#confirm-action").onclick = () => doBookingAction(b, act);
            return;
          }
          await doBookingAction(b, act);
        }),
    );
  } catch (e) {
    toast(e.message);
  }
}
async function doBookingAction(b, action, extra = {}) {
  try {
    await api(`/api/bookings/${b.id}/action`, { action, ...extra });
    state.bookings = await api("/api/bookings");
    closeModal();
    await render();
    toast("Reserva actualizada.");
    await openBooking(b.id);
  } catch (e) {
    toast(e.message);
  }
}
function bookingInput(b, action, title, fields) {
  modal(
    title,
    `Reserva #${b.id} · ${esc(b.title)}`,
    `<form id="booking-input">${fields}<p class="error"></p><div class="form-actions"><button class="btn" type="submit">Enviar</button></div></form>`,
  );
  bindForm("#booking-input", async (d) => {
    await api(`/api/bookings/${b.id}/action`, {
      action,
      ...d,
      amount: d.amount ? Number(d.amount) : undefined,
    });
    state.bookings = await api("/api/bookings");
    closeModal();
    await render();
    await openBooking(b.id);
    toast("Respuesta enviada.");
  });
}
function reviewForm(b) {
  modal(
    "Cada experiencia cuenta.",
    `Califica tu evento con ${esc(b.artist_name)}`,
    `<form id="review-form">${select(
      "Tu calificación",
      "rating",
      [5, 4, 3, 2, 1].map((n) => ({
        value: n,
        label: "★".repeat(n) + " · " + n + "/5",
      })),
      5,
    )}<div class="field"><label for="comment">¿Cómo fue tu experiencia?</label><textarea id="comment" name="comment" required maxlength="1500"></textarea></div><p class="error"></p><div class="form-actions"><button class="btn" type="submit">Publicar reseña</button></div></form>`,
  );
  bindForm("#review-form", async (d) => {
    await api(`/api/bookings/${b.id}/review`, {
      ...d,
      rating: Number(d.rating),
    });
    closeModal();
    await render();
    toast("Tu reseña ya está publicada.");
  });
}
async function renderDashboard() {
  const artist = state.user.role === "ARTIST";
  const upcoming = state.bookings.filter((b) =>
    ["CONFIRMED", "IN_PROGRESS"].includes(b.status),
  );
  const pending = state.bookings.filter((b) =>
    ["PENDING", "COUNTER_OFFER", "PAYMENT_PENDING"].includes(b.status),
  );
  const completed = state.bookings.filter((b) => b.status === "PAID_OUT");
  const w = artist ? await api("/api/wallet") : null;
  $("#content").innerHTML =
    head(
      `Hola, ${esc(state.user.name.split(" ")[0])}.`,
      artist
        ? "Tu talento está en movimiento. Así va tu actividad."
        : "Tu próximo gran evento empieza aquí.",
      `<button class="btn" id="dash-action">${icon(artist ? "bolt" : "plus")} ${artist ? "Gestionar disponibilidad" : "Encontrar un artista"}</button>`,
    ) +
    `<div class="stats-grid"><div class="stat accent"><small>${artist ? "Ganancia real del mes" : "Inversión en experiencias"}</small><strong>${money(artist ? w.month_profit : completed.reduce((s, b) => s + b.amount, 0))}</strong><span class="sub">${artist ? "Ingresos − comisiones − gastos" : "Servicios completados"}</span></div><div class="stat"><small>Próximos eventos</small><strong>${upcoming.length}</strong><span class="sub">Confirmados y en curso</span></div><div class="stat"><small>Solicitudes activas</small><strong>${pending.length}</strong><span class="sub">Tu próxima oportunidad</span></div><div class="stat"><small>Experiencias completadas</small><strong>${completed.length}</strong><span class="sub">Momentos que cuentan</span></div></div><div class="two-col"><div class="panel"><div class="section-head"><h2>En tu radar</h2><button class="text-btn" id="all-bookings">Ver todo ↗</button></div>${[...pending, ...upcoming].slice(0, 5).map(bookingRow).join("") || empty("Tu próxima experiencia te espera", artist ? "Pon tu perfil activo y publica tu disponibilidad." : "Descubre el talento que dará vida a tu próximo evento.", "calendar")}</div><div><div class="panel"><div class="eyebrow">${artist ? "TU ESTADO" : "LA CONEXIÓN PERFECTA"}</div><h2>${artist ? (state.boot.profile?.active ? "Talento activo." : "Es tu momento.") : "¿Qué tienes en mente?"}</h2><p class="profile-text">${artist ? "Tu perfil y tus horarios ayudan a los clientes a encontrarte. Haz que tu próxima presentación empiece aquí." : "Una cena especial, una boda o una noche entre amigos. Hay un artista para cada momento."}</p><button class="btn light" id="dash-profile">${artist ? "Editar mi perfil" : "Explorar talento"} ${icon("arrow")}</button></div>${artist ? `<div class="panel"><small>DINERO DISPONIBLE · SIMULADO</small><h2>${money(w.available)}</h2><p class="profile-text">Pendiente de completar: ${money(w.pending)}</p><button class="text-btn" id="dash-wallet">Ver mi cartera ↗</button></div>` : `<div class="panel"><div class="eyebrow">ASÍ DE SIMPLE</div><p class="profile-text">Descubre un artista. Envía tu solicitud. Recibe su respuesta y confirma tu reserva.</p>${icon("music")}</div>`}</div></div>`;
  $("#dash-action").onclick = () => navigate(artist ? "calendar" : "discover");
  $("#all-bookings").onclick = () => navigate("bookings");
  $("#dash-profile").onclick = () => navigate(artist ? "profile" : "discover");
  $("#dash-wallet")?.addEventListener("click", () => navigate("wallet"));
  bindBookings();
}
function renderProfile() {
  const a = state.boot.profile,
    artist = state.user.role === "ARTIST";
  $("#content").innerHTML =
    head(
      artist ? "Tu talento tiene un lugar." : "Tu cuenta en ARTIVO.",
      artist
        ? "Cuéntale al mundo quién eres y qué haces."
        : "Tus datos y tu espacio, a un clic.",
    ) +
    `<div class="panel"><div class="profile-head"><div><h2>${esc(state.user.name)}</h2><p class="muted">${esc(state.user.email)} · ${esc(state.user.role)}</p></div><button class="btn light" id="profile-logout">Cerrar sesión</button></div></div>${
      artist
        ? `<div class="panel"><form id="profile-form"><div class="section-head"><h2>Perfil profesional</h2><label class="toggle"><input id="profile-active" type="checkbox" ${a?.active ? "checked" : ""}> Recibir solicitudes</label></div><div class="form-grid">${field("Nombre artístico", "stage_name", "text", a?.stage_name || state.user.name, 'required maxlength="80"')}${select(
            "Categoría",
            "category_id",
            state.boot.categories.map((c) => ({ value: c.id, label: c.name })),
            a?.category_id || 1,
          )}${field("Ciudad", "city", "text", a?.city || "", 'required maxlength="80" placeholder="Punta Cana"')}${field("Tarifa desde (RD$ / evento)", "rate", "number", a?.rate || 7000, 'required min="500" max="1000000"')}${field("Radio de servicio (km)", "radius", "number", a?.radius || 25, 'required min="1" max="200"')}${field("Géneros (separados por ·)", "genres", "text", a?.genres || "", 'maxlength="200"')}<div class="field full"><label for="bio">Tu historia</label><textarea id="bio" name="bio" maxlength="1500" placeholder="Qué te hace único…">${esc(a?.bio || "")}</textarea></div>${field("Equipo incluido", "equipment", "text", a?.equipment || "", 'maxlength="500"')}${field("URL de foto (HTTPS)", "photo", "url", a?.photo || "", 'placeholder="https://…"')}${field("URL de video o presentación (HTTPS)", "media_url", "url", a?.media_url || "", 'placeholder="https://…"')}</div><p class="legal">Se publica tu ciudad y tu zona de servicio. Tu dirección privada y tus finanzas no aparecen en el perfil.</p><p class="error"></p><div class="form-actions"><button class="btn" type="submit">Guardar perfil</button></div></form></div>`
        : `<div class="panel"><h2>${state.user.role === "BUSINESS" ? "Tu espacio Business" : "Listo para tu próximo momento"}</h2><p class="profile-text">${state.user.role === "BUSINESS" ? "Gestiona las solicitudes, reservas y conversaciones de tu empresa." : "Encuentra artistas, guarda tus favoritos y organiza tus reservas."}</p><button class="btn" id="profile-discover">Descubrir talento ${icon("arrow")}</button></div>`
    }`;
  $("#profile-logout").onclick = () => $("#logout").click();
  $("#profile-discover")?.addEventListener("click", () => navigate("discover"));
  if (artist)
    bindForm("#profile-form", async (d) => {
      state.boot.profile = await api("/api/profile", {
        ...d,
        rate: Number(d.rate),
        radius: Number(d.radius),
        category_id: Number(d.category_id),
        active: $("#profile-active").checked,
      });
      state.boot = await api("/api/bootstrap");
      toast("Tu perfil está actualizado.");
      renderProfile();
    });
}
function renderWallet(w) {
  const tx = w.transactions;
  const expenseRows = w.expenses;
  const month = new Date(today() + "T12:00:00").toLocaleDateString("es-DO", {
    month: "long",
    year: "numeric",
  });
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(today() + "T12:00:00");
    d.setDate(1);
    d.setMonth(d.getMonth() - 5 + i);
    const key = d.toISOString().slice(0, 7);
    const income = tx
      .filter(
        (t) =>
          t.kind !== "WITHDRAWAL" &&
          new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Santo_Domingo",
            year: "numeric",
            month: "2-digit",
          })
            .format(asDate(t.created_at))
            .startsWith(key),
      )
      .reduce((s, t) => s + t.amount - t.commission, 0);
    return { label: d.toLocaleDateString("es", { month: "short" }), income };
  });
  const max = Math.max(1, ...months.map((m) => m.income));
  const byCat = {};
  expenseRows.forEach(
    (e) => (byCat[e.category] = (byCat[e.category] || 0) + e.amount),
  );
  $("#content").innerHTML =
    head(
      "Tu talento. Tus ganancias.",
      "Una mirada clara a tu dinero, tus gastos y tu ganancia real.",
      `<button class="btn" id="add-expense">${icon("plus")} Registrar gasto</button>`,
    ) +
    `<div class="stats-grid"><div class="stat accent"><small>Balance disponible</small><strong>${money(w.available)}</strong><span class="sub">${state.boot.demo ? "Saldo de prueba · Sin fondos reales" : "Ingresos acreditados"}</span></div><div class="stat"><small>Balance pendiente</small><strong>${money(w.pending)}</strong><span class="sub">Servicios por completar</span></div><div class="stat"><small>Ganancia real del mes</small><strong>${money(w.month_profit)}</strong><span class="sub">${esc(month)}</span></div><div class="stat"><small>Gastos del mes</small><strong>${money(w.month_expenses)}</strong><span class="sub">Cada peso cuenta</span></div></div><div class="two-col"><div class="panel"><div class="section-head"><h2>Ingresos netos</h2><button class="text-btn" id="add-income">+ Ingreso externo</button></div><p class="muted">Después de comisiones · Últimos 6 meses</p><div class="month-chart">${months.map((m) => `<div class="chart-col"><small>${m.income ? money(m.income) : "—"}</small><div class="bar" data-height="${Math.max(2, (m.income / max) * 120)}"></div><small>${m.label}</small></div>`).join("")}</div></div><div class="panel"><h2>Lo que realmente ganaste</h2><div class="breakdown"><span>Ingresos brutos acumulados</span><strong>${money(w.income)}</strong></div><div class="breakdown"><span>Comisiones</span><strong class="negative">− ${money(w.commission)}</strong></div><div class="breakdown"><span>Gastos registrados</span><strong class="negative">− ${money(w.expenses_total)}</strong></div><div class="breakdown"><strong>Ganancia real</strong><strong class="positive">${money(w.profit)}</strong></div><p class="legal">El balance disponible no descuenta gastos externos. La ganancia real sí los descuenta.</p></div></div><div class="panel"><div class="section-head"><h2>Movimientos</h2><small>${tx.length} registros</small></div>${tx.length ? `<div class="table-wrap"><table><thead><tr><th>Concepto</th><th>Fecha</th><th>Ingreso bruto</th><th>Comisión</th><th>Neto</th></tr></thead><tbody>${tx.map((t) => `<tr><td>${esc(t.description)}<br><small>${t.kind === "EXTERNAL" ? "Ingreso externo" : "Reserva #" + t.booking_id}</small></td><td>${dateStr(t.created_at)}</td><td>${money(t.amount)}</td><td>${money(t.commission)}</td><td class="positive">${money(t.amount - t.commission)}</td></tr>`).join("")}</tbody></table></div>` : empty("Tus ingresos aparecerán aquí", "Completa tu primer booking o registra un ingreso externo.", "wallet")}</div><div class="panel"><div class="section-head"><h2>Tus gastos</h2><small>${money(w.expenses_total)} acumulados</small></div>${expenseRows.length ? `<div class="table-wrap"><table><thead><tr><th>Descripción</th><th>Categoría</th><th>Fecha</th><th>Booking</th><th>Monto</th></tr></thead><tbody>${expenseRows.map((e) => `<tr><td>${esc(e.description)}</td><td>${esc(e.category)}</td><td>${dateStr(e.date + "T12:00:00")}</td><td>${e.booking_id ? "#" + e.booking_id : "—"}</td><td class="negative">${money(e.amount)}</td></tr>`).join("")}</tbody></table></div>` : empty("Tu dinero, más claro", "Registra gasolina, transporte o equipo para conocer tu ganancia real.", "wallet")}</div>`;
  $$("[data-height]").forEach(
    (b) => (b.style.height = b.dataset.height + "px"),
  );
  $("#add-expense").onclick = () => expenseForm(w);
  $("#add-income").onclick = incomeForm;
}
async function expenseForm(w) {
  const bookings = await api("/api/bookings");
  modal(
    "Cada gasto cuenta.",
    "Regístralo y conoce tu ganancia real.",
    `<form id="expense-form"><div class="form-grid">${field("Descripción", "description", "text", "", 'required maxlength="200" placeholder="Gasolina para el evento"')}${field("Monto (RD$)", "amount", "number", "", 'required min="1" max="10000000"')}${select(
      "Categoría",
      "category",
      w.expense_categories.map((c) => ({ value: c, label: c })),
    )}${field("Fecha", "date", "date", today(), "required")}${select("Reserva asociada (opcional)", "booking_id", [{ value: "", label: "Sin reserva asociada" }, ...bookings.map((b) => ({ value: b.id, label: "#" + b.id + " · " + b.title }))])}</div><p class="error"></p><div class="form-actions"><button class="btn" type="submit">Guardar gasto</button></div></form>`,
  );
  bindForm("#expense-form", async (d) => {
    await api("/api/expenses", {
      ...d,
      amount: Number(d.amount),
      booking_id: d.booking_id ? Number(d.booking_id) : null,
    });
    closeModal();
    await render();
    toast("Gasto registrado. Tu ganancia está actualizada.");
  });
}
function incomeForm() {
  modal(
    "Tu trabajo también cuenta.",
    "Agrega ingresos de eventos fuera de ARTIVO.",
    `<form id="income-form"><div class="form-grid">${field("Concepto", "description", "text", "", 'required maxlength="200"')}${field("Ingreso (RD$)", "amount", "number", "", 'required min="1" max="10000000"')}</div><p class="legal">Los ingresos externos no tienen comisión de ARTIVO.</p><p class="error"></p><div class="form-actions"><button class="btn" type="submit">Registrar ingreso</button></div></form>`,
  );
  bindForm("#income-form", async (d) => {
    await api("/api/income", { ...d, amount: Number(d.amount) });
    closeModal();
    await render();
    toast("Ingreso externo registrado.");
  });
}
async function renderMessages() {
  const list = state.bookings;
  if (!list.some((b) => b.id === state.chatId)) state.chatId = list[0]?.id;
  const b = list.find((b) => b.id === state.chatId);
  $("#content").innerHTML =
    head(
      "Las buenas conexiones empiezan hablando.",
      "Todos los detalles de tu evento, en una conversación.",
    ) +
    (!b
      ? `<div class="panel">${empty("Todavía no hay conversaciones", "Crea una solicitud para hablar con el artista.", "chat")}</div>`
      : `<div class="chat-shell"><div class="chat-list">${list.map((x) => `<button data-chat="${x.id}" class="${x.id === b.id ? "active" : ""}"><strong>${esc(state.user.role === "ARTIST" ? x.client_name : x.artist_name)}</strong><small>${esc(x.title)} · #${x.id}</small></button>`).join("")}</div><div class="chat-main"><div class="chat-header"><h3>${esc(state.user.role === "ARTIST" ? b.client_name : b.artist_name)}</h3><small>${esc(b.title)} · ${dateStr(b.start)}</small><button class="text-btn" id="refresh-chat">Actualizar ↻</button></div><div id="chat-messages" class="chat-messages"><div class="loading">Cargando conversación…</div></div><form id="chat-form" class="chat-input"><input name="body" id="chat-body" placeholder="Escribe un mensaje…" required maxlength="3000" aria-label="Mensaje"><button type="submit" class="btn">${icon("arrow")}</button></form></div></div>`);
  if (!b) return;
  $$("[data-chat]").forEach(
    (button) =>
      (button.onclick = () => {
        state.chatId = Number(button.dataset.chat);
        renderMessages();
      }),
  );
  $("#refresh-chat").onclick = () => loadMessages(b);
  bindForm("#chat-form", async (d, form) => {
    await api(`/api/bookings/${b.id}/messages`, d);
    form.reset();
    await loadMessages(b);
  });
  await loadMessages(b);
}
async function loadMessages(b) {
  try {
    const messages = await api(`/api/bookings/${b.id}/messages`);
    if (state.page !== "messages" || state.chatId !== b.id) return;
    $("#chat-messages").innerHTML = messages.length
      ? messages
          .map(
            (m) =>
              `<div class="message ${m.sender_id === state.user.id ? "mine" : ""}">${esc(m.body)}<small>${esc(m.name)} · ${timeStr(m.created_at)}</small></div>`,
          )
          .join("")
      : empty(
          "Que empiece la conversación",
          "Comparte los detalles de tu evento.",
          "chat",
        );
    $("#chat-messages").scrollTop = $("#chat-messages").scrollHeight;
  } catch (e) {
    toast(e.message);
  }
}
function renderCalendar(slots) {
  const d = state.month;
  const month = d.toLocaleDateString("es", { month: "long", year: "numeric" });
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const startDay = (first.getDay() + 6) % 7;
  const confirmed = state.bookings.filter((b) =>
    ["PAYMENT_PENDING", "CONFIRMED", "IN_PROGRESS", "DISPUTED"].includes(
      b.status,
    ),
  );
  const cells = Array(startDay).fill('<div class="cal-day blank"></div>');
  for (let day = 1; day <= days; day++) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const events = confirmed.filter(
      (b) => b.start.slice(0, 10) <= key && b.end.slice(0, 10) >= key,
    );
    const blocked = slots.filter(
      (s) =>
        s.kind === "BLOCKED" &&
        s.start.slice(0, 10) <= key &&
        s.end.slice(0, 10) >= key,
    );
    const available = slots.some(
      (s) =>
        s.kind === "AVAILABLE" &&
        s.start.slice(0, 10) <= key &&
        s.end.slice(0, 10) >= key,
    );
    cells.push(
      `<div class="cal-day ${key === today() ? "today" : ""}">${day}${events.map((b) => `<button class="cal-event" data-booking="${b.id}">${esc(b.title)}</button>`).join("")}${blocked.map(() => '<div class="cal-event block">Bloqueado</div>').join("")}${available && !events.length && !blocked.length ? '<div class="cal-event">Disponible</div>' : ""}</div>`,
    );
  }
  $("#content").innerHTML =
    head(
      "Tu tiempo, en armonía.",
      "Publica horarios disponibles o bloquea tus compromisos.",
      `<button class="btn" id="add-slot">${icon("plus")} Gestionar horario</button>`,
    ) +
    `<div class="panel"><div class="section-head"><h2>${month}</h2><div><button class="text-btn" id="prev-month" aria-label="Mes anterior">←</button><button class="text-btn" id="next-month" aria-label="Mes siguiente">→</button></div></div><div class="calendar-grid">${["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"].map((s) => `<div class="cal-label">${s}</div>`).join("")}${cells.join("")}</div><p class="legal">Las reservas aceptadas bloquean automáticamente el horario hasta su cancelación o finalización.</p></div><div class="panel"><h2>Horarios publicados</h2>${slots.map((s) => `<div class="availability-item"><span>${dateStr(s.start)} ${timeStr(s.start)} → ${dateStr(s.end)} ${timeStr(s.end)}</span><span class="badge ${s.kind === "BLOCKED" ? "red" : ""}">${s.kind === "AVAILABLE" ? "Disponible" : "Bloqueado"}</span><button class="text-btn" data-delete-slot="${s.id}">Eliminar</button></div>`).join("") || empty("Define cuándo recibir bookings", "Agrega intervalos disponibles para aparecer en búsquedas por fecha.", "calendar")}</div>`;
  $("#prev-month").onclick = () => {
    state.month = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    renderCalendar(slots);
  };
  $("#next-month").onclick = () => {
    state.month = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    renderCalendar(slots);
  };
  $("#add-slot").onclick = slotForm;
  $$("[data-delete-slot]").forEach(
    (b) =>
      (b.onclick = async () => {
        try {
          await api("/api/availability/delete", {
            id: Number(b.dataset.deleteSlot),
          });
          await render();
          toast("Horario eliminado.");
        } catch (e) {
          toast(e.message);
        }
      }),
  );
  bindBookings();
}
function slotForm() {
  modal(
    "Dale espacio a tu talento.",
    "Disponible para recibir solicitudes o bloqueado para tus compromisos.",
    `<form id="slot-form"><div class="form-grid">${select(
      "Tipo de horario",
      "kind",
      [
        { value: "AVAILABLE", label: "Disponible para eventos" },
        { value: "BLOCKED", label: "Bloqueado · Compromiso personal" },
      ],
    )}${field("Inicio", "start", "datetime-local", today() + "T18:00", "required")}${field("Fin", "end", "datetime-local", today() + "T23:00", "required")}</div><p class="legal">Publica intervalos de 30 minutos a 24 horas. Puedes agregar varios días por separado.</p><p class="error"></p><div class="form-actions"><button class="btn" type="submit">Guardar horario</button></div></form>`,
  );
  bindForm("#slot-form", async (d) => {
    await api("/api/availability", d);
    closeModal();
    await render();
    toast("Agenda actualizada.");
  });
}
function reportForm(kind, id) {
  modal(
    "Reportar contenido",
    "Cuéntanos el motivo para que administración lo revise.",
    `<form id="report-form"><div class="field"><label for="reason">Motivo y detalles</label><textarea id="reason" name="reason" required maxlength="2000"></textarea></div><p class="error"></p><div class="form-actions"><button class="btn" type="submit">Enviar reporte</button></div></form>`,
  );
  bindForm("#report-form", async (d) => {
    await api("/api/reports", {
      ...d,
      target_kind: kind,
      target_id: Number(id),
    });
    closeModal();
    toast("Reporte enviado a administración.");
  });
}
function renderAdmin(a) {
  state.bookings = a.bookings;
  $("#content").innerHTML =
    head(
      "El pulso de ARTIVO.",
      "Gestiona usuarios, reservas, disputas y reglas del marketplace.",
    ) +
    `<div class="stats-grid"><div class="stat accent"><small>GMV completado</small><strong>${money(a.stats.gmv)}</strong><span class="sub">Volumen de servicios pagados</span></div><div class="stat"><small>Comisiones</small><strong>${money(a.stats.revenue)}</strong><span class="sub">Revenue de plataforma</span></div><div class="stat"><small>Usuarios</small><strong>${a.users.length}</strong><span class="sub">${a.users.filter((u) => u.role === "ARTIST").length} artistas</span></div><div class="stat"><small>Reservas</small><strong>${a.stats.bookings}</strong><span class="sub">${a.stats.completed || 0} completadas</span></div></div><div class="panel"><h2>Configuración del marketplace</h2><form id="settings-form"><div class="form-grid">${field("Comisión (puntos básicos: 1000 = 10%)", "commission_bps", "number", state.boot.commission_bps, 'min="0" max="3000" required')}${field("Cancelación gratuita antes de (horas)", "free_cancel_hours", "number", state.boot.free_cancel_hours, 'min="0" max="168" required')}</div><p class="legal">La comisión se aplica a nuevas solicitudes. Las reservas existentes conservan el importe pactado.</p><p class="error"></p><div class="form-actions"><button class="btn" type="submit">Guardar reglas</button></div></form></div><div class="panel"><h2>Usuarios</h2><div class="table-wrap"><table><thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Acción</th></tr></thead><tbody>${a.users.map((u) => `<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td>${u.role}</td><td>${u.suspended ? "Suspendido" : "Activo"}</td><td>${u.role !== "ADMIN" ? `<button class="btn small ${u.suspended ? "light" : "danger"}" data-suspend="${u.id}">${u.suspended ? "Reactivar" : "Suspender"}</button>` : "—"}</td></tr>`).join("")}</tbody></table></div></div><div class="panel"><h2>Disputas y reportes</h2>${a.reports.length ? a.reports.map((r) => `<div class="booking-row"><div class="booking-info"><h3>${r.target_kind === "ARTIST" ? "Perfil de artista #" + r.target_id : r.target_kind === "POST" ? "Publicación #" + r.target_id : "Reserva #" + r.booking_id} · ${esc(r.name)}</h3><p>${esc(r.reason)}</p><span class="badge">${r.status === "OPEN" ? "Abierta" : "Resuelta"}</span></div>${r.booking_id ? `<button class="btn light small" data-booking="${r.booking_id}">Revisar reserva</button>` : r.target_kind === "POST" ? `<button class="btn light small" data-report-post="${r.target_id}">Ver publicación</button>` : `<button class="btn light small" data-report-artist="${r.target_id}">Ver perfil</button>`}${r.status === "OPEN" ? `<button class="text-btn" data-resolve-report="${r.id}">Resolver reporte</button>` : ""}</div>`).join("") : empty("Sin reportes abiertos", "Las disputas de reservas aparecerán aquí.", "shield")}</div><div class="panel"><h2>Reservas de la plataforma</h2>${a.bookings.map(bookingRow).join("") || empty("Aún no hay reservas", "El flujo de contratación aparecerá aquí.", "calendar")}</div><div class="panel"><h2>Registro de operaciones</h2><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Usuario</th><th>Operación</th><th>Entidad</th></tr></thead><tbody>${a.audit.map((r) => `<tr><td>${esc(r.created_at)}</td><td>#${r.user_id}</td><td>${esc(r.action)}</td><td>${r.entity_id ? "#" + r.entity_id : "—"}</td></tr>`).join("")}</tbody></table></div></div>`;
  $$("[data-report-post]").forEach(
    (b) => (b.onclick = () => openReportedPost(b.dataset.reportPost)),
  );
  $$("[data-report-artist]").forEach(
    (b) => (b.onclick = () => openArtist(b.dataset.reportArtist)),
  );
  $$("[data-resolve-report]").forEach(
    (b) =>
      (b.onclick = async () => {
        try {
          await api("/api/admin/report", {
            id: Number(b.dataset.resolveReport),
          });
          await render();
          toast("Reporte resuelto.");
        } catch (e) {
          toast(e.message);
        }
      }),
  );
  bindForm("#settings-form", async (d) => {
    await api("/api/admin/settings", {
      commission_bps: Number(d.commission_bps),
      free_cancel_hours: Number(d.free_cancel_hours),
    });
    state.boot = await api("/api/bootstrap");
    toast("Reglas actualizadas.");
  });
  $$("[data-suspend]").forEach(
    (b) =>
      (b.onclick = async () => {
        try {
          await api("/api/admin/user", { id: Number(b.dataset.suspend) });
          await render();
          toast("Estado de la cuenta actualizado.");
        } catch (e) {
          toast(e.message);
        }
      }),
  );
  bindBookings();
}
(async () => {
  try {
    const r = await api("/api/auth/me");
    state.boot = { demo: r.demo, static_demo: r.static_demo };
    state.user = r.user;
    const view =
      new URLSearchParams(location.search).get("view") ||
      (window.ARTIVO_STATIC_DEMO ? "cliente" : null);
    if (
      r.demo &&
      ["cliente", "musico"].includes(view) &&
      (!state.user || state.user.email.endsWith("@artivo.demo"))
    ) {
      await switchView(view);
      return;
    }
    if (state.user) await startSession();
    else renderAuth();
  } catch (e) {
    $("#app").innerHTML = empty("ARTIVO no está disponible", e.message);
  }
})();
