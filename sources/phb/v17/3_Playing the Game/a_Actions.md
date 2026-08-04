What can you do and when? In the course of the game, practically everything you do can be framed as an Action, from speaking to flipping a switch.

#### Framing Actions
****
There are some basics required to use Actions, such as:
- **Targets**: Where are you aiming? If an Action directly effects a Creature, Object, or Space, you need to Detect it. If it only stands within an Indirect Sense for you, like hearing, you must roll Luminance against its Darkness to Target it. 
- **Tier**: Actions that use the variable *"T"* indicate your effective Tier, standing in for T.
- **Variable Costs**: Actions that use the term *"~"* indicate a number that depends on your choice, often an AP cost. .
	- Actions with Variable AP Costs can be extended over multiple rounds to supply more AP. You do not have to supply all of your AP in a Turn to that Action, but you must contribute at least 1.
- **Nill**: Actions that use the term *"-"* indicate that the field is empty (ex. an Action with no Qualities)
- **Per-Round Limits**: Actions marked with *"!"* in their AP cost, can only be used once in a single Round (a period of 6 seconds.) These are often "!0", which means that they cost no AP, but cannot be repeated.
#### Reading Actions
****
Some Actions, especially Active Feats, have more in-depth descriptions than the general kind and tend to begin with a cursory list of specifics:
- **AP**: the amount of AP the Action costs to use.
- **Duration**: how long the effect of that Action lasts.
	- *Instant* - ends when the current Turn does. | less than a second.
	- *1 Simple-Turn* - ends when the next Turn does. | 1 second.
	- *1 Full-Turn* - ends when the same Creature's next Turn does. | 6 seconds.
- **Range**: constricts where the Action may be used and who it may effect. 
	- A Range of Self implies the Action may only effect the user. 
- **Resist**: the Skill that resists the Actions, should it be used against a Creature.
	- Difficulty is usually 8+x, where x is the Resistance.
	- When made against many Creatures, make the Test unadjusted, and then resolve for each Creature as if the Test were against them, starting with the Hardest (so that if it applies to them, it applies to all Targets.)
- **Qualities**: 
	- Actions with no Qualities are General Actions.
	- *Strain_x*: Actions with this Quality inflict x Strain on you after they resolve.
	- *Primary*: Actions with this Quality count as Primary Actions for determining what other actions you may perform in a round.
	- *Reaction*: Actions with this Quality are considered Reactions and specify a trigger in an if-conditional within their description.
	- *Movement*: Actions with this Quality are Movement Actions.
	- *Stance*: Actions with this Quality have effects that persist until you are Incapacitated! Slain! Unconscious, you use another Action with this Quality, or Initiative ends. You may only use 1 Action with this Quality per round and you cannot End these Actions in the same round you use them.
	- *Cooldown_x*: Whenever you use an Action with this Quality, you must Recharge to do it again.

#### Movement Actions
****
Movement Actions can be Taken on your Turn, and require that you are freely able to Move.

AP**: 1| **Maneuver**
	`Move up to 2 Meters; Does not Provoke Attacks.`
	*Getting Up*
	`If you are prone, Maneuvering Ends this Condition, at the cost of one more AP.`

**AP**: 1| **Move**
	`Move up to your Movement using one of your Speeds; Provokes Attacks when leaving Engagement.`

**AP**: 1| **Leap**
	`Move up to half your Movement horizontally and up to one fourth your Movement Vertically. If your Body exceeds 10, you can move up to half your Movement Vertically; Provokes Attacks when Leaving Engagement.`

#### Primary Actions 
****
Primary Actions can be taken on your Turn, and only 1 can be taken each Round.

**AP**: ~| **Strike**
	`Make a Melee Attack against an Engaged Target. If you succeed, you Damage them with the Weapon used.`
	*Investment*
	`When spending more than one AP to Strike, it is more Vicious for each additional AP.`
	*Critical Effect*
	`This doubles the effect of your AP spent.`
	*Collateral Risk*
	`If you fail, the three nearest Creatures within Range roll a Chaos Die. The first to roll 6 is struck instead.``

**AP**: ~| **Shoot**
	Aim and pull.
	`Target something in your Wielded Ranged Weapon's Range and make a Ranged Attack with AP Boons. If you succeed, you Damage them with the Weapon.`
	- `You can Attack something outside of your Weapon's Range, but you suffer a Bane for every 2 Meters.`
	- `Provokes Attacks from Engaged Enemies.`
	*Critical effect*
	`Critical Success makes the Attack more Vicious by your Weapon's Tier.`
	*Collateral Risk*
	`If you fail, the three nearest Creatures to the Target roll a Chaos Die. The first to roll 6 is struck instead.`

**AP**: ~| **Throw**
	`Make a Ranged Attack against a Target within the Range of your Weapon, plus your Body and AP spent (Weapons with no listed Rang only use your Body). If you succeed, they are struck by it.`
	*Thrown Melee*
	`This inflicts Damage as if from a Strike, and allows you to make the Test as a Melee Attack if you wish (but this allows the Target to choose which Principle Skill Resists it.)`
	*Thrown Bombs*
	`Impact_Bombs explode on impact, and others fall into Engagement with their Target.`
	*Lobbing*
	`You can Target a Space and attempt to arc a Thrown Weapon over obstacles, ignoring Cover. Thrown Melee cannot directly hit from a lob, but all Creatures in that space roll Collateral Risk.`
	*Critical Effect*
	`Critical Throws do not count as a Primary Action, and refund one AP.`
	*Collateral Risk*
	`If you miss, the three nearest Creatures roll a Chaos Die. The first that rolls 6 is struck.`
#### General Actions
****
General Actions can be taken on your Turn in any combination.

**AP**: !0| **Brace**
	`You become Restrained, but gain a Bonus to Ranged Attacks up to your Tier. Maneuvering ends this.`
	*Aim*
	`While Braced, you can spend additional AP to gain as many Boons to your next Shot within as many Turns.`

**AP**:  ~| **Load**
	`Replenish the ammunition of a ranged weapon. The AP cost depends on the Weapon.`

**AP**: 1| **Swipe**
	`Make Potence or Action Test against the Principle Skill of an Engaged Target's choice. If you succeed, you take something held in their Hands.`
	*Critical effect*
	`They Provoke an Attack from you.`
	*Limits*
	`You must have a free Hand and, of course, the Target must be holding something.`

**AP**:  1| **Bar**
	`For 1 Round, Creatures must succeed an Action or Potence Test against your Action or Vitality (your choice) to leave your Engagement. If you are larger, their Test is made with 2 Banes, or 2 Boons if you are smaller.`

**AP**: ~| **Flank**
	`Target a Creature in Engagement. The next Attack made against them is easier, up to the amount of AP spent.`
	*Limits* 
	`The effects of your Flank end if the Target breaks Engagement with you.`

**AP**: 1| **Grab**
	`Make an Opposed Action or Vitality against the Potence of a Creature you can Touch. If you succeed, the Target becomes Restrained and Linked to you. You must have at least one free Hand to Grab.`
	*Throttle*
	`While Grabbing a Creature, you can cause them to Suffocate and suffer Strain up to your Tier. If they did not Detect you, you inflict twice as much. You may do so again each Round, extending their Suffocation and preventing them from Communicating verbally.`
	*Critical effect*
	`You refund the AP spent.`

**AP**:  1| **Mantle**
	`Make an Action or Potence Test against an Engaged Target's Potence. If you succeed, you clamber onto and become Linked to them. (You Cannot Mantle a Creature which is smaller than you.)`
	*Size Differences*
	`If the Target is larger than you by more than one Size, they cannot Attack you.`
	*Critical effect*
	`The Target counts as one Size Larger for Mantling and preventing Attacks.`
	*Counter-Action*
	`The Target can Struggle, as if you had Grabbed them, and cause you to fall off.`

**AP**:  ~| **Push**
	`Make an Opposed Action or Vitality Test against a Target you can Touch. If you succeed, they are moved AP Meters away from you.`
	*Critical effect*
	`They move twice as far.`

**AP**:  2| **Trip**
	`Make a Darkness or Action Test against the Potence of a Target you can Touch, knocking them Prone on a success.`
	*Critical effect*
	`The Target suffers Falling Damage, as from a Height equal to their Bulk.`
	*Limits*
	`If the Target is larger than you, you suffer a Bane to this Test; you cannot Trip a Creature two Sizes or more larger than you.`

**AP**: !~| **Ready**
	`Choose any action you could perform on this turn, spend that action's cost in AP and designate a trigger. If that trigger occurs before the start of your next Turn, you may perform the chosen action.`

**AP**:  0| **Communicate**
	`Speak, gesticulate, whisper, point or otherwise convey a meaning to another Creature. Pointing to or otherwise indicating something requires you to Target it.`

**AP**: 1| **Gauge**
	`Target a Creature and make a Luminance, Traversal, or Unity Test against their Tier. Succeed or fail, you learn their Tier and Skills. On a success, you also learn their Abilities, Armor Rating, and any Resistences or Weaknesses.`
	*Critical effect*
	`The Target is more Vulnerable to you, up to T, for 1 Round.`

**AP**:  1| **Interaction**
	`You manipulate something, usually by hand. Unless otherwise specified, the Target must be within Touch Range. The GM may increase the AP needed for this Action at their Discretion.`

**AP**: 1| **Spot**
	`Make a Luminance Test against the Darkness of something in Cover from you. Success allows you to Detect and Target it for the rest of your Turn.` 
	*Limits*
	`This Action ignores the normal requirements for Targeting, but you must have at least indirect Sensory perception of it.`
	*Critical Effect*
	`You Detect the Target for one Round (until the end of your next Turn.)`
#### #### Reactions
****
Reactions can be taken at any time, so long as you have the AP to take them and satisfy the trigger.

**AP**: 1| **Hold your Breath**
	`In response to an effect that would Suffocate you, you become immune to Suffocation for Minutes equal to half your base Body.`
	*Limits and Repetition*
	`You must be able to breath to hold your Breath. After Holding your Breath, you must be able to breath to do so again.`
	*Concentration*
	`While Holding your Breath, each time you are Scraped, Injured, or Shaken, roll a Chaos Die. On face 6, you lose the effects.`	

**AP**: 1| **Struggle**
	*Clutches*
	`When Restrained by a Grab, make an Action or Vitality Test against the same Skill of the Creature holding you, ending the Condition on a success.`
	*Bonds*
	`When Restrained by physical ties or bondage, make an Unarmed Attack against it. When you break it, you end the condition.`
	*Limits*
	`Some Paracausal and other sources of Restraint cannot be Struggled free from.`

**AP**:  0| **Attack of Opportunity**
	`Target a foe who triggers this Reaction as if with a 1 AP Strike. All Actions and Feats that trigger these state when and how they "Provoke an Attack".`

**AP**:  1| **Aid**
	`If an ally sharing your Engagement makes a Test with a Skill you have at least 1 rank in, they gain a Boon.`

**AP**: !0| **Preempt**
	`Target a Creature and roll 2d6+(Your Mind Bonus) against their Tier, if you succeed, you move ahead of them in the Turn Order (which can interrupt their Turn,) but only regain 2 AP instead of 3. Your Turn gained in this way cannot, itself, be Preempted.`
	*Critical Effect*
	`You gain the normal 3 AP.

**AP**: 1| **Roll**
	`When you suffer Damage from Falling, make an Action or Potence Test against DC_(8+half the number of Meters fallen). Success negates the Damage, failure reduces its Viciousness by your Tier.`
	*Critical effect*
	`You may instantly Move up to half the Distance fallen for free.`

**AP**: 1| **Block**
	`When you are the Target of a Melee Attack, you can subject a Melee Weapon or Shield Wielded by you to the Damage instead.`
	- `This Notches the Items used, as if it were Armor Rated for the Damage Type.`
	- `If this Damage Breaks the Item used to Block, you also suffer the Damage.`
	*Critical effect*
	`You can attempt to Swipe from your Target, if Engaged, even if you lack any free Hands, forcing them to drop the effected Item.`
