# ARTI / ARTIVO

Aplicación web del MVP de contratación artística. Python 3.11+, SQLite y JavaScript nativo, sin paquetes externos. Interfaz adaptable a móvil y escritorio, en español y RD$.

## Demo funcional ARTI ampliada

[**Explorar ARTI**](https://garykeyz.github.io/artivo/?view=demo) · [Artista](https://garykeyz.github.io/artivo/?view=musico) · [Líder](https://garykeyz.github.io/artivo/?view=lider) · [Empresa](https://garykeyz.github.io/artivo/?view=empresa) · [Agencia](https://garykeyz.github.io/artivo/?view=agencia) · [Admin](https://garykeyz.github.io/artivo/?view=admin).

La extensión conserva todos los módulos originales. Agrega **12 escenarios funcionales**, datos reproducibles (12 perfiles artistas, 5 líderes, 3 agencias, 5 empresas, 10 venues, 50 oportunidades, 100 eventos), negociación de precio/horario/condiciones, series y aceptación parcial, retenciones, equipos y sustituciones, calendario, GPS y setup simulados, facturas NET 30/60/90, ledger, crédito, factoring, seguro y Fast Pay ficticios. El cobro anticipado y el pago de la empresa son estados distintos; no duplican el payout. Las acciones persisten en la copia del visitante.

[Guía para presentar en 5–10 minutos](docs/DEMO-GUIDE.md) · [Arquitectura A–Z y ERD](docs/architecture/ARTI-ARCHITECTURE.md). Navegación responsive, seis perspectivas, Journal, reset de datos demo que conserva configuración y providers mock con interfaces. Los módulos operativos nuevos están en el demo Pages; el backend Python/SQLite conserva su alcance original. No hay cobros, ubicación, crédito ni cobertura reales.

```sh
node scripts/seed_demo.cjs
node --test tests/test_demo.cjs tests/test_arti.cjs
```

## Demo pública: cliente y músico

- [Vista del cliente](https://garykeyz.github.io/artivo/?view=cliente): feed, descubrimiento, favoritos, solicitudes, reservas y mensajes.
- [Vista del músico](https://garykeyz.github.io/artivo/?view=musico): actividad, publicaciones, solicitudes, agenda, chat, cartera y gastos.
- [Repositorio](https://github.com/garykeyz/artivo).

La demo de GitHub Pages es gratuita y utiliza **IndexedDB en cada navegador**. Los visitantes tienen copias independientes de los datos. El selector Cliente/Músico permite probar ambos lados del flujo con la misma copia local. No hay autenticación real, cuentas personales ni cobros en la demo pública; no es un servicio con base de datos compartida. Los datos iniciales son sintéticos y se generan desde una base temporal nueva, nunca desde la base de datos local.

El feed incluye fotos, videos directos MP4/WebM, likes, comentarios, seguir artistas, guardados, compartir enlaces y acceso al perfil para contratar. Los músicos pueden publicar. El mismo feed utiliza SQLite y autorización de backend al ejecutar la aplicación Python.

La interfaz adapta la navegación a laptop, tablet y celular. En móvil, el músico tiene accesos a actividad, feed, reservas, cartera y perfil; la agenda y el chat se abren desde su actividad o el encabezado. En escritorio tiene el menú completo.

Para reproducir la demo estática:

```sh
python3 scripts/build_site.py
python3 -m http.server 8001 --bind 127.0.0.1 --directory dist
```

Cada push a `main` ejecuta pruebas y publica en GitHub Pages mediante `.github/workflows/pages.yml`.

## Ejecutar

Desde esta carpeta:

```sh
python3 server.py
```

Abrir [ARTIVO](http://127.0.0.1:8000). Los datos se guardan en `data/artivo.sqlite3`, fuera de Git. El servidor escucha únicamente en loopback por defecto.

La pantalla de acceso tiene botones para explorar como **Cliente, Artista, Business o Admin**. También se pueden registrar cuentas propias. Las cuentas iniciales utilizan `Artivo2026!`:

| Cuenta | Correo |
|---|---|
| Casa Tropical | cliente@artivo.demo |
| Gary Keyz | gary@artivo.demo |
| Hotel Palma Real | business@artivo.demo |
| Administración | admin@artivo.demo |

Los perfiles iniciales son datos de demostración, sin calificaciones inventadas. Las imágenes de muestra se cargan desde Unsplash; las fotos y presentaciones propias pueden enlazarse por HTTPS.

## Ciclo funcional

1. Registrarse como artista, completar el perfil y activar la recepción de solicitudes.
2. Publicar intervalos disponibles en **Mi agenda**. Los artistas de muestra tienen 90 días publicados.
3. Entrar como cliente, buscar por nombre, categoría, género o ciudad; aplicar filtros de presupuesto y horario.
4. Abrir un perfil y enviar una solicitud con fecha, duración, lugar y precio.
5. El artista acepta, rechaza o propone una contraoferta. La aceptación bloquea el horario y comprueba conflictos dentro de una transacción.
6. El cliente acepta la contraoferta si corresponde y confirma el **pago de prueba**.
7. El artista inicia el servicio; el cliente confirma su finalización. En demostración se permite avanzar antes de la fecha para probar el ciclo.
8. El cliente publica su reseña. El artista recibe el ingreso neto en su cartera y registra gastos asociados.

Cada reserva tiene conversación entre sus participantes. Los mensajes se guardan; el botón **Actualizar** consulta respuestas nuevas. Los favoritos, horarios, ingresos externos, gastos, reseñas y reportes son persistentes. Administración permite revisar reservas, suspender cuentas, resolver reportes y disputas y configurar la comisión y la ventana de cancelación.

## Dinero y consistencia

El precio del servicio es el total del cliente. La comisión inicial del 10% se descuenta al artista, conforme al modelo final de la especificación. No hay tarifa adicional al cliente. Los importes del MVP son enteros en pesos dominicanos.

- Ingreso bruto RD$8,000 − comisión RD$800 = balance disponible RD$7,200.
- Gastos RD$1,000 → ganancia real RD$6,200.
- Los gastos externos reducen la ganancia real, pero no el saldo del libro interno.
- Los ingresos externos manuales no pagan comisión.
- Las reservas ya creadas conservan su comisión pactada; aceptar una contraoferta recalcula la comisión con la configuración vigente.
- El pago, la transición de estado y el asiento contable se validan en backend. Índices únicos impiden duplicar pagos o ingresos por reserva.
- Los horarios aceptados, confirmados, en curso o en disputa impiden otra aceptación simultánea. Las solicitudes pendientes pueden coincidir hasta que una sea aceptada.
- La cancelación de un cliente con pago retenido, dentro de la ventana de revisión, requiere disputa. Un administrador puede reembolsar o liberar el pago simulado.

## Arquitectura

| Archivo | Responsabilidad |
|---|---|
| `server.py` | HTTP, sesiones, control de origen, límites de solicitudes, transacciones y archivos web |
| `artivo/db.py`, `schema.sql` | Persistencia, relaciones, índices y migración aditiva de reportes |
| `artivo/auth.py`, `security.py` | Registro, login, recuperación local, PBKDF2, tokens y validación |
| `artivo/marketplace.py` | Búsqueda, perfiles, disponibilidad y estados de reserva |
| `artivo/finance.py` | Libro de ingresos, comisiones, gastos y ganancia real |
| `artivo/payments.py` | Interfaz de proveedor y adaptador simulado |
| `artivo/api.py` | Rutas y autorización por rol/participante |
| `web/` | Interfaz conectada a la API; sin datos de negocio hardcodeados |
| `tests/` | Casos de dominio y pruebas HTTP con base temporal |

La información financiera se consulta solo por su propietario. Las rutas de conversación y reservas comprueban participantes. Las contraseñas usan PBKDF2-SHA256 con sal aleatoria y 600,000 iteraciones; los tokens de sesión y recuperación se almacenan hasheados. Las cookies son HttpOnly y SameSite=Strict. Las escrituras requieren JSON y comprueban origen. La UI escapa el texto de usuarios y la CSP bloquea scripts externos.

## Pruebas

```sh
python3 -m unittest discover -s tests -v
python3 scripts/build_site.py
node --test tests/test_demo.cjs
node --check web/app.js
```

Incluyen el ciclo completo, permisos, disponibilidad, aceptación concurrente mediante HTTP, pagos y finalización repetidos, contraofertas, reembolsos, disputas, reseñas, recuperación, suspensión, intentos de modificar comisión/estado desde cliente y bloqueos de origen.

## Configuración

| Variable | Valor por defecto | Uso |
|---|---|---|
| `PORT` | `8000` | Puerto HTTP |
| `ARTIVO_HOST` | `127.0.0.1` | Interfaz de escucha |
| `ARTIVO_DB` | `data/artivo.sqlite3` | Ruta de base de datos |
| `ARTIVO_DEMO` | `1` | Datos y pagos de demostración; usar `0` para desactivarlos |
| `ARTIVO_SECURE_COOKIE` | `0` | Usar `1` detrás de HTTPS |

Para una base nueva sin cuentas de demostración:

```sh
ARTIVO_DEMO=0 ARTIVO_DB=data/live.sqlite3 python3 server.py
```

Crear un administrador para esa base desde otra terminal; la contraseña se pide sin mostrarla:

```sh
ARTIVO_DB=data/live.sqlite3 python3 manage.py create-admin --email admin@example.com --name Administrador
```

Desactivar el modo demo no elimina cuentas ya existentes. Usar una base nueva. Los botones demo y el pago de prueba desaparecen; las operaciones financieras quedan deshabilitadas hasta conectar un proveedor.

## Alcance y próximos pasos

Este MVP funciona localmente y demuestra el ciclo completo con pagos simulados. **No procesa cobros ni retiros reales y no está listo para desplegar como servicio de producción.**

Para operar con dinero real se necesita un proveedor con checkout alojado, webhooks verificados, idempotencia externa, reconciliación, payouts y manejo de fallos. No se solicitan ni almacenan datos de tarjetas. La recuperación de contraseña funciona en modo demo con un token temporal abierto en la misma interfaz; fuera de demo queda deshabilitada hasta conectar correo transaccional.

El matching inicial utiliza ciudad, categoría, disponibilidad, presupuesto, rating y servicios completados. El radio se guarda en el perfil; el backend no tiene GPS ni cálculo de distancia real; la extensión Pages tiene GPS y distancias simuladas. Business comparte las capacidades del cliente y dispone de su dashboard; equipos, facturas y recurrencias están simulados en Pages; su integración con el backend queda para una fase posterior. El perfil admite una foto y enlace a video. El feed social ya permite publicaciones e interacciones; el backend todavía no tiene carga de archivos multimedia; la demo Pages admite archivos locales de hasta 8 MB. El chat inicial es de texto y actualización manual. Las reseñas iniciales son cliente → artista. Los reportes incluyen perfiles, publicaciones, reservas y mensajes a nivel API; la UI permite reportar perfiles y publicaciones y abrir disputas. Push, cotizaciones, contratos, retiros y analítica avanzada quedan pendientes.

Para producción: migrar de `http.server` a un servidor de aplicación apropiado y una base como PostgreSQL, agregar migraciones versionadas, respaldos, TLS, correo, almacenamiento multimedia, observabilidad y límites distribuidos. La separación actual facilita esa evolución; SQLite y el rate limiter en memoria son adecuados para esta ejecución local, no para 100,000 usuarios.
