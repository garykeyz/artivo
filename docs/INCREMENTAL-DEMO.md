# ARTI — continuación incremental, octubre 2026

La ampliación conserva Python/SQLite, el adaptador Pages, los archivos originales y los flujos históricos. No hay servicios financieros, GPS, certificación ni alojamiento de media de producción. GitHub Pages ejecuta una demo por navegador, sin sincronización entre visitantes.

## Roles y orientación

Cliente, artista/profesional, líder, empresa, agencia y administrador tienen navegación, encabezado, acciones y permisos distintos. Todos comparten el feed, descubrimiento, mensajes y ayuda. `arti-access.js` define una sola política reutilizada por navegación, rutas y dominio. Las finanzas personales no muestran crédito global, factoring ni administración.

La tutoría guarda usuario, rol, módulo, estado y paso. Se puede pausar, continuar, omitir con confirmación, completar y reiniciar desde Ayuda. ARTI Journal incluye orientación por módulo. Cambiar personaje permite probar las 73 identidades sintéticas; nunca concede acceso real a cuentas externas.

## Red de talento

El seed nuevo contiene 58 perfiles, 22 categorías y 397 registros de taxonomía: categorías, especialidades, habilidades, servicios, equipo, certificaciones y tipos de evento. Incluye todos los nuevos colectivos solicitados, además de músicos, bandas, líderes y agencias originales. Hay 101 oportunidades, 200 eventos y 81 facturas iniciales. Los conteos crecen al interactuar.

La taxonomía se crea, edita, ordena y deshabilita desde Admin. Perfiles admiten múltiples disciplinas, tarifas estructuradas, experiencia, idiomas, equipo y disponibilidad. Los documentos comienzan pendientes; únicamente Admin puede marcarlos verificados dentro del demo. Las referencias documentales privadas no aparecen en perfiles públicos.

Los contratos técnicos conservan hora de llamada y fases load-in, montaje, soundcheck, ready y strike. El matching valida disciplina, habilidades, disponibilidad y documentación sensible. Los paquetes generan plazas por profesión: FOH y monitores requieren dos personas distintas; 30 profesionales × 20 fechas produce 600 plazas. No implica que todas estén ya asignadas. Los mensajes internos permiten coordinar cualquier disciplina sin depender de una reserva histórica.

## Cobros, ingresos y liquidaciones

`arti-payments.js` extiende el dominio existente. Una reserva protegida requiere pago previo o crédito demo aprobado. El pago del cliente puede estar confirmado mientras el ingreso del profesional sigue pendiente. El servicio verificado libera el ingreso; las liquidaciones son semanales (martes), quincenales o mensuales. Admin puede crear batches, simular procesamiento, fallo, reintento y pago.

Fast Pay muestra un quote antes de confirmar. El ejemplo inicial de US$250 menos 4% de plataforma libera US$240; Fast Pay descuenta US$15 y muestra US$225. Un ingreso retenido, disputado o reservado en un batch activo no puede cobrarse por Fast Pay. Referencias únicas evitan duplicar pago, ingreso, cancelación, refund y payout. Los importes internos usan unidades menores y se separan por moneda.

Los tramos de comisión se basan en volumen configurable: START 6%, GROW 5%, PRO 4%, SCALE 3.5%, STRATEGIC 3%. Se conserva una copia de fees y política en cada nuevo contrato. Los acuerdos históricos mantienen sus importes y liquidaciones. Admin distingue cobros, fees de plataforma, Fast Pay, costes y margen demo.

## Un único motor de cancelación

`CancellationPolicyEngine` calcula `event.start − cancellation.created_at` en milisegundos, horas, minutos y segundos. Los timestamps con offset se comparan como instantes; timestamps sin offset se interpretan en la zona del evento/venue, inicialmente America/Santo_Domingo.

| Anticipación exacta | Reembolso | Compensación inicial del proveedor |
|---|---:|---:|
| Más de 168 horas | 100% | 0% |
| 168 horas o menos | 90% | 10% |
| 72 horas o menos | 75% | 25% |
| 24 horas o menos, incluido el mismo día | 50% | 50% |

168h30m recibe 100%; exactamente 168h recibe 90%. No se redondea a días. De hoy a las 15:00 a mañana a las 20:00 hay **29 horas**: el ejemplo de cinco horas usa un intervalo real de cinco horas. No se reproduce la inconsistencia aritmética del prompt.

Antes del checkout se muestra la política y se exige aceptación. Cancelar abre revisión con tiempo restante, regla, precio, refund, compensación, penalización, fee ARTI, procesamiento e impuestos. Confirmar afecta solo la instancia elegida, no las demás fechas de la serie. Una penalización del 50% no es revenue del 50% para ARTI: el pool inicialmente se destina completo al proveedor.

La compensación aparece como `CANCELLATION_COMPENSATION`, separada del ingreso por servicio completado, con notificación, historial, calendario y payout programado. Los beneficiarios de un paquete pueden distribuirla con participaciones que suman 100%, conservando el centavo residual. Una disputa guarda copia del cálculo, fechas, regla y transacción y retiene los fondos pendientes. Fuerza mayor pasa a revisión manual; la cancelación del proveedor genera refund completo y un incidente de sustitución/revisión, sin aplicar automáticamente una sanción reputacional arbitraria.

Las reservas del flujo anterior también consultan este motor al cancelar; la API Python original permanece preservada para su aplicación local. El ledger de cancelación incluye booking, evento, pago, cancelación y distribución equilibrada. Las reglas se editan en Admin → Configuración. Las reservas existentes conservan su copia de reglas.

## Archivos, privacidad y proveedores

`arti-media.js` define ObjectStorageProvider, VideoStreamingProvider y CDNProvider, con adaptadores locales sustituibles. Los bytes de archivos nuevos se guardan como Blob en **otro almacén IndexedDB**, fuera del JSON de negocio. El dominio guarda metadata, clave, MIME, tamaño, duración cuando está disponible, thumbnail, estado y visibilidad. Los object URLs se resuelven al renderizar; no se persisten como bytes ni base64 en el estado de negocio.

Visibilidades: público, seguidores, privado, empresa, booking, equipo y admin. El acceso a metadata y las consultas del feed comprueban rol/participantes. Documentos de perfiles se ocultan a terceros. Los límites iniciales son 8 MB y 180 segundos; Admin puede cambiarlos. Fotos, MP4/WebM/MOV, audio y PDF tienen presentación acorde. No hay transcoding, antivirus, CDN pública, verificación documental ni reproducción MOV garantizados; las interfaces están preparadas para conectar proveedores posteriores.

El aislamiento es funcional dentro de una demo pública. No constituye seguridad de producción: el visitante controla su navegador y puede cambiar entre identidades demo. Archivos locales tampoco se comparten por el enlace Pages.

## Recorrido de presentación

1. Entrar como Cliente. Abrir la reserva de piano, revisar política, aceptar y simular el pago.
2. Entrar como Artista. Ver ingresos semanales y abrir Fast Pay para revisar fee/neto antes de confirmar.
3. Entrar como Empresa. Publicar demanda o negociar fechas y condiciones; comprobar el crédito demo.
4. Entrar como Líder. Probar FOH + Monitor o el paquete de 600 plazas y asignar personas disponibles.
5. Descubrir → Audio / Lighting / Dance. Revisar disciplinas, habilidades y documentación.
6. Escenarios demo → pagos y cancelación → controles Admin. Probar 10 días, 5 días, 2 días, 12 horas y mismo día; mantener o confirmar cada revisión.
7. Admin → Pagos. Ver compensation/refunds separados, batches y estadísticas. Configuración conserva los controles operativos anteriores.
8. Ayuda → tutoría general, guía del rol o Journal. Pausar y recargar para continuar.

## Verificación

`node --test tests/test_*.cjs` y `python3 -m unittest discover -s tests -v`. El workflow valida todos los JS, las pruebas del dominio original y las extensiones antes de publicar Pages. El build crea un seed público independiente, sin contraseñas, tokens, sesiones ni registros de la base privada local.
