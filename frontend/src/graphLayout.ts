export type LayoutNode = { id: string; label: string; kind: string };
export type LayoutEdge = { source: string; target: string; type: string };
export type PositionedNode<T extends LayoutNode = LayoutNode> = T & { x: number; y: number; tone: string };

export type AssetListItem = {
  asset_code: string;
  name?: string;
  ifc_class?: string;
  system?: string;
  location?: string;
};

const groupOrder = ["空调机组", "风机与水泵", "阀门与控制设备", "末端设备", "风管与水管", "管件与连接件", "其他设备"];

export function classifyAssetGroup(asset: AssetListItem): string {
  const text = `${asset.asset_code} ${asset.name || ""} ${asset.ifc_class || ""}`.toLowerCase();
  if (/\bahu\b|空调机组|空气处理/.test(text)) return "空调机组";
  if (/ifcflowmovingdevice|风机|水泵|泵组/.test(text)) return "风机与水泵";
  if (/ifcflowcontroller|阀|控制器|补偿器|调节器/.test(text)) return "阀门与控制设备";
  if (/ifcflowterminal|风口|散流器|末端/.test(text)) return "末端设备";
  if (/ifcflowsegment|风管|水管|管道/.test(text)) return "风管与水管";
  if (/ifcflowfitting|管件|弯头|三通|变径|连接件/.test(text)) return "管件与连接件";
  return "其他设备";
}

export function groupAssets<T extends AssetListItem>(assets: T[]): Array<{ name: string; items: T[] }> {
  const grouped = new Map<string, T[]>();
  assets.forEach(asset => {
    const group = classifyAssetGroup(asset);
    grouped.set(group, [...(grouped.get(group) || []), asset]);
  });
  return groupOrder.filter(name => grouped.has(name)).map(name => ({
    name,
    items: (grouped.get(name) || []).sort((a, b) => a.asset_code.localeCompare(b.asset_code, "zh-CN"))
  }));
}

export function assetGlobalIds(assets: Array<AssetListItem & { ifc_global_id?: string }>): string[] {
  return [...new Set(assets.map(asset => asset.ifc_global_id?.trim()).filter((id): id is string => Boolean(id)))];
}

function normalizeSystemName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleUpperCase();
}

export function systemAssetGlobalIds(
  assets: Array<AssetListItem & { ifc_global_id?: string }>,
  systemName: string
): string[] {
  const target = normalizeSystemName(systemName);
  if (!target) return [];
  return assetGlobalIds(assets.filter(asset => (asset.system || "")
    .split(/[\/、,，;；]/)
    .some(name => normalizeSystemName(name) === target)));
}

function toneForKind(kind: string): string {
  if (["服务区域", "房间", "空间"].includes(kind)) return "space";
  if (kind === "点位") return "sensor";
  if (kind === "系统") return "water";
  return "device";
}

function verticalPositions(count: number, center: number, gap: number): number[] {
  const start = center - (Math.max(count, 1) - 1) * gap / 2;
  return Array.from({ length: count }, (_, index) => start + index * gap);
}

export function layoutGraph<T extends LayoutNode>(nodes: T[], edges: LayoutEdge[], focusId: string): PositionedNode<T>[] {
  const sorted = [...nodes].sort((a, b) => a.label.localeCompare(b.label, "zh-CN"));
  const focus = sorted.find(node => node.id === focusId) || sorted.find(node => node.kind === "设备") || sorted[0];
  if (!focus) return [];

  const buckets = {
    systems: sorted.filter(node => node.kind === "系统"),
    devices: sorted.filter(node => node.kind === "设备" && node.id !== focus.id),
    types: sorted.filter(node => node.kind === "设备类型"),
    spaces: sorted.filter(node => node.kind === "空间" || node.kind === "房间"),
    zones: sorted.filter(node => node.kind === "服务区域"),
    points: sorted.filter(node => node.kind === "点位"),
    other: sorted.filter(node => !["设备", "系统", "设备类型", "空间", "房间", "服务区域", "点位"].includes(node.kind))
  };
  const positions = new Map<string, { x: number; y: number }>();
  positions.set(focus.id, { x: 350, y: 215 });
  verticalPositions(buckets.devices.length, 215, 112).forEach((y, index) => positions.set(buckets.devices[index].id, { x: 82, y }));
  verticalPositions(buckets.systems.length, 215, 118).forEach((y, index) => positions.set(buckets.systems[index].id, { x: 205, y }));
  verticalPositions(buckets.types.length, 72, 68).forEach((y, index) => positions.set(buckets.types[index].id, { x: 350 + index * 130, y }));
  verticalPositions(buckets.spaces.length, 215, 100).forEach((y, index) => positions.set(buckets.spaces[index].id, { x: 505, y }));
  verticalPositions(buckets.zones.length, 215, 112).forEach((y, index) => positions.set(buckets.zones[index].id, { x: 675, y }));
  buckets.points.forEach((node, index) => positions.set(node.id, { x: 105 + index % 5 * 135, y: 382 + Math.floor(index / 5) * 76 }));
  buckets.other.forEach((node, index) => positions.set(node.id, { x: 555 + index % 2 * 130, y: 62 + Math.floor(index / 2) * 70 }));

  // Keep directly connected device pairs on opposite sides of the focus path.
  const connectedIds = new Set(edges.filter(edge => edge.type === "CONNECTED_TO" && (edge.source === focus.id || edge.target === focus.id)).flatMap(edge => [edge.source, edge.target]));
  buckets.devices.filter(node => connectedIds.has(node.id)).forEach((node, index, connected) => {
    positions.set(node.id, { x: 82, y: verticalPositions(connected.length, 215, 130)[index] });
  });

  return sorted.map(node => ({ ...node, ...(positions.get(node.id) || { x: 380, y: 260 }), tone: node.id === focus.id ? "primary" : toneForKind(node.kind) }));
}
