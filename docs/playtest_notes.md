8/26/26

right click sometimes opens browser options (back forward reload etc.)  [done 8/26]
early game running out of things to build, units too cheap to build wrt tech progress
 - not sure the best fix, whether that means increasing unit costs, increasing building costs, adding more unlockables with clear early game goals
some cards don't have an upgrade  [done 8/26]
increase spawn rate of barbarians  [done 8/26]
shrines and temples should give faith, not culture  [done 8/26]
need general utility orders
combat info should show attack strength of each unit  [done 8/26]
zone of control needs to be added still
civic selection and civic slotting screen could use work
 - could use tarot flavor design
 - fourth option feels awkwardly placed, probably needs to be in the middle
 - could use splash of color
still need to flesh out tech tree in era 2+3+4+5
need happiness buildings in the game
health bars bugged, showing incorrect information, i think its happening when there are 3 units adjacent to each other, the combat somehow modifies the health bar of the third unit that wasn't involved, visual bug only  [done 8/26 — the bar was never in the piece's hide list; see Entry XXIV.8]
should not be allowed to build the incorrect improvement on resource tiles  [done 8/26]
unit cost scaling should increase, chariots are too easy to build
should be a notification when units are attacked/die  [done 8/26]
farms should be buildable on flood plains, any tile with fresh water  [done 8/26]
wow honey is broken, probably needs a rework  [done 8/26 — it was the farm-over-the-seam trap; see Entry XXIV.4]


8/27/26
- explorer lens should open for all military units, not just scout
- icon pass over luxury resourcse, the new unit banners look great
- great person should not appear in city production list
- technology tree looks strange on higher resolution displays
- chiefdom should include 1 wildcard slot, or make all tier 1 orders non-wildcard
- early culture from discoveries should be lower.
- implement queuing for technologies. clicking a technology that can't be researched will auto-queue all prerequisites. Holding shift will add more technologies to the queue, keeping the auto-queue prereqs behavior
- city should auto-work production tiles when creating a settler
- barbarian icons should have red tint (either a glow effect, or icon and border in red), should look different than a player unit
- tile info should indicate if tile is coastal or has access to freshwater
- hovering over a resource should indicate if a technology is needed to build the corresponding improvement. Shoud look like "requires mine (mining)" and is highlighted in red if mining isn't researched
- hovering over the rites on an augur's list of actions should show a description of what they do
- unit's available moves should have more noticeable highlight, its too subtle right now
- unit movement: unit should move at the end of turn following its orders if it has leftover movement. clicking a unit should show it's current orders. moving a unit with no movement should create new orders and overwrite its current orders.
- Tinker's guild should read: newly created worker units gain +1 charge
- There should be a 'view map' icon/button that allows you to look at the map before choosing a draft option. Cities should be viewable.
- city screen doesn't need to show both "Empire +10% science +10% culture" and "Happines +6 cultur science +10%" on adjacent lines. We should just get rid of the empire line, the others are clear enough.
- city screen "dots on the map" text is out of date. We don't need the "X gold in the tresury" text. Need a bit of padding in between the build list and bottom text.
- spearman line needs its own icon distinct from warrior line
- triumphs should have its own screen, and be shown in the notification log
- barbarian camps should how in fog of war, explorer lens should show red highlight in fog of war
- there should be some indication after performing a rite, the rite should end the augur's turn
- we should increase the tiers for receiving new governments, i got to tier 7 on turn 29, not even age 2 yet. I like that i can get lots of cards from prioritizing culture, so we don't necessarily need to increase the cost scaling.
- add ability to build lumbermills at construction. +1 prod, can only be built on forest and jungle tiles
- need a better icon for renown, its not very readable, needs ot be same style as the other icons.
- change aquaduct: +15% surplus growth in city
- culture cost of addin new tiles feels a bit slow, maybe decrease by 10%.
- When performing rite to increase border culture, should instantaneously add the tile and reset the counter (with overflow) if it exceeds the culture needed.
- we need to do a pass on the luxury icons, they're not distinctive enough to remember what they are.
- in happiness calculations, funeral games shouldn't appear as a source of happiness, but just be reflected in the overall city values (if X has 10 pop and a funeral games, it should net to -7 happiness in the demand section)
- when unit is embarked, board piece should turn into a boat
- great people improvements should be buildable anywhere, automatically gives strategic or luxury resource if built on top of them.
- 'escape' key should work to exit the tech screen.
- mapgen needs more bonus and fishing resource to enable wide coastal play


8/28
- citadel improvements should give +2 production
- orders + religion benefits should show in city build screen (aka +1 prod for barracks belief, preview for barracks in the city build list should show +1 prod)
- need to implement unimplemented orders/great people
- performing a rite should end the augur's turn
- cities can only purchase a single unit per turn
- make early tiles easier to get with culture, we can ramp more over time
- same with early food, the first few population feel a bit slow considering how fast other things seem to ramp up.
- science costs need to scale harder
- early statecrafts need a nerf (i'll handle)
- health bars still bugged, aren't showing correct health in bar, but the hover info seems correct.
- terrain bonuses should be additive, not percentage, could you check how civ 5/6 handles this?
- need to flesh out city combat -- city should take damage from attacks from units, captured if a unit attacks and brings city health to zero. Cities heal every turn. Defensive buildings raise defensive strength and city health. City's base defensive strength is equal to strongest trainable unit (strategic resource rules apply). Add a new mechanic: cities under siege (all surrounding tiles under zone of control) take slow chip damage and cannot heal.


8/29
- buying tiles need to be cheaper, like 0.4x what they are now.
- 'end turn' should pause play when a new order or government has been drafted; something like 'new order available' or 'new government available'.
- better indicators for the authority/happiness cost of a new city. Put it in the settler lens, mousing over a tile will show the happiness/authority cost of placing a city there
- i think we need more orders in the pool, as you tend to see a lot of repeats currently. We may also want to introduce a rarity value for the better orders. Please draft some candidates for each age in a new document.
- the prioritization for new tiles from border growth should weight more towards taking tiles with good yields, i notice coastal cities expanding to useless coastal tiles with no resources. Tiles 3 hexes away should be slightly more unfavored.
- prophets should be entirely consumed by starting a religion or enhancing. proclomations and redrafting should still only consume 1 charge as usual. Building a holy site should be a persistent option (does not change the holy city on subsequent builds)