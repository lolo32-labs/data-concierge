type ValidResult = { valid: true; sql: string };
type InvalidResult = { valid: false; error: string };
export type ValidationResult = ValidResult | InvalidResult;

const BLOCKED_KEYWORDS = /\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|GRANT|REVOKE|COPY|EXECUTE|TRUNCATE)\b/i;
const MAX_ROWS = 1000;

export function validateSQL(raw: string): ValidationResult {
  const sql = raw.trim();

  if (!sql) {
    return { valid: false, error: "Empty query" };
  }

  // Block multiple statements (semicolons)
  if (sql.includes(";")) {
    return { valid: false, error: "Only SELECT queries are allowed" };
  }

  // Must start with SELECT (after optional whitespace/comments)
  if (!/^\s*SELECT\b/i.test(sql)) {
    return { valid: false, error: "Only SELECT queries are allowed" };
  }

  // Block dangerous keywords anywhere in the query
  if (BLOCKED_KEYWORDS.test(sql)) {
    return { valid: false, error: "Only SELECT queries are allowed" };
  }

  // Inject LIMIT if not present
  const hasLimit = /\bLIMIT\s+\d+/i.test(sql);
  const safeSql = hasLimit ? sql : `${sql} LIMIT ${MAX_ROWS}`;

  return { valid: true, sql: safeSql };
}
