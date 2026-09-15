import assert from "node:assert/strict";
import test from "node:test";

import { assetGlobalIds, classifyAssetGroup, layoutGraph, systemAssetGlobalIds } from "../src/graphLayout.ts";

test("AHU neighborhood uses a layered topology instead of a radial star", () => {
  const nodes = [
    { id: "asset:ahu", label: "AHU-0B2-04", kind: "设备" },
    { id: "system:sa", label: "SA 94", kind: "系统" },
    { id: "room:m18", label: "M18", kind: "房间" },
    { id: "zone:b1", label: "B1东段", kind: "服务区域" },
    { id: "point:sat", label: "SAT", kind: "点位" }
  ];
  const positioned = layoutGraph(nodes, [
    { source: "asset:ahu", target: "system:sa", type: "PART_OF_SYSTEM" },
    { source: "asset:ahu", target: "room:m18", type: "LOCATED_IN" },
    { source: "room:m18", target: "zone:b1", type: "SUPPLIES" }
  ], "asset:ahu");
  const byId = new Map(positioned.map(node => [node.id, node]));
  assert.ok(byId.get("system:sa")!.x < byId.get("asset:ahu")!.x);
  assert.ok(byId.get("room:m18")!.x > byId.get("asset:ahu")!.x);
  assert.ok(byId.get("zone:b1")!.x > byId.get("room:m18")!.x);
  assert.ok(byId.get("point:sat")!.y > byId.get("asset:ahu")!.y);
});

test("IFC assets are grouped into operator-friendly equipment categories", () => {
  assert.equal(classifyAssetGroup({ asset_code: "AHU-0B2-04", name: "组合式空调机组" }), "空调机组");
  assert.equal(classifyAssetGroup({ asset_code: "5466515", name: "波纹管补偿器", ifc_class: "IfcFlowController" }), "阀门与控制设备");
  assert.equal(classifyAssetGroup({ asset_code: "DUCT-01", ifc_class: "IfcFlowSegment" }), "风管与水管");
});

test("equipment group isolation includes every mapped IFC object", () => {
  assert.deepEqual(assetGlobalIds([
    { asset_code: "AHU-0B2-04", ifc_global_id: "guid-04" },
    { asset_code: "AHU-0B2-05", ifc_global_id: "guid-05" },
    { asset_code: "AHU-DUP", ifc_global_id: "guid-04" },
    { asset_code: "UNMAPPED", ifc_global_id: "" }
  ]), ["guid-04", "guid-05"]);
});

test("system isolation includes every IFC component assigned to the selected system", () => {
  const assets = [
    { asset_code: "AHU-04", system: "SA 94 / RA 93 / FA 58", ifc_global_id: "guid-ahu" },
    { asset_code: "DUCT-01", system: "FA 58", ifc_global_id: "guid-duct" },
    { asset_code: "DUCT-02", system: "SA 54 / FA 58", ifc_global_id: "guid-shared" },
    { asset_code: "OTHER", system: "FA 580", ifc_global_id: "guid-other" },
    { asset_code: "NO-GEOMETRY", system: "FA 58", ifc_global_id: "" }
  ];

  assert.deepEqual(systemAssetGlobalIds(assets, "fa  58"), ["guid-ahu", "guid-duct", "guid-shared"]);
});
