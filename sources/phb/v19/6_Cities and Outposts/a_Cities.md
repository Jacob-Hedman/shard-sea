From the furthest perspective, a City is represented by three Stats:
- **Size**: which measures occupants.
- **Wealth**: in terms of development and monetary power.
- **Might**: its military potency.
*Stats as Abilities*
	Like a Creature, a City's Stats have a relative scale (where 1-3 is quite low and 24 is very very high) and a Stat Bonus, one for every six. These Bonuses are added to relevant rolls when interacting with the City.
*Tier Derivation*
	The Tier of a City is the sum of its Stat Bonuses, so a City with 12 in every Stat would by Tier_6.
*City Geometry*
	When "zooming in" on a City, you'll want to know what's there. Thereby, the Districts below provide a generative means of constructing a map for representing Cities as traversable locales.

#### Generating City Districts
****
Mapping a City is fairly simple. Consider each District description in order and note the Requirements. If the City meets them, follow the Size directions for placing those Hexes in the City. (Where T is mentioned in a District, it is always that of the City, that is the sum of its Stat Bonuses.)

Once all Hexes have been placed, one can shuffle them about a bit to achieve a desirable shape. This should produce a map that generally represents the City as an environment, and presents opportunities for gameplay.

**Center**: (No Requirements)
	*Size*: One Hex.
	*Effects*: `For all effects measuring the Tier of a City itself, its Center is used. The content of this District varies by T:`
	- 1: `A simple Fort.`
	- 3: `Built into a Bailey defended by a palisade.`
	- 5: `A Keep adjacent to its Nobility.`
	- 6: `Several grand houses against a Keep, appointed for highest ranked adjacent to its Nobility.`
	- 8: `Enclosed in Walls (as its externals), a Castle and Keep, both well defended, adjacent to the District of Nobility.`
	- 10: `Enclosed in Walls (as its externals) creating a secluded upper City including the Nobility District, a grand Palace of epic size, and a well appointed Bastion.`

**Monument**: (No Requirements)
	*Size*: T+1d6 Hexes, scattered about the City.
	*Effects*: `These are plazas where important events and figures are remembered. Each recalls something different, so each Hex is an opportunity to conceive just such a thing.`
	*The Nature of a Monument*
- *Form*: 1d6
	- 1: A figural statue. 
	- 2: A great column.
	- 3: A monolith of hewn stone.
	- 4: A tree of a rare sort.
	- 5: A great tablet.
	- 6: An entire building.
- *Subject*: 1d6
	- 1: Something of spiritual import. 
	- 2: War and its spoils.
	- 3: Remorse and memory.
	- 4: The life of one great.
	- 5: Recalling hardship survived.
	- 6: Lauding prowess won.
- *Age*: 1d6
	- 1: Fresh in presence and memory.
	- 2: In the minds of the older generation.
	- 3: Perhaps one or two still living remember its building.
	- 4: The last living witness to its building has long passed.
	- 5: As old as the City's founding.
	- 6: Ancient, older than the City.

**Market**: (No Requirements)
	*Size*: 1d6+(Wealth Bonus) Hexes, usually alone and near Gates.
	*Effects*: `Markets exist to facilitate trade, according to the availability of the City.`
	- Resources: `Resources the City has direct access to (from surrounding Hexes) trade at 90% their default price. Resources from afar trade for more, depending on the average travel time| 1 Day: 110%| 1 Week: 150%| 1 Month: 200%| 6 Months or more: 600%|`
	- Items: `Items can be purchased up to a Tier of T/2 (but 4 or more are exceedingly rare regardless) and, if they include a given Resource, apply the rules above for the most expensive one to the price.`

**Outskirts**: (No Requirements)
	*Size*: T+(Size Bonus)d6 Hexes, scattered outside Walls around the City.
	*Effects*: `Contains simple dwellings in the periphery of a City, usually inhabitted by rural laborers and other common folk.`

**Farms**: (No Requirements)
	*Size*: T+(Wealth Bonus)d6 Hexes, outside Walls and adjacent to its Outskirt Hexes.
	*Effects*: `Produces food for the City, when destroyed or taken, the City enters a Famine.`

**Guardpost**: (No Requirements)
	*Size*: 1+(Might Bonus)d6 Hexes, near the Walls and Center, never adjacent.
	*Effects*: `All adjacent Hexes are more Guarded by 1. These usually have Stockades and places for holding captives.`

**Slum**: (Requires Walls)
	*Size*: Td6 hexes, arranged near Gates in the Walls, can be both inside or outside Walls.
	*Effects*: `These Districts are Unguarded except in rare circumstances, and where most criminal activity occurs.`

**Temple**: (Requires Tier_2)
	*Size*: (Wealth and Might Bonus) Hexes, near to the Center.
	*Effects*: `These venerate the favored Deities within the region. In general, each Temple has T serving Priests. Priests can be expected to have at least 2+T Virtue.`

**Commons**: (Requires Tier_2)
	*Size*: (Size and Wealth Bonus)d6 Hexes, near the Slums.
	*Effects*: `Commons house the employed and well-payed members of the general population, are Guarded and usually well appointed with roads and clean streets.`

**Guilds**: (Requires Tier_3)
	*Size*: (Wealth and Size Bonus)d6, near the Commons.
	*Effects*: `Where Guild Halls and their workers produce fine goods. When purchasing services here, use the Crafting (or Discipline specific) rules assuming a Craftsmen with T/2 in Creation and T Training in any relevant Disciplines.`

**Nobility**: (Requires Tier_3)
	*Size*: (Wealth Bonus)d6 Hexes, minimum 1, near the Center.
	*Effects*: `The Quarter of Nobility houses the upper class of the City, and is more Guarded by T.`

**Statehouse**: (Requires Tier_2)
	*Size*: Hexes equal to 1+(Might Bonus), near the Nobility.
	*Effects*: `The Statehouse represents a court of law`

**Walls**: (Requires a Might Bonus)
	*Size*: Special, Wall Hexes outline all Hexes not stated to be outside of them or otherwise situated (like the Sewer).
	*Effects*: `3T+(Might Bonus) Meters tall, with a Durability of ten times their Height, DR:3_All, per Space, these surround and protect the propery body of a City. Every third Hex or so has a Guard Post and Gate, and at T3 or greater, these include walkable parapets.`

**Sewer**: (Requires Tier_2)
	*Size*: (Wealth and Size Bonus)d6 Hexes, technically under the City, but represented elsewhere on the map.
	*Effects*: `Underground, these provide drainage for refuse, rain, etc. Things forgotten, misplaced, or hidden often seem to end up here. The most remote of these Hexes might stray into deeper places than a simple drain.`

**Gaol**: (Requires Tier_3)
	*Size*: (Might Bonus)d6 Hexes, underground like the Sewer.
	*Effects*: `These are dungeons for holding criminals and other prisoners. Usually, only two or so Hexes are actually used, which have double the normal Guard Value. The remaining Goal Hexes lie abandoned, perhaps leading to elder secrets of the City.`

#### Walking the City
****
Inside a City, players traverse by moving Hex to Hex just like any map. (You can even introduce the Objective and Subjective distinction for maps that aren't quite perfect if desired.) 

**Hex Size**
In general, each City Hex is about a Kilometer, and moving between them takes about 10 Minutes of in-game time. Hexes outside of a City that are not directly adjacent take twice as long to traverse (but may be further if desired, especially if styled as satellite villages to a larger City.)

#### Crime and Punishment
****
Within a City, crime is met with opposition by its Guards. All Districts within a City are Guarded. This is a value equal to:
****
	**Guarded Value** = 1+(Size, Might, and Wealth Bonuses)
****
Consequently, a City with 6 in all Stats would be Guarded 4.

**Rolling the Guard Value**
When someone commits a crime within a City, the GM should roll Chaos Dice equal to the Guard Value in secret. If any of them come up face 6, they are seen.
*Sneaking By*
	Using the Sneaking Activity, one can avoid this roll and its consequences. However, if the Activity results in a failure, the GM should roll twice the Guard Value.
*Regional Influence*
	Districts outside the Walls are less Guarded by 1. Some Districts (and especially some locations) may be more so. At GM Discretion, the Guard Value can be adjusted for the place and time. A guide to these adjustments can be found below.
	- *Lax protection*: -1
	- *Tight Security*: +3
	- *Heavy Surveillance*: +6

**Fighting the Guards**
When criminals resist, they are initially met by 1d6+(Guard Value) Guards. For each Round, the GM can roll the Guard Value again, and another Guard arrives for each 6.
*Getting Away with It*
	When this happens, the culprit is Wanted, with a bounty known to the surrounding area, even if they escape.

