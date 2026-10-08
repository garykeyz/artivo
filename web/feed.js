/* Hiring-oriented feed. Shares the same API, account and booking flow as the app. */
const feedState = {
  mode: "all",
  posts: [],
  hasMore: false,
  offset: 0,
  artists: [],
};
async function loadFeed(version) {
  const [result, artists, workspace] = await Promise.all([
    api("/api/feed?mode=" + feedState.mode),
    api("/api/artists?active=1"),
    state.boot.static_demo ? api("/api/arti/workspace") : Promise.resolve(null),
  ]);
  if (version !== state.renderVersion) return;
  Object.assign(feedState, {
    posts: result.posts,
    hasMore: result.has_more,
    offset: result.next_offset,
    artists,
    workspace,
  });
  renderFeed();
}
function postCard(p) {
  const own = p.artist_id === state.user.id;
  return `<article class="feed-post" id="post-${p.id}">
    <header class="post-head"><button class="post-author" data-feed-profile="${p.artist_id}"><img src="${esc(p.photo || "artist-placeholder.svg")}" alt=""><span><strong>${esc(p.stage_name)}</strong><small>${esc(p.category)} · ${esc(p.city)}</small></span></button><div class="post-head-actions">${!own ? `<button class="text-btn ${p.following ? "is-following" : ""}" data-post-follow="${p.id}" aria-label="${p.following ? "Dejar de seguir" : "Seguir"} a ${esc(p.stage_name)}">${p.following ? "Siguiendo" : "Seguir"}</button>` : ""}<button class="icon-btn" data-post-report="${p.id}" aria-label="Reportar publicación de ${esc(p.stage_name)}">${icon("more")}</button></div></header>
    <div class="post-media">${p.media_type === "VIDEO" ? `<video src="${esc(p.media_url)}" poster="${esc(p.photo)}" controls playsinline preload="metadata" aria-label="Video de ${esc(p.stage_name)}"></video>` : `<img src="${esc(p.media_url)}" alt="Publicación de ${esc(p.stage_name)}" loading="lazy">`}<span class="post-availability"><span class="dot"></span>${p.active ? "Talento activo" : "Agenda bajo consulta"}</span></div>
    <div class="post-body"><div class="post-actions"><button class="icon-btn ${p.liked ? "is-liked" : ""}" data-post-like="${p.id}" aria-label="${p.liked ? "Quitar me gusta" : "Me gusta"} · publicación ${p.id}" aria-pressed="${!!p.liked}">${icon("heart")}</button><button class="icon-btn" data-post-comments="${p.id}" aria-label="Comentarios · publicación ${p.id}">${icon("chat")}</button><button class="icon-btn" data-post-share="${p.id}" aria-label="Compartir · publicación ${p.id}">${icon("send")}</button><button class="icon-btn post-save ${p.saved ? "is-saved" : ""}" data-post-save="${p.id}" aria-label="${p.saved ? "Quitar de guardados" : "Guardar"} · publicación ${p.id}" aria-pressed="${!!p.saved}">${icon("bookmark")}</button></div>
    <strong class="post-likes">${p.like_count} ${p.like_count === 1 ? "me gusta" : "me gusta"}</strong><p class="post-caption"><b>${esc(p.stage_name)}</b> ${esc(p.caption)}</p><button class="post-comment-link" data-post-comments="${p.id}">${p.comment_count ? "Ver " + p.comment_count + " comentario" + (p.comment_count === 1 ? "" : "s") : "Sé el primero en comentar"}</button><div class="post-book"><span><small>Desde</small> <strong>${money(p.rate)}</strong> <small>/ evento</small></span><button class="btn small ${state.user.role === "ARTIST" ? "light" : ""}" data-feed-profile="${p.artist_id}">${state.user.role === "ARTIST" ? "Ver perfil" : "Contratar"} ${icon("arrow")}</button></div></div></article>`;
}
function renderFeed() {
  const artist = state.user.role === "ARTIST";
  const modeNames = [
    ["all", "Para ti"],
    ["following", "Siguiendo"],
    ["saved", "Guardados"],
    ...(artist ? [["mine", "Mis publicaciones"]] : []),
  ];
  $("#content").innerHTML =
    `${head(artist ? "Tu talento se mueve." : "Descubre tu próximo momento.", artist ? "Comparte lo que haces. Conecta con nuevas oportunidades." : "Música, personas y experiencias que merecen compartirse.", `<button class="btn" id="feed-main-action">${icon(artist ? "plus" : "search")} ${artist ? "Crear publicación" : "Buscar artista"}</button>`)}
  <div class="feed-layout"><div class="feed-main"><section class="talent-stories" aria-label="Artistas activos">${feedState.artists.map((a) => `<button class="talent-story" data-feed-profile="${a.user_id}"><span class="story-ring"><img src="${esc(a.photo || "artist-placeholder.svg")}" alt=""></span><strong>${esc(a.stage_name.split(" ")[0])}</strong><small>${esc(a.category)}</small></button>`).join("")}</section><div class="feed-tabs" role="group" aria-label="Filtro del feed">${modeNames.map(([id, label]) => `<button data-feed-mode="${id}" class="${feedState.mode === id ? "active" : ""}">${label}</button>`).join("")}<span class="feed-label">TALENTO EN VIVO</span></div>${
    state.boot.static_demo
      ? `<section class="arti-feed-demand"><div class="section-head"><h3>La demanda también se mueve.</h3><button id="arti-feed-opportunities" class="text-btn">Ver todas ↗</button></div>${(
          feedState.workspace?.opportunities || []
        )
          .slice(0, 3)
          .map(
            (o) =>
              `<button class="arti-feed-opportunity" data-feed-opp="${o.id}"><span>${icon("calendar")}</span><div><strong>${esc(o.title)}</strong><small>${esc(feedState.workspace.users.find((u) => u.id === o.owner_id)?.name)} · ${o.dates.length} fechas · ${artiCash(o.rate, o.currency)}/evento</small></div>${icon("arrow")}</button>`,
          )
          .join("")}</section>`
      : ""
  }${
    state.boot.static_demo
      ? `<section class="arti-professional-feed"><div class="section-head"><h3>La comunidad profesional</h3><button class="text-btn" id="arti-social-publish">Publicar ↗</button></div>${(
          feedState.workspace?.professional_posts || []
        )
          .slice(0, 3)
          .map(
            (p) =>
              `<article class="panel"><div class="eyebrow">${esc(ArtiDomain.role(feedState.workspace.users.find((u) => u.id === p.owner_id)))}</div><h3>${esc(feedState.workspace.users.find((u) => u.id === p.owner_id)?.name)}</h3><p class="profile-text">${esc(p.body)}</p><div class="arti-event-actions"><button class="text-btn" data-social-like="${p.id}">♡ ${p.likes.length} Me gusta</button><button class="text-btn" data-social-comment="${p.id}">Comentar (${p.comments.length})</button><button class="text-btn" data-social-save="${p.id}">Guardar</button>${["CLIENT", "ENTERPRISE", "LEADER", "AGENCY"].includes(ArtiDomain.role(state.user)) ? `<button class="text-btn" data-social-convert="${p.id}">Convertir en oportunidad ↗</button>` : ""}</div></article>`,
          )
          .join("")}</section>`
      : ""
  }<div id="feed-posts">${feedState.posts.map(postCard).join("") || empty(feedState.mode === "mine" ? "Tu escenario está listo." : "Aquí empieza una buena conexión.", feedState.mode === "following" ? "Sigue artistas para ver sus publicaciones aquí." : feedState.mode === "saved" ? "Guarda las publicaciones que te inspiran." : "Publica una foto o un video de tu talento.", "music")}</div>${feedState.hasMore ? '<button class="btn light feed-more" id="feed-more">Ver más publicaciones</button>' : ""}</div>
  <aside class="feed-aside"><div class="feed-intro"><div class="eyebrow">${artist ? "TU ESPACIO CREATIVO" : "DE LA INSPIRACIÓN AL EVENTO"}</div><h2>${artist ? "Haz que te encuentren." : "El talento está aquí."}</h2><p>${artist ? "Muestra tu música y convierte cada publicación en una nueva oportunidad." : "Encuentra un artista que conecte con tu estilo y haz que tu evento cobre vida."}</p><button class="btn lime" id="feed-side-action">${artist ? "Ver mi actividad" : "Encontrar talento"} ${icon("arrow")}</button></div><div class="feed-suggestions"><div class="section-head"><h3>Talento activo</h3><span class="dot"></span></div>${feedState.artists
    .filter((a) => a.user_id !== state.user.id)
    .slice(0, 4)
    .map(
      (a) =>
        `<div class="suggestion"><img src="${esc(a.photo || "artist-placeholder.svg")}" alt=""><div><strong>${esc(a.stage_name)}</strong><small>${esc(a.category)} · ${esc(a.city)}</small></div><button class="text-btn" data-feed-profile="${a.user_id}">Ver</button></div>`,
    )
    .join(
      "",
    )}</div><p class="feed-footnote">ARTIVO · Talento activo. Bajo demanda.<br>${state.boot.static_demo ? "Demo compartible · Datos en este navegador" : state.boot.demo ? "Experiencia de demostración · Pagos de prueba" : "Tu talento, tu próxima conexión."}</p></aside></div>`;
  $("#arti-feed-opportunities")?.addEventListener("click", () => {
    artiUI.tab = "opportunities";
    navigate("arti");
  });
  $$("[data-feed-opp]").forEach(
    (b) =>
      (b.onclick = async () => {
        artiUI.data = feedState.workspace;
        artiOpportunity(Number(b.dataset.feedOpp));
      }),
  );
  $("#arti-social-publish")?.addEventListener("click", artiSocialForm);
  for (const action of ["like", "save"])
    $$(`[data-social-${action}]`).forEach(
      (b) =>
        (b.onclick = async () => {
          try {
            const r = await api(
              "/api/arti/social/" +
                b.dataset[action === "like" ? "socialLike" : "socialSave"] +
                "/" +
                action,
              {},
            );
            toast(r.message);
            await loadFeed(state.renderVersion);
          } catch (e) {
            toast(e.message);
          }
        }),
    );
  $$("[data-social-comment]").forEach(
    (b) =>
      (b.onclick = () => artiSocialComment(Number(b.dataset.socialComment))),
  );
  $$("[data-social-convert]").forEach(
    (b) =>
      (b.onclick = () => {
        artiUI.data = feedState.workspace;
        artiCreateOpportunity();
        $("#title").value = feedState.workspace.professional_posts
          .find((p) => p.id === Number(b.dataset.socialConvert))
          .body.slice(0, 120);
      }),
  );
  $("#feed-main-action").onclick = () =>
    artist ? publishForm() : navigate("discover");
  $("#feed-side-action").onclick = () =>
    navigate(artist ? "dashboard" : "discover");
  $$("[data-feed-mode]").forEach(
    (b) =>
      (b.onclick = async () => {
        feedState.mode = b.dataset.feedMode;
        try {
          await loadFeed(state.renderVersion);
        } catch (e) {
          toast(e.message);
        }
      }),
  );
  $("#feed-more")?.addEventListener("click", async () => {
    const button = $("#feed-more");
    button.disabled = true;
    try {
      const r = await api(
        "/api/feed?mode=" + feedState.mode + "&offset=" + feedState.offset,
      );
      feedState.posts.push(...r.posts);
      feedState.offset = r.next_offset;
      feedState.hasMore = r.has_more;
      const y = window.scrollY;
      renderFeed();
      window.scrollTo(0, y);
    } catch (e) {
      toast(e.message);
      button.disabled = false;
    }
  });
  bindFeedPosts();
  const linked = new URLSearchParams(location.search).get("post");
  if (linked) {
    document
      .getElementById("post-" + linked)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }
}
function bindFeedPosts() {
  $$("[data-feed-profile]").forEach(
    (b) => (b.onclick = () => openArtist(b.dataset.feedProfile)),
  );
  for (const [attribute, action] of [
    ["postLike", "like"],
    ["postSave", "save"],
    ["postFollow", "follow"],
  ]) {
    const selector =
      "[data-" +
      attribute.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase()) +
      "]";
    $$(selector).forEach(
      (button) =>
        (button.onclick = async () => {
          button.disabled = true;
          try {
            const p = await api(
              "/api/posts/" + button.dataset[attribute] + "/" + action,
              {},
            );
            feedState.posts = feedState.posts.map((x) =>
              x.id === p.id
                ? p
                : {
                    ...x,
                    ...(action === "follow" && x.artist_id === p.artist_id
                      ? { following: p.following }
                      : {}),
                  },
            );
            const y = window.scrollY;
            renderFeed();
            window.scrollTo(0, y);
          } catch (e) {
            toast(e.message);
            button.disabled = false;
          }
        }),
    );
  }
  $$("[data-post-comments]").forEach(
    (b) => (b.onclick = () => commentsModal(Number(b.dataset.postComments))),
  );
  $$("[data-post-report]").forEach(
    (b) => (b.onclick = () => reportForm("POST", Number(b.dataset.postReport))),
  );
  $$("[data-post-share]").forEach(
    (b) =>
      (b.onclick = async () => {
        const url = new URL(location.href);
        url.search = "?view=cliente&post=" + b.dataset.postShare;
        url.hash = "";
        try {
          await navigator.clipboard.writeText(url.href);
          toast("Enlace de la publicación copiado.");
        } catch {
          modal(
            "Comparte este momento.",
            "Copia el enlace para compartir esta publicación.",
            field("Enlace", "share-url", "text", url.href, "readonly"),
          );
        }
      }),
  );
}
function publishForm() {
  if (!state.boot.profile) {
    navigate("profile");
    toast("Crea tu perfil de músico antes de publicar.");
    return;
  }
  modal(
    "Tu talento, en primera fila.",
    "Comparte una foto o un video y conecta con tus próximos clientes.",
    `<form id="publish-form"><div class="form-grid">${select(
      "Formato",
      "media_type",
      [
        { value: "IMAGE", label: "Foto" },
        { value: "VIDEO", label: "Video · MP4 o WebM" },
      ],
    )}${field("URL de foto o video", "media_url", "url", state.boot.profile.photo, 'required maxlength="1500" placeholder="https://…"')}<div class="field full"><label for="caption">Cuéntanos qué estás creando</label><textarea id="caption" name="caption" required maxlength="2200" placeholder="Una presentación, un ensayo, tu próxima sesión…"></textarea><small class="hint">Fotos por HTTPS. Para video, utiliza una URL directa a un archivo .mp4 o .webm.</small></div></div><p class="error" role="alert"></p><div class="form-actions"><button type="submit" class="btn">Publicar</button></div></form>`,
  );
  bindForm("#publish-form", async (d) => {
    await api("/api/posts", d);
    feedState.mode = "all";
    closeModal();
    await navigate("feed");
    toast("Tu publicación ya está en el feed.");
  });
}
async function commentsModal(id) {
  try {
    const p = await api("/api/posts/" + id);
    const comments = await api("/api/posts/" + id + "/comments");
    modal(
      "Una buena conexión empieza aquí.",
      `Comentarios de la publicación de ${esc(p.stage_name)}`,
      `<p class="profile-text">${esc(p.caption)}</p><div class="post-comments-list">${comments.map((c) => `<div class="review"><strong>${esc(c.name)}</strong><p>${esc(c.body)}</p><small>${dateStr(c.created_at)}</small></div>`).join("") || empty("La conversación empieza contigo.", "Deja un comentario sobre esta publicación.", "chat")}</div><form id="post-comment-form"><div class="field"><label for="body">Tu comentario</label><textarea id="body" name="body" required maxlength="1000" placeholder="Escribe tu comentario…"></textarea></div><p class="error" role="alert"></p><div class="form-actions"><button type="submit" class="btn">Comentar</button></div></form>`,
    );
    bindForm("#post-comment-form", async (d) => {
      const updated = await api("/api/posts/" + id + "/comment", d);
      feedState.posts = feedState.posts.map((x) =>
        x.id === updated.id ? updated : x,
      );
      renderFeed();
      await commentsModal(id);
      toast("Comentario publicado.");
    });
  } catch (e) {
    toast(e.message);
  }
}

function renderDemoWelcome() {
  state.renderVersion++;
  $("#app").innerHTML =
    `<main class="preview-welcome"><header>${brand()}<a class="text-btn" href="${esc(window.ARTIVO_SOURCE_URL || "https://github.com/garykeyz/artivo")}" target="_blank" rel="noopener">Ver proyecto ↗</a></header><section class="welcome-copy"><div class="eyebrow">EXPLORE ARTI DEMO</div><h1>El talento.<br>Las personas.<br>Todo conectado.</h1><p>Descubre, contrata, coordina y paga talento para eventos.<br>Una demo funcional desde seis perspectivas.</p><div class="welcome-views arti-welcome-views">${artiRoles.map(([id, label]) => `<button data-welcome-view="${id}">${icon(id === "musico" ? "music" : id === "lider" ? "users" : id === "admin" ? "shield" : "user")}<strong>Entrar como ${label}</strong><span>${{ cliente: "Descubre y reserva talento.", musico: "Publica, negocia y realiza eventos.", lider: "Coordina tu equipo y sus fechas.", empresa: "Publica demanda y verifica servicios.", agencia: "Propón talento y recibe comisión.", admin: "Recorre escenarios, riesgo y métricas." }[id]}</span>${icon("arrow")}</button>`).join("")}</div><p class="legal">Demo gratuita · Datos ficticios en este navegador · Sin cobros ni cobertura reales.</p></section><footer>ARTI · La infraestructura profesional del entretenimiento.</footer></main>`;
  $$("[data-welcome-view]").forEach(
    (b) => (b.onclick = () => switchView(b.dataset.welcomeView)),
  );
  $$("[data-welcome-account]").forEach(
    (b) =>
      (b.onclick = async () => {
        try {
          state.user = await api("/api/auth/login", {
            email: b.dataset.welcomeAccount + "@artivo.demo",
            password: "Artivo2026!",
          });
          const u = new URL(location.href);
          u.search = "";
          history.replaceState(null, "", u);
          await startSession();
        } catch (e) {
          toast(e.message);
        }
      }),
  );
}
function demoInfo() {
  modal(
    "Una demo para explorar.",
    "Explora Cliente, Artista, Líder, Empresa, Agencia y Admin.",
    `<p class="profile-text">Alterna entre las seis perspectivas demo para recorrer una solicitud, su aceptación y un pago de prueba. Abre Escenarios para demostrar eventos, GPS, setup, facturas, factoring, seguros y Fast Pay. Todas esas operaciones son simulaciones. También puedes publicar, comentar, guardar contenido y registrar gastos.</p><p class="profile-text">Los cambios se guardan en <b>este navegador</b>. Otras personas que abran el enlace tienen su propia copia de la demo. No hay cobros reales ni cuentas personales en esta versión pública.</p><p class="profile-text">El repositorio incluye la aplicación Python con su API y base de datos para alojar una versión con cuentas y datos compartidos.</p><div class="form-actions"><a class="btn light" href="${esc(window.ARTIVO_SOURCE_URL || "https://github.com/garykeyz/artivo")}" target="_blank" rel="noopener">Ver repositorio ↗</a></div>`,
  );
}

async function openReportedPost(id) {
  try {
    const p = await api("/api/posts/" + id);
    modal(
      "Publicación #" + p.id,
      esc(p.stage_name),
      `<div class="post-media">${p.media_type === "VIDEO" ? `<video src="${esc(p.media_url)}" controls playsinline></video>` : `<img src="${esc(p.media_url)}" alt="Publicación reportada">`}</div><p class="profile-text">${esc(p.caption)}</p><div class="form-actions"><button class="btn light" id="reported-author">Ver perfil del artista</button></div>`,
    );
    $("#reported-author").onclick = () => openArtist(p.artist_id);
  } catch (e) {
    toast(e.message);
  }
}
