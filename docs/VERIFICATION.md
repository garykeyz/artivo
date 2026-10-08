# Verificación de ARTIVO · 8 de octubre de 2026

La demo pública se construye con datos nuevos y se publica en GitHub Pages. La base de datos SQLite local y las sesiones no se incluyen en el sitio.

## Automatización

- 49 pruebas Python: flujo de marketplace, permisos, finanzas, recuperación, disponibilidad concurrente, feed social y moderación.
- 13 pruebas Node: las dos vistas, reservas, contraofertas, pagos simulados repetidos, finalización, reseñas, gastos, interacciones sociales y rutas relativas de GitHub Pages.
- Validación sintáctica de los tres archivos JavaScript.
- El workflow de GitHub Actions ejecuta estas comprobaciones antes de publicar.

## Interfaz

Revisadas las vistas de cliente y músico en 1440×960 (laptop), 820×1100 (tablet) y 390×844 (celular). Ninguna presentó desbordamiento horizontal de la página. La fila de artistas permite desplazamiento horizontal dentro de su propio contenedor.

Capturas de la demo de prueba:

| Vista | Laptop | Tablet | Celular |
|---|---|---|---|
| Cliente | [Ver](screenshots/client-laptop.png) | [Ver](screenshots/client-tablet.png) | [Ver](screenshots/client-mobile.png) |
| Músico | [Ver](screenshots/musician-laptop.png) | [Ver](screenshots/musician-tablet.png) | [Ver](screenshots/musician-mobile.png) |

Comprobado en navegador: publicar como músico y verlo como cliente; likes, seguir artistas, guardados y comentarios; persistencia al cambiar de vista. El sitio público es una demostración por navegador, con pagos simulados y sin cuentas reales.

## Sitio publicado

Verificado en `https://garykeyz.github.io/artivo/` con dos pestañas: el cliente creó una solicitud de RD$10,000; el músico la aceptó; el cliente confirmó el pago de prueba; el músico inició el servicio; el cliente confirmó la finalización y publicó su reseña. La cartera acreditó RD$9,000 netos adicionales, sin duplicar el movimiento.

- [Vista pública del cliente](screenshots/public-client.png)
- [Vista pública del músico](screenshots/public-musician.png)

Las dos pestañas comparten IndexedDB dentro del mismo navegador, pero mantienen su vista por sesión. Otro navegador o dispositivo recibe una copia independiente.

## ARTI ampliado — 8 de octubre de 2026

- Se conservaron 49 pruebas Python y 13 del adaptador original. El dominio nuevo agrega 20 pruebas: seed, permisos, negociación/horario, holds, capacidad, servicio/factura, ledger, Fast Pay versus cobro empresarial, crédito, privacidad, equipos, archivos locales, escenarios/reset y reloj ficticio. Total: **82 pruebas**.
- Seed reproducible: 12 perfiles artistas, 5 líderes, 3 agencias, 5 empresas, 10 venues, 50 oportunidades, 100 eventos, 35 facturas y 20 pagos.
- Prueba visual de extremo a extremo: Empresa publicó «Prueba ARTI · Piano y eventos», dos fechas; Gary propuso US$300 y 21:00–01:00; Empresa contraofertó US$275 + transporte; Gary aceptó. Los dos eventos conservaron esas condiciones. GPS mock → evidencia → verificación Empresa → inicio/finalización Artista → factura INV-10036 NET 90 → factoring y seguro mock → Fast Pay → cobro Empresa. El payout no se duplicó y la financiación se liquidó.
- Se verificó el escenario Ausencia y sustitución: preparó NO_SHOW, cambió a Empresa, mostró candidatos AVAILABLE/CONFLICT y asignó Elena Rivera como intérprete. Evento cambió a CONFIRMED.
- Laptop 1440×960, tablet 820×1100 y móvil 390×844: documento sin overflow horizontal. Las pestañas operativas hacen scroll horizontal en móvil, con controles accesibles; la navegación inferior conserva acceso a Operación y Escenarios.
- Evidencia: [Escenarios laptop](screenshots/arti-scenarios-laptop.png), [Equipo tablet](screenshots/arti-leader-tablet.png), [Equipo móvil](screenshots/arti-leader-mobile.png), [Admin móvil](screenshots/arti-admin-mobile.png).
- La exportación de factura es HTML marcado DEMO, con impresión a PDF disponible en el navegador. El botón dio feedback; el evento de descarga del navegador interno no devolvió un archivo verificable y no se cuenta como prueba de descarga completa.
- Video de portfolio local: clip sintético H.264 de 4 segundos, 640×360, generado con el script Swift incluido. No representa una actuación real.
