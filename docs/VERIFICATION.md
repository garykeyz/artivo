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
