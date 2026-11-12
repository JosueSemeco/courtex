# CourtEX

Plataforma para entrenadores de baloncesto: plantilla, rutinas de entrenamiento, asistencia y
evaluación, estadísticas de partido en vivo desde la cancha, calendario con recordatorios y
dashboards de partido, jugador y equipo.

El diseño completo, con las decisiones y sus porqués, está en
`docs/superpowers/specs/2026-11-11-courtex-design.md`.

## Estado

| Módulo | Estado |
|---|---|
| Andamiaje, PWA y pantalla de acceso | Hecho |
| Autenticación contra Supabase | Hecho |
| Identidad y tenencia: equipos, roles, invitaciones, propiedad | Hecho y verificado |
| Roster (jugadores con datos de scouting) | Esquema y reglas hechos · **falta la pantalla** |
| Calendario y rutinas | Pendiente |
| Asistencia y evaluaciones | Pendiente |
| Partido en vivo con offline multi-dispositivo | Pendiente |
| Dashboards | Pendiente |
| Recordatorios (correo y Telegram) | Pendiente |

## Stack

- **Front**: React 19 + Vite 8 + TypeScript 7, Tailwind 4, Zod 4.
- **Backend**: Supabase — Postgres con RLS, Auth, Storage. Sin servidor propio.
- **Auth**: `@supabase/supabase-js`, con un adaptador local de respaldo cuando faltan las
  variables de entorno.
- **Gestor de paquetes**: pnpm vía `corepack` (npm no está instalado en el sistema).

## Cómo correrlo

```bash
cd ~/Systems/courtex
corepack pnpm@9 install
corepack pnpm@9 dev -- --host 127.0.0.1 --port 5180
```

- App: http://127.0.0.1:5180
- Build de producción: `corepack pnpm@9 build` (ejecuta `tsc --noEmit` antes de Vite).

## Variables de entorno

`.env.local`, ignorado por git. `.env.example` documenta las claves.

| Variable | Contenido |
|---|---|
| `VITE_SUPABASE_URL` | `https://tu-proyecto.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clave publicable (`sb_publishable_…`) |

La clave publicable es pública por diseño: RLS es lo que protege los datos. La clave de servicio
nunca va al front ni al repositorio.

Sin variables, la app usa el adaptador local (localStorage + SHA-256) para no bloquear el
desarrollo de la interfaz.

## Base de datos

Proyecto Supabase `tu-proyecto`. Las migraciones viven en `supabase/migrations/` y se
aplican **a mano** en el SQL Editor del dashboard, en orden. No hay Docker en la máquina para
levantar Supabase local ni se usa la clave de servicio.

| Archivo | Contenido |
|---|---|
| `0001_init.sql` | `profiles`, `teams`, `team_members`; RLS; `create_team()` |
| `0002_membership.sql` | Propiedad, invitaciones por correo, archivo lógico, `my_teams()` |
| `0003_claim_invites.sql` | Enlace de invitaciones al iniciar sesión; limpia el trigger |
| `0004_players.sql` | `players`, `player_consents`, vista `roster` |

### Reglas que impone la base

- **Aislamiento por equipo.** Toda tabla lleva `team_id` y RLS decide con `is_team_member()` y
  `has_team_role()`, ambas `security definer` para no recursar sobre `team_members`.
- **Un equipo siempre tiene dueño y al menos un entrenador activo.** Lo imponen la clave foránea
  de `teams.created_by` y el trigger `ensure_team_has_coach`.
- **Borrado de cuenta con equipos: bloqueado.** Primero `transfer_ownership()` o
  `archive_team()`. El archivo es lógico (`deleted_at`), no físico.
- **Invitaciones sin cuenta.** La membresía se crea con el correo; se activa al iniciar sesión
  (`claim_invites()`, que el adaptador llama solo). No requiere que el invitado tenga cuenta
  todavía.
- **La foto de un menor exige consentimiento.** Un trigger impone la regla del artículo 65 de la
  LOPNNA: sin un `player_consents` de tipo `image` vigente, guardar `photo_url` falla con
  `minor_photo_requires_guardian_consent`. Orden obligatorio: ficha → consentimiento → foto.
- **Dorsal único entre activos.** Dos jugadores no comparten número en la misma planilla, pero el
  número se libera al archivar o dar de baja.
- **`is_minor` no se almacena.** Se calcula con `is_minor(birth_date)`; una bandera guardada
  mentiría el día del cumpleaños 18.

### Funciones expuestas (RPC)

| Función | Para qué | Quién |
|---|---|---|
| `create_team(name, category, season)` | Crea equipo + membresía de entrenador en una transacción | Autenticado |
| `invite_member(team, email, role)` | Invita por correo, con o sin cuenta existente | Entrenador |
| `claim_invites()` | Activa las invitaciones de mi correo | Autenticado |
| `transfer_ownership(team, user)` | Cede el equipo y baja al antiguo dueño a subentrenador | Entrenador |
| `archive_team(team)` | Borrado lógico | Entrenador |
| `my_teams()` | Mis equipos con mi rol | Autenticado |

### Interruptores de correo

En *Authentication → Providers → Email* hay dos ajustes que no son lo mismo:

- **Enable email provider**: debe estar **encendido**. Apagarlo bloquea el registro con
  `email_provider_disabled`.
- **Confirm email**: hoy **apagado** para poder probar sin SMTP. **Antes de lanzar** hay que
  encenderlo y configurar un dominio propio con Resend.

## Estructura

```
src/
  assets/                 cancha y balón (ver CREDITS.md)
  components/             campos y botón de envío
  features/auth/          pantalla, panel de cancha y formularios
  lib/auth.ts             adaptador (Supabase o local) y traducción de errores
  lib/supabase.ts         cliente
  styles/index.css        tokens, cancha, transición y responsive
supabase/migrations/      esquema, en orden
docs/superpowers/         diseño aprobado y plan del módulo 0
```

## Verificación hecha hasta ahora

- `corepack pnpm@9 build` sin errores; detector de diseño sin hallazgos.
- Lighthouse: accesibilidad 100, buenas prácticas 100.
- Aislamiento probado con dos cuentas reales: lectura cruzada, `INSERT` (403 de RLS), `PATCH` y
  `DELETE` (200 con cero filas afectadas), y `Prefer: return=representation` para no confundir
  "sin permiso" con "sin cambios".
- Traspaso de propiedad, bloqueo del último entrenador, invitación sin cuenta, enlace al
  registrarse, enlace al iniciar sesión y archivo lógico: probados contra el proyecto real.
- Roster: dorsal duplicado (409), foto de menor sin consentimiento (rechazada), foto tras
  registrar el consentimiento (aceptada), consentimiento de otro equipo (rechazado por FK),
  jugador raso que intenta crear (403), subentrenador que borra (0 filas), entrenador que borra
  (1 fila), aislamiento entre equipos y `roster` con `is_minor`/`age_years` correctos.

## Deuda conocida

- **Sin pruebas automatizadas.** La verificación es manual contra la base; el primer lugar donde
  hacen falta es la lógica de agregación de estadísticas.
- **Bundle de 532 kB (152 kB gzip)** por `supabase-js`. Conviene cargarlo por demanda cuando
  exista el panel.
- **Sin CI.** Cloudflare Pages + GitHub Actions está decidido, no configurado.
- **Correo sin dominio propio.** Bloquea los recordatorios reales.
- **Datos de prueba** en el proyecto (`verificacion-*`, `jugador-*`, equipos "Roster Test" y
  "UI Test"). Se limpian desde el dashboard.

## Créditos

Cancha y balón: ver `CREDITS.md`. Cancha de Jenspo (CC BY 3.0), balón de Font Awesome Free
(CC BY 4.0).
