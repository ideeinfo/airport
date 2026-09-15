export type DrawingWithDiscipline = { discipline: string };

export function filterCatalogByDiscipline<T extends DrawingWithDiscipline>(catalog: T[], discipline: string): T[] {
  return discipline === "全部专业" ? catalog : catalog.filter(item => item.discipline === discipline);
}
