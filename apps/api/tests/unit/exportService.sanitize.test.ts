import { ExportService } from "../../src/services/exportService";
import { PrismaClient } from "@prisma/client";

describe("ExportService.sanitizeCell", () => {
  const svc = new ExportService({} as PrismaClient) as any;

  test("returns empty string for null and undefined", () => {
    expect(svc.sanitizeCell(null)).toBe("");
    expect(svc.sanitizeCell(undefined)).toBe("");
  });

  test("prefixes dangerous leading characters with single quote", () => {
    const dangerous = ["=SUM(A1)", "+1+2", "-10", "@cmd", "\tTAB", "\rCR"];
    const expected = ["'=SUM(A1)", "'+1+2", "'-10", "'@cmd", "'\tTAB", "'\rCR"];

    dangerous.forEach((val, i) => {
      expect(svc.sanitizeCell(val)).toBe(expected[i]);
    });
  });

  test("returns normal strings unchanged", () => {
    expect(svc.sanitizeCell("hello")).toBe("hello");
    expect(svc.sanitizeCell("12345")).toBe("12345");
    expect(svc.sanitizeCell("(safe)formula")).toBe("(safe)formula");
  });
});
