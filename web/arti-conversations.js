/* Internal visitor-local conversations shared by all professional identities. */
let professionalChatId = null;
async function openProfessionalConversation(user_id) {
  try {
    const c = await api("/api/arti/conversation", { user_id });
    professionalChatId = c.id;
    await navigate("messages");
  } catch (err) {
    toast(err.message);
  }
}
async function renderProfessionalMessages() {
  const [chats, w] = await Promise.all([
    api("/api/arti/conversation"),
    api("/api/arti/workspace"),
  ]);
  const name = (id) => w.users.find((u) => u.id === id)?.name || "Participante";
  const c = chats.find((c) => c.id === professionalChatId) || chats[0];
  professionalChatId = c?.id;
  $("#content").innerHTML =
    head(
      "Tus conexiones profesionales",
      "Mensajes internos de esta demo, guardados en tu navegador.",
    ) +
    `<section class="panel"><label>Iniciar conversación <select id="professional-contact">${w.users
      .filter((u) => u.id !== state.user.id && !u.suspended)
      .map(
        (u) =>
          `<option value="${u.id}">${esc(u.name)} · ${ArtiAccess.label(u)}</option>`,
      )
      .join(
        "",
      )}</select></label><button class="btn" id="professional-start">Abrir conversación</button><button class="btn light" id="legacy-chat">Conversaciones de reservas anteriores</button></section><div class="chat-shell"><div class="chat-list">${chats.map((x) => `<button data-prof-chat="${x.id}" class="${x.id === c?.id ? "active" : ""}">${esc(name(x.participants.find((id) => id !== state.user.id)))}</button>`).join("")}</div><div class="chat-main">${c ? `<div class="chat-header"><h3>${esc(name(c.participants.find((id) => id !== state.user.id)))}</h3></div><div class="chat-messages">${c.messages.map((m) => `<div class="message ${m.sender_id === state.user.id ? "mine" : ""}">${esc(m.body)}<small>${esc(name(m.sender_id))} · ${esc(m.at)}</small></div>`).join("") || "<p>Escribe para empezar a coordinar.</p>"}</div><form id="professional-message-form" class="chat-input"><input name="body" aria-label="Mensaje" placeholder="Escribe un mensaje" maxlength="3000" required><button class="btn">Enviar</button><p class="error"></p></form>` : "<p>Elige un contacto para empezar.</p>"}</div></div>`;
  $("#professional-start").onclick = () =>
    openProfessionalConversation(Number($("#professional-contact").value));
  $$("[data-prof-chat]").forEach(
    (b) =>
      (b.onclick = () => {
        professionalChatId = Number(b.dataset.profChat);
        renderProfessionalMessages();
      }),
  );
  $("#legacy-chat").onclick = () => {
    state.boot.static_demo = false;
    renderMessages().finally(() => (state.boot.static_demo = true));
  };
  if (c)
    bindForm("#professional-message-form", async (f) => {
      await api("/api/arti/conversation/" + c.id, f);
      await renderProfessionalMessages();
    });
}
