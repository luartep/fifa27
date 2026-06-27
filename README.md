# Mundial 2026 — Panel de Mercados

Aplicación web para seguir los partidos del Mundial 2026, comparar cuotas
de casas de apuestas, calcular valor con un modelo propio, y simular
apuestas con banca virtual. Construida con Next.js 14 + Postgres (Neon) +
Drizzle ORM, pensada para desplegarse en Vercel.

## Qué incluye

- **Calendario completo** del torneo: fase de grupos (11-27 jun) + bracket
  eliminatorio completo hasta la Final (19 jul, MetLife Stadium). Todas las
  horas se muestran en **hora de Chile** (America/Santiago).
- **Scraping propio de Oddschecker** corriendo en un cron job, guardando
  histórico de cuotas en la base de datos.
- **Motor de valor**: compara nuestra probabilidad estimada contra la
  implícita en la cuota de mercado, con criterio de Kelly fraccionado y
  moderado (15%, tope 3% de banca por partido).
- **Motor de aprendizaje**: rastrea, por tipo de mercado (1X2, Over/Under,
  Ambos Anotan), qué tan seguido acertó en partidos ya finalizados, y
  ajusta la confianza de futuras recomendaciones.
- **Modo simulación de apuestas**: banca virtual, historial de apuestas,
  liquidación automática cuando un partido termina.
- **Login simple**: un solo usuario fijo (`apuesta` / `apuesta`), sin
  necesidad de un proveedor de auth externo.

## Arquitectura en una página

```
Vercel Cron (cada 5 min, requiere plan Pro — ver nota abajo)
        │
        ▼
/api/scrape  ──▶  lib/scraper.ts (cheerio sobre Oddschecker)
        │               │
        │               ▼
        │        guarda en odds_history + actualiza matches
        ▼
/api/matches (GET) ──▶ Dashboard (polling cada 3 min desde el navegador)
        │
        ▼
/api/bets, /api/bets/settle ──▶ simulated_bets, sim_bankroll
        │
        ▼
lib/learningEngine.ts ──▶ learning_stats (se recalcula cuando un partido termina)
```

## Desplegar en Vercel — paso a paso

### 1. Crear la base de datos

En tu proyecto de Vercel: **Storage** → **Create Database** → **Postgres**
(usa Neon por debajo, el mismo motor que ya conoces de Empapados). Esto
agrega automáticamente la variable `DATABASE_URL` al proyecto.

### 2. Variables de entorno

En **Settings → Environment Variables**, agrega (ver `.env.example`):

| Variable | Cómo generarla |
|---|---|
| `DATABASE_URL` | Se rellena sola al crear la base de datos (paso 1) |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `CRON_SECRET` | `openssl rand -base64 32` |

### 3. Migrar el esquema y cargar el calendario

Desde tu máquina local (o con `vercel env pull` para traer las variables):

```bash
npm install
npx drizzle-kit push          # crea las tablas en la base de datos
npm run db:seed                # carga el calendario completo del Mundial
```

### 4. Conectar el repo a Vercel

Vercel detecta Next.js automáticamente. Solo falta confirmar el deploy.

### 5. Activar el cron de scraping

⚠️ **Importante**: el plan **gratuito (Hobby)** de Vercel limita los cron
jobs a **una ejecución por día**. El archivo `vercel.json` ya está
configurado para `*/5 * * * *` (cada 5 minutos), pero esto requiere
**plan Pro**. Opciones:

- **Si tienes/activas plan Pro**: no necesitas hacer nada más, el cron
  ya está configurado.
- **Si te quedas en Hobby**: cambia el cron a una vez al día, o usa un
  servicio externo gratuito (ej. [cron-job.org](https://cron-job.org)) que
  llame a `https://tu-app.vercel.app/api/scrape` con el header
  `Authorization: Bearer <CRON_SECRET>` cada 5 minutos. El endpoint ya
  está protegido y listo para recibir esas llamadas externas.

El **dashboard en el navegador** igual refresca los datos cada 3 minutos
por su cuenta (polling), independiente del cron — así que aunque el cron
corra cada hora, el usuario nunca ve datos más viejos que la última corrida
del cron, y el frontend no se queda pegado esperando.

## Actualizar resultados de partidos

El scraper de Oddschecker trae **cuotas**, no marcadores en vivo confiables
(es un comparador de casas de apuestas, no un live-score). Para marcar un
resultado:

```bash
curl -X PATCH https://tu-app.vercel.app/api/matches \
  -H "Content-Type: application/json" \
  -d '{"externalId": "g-senegal-iraq", "homeScore": 2, "awayScore": 1}'
```

Esto dispara automáticamente: recálculo del motor de aprendizaje +
liquidación de apuestas simuladas pendientes de ese partido.

Si más adelante quieres automatizar esto también, lo natural es agregar
un segundo scraper apuntando a un marcador en vivo (ej. una página de
resultados de ESPN o ScoreBat) y llamar a este mismo PATCH internamente.

## Actualizar el bracket eliminatorio

`db/seed.ts` incluye la Ronda de 32 en adelante con nombres placeholder
("Ganador Grupo X", "Por definir") porque los cruces reales no se conocen
hasta que termina la fase de grupos (27 jun) y, en niveles posteriores,
hasta que se resuelve cada ronda previa. Cuando se confirmen los cruces:

1. Edita los `homeTeam`/`awayTeam` correspondientes en `db/seed.ts`.
2. Vuelve a correr `npm run db:seed` (usa `onConflictDoUpdate`, así que
   es seguro re-ejecutarlo sin duplicar partidos).

## Mantenimiento del scraper

Oddschecker puede cambiar su HTML/clases sin avisar. Si `/api/scrape`
empieza a devolver muchos `status: "error"` en su respuesta JSON, lo
primero que hay que revisar es `lib/scraper.ts` → función `parseMatchOdds`,
ajustando los selectores CSS según la estructura actual de la página.

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # y rellena los valores
npm run dev
```

Abre `http://localhost:3000`, inicia sesión con `apuesta` / `apuesta`.
