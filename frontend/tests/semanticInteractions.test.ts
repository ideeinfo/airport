import assert from "node:assert/strict";
import test from "node:test";

import { drawingDisciplineGlobalIds, filterCatalogBySemanticQuery } from "../src/drawingFilters.ts";
import { extractSemanticObjects, isAssetSemanticObject } from "../src/semanticObjects.ts";

test("drawing semantic questions filter the visible result set", () => {
  const catalog = [
    { title: "空调机房风管平面", relative_path: "暖通/风管.pdf", discipline: "暖通", ifc_room: true },
    { title: "空调水管平面", relative_path: "暖通/水管.pdf", discipline: "暖通", ifc_room: true },
    { title: "配电系统图", relative_path: "电气/配电.pdf", discipline: "电气", ifc_room: false }
  ];

  assert.equal(filterCatalogBySemanticQuery(catalog, "这个机房有哪些暖通图纸？").length, 2);
  assert.equal(filterCatalogBySemanticQuery(catalog, "查找风管平面图").length, 1);
  assert.equal(filterCatalogBySemanticQuery(catalog, "哪张图纸与 IFC 机房关联？").length, 2);
});

test("drawing disciplines resolve to their related IFC geometry", () => {
  const assets = [
    { ifc_global_id: "duct-guid", ifc_class: "IfcFlowSegment", name: "Rectangular Duct", system: "SA 94" },
    { ifc_global_id: "fire-guid", ifc_class: "IfcFlowFitting", name: "消防红弯头", system: "FH 2" },
    { ifc_global_id: "power-guid", ifc_class: "IfcFlowFitting", name: "电力桥架", system: "PW 8" }
  ];

  assert.deepEqual(drawingDisciplineGlobalIds(assets, "暖通"), ["duct-guid"]);
  assert.deepEqual(drawingDisciplineGlobalIds(assets, "消防"), ["fire-guid"]);
  assert.deepEqual(drawingDisciplineGlobalIds(assets, "电气"), ["power-guid"]);
});

test("semantic answers expose device and system object references", () => {
  assert.deepEqual(extractSemanticObjects("AHU-0B2-04 连接 SA 94，上游构件为 5466492。"), ["AHU-0B2-04", "SA 94", "5466492"]);
  assert.equal(isAssetSemanticObject("AHU-0B2-04"), true);
  assert.equal(isAssetSemanticObject("SA 94"), false);
});
