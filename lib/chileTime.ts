import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const CHILE_TZ = "America/Santiago";

/**
 * Chile cambia de horario (CLT/CLST) en fechas que NO siempre coinciden
 * con el hemisferio norte. date-fns-tz con el IANA tz "America/Santiago"
 * maneja esto automáticamente vía la base de datos de zonas horarias del sistema,
 * así que no hace falta lógica manual de DST aquí.
 */

/** Convierte un Date (o string ISO) en UTC a un string legible en hora de Chile. */
export function toChileTime(utcDate: Date | string, fmt = "HH:mm"): string {
  const date = typeof utcDate === "string" ? new Date(utcDate) : utcDate;
  return formatInTimeZone(date, CHILE_TZ, fmt, { locale: es });
}

/** Devuelve la fecha (sin hora) en Chile, como clave "yyyy-MM-dd" para agrupar partidos por día. */
export function chileDateKey(utcDate: Date | string): string {
  const date = typeof utcDate === "string" ? new Date(utcDate) : utcDate;
  return formatInTimeZone(date, CHILE_TZ, "yyyy-MM-dd");
}

/** Etiqueta amigable para la navegación de días, ej: "Vie 26 Jun". */
export function chileDayLabel(utcDate: Date | string): string {
  const date = typeof utcDate === "string" ? new Date(utcDate) : utcDate;
  const label = formatInTimeZone(date, CHILE_TZ, "EEE dd MMM", { locale: es });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Hora actual en Chile, usada para decidir "qué día es hoy" en la navegación. */
export function nowInChile(): Date {
  return toZonedTime(new Date(), CHILE_TZ);
}

export function todayChileKey(): string {
  return chileDateKey(new Date());
}

/** Para mostrar fecha+hora completa en tarjetas de detalle. */
export function chileFullDateTime(utcDate: Date | string): string {
  const date = typeof utcDate === "string" ? new Date(utcDate) : utcDate;
  return formatInTimeZone(date, CHILE_TZ, "EEEE dd 'de' MMMM, HH:mm 'hrs'", { locale: es });
}
