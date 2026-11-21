/** The technology chart, Compendium and Flair use the same engraved marks. */
export const charterWorkIcons: Readonly<Record<string, string | undefined>> = {
  smelter: 'Smelter',
  stoneCircle: 'Stone Circle',
  cliffMonastery: 'Cliff Monastery',
  bellTower: 'Bell Tower',
  greatArchive: 'Great Archive',
  specularium: 'Glasshouse',
};

export function charterIconPath(id: string): string {
  return `/sprites/charters/${id}.svg`;
}
