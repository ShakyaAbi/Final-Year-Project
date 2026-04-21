import { detectReportingGaps } from "../../src/services/indicatorService";

test("U007 - detectReportingGaps finds gaps for monthly frequency", () => {
  const submissions = [
    { reportedAt: new Date("2025-01-01") },
    { reportedAt: new Date("2025-02-01") },
    // big gap to April
    { reportedAt: new Date("2025-04-15") },
  ];

  const gaps = detectReportingGaps(submissions as any, "MONTHLY");
  expect(gaps.length).toBeGreaterThan(0);
});
