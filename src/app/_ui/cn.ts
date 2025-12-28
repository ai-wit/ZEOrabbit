export function cn(...parts: Array<string | string[] | undefined | false | null>) {
  return parts
    .flat()
    .filter(Boolean)
    .join(" ");
}


