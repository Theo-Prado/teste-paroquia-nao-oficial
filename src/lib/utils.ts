import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import slugify from "slugify";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function makeSlug(input: string) {
  return slugify(input, { lower: true, strict: true, locale: "pt" });
}

export function formatDate(d: string | Date, opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "long", year: "numeric" }) {
  return new Intl.DateTimeFormat("pt-BR", opts).format(typeof d === "string" ? new Date(d) : d);
}

export function formatDateTime(d: string | Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(typeof d === "string" ? new Date(d) : d);
}

export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function publicMediaUrl(path: string | null | undefined) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const base = import.meta.env.VITE_SUPABASE_URL || "";
  return `${base}/storage/v1/object/public/media/${path}`;
}
