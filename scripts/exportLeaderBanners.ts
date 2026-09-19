// Run: npx vite-node scripts/exportLeaderBanners.ts [--check]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { BANNER_LEADER_IDS, LEADER_BANNERS, leaderBannerSvg } from '../src/art/leaderBanners';
const directory = new URL('../public/banners/', import.meta.url);
mkdirSync(directory, { recursive: true });
for (const id of BANNER_LEADER_IDS) for (const markOnly of [false, true]) {
  const path = new URL(`${id}${markOnly ? '-mark' : ''}.svg`, directory);
  const svg = `${leaderBannerSvg(id, { markOnly })}\n`;
  if (process.argv.includes('--check')) {
    if (readFileSync(path, 'utf8') !== svg) throw new Error(`Stale banner: ${path.pathname}`);
  } else writeFileSync(path, svg);
}
const notes = `# Leader banners\n\nReview: /flair.html?review=banners\n\n13 original designs, each exported as a 64 × 80 banner and a transparent 64 × 64 symbol. Main target: 24–32 CSS pixels wide. The gallery includes 16px stress tests and 48px samples. No fonts, raster images, gradients or external dependencies. Symbol-only files use currentColor (black when opened standalone); use inline SVG or a CSS mask for recoloring.\n\nThe common banner shape and leader palettes are game design choices, not historical reconstructions. All marks are flat filled shapes with no outlines or border trim. Ming, Texcoco and Marinid banners use darker versions of their secondary color for contrast; saved leader colors remain authoritative in game. Al-Ma’mun now has an Abbasid palmette on black. Documented motifs are distinguished from reconstructed banner designs.\n\n## Historical basis\n\n${BANNER_LEADER_IDS.map(id => { const d = LEADER_BANNERS[id]; return `### ${id}: ${d.motif}\n\n**${d.basis}.** ${d.note}\n\n[Reference: ${d.source.label}](${d.source.url})\n`; }).join('\n')}\n## Editing and export\n\nSource: src/art/leaderBanners.ts. Colors: data/leaders.json.\n\nRun \`npx vite-node scripts/exportLeaderBanners.ts\` to regenerate the files, or append \`--check\` to verify them. Integrated into leader selection, the leader sheet, diplomacy, the HUD leader button, city labels, and map flag emblems. Leaderless seats retain their original charges.\n`;
const readme = new URL('README.md', directory);
if (process.argv.includes('--check')) {
  if (readFileSync(readme, 'utf8') !== notes) throw new Error('Stale banner source notes');
} else writeFileSync(readme, notes);
console.log(`${BANNER_LEADER_IDS.length} banners and ${BANNER_LEADER_IDS.length} marks ${process.argv.includes('--check') ? 'verified' : 'exported'}.`);
