export type DrawingWithDiscipline = { discipline: string };

export type DrawingSearchItem = DrawingWithDiscipline & {
  title?: string;
  relative_path?: string;
  ifc_room?: boolean;
};

export type DrawingModelAsset = {
  ifc_global_id?: string;
  ifc_class?: string;
  name?: string;
  type_name?: string;
  system?: string;
};

export function filterCatalogByDiscipline<T extends DrawingWithDiscipline>(catalog: T[], discipline: string): T[] {
  return discipline === "全部专业" ? catalog : catalog.filter(item => item.discipline === discipline);
}

export function filterCatalogBySemanticQuery<T extends DrawingSearchItem>(catalog: T[], query: string): T[] {
  const normalized = query.trim().toLocaleLowerCase();
  const discipline = ["建筑", "暖通", "消防", "电气", "给排水"].find(name => normalized.includes(name));
  if (discipline) return filterCatalogByDiscipline(catalog, discipline);
  if (normalized.includes("ifc") || normalized.includes("关联")) return catalog.filter(item => item.ifc_room);
  if (normalized.includes("风管")) return catalog.filter(item => `${item.title || ""} ${item.relative_path || ""}`.includes("风管"));
  return [];
}

export function drawingDisciplineGlobalIds(assets: DrawingModelAsset[], discipline: string): string[] {
  if (discipline === "全部专业") return [];
  const patterns: Record<string, RegExp> = {
    建筑: /ifcbuildingelementproxy|空间|房间/i,
    暖通: /duct|风管|空调|ahu|风口|\b(?:sa|ra|fa|ea|pa|chs|chr|hs|hr|hwc|cs)\s*\d+/i,
    消防: /消防|喷淋|消火栓|\b(?:fh|se)\s*\d+/i,
    电气: /桥架|电缆|电力|线管|\bpw\s*\d+/i,
    给排水: /pipe|给水|排水|水管|无缝钢管|\bws\s*\d+/i
  };
  const pattern = patterns[discipline];
  if (!pattern) return [];
  return [...new Set(assets.filter(asset => pattern.test(`${asset.ifc_class || ""} ${asset.name || ""} ${asset.type_name || ""} ${asset.system || ""}`)).map(asset => asset.ifc_global_id?.trim()).filter((id): id is string => Boolean(id)))];
}
