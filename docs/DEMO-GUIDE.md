# ARTI — demo para presentar en 5–10 minutos

[Entrada y selección de perspectiva](https://garykeyz.github.io/artivo/?view=demo). Este incremento conserva ARTIVO, el backend Python/SQLite y sus pantallas de feed, perfil, agenda, reservas, mensajes y cartera. La demo pública agrega un dominio con estado dentro del adaptador IndexedDB existente; no reemplaza la arquitectura ni sube datos de SQLite.

## Datos iniciales

58 perfiles de talento, 22 categorías, 5 líderes, 3 agencias, 5 empresas, 10 venues, 101 oportunidades, 200 eventos y 81 facturas. Incluye 7 pagos de bookings protegidos además de los pagos históricos. Incluye acuerdos en negociación, servicios completados, fechas futuras, atraso, ausencias, 3 disputas y ejemplos de crédito, factoring, seguro y Fast Pay. Son datos ficticios. Las acciones crean más registros; **Restaurar demo** vuelve al estado inicial y conserva configuración.

El seed amplía de forma aditiva la copia Pages v2 existente: mantiene publicaciones, likes, gastos y reservas anteriores hasta que el visitante decide restaurar. No hay sincronización entre visitantes; dos pestañas del mismo navegador sí comparten la copia y serializan las escrituras. La cuenta seleccionada es independiente por pestaña. El botón «Cambiar personaje demo» junto al selector permite entrar como cualquiera de las 73 identidades sintéticas, incluidos los integrantes de equipos.

## Recorrido recomendado

1. Entrar como Artista. Abrir Mi perfil: perfil editable, precio DOP histórico, precio USD demo, instrumentos, experiencia, portfolio y clip sintético local. Subir una imagen/video de hasta 8 MB publica contenido en ese navegador. MOV se conserva; su reproducción depende del navegador y no hay transcoding real.
2. En **Escenarios demo**, seleccionar **Precio y horario**. Seleccionar la fecha y aplicar con US$300, 21:00–01:00 y transporte incluido. Se crea una negociación y una retención de 15 minutos con contador.
3. Cambiar a Empresa. ARTI · Operación → Negociaciones → abrir la propuesta → ofrecer US$275. Cambiar a Artista y aceptar. El contrato y los eventos conservan tarifa, horario y condiciones. Calendario permite recorrer los meses y abrir eventos.
4. Abrir evento → Simular llegada → Subir evidencia de ejemplo. Cambiar a Empresa y Verificar setup. Artista inicia y completa; Empresa verifica servicio. Se genera una factura única con NET 90 y fecha de vencimiento.
5. Empresa o proveedor puede simular financiación y seguro. Proveedor simula Fast Pay: se muestra comisión, coste de factoring y fee. **Cobrar anticipadamente no marca como pagada la cuenta por cobrar a la empresa**. Al simular después el pago empresarial, se cierra la cuenta y el partner sin duplicar payout.
6. Seleccionar **Líder y equipo**. Se abre la perspectiva Líder y una serie de 20 fechas. Aplicar con el equipo, negociar y aceptar como Empresa. Líder asigna intérpretes; el selector muestra AVAILABLE/CONFLICT y distancia ficticia. Los conflictos también consideran reservas del motor original y la llegada anticipada. Los nuevos miembros se invitan y aceptan desde su propia perspectiva.
7. Seleccionar **Ausencia y sustitución**. Se prepara un evento NO_SHOW y abre Empresa; elegir candidato disponible y Asignar sustituto cambia intérprete y estado. En **Llegada tarde**, simular retraso crea advertencia de 17 minutos y una penalización propuesta revisable; Abrir disputa detiene el flujo hasta revisión Admin.
8. Entrar como Agencia para publicar demanda, enviar propuestas, asignar artistas y consultar comisiones de las operaciones en que participa. Entrar como Admin → Administración para métricas, reglas, disputas y audit. El panel original sigue accesible para usuarios, suspensiones y reportes.
9. Admin puede usar **Siguiente estado · presentador** para recorrer el ciclo sin esperar fechas reales. **Adelantar reloj 15 min** modifica el reloj ficticio del evento, sin alterar su horario contratado ni el reloj del sistema.
10. Escenarios → Restaurar demo pide una confirmación visual y restaura únicamente datos de muestra de este navegador.

## Providers y persistencia

`web/arti-domain.js`: modelos y reglas, seedDemoData, validación de participantes, acuerdos, calendarios, facturas y ledger. Interfaces PaymentProvider, FinancingProvider, InsuranceProvider, MediaStorageProvider, NotificationProvider y GeolocationProvider tienen implementaciones Mock. No hay datos de tarjetas, GPS real, pólizas reales ni dinero real. El servicio media devuelve metadatos y referencias a assets; para archivos demo pequeños usa IndexedDB, nunca SQL. Producción necesitará object storage, CDN, antivirus y procesamiento.

`web/arti-ui.js`: interfaz, formularios, command center, calendario, equipos, facturas, Journal y doce escenarios. `web/demo.js` conserva su motor original y enruta los módulos nuevos dentro de la misma transacción IndexedDB. Fallar una validación aborta toda la escritura; aceptar múltiples fechas es atómico. El ledger se equilibra por moneda y utiliza referencias únicas. Configuración de comisiones, fees, retenciones, llegada y geozona es editable por Admin; una reserva conserva la comisión acordada.

`ARTI_DEMO_MODE=true` se configura en el empaquetado Pages; con `false` el adaptador demo queda desactivado. Esto no activa proveedores reales. El backend original conserva `ARTIVO_DEMO` y sus controles de sesiones. Las pantallas operativas nuevas son una extensión **del demo Pages**, no nuevos servicios de producción en Python.

## Seed y ejecución

```sh
python3 scripts/build_site.py
node scripts/seed_demo.cjs
# Opcional: exportar una fixture nueva, sin datos del navegador ni de SQLite.
node scripts/seed_demo.cjs --output /tmp/arti-demo-fixture.json
python3 -m http.server 8001 --bind 127.0.0.1 --directory dist
```

El clip original sintético se reproduce con `swift scripts/generate_demo_media.swift web/demo-performance.mp4` en macOS. No se descarga material audiovisual externo ni se afirma que el clip muestre a una persona real.

## Límites explícitos

La factura descargable es HTML marcado DEMO y puede imprimirse a PDF; no tiene validez fiscal. El navegador interno puede tratar descargas de forma diferente a Chrome/Safari. Los usuarios, reputación, distancias, verificación, crédito y riesgos son ficticios. El flujo financiero sirve para explicar el producto, no como implementación bancaria ni contabilidad regulatoria. No hay KYC, MFA, escaneo, streaming adaptativo, GPS antifraude ni acuerdos jurídicos reales. La [arquitectura A–Z](architecture/ARTI-ARCHITECTURE.md) describe la evolución posterior y distingue el diseño futuro de lo implementado.

## Continuación actual

[Roles, talento universal, payouts, cancelación exacta y archivos](INCREMENTAL-DEMO.md). Incluye el recorrido de cliente, profesionales técnicos, paquetes, política oficial y controles de demostración.
