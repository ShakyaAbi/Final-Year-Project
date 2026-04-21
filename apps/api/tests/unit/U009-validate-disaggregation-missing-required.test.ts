import { validateDisaggregationKey } from "../../src/services/categoricalService";

test("U009 - validateDisaggregationKey throws when required dimension missing", () => {
  const config = {
    disaggregationDimensions: [
      { key: "district", label: "District", values: ["D1"], required: true },
    ],
  } as any;

  expect(() => validateDisaggregationKey(null, config)).toThrow();
});
