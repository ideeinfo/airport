import assert from "node:assert/strict";
import test from "node:test";

import { filterCatalogByDiscipline } from "../src/drawingFilters.ts";

// Regression: ISSUE-001 — professional filters incorrectly reused the M18 search subset.
// Found by /qa on 2026-09-10.
// Report: .gstack/qa-reports/qa-report-airport-ontobase-ai-2026-09-10.md
test("professional filters always use the complete drawing catalog", () => {
  const catalog = [
    ...Array.from({ length: 6 }, () => ({ discipline: "建筑" })),
    ...Array.from({ length: 14 }, () => ({ discipline: "暖通" })),
    ...Array.from({ length: 3 }, () => ({ discipline: "消防" })),
    ...Array.from({ length: 6 }, () => ({ discipline: "电气" })),
    ...Array.from({ length: 3 }, () => ({ discipline: "给排水" })),
  ];
  const currentM18Results = catalog.filter(item => item.discipline === "暖通").slice(0, 9);

  assert.equal(currentM18Results.filter(item => item.discipline === "建筑").length, 0);
  assert.equal(filterCatalogByDiscipline(catalog, "建筑").length, 6);
  assert.equal(filterCatalogByDiscipline(catalog, "全部专业").length, 32);
});
