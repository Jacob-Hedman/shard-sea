## Cities, Stats, Regions, Zones, and Structures
****
From the furthest perspective, a City in Shard of Life is represented by three Stats:
- **Size**: which measures occupants.
- **Wealth**: in terms of development and monetary power.
- **Might**: its military potency.

**The First and Last City: The Ark**
In the Shard Sea, the City is often seen in the form of an Ark. Almost all Arks are immense and have 20 in each Stat.

**Stats as City-Abilities**
A City's Stats work almost exactly like Abilities, and have roughly the same ranges; i.e., 1 or 2 is very little, and 20 is very large. Stats can also have Threshold Bonuses, just like Abilities. So, a City with a Wealth of 6 has Wealth Bonus, or Wb, of 1, 12 for 2, etc.

**The Wheel of Civilization**
This is what we use to "zoom in" on a City. The City Wheel is equal parts a "City Generator" and generative answer-key for questions about a City. That is, the Wheel can be used to generate an entire City and all of its parts in one go, to generate one or more locations within it, or to arrive at the full City from its parts.

*The Spokes of the Wheel*
	Each Spoke of the Civilization Wheel is a subsystem designed to bring a City's parts into focus. Each Spoke has a Tier, derived from the City's Stat Bonuses. For example, Defense has a Tier equal to the sum of a City's Size and Might Bonuses.

*Regions of a City*
	Cities are divided into three Regions:
	- *Interior*: the innermost and best defended.
	- *Corpus*: the body of a City proper.
	- *Boundary*: where the furthest line is drawn.
	*Use Case*
	Regions are essential for actually mapping and running a City, as well as the occasion of Battle within one. Each one is nested within the next, and Zones of the City have locations by virtue of Regions.

*Zones*
	These are locations in an abstract sense. Each Zone is a place where things are. Each zone has a Terrain and Navigation Difficulty, like the Hexes of overland Travel. These values stand for how fortified/defensible and expansive a Zone is, respectively.
*Linkages and Containment*
	Zones can be inside other Zones, represented by a line-segment from one around another. Likewise, some Zones have relations called Links. When one Zone is Linked (by a line) to another Closed (indicated by an underline) Zone, one must pass through the first to reach the second.
*Structure Zones, or just Structures*
	These are a more concrete type of Zone, which has a Durability in addition to Terrain and Navigation Difficulty. Structures can also stand for specific places within another Zone.
#### The Spoke of Rule
**Tier**: Sb+Mb
****
Governance and enforcement is essential to maintaining the stability of any City.

**The Seat of Power**
At each threshold, the City gains a single Zone from the following list, according to the Tier of Rule:

Interior Structure 0: *Longhouse*
	`Durability: 1| DifficultyTr:2/N:1| Guarded_2.`
	The first seat of power, a somewhat primitive thing, sufficient for the needs of smaller Villages.

Interior Structure 2: *Great Hall*
	`Durability: T| DifficultyTr:T/N:1| Guarded_2.`
	A proper place for hearing disputes and making proclamations.
	- `This replaces the Longhouse.`

Interior Structure 4: *Court*
	`Durability: T| DifficultyTr:T/N:2| Guarded_3.`
	Where the voice of authority might be heard, and its officiators might have space for their own work.
	- `This replaces the Great Hall.`

Interior Structure 6: *Palace*
	`Durability 6| DifficultyTr:4/N:3| Guarded_6 by day, 3 by night.`
	Truly regal, the dwelling and seat of power both.
	- `This does not replace the Court.`

**The Principalities**
Cities have a law, and law is propitiated by enforcers.

Corpus Zone 0: *Stockade*
	`DifficultyTr:1/N:1| Guarded_1`
	For public display and punishment.

Corpus Structure 1: *Jail*
	`Durability: 2|Difficulty_Tr:3/N:2| Guarded_T`
	Where petty criminals are held awaiting trial.

Corpus Structure 3: *Gaol*
	`Durability: 4| Difficulty_Tr:T/N:3| Guarded_T`
	Greater in security than a Jail, designed for arrest at length.

Corpus Structure 6: *Prison*
	`Durability: 6| Difficulty_Tr:T/N:3| Guarded_T`
	Like a keep of a different sort, for the worst and most reprehensible.

*The Watch and the Guarded Trait*
	When Players are in a Zone and commit a crime, the GM secretly rolls Chaos Dice equal to the Guarded value. Depending on how many come up 6, the following happens:
	- 1: They are seen.
	- 2: They are identified.
	- 3+: They are instantly apprehended.
	*Darkness*
	Players can attempt to be Stealthy when committing a crime, of course. Unless they have a way to perfectly avoid notice (like invisibility), this requires a secret Darkness Test against the City's Rule.
#### The Spoke of Immanence
**Tier**: Sb+Wb
****
Cities are the basis for the pursuit of higher things, allowing citizens to come together and look up.

**The Institution of Faith**
Cities are permeated with popular Faith. Shrines to local Gods can be found nearly anywhere, and at every level of development. At the following thresholds, Cities also gain Zone Hexes in a hierarchical fashion:

Corpus Structure 1: *Godhouse*
	`Durability: 2| Difficulty_Tr:1/N:1| Guarded_1 by Day.`
	A place given to the Gods, where people might come and worship in a more private setting than a roadside shrine.

Interior Structure 3: *Temple*
	`Durability: 2| Difficulty_Tr:2/N:T| Guarded_T at all times.`
	Space dedicate to the sacral, spanning a few streets.

Interior Structure 6: *Cathedral*
	`Durability: 3| Difficulty_Tr:3/N:2T| Guarded_2T during the day, T at night.`
	Stretching to the sky, this is a great house given wholly to the heavens.

*The Multiplicity of Faith*
	If the City venerates many Gods, as most do, Zones are structured in this way at the following thresholds:
	- 1: `One common Godhouse for all deities.`
	- 2: `A unique Godhouse for each Deity.`
	- 3: `The Godhouses persist, and the Temple is dedicated to the most favored Deity or Deities.`
	- 6: `All Godhouses are replaced with Temples, and the Cathedral replaces the Temple.`

**The Institution of Knowledge**
Cites concentrate information. Smaller Schoolhouses can be found in almost all Cities, but certain thresholds of development must be met before knowledge really begins to flourish.

Corpus Zone 2: *Guild District*
	`Difficulty_Tr:T/N:T| Guarded_T by Day.`
	Where education in all kinds of making, apprenticeships, and instruction in many Disciplines can be found.

Corpus Structure 4: *Academy*
	`Durability: 2| Difficulty_Tr:2/N:T| Guarded_T by day, 3 by night.`
	Given to the higher aspects of the natural world, such as the study of living things, of states and statecraft, and of military instruction.

Interior Structure 6: *Grand University*
	`Durability: 2| Difficulty_Tr:1/N:1| Guarded_1 by Day.`
	Where those who seek to know all things might go. Crucially, the University is the necessary basis for the academic study of Magic.
#### The Spoke of Habitation
**Tier**: Wb+Sb
****
A City is its people, in a sense. Both grow as one, and the greater both become the more stratified.

**Places of Residence**
The people must reside somewhere, as this is one of the first functions of any City. At the corresponding Tiers, the City gains the corresponding Zones:

Boundary Zone 0: *Slum*
	`Difficulty_Tr:T/N:T| Unguarded`
	An open expanse of rundown dwellings. 

Boundary Zone 1: *Commons*
	`DifficultyTr:Tr:2/N:T| Guarded_1 by Day`
	A homogenous stretch of simple housing. 

Corpus Zone 2: *Guild Quarters*
	`DifficultyTr:1/N:2| Guarded_T/3 by Day.`
	Where Skilled Makers may afford to live.

Interior Zone 4: *Noble's Quarters*
	`Difficulty_Tr:1/N:4| Guarded_T/2 at all times.`
	More fashionable housing, built for those of Noble status.

Interior Zone 6: *State Grounds*
	`Difficulty_Tr:1/N:6| Guarded_T at all times.`
	Palatial grounds where only the most privileged may reside. 

**Housing Prices by Zone Tier**
- *Monthly Rate*: 100+(*Zone Tier*)×(*Size*)×100
- *To rent*: (Monthly Rate)/10
- *To Purchase*: (Monthly Rate)×100
#### The Spoke of Commerce
**Tier**: Sum of Sb and Wb
****

**How Cities Trade**
Commerce is transport, and transport depends of the world. The following Zones are present in a City, depending on its surroundings.

*If the City is adjacent to a closed body of water or river*:
Exterior Structure: *Docks*
	`Durability: 2| Difficulty_Tr:1/N:T| Guarded_T by day, T/2 by night.`
	Where the small boats come and go, occasionally the host to larger vessels.
	`All Trade Routes by freshwater depend on this Structure.`

*All Arks and Outposts also have*:
Boundary Structure: *Shard Port*
	`Durability: T| Difficulty_Tr:T/N:T| Guarded_T.`
	Mooring, chains, and birth, all drawn up to harness the vehicles of travel over the greater expanse.
	`All Trades Routes by Sea depend on this Structure.`

*If the City is an Outpost*
Exterior Structure: **Wyvern Roost**
	`Durablity: 2T| Difficulty_Tr:2/N:3| Guarded_T by day.`
	`Resources_F:0/G:0`
	Designed to house an  Outpost's network of trade and transport, Roost's are a vital element of the continued success and expansion.
	`All overland Trade Routes depend on this Structure.`

**What Can be Had**
Cities are hubs of economy, of manufacture and making. The general list of Items, Consumables, Armor, ingredients, etc. can all be found in a City. 
*Item Tiers*
	One can expect to be able to purchase Items of a given Tier depending on the City's Wealth.
	*Available Item Tier* = 1+(The City's Wealth Bonus)

**Trade**
Cities produce and consume Resources. The world decides what they have in hand and what must be gained in trade. 
*Trade Between Cities*
	For any two Cities that have a means of travel between them, unless they are in conflict, it is assumed trade occurs between them. This can be generalized to a trade network like this.
	- For some Cities A and B, if no City C exists between them, there is a Trade Route between A and B. 
	- If there is some City C between A and B, the Trade Route branches from A to C to B instead.
*Transit Effects*
	Trade Routes are a function of traversal, and are sensitive to the means of a City. If the City has a Port or Docks, other Cities reachable by those means have a direct Trade Route no matter how distant by land.
*Trade Effects on Prices*
	Most Items have some kind of Resource involved and Resources themselves are a tradable good.
	- If a City produces a given Resource, its Value (and the Value of Items that use that Resource) are less expensive by 10%.
	- If a City does not produce a Resource, its Value (and that of Items that use it) is greater. This increase depends on how many links in its trade network must be crossed before arriving at a City that does. For each linkage, the Price is greater by 10%.
	- Pricing of this kind uses the shortest Route by default. Likewise, these adjustments effect both buying and selling Resources and Items.
	- Lastly, if the Route in question is very long in comparison to others, or especially arduous, dangerous, etc. GM discretion can be used to increase the impact of that Trade Route; perhaps give an increase of 20-30% for that linkage, depending on its extremity.
*Generalizing to non-standard goods*
	For unique Resources and Items like rare fruits, the above can be extended to cover these Prices as well. Assume there is some rare Item only sold in City A, which is two links in the network from City B (A-C-B). If we know the Price in A, we can infer the Result in B as being 20% greater, or 10% greater in C, and so on. Concerns about long or inhospitable Routes can be applied here as well.
*Shard Sea Trade*
	Finally, Trade Routes exist through the Shard Sea, but their length is almost always extreme. A Seabound Route counts 6 times for each Sea Hex of Distance.
#### The Spoke of Defense
**Tier**: Sb+Mb
****
Control and regulation, Defense is a City's means of maintaining its internal structure and external force.

 **Defensive Structures**
Cities have means of protection and defense against offending force. All Cities gain the following Structures at the corresponding Tiers of Defense.

Boundary Structure 0: *Palisade*
	`Durability: T| Difficulty_Tr:T/N:4T| Guarded_2 by day, 1 by night.`
	A wall of well-fashioned posts, taller than a man and bridged with timber.
	- `The Pallisade fortifies the Boundary Region, and Contains everything inside of it, requiring that everyone pass through it to enter the City proper.`

Corpus Structure 2: *Hold*
	`Durability: 2T| Difficulty_Tr:3T/N:T| Guarded_2T`
	Highly defensible and perfect for retreat during longer altercations.

Corpus Structure 4: *Inner Wall*
	`Durability: 2T| Difficulty_Tr:2T/N:3T| Guarded_2T by day, T by night.`
	An internal division, demarcating priorities of defense and security.
	- `The Inner Wall Contains everything in the Interior Region, and must be passed through to enter it.`

Interior Structure 5: *Keep*
	`Durability: 3T| Difficulty_Tr:4T/N:2T| Guarded_3T by day, 2T by night.`
	Upright and solid, bastions like these can withstand intense assaults for days on end.

Boundary Structure 6: *Greater Wall*
	`Durability: 4T| Difficulty_Tr:2T/N:3T| Guarded_2T by day, T by night.`
	Supplanting a lesser division with a greater one, the outer wall marks a truly great City.
	- `This Structure entirely replaces the Palisade, and Contains the entire Boundary Region and everything in it.`

**Military**
Cities have the power to raise armies. Cities gain access to kinds of Units, depending on the Tier of Defense. 
*Raising Armies*
	When a City would gather a force for deployment, it can rally total Units with a combined Tiers no greater than its Might. So, a City with Might_10 could raise half as many Levies, or one Unit of Veterans and Shock Troops.

Unit 0: *Levies*
	`Tier: 1| Speed: 2| Durability: 2`
	Raised from the populace of the City and given the basic means of war.
	*Traits*: `Unit, Size_1`

Unit 1: *Militia*
	`tier: 1| Speed: 3| Durability: 3`
	Rank and file, trained to hold and control.
	*Traits*: `Unit, Size_T`
	- `When Defending in the Frontline, the Militia's effective Size is greater by 1.`
	- `Militia suffer a penalty to rolls equal to their Notches.

Unit 3: *Veterans*
	`Tier: 2| Speed: 4| Durability: 4`
	Hardened by experience, keen and ready.
	*Traits*: `Unit, Size_2`
	- `Veterans can shed a Notch if they are neither Attacked nor Attack in a Round.`
	- `Veterans can round up when combining their Sizes.`

Unit 6: *Shock Troops*
	`Tier: 3| Speed: 6| Durability: 6`
	The tip of the spear.
	*Traits*: `Unit, Size_2`
	- `When Attacking, Shock Troops deal an additional Notch.`
	- `When removed from Play, Shock Troops can Notch their foe's Frontline once.`

**Sea Defense**
Outposts and Arks especially have the capacity of defense from nearby threats from the expanse of the Shard Sea. This is quantified in the same manner as Troops. When it Raises an Army, it can also deploy Ships, so long as their Tiers does not exceed twice its Defense.

**Using Armies**
Finally, if a City's Units are captured or destroyed, it cannot Raise more without a permanent reduction to one of its Stats.
#### The Spoke of Production
**Tier**: Sb+Wb
****
Production quantifies the City's ability to acquire and process necessary materials. Smaller Cities tend to be mostly self-sufficient, but those larger necessarily draw more widely from the world around them.

**Production Scale**
Cities with a Production Tier of 2 or less have a Zone for each available Resource, representing nearby resource-extraction and processing. At Tier 3 and beyond, these Zones instead represent nearby, smaller Villages with a Production Tier of 2 that supply this City. 

*Production Zones*

Exterior Structure: *Farmland*
	`Durability: 2T| Difficulty_Tr:1/N:T| Unguarded.`
	Open fields, mills, and granaries.
	- `This produces the Resource of Fiber in all Cities.`

Exterior Structure: *Mines*
	`Durability: 2T| Difficulty_Tr:T/N:T| Guarded_T by day, T/2 by night.`
	A path into the earth, from which comes all manner of useful substances.
	- `This Zone requires the Resources of Residue, Craft-Metal or Rare-Metals and produces the same.`

Exterior Structure: *Quarry*
	`Durability: T| Difficulty_Tr:T/N:T| Guarded_T by day, T/2 by night.`
	Dusty from cut stones.
	- `This Zone requires the Resources of Stone or Minerals and produces the same.`

Exterior Structure: *Millery*
	`Durability: T| Difficulty_Tr:T/N:T| Guarded_T by day, T/2 by night.`
	Where wood is brought for taking shape.
	- `This Zone requires the Resource of Timber and produces the same.`

**Village Zones in Larger Cities**
At Tier 3 Production and greater, the City will have T Zones, each representing a Satellite Village, which is a Minor City with Production_2 within 10 Km. In addition, the following Zones are added, replacing the initial Zones:

Boundary Zone: *Storehouses*
	`Difficulty_Tr:1/N:2T| Guarded_T by day, 2 by night.`
	Where Resources are brought from without.

Corpus Structure: *The Exchange*
	`Durability: 2| Difficulty_Tr:1/N:T| Guarded_T by day.`
	Where all manner of Resources are bought and sold.

**Environmental Sensitivity**
The resources of a City are intentionally somewhat vague. Knowing the local area should help here. For example, Cities near a Sea ought to factor fishing in the Food Zone. A City in a desert, conversely, should not be able to produce fish or timber, and will need to import those.

**Ark Effect**
If the City is an Ark, each Village represents a Pure Shard in the nearby Aether with its own smaller community. Neither Arks nor their Pure Shards can have Residue-producing Mines, but Pure Shards do supply the other Resources.