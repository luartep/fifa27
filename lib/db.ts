import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";

/**
 * Conexión perezosa (lazy) a la base de datos.
 *
 * Por qué: Next.js, durante `next build`, ejecuta una fase de
 * "Collecting page data" que importa cada route handler para
 * analizar su forma — esto pasa ANTES de que las variables de
 * entorno de runtime (como DATABASE_URL en Vercel) estén
 * garantizadas disponibles en ese momento del build. Si `db.ts`
 * lanza un error apenas se importa (como hacía antes), el build
 * completo falla aunque en producción la variable sí exista.
 *
 * La solución: no crear la conexión real hasta que alguien
 * efectivamente la use (el primer `db.select()`, `db.insert()`, etc.
 * en una request real). Usamos un Proxy para que `db` se siga
 * pudiendo importar y usar exactamente igual en todo el resto del
 * código, sin tener que tocar ningún otro archivo.
 */
let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (_db) return _db;

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "Falta DATABASE_URL. Configúrala en Vercel (Storage → Postgres/Neon) o en .env.local para desarrollo."
    );
  }

  const sql = neon(process.env.DATABASE_URL);
  _db = drizzle(sql, { schema });
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    const realDb = getDb();
    const value = (realDb as any)[prop];
    return typeof value === "function" ? value.bind(realDb) : value;
  },
});
