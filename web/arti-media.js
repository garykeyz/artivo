/* Replaceable storage interfaces. Binary assets live in IndexedDB, never business JSON. */
(function (root) {
  "use strict";
  class ObjectStorageProvider {
    put() {
      throw Error("Storage provider required");
    }
    get() {
      throw Error("Storage provider required");
    }
  }
  class VideoStreamingProvider {
    process(asset) {
      return {
        ...asset,
        processing_status: "SIMULATED",
        streaming_provider: "MOCK_LOCAL",
        transcoded: false,
      };
    }
  }
  class CDNProvider {
    url(key) {
      return "arti-media://" + key;
    }
  }
  class MockObjectStorageProvider extends ObjectStorageProvider {
    async database() {
      return new Promise((resolve, reject) => {
        const r = indexedDB.open("arti-media-assets", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("assets");
        r.onsuccess = () => resolve(r.result);
        r.onerror = () =>
          reject(Error("No pudimos abrir el almacenamiento de archivos."));
      });
    }
    async put(blob) {
      const key = crypto.randomUUID(),
        db = await this.database();
      await new Promise((resolve, reject) => {
        const t = db.transaction("assets", "readwrite");
        t.objectStore("assets").put(blob, key);
        t.oncomplete = resolve;
        t.onerror = () => reject(Error("No hay espacio para este archivo."));
      });
      db.close();
      return key;
    }
    async get(key) {
      const db = await this.database();
      const blob = await new Promise((resolve, reject) => {
        const r = db.transaction("assets").objectStore("assets").get(key);
        r.onsuccess = () => resolve(r.result);
        r.onerror = reject;
      });
      db.close();
      return blob;
    }
  }
  function allowed(db, asset, u) {
    if (
      !asset ||
      !asset.visibility ||
      asset.visibility === "PUBLIC" ||
      u.id === asset.owner_id ||
      (u.demo_role || u.role) === "ADMIN"
    )
      return true;
    const a = db.arti,
      role = u.demo_role || { BUSINESS: "ENTERPRISE" }[u.role] || u.role;
    if (asset.visibility === "ADMIN_ONLY" || asset.visibility === "PRIVATE")
      return false;
    if (asset.visibility === "FOLLOWERS_ONLY")
      return db.follows.some(
        (f) => f.user_id === u.id && f.artist_id === asset.owner_id,
      );
    if (asset.visibility === "ENTERPRISE_ONLY") return role === "ENTERPRISE";
    if (asset.visibility === "BOOKING_ONLY")
      return a.events.some(
        (e) =>
          e.id === asset.event_id &&
          [
            e.owner_id,
            e.provider_id,
            e.performer_id,
            ...(e.staffing_assignments || []).map((s) => s.provider_id),
          ].includes(u.id),
      );
    if (asset.visibility === "TEAM_ONLY")
      return a.teams.some(
        (t) =>
          t.id === asset.team_id &&
          (t.leader_id === u.id ||
            t.members.some(
              (m) => m.user_id === u.id && m.status === "ACCEPTED",
            )),
      );
    return false;
  }
  const store = new MockObjectStorageProvider(),
    urls = new Map();
  async function hydrate(posts) {
    for (const p of posts) {
      if (!p.media_url?.startsWith("arti-media://")) continue;
      const key = p.media_url.slice(13);
      if (!urls.has(key)) {
        const blob = await store.get(key);
        if (blob) urls.set(key, URL.createObjectURL(blob));
      }
      p.media_url = urls.get(key) || "demo-stage.svg";
    }
    return posts;
  }
  async function migrateLegacyBinary(database) {
    const original = await new Promise((resolve, reject) => {
      const request = database
        .transaction("state")
        .objectStore("state")
        .get("main");
      request.onsuccess = () => resolve(request.result);
      request.onerror = reject;
    });
    if (!original) return;
    const records = (db) => [
      ...(db.posts || []),
      ...(db.arti?.media || []),
      ...(db.arti?.professional_posts || []),
      ...(db.arti?.events || []).flatMap((e) => e.evidence || []),
    ];
    const values = [
      ...new Set(
        records(original)
          .flatMap((x) => [x.url, x.media_url])
          .filter(
            (x) =>
              typeof x === "string" &&
              x.startsWith("data:") &&
              x.includes(";base64,"),
          ),
      ),
    ];
    if (!values.length) return;
    const mapping = new Map();
    for (const value of values) {
      const [header, encoded] = value.split(","),
        bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0)),
        mime = header.slice(5).split(";")[0],
        key = await store.put(new Blob([bytes], { type: mime }));
      mapping.set(value, {
        key,
        url: "arti-media://" + key,
        size: bytes.length,
        mime,
      });
    }
    await new Promise((resolve, reject) => {
      const tx = database.transaction("state", "readwrite"),
        state = tx.objectStore("state"),
        request = state.get("main");
      request.onsuccess = () => {
        const db = request.result;
        for (const record of records(db)) {
          for (const field of ["url", "media_url"]) {
            const m = mapping.get(record[field]);
            if (m) {
              record[field] = m.url;
              record.storage_key = m.key;
              record.size_bytes = m.size;
              record.mime_type = m.mime;
            }
          }
        }
        state.put(db, "main");
      };
      tx.oncomplete = resolve;
      tx.onerror = reject;
      tx.onabort = reject;
    });
  }
  root.ArtiMedia = {
    interfaces: { ObjectStorageProvider, VideoStreamingProvider, CDNProvider },
    store,
    video: new VideoStreamingProvider(),
    cdn: new CDNProvider(),
    allowed,
    hydrate,
    migrateLegacyBinary,
  };
  if (typeof module !== "undefined") module.exports = root.ArtiMedia;
})(typeof window !== "undefined" ? window : globalThis);
