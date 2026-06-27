import { config } from "dotenv";
import { existsSync } from "fs";

// IMPORTANTE: los imports estáticos de ES Modules se "hoistean" (se ejecutan
// antes que cualquier otro código del archivo, sin importar el orden en que
// aparezcan escritos). lib/db.ts lee process.env.DATABASE_URL apenas se
// importa, así que si lo importáramos de forma estática arriba, se
// ejecutaría ANTES de que dotenv cargue el .env.local, y fallaría.
// Por eso cargamos las variables de entorno primero, y recién después
// hacemos un import() dinámico de lib/db y db/schema.
if (existsSync(".env.local")) config({ path: ".env.local" });
else if (existsSync(".env")) config();

/**
 * Seed del calendario COMPLETO del Mundial 2026, incluyendo:
 *   - Fase de grupos (11-27 junio) — partidos con equipos reales conocidos.
 *   - Ronda de 32 (28 jun - 3 jul) — placeholders "Ganador Grupo X" hasta
 *     que se sepan los cruces reales (se actualizan a mano o con un script
 *     aparte una vez termine la fase de grupos).
 *   - Octavos (4-7 jul), Cuartos (9-11 jul), Semis (14-15 jul),
 *     Tercer puesto (18 jul) y Final (19 jul, MetLife Stadium).
 *
 * Todas las horas se guardan en UTC. La conversión a hora de Chile
 * (America/Santiago) se hace en el cliente vía lib/chileTime.ts.
 *
 * Para correr: npm run db:seed
 */

type SeedMatch = {
  externalId: string;
  group: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  venue: string;
  kickoffUtc: string; // ISO 8601 en UTC
  oddscheckerUrl?: string;
  status?: "scheduled" | "finished";
  homeScore?: number;
  awayScore?: number;
};

const GROUP_STAGE: SeedMatch[] = [
  // --- Ya jugados (resultados reales, para que el panel de aprendizaje tenga histórico desde el día 1) ---
  { externalId: "g-mexico-sudafrica", group: "Grupo A", homeTeam: "México", awayTeam: "Sudáfrica", homeFlag: "🇲🇽", awayFlag: "🇿🇦", venue: "Estadio Azteca, Ciudad de México", kickoffUtc: "2026-06-11T20:00:00Z", status: "finished", homeScore: 2, awayScore: 0 },
  { externalId: "g-corea-chequia", group: "Grupo A", homeTeam: "Corea del Sur", awayTeam: "Chequia", homeFlag: "🇰🇷", awayFlag: "🇨🇿", venue: "Estadio Guadalajara", kickoffUtc: "2026-06-12T02:00:00Z", status: "finished", homeScore: 1, awayScore: 2 },
  { externalId: "g-canada-bosnia", group: "Grupo B", homeTeam: "Canadá", awayTeam: "Bosnia y Herz.", homeFlag: "🇨🇦", awayFlag: "🇧🇦", venue: "BMO Field, Toronto", kickoffUtc: "2026-06-12T19:00:00Z", status: "finished", homeScore: 1, awayScore: 1 },
  { externalId: "g-eeuu-paraguay", group: "Grupo D", homeTeam: "EE.UU.", awayTeam: "Paraguay", homeFlag: "🇺🇸", awayFlag: "🇵🇾", venue: "SoFi Stadium, Los Ángeles", kickoffUtc: "2026-06-13T01:00:00Z", status: "finished", homeScore: 4, awayScore: 1 },
  { externalId: "g-qatar-suiza", group: "Grupo B", homeTeam: "Qatar", awayTeam: "Suiza", homeFlag: "🇶🇦", awayFlag: "🇨🇭", venue: "Levi's Stadium, San Francisco", kickoffUtc: "2026-06-13T16:00:00Z", status: "finished", homeScore: 1, awayScore: 1 },
  { externalId: "g-brasil-marruecos", group: "Grupo C", homeTeam: "Brasil", awayTeam: "Marruecos", homeFlag: "🇧🇷", awayFlag: "🇲🇦", venue: "MetLife Stadium, Nueva Jersey", kickoffUtc: "2026-06-13T19:00:00Z", status: "finished", homeScore: 1, awayScore: 1 },
  { externalId: "g-escocia-haiti", group: "Grupo C", homeTeam: "Escocia", awayTeam: "Haití", homeFlag: "🏴", awayFlag: "🇭🇹", venue: "Gillette Stadium, Boston", kickoffUtc: "2026-06-14T01:00:00Z", status: "finished", homeScore: 1, awayScore: 0 },
  { externalId: "g-australia-turquia", group: "Grupo D", homeTeam: "Australia", awayTeam: "Turquía", homeFlag: "🇦🇺", awayFlag: "🇹🇷", venue: "BC Place, Vancouver", kickoffUtc: "2026-06-14T04:00:00Z", status: "finished", homeScore: 2, awayScore: 0 },
  { externalId: "g-alemania-curazao", group: "Grupo E", homeTeam: "Alemania", awayTeam: "Curazao", homeFlag: "🇩🇪", awayFlag: "🇨🇼", venue: "Estadio Houston", kickoffUtc: "2026-06-14T16:00:00Z", status: "finished", homeScore: 7, awayScore: 1 },
  { externalId: "g-holanda-japon", group: "Grupo F", homeTeam: "Países Bajos", awayTeam: "Japón", homeFlag: "🇳🇱", awayFlag: "🇯🇵", venue: "AT&T Stadium, Dallas", kickoffUtc: "2026-06-14T19:00:00Z", status: "finished", homeScore: 2, awayScore: 2 },
  { externalId: "g-suecia-tunez", group: "Grupo F", homeTeam: "Suecia", awayTeam: "Túnez", homeFlag: "🇸🇪", awayFlag: "🇹🇳", venue: "Estadio Monterrey", kickoffUtc: "2026-06-14T22:00:00Z", status: "finished", homeScore: 5, awayScore: 1 },
  { externalId: "g-civ-ecuador", group: "Grupo E", homeTeam: "Costa de Marfil", awayTeam: "Ecuador", homeFlag: "🇨🇮", awayFlag: "🇪🇨", venue: "Lincoln Financial Field, Filadelfia", kickoffUtc: "2026-06-15T01:00:00Z", status: "finished", homeScore: 1, awayScore: 0 },
  { externalId: "g-espana-caboverde", group: "Grupo H", homeTeam: "España", awayTeam: "Cabo Verde", homeFlag: "🇪🇸", awayFlag: "🇨🇻", venue: "Estadio Atlanta", kickoffUtc: "2026-06-15T16:00:00Z", status: "finished", homeScore: 0, awayScore: 0 },
  { externalId: "g-belgica-egipto", group: "Grupo G", homeTeam: "Bélgica", awayTeam: "Egipto", homeFlag: "🇧🇪", awayFlag: "🇪🇬", venue: "SoFi Stadium, Los Ángeles", kickoffUtc: "2026-06-15T19:00:00Z", status: "finished", homeScore: 1, awayScore: 1 },
  { externalId: "g-arabia-uruguay", group: "Grupo H", homeTeam: "Arabia Saudita", awayTeam: "Uruguay", homeFlag: "🇸🇦", awayFlag: "🇺🇾", venue: "Hard Rock Stadium, Miami", kickoffUtc: "2026-06-15T22:00:00Z", status: "finished", homeScore: 1, awayScore: 1 },
  { externalId: "g-iran-nz", group: "Grupo G", homeTeam: "Irán", awayTeam: "Nueva Zelanda", homeFlag: "🇮🇷", awayFlag: "🇳🇿", venue: "BC Place, Vancouver", kickoffUtc: "2026-06-16T01:00:00Z", status: "finished", homeScore: 2, awayScore: 2 },
  { externalId: "g-francia-senegal", group: "Grupo I", homeTeam: "Francia", awayTeam: "Senegal", homeFlag: "🇫🇷", awayFlag: "🇸🇳", venue: "MetLife Stadium, Nueva Jersey", kickoffUtc: "2026-06-16T19:00:00Z", status: "finished", homeScore: 3, awayScore: 1 },
  { externalId: "g-iraq-noruega", group: "Grupo I", homeTeam: "Iraq", awayTeam: "Noruega", homeFlag: "🇮🇶", awayFlag: "🇳🇴", venue: "Gillette Stadium, Boston", kickoffUtc: "2026-06-16T22:00:00Z", status: "finished", homeScore: 1, awayScore: 4 },
  { externalId: "g-argentina-argelia", group: "Grupo J", homeTeam: "Argentina", awayTeam: "Argelia", homeFlag: "🇦🇷", awayFlag: "🇩🇿", venue: "Arrowhead Stadium, Kansas City", kickoffUtc: "2026-06-17T02:00:00Z", status: "finished", homeScore: 3, awayScore: 0 },
  { externalId: "g-austria-jordania", group: "Grupo J", homeTeam: "Austria", awayTeam: "Jordania", homeFlag: "🇦🇹", awayFlag: "🇯🇴", venue: "Levi's Stadium, San Francisco", kickoffUtc: "2026-06-17T05:00:00Z", status: "finished", homeScore: 3, awayScore: 1 },
  { externalId: "g-portugal-congo", group: "Grupo K", homeTeam: "Portugal", awayTeam: "Congo DR", homeFlag: "🇵🇹", awayFlag: "🇨🇩", venue: "Estadio Houston", kickoffUtc: "2026-06-17T17:00:00Z", status: "finished", homeScore: 1, awayScore: 1 },
  { externalId: "g-inglaterra-croacia", group: "Grupo L", homeTeam: "Inglaterra", awayTeam: "Croacia", homeFlag: "🏴", awayFlag: "🇭🇷", venue: "AT&T Stadium, Arlington", kickoffUtc: "2026-06-17T21:00:00Z", status: "finished", homeScore: 4, awayScore: 2 },
  { externalId: "g-ghana-panama", group: "Grupo L", homeTeam: "Ghana", awayTeam: "Panamá", homeFlag: "🇬🇭", awayFlag: "🇵🇦", venue: "BMO Field, Toronto", kickoffUtc: "2026-06-18T00:00:00Z", status: "finished", homeScore: 1, awayScore: 0 },
  { externalId: "g-uzbekistan-colombia", group: "Grupo K", homeTeam: "Uzbekistán", awayTeam: "Colombia", homeFlag: "🇺🇿", awayFlag: "🇨🇴", venue: "Estadio Ciudad de México", kickoffUtc: "2026-06-18T05:00:00Z", status: "finished", homeScore: 1, awayScore: 3 },
  { externalId: "g-sudafrica-chequia", group: "Grupo A", homeTeam: "Sudáfrica", awayTeam: "Chequia", homeFlag: "🇿🇦", awayFlag: "🇨🇿", venue: "Estadio Atlanta", kickoffUtc: "2026-06-18T17:00:00Z", status: "finished", homeScore: 1, awayScore: 1 },
  { externalId: "g-suiza-bosnia", group: "Grupo B", homeTeam: "Suiza", awayTeam: "Bosnia y Herz.", homeFlag: "🇨🇭", awayFlag: "🇧🇦", venue: "SoFi Stadium, Los Ángeles", kickoffUtc: "2026-06-18T20:00:00Z", status: "finished", homeScore: 3, awayScore: 0 },
  { externalId: "g-canada-qatar", group: "Grupo B", homeTeam: "Canadá", awayTeam: "Qatar", homeFlag: "🇨🇦", awayFlag: "🇶🇦", venue: "BC Place, Vancouver", kickoffUtc: "2026-06-18T20:00:00Z", status: "finished", homeScore: 6, awayScore: 0 },
  { externalId: "g-mexico-corea", group: "Grupo A", homeTeam: "México", awayTeam: "Corea del Sur", homeFlag: "🇲🇽", awayFlag: "🇰🇷", venue: "Estadio Guadalajara", kickoffUtc: "2026-06-19T02:00:00Z", status: "finished", homeScore: 1, awayScore: 0 },
  { externalId: "g-eeuu-australia", group: "Grupo D", homeTeam: "EE.UU.", awayTeam: "Australia", homeFlag: "🇺🇸", awayFlag: "🇦🇺", venue: "Lumen Field, Seattle", kickoffUtc: "2026-06-19T19:00:00Z", status: "finished", homeScore: 2, awayScore: 0 },
  { externalId: "g-escocia-marruecos", group: "Grupo C", homeTeam: "Escocia", awayTeam: "Marruecos", homeFlag: "🏴", awayFlag: "🇲🇦", venue: "Gillette Stadium, Boston", kickoffUtc: "2026-06-19T19:00:00Z", status: "finished", homeScore: 0, awayScore: 1 },
  { externalId: "g-brasil-haiti", group: "Grupo C", homeTeam: "Brasil", awayTeam: "Haití", homeFlag: "🇧🇷", awayFlag: "🇭🇹", venue: "Lincoln Financial Field, Filadelfia", kickoffUtc: "2026-06-19T21:30:00Z", status: "finished", homeScore: 3, awayScore: 0 },
  { externalId: "g-turquia-paraguay", group: "Grupo D", homeTeam: "Turquía", awayTeam: "Paraguay", homeFlag: "🇹🇷", awayFlag: "🇵🇾", venue: "Levi's Stadium, San Francisco", kickoffUtc: "2026-06-20T01:00:00Z", status: "finished", homeScore: 0, awayScore: 1 },
  { externalId: "g-holanda-suecia", group: "Grupo F", homeTeam: "Países Bajos", awayTeam: "Suecia", homeFlag: "🇳🇱", awayFlag: "🇸🇪", venue: "Estadio Houston", kickoffUtc: "2026-06-20T17:00:00Z", status: "finished", homeScore: 5, awayScore: 1 },
  { externalId: "g-alemania-civ", group: "Grupo E", homeTeam: "Alemania", awayTeam: "Costa de Marfil", homeFlag: "🇩🇪", awayFlag: "🇨🇮", venue: "BMO Field, Toronto", kickoffUtc: "2026-06-20T20:00:00Z", status: "finished", homeScore: 2, awayScore: 1 },
  { externalId: "g-ecuador-curazao", group: "Grupo E", homeTeam: "Ecuador", awayTeam: "Curazao", homeFlag: "🇪🇨", awayFlag: "🇨🇼", venue: "Lincoln Financial Field, Filadelfia", kickoffUtc: "2026-06-21T00:00:00Z", status: "finished", homeScore: 0, awayScore: 0 },
  { externalId: "g-tunez-japon", group: "Grupo F", homeTeam: "Túnez", awayTeam: "Japón", homeFlag: "🇹🇳", awayFlag: "🇯🇵", venue: "Estadio Monterrey", kickoffUtc: "2026-06-21T04:00:00Z", status: "finished", homeScore: 0, awayScore: 4 },
  { externalId: "g-espana-arabia", group: "Grupo H", homeTeam: "España", awayTeam: "Arabia Saudita", homeFlag: "🇪🇸", awayFlag: "🇸🇦", venue: "Mercedes-Benz Stadium, Atlanta", kickoffUtc: "2026-06-21T16:00:00Z", status: "finished", homeScore: 4, awayScore: 0 },
  { externalId: "g-belgica-iran", group: "Grupo G", homeTeam: "Bélgica", awayTeam: "Irán", homeFlag: "🇧🇪", awayFlag: "🇮🇷", venue: "SoFi Stadium, Inglewood", kickoffUtc: "2026-06-21T19:00:00Z", status: "finished", homeScore: 0, awayScore: 0 },
  { externalId: "g-uruguay-caboverde", group: "Grupo H", homeTeam: "Uruguay", awayTeam: "Cabo Verde", homeFlag: "🇺🇾", awayFlag: "🇨🇻", venue: "Hard Rock Stadium, Miami", kickoffUtc: "2026-06-21T22:00:00Z", status: "finished", homeScore: 2, awayScore: 2 },
  { externalId: "g-nz-egipto", group: "Grupo G", homeTeam: "Nueva Zelanda", awayTeam: "Egipto", homeFlag: "🇳🇿", awayFlag: "🇪🇬", venue: "BC Place, Vancouver", kickoffUtc: "2026-06-22T01:00:00Z", status: "finished", homeScore: 1, awayScore: 3 },
  { externalId: "g-argentina-austria", group: "Grupo J", homeTeam: "Argentina", awayTeam: "Austria", homeFlag: "🇦🇷", awayFlag: "🇦🇹", venue: "AT&T Stadium, Arlington", kickoffUtc: "2026-06-22T17:00:00Z", status: "finished", homeScore: 2, awayScore: 0 },
  { externalId: "g-francia-iraq", group: "Grupo I", homeTeam: "Francia", awayTeam: "Iraq", homeFlag: "🇫🇷", awayFlag: "🇮🇶", venue: "Lincoln Financial Field, Filadelfia", kickoffUtc: "2026-06-22T21:00:00Z", status: "finished", homeScore: 3, awayScore: 0 },
  { externalId: "g-noruega-senegal", group: "Grupo I", homeTeam: "Noruega", awayTeam: "Senegal", homeFlag: "🇳🇴", awayFlag: "🇸🇳", venue: "MetLife Stadium, Nueva Jersey", kickoffUtc: "2026-06-23T00:00:00Z", status: "finished", homeScore: 3, awayScore: 2 },
  { externalId: "g-jordania-argelia", group: "Grupo J", homeTeam: "Jordania", awayTeam: "Argelia", homeFlag: "🇯🇴", awayFlag: "🇩🇿", venue: "Levi's Stadium, Santa Clara", kickoffUtc: "2026-06-23T03:00:00Z", status: "finished", homeScore: 1, awayScore: 2 },

  // --- Por jugar / en curso al momento de este seed (24-27 junio) ---
  { externalId: "g-senegal-iraq", group: "Grupo I", homeTeam: "Senegal", awayTeam: "Iraq", homeFlag: "🇸🇳", awayFlag: "🇮🇶", venue: "BMO Field, Toronto", kickoffUtc: "2026-06-23T19:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-portugal-uzbekistan", group: "Grupo K", homeTeam: "Portugal", awayTeam: "Uzbekistán", homeFlag: "🇵🇹", awayFlag: "🇺🇿", venue: "Estadio Houston", kickoffUtc: "2026-06-23T17:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-inglaterra-ghana", group: "Grupo L", homeTeam: "Inglaterra", awayTeam: "Ghana", homeFlag: "🏴", awayFlag: "🇬🇭", venue: "Gillette Stadium, Foxborough", kickoffUtc: "2026-06-23T20:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-panama-croacia", group: "Grupo L", homeTeam: "Panamá", awayTeam: "Croacia", homeFlag: "🇵🇦", awayFlag: "🇭🇷", venue: "BMO Field, Toronto", kickoffUtc: "2026-06-23T23:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-colombia-congo", group: "Grupo K", homeTeam: "Colombia", awayTeam: "Congo DR", homeFlag: "🇨🇴", awayFlag: "🇨🇩", venue: "Estadio Guadalajara", kickoffUtc: "2026-06-24T02:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },

  { externalId: "g-bosnia-qatar", group: "Grupo B", homeTeam: "Bosnia y Herz.", awayTeam: "Qatar", homeFlag: "🇧🇦", awayFlag: "🇶🇦", venue: "Lumen Field, Seattle", kickoffUtc: "2026-06-24T17:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-suiza-canada", group: "Grupo B", homeTeam: "Suiza", awayTeam: "Canadá", homeFlag: "🇨🇭", awayFlag: "🇨🇦", venue: "BC Place, Vancouver", kickoffUtc: "2026-06-24T17:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-marruecos-haiti", group: "Grupo C", homeTeam: "Marruecos", awayTeam: "Haití", homeFlag: "🇲🇦", awayFlag: "🇭🇹", venue: "Mercedes-Benz Stadium, Atlanta", kickoffUtc: "2026-06-24T20:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-escocia-brasil", group: "Grupo C", homeTeam: "Escocia", awayTeam: "Brasil", homeFlag: "🏴", awayFlag: "🇧🇷", venue: "Hard Rock Stadium, Miami", kickoffUtc: "2026-06-24T20:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-chequia-mexico", group: "Grupo A", homeTeam: "Chequia", awayTeam: "México", homeFlag: "🇨🇿", awayFlag: "🇲🇽", venue: "Estadio Azteca, Ciudad de México", kickoffUtc: "2026-06-25T00:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-sudafrica-corea", group: "Grupo A", homeTeam: "Sudáfrica", awayTeam: "Corea del Sur", homeFlag: "🇿🇦", awayFlag: "🇰🇷", venue: "Estadio Monterrey", kickoffUtc: "2026-06-25T00:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },

  { externalId: "g-curazao-civ", group: "Grupo E", homeTeam: "Curazao", awayTeam: "Costa de Marfil", homeFlag: "🇨🇼", awayFlag: "🇨🇮", venue: "Lincoln Financial Field, Filadelfia", kickoffUtc: "2026-06-25T18:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-ecuador-alemania", group: "Grupo E", homeTeam: "Ecuador", awayTeam: "Alemania", homeFlag: "🇪🇨", awayFlag: "🇩🇪", venue: "MetLife Stadium, Nueva Jersey", kickoffUtc: "2026-06-25T18:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-japon-suecia", group: "Grupo F", homeTeam: "Japón", awayTeam: "Suecia", homeFlag: "🇯🇵", awayFlag: "🇸🇪", venue: "AT&T Stadium, Arlington", kickoffUtc: "2026-06-25T23:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-tunez-holanda", group: "Grupo F", homeTeam: "Túnez", awayTeam: "Países Bajos", homeFlag: "🇹🇳", awayFlag: "🇳🇱", venue: "Sporting KC, Kansas City", kickoffUtc: "2026-06-26T00:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },

  { externalId: "g-turquia-eeuu", group: "Grupo D", homeTeam: "Turquía", awayTeam: "EE.UU.", homeFlag: "🇹🇷", awayFlag: "🇺🇸", venue: "SoFi Stadium, Inglewood", kickoffUtc: "2026-06-26T02:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-paraguay-australia", group: "Grupo D", homeTeam: "Paraguay", awayTeam: "Australia", homeFlag: "🇵🇾", awayFlag: "🇦🇺", venue: "Levi's Stadium, Santa Clara", kickoffUtc: "2026-06-26T02:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-francia-noruega", group: "Grupo I", homeTeam: "Francia", awayTeam: "Noruega", homeFlag: "🇫🇷", awayFlag: "🇳🇴", venue: "Gillette Stadium, Boston", kickoffUtc: "2026-06-26T19:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-senegal-iraq-2", group: "Grupo I", homeTeam: "Senegal", awayTeam: "Iraq", homeFlag: "🇸🇳", awayFlag: "🇮🇶", venue: "BMO Field, Toronto", kickoffUtc: "2026-06-26T19:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },

  { externalId: "g-caboverde-arabia", group: "Grupo H", homeTeam: "Cabo Verde", awayTeam: "Arabia Saudita", homeFlag: "🇨🇻", awayFlag: "🇸🇦", venue: "Estadio Houston", kickoffUtc: "2026-06-27T01:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-uruguay-espana", group: "Grupo H", homeTeam: "Uruguay", awayTeam: "España", homeFlag: "🇺🇾", awayFlag: "🇪🇸", venue: "Estadio Guadalajara", kickoffUtc: "2026-06-27T01:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-egipto-iran", group: "Grupo G", homeTeam: "Egipto", awayTeam: "Irán", homeFlag: "🇪🇬", awayFlag: "🇮🇷", venue: "Lumen Field, Seattle", kickoffUtc: "2026-06-27T04:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-nz-belgica", group: "Grupo G", homeTeam: "Nueva Zelanda", awayTeam: "Bélgica", homeFlag: "🇳🇿", awayFlag: "🇧🇪", venue: "BC Place, Vancouver", kickoffUtc: "2026-06-27T04:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-inglaterra-panama", group: "Grupo L", homeTeam: "Inglaterra", awayTeam: "Panamá", homeFlag: "🏴", awayFlag: "🇵🇦", venue: "MetLife Stadium, Nueva Jersey", kickoffUtc: "2026-06-27T22:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
  { externalId: "g-croacia-ghana", group: "Grupo L", homeTeam: "Croacia", awayTeam: "Ghana", homeFlag: "🇭🇷", awayFlag: "🇬🇭", venue: "Lincoln Financial Field, Filadelfia", kickoffUtc: "2026-06-27T22:00:00Z", oddscheckerUrl: "https://www.oddschecker.com/football/world-cup" },
];

/**
 * Ronda de 32 — los cruces reales dependen de qué equipos clasifican
 * (incluye los 8 mejores terceros). Se deja con nombres placeholder
 * "Ganador Grupo X" / "3ro Grupo X/Y/Z" tal como los anuncia FIFA,
 * y luego de terminar la fase de grupos se debe correr un script
 * de actualización (o hacerlo a mano vía PATCH /api/matches) para
 * reemplazar los nombres por los equipos reales clasificados.
 */
const ROUND_OF_32: SeedMatch[] = [
  { externalId: "r32-m73", group: "Octavos de 32", homeTeam: "Sudáfrica/3ro", awayTeam: "Canadá/3ro", homeFlag: "🏆", awayFlag: "🏆", venue: "Los Angeles Stadium", kickoffUtc: "2026-06-29T01:00:00Z" },
  { externalId: "r32-m74", group: "Octavos de 32", homeTeam: "Alemania", awayTeam: "3ro Grupo A/B/C/D/F", homeFlag: "🇩🇪", awayFlag: "🏆", venue: "Boston Stadium", kickoffUtc: "2026-06-29T20:30:00Z" },
  { externalId: "r32-m75", group: "Octavos de 32", homeTeam: "Países Bajos", awayTeam: "Marruecos", homeFlag: "🇳🇱", awayFlag: "🇲🇦", venue: "Estadio Monterrey", kickoffUtc: "2026-06-30T02:00:00Z" },
  { externalId: "r32-m76", group: "Octavos de 32", homeTeam: "Brasil", awayTeam: "Japón", homeFlag: "🇧🇷", awayFlag: "🇯🇵", venue: "Houston Stadium", kickoffUtc: "2026-06-30T22:00:00Z" },
  { externalId: "r32-m77", group: "Octavos de 32", homeTeam: "Ganador Grupo I", awayTeam: "3ro Grupo C/D/F/G/H", homeFlag: "🏆", awayFlag: "🏆", venue: "New York New Jersey Stadium", kickoffUtc: "2026-07-01T22:00:00Z" },
  { externalId: "r32-m78", group: "Octavos de 32", homeTeam: "Costa de Marfil", awayTeam: "2do Grupo I", homeFlag: "🇨🇮", awayFlag: "🏆", venue: "Dallas Stadium", kickoffUtc: "2026-07-02T18:00:00Z" },
  { externalId: "r32-m79", group: "Octavos de 32", homeTeam: "México", awayTeam: "3ro Grupo C/E/F/H/I", homeFlag: "🇲🇽", awayFlag: "🏆", venue: "Mexico City Stadium", kickoffUtc: "2026-07-03T02:00:00Z" },
  { externalId: "r32-m80", group: "Octavos de 32", homeTeam: "Ganador Grupo L", awayTeam: "3ro Grupo E/H/I/J/K", homeFlag: "🏆", awayFlag: "🏆", venue: "Atlanta Stadium", kickoffUtc: "2026-07-03T17:00:00Z" },
  { externalId: "r32-m81", group: "Octavos de 32", homeTeam: "EE.UU.", awayTeam: "Bosnia y Herz.", homeFlag: "🇺🇸", awayFlag: "🇧🇦", venue: "San Francisco Bay Area Stadium", kickoffUtc: "2026-07-04T01:00:00Z" },
  { externalId: "r32-m82", group: "Octavos de 32", homeTeam: "Ganador Grupo G", awayTeam: "3ro Grupo A/E/H/I/J", homeFlag: "🏆", awayFlag: "🏆", venue: "Seattle Stadium", kickoffUtc: "2026-06-30T21:00:00Z" },
  // Nota: faltan algunos cruces (83-88) que FIFA aún no confirma en fuentes
  // públicas al momento de este seed. Completar cuando se confirme el bracket
  // completo de Ronda de 32 — están al final de la fase de grupos (jun 27-28).
];

const ROUND_OF_16: SeedMatch[] = [
  { externalId: "r16-1", group: "Octavos de Final", homeTeam: "Por definir", awayTeam: "Por definir", homeFlag: "🏆", awayFlag: "🏆", venue: "Houston Stadium", kickoffUtc: "2026-07-04T17:00:00Z" },
  { externalId: "r16-2", group: "Octavos de Final", homeTeam: "Por definir", awayTeam: "Por definir", homeFlag: "🏆", awayFlag: "🏆", venue: "Philadelphia Stadium", kickoffUtc: "2026-07-04T21:00:00Z" },
  { externalId: "r16-3", group: "Octavos de Final", homeTeam: "Por definir", awayTeam: "Por definir", homeFlag: "🏆", awayFlag: "🏆", venue: "Atlanta Stadium", kickoffUtc: "2026-07-07T17:00:00Z" },
  { externalId: "r16-4", group: "Octavos de Final", homeTeam: "Por definir", awayTeam: "Por definir", homeFlag: "🏆", awayFlag: "🏆", venue: "Vancouver, BC Place", kickoffUtc: "2026-07-07T23:00:00Z" },
  // Hasta que termine Ronda de 32, los 8 cruces completos de Octavos no
  // están confirmados. Se completan en la misma pasada de actualización
  // que el bracket de Ronda de 32.
];

const QUARTERFINALS: SeedMatch[] = [
  { externalId: "qf-1", group: "Cuartos de Final", homeTeam: "Por definir", awayTeam: "Por definir", homeFlag: "🏆", awayFlag: "🏆", venue: "Foxborough, Gillette Stadium", kickoffUtc: "2026-07-09T20:00:00Z" },
  { externalId: "qf-2", group: "Cuartos de Final", homeTeam: "Por definir", awayTeam: "Por definir", homeFlag: "🏆", awayFlag: "🏆", venue: "Inglewood, SoFi Stadium", kickoffUtc: "2026-07-10T19:00:00Z" },
  { externalId: "qf-3", group: "Cuartos de Final", homeTeam: "Por definir", awayTeam: "Por definir", homeFlag: "🏆", awayFlag: "🏆", venue: "Miami Gardens, Hard Rock Stadium", kickoffUtc: "2026-07-11T21:00:00Z" },
  { externalId: "qf-4", group: "Cuartos de Final", homeTeam: "Por definir", awayTeam: "Por definir", homeFlag: "🏆", awayFlag: "🏆", venue: "Kansas City, Arrowhead Stadium", kickoffUtc: "2026-07-12T01:00:00Z" },
];

const SEMIFINALS: SeedMatch[] = [
  { externalId: "sf-1", group: "Semifinal", homeTeam: "Por definir", awayTeam: "Por definir", homeFlag: "🏆", awayFlag: "🏆", venue: "Arlington, AT&T Stadium", kickoffUtc: "2026-07-14T19:00:00Z" },
  { externalId: "sf-2", group: "Semifinal", homeTeam: "Por definir", awayTeam: "Por definir", homeFlag: "🏆", awayFlag: "🏆", venue: "Atlanta Stadium", kickoffUtc: "2026-07-15T19:00:00Z" },
];

const THIRD_PLACE: SeedMatch[] = [
  { externalId: "3rd-place", group: "Tercer Puesto", homeTeam: "Por definir", awayTeam: "Por definir", homeFlag: "🏆", awayFlag: "🏆", venue: "Miami Gardens, Hard Rock Stadium", kickoffUtc: "2026-07-18T21:00:00Z" },
];

const FINAL: SeedMatch[] = [
  { externalId: "final", group: "Final", homeTeam: "Por definir", awayTeam: "Por definir", homeFlag: "🏆", awayFlag: "🏆", venue: "East Rutherford, New York New Jersey Stadium", kickoffUtc: "2026-07-19T19:00:00Z" },
];

const ALL: SeedMatch[] = [
  ...GROUP_STAGE,
  ...ROUND_OF_32,
  ...ROUND_OF_16,
  ...QUARTERFINALS,
  ...SEMIFINALS,
  ...THIRD_PLACE,
  ...FINAL,
];

async function seed() {
  // Import dinámico: garantiza que dotenv ya corrió (líneas arriba) antes
  // de que lib/db.ts lea process.env.DATABASE_URL.
  const { db } = await import("../lib/db");
  const { matches } = await import("./schema");

  console.log(`Insertando ${ALL.length} partidos (incluye fase de grupos + bracket eliminatorio completo hasta la final)...`);

  for (const m of ALL) {
    await db
      .insert(matches)
      .values({
        externalId: m.externalId,
        group: m.group,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeFlag: m.homeFlag,
        awayFlag: m.awayFlag,
        venue: m.venue,
        kickoffUtc: new Date(m.kickoffUtc),
        oddscheckerUrl: m.oddscheckerUrl,
        status: m.status ?? "scheduled",
        homeScore: m.homeScore,
        awayScore: m.awayScore,
      })
      .onConflictDoUpdate({
        target: matches.externalId,
        set: {
          kickoffUtc: new Date(m.kickoffUtc),
          venue: m.venue,
          status: m.status ?? "scheduled",
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          updatedAt: new Date(),
        },
      });
  }

  console.log("Listo. Recuerda actualizar los cruces de Ronda de 32 en adelante una vez termine la fase de grupos (27 jun).");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error en seed:", err);
    process.exit(1);
  });
