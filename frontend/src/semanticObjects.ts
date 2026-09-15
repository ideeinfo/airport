const semanticObjectPattern = /(?:AHU|CHWP|VAV|FAF)-[A-Z0-9-]+|\b\d{7}\b|(?:SA|RA|FA)\s+\d+/gi;

export function extractSemanticObjects(text: string): string[] {
  const matches = text.match(semanticObjectPattern) || [];
  return [...new Set(matches.map(value => value.replace(/\s+/g, " ").toUpperCase()))];
}

export function isAssetSemanticObject(value: string): boolean {
  return !/^(?:SA|RA|FA)\s+\d+$/i.test(value.trim());
}
