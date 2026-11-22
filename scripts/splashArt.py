#!/usr/bin/env python3
"""Turn full-size splash art into the files the game loads.

Reads   art-masters/<kind>/<any name>.png        (git ignores art-masters/)
Writes  public/art/splash/<kind>/<row id>.jpg

Kinds:
  wonders   16:9, at most 1600 px wide
  people    5:6,  at most 720 px wide (great people's portraits)
  ages      16:9, at most 1600 px wide (three sets of four: form, still, abstract)
  endings   16:9, at most 1600 px wide (win and loss)
  beliefs   1:1,  at most 480 px wide (shown in a round window)
  title     16:9, at most 1600 px wide (the title screen's one painting, `title.jpg`)

What it does to each picture:
  1. cuts off a border, if the picture has one: black bars, or a paper mount
     of one colour on all four sides;
  2. cuts the middle to the kind's shape;
  3. saves a JPEG no wider than the kind's width.

Each kind has a NAMES table that maps a master's file name to the row id. A
master that is not in the table is reported and skipped. Needs Pillow
(`pip install pillow`). Run from the repo root:

    python3 scripts/splashArt.py            # every kind
    python3 scripts/splashArt.py people     # one kind
"""
import os, sys
from PIL import Image

WONDERS = {
    'alhambra': 'alhambra', 'angkor_wat': 'angkorWat', 'artemis': 'templeOfArtemis',
    'ashurbanipal': 'libraryOfAshurbanipal', 'chichen_itza': 'chichenItza',
    'circus_maxima': 'circusMaximus', 'colossus': 'colossus', 'forbidden_city': 'forbiddenCity',
    'great_library': 'greatLibrary', 'great_lighthouse': 'greatLighthouse',
    'great_mosque': 'greatMosqueOfDjenne', 'great_pyramids': 'pyramids', 'hagia_sophia': 'hagiaSophia',
    'hanging_gardens': 'hangingGardens', 'house_wisdom': 'houseOfWisdom', 'iron_pillar': 'ironPillar',
    'machu': 'machuPicchu', 'mausoleum': 'mausoleum', 'notre_dame': 'notreDame', 'oracle': 'theOracle',
    'petra': 'petra', 'pyramid_sun': 'pyramidOfTheSun', 'solomons': 'solomonsTemple',
    'sphinx': 'greatSphinx', 'statue_zeus': 'statueOfZeus', 'stelae': 'greatStelaeOfAksum',
    'stonehenge': 'stonehenge', 'terracotta_army': 'terracottaArmy', 'the_great_wall': 'greatWall',
    'theatre_dionysus': 'theatreOfDionysus', 'thoth': 'templeOfThoth', 'walls_uruk': 'wallsOfUruk',
    'weiyang': 'weiyangPalace', 'ziggurat': 'greatZiggurat',
}
PEOPLE = {
    'aljazari': 'alJazari', 'alkhwarizmi': 'alKhwarizmi', 'archimedes': 'archimedes',
    'aristotle': 'aristotle', 'boudica': 'boudica', 'ea_nasir': 'eaNasir',
    'enheduanna': 'enheduanna', 'gozen': 'tomoeGozen', 'hannibal': 'hannibal', 'homer': 'homer',
    'ibn_sina': 'ibnSina', 'imhotep': 'imhotep', 'marco_polo': 'marcoPolo',
    'mimarsinan': 'mimarSinan', 'rumi': 'rumi', 'sappho': 'sappho',
    'shikibu': 'murasakiShikibu', 'subutai': 'subutai', 'vitruvius': 'vitruvius',
    'zhangqian': 'zhangQian',
    # The 137 people with no portrait yet (2026-11-21). The master's name is the person's own
    # name, so a picture is never named after another person. Thirteen row ids kept an older
    # name: ibn_jubayr, jacques_coeur, and the eleven people who changed on 2026-11-21
    # (docs/plans/great-people-cultures-2026-11-21.md), for example amanitore and piye.
    'ahmes': 'ahmes', 'kidinnu': 'kidinnu', 'thales_of_miletus': 'thales', 'tapputi': 'tapputi',
    'panini': 'panini', 'hippocrates': 'hippocrates', 'anaximander': 'anaximander',
    'baudhayana': 'baudhayana', 'peseshet': 'peseshet', 'solon': 'solon',
    'sin_leqi_unninni': 'sinLeqiUnninni', 'ilimilku': 'ilimilku', 'hesiod': 'hesiod',
    'aesop': 'aesop', 'exekias': 'exekias', 'telesilla': 'telesilla',
    'thutmose_the_sculptor': 'thutmoseTheSculptor', 'senenmut': 'senenmut',
    'amenhotep_son_of_hapu': 'amenhotepSonOfHapu', 'bezalel': 'bezalel', 'pushyagupta': 'eupalinos',
    'lu_ban': 'luBan', 'anacharsis': 'theodorusOfSamos',
    'artachaees': 'mandrocles', 'ineni': 'ineni', 'sunshu_ao': 'sunshuAo',
    'kushim': 'kushim', 'assur_idi': 'assurIdi', 'lamassi': 'lamassi',
    'hanno_the_navigator': 'hanno', 'fan_li': 'fanLi', 'harkhuf': 'harkhuf',
    'colaeus_of_samos': 'colaeus', 'wenamun': 'wenamun', 'iddin_marduk': 'iddinMarduk',
    'ahmose_son_of_ebana': 'ahmoseSonOfEbana', 'piyamaradu': 'piyamaradu', 'sinuhe': 'sinuhe',
    'deborah': 'deborah', 'fu_hao': 'fuHao', 'sun_tzu': 'sunTzu', 'leonidas': 'leonidas',
    'djehuty': 'djehuty', 'piye': 'artemisia', 'tomyris': 'tomyris',
    'omar_khayyam': 'epicurus', 'ptahhotep': 'ptahhotep', 'hypatia': 'hypatia',
    'zhang_heng': 'zhangHeng', 'eratosthenes': 'eratosthenes', 'maria_hebraea': 'mariaHebraea',
    'euclid': 'euclid', 'ban_zhao': 'banZhao', 'qu_yuan': 'quYuan', 'sima_qian': 'simaQian',
    'phidias': 'phidias', 'virgil': 'virgil', 'kalidasa': 'kalidasa', 'wang_xizhi': 'wangXizhi',
    'cai_yan': 'caiYan', 'sophocles': 'sophocles', 'tiruvalluvar': 'tiruvalluvar',
    'auvaiyar': 'auvaiyar', 'hemiunu': 'hemiunu', 'li_bing': 'liBing',
    'amanitore': 'heroOfAlexandria', 'cai_lun': 'caiLun',
    'hero_of_alexandria': 'heronOfAlexandria', 'gyoki': 'apollodorus',
    'al_hasan_ibn_sulayman': 'sostratus', 'zheng_guo': 'zhengGuo', 'nanaivandak': 'nanaivandak',
    'zoskales': 'hippalus', 'crassus': 'crassus', 'jang_bogo': 'pytheas', 'lu_buwei': 'luBuwei',
    'anathapindika': 'pasion', 'widow_qing_of_ba': 'widowQing', 'marcus_ulpius_yarhai': 'yarhai',
    'sang_hongyang': 'sangHongyang', 'han_xin': 'hanXin', 'gaius_marius': 'gaiusMarius',
    'spartacus': 'spartacus', 'julius_caesar': 'juliusCaesar', 'zhuge_liang': 'zhugeLiang',
    'trung_trac': 'trungTrac', 'modu_chanyu': 'moduChanyu', 'chanakya': 'chanakya',
    'maimonides': 'maimonides', 'roger_bacon': 'rogerBacon', 'aryabhata': 'aryabhata',
    'paracelsus': 'paracelsus', 'tycho_brahe': 'tychoBrahe', 'john_dee': 'johnDee',
    'copernicus': 'copernicus', 'ibn_al_haytham': 'ibnAlHaytham', 'ibn_khaldun': 'ibnKhaldun',
    'brahmagupta': 'brahmagupta', 'sei_shonagon': 'seiShonagon',
    'christine_de_pizan': 'christineDePizan', 'durer': 'durer', 'li_bai': 'liBai',
    'dante_alighieri': 'dante', 'ferdowsi': 'ferdowsi', 'michelangelo': 'michelangelo',
    'li_qingzhao': 'liQingzhao', 'hildegard_of_bingen': 'hildegardOfBingen', 'su_song': 'suSong',
    'villard_de_honnecourt': 'villardDeHonnecourt', 'leonardo': 'leonardo',
    'taqi_al_din': 'taqiAlDin', 'johannes_gutenberg': 'gutenberg', 'jang_yeong_sil': 'jangYeongSil',
    'filippo_brunelleschi': 'brunelleschi', 'guo_shoujing': 'guoShoujing',
    'benjamin_of_tudela': 'benjaminOfTudela', 'ibn_jubayr': 'ibnBattuta',
    'francesco_datini': 'francescoDatini', 'jakob_fugger': 'jakobFugger',
    'willem_beukelszoon': 'willemBeukelszoon', 'gracia_mendes_nasi': 'graciaMendesNasi',
    'jacques_coeur': 'cosimoDeMedici', 'ahmad_ibn_majid': 'ibnMajid',
    'fatima_al_fihri': 'fatimaAlFihri', 'jan_zizka': 'janZizka', 'el_cid': 'elCid',
    'nzinga_of_ndongo': 'nzingaOfNdongo', 'yi_sun_sin': 'yiSunSin', 'lautaro': 'lautaro',
    'belisarius': 'belisarius', 'gajah_mada': 'gajahMada', 'amina_of_zazzau': 'amina',
    'tlacaelel': 'tlacaelel', 'basho': 'basho', 'sor_juana': 'sorJuana', 'vaucanson': 'vaucanson',
    'gustavus_adolphus': 'gustavusAdolphus',
    # The names the masters arrived with (2026-11-21). They are shorter than the names
    # above, and some are misspelled. The master files keep their names; this table
    # follows them. `hero` is Hero of Alexandria (row heronOfAlexandria); the row
    # heroOfAlexandria is Amanitore now, and its master is `amanitore`.
    'ahmose': 'ahmoseSonOfEbana', 'alfihri': 'fatimaAlFihri', 'alhaytham': 'ibnAlHaytham',
    'amenhotep': 'amenhotepSonOfHapu', 'amina': 'amina', 'aneni': 'ineni',
    'assuridi': 'assurIdi', 'bacon': 'rogerBacon', 'badhayana': 'baudhayana',
    'banzhao': 'banZhao', 'benjamin': 'benjaminOfTudela', 'brahe': 'tychoBrahe',
    'brunelleschi': 'brunelleschi', 'buekelzsoon': 'willemBeukelszoon', 'cailun': 'caiLun',
    'caiyan': 'caiYan', 'coeur': 'cosimoDeMedici', 'colaeus': 'colaeus', 'dante': 'dante',
    'datini': 'francescoDatini', 'dee': 'johnDee', 'elcid': 'elCid',
    'eratosthones': 'eratosthenes', 'fanli': 'fanLi', 'fugger': 'jakobFugger',
    'fuhao': 'fuHao', 'gaiusmarius': 'gaiusMarius', 'gajahmada': 'gajahMada',
    'guoshoujing': 'guoShoujing', 'gutenberg': 'gutenberg', 'hanno': 'hanno',
    'hanxin': 'hanXin', 'heimiunu': 'hemiunu', 'hero': 'heronOfAlexandria',
    'hildegard': 'hildegardOfBingen', 'honnecourt': 'villardDeHonnecourt',
    'ibnjubayr': 'ibnBattuta', 'ibnmajid': 'ibnMajid', 'iddinmarduk': 'iddinMarduk',
    'jangbogo': 'pytheas', 'jangyeongsil': 'jangYeongSil', 'juliuscaesar': 'juliusCaesar',
    'khaldun': 'ibnKhaldun', 'li bai': 'liBai', 'libing': 'liBing', 'liqingzhao': 'liQingzhao',
    'luban': 'luBan', 'lubuwei': 'luBuwei', 'mariahabraea': 'mariaHebraea',
    'moduchanyu': 'moduChanyu', 'nasi': 'graciaMendesNasi', 'nzinga': 'nzingaOfNdongo',
    'omarkhayyam': 'epicurus', 'pizan': 'christineDePizan', 'quyuan': 'quYuan',
    'sanghongyan': 'sangHongyang', 'shonagon': 'seiShonagon', 'simaqian': 'simaQian',
    'sulayman': 'sostratus', 'sunshuao': 'sunshuAo', 'suntzu': 'sunTzu', 'susong': 'suSong',
    'taqi': 'taqiAlDin', 'thales': 'thales', 'thutmose': 'thutmoseTheSculptor',
    'tiravalluvar': 'tiruvalluvar', 'trungtrac': 'trungTrac', 'unnini': 'sinLeqiUnninni',
    'wangxizhi': 'wangXizhi', 'widowqing': 'widowQing', 'yarhai': 'yarhai',
    'yisunsin': 'yiSunSin', 'zhangheng': 'zhangHeng', 'zhengguo': 'zhengGuo',
    'zhugeliang': 'zhugeLiang', 'zizka': 'janZizka',
}
# One painting an age in each of three sets. A game shows one set throughout.
AGES = {
    'age1form_alt': 'form1', 'age2form_alt2': 'form2', 'age3form': 'form3', 'age4form_alt': 'form4',
    'age1still': 'still1', 'age2still': 'still2', 'age3still': 'still3', 'age4still': 'still4',
    'age1abstract': 'abstract1', 'age2abstract': 'abstract2', 'age3abstract': 'abstract3',
    'age4abstract': 'abstract4',
}
# The two paintings of the ending page: the local player wins, or another seat does.
ENDINGS = {'ending_win': 'win', 'ending_loss_alt': 'loss'}
# One portrait a leader, shown on the setup's leader card and in diplomacy.
# Where the user made two versions, the table names the one that was chosen.
LEADERS = {
    'alexander': 'alexanderTheGreat', 'battuta': 'ibnBattutaOfTangier', 'cleopatra': 'cleopatra',
    'cyrus': 'cyrusTheGreat', 'genghis': 'genghisKhan', 'jayavarman': 'jayavarmanVII', 'joan': 'joan',
    'justinian': 'justinian', 'medici': 'lorenzoDeMedici', 'mehmed': 'mehmedTheConqueror',
    'musa_alt': 'mansaMusa', 'nezahualcoyotl': 'nezahualcoyotl', 'pachacuti': 'pachacuti',
    'qin': 'qinShiHuang', 'rashid_alt': 'harunAlRashid', 'sejong': 'sejongTheGreat',
}
# One wide painting a government, shown in its banner (3:1).
GOVERNMENTS = {
    'aristocracy': 'aristocracy', 'chiefdom': 'chiefdom', 'curia': 'theCuria',
    'divinemandate': 'divineMandate', 'elders': 'councilOfElders', 'estates': 'theEstates',
    'imperium': 'imperium', 'merchantleague': 'merchantLeague', 'priestking': 'priestKing',
    'republic': 'republic', 'sultanate': 'theSultanate', 'tyranny': 'tyranny',
    'warchief': 'warChief',
}
# One square picture a belief, shown in a round window.
BELIEFS = {
    'harvest': 'goddessOfTheHarvest', 'hearth': 'keeperOfTheHearth', 'star_readers': 'starReaders',
    'calendar': 'keeperOfTheCalendar', 'standing_stones': 'theStandingStones',
    'ancestor_worship': 'ancestorWorship', 'hunt': 'ladyOfTheHunt', 'woods': 'spiritsOfTheWood',
    'river': 'riverMother', 'lord_sea': 'lordOfTheSea', 'anvil': 'godOfTheForge',
    'blood': 'ritesOfBlood', 'crossroads': 'oracleOfTheCrossroads', 'sacred_fire': 'sacredFire',
    'desert': 'desertFathers', 'winter': 'winterMother', 'stone_hoard': 'lordOfTheHoard',
    'vigil': 'courtAugurs', 'vineyard': 'vineyardRites', 'heroes': 'cultOfHeroes',
    'herd_gods': 'herdGods', 'merchants': 'patronOfMerchants', 'muses': 'theMuses',
    # The 17 follower beliefs and the 16 enhancer beliefs, with no picture yet (2026-11-21).
    'cathedrals_of_the_sky': 'cathedralsOfTheSky', 'pilgrimage': 'pilgrimage',
    'feast_days': 'feastDays', 'holy_water': 'holyWater', 'lamps_of_the_shrine': 'lampsOfTheShrine',
    'choirs': 'choirs', 'tithe_houses': 'titheHouses', 'the_quiet_hours': 'theQuietHours',
    'warrior_monks': 'warriorMonks', 'harvest_blessing': 'harvestBlessing',
    'guild_of_the_faithful': 'guildOfTheFaithful', 'common_table': 'commonTable',
    'minarets': 'minarets', 'temple_spires': 'templeSpires', 'the_open_kitchen': 'theOpenKitchen',
    'the_eternal_flame': 'theEternalFlame', 'the_alms_box': 'theAlmsBox',
    'reliquaries': 'reliquaries', 'inquisition': 'inquisition', 'the_long_road': 'theLongRoad',
    'itinerant_preachers': 'itinerantPreachers', 'the_pulse_of_bells': 'thePulseOfBells',
    'ecclesia': 'ecclesia', 'apostles': 'apostles', 'sacred_cartography': 'sacredCartography',
    'holy_order': 'holyOrder', 'congregation': 'congregation', 'pilgrims_coin': 'pilgrimsCoin',
    'world_church': 'worldChurch', 'the_long_prayer': 'theLongPrayer', 'the_crusade': 'theCrusade',
    'marvels_of_the_faith': 'marvelsOfTheFaith', 'the_scriptoria': 'theScriptoria',
    # The names the first round of follower masters arrived with (2026-11-21); `pilgrimage`
    # and `choirs` and `minarets` already match a line above.
    'almsbox': 'theAlmsBox', 'cathedrals': 'cathedralsOfTheSky', 'commontable': 'commonTable',
    'eternalflame': 'theEternalFlame', 'feastdays': 'feastDays',
    'guildfaithful': 'guildOfTheFaithful', 'harvestblessing': 'harvestBlessing',
    'holywater': 'holyWater', 'lamps': 'lampsOfTheShrine', 'openkitchen': 'theOpenKitchen',
    'quiethours': 'theQuietHours', 'templespires': 'templeSpires', 'tithehouses': 'titheHouses',
    'warriormonks': 'warriorMonks',
}
# The title screen's one painting.
TITLE = {'title': 'title'}
KINDS = {
    'beliefs': {'names': BELIEFS, 'ratio': (1, 1), 'width': 480},
    'endings': {'names': ENDINGS, 'ratio': (16, 9), 'width': 1600},
    'ages': {'names': AGES, 'ratio': (16, 9), 'width': 1600},
    'wonders': {'names': WONDERS, 'ratio': (16, 9), 'width': 1600},
    'people': {'names': PEOPLE, 'ratio': (5, 6), 'width': 720},
    'leaders': {'names': LEADERS, 'ratio': (3, 4), 'width': 720},
    'governments': {'names': GOVERNMENTS, 'ratio': (3, 1), 'width': 990},
    'title': {'names': TITLE, 'ratio': (16, 9), 'width': 1600},
}
# Borders the automatic trim cannot see (a pale strip on two sides only):
# pixels to cut from the left, top, right and bottom of the master.
INSETS = {
    'ages/age4form_alt': (38, 0, 36, 0),
    # Leader masters with a second frame inside the paper mount, or a coloured edge.
    'leaders/alexander': (54, 54, 54, 54),
    'leaders/joan': (52, 60, 52, 60),
        'leaders/mehmed': (52, 60, 52, 52),
    'leaders/pachacuti': (22, 14, 22, 14),
    # People masters whose paper mount shows on two or three sides only, so the
    # automatic trim does not see a mount (it needs all four corners to match).
    'people/ahmose': (34, 38, 34, 0),
    'people/alhaytham': (34, 51, 34, 0),
    'people/anacharsis': (31, 0, 27, 0),
    'people/boudica': (20, 0, 20, 0),
    'people/caiyan': (37, 45, 34, 0),
    'people/coeur': (17, 0, 17, 0),
    'people/gajahmada': (40, 42, 41, 0),
    'people/jangyeongsil': (46, 0, 47, 0),
    'people/leonidas': (46, 50, 44, 0),
    'people/libing': (35, 0, 34, 0),
    'people/moduchanyu': (34, 0, 36, 0),
    'people/ptahhotep': (59, 53, 56, 0),
    'people/quyuan': (56, 0, 55, 57),
    'people/shikibu': (22, 0, 20, 0),
    'people/susong': (46, 0, 47, 0),
    'people/wenamun': (29, 0, 29, 0),
    'people/zhangheng': (47, 53, 47, 0),
}
# Where each leader's head is, so that every portrait shows the leader at one
# size, from the middle of the body up. Fractions of the trimmed picture:
# (centre of the face across, top of the hair or headgear to keep, top of the
# skull, chin). `frame` cuts a 3:4 box that makes skull-to-chin HEAD_SHARE of
# the height. A master that is already closer than that keeps its whole frame.
HEAD_SHARE = 0.28
HEAD_ROOM = 0.05
LEADER_FRAMES = {
    'alexander': (.42, .08, .08, .43), 'battuta': (.50, .07, .08, .36),
    'cleopatra': (.65, .03, .10, .40), 'cyrus': (.55, .02, .13, .39),
    'genghis': (.49, .15, .17, .30), 'jayavarman': (.53, .03, .20, .46),
    'joan': (.50, .10, .13, .35), 'justinian': (.50, .00, .16, .49),
    'medici': (.55, .05, .07, .34), 'mehmed': (.58, .08, .19, .43),
    'musa_alt': (.46, .07, .12, .30), 'nezahualcoyotl': (.60, .04, .19, .42),
    'pachacuti': (.50, .00, .16, .36), 'qin': (.52, .01, .07, .20),
    'rashid_alt': (.48, .08, .20, .39), 'sejong': (.56, .12, .20, .39),
}


def frame(im, spec):
    """Cut the 3:4 box that shows a leader from the middle of the body up."""
    cx, keep, skull, chin = spec
    w, h = im.size
    size = min(1.0, (chin - skull) / HEAD_SHARE)   # the box's share of each side
    y0 = min(max(0.0, keep - HEAD_ROOM * size), 1.0 - size)
    x0 = min(max(0.0, cx - size / 2), 1.0 - size)
    return im.crop((round(x0 * w), round(y0 * h), round((x0 + size) * w), round((y0 + size) * h)))


DARK = 26        # a black bar is a line whose brightest tenth is darker than this (0 to 255)
MOUNT = 46       # a mount line is one whose pixels sit this close to the mount's colour
MAX_TRIM = 0.2   # never cut more than a fifth from one side
MAX_MOUNT = 0.08 # a paper mount is thinner than this share of a side


def trim(im):
    """The box of the picture without its border: black bars, or a one-colour mount."""
    rgb = im.convert('RGB')
    w, h = rgb.size
    px = rgb.load()

    def patch(x0, y0):
        vals = [px[x, y] for x in range(x0, x0 + 6) for y in range(y0, y0 + 6)]
        return tuple(sum(v[i] for v in vals) / len(vals) for i in range(3))

    def far(a, b):
        return max(abs(a[i] - b[i]) for i in range(3))

    corners = [patch(1, 1), patch(w - 7, 1), patch(1, h - 7), patch(w - 7, h - 7)]
    mount = None
    if all(far(corners[0], c) < 34 for c in corners[1:]):
        mount = tuple(sum(c[i] for c in corners) / 4 for i in range(3))

    def border_line(pixels, mount=None):
        # Black bar: nearly every pixel dark.
        lum = sorted((p[0] * 299 + p[1] * 587 + p[2] * 114) // 1000 for p in pixels)
        if lum[int(len(lum) * 0.9)] < DARK:
            return True
        # Mount: the picture's four corners share one colour, and so does this line.
        if mount is not None:
            dist = sorted(far(p, mount) for p in pixels)
            return dist[int(len(dist) * 0.85)] < MOUNT
        return False

    def edges(mount):
        def col(x):
            return border_line([px[x, y] for y in range(0, h, 4)], mount)

        def row(y):
            return border_line([px[x, y] for x in range(0, w, 4)], mount)

        left = 0
        while left < w * MAX_TRIM and col(left): left += 1
        right = w
        while right > w * (1 - MAX_TRIM) and col(right - 1): right -= 1
        top = 0
        while top < h * MAX_TRIM and row(top): top += 1
        bottom = h
        while bottom > h * (1 - MAX_TRIM) and row(bottom - 1): bottom -= 1
        return left, top, right, bottom

    left, top, right, bottom = edges(mount)
    if mount is not None:
        # A real mount is a thin strip on all four sides. A plain sky that
        # happens to match the corners is not: it would cut deep on one side.
        cuts = (left / w, top / h, (w - right) / w, (h - bottom) / h)
        if not all(0 < c <= MAX_MOUNT for c in cuts):
            mount = None
            left, top, right, bottom = edges(None)
    # A soft edge beside a border: take a few more pixels where something was cut.
    pad = 4 if mount is not None else 2
    if left: left += pad
    if right < w: right -= pad
    if top: top += pad
    if bottom < h: bottom -= pad
    return left, top, right, bottom


def run(kind):
    spec = KINDS[kind]
    masters = f'art-masters/{kind}'
    out_dir = f'public/art/splash/{kind}'
    rw, rh = spec['ratio']
    if not os.path.isdir(masters):
        print(f'no folder {masters}')
        return
    os.makedirs(out_dir, exist_ok=True)
    for name in sorted(os.listdir(masters)):
        stem, ext = os.path.splitext(name)
        if ext.lower() not in ('.png', '.jpg', '.jpeg', '.webp'): continue
        if stem not in spec['names']:
            print(f'skipped (not in the {kind} table): {name}')
            continue
        src = Image.open(os.path.join(masters, name)).convert('RGB')
        box = trim(src)
        l, t, r, b = INSETS.get(f'{kind}/{stem}', (0, 0, 0, 0))
        box = (max(box[0], l), max(box[1], t), min(box[2], src.width - r), min(box[3], src.height - b))
        im = src.crop(box)
        if kind == 'leaders' and stem in LEADER_FRAMES:
            # Bring the trimmed master to 3:4 first, so the fractions mean the same on every one.
            w, h = im.size
            if w * 4 > h * 3:
                nw = h * 3 // 4
                im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
            else:
                im = im.crop((0, 0, w, w * 4 // 3))
            im = frame(im, LEADER_FRAMES[stem])
        w, h = im.size
        if w * rh > h * rw:
            nw = h * rw // rh
            im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
        else:
            nh = w * rh // rw
            # Portraits keep their top: the head is there. Wide pictures keep their middle.
            off = 0 if rh > rw else (h - nh) // 2
            im = im.crop((0, off, w, off + nh))
        if im.width != spec['width'] and (im.width > spec['width'] or kind == 'leaders'):
            im = im.resize((spec['width'], spec['width'] * rh // rw), Image.LANCZOS)
        out = os.path.join(out_dir, spec['names'][stem] + '.jpg')
        im.save(out, quality=85, optimize=True, progressive=True)
        cut = '' if box == (0, 0) + src.size else f'  border cut {box}'
        print(f'{name} -> {out}  {im.width}x{im.height}  {os.path.getsize(out) // 1024} KB{cut}')


if __name__ == '__main__':
    kinds = sys.argv[1:] or list(KINDS)
    for kind in kinds:
        if kind not in KINDS:
            sys.exit(f'unknown kind {kind}; choose from {", ".join(KINDS)}')
        run(kind)
