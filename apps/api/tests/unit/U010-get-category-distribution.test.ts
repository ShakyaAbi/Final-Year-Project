import { getCategoryDistribution } from "../../src/services/categoricalService";

test("U010 - getCategoryDistribution computes counts and percentages", () => {
  const categories = [
    { id: "a", label: "A" },
    { id: "b", label: "B" },
  ];

  const submissions = [
    { categoryValue: "a" },
    { categoryValue: "b" },
    { categoryValue: "a" },
  ];

  const stats = getCategoryDistribution(submissions as any, categories as any);
  expect(stats.find((s) => s.categoryId === "a")!.count).toBe(2);
  expect(stats.find((s) => s.categoryId === "b")!.count).toBe(1);
  expect(stats.reduce((acc, s) => acc + s.percentage, 0)).toBeCloseTo(100, 5);
});
