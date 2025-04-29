import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines class names from multiple sources with Tailwind CSS optimization
 * Uses clsx to handle conditional classes and twMerge to handle Tailwind conflicts
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
