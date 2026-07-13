import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combina classes CSS com suporte a Tailwind merge */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
