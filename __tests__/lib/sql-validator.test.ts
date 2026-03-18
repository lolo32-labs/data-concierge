import { describe, it, expect } from "vitest";
import { validateSQL } from "@/lib/sql-validator";

describe("validateSQL", () => {
  it("accepts a simple SELECT", () => {
    expect(validateSQL("SELECT * FROM orders")).toEqual({ valid: true, sql: "SELECT * FROM orders LIMIT 1000" });
  });

  it("accepts SELECT with WHERE, JOIN, GROUP BY", () => {
    const sql = "SELECT c.name, COUNT(*) FROM customers c JOIN orders o ON c.id = o.customer_id GROUP BY c.name";
    const result = validateSQL(sql);
    expect(result.valid).toBe(true);
    expect(result.sql).toContain("LIMIT 1000");
  });

  it("rejects INSERT", () => {
    expect(validateSQL("INSERT INTO orders VALUES (1, 2, 3)")).toEqual({
      valid: false,
      error: "Only SELECT queries are allowed",
    });
  });

  it("rejects DELETE", () => {
    expect(validateSQL("DELETE FROM orders WHERE id = 1")).toEqual({
      valid: false,
      error: "Only SELECT queries are allowed",
    });
  });

  it("rejects UPDATE", () => {
    expect(validateSQL("UPDATE orders SET total = 0")).toEqual({
      valid: false,
      error: "Only SELECT queries are allowed",
    });
  });

  it("rejects DROP TABLE", () => {
    expect(validateSQL("DROP TABLE orders")).toEqual({
      valid: false,
      error: "Only SELECT queries are allowed",
    });
  });

  it("rejects CREATE", () => {
    expect(validateSQL("CREATE TABLE evil (id int)")).toEqual({
      valid: false,
      error: "Only SELECT queries are allowed",
    });
  });

  it("rejects ALTER", () => {
    expect(validateSQL("ALTER TABLE orders ADD COLUMN evil text")).toEqual({
      valid: false,
      error: "Only SELECT queries are allowed",
    });
  });

  it("rejects GRANT", () => {
    expect(validateSQL("GRANT ALL ON orders TO public")).toEqual({
      valid: false,
      error: "Only SELECT queries are allowed",
    });
  });

  it("rejects COPY", () => {
    expect(validateSQL("COPY orders TO '/tmp/evil.csv'")).toEqual({
      valid: false,
      error: "Only SELECT queries are allowed",
    });
  });

  it("rejects EXECUTE", () => {
    expect(validateSQL("EXECUTE some_plan")).toEqual({
      valid: false,
      error: "Only SELECT queries are allowed",
    });
  });

  it("rejects SELECT with semicolon followed by DROP (injection attempt)", () => {
    expect(validateSQL("SELECT 1; DROP TABLE orders")).toEqual({
      valid: false,
      error: "Only SELECT queries are allowed",
    });
  });

  it("rejects empty input", () => {
    expect(validateSQL("")).toEqual({ valid: false, error: "Empty query" });
  });

  it("rejects query with multiple statements via semicolon", () => {
    expect(validateSQL("SELECT 1; SELECT 2")).toEqual({
      valid: false,
      error: "Only SELECT queries are allowed",
    });
  });

  it("does not double-add LIMIT if already present", () => {
    const result = validateSQL("SELECT * FROM orders LIMIT 10");
    expect(result.valid).toBe(true);
    expect(result.sql).toBe("SELECT * FROM orders LIMIT 10");
  });

  it("handles case-insensitive keywords", () => {
    expect(validateSQL("select * from orders")).toEqual({
      valid: true,
      sql: "select * from orders LIMIT 1000",
    });
    expect(validateSQL("Delete from orders")).toEqual({
      valid: false,
      error: "Only SELECT queries are allowed",
    });
  });
});
