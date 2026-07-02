export function getSingleRouteParam(
  value: unknown,
): string {
  if (Array.isArray(value)) {
    const firstValue = value[0];
    return typeof firstValue === "string" ? firstValue : "";
  }

  return typeof value === "string" ? value : "";
}
