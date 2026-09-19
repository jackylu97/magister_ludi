# Leader banners

Review: /flair.html?review=banners

13 original designs, each exported as a 64 × 80 banner and a transparent 64 × 64 symbol. Main target: 24–32 CSS pixels wide. The gallery includes 16px stress tests and 48px samples. No fonts, raster images, gradients or external dependencies. Symbol-only files use currentColor (black when opened standalone); use inline SVG or a CSS mask for recoloring.

The common banner shape and leader palettes are game design choices, not historical reconstructions. All marks are flat filled shapes with no outlines or border trim. Ming, Texcoco and Marinid banners use darker versions of their secondary color for contrast; saved leader colors remain authoritative in game. Al-Ma’mun now has an Abbasid palmette on black. Documented motifs are distinguished from reconstructed banner designs.

## Historical basis

### pachacuti: Sun of Inti

**Period motif.** Inca royal solar symbolism. A new sun drawing, not a reconstruction of Pachacuti’s standard; the modern rainbow flag is not used.

[Reference: The Met · Inca gold and Inti](https://www.metmuseum.org/essays/ancient-andean-metalworking)

### taizong: Coiled dragon

**Period motif.** Inspired by Tang dragon mirrors. The curled body is a new reduction of the motif, not an attested imperial flag or later Qing dragon.

[Reference: Tokyo National Museum · Tang dragon mirror](https://emuseum.nich.go.jp/detail?content_base_id=100662&content_part_id=000&content_pict_id=0&langId=en&webView=)

### modu: Xiongnu sun and moon

**Attested emblem.** Gold sun disks and crescent moons decorate excavated Xiongnu elite coffins, including Tomb 64 at Takhiltiin Khotgor. The motif is archaeological; its use here as a banner is a game adaptation, not a verified flag of Modu.

[Reference: Max Planck Institute · Xiongnu sun and moon finds](https://www.eurekalert.org/multimedia/980867)

### akhenaten: Egyptian ankh

**Attested emblem.** The Egyptian sign for life, documented on Eighteenth Dynasty objects. A broad loop and crossbar make a clearer Egyptian silhouette than the earlier tiny Aten hands. This is a cultural emblem, not Akhenaten’s personal flag.

[Reference: The Met · Eighteenth Dynasty ceremonial ankh](https://www.metmuseum.org/art/collection/search/544840)

### almamun: Abbasid palmette

**Period motif.** A gold palmette adapted from ninth-century Abbasid stucco ornament at Samarra, on the Abbasid black field. Samarra became the capital just after Al-Ma’mun’s reign. The ornament is a visible cultural identifier, not an attested dynastic badge or personal standard.

[Reference: The Met · Architectural ornament of Abbasid Samarra](https://www.metmuseum.org/perspectives/architectural-ornament-of-abbasid-samarra)

### mithridates: Pontic star and crescent

**Attested emblem.** Star above crescent from Mithridates VI’s coinage. The open upward crescent and eight-ray star distinguish it from modern national flag compositions.

[Reference: Ashmolean · Mithridates VI coin HCR141496](https://hcr.ashmus.ox.ac.uk/coin/hcr141496)

### joan: Fleur-de-lis

**Attested emblem.** One gold fleur-de-lis reduces the royal French lilies to a readable emblem. This is a cultural adaptation, not a reconstruction of Joan’s personal battle standard.

[Reference: Canadian Heraldic Authority · Royal France](https://www.gg.ca/en/heraldry/public-register/project/1214)

### mansaMusa: Malian royal parasol

**Period motif.** A royal parasol topped with a bird, based on Ibn Battuta’s eyewitness description of the court of Mansa Sulayman, Musa’s later successor. It represents fourteenth-century Malian royal regalia, not a documented flag or a claim that this exact parasol belonged to Musa.

[Reference: Ibn Battuta · Court ceremonial in Mali](https://human.libretexts.org/Courses/The_Westminster_Schools/Ibn_Battuta%27s_Travels_in_Africa)

### zhengHeOfMing: Ming crane

**Period motif.** A flying crane with a long curved neck, swept feather fan and trailing legs draws on the first-rank civil official’s bird insignia used under the Ming. It represents courtly distinction and cultural prestige; it is not a claim about Zheng He’s own rank badge or an attested Ming naval flag.

[Reference: Australian Museum · Mandarin rank badges](https://australian.museum/learn/cultures/international-collection/chinese/mandarin-square/)

### nezahualcoyotl: Tlaloc mask

**Period motif.** A simplified rain-god mask with ringed eyes, a nose bar, curled upper lip and prominent fangs, based on a Mixtec Tlaloc mask dated 1325–1521. This is a broader Mesoamerican cultural emblem for Texcoco, not a documented standard of Nezahualcoyotl.

[Reference: The Met · Mixtec rain god mask](https://www.metmuseum.org/art/collection/search/313255)

### hypatiaOfAlexandria: Pharos of Alexandria

**Attested emblem.** The Pharos lighthouse appears on Roman Alexandrian coins. Its stepped silhouette represents Alexandria rather than Hypatia’s scholarly work. These coin depictions predate her lifetime; the banner is a simplified civic motif, not her personal standard.

[Reference: Centre d’Études Alexandrines · Pharos on Roman coins](https://pharos.cealex.org/ressources-documentaires/iconographie-antique/the-coins/)

### hildegard: Imperial eagle

**Attested emblem.** A single-headed eagle for the Holy Roman Empire in which Hildegard lived. This uses the medieval imperial symbol rather than her book and flame. The later double-headed imperial eagle is deliberately avoided; the green and vellum remain game colors.

[Reference: German Bundestag · History of the imperial eagle](https://www.bundestag.de/en/parliament/symbols/eagle)

### ibnBattutaOfTangier: Marinid eight-pointed star

**Period motif.** An eight-pointed geometric star from the decorative vocabulary of Marinid Morocco, rather than the modern five-pointed Moroccan star. Marinid objects document the motif; the frequently reproduced red-and-gold dynastic flag should not be treated as securely attested by those objects.

[Reference: Bou Inania Madrasa · Marinid minbar and its sources](https://en.wikipedia.org/wiki/Bou_Inania_Madrasa#Minbar)

## Editing and export

Source: src/art/leaderBanners.ts. Colors: data/leaders.json.

Run `npx vite-node scripts/exportLeaderBanners.ts` to regenerate the files, or append `--check` to verify them. Integrated into leader selection, the leader sheet, diplomacy, the HUD leader button, city labels, and map flag emblems. Leaderless seats retain their original charges.
