
The instruments for traversing the Sea, and a necessity for any Expedition, employing and moving Ships about it warrants its own sub-systems. Like Outposts, Ships are handled by Cards, representing the vessels, their crews, and equipment aboard.
#### Reading a Ship Card
****
All Ship Cards have the following Traits, which quantify the broad-strokes of what a Ship can do and how.

**Durability**
	When a Ship suffers Damage it suffers Notches just like any Object (assuming its Armor does not Blunt or negate the Damage). When its Notches exceed its Durability, it is Broken. Broken Ships must be Repaired before they can operated again.

**Size**
The rough dimensions of the ship. The value of this Trait can be interpreted as follows:
- The Ship's length is roughly equal to this number in Meters.
- A Ship's own Weight in Bulk is equal to this number times 300.
- *At least half as many Crew are required for the Ship to function.*

**Charge and Draw**
Ships are powered by an Alchemic Alembic Engine, which propels them and provide air at the cost of Residue. This only outputs only so much power, quantified by its Charge. This is compared to the Draw of anything equipped to the Ship. 
- `If the total Draw ever exceeds the Charge, its Alembic shuts down, making all equipment with a Draw non-functional and the Ship itself loses the ability to Move.`

**Speed**
The velocity at which the Ship can move, read as follows:
- The Ship can move about thrice this many Maru in 4 Hours.
- In Ship Combat, the Ship Moves this many Hexes at once.

**Capacity**
	A measure, in Bulk, of how much a Ship can safely carry. When overloaded past this value, its Speed falls by one step; Ships cannot otherwise carry double their Capacity.
	
**Fuel Management**
	Ships consume Residue to traverse the Sea. For every 100 Maru Traveled, the ship's Charge is decreased by 1. The only way to restore this is by spending Residue.
	- Refueling Cost:` T×Charge×Speed×100`

#### Ship Equipment and Crew
****
Weapons, Expansions, and other supplemental features can be added to any ship. In addition to the Crew, these are all represented by their own Cards.

**Crew**
A Ship needs manpower. Crew Cards represent NPCS and have the following Traits:
- *Tier*
- *Cost*: How much Crew must be paid per Month to retain their service.
- *Additional Traits*: What Type of Creature is represented by the Card and other unique effects when Played independent of an Action in Ship Combat.
*PC Crew-Cards*
	Each Player Character also has a Crew-Card representation. Your Tier is equal to your own, and Traits determined by your Type (presumably Verdun) Skills and Disciplines.

**Ship Weapons**
Used to fire on other vessels and greater threats in the Sea. Weapons have the following Traits:
- *Tier, Cost, and Weight in Bulk*
- *Draw*: Compared to Ship-Charge.
- *Damage*: Inflicted by Attacks.
- *Range*: The number of Hexes (100 Meters Each) it may be shot accurately.
- *Accuracy*: Added to Attacks made with it.
- *Additional Traits*: Such as its nature, its Manpower Cost, Cooldown, and other unique elements.

**Expansions**
This refers to a wide range of additional features that may be added to a Ship, such as cargo-holds, upgraded Engines, and other features. These may have almost any Traits at all.

**Miscellaneous Ship Traits**
- *Alembic*: Powered by an Alembic Engine, a kind of residue-fueled Alchemic Engine able to make air and power.
- *Artifice*: Governed by the Discipline of the same name.
- *Ship*: A vessel used to traverse the Shard Sea.
- *Ship Weapon*: Mounted to a Ship and used to make Attacks.
- *Manpower_x*: The cost of performing an Action.
- *Cooldown_x*: The cost of refreshing a Ship Action on Cooldown.
- *Verdun*: Representing a Verdun NPC(or PC).
#### Distance and Space
****
Ships are much larger than the standard Meter, and use their own measure of Distance fitting the context.

**Distance in Peace**
When Traveling by Ship, the standard unit is the Maru, roughly 300 Km.

**Distance in War**
In Ship Combat, Distances are quantified by 30 Meter Hexes. So, a Ship Weapon with a Range of 2 Hexes can fire at anything within 60 Meters without penalty.

**Terrain Difficulty**
Like normal Combat, Terrain Difficulty for a Ship Hex has additional cost to Move through, equal to the Tier of the Difficulty.

**Height**
In addition to its position on the grid, a Ship also has a Height value, arbitrarily set to 0 where the Players begin in Combat. As the affair progresses, 
*Diagonal Distances in Ship Combat*
	When needed, you can obtain the Diagonal Distance between two Ships by noting their Horizontal and Vertical Distances, and add half the smaller number to the larger.

**Ship Engagement**
While it is technically possible for 2 Ships to occupy the same Hex, it can be a precarious affair. When Ships collide, both suffer Crushing Damage equal to (10×Size)d6, using the larger Ship's value. If this happens or the ships simply come together in Combat, a boarding scenario dictates the transition from Ship Combat to Mixed Initiative.
#### Ship Combat
****

**Initiative, Turns, and Rounds**
At the commencement of hostilities, each Ship rolls Initiative when Combat begins, the Ship with the greatest Speed going first. This creates an order, from highest to lowest, where each Ship may take a Turn. When multiple Ships tie in Initiative, the highest Tier wins, or the tie is resolved at random if they have equal Tiers.
*Turns in Ship Combat*
	During its Turn, the Ship may take Actions by spending Manpower. How much is needed to take an Action are determined by the following Traits:
	- *Manpower*: The Verdun-cost of performing the Action.
		`The Tiers of a Ship's Crew Cards sum to a single value, Manpower. This is spent like AP when performing a Ship Action, determined by a Manpower Cost.`
	- *Cooldown*: The downtime before an Action may be taken again.
		`After being used, Manpower must be spent against this value before it can be used again.
	- *Reactions*: Ship Actions can only be taken on that Ship's Turn, unless the Action has the Reaction Trait. 
		`Ship Reactions may be taken at any time, in response to a Trigger, and have their own Manpower and Cooldown Traits.`
*Targets and Spotting*
	Taking Actions against other Targets of course implies that you can see them. Spotting a Target is required to count them as a Target for anything but the Spot Action. Further, whenever a Ship or other vessel breaks line-of-sight, it also breaks the Spot, and must be Spotted again before it can Targeted.
*Spending and Playing Crew Cards*
	Crew Cards also have unique Traits when Played, which spends the Card independent of a Ship Action. Once spent in either way, Crew Cards are removed from play until refreshed.
*Rounds*
	After all Ships have taken one Turn, the next Round commences, and all Ships re-roll their Initiatives. When they roll Initiative, all of a Ship's Manpower is restored.
*Casualties*
	Suffered Casualties have a value, removing Crew Cards from play. The summed Tiers of Cards removed by Casualties must be equal that value to or greater. So, if a Ship suffered 3 Casualties, a Tier_3 Card, or three Tier_1 Cards must be spent. Cards spent for Casualties are removed from play until the end of Combat.
	- *Deadly Casualties*: The Characters that Crew Cards represent are usually harmed by Casualties. Chaff NPCs are killed and Standard, Elite, and Player Characters suffer a Major Injury when they are removed from Play as a Casualty.

**Mixed Combat**
As written, Ship Combat is distinct from standard Initiative, where Players and NPCs are treated as Cards played in the game of war at Sea. Some circumstances call for a mixture between Combat on-deck, by Ship, and even on land. In such a circumstance, you can integrate Ship Combat with standard Initiative.
*Mixed Initiative*
	This is an adjustment to normal Initiative that makes use of the Terrain Phase, the space between Rounds, as follows:
	- First, Standard Initiative is rolled, and all Characters take their Turns, ending the Round and triggering the Terrain Phase.
	- During the Terrain Phase, Ship Initiative is rolled and all Ships spend what Crew Cards they have available and end their Turns.
	- At the conclusion of the Ship Round, the Terrain Phase ends and Numbered Initiative is rolled again.
*Characters and Crew in Mixed Combat*
	At the start of Initiative, each Character is either placed in Numbered Initiative or treated as a Crew Card. Players may choose this instead of rolling Initiative. Likewise, during the Terrain Phase, one can return a Crew Card to Numbered Initiative. The core rule is simply that:
****
	*No Character may take a Turn in Numbered Initiative and then be represented in the Crew of a Ship in the following Round.*
	- Additionally, Casualties to a Ship can harm Characters or Crew there in a Mixed Battle.
****
*Ships as Places*
	In Mixed Battle, the Ships will likely demand some kind of representation, roughly matching its Size. Ship models and maps can be fun supplements here, time and budget willing, but most often a simple oval on paper or the map will do, as long as it may be moved freely about.
#### Ship Combat Actions
****
Ship Action: **Move**
	`Manpower: (Ship speed)| Cooldown: 1`
	The engine roars, expelling a plume of Alchemic fire.
	`The Ship moves Hexes up to its Speed.`

Ship Action: **Ram**
	`Manpower: (10-Ship Speed)| Cooldown: (1/10th Ship Speed)`
	Your vessel bears down on a foe, bringing conflict to a swift and deadly end, perhaps for both of you.
	`The Ship moves up to twice its Speed, and if it Engages another, they collide.`

Ship Action: **Spot**
	`Manpower: 1| Cooldown: 1`
	Take-aim and report the precise location of a foe or other feature of the Sea.
	`Roll 2d6 plus the Tier of the Card spent against the Tier of an unspotted Target. You Spot the Target on a Success.`
	*Range*
	`To Spot a Target, it must be within Hexes up to twice the Tier of the Card Spent. Any greater than that, and the Test is rolled with Banes equal to the Distance.`
	*Critical Effect*
	`Your next Attack against the Target is easier by 1.`

Ship Action: **Shoot**
	`Manpower: (Weapon-variable)| Cooldown: (Weapon-variable)`
	The essence of war, the principle of Attack.
	`Choose a Weapon, spend Manpower, and roll 2d6 plus its Accuracy against the Target's Tier. Success inflicts the Damage on the Target.`
	- `The Cooldown of this Action is tied to the Weapon used, which must be satisfied before any Weapons can be used to Attack again.`
	- `Additionally, the same Weapon cannot be Shot more than once in the same Round.`
	*Range Limits*
	`If the Target is outside the Weapon's Range, this Test is rolled with Banes equal to the distance in Hexes.`
	*Critical Effect*
	`(Weapon-Variable)`

Ship Action: **Patch it Up**
	`Manpower: (Ship Charge)| Cooldown: 1`
	Hasty repairs, barely able to keep its machinery in check.
	`The Ship's Notch Penalty is removed until Notched again.`

Ship Action: **Evade**
	`Manpower: (6 minus Speed, min 1)| Cooldown: 1/10th Ship Size`
	The principle of retreat.
	`All Attacks against the Ship suffer an additional bane this Round.`
#### Ship Cards
****
Ship: **Skiff**
	`Tier: 1| Durability: 3`
	`Charge: 2| Size: 6| Cost: 10,000`
	`Speed: 1/2| Capacity: 120`
	A small vessel meant to transport Expeditioners short distances, ill-fit for real voyages.
	*Armor*: `Rating-All, Resistance-3_All, Immunity_(all Blunted Damage)`
	*Traits*: `Alembic, Artifice, Ship`
	- `This is small enough to fit within the hull of any Ship of Size 10 or more.`

Ship: **Aether Sloop**
	`Tier: 2| Durability: 6`
	`Charge: 10| Size: 10| Cost: 60,000`
	`Speed: 2| Capacity: 3,000`
	The standard Expedition ship, Sloops are surprisingly versatile exploratory vessels.
	*Armor*: `Rating-All, Resistance-3_All, Immunity_(all Blunted Damage)`
	*Traits*: `Alembic, Artifice, Ship`

Ship: **Shard Hauler**
	`Tier: 3| Durability: 10`
	`Charge: 15| Size: 20| Cost: 100,000`
	`Speed: 1| Capacity: 100,000`
	Meant to transport long-distance cargo in large quantities, the Hauler is the workhorse within the Sea.
	*Armor*: `Rating-All, Resistance-3_All, Immunity_(all Blunted Damage)`
	*Traits*: `Alembic, Artifice, Ship`

Ship: **Warbird**
	`Tier: 3| Durability: 10`
	`Charge: 20| Size: 20| Cost: 600,000`
	`Speed: 3| Capacity: 60,000`
	Built with a prow recalling Verdun sword- hilts, the Warbird is the standard military vessel of Gaetic Arks.
	*Armor*: `Rating-All, Resistance-3_All, Immunity_(all Blunted Damage)`
	*Traits*: `Alembic, Artifice, Ship`

Ship: **Sea Falcon**
	`Tier: 3| Durability: 20`
	`Charge: 30| Size: 30| Cost: 6,000,000`
	`Speed: 6| Capacity: 100,000`
	A Reimian design, sharper and more lethal than a Warbird, few Arks boast more than one or two in their whole shipyard.
	*Armor*: `Rating-All, Resistance-6_All, Immunity_(all Blunted Damage)`
	*Traits*: `Alembic, Artifice, Ship`

Ship: **Telmarine-Class War Galleon**
	`Tier: 6| Durability: 30`
	`Charge: 60| Size: 60| Cost: 10,000,000`
	`Speed: 1| Capacity: 1,000,000`
	Only a slim few exist in the whole sea, monstrously large and able to demolish nearly any form of resistance in a heartbeat.
	*Armor*: `Rating-All, Resistance-6_All, Immunity_(all Blunted Damage)`
	*Traits*: `Alembic, Artifice, Ship`
#### Ship Weapons and Expansions
****
Ship Weapon: **Short Ballista**
	`Tier: 1| Cost: 1,200| Weight: 10`
	`Draw: 1| Damage: Impaling, Vicious_3| Range: T| Accuracy: +1`
	A small, mounted bolt-thrower.
	*Traits*: `Artifice, Ship Weapon, Manpower_2, Cooldown_1`
	- `A Critical Hit with a Ballista inflicts 1 Casualty.`

Ship Weapon: **Long Ballista**
	`Tier: 2| Cost: 3,000| Weight: 60`
	`Draw: 2| Damage: Impaling, Vicious_4| Range: 2T| Accuracy: +2`
	Able to cast bolts at greater range, the Long Ballista is the standard Weapon of most Ships.
	*Traits*: `Artifice, Ship Weapon, Manpower_2+T, Cooldown_T+1`
	- `A Critical Hit with a Ballista inflicts 1 Casualty.`

Ship Weapon: **Charge Cannon**
	`Tier: 3| Cost: 10,000| Weight: 300`
	`Draw: 4| Damage: Catastrophic| Range: 3T| Accuracy: -1`
	Specialized for Ship-to-Ship engagement, Charge Cannons surpass Ballistae in deadly threat, if at the cost of ergonomics.
	*Traits*: `Artifice, Ship Weapon, Manpower_3T, Cooldown_3T`
	- `Critical hits with a Cannon inflict twice as many Notches.`

Ship Weapon: **Aether Lance**
	`Tier: 4| Cost: 1,000,000| Weight: 1,000`
	`Draw: 10| Damage: Voltaic, Chaos, Vicious_10| Range: 6| Accuracy: -3`
	A precise, but damnably unwieldy thing, coiled steel bringing to bear nearly unimaginable force, firing arcs of raw power rather than any mundane bolt.
	*Traits*: `Artifice, Ship Weapon, Manpower_10, Cooldown_10`
	- `Critical hits with an Aether Lance inflict thrice as many Notches.`

****

Ship Expansion: **Hull-Plating**
	`Tier: T| Cost: 1,000×T×(Size)| Weight: 30T(Ship Size)`
	A lining of hardened steel, meant to be affixed to the hull.
	*Traits*: `Expansion`
	- `This increases a Ship's Resistence to all Damage by T.`

Ship Expansion: **Engine-Sharp**
	`Tier: T| Cost: 1,000×T×(Size)| Weight: 10T(Ship Size)`
	Optimized Alembic drive-lines capable of conferring greater acceleration.
	*Traits*: `Expansion, Draw_3T, Artifice`
	- `This grants a Buff to the Ship's Speed of T.`

Ship Expansion: **Reinforcements**
	`Tier: T| Cost: 1,000×T×(Durability)| Weight: 30T(Ship Size)`
	Underlying the Ship's hull, Reinforcements confer greater resilience to harm suffered.
	*Traits*: `Expansion`
	- `This confers a Buff to the Ship's Durability, up to 3T.`

Ship Expansion: **Cross-Sails**
	`Tier: T| Cost: 1,000×T×(Speed)| Weight: 10T(Ship Size)
	An additional set of Aether Sails, able to greatly increase a Ship's maneuverability.
	*Traits*: `Expansion, Artifice`
	- `This confers a Buff of T to the Ship's rolled Initiative.`

Ship Expansion: **Lookout Post**
	`Tier: T| Cost: 1,000×T×(Size)| Weight: 10T(Ship Size)`
	Instruments for spotting and efficient cover-penetration.
	`This confers a Bonus of T to Spotting Tests, and increases the Range of Spotting by T.`
	*Traits*: `Expansion`

Ship Expansion: **Navigatory Instruments**
	`Tier: T| Cost: 1,000×T×(Size)| Weight: 10T(Ship Size)`
	Used to more efficiently find one's way in the Sea.
	`When Plotting a Course, you may increase your Traversal by T.`
	*Traits*: `Expansion, Artifice`

Ship Expansion: **Aether Wavecaster**
	`Tier: T| Cost: 1,000×T×(Charge)| Weight: 10T(Ship Size)`
	An array of tools used to locate Shards and other phenomena within the Sea, sensitive to certain, subtler resonances and ripples in the Aether itself.
	`This is required to make Forecasts in the Shard Sea.`
	*Traits*: `Expansion, Artifice`

#### The Crew
****
Crew Card: **Deckhand**
	`Tier: 1| Cost: 600`
	A common sailor, trained well enough to do their part.
	*Traits*: `Verdun`

Crew Card: **Runner**
	`Tier: 1| Cost: 800`
	Trained for quick-action, Runners tend to be younger Verdun on their way to greater positions.
	*Traits*: `Verdun`
	- `Once per Combat, the Runner can be Played to end the Cooldown of any single Action.`

Crew Card: **Expeditioner Ordinary**
	`Tier: 1| Cost: 1,000`
	Established Expeditioners, Ordinaries are reliable, and capable of greater, if limited feats.
	*Traits*: `Verdun`
	- `Once per Combat, the Ordinary can triple its Tier for one Round.`

Crew Card: **Gunner**
	`Tier: 2| Cost: 2,000`
	Trained marksmen, Gunners are highly efficient Crew, best able to dispatch dangers in the depths of the Sea.
	*Traits*: `Verdun`
	- `Each Gunner contributes 1 more Manpower, but only for Shooting Ship Weapons.`

Crew Card: **Expedition-Senior**
	`Tier: 2| Cost: 2,600`
	A veteran Sailor and Expeditioner, capable of nearly any task the Sea demands and more.
	*Traits*: `Verdun`
- `Once per Combat, the Senior can triple its Tier for one Round.`

Crew Card: **Expedition Marine**
	`Tier: 3| Cost: 6,000`
	The Ark's finest, and nothing less.
	*Traits*: `Verdun`
	- `Once per Combat, the Marine can be Played to take any Ship Action regardless of its Manpower or Cooldown.`
#### Player Character Crew Traits
****
Player Characters are also represented by Crew Cards in Ship Combat. These look like this:

Crew Card: **Player Name**
	`Tier: Yours`
	*Traits*: `Your, usually Verdun`
	- `Pick two Traits, qualifying with you Skills and Disciplines.`

**Skill Traits**
- Immanence: `Once per Combat, you may exchange this Trait for another qualified for.`
- Action/Potence: `Once per Combat, you may change an Attack to a Critical Success.`
- Vitality/Resolve: `Once per Combat, you may prevent a Casualty.`
- Creation: `Once per Combat, you may remove a Notch from your Ship.`
- Traversal: `Once per Combat, you may Move for free.`
- Darkness: `Once per Combat, you can break all lines-of-sight on your Ship.`
- Luminance: `Once per Combat, you can change Spot Test to a Critical Success.`
- Unity: `Once per Combat, you can increase your Ship's Manpower by thrice the Tier of any one Crew Card for that Round.`
**Discipline Traits**
- Arcane: `You can perceive any supernatural phenomena in your surroundings, unless concealed by an effect with a Tier exceeding your Arcane.`
- Artifice: `When Patching it Up, you can make an Artifice Test, DC_12+(Ship Tier) to remove one Notch. Critical Success removes 2.`
- Span: `When Rammed, you can increase Ship Hardness by twice your Span.`
- Cascade: `If you Shoot a Ship Weapon, and its Cooldown is less than or equal to your Cascade, you can Shoot it once more for free, inflicting 10 less Damage.`
- Crush: `When Ramming, you can add twice your Crush to the Damage dealt to the Target.)`
- Sharpshooting: `You can add your Sharpshooting to Damage dealt with Ship Weapons.`
- Scouting: `When Spotting, you can add half your Scouting.`
- Skullduggery: `When Attacking a Ship that has not Spotted yours, add your Skullduggery to the Attack.`
- Tactics: `Once per Combat, you can perform any Ship Action as a Reaction to anything.`
- Leadership: `Your Ship's Manpower is increased by your Leadership.`
  