#### Cards in Conflict
****
Battles are a "zoomed-out" view of Combat, allowing very large scale conflict to take place in a reasonable time. The core element of the Battle is the Unit Card.

**Unit Cards**
These represent the forces in battle, with each Card standing for an amount of troops. Unit Cards look like this:

Unit Card: *Example*
	`tier: T| Speed: 3| Durability: 2`
	Description.
	*Traits*: `Type, Size`

- *Tier*: The Card's relative strength.
- *Speed*: Its power to move.
- *Durability*: How many Notches it can endure.
- *Type and Size*: What the Card represents and how many.
#### The Structure of Battle
****
Battles take place with two or more sides (for example, the Player Characters and their Allies against an enemy host) on a Battlefield.

**Battle Initiative**
During a Battle, time is divided into Rounds wherein each side has a Turn, once both of taken their Turn, the current Round ends and the next begins. Who goes first is determined at random at the start of each Round.

**The Battlefield**
Battlefields are made of Zones, representing locations in the narrative. Zones can be more or less structured and have the following universal Traits:
- *Terrain Difficulty*: The objective challenge posed by a fight in this Zone.
	- The is subtracted from all Contests made within the Zone.
- *Navigation Difficulty*
	- The Distance between two Hexes is equal to the sum of their Navigation difficulties. This is measured against its Speed.
	- When a Unit moves through multiple Zones, all Navigation Difficulties are added together. So, it may need to stop along the way if it lacks the Speed.
*Barriers, Structures, and Choke Points*
	Zones are Hexes on a Map, and can can have a number of structures constraining how Units may move between them.
	- *Structures*: Zones may contain buildings, fortifications, etc. Structure Cards have Traits and Durability and can suffer Notches or shape the Battlefield. For example, a wall might make another Zone Closed until destroyed.
	- *Open and Closed Zones*: Zones are Open by default. A Unit may move directly between any two Open Zones. Closed Zones are underlined and can only be Moved to from a Linked Zone.
	- *Linked Zones*: Zones connected by line-segments are Linked. Open Linked Zones can be Moved to from another Open Zone, but Closed Zones require the unit to move through the structure of Links to reach it. So, if there is a Linkage: A-<u>B</u>-<u>C</u>, where only A is Open, a Unit would need to Move through Zones A and B to reach Zone C.
	- *Containment*: A line drawn from a Zone around one or more Zones represents Containment. When a Zone is Contained within another, one must enter or pass through the outermost Zone first. So, where there is a Containment A(B,C), a Unit must Move through A to enter B from the outside. Zones inside other Zones can be Closed as well, for example: A(B-<u>C</u>-<u>D</u>, E). From the outside, getting to Zone D requires the Unit to pass through A, B, and C. Containment can also be nested, for example: Q(R-<u>S</u>, A(B-<u>C</u>-<u>D</u>, E)) and so on.
*Disambiguating*
	The last example might have seemed a little scary, but drawn on a map it really isn't so bad. Even in a pure-text format parsing even very complicated looking structures can be fast. Let's examine this structure of Zones:
****
	P(Q(R-<u>S</u>, A(B-<u>C</u>-<u>D</u>, E)))
****
Let's assume the Navigation Difficulty of each Zone here is 1, and we're controlling one Unit with a Speed of 4, starting in Zone P.
- With a goal of E, we know E is Contained by A, which is inside Q, which is inside P. So,  we get the path P->Q->A->E with a total Distance of 4.
- With a goal of D, we know D is Closed and Linked to C, which is Linked to B, which is Open and inside A, inside Q, inside P. So, we get the path P->Q->A->B->C->D, for a Distance of 6.
- With a goal of S, we know S is only reachable from R, which is inside Q, inside P. So we get the path P->Q->R->S, for 4.

So even with a complicated-looking example, Distances can be understood when we know A(B) means B is inside A, and C-<u>D</u> means D is only accessible from C.

**What a Unit Can Do**
Each Round, a Unit can do one of the following: 
- Move and Attack.
- Attack and remain stationary. 
- Move twice.
*Moving Units*
	Units can move a Distance up to its Speed. For example, Guards with Speed_6, located in a Zone with Difficulty_N:3 could move to any other Zone with Difficulty_N:3 or less, but could not move to a Zone with Difficulty_N:4 or more from their current Zone.
*Unit Contests*
	When one Unit Attacks another, the Attacker rolls 2d6 plus the Tier of their Frontline (and any other Bonuses) against the Tier of the Defender's Frontline Unit. On a success, it Notches the Defender's Frontline Unit, twice for a Critical success.
*Front and Back*
	In a Contest, Unit Cards from the same side stack while in the same Zone. One of them is played in the Frontline, while the rest occupy the Backline. Backline Cards confer benefits depending on their Traits, Type, and Size.
*Limits*
- A Unit may only Attack once per Round.
- Acting in the backline of the Attacking side of a Contest counts as making an Attack.

**Removing Units from Play**
Units have a Durability and, when suffering Notches exceeding their Durability, they are removed from play. When removing a Card from play, one can decide whether to destroy the Card, killing the Creatures it represents, or capture it.
#### Unit Types and Sizes
****

**Sizes of Unit Card**
Each Unit Card has a Size Trait, a rough estimate of the number of Creatures it represents. Size is a numerical measure first, and implies the following about literal number of Creatures:
- *Size_0*: exactly one Creature.
- *Size_1*: approximately 10 Creatures.
- *Size_2*: approximately 20 Creatures.
- *Size_3*: approximately 40 Creatures.
- *Size_4*: approximately 100 Creatures.
- *Size_5*: approximately 300 Creatures.
- *Size_6*: approximately 600 Creatures.
*Size in Contests*
	When two Units have different Sizes, the Attacker adds the difference of its Size to its foes to its Test. So, a Size_4 Unit would gain a +2 against a Size_2 Unit. Conversely, it would suffer a penalty of -2 against a Size_6 Unit.
*Size in the backline and Adding to Size*
	All Cards in the Backline contribute half their total Size to that of the Frontline (rounded down.) So, one Size_4 Card in the Backline would increase Frontline Size by 2, two Size_1 Cards would confer an increase of 1, three Size_1 Cards also confer 1, etc.

**Types: Standard Cards and Commanders**
Most Cards are Standards, which behave exactly as outlined above. However, some Cards are Commanders, special Cards that represent one Creature, usually a Player Character. Commanders are played alongside the Frontline Card and have the following effects:
- If the Commander's Tier is greater, the Frontline's Tier is replaced with that of the Commander.
- The Commanders Traits are added to the Frontline.
*Commanders and Loss*
	Commanders are not necessarily removed from play when they suffer more Notches than Durability. Instead, they can Regroup; this reduces their Tier by one and removes all their Notches. Reaching Tier_0 removes them from play no matter what.
*Limits*
- Commanders are Notched when the Frontline is.
- Multiple Commanders may act in the same Contest, but the Frontline's Tier is only effected by one of them.
- Commanders can be played alone, but are effectively Size_0 Cards.
- After the Battle, roll Minor Injury Threat for each time the Commander Regrouped. 
*Players as Commanders*
	Player Characters can each represent themselves as a Commander Card with Traits from their Skills and Disciplines.
#### Duration and Conclusion
****
A Battle is over when one side has lost all of their Units or one side concedes.

After the conclusion of a Battle, both sides keep any Cards they captured, representing hostages or prisoners for later use and discussion in the broader game.
#### Sample Actor Cards
****
Commander: **Warden**
	`Tier: 1| Speed: 3| Durability: 4`
	`Monthly Cost: 2,000`
	Leaders on the field of battle, a Warden can bolster any martial effort; concentrating leadership in a single person, of course, has its own risks.
	*Traits*: `Verdun, Commander, Size_0`
	- `A Warden's Tier is increased by the number of Units in its Backline.`
	- `When Attacked, only the Warden suffers Notches, but twice as many.`

Commander: **Hospitaler**
	`Tier: 2| Durability: 4`
	`Monthly Cost: 3,000`
	A Priest of Bella, ill-suited to harm, but adept in healing.
	*Traits*: `Verdun, Holy, Commander, Size_0`
	- `Once per Round, the Hospitaler can remove a Notch from any Unit. When doing so, they must roll a Chaos Die and are Notched themselves on a 6.`
	- `Hospitalers are Notched an additional time when losing a Contest.`

Commander: **Lumenary**
	`Tier: 2| Speed: 3| Durability: 3`
	`Monthly Cost: 3,000`
	The servants of Lumen carry their command to war, the power command the might of the Heavens.
	*Traits*: `Verdun, Holy, Commander, Size_0`
	- `Lumenaries can inflict the Unholy Trait on any Units they choose each Turn, and gains a Boon to Contests against Unholy Units.`
	- `Lumenaries suffer a twice the Notches when losing a Contest.`

Commander: **Friend of Death**
	`Tier: 2| Speed: 3| Durability: 4`
	`Monthly Cost: 3,000`
	Scythe Bearers, wielding authority over lethality itself, able to inflict or ward against mortal perils.
	*Traits*: `Verdun, Holy, Commander, Size_0`
	- `Friends of Death can choose which Unit to Notch when Attacking and inflict twice as many against the Undead.`
	- `When played in a Contest, the Friend of Death can suffer a Notch to prevent twice as many Notches to any Unit.`

Commander: **Paladin**
	`Tier: 3| Speed: 4| Durability: 6`
	`Monthly Cost: 6,000`
	The faithful, given might and strength to defend and repudiate.
	*Traits*: `Verdun, Holy, Commander, Size_0`
	- `When Attacking Unholy Units, the Paladin inflicts twice as many Notches.`
	- `When removed from play, a Paladin can Notch their foe twice.`

Commander: **War Mage**
	`Tier: 3| Speed: 3| Durability: 2`
	`Cost: 6,000`
	The most lethal foe, one that can strike without exposing himself. Unfortunately for those that employ them, Mages are much more transient by nature than others.
	*Traits*: `Verdun, Arcane, Commander, Size_0`
	- `A Mage can act as Commander in any Zone. When doing so for a distant Zone, roll a Chaos Die, on a 6 they are Notched. When Commanding in their own Zone, they inflict an additional Notch.`
	- `A Mage can also negate their contribution to a Contest to negate the effect of another Arcane Card.`

Unit: **Wreckers**
	`tier: 2| Speed: 4| Durability: 4`
	`Monthly Cost: 30,000`
	A detachment of highly trained Expeditioner-Soldiers.
	*Traits*: `Verdun, Size_2`
	- `When Attacking, Wreckers deal an additional Notch.`
	- `When removed from Play, Wreckers can Notch their foe's Frontline once.`

Unit: **Expedition Ordinaries**
	`tier: 2| Speed: 4| Durability: 3`
	`Monthly Cost: 15,000`
	Well equipped and ready, hardened by the Sea.
	*Traits*: `Verdun, Size_1`
	- `Ordinaries can shed a Notch if they are neither Attacked nor Attack in a Round.`
	- `Three Ordinaries is worth four Size_1 Units.`

Unit: **Town Guard**
	`tier: 1| Speed: 3| Durability: 3`
	`Monthly Cost: 10,000`
	Rank and file, trained to hold and control.
	*Traits*: `Verdun, Size_1`
	- `When Defending in the Frontline, the Guards' effective Size is greater by 1.`
	- `Guards suffer a penalty to rolls equal to their Notches.

Unit: **Binder**
	`Tier: 2| Speed: 4| Durability: 2`
	`Monthly Cost: 4,000`
	Clever, volatile, able to meet almost any challenge with the right plans and Invokations.
	*Traits*: `Verdun, Unholy, Size_0`
	- `In the Frontline, a Binder can suffer a Notch to automatically succeed Contest. When they destroy, Front or Back, they shed one Notch.`
	- `Binders have a penalty when played in the Frontline against Holy Cards, equal to their own Tier.`

Unit: **Assassin**
	`Tier: 2| Speed: 6| Durability: 1`
	`Monthly Cost: 4,000`
	Lethal, hiding behind the lines of a fight, an Assassin wages war orthogonal to the field of battle.
	*Traits*: `Verdun, Size_0`
	- `In the Backline, an Assassin can forgo their contribution to a Contest and, in exchange, Notch any opposing Actor Card, equal to its own Tier.`
	- `Assassins always roll with a Bane in the Frontline.`
#### Players as Commanders
****

Commander: **PC**
	`Tier: (Your own)| Speed: T| Durability: T+1`
	Your abilities as a Commander derive from your Disciplines and Skills, pick any three of those following which you qualify for (these can be changed at the start of any Battle.)
	*Traits*: `(Your own Type, usually Verdun), Commander`
	- *Skills*:
		- Immanence: `You can exchange this Trait for any other you qualify for, at any time.`
		- Action/Potence: `Your Tier is increased by one, this can be taken multiple times.`
		- Vitality/Resolve: `Your Durability is greater by one, this can be taken multiple times.`
		- Creation: `When in a Structure, you can forgo Moving/Attacking to remove up to T Notches from it.`
		- Traversal: `Your Speed is greater by one.`
		- Darkness: `You can reduce the Distance to any Zone by T.`
		- Luminance: `If you have already participated in a Contest against the same Unit, you gain a Boon to the next.`
		- Unity: `For every three Units in the Backline, your Tier is one greater.`
	- *Disciplines*:
		- Arcane: `You may Command in any Zone. When Commanding, you can negate all your other Traits to negate the effects of the Enemy Arcane Cards.`
		- Binding: `You can suffer one Notch and Corruption to succeed a Contest. destroying Units removes one of your Notches.`
		- Athletics: `Your speed is greater by two.`
		- Span: `When Defending, your Tier is 1 greater, and you may Notch the Attacker once if they fail.`
		- Whirl: `You inflict one more Notch in Contests.`
		- Cascade: `You may Attack twice, but each is rolled with a Bane and can only inflict one Notch.`
		- Honor: `When Attacked and the Enemy fails, you may Counterattack, rolling a Contest with a Bane.`
		- Tumble: `Your Speed is greater by one, and you may retreat from a Zone when Attacked, before a Contest is rolled, taking up to T Units with you.`
		- Brawling: `Your Durability is greater by T.`
		- Bulwark: `Your Durability is one greater and your Tier is increased by one when Defending.`
		- Crush: `When you Move and Attack, you gain a Boon.`
		- Iron Will: `Your Durability is increased by two.`
		- Sharpshooting: `You can act in the Backline, adding to the Tier of the Frontline by one.`
		- Wisdom: `Once per Battle, you can Regroup without suffering an Injury.`
		- Alchemy: `When you Regroup, roll a Chaos Die. On face 6, you do not suffer any Injury. You can roll additional Dice at the cost of one Corruption for each.`
		- Artifice: `When the Round ends, you can remove a Notch from a Structure in your current Zone. You can forgo Moving/Attacking to double this.`
		- Surgery: `When you succeed an Attack, or an Enemy fails, you may coin-flip to remove a Notch from an Ally Unit in the same Zone. Critical results automatically give you the flip.`
		- Hunting: `You inflict one more Notch when Attacking.`
		- Scavenging: `Each Turn, roll a Chaos Die. On a 6, you can remove a Notch from any Structure in the same Zone.`
		- Scouting: `Your Speed is greater by three.`
		- Assassin: `You can negate your contribution to a Contest to Notch one of the Enemy's Cards.`
		- Guile: `At the start of each Round, you can forgo Moving/Attacking to attempt to trick the Enemy; roll 2d6+(your Tier) against the Tier of any single Unit. If you succeed, may force them to act as you wish on their Turn.`
		- Skullduggery: `If the Distance to a Zone is less than your Speed, you and T other Units can enter it, even if it is Closed.`
		- Memory: `Each time you Attack or Defend against the same Unit, your Tier is greater by one more, up to 2T.`
		- Scholarship: `You have Boons up to your Scholarship to be spent in Contests.`
		- Tactics: `At the start of each Round, you can forgo Moving/Attacking to allow up to 2T Units to Move an additional time.`
		- Elocution: `When Attacking, you can Coin-Flip to increase your Tier by one. You can do so as many times in a row as you wish, but you lose all benefits if any fail.`
		- Faith: `You gain all the Traits of a Commander Unit matching your Faith.`
		- Leadership: `The Size contribution of all Units played alongside you is rounded up instead of down.`