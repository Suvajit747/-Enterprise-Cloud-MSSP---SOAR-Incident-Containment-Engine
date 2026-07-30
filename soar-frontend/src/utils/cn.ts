export type ClassValue = string | number | null | undefined | false | Record<string, boolean>;

/** Lightweight classnames merger — avoids pulling in clsx/tailwind-merge for a small app. */
export function cn(...values: ClassValue[]): string {
  const classes: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (typeof value === "string" || typeof value === "number") {
      classes.push(String(value));
    } else {
      for (const key in value) {
        if (value[key]) classes.push(key);
      }
    }
  }
  return classes.join(" ");
}
