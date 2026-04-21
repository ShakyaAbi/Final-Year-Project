import { validateCategories } from "../../src/services/categoricalService";

test("U008 - validateCategories accepts valid category list", () => {
  const categories = [
    { id: "north", label: "North" },
    { id: "south", label: "South" },
  ];
  const validated = validateCategories(categories as any);
  expect(validated).toHaveLength(2);
});
