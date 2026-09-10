export function splitList(value: string, separator = ',') {
  return value
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
}
export function fieldErrors(
  issues: { path: PropertyKey[]; message: string }[]
) {
  return Object.fromEntries(
    issues.map((issue) => [String(issue.path[0]), issue.message])
  );
}
