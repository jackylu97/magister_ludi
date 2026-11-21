# Painted land units for review

[View the ten pieces at normal play zoom](on-board.jpg). Each crop shows the same tile on turn 151. The game supplies the seat colours, shadows and badges. [Compare the larger models with the current Swordsman, Horseman and Catapult](roster.jpg).

## Roster coverage

The painted board uses these eight custom models for six leader units and two
charter units. The Ballista Elephant uses the siege elephant, and the Keshig
keeps its mounted archer. All seventy unit types have a painted model.
Open `/flair.html?review=units&unit=roster` to see the ten pieces on the board.


## Historical references

| Model | Evidence and choices for the piece |
|---|---|
| [Hypaspist](hypaspist.glb) | Bronze fragments from Staro Bonče preserve circular decoration on a Macedonian shield. The Skopje reconstruction gives the piece its broad round face and ring of roundels. The exact equipment of Alexander’s shield bearers remains uncertain. [Jakimovski and Temelkoski, figures 29–30](https://repository.ukim.mk/bitstream/20.500.12188/16344/1/08%20Complex%20of%20the%20Archaeological%20Sites%20of%20Staro%20Bon%C4%8De%2C%20Folia%20archaeologica%20Bal%D0%BAanica%20IV%2C%20Skopje%2C%202018%2C%20205%20%E2%80%93%20256..pdf#page=27) |
| [Janissary](janissary.glb) | The Diez album shows a Janissary in ceremonial dress with a tall folded cap, a wide coloured brim and an empty gilt plume holder. The cap and holder identify the piece above its sash. The game’s field figure carries a matchlock. The painted figure carries a staff. [British Museum, folio 90](https://www.britishmuseum.org/collection/object/W_1974-0617-0-12-1-90) |
| [Condottiere](condottiere.glb) | A Milanese barbute from about 1460 has a raised ridge, deep sides and a T-shaped opening. The piece pairs that helmet with a poleaxe. The helmet is a regional reference for a mercenary captain. [Metropolitan Museum of Art, object 42.50.15](https://www.metmuseum.org/art/collection/search/27960) |
| [Qin Crossbowman](qinCrossbowman.glb) | A kneeling archer from the imperial mausoleum wears a topknot and rows of overlapping armour. The upright pawn keeps its crossbow clear of the shoulder plates. The museum catalogue identifies the displayed full crossbow as a modern replica. [National Gallery of Victoria, archer photograph](https://www.ngv.vic.gov.au/wp-content/uploads/2019/06/NGV_Terracotta-Warriors-Cai-Guo-Qiang_Multimedia-Guide-Transcript.pdf#page=2) · [Western Australian Museum, crossbow entry 125](https://visit.museum.wa.gov.au/sites/default/files/2025-06/Terracotta-Warriors--Legacy-of-the-First-Emperor-Provenance-List-V1.2.pdf) |
| [Sparabara](sparabara.glb) | A Persepolis doorway relief shows a guard with a straight-sided shield and a long spear. Greek vase paintings show alternating light and dark squares. The piece uses that contrast across its tall shield. [Schmidt, Persepolis I, plate 94](https://isac-assets.s3.amazonaws.com/isac-publications/oip68.pdf#page=480) · [Bows and Spears in Achaemenid Persia, pp. 141–143](https://escholarship.org/uc/item/9819d1v6) |
| [Hwacha](hwacha.glb) | An illustration of the Korean cart shows two large wheels, long handles and an upright rack of arrows. The piece uses one axle and fifteen enlarged tips so the rows remain visible at play zoom. The count is a modelling choice. [California State University, Fullerton, Hwacha illustration](https://www.fullerton.edu/nrcal/professional-development/2015/documents/spring/spotlight_on_korean_culture_rphillips_4.14.2015.pdf#page=17) |
| [Numidian Cavalry](numidianCavalry.glb) | Scene LXIV of Trajan’s Column shows North African allied horsemen with small round shields on lightly equipped horses. The relief depicts Roman-era auxiliaries, a later analogue for the charter unit. The piece keeps the horse bare and sets the shield beside two javelins. [Roger Ulrich, photograph of cast 156](https://www.trajans-column.org/wp-content/flagallery/scenes46-73/img_7144-web.jpg) |
| [Company Guard](companyGuard.glb) | The charter names a fictional company. A 1799 aquatint of a Bengal sepoy provides a documented company infantry uniform. The piece uses the dark wrapped turban, fitted coat and contrasting belt. The sword identifies the game’s melee unit. [National Army Museum, 1960-02-105-45](https://collection.nam.ac.uk/detail.php?acc=1960-02-105-45) |

## Reused pieces

- [Keshig](keshig.glb) uses the current mounted archer. Its roster id is `xiongnuHorseArcher`. Liu Guandao’s 1280 painting of Khubilai Khan’s hunting party provides a Yuan court reference for the horse and bow. The painting leaves the riders’ guard affiliations unidentified. [National Palace Museum, Khubilai Khan Hunting](https://theme.npm.edu.tw/selection/Article.aspx?lang=2&sNo=04000995)
- [Ballista Elephant](ballistaElephant.glb) uses the current `siegeElephant` model. A Bayon relief shows a Khmer archer drawing a hand bow from a decorated platform on an elephant. The platform has a historical reference. The mounted ballista is the game’s addition to this scene. [Wolfarth, photograph of the Bayon relief, figure 11](https://etheses.whiterose.ac.uk/id/eprint/8907/2/Wolfarth_Faces%20of%20Cambodia_%202014_Redacted.pdf)

## Editing

From the repository root, run `node scripts/terrain-study/build-roster-review.mjs` to export the GLBs from the same model factory the game uses. Pass an output directory to write a separate copy. The script prints the directory that holds the three reference pieces. Pass that directory to `python3 scripts/terrain-study/render-roster-review.py` to rebuild the studio sheet. The renderer uses NumPy and Pillow.
