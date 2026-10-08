/* GitHub Pages demonstration adapter. IndexedDB holds visitor-local data.
   This file is only enabled by the Pages build, never by the Python server.
   It deliberately offers no real authentication, payment or shared backend. */
(function () {
  const sessionKey =
    "artivo.preview.user." +
    (typeof location !== "undefined" ? location.pathname : "test");
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const stamp = () => new Date().toISOString().slice(0, 19).replace("T", " ");
  const dayKey = () =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Santo_Domingo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  const amount = (v, min = 1, max = 10000000) => {
    const n = Number(v);
    if (
      typeof v === "boolean" ||
      !Number.isSafeInteger(n) ||
      n < min ||
      n > max
    )
      throw Error("Introduce un importe válido.");
    return n;
  };
  const str = (v, max = 2000) => {
    if (typeof v !== "string" || !v.trim() || v.trim().length > max)
      throw Error("Completa los campos obligatorios.");
    return v.trim();
  };
  const nullable = (v) => (typeof v === "string" ? v.trim() : "");
  const id = (items) => Math.max(0, ...items.map((x) => x.id || 0)) + 1;
  const net = (b) => b.amount - b.commission;
  const fee = (db, n) => Math.round((n * db.settings.commission_bps) / 10000);
  const audit = (db, u, action, entity_id) =>
    db.audit.unshift({
      id: id(db.audit),
      user_id: u.id,
      action,
      entity_id,
      created_at: stamp(),
    });
  const https = (url, kind) => {
    let u;
    try {
      u = new URL(url);
    } catch {
      throw Error("Introduce una URL HTTPS válida.");
    }
    if (u.protocol !== "https:" || u.username || u.password)
      throw Error("Usa una URL HTTPS pública.");
    if (kind === "VIDEO" && !/\.(mp4|webm)$/i.test(u.pathname))
      throw Error("El video debe ser MP4 o WebM.");
    return u.href;
  };
  const range = (d) => {
    const a = new Date(d.start + "-04:00"),
      b = new Date(d.end + "-04:00");
    if (
      !Number.isFinite(+a) ||
      !Number.isFinite(+b) ||
      +a < Date.now() ||
      b - a < 1800000 ||
      b - a > 86400000
    )
      throw Error("Selecciona un horario futuro de 30 minutos a 24 horas.");
    return [d.start, d.end];
  };
  const overlaps = (a, b, c, d) => a < d && b > c;
  function free(db, artist, start, end, exclude = 0) {
    return (
      db.availability.some(
        (s) =>
          s.artist_id === artist &&
          s.kind === "AVAILABLE" &&
          s.start <= start &&
          s.end >= end,
      ) &&
      !db.availability.some(
        (s) =>
          s.artist_id === artist &&
          s.kind === "BLOCKED" &&
          overlaps(s.start, s.end, start, end),
      ) &&
      !db.bookings.some(
        (b) =>
          b.id !== exclude &&
          b.artist_id === artist &&
          ["PAYMENT_PENDING", "CONFIRMED", "IN_PROGRESS", "DISPUTED"].includes(
            b.status,
          ) &&
          overlaps(b.start, b.end, start, end),
      )
    );
  }
  function need(user, ...roles) {
    if (!user || user.suspended)
      throw Error("Entra a una vista activa de demostración.");
    if (roles.length && !roles.includes(user.role))
      throw Error("Esta vista no permite esa acción.");
  }
  function profile(db, artist, user) {
    const a = db.artists.find((a) => a.user_id === Number(artist));
    if (!a || db.users.find((u) => u.id === a.user_id)?.suspended)
      throw Error("Artista no encontrado.");
    const c = db.categories.find((c) => c.id === a.category_id),
      reviews = db.reviews.filter((r) => r.artist_id === a.user_id);
    return {
      ...a,
      category: c.name,
      icon: c.icon,
      rating: reviews.length
        ? Math.round(
            (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 100,
          ) / 100
        : null,
      review_count: reviews.length,
      completed: db.bookings.filter(
        (b) => b.artist_id === a.user_id && b.status === "PAID_OUT",
      ).length,
      favorite: db.favorites.some(
        (f) => f.user_id === user?.id && f.artist_id === a.user_id,
      ),
    };
  }
  function booking(db, bookingId, user) {
    const b = db.bookings.find((b) => b.id === Number(bookingId));
    if (!b) throw Error("Reserva no encontrada.");
    if (user.role !== "ADMIN" && ![b.artist_id, b.client_id].includes(user.id))
      throw Error("Esta reserva pertenece a otra cuenta.");
    const a = db.artists.find((a) => a.user_id === b.artist_id),
      u = db.users.find((u) => u.id === b.client_id);
    return {
      ...b,
      artist_name: a.stage_name,
      photo: a.photo,
      category_id: a.category_id,
      client_name: u.name,
      review_rating:
        db.reviews.find((r) => r.booking_id === b.id)?.rating || null,
    };
  }
  function post(db, postId, user) {
    const p = db.posts.find((p) => p.id === Number(postId));
    if (!p) throw Error("Publicación no encontrada.");
    const a = profile(db, p.artist_id, user);
    return {
      ...p,
      stage_name: a.stage_name,
      photo: a.photo,
      city: a.city,
      rate: a.rate,
      active: a.active,
      category: a.category,
      icon: a.icon,
      like_count: db.likes.filter((x) => x.post_id === p.id).length,
      comment_count: db.comments.filter((x) => x.post_id === p.id).length,
      liked: db.likes.some((x) => x.post_id === p.id && x.user_id === user.id),
      saved: db.saves.some((x) => x.post_id === p.id && x.user_id === user.id),
      following: db.follows.some(
        (x) => x.artist_id === p.artist_id && x.user_id === user.id,
      ),
    };
  }
  function toggle(items, test, value) {
    const i = items.findIndex(test);
    if (i >= 0) items.splice(i, 1);
    else items.push(value);
  }
  function wallet(db, user) {
    need(user, "ARTIST");
    const transactions = db.transactions
        .filter((t) => t.artist_id === user.id)
        .sort((a, b) => b.id - a.id),
      expenses = db.expenses
        .filter((e) => e.artist_id === user.id)
        .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    const income = transactions.reduce((s, t) => s + t.amount, 0),
      commission = transactions.reduce((s, t) => s + t.commission, 0),
      spent = expenses.reduce((s, e) => s + e.amount, 0),
      month = dayKey().slice(0, 7);
    const localMonth = (t) =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Santo_Domingo",
        year: "numeric",
        month: "2-digit",
      }).format(new Date(t.created_at.replace(" ", "T") + "Z"));
    const monthly = transactions.filter((t) => localMonth(t) === month),
      mi = monthly.reduce((s, t) => s + t.amount, 0),
      mc = monthly.reduce((s, t) => s + t.commission, 0),
      me = expenses
        .filter((e) => e.date.startsWith(month))
        .reduce((s, e) => s + e.amount, 0);
    return {
      income,
      commission,
      expenses_total: spent,
      profit: income - commission - spent,
      available: income - commission,
      pending: db.bookings
        .filter(
          (b) =>
            b.artist_id === user.id &&
            ["CONFIRMED", "IN_PROGRESS", "DISPUTED"].includes(b.status),
        )
        .reduce((s, b) => s + net(b), 0),
      month_income: mi,
      month_commission: mc,
      month_expenses: me,
      month_profit: mi - mc - me,
      transactions,
      expenses,
      expense_categories: db.expense_categories,
    };
  }
  function initialize(seed) {
    const db = clone(seed),
      day = dayKey();
    for (const table of [
      "availability",
      "bookings",
      "payments",
      "transactions",
      "expenses",
      "reviews",
      "messages",
      "favorites",
      "reports",
      "audit",
      "likes",
      "saves",
      "follows",
      "comments",
    ])
      db[table] = [];
    const future = (days, hour) => {
      const d = new Date(day + "T12:00:00Z");
      d.setUTCDate(d.getUTCDate() + days);
      return d.toISOString().slice(0, 10) + "T" + hour;
    };
    db.artists.forEach((a) =>
      db.availability.push({
        id: id(db.availability),
        artist_id: a.user_id,
        start: day + "T00:00",
        end: future(365, "23:59"),
        kind: "AVAILABLE",
      }),
    );
    const samples = [
      {
        id: 1,
        client_id: 1,
        artist_id: 2,
        title: "Noche de jazz · Casa Tropical",
        status: "PAID_OUT",
        amount: 8000,
        days: -2,
      },
      {
        id: 2,
        client_id: 8,
        artist_id: 2,
        title: "Cena de bienvenida · Palma Real",
        status: "PENDING",
        amount: 9500,
        days: 4,
      },
      {
        id: 3,
        client_id: 1,
        artist_id: 2,
        title: "Atardecer al piano",
        status: "CONFIRMED",
        amount: 8000,
        days: 7,
      },
    ];
    db.bookings = samples.map(({ days, ...b }) => ({
      ...b,
      city: "Punta Cana",
      location: b.client_id === 8 ? "Hotel Palma Real" : "Casa Tropical",
      description: "Evento de demostración · Jazz y lounge en vivo.",
      start: future(days, "20:00"),
      end: future(days, "23:00"),
      commission: fee(db, b.amount),
      counter_amount: null,
      created_at: stamp(),
    }));
    db.payments = [
      {
        id: 1,
        booking_id: 1,
        status: "RELEASED",
        amount: 8000,
        provider: "DEMO",
      },
      { id: 2, booking_id: 3, status: "HELD", amount: 8000, provider: "DEMO" },
    ];
    db.transactions = [
      {
        id: 1,
        artist_id: 2,
        booking_id: 1,
        kind: "BOOKING",
        amount: 8000,
        commission: 800,
        description: "Noche de jazz · Casa Tropical",
        created_at: stamp(),
      },
    ];
    db.expenses = [
      {
        id: 1,
        artist_id: 2,
        booking_id: 1,
        category: "Gasolina",
        description: "Gasolina · evento de demostración",
        amount: 700,
        date: day,
      },
      {
        id: 2,
        artist_id: 2,
        booking_id: 1,
        category: "Alimentación",
        description: "Comida · evento de demostración",
        amount: 300,
        date: day,
      },
    ];
    db.messages = [
      {
        id: 1,
        booking_id: 3,
        sender_id: 1,
        body: "¡Hola Gary! Nos encantaría un repertorio de jazz y bossa nova para la cena.",
        created_at: stamp(),
      },
      {
        id: 2,
        booking_id: 3,
        sender_id: 2,
        body: "¡Será un placer! Llevo mi piano y el equipo de sonido. Nos vemos en Casa Tropical.",
        created_at: stamp(),
      },
    ];
    db.posts.forEach((p) => (p.created_at = stamp()));
    return db;
  }
  function dispatch(db, path, data, userId) {
    const url = new URL(path, "https://artivo.demo"),
      route = url.pathname,
      parts = route.split("/"),
      params = Object.fromEntries(url.searchParams),
      write = data !== undefined;
    data = data || {};
    const user = db.users.find((u) => u.id === Number(userId));
    if (route === "/api/auth/me")
      return {
        user: user && !user.suspended ? user : null,
        demo: true,
        static_demo: true,
      };
    if (route === "/api/auth/login") {
      const u = db.users.find((u) => u.email === data.email && !u.suspended);
      if (!u || data.password !== "Artivo2026!")
        throw Error("Usa una de las vistas de demostración.");
      return clone(u);
    }
    if (route === "/api/auth/logout") return { ok: true };
    if (route.startsWith("/api/auth/"))
      throw Error(
        "La demo pública se explora con las vistas de cliente y músico. Para crear cuentas reales, utiliza el backend.",
      );
    need(user);
    if (route === "/api/bootstrap")
      return {
        user,
        categories: db.categories,
        cities: [...new Set(db.artists.map((a) => a.city))]
          .sort()
          .map((name) => ({ name })),
        profile: db.artists.some((a) => a.user_id === user.id)
          ? profile(db, user.id, user)
          : null,
        demo: true,
        static_demo: true,
        ...db.settings,
      };
    if (route === "/api/artists") {
      if (!!params.start !== !!params.end)
        throw Error("Selecciona el horario completo.");
      if (params.start) range(params);
      return db.artists
        .filter((a) => !db.users.find((u) => u.id === a.user_id).suspended)
        .map((a) => profile(db, a.user_id, user))
        .filter(
          (a) =>
            (!params.q ||
              [a.stage_name, a.city, a.category, a.genres, a.bio]
                .join(" ")
                .toLowerCase()
                .includes(params.q.toLowerCase())) &&
            (!params.category || a.category_id === Number(params.category)) &&
            (!params.city || a.city === params.city) &&
            (params.active !== "1" || a.active) &&
            (!params.budget || a.rate <= Number(params.budget)) &&
            (!params.start || free(db, a.user_id, params.start, params.end)),
        )
        .sort(
          (a, b) => b.active - a.active || (b.rating || 0) - (a.rating || 0),
        );
    }
    if (route.startsWith("/api/artists/")) {
      const a = profile(db, parts[3], user);
      return {
        ...a,
        reviews: db.reviews
          .filter((r) => r.artist_id === a.user_id)
          .map((r) => ({
            ...r,
            name: db.users.find((u) => u.id === r.author_id).name,
          })),
        availability: db.availability.filter((s) => s.artist_id === a.user_id),
      };
    }
    if (route === "/api/profile") {
      need(user, "ARTIST");
      const a = {
        user_id: user.id,
        stage_name: str(data.stage_name, 80),
        category_id: amount(data.category_id),
        city: str(data.city, 80),
        rate: amount(data.rate, 500, 1000000),
        radius: amount(data.radius, 1, 200),
        active: +!!data.active,
        bio: nullable(data.bio),
        genres: nullable(data.genres),
        equipment: nullable(data.equipment),
        photo: data.photo ? https(data.photo) : "",
        media_url: data.media_url ? https(data.media_url) : "",
        verified: 0,
      };
      if (!db.categories.some((c) => c.id === a.category_id))
        throw Error("Categoría no válida.");
      const i = db.artists.findIndex((x) => x.user_id === user.id);
      if (i >= 0) db.artists[i] = { ...db.artists[i], ...a };
      else db.artists.push(a);
      return profile(db, user.id, user);
    }
    if (route === "/api/feed") {
      const mode = params.mode || "all",
        offset = amount(params.offset || 0, 0, 100000);
      if (!["all", "following", "saved", "mine"].includes(mode))
        throw Error("Filtro no válido.");
      const posts = db.posts
        .filter((p) => !db.users.find((u) => u.id === p.artist_id).suspended)
        .filter(
          (p) =>
            mode === "all" ||
            (mode === "following" &&
              db.follows.some(
                (f) => f.user_id === user.id && f.artist_id === p.artist_id,
              )) ||
            (mode === "saved" &&
              db.saves.some(
                (s) => s.user_id === user.id && s.post_id === p.id,
              )) ||
            (mode === "mine" && p.artist_id === user.id),
        )
        .sort((a, b) => b.id - a.id);
      return {
        posts: posts
          .slice(offset, offset + 12)
          .map((p) => post(db, p.id, user)),
        has_more: posts.length > offset + 12,
        next_offset: Math.min(posts.length, offset + 12),
      };
    }
    if (route === "/api/posts") {
      need(user, "ARTIST");
      profile(db, user.id, user);
      if (!["IMAGE", "VIDEO"].includes(data.media_type))
        throw Error("Selecciona foto o video.");
      const p = {
        id: id(db.posts),
        artist_id: user.id,
        caption: str(data.caption, 2200),
        media_url: https(data.media_url, data.media_type),
        media_type: data.media_type,
        created_at: stamp(),
      };
      db.posts.push(p);
      return post(db, p.id, user);
    }
    if (route.startsWith("/api/posts/")) {
      const p = post(db, parts[3], user),
        action = parts[4];
      if (!write && action === "comments")
        return db.comments
          .filter(
            (c) =>
              c.post_id === p.id &&
              !db.users.find((u) => u.id === c.author_id).suspended,
          )
          .slice(-100)
          .reverse()
          .map((c) => ({
            ...c,
            name:
              db.artists.find((a) => a.user_id === c.author_id)?.stage_name ||
              db.users.find((u) => u.id === c.author_id).name,
          }));
      if (!write) return p;
      if (action === "like" || action === "save") {
        const list = action === "like" ? db.likes : db.saves;
        toggle(list, (x) => x.post_id === p.id && x.user_id === user.id, {
          post_id: p.id,
          user_id: user.id,
        });
      } else if (action === "follow") {
        if (p.artist_id === user.id)
          throw Error("No puedes seguirte a ti mismo.");
        toggle(
          db.follows,
          (x) => x.artist_id === p.artist_id && x.user_id === user.id,
          { artist_id: p.artist_id, user_id: user.id },
        );
      } else if (action === "comment")
        db.comments.push({
          id: id(db.comments),
          post_id: p.id,
          author_id: user.id,
          body: str(data.body, 1000),
          created_at: stamp(),
        });
      else throw Error("Acción no válida.");
      return post(db, p.id, user);
    }
    if (route === "/api/bookings" && !write)
      return db.bookings
        .filter(
          (b) =>
            user.role === "ADMIN" ||
            b.artist_id === user.id ||
            b.client_id === user.id,
        )
        .sort((a, b) => b.start.localeCompare(a.start))
        .map((b) => booking(db, b.id, user));
    if (route === "/api/bookings" && write) {
      need(user, "CLIENT", "BUSINESS");
      const a = profile(db, data.artist_id, user),
        [start, end] = range(data);
      if (!a.active || !free(db, a.user_id, start, end))
        throw Error("El artista no está disponible en ese horario.");
      if (data.city !== a.city)
        throw Error("Elige un evento en la ciudad del artista.");
      const n = amount(data.amount, 500, 1000000),
        b = {
          id: id(db.bookings),
          client_id: user.id,
          artist_id: a.user_id,
          title: str(data.title, 120),
          location: str(data.location, 200),
          city: a.city,
          description: nullable(data.description),
          start,
          end,
          amount: n,
          commission: fee(db, n),
          status: "PENDING",
          counter_amount: null,
          created_at: stamp(),
        };
      db.bookings.push(b);
      audit(db, user, "REQUEST_CREATED", b.id);
      return booking(db, b.id, user);
    }
    if (route.startsWith("/api/bookings/")) {
      const b = booking(db, parts[3], user),
        stored = db.bookings.find((x) => x.id === b.id),
        artist = b.artist_id === user.id,
        client = b.client_id === user.id;
      if (parts[4] === "messages") {
        if (write) {
          if (!artist && !client)
            throw Error("Solo los participantes pueden escribir.");
          db.messages.push({
            id: id(db.messages),
            booking_id: b.id,
            sender_id: user.id,
            body: str(data.body, 3000),
            created_at: stamp(),
          });
          return { ok: true };
        }
        return db.messages
          .filter((x) => x.booking_id === b.id)
          .map((x) => ({
            ...x,
            name: db.users.find((u) => u.id === x.sender_id).name,
          }));
      }
      if (parts[4] === "review") {
        if (
          !client ||
          b.status !== "PAID_OUT" ||
          db.reviews.some((r) => r.booking_id === b.id)
        )
          throw Error("Solo puedes reseñar una reserva completada, una vez.");
        db.reviews.push({
          id: id(db.reviews),
          booking_id: b.id,
          author_id: user.id,
          artist_id: b.artist_id,
          rating: amount(data.rating, 1, 5),
          comment: str(data.comment, 1500),
          created_at: stamp(),
        });
        return { ok: true };
      }
      if (parts[4] !== "action" || !write) throw Error("Ruta no encontrada.");
      const act = data.action;
      const status = (s) => {
        if (!s.includes(b.status))
          throw Error("La reserva no permite esta acción en su estado actual.");
      };
      const recheck = () => {
        if (
          new Date(b.start + "-04:00") < new Date() ||
          !free(db, b.artist_id, b.start, b.end, b.id)
        )
          throw Error("Ese horario ya no está disponible.");
      };
      if (["accept", "reject", "counter"].includes(act)) {
        if (!artist) throw Error("Solo el músico puede responder.");
        status(["PENDING"]);
        if (act === "accept") {
          recheck();
          stored.status = "PAYMENT_PENDING";
        } else if (act === "reject") stored.status = "CANCELLED";
        else {
          stored.counter_amount = amount(data.amount, 500, 1000000);
          stored.status = "COUNTER_OFFER";
        }
      } else if (act === "accept_counter") {
        if (!client) throw Error("Solo el cliente acepta la oferta.");
        status(["COUNTER_OFFER"]);
        recheck();
        stored.amount = b.counter_amount;
        stored.commission = fee(db, b.counter_amount);
        stored.status = "PAYMENT_PENDING";
      } else if (act === "pay") {
        if (!client) throw Error("Solo el cliente puede pagar.");
        status(["PAYMENT_PENDING"]);
        recheck();
        if (db.payments.some((p) => p.booking_id === b.id))
          throw Error("Este pago ya existe.");
        db.payments.push({
          id: id(db.payments),
          booking_id: b.id,
          provider: "DEMO",
          amount: b.amount,
          status: "HELD",
        });
        stored.status = "CONFIRMED";
      } else if (act === "start") {
        if (!artist) throw Error("Solo el músico puede iniciar el servicio.");
        status(["CONFIRMED"]);
        stored.status = "IN_PROGRESS";
      } else if (act === "complete" || act === "resolve_release") {
        if (act === "complete") {
          if (!client) throw Error("Solo el cliente completa el servicio.");
          status(["IN_PROGRESS"]);
        } else {
          need(user, "ADMIN");
          status(["DISPUTED"]);
        }
        const payment = db.payments.find(
          (p) => p.booking_id === b.id && p.status === "HELD",
        );
        if (!payment || db.transactions.some((t) => t.booking_id === b.id))
          throw Error("El ingreso ya fue liberado o no hay pago retenido.");
        payment.status = "RELEASED";
        db.transactions.push({
          id: id(db.transactions),
          artist_id: b.artist_id,
          booking_id: b.id,
          kind: "BOOKING",
          amount: b.amount,
          commission: b.commission,
          description: b.title,
          created_at: stamp(),
        });
        stored.status = "PAID_OUT";
        db.reports
          .filter((r) => r.booking_id === b.id)
          .forEach((r) => (r.status = "RESOLVED"));
      } else if (
        act === "cancel" ||
        act === "reject" ||
        act === "resolve_refund"
      ) {
        if (act === "resolve_refund") {
          need(user, "ADMIN");
          status(["DISPUTED"]);
        } else {
          if (!client && !artist)
            throw Error("Solo los participantes pueden cancelar.");
          status(["PENDING", "COUNTER_OFFER", "PAYMENT_PENDING", "CONFIRMED"]);
          if (
            client &&
            b.status === "CONFIRMED" &&
            new Date(b.start + "-04:00") - Date.now() <
              db.settings.free_cancel_hours * 3600000
          )
            throw Error(
              "Abre una disputa para solicitar revisión de la cancelación.",
            );
        }
        const payment = db.payments.find(
          (p) => p.booking_id === b.id && p.status === "HELD",
        );
        if (payment) {
          payment.status = "REFUNDED";
          stored.status = "REFUNDED";
        } else stored.status = "CANCELLED";
        db.reports
          .filter((r) => r.booking_id === b.id)
          .forEach((r) => (r.status = "RESOLVED"));
      } else if (act === "dispute") {
        if (!client && !artist)
          throw Error("Solo los participantes pueden abrir una disputa.");
        status(["CONFIRMED", "IN_PROGRESS"]);
        db.reports.push({
          id: id(db.reports),
          author_id: user.id,
          booking_id: b.id,
          target_kind: "BOOKING",
          target_id: b.id,
          reason: str(data.reason),
          status: "OPEN",
          created_at: stamp(),
        });
        stored.status = "DISPUTED";
      } else throw Error("Acción de reserva no válida.");
      audit(db, user, "BOOKING_" + act.toUpperCase(), b.id);
      return booking(db, b.id, user);
    }
    if (route === "/api/favorites") {
      need(user, "CLIENT", "BUSINESS");
      const a = profile(db, data.artist_id, user);
      toggle(
        db.favorites,
        (x) => x.user_id === user.id && x.artist_id === a.user_id,
        { user_id: user.id, artist_id: a.user_id },
      );
      return { ok: true };
    }
    if (route === "/api/wallet") return wallet(db, user);
    if (route === "/api/expenses") {
      need(user, "ARTIST");
      const bookingId = data.booking_id ? amount(data.booking_id) : null;
      if (
        bookingId &&
        db.bookings.find((b) => b.id === bookingId)?.artist_id !== user.id
      )
        throw Error("El gasto debe asociarse a una reserva propia.");
      if (
        !db.expense_categories.includes(data.category) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(data.date)
      )
        throw Error("Revisa la categoría y la fecha.");
      db.expenses.push({
        id: id(db.expenses),
        artist_id: user.id,
        booking_id: bookingId,
        category: data.category,
        description: str(data.description, 200),
        amount: amount(data.amount),
        date: data.date,
      });
      return wallet(db, user);
    }
    if (route === "/api/income") {
      need(user, "ARTIST");
      db.transactions.push({
        id: id(db.transactions),
        artist_id: user.id,
        booking_id: null,
        kind: "EXTERNAL",
        amount: amount(data.amount),
        commission: 0,
        description: str(data.description, 200),
        created_at: stamp(),
      });
      return wallet(db, user);
    }
    if (route === "/api/availability") {
      need(user, "ARTIST");
      if (!write) return db.availability.filter((s) => s.artist_id === user.id);
      const [start, end] = range(data);
      if (!["AVAILABLE", "BLOCKED"].includes(data.kind))
        throw Error("Tipo de horario inválido.");
      if (
        data.kind === "BLOCKED" &&
        db.bookings.some(
          (b) =>
            b.artist_id === user.id &&
            [
              "PAYMENT_PENDING",
              "CONFIRMED",
              "IN_PROGRESS",
              "DISPUTED",
            ].includes(b.status) &&
            overlaps(b.start, b.end, start, end),
        )
      )
        throw Error("Ese horario tiene una reserva.");
      db.availability.push({
        id: id(db.availability),
        artist_id: user.id,
        start,
        end,
        kind: data.kind,
      });
      return { ok: true };
    }
    if (route === "/api/availability/delete") {
      need(user, "ARTIST");
      const slot = db.availability.find(
        (s) => s.id === Number(data.id) && s.artist_id === user.id,
      );
      if (
        slot &&
        db.bookings.some(
          (b) =>
            b.artist_id === user.id &&
            [
              "PAYMENT_PENDING",
              "CONFIRMED",
              "IN_PROGRESS",
              "DISPUTED",
            ].includes(b.status) &&
            overlaps(b.start, b.end, slot.start, slot.end),
        )
      )
        throw Error("No puedes quitar disponibilidad con reservas activas.");
      db.availability = db.availability.filter(
        (s) => !(s.id === Number(data.id) && s.artist_id === user.id),
      );
      return { ok: true };
    }
    if (route === "/api/reports") {
      const target = amount(data.target_id);
      if (data.target_kind === "ARTIST") profile(db, target, user);
      else if (data.target_kind === "POST") post(db, target, user);
      else if (data.target_kind === "BOOKING") booking(db, target, user);
      else throw Error("Tipo de reporte no válido.");
      db.reports.push({
        id: id(db.reports),
        author_id: user.id,
        booking_id: data.target_kind === "BOOKING" ? target : null,
        target_kind: data.target_kind,
        target_id: target,
        reason: str(data.reason),
        status: "OPEN",
        created_at: stamp(),
      });
      return { ok: true };
    }
    if (route === "/api/admin") {
      need(user, "ADMIN");
      const completed = db.bookings.filter((b) => b.status === "PAID_OUT");
      return {
        users: db.users,
        bookings: db.bookings.map((b) => booking(db, b.id, user)),
        reports: db.reports.map((r) => ({
          ...r,
          name: db.users.find((u) => u.id === r.author_id).name,
        })),
        audit: db.audit,
        stats: {
          bookings: db.bookings.length,
          gmv: completed.reduce((s, b) => s + b.amount, 0),
          revenue: completed.reduce((s, b) => s + b.commission, 0),
          completed: completed.length,
        },
        settings: Object.entries(db.settings).map(([key, value]) => ({
          key,
          value,
        })),
      };
    }
    if (route === "/api/admin/settings") {
      need(user, "ADMIN");
      db.settings = {
        commission_bps: amount(data.commission_bps, 0, 3000),
        free_cancel_hours: amount(data.free_cancel_hours, 0, 168),
      };
      audit(db, user, "SETTINGS_UPDATED", null);
      return { ok: true };
    }
    if (route === "/api/admin/user") {
      need(user, "ADMIN");
      const target = db.users.find((u) => u.id === Number(data.id));
      if (!target || target.role === "ADMIN")
        throw Error("No puedes suspender esta cuenta.");
      target.suspended = +!target.suspended;
      return { ok: true };
    }
    if (route === "/api/admin/report") {
      need(user, "ADMIN");
      const r = db.reports.find((r) => r.id === Number(data.id));
      if (!r) throw Error("Reporte no encontrado.");
      if (db.bookings.find((b) => b.id === r.booking_id)?.status === "DISPUTED")
        throw Error("Resuelve la disputa desde la reserva.");
      r.status = "RESOLVED";
      return { ok: true };
    }
    throw Error("Ruta no disponible en esta demostración.");
  }
  let databasePromise;
  function open() {
    if (databasePromise) return databasePromise;
    databasePromise = (async () => {
      const response = await fetch("demo-data.json");
      if (!response.ok)
        throw Error("No pudimos cargar los datos de demostración.");
      const seed = await response.json();
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(
          "artivo-preview-v2-" + location.pathname.replace(/[^a-z0-9]/gi, "_"),
          1,
        );
        request.onupgradeneeded = () =>
          request.result.createObjectStore("state");
        request.onerror = () =>
          reject(Error("El navegador no permite guardar la demo."));
        request.onsuccess = () => resolve({ database: request.result, seed });
      });
    })();
    return databasePromise;
  }
  async function request(path, data) {
    const { database, seed } = await open();
    return new Promise((resolve, reject) => {
      const tx = database.transaction("state", "readwrite"),
        store = tx.objectStore("state");
      let result, failed;
      const read = store.get("main");
      read.onsuccess = () => {
        try {
          const db = read.result || initialize(seed);
          result = dispatch(db, path, data, sessionStorage.getItem(sessionKey));
          if (path === "/api/auth/login")
            sessionStorage.setItem(sessionKey, result.id);
          if (path === "/api/auth/logout")
            sessionStorage.removeItem(sessionKey);
          store.put(db, "main");
        } catch (e) {
          failed = e;
          tx.abort();
        }
      };
      tx.oncomplete = () => resolve(clone(result));
      tx.onabort = () =>
        reject(failed || Error("No pudimos guardar los cambios."));
      tx.onerror = () => reject(Error("No pudimos guardar los cambios."));
    });
  }
  if (typeof window !== "undefined") window.ArtivoDemo = { request };
  if (typeof module !== "undefined")
    module.exports = { dispatch, initialize, free };
})();
