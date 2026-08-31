A Condition is a kind of temporary modifier to a Creature, changing how they behave for a Duration. 
- Conditions can also be "consumed" by some Actions. This means the Action causes the Condition to end for some other effects. 
- Some Conditions have a numerical component. If one of these Condition is given without a Tier, assume it is Tier 1.
- The same Condition does not Stack with itself, but if two Creatures apply a Condition to a third, they are considered as having applied it when relevant. 
- Conditions also have Severity, which organizes and implies how lethal they are.
#### Minor Conditions
****
Minor condition: **Blind**
> `You are unable to See or Target beyond Touch Range without Spotting.`

Minor Condition: **Restrained**
> `You are unable to take Movement Actions.`
> *Counter-Action*
> `Struggle can end most kinds of Restraint.`

Minor Condition: **Prone**
> `Knocked or made Prone, you are Vulnerable to all Melee Attacks but Ranged Attacks against you are made with a Bane.`
> *Counter-Action*
> `Get-Up ends the Prone Condition`

Minor Condition: **Stunned_x**
> `You begin your Turns with x less AP.`

Minor Condition: **Vulnerable_x**
> `Damage is more Vicious against you by x.`

#### Moderate Conditions
****
Moderate Condition: **Linked**
> `A Condition that ties Movement of two or more things. When A is Linked to B, A moves where and when B does.`
> *Soft Linkages*
> `In the case of Links by a flexible and non-vital implement like a rope, Links "remember" the length. A and B may move freely within that Distance, but drag one another to preserve that maximum Distance.`
> *Limits of Weight*
> `When something is linked to a Creature, and it lacks the ability to lift it, its Movement is halved. If the Creature would be unable to even pull something Linked to it, they become Restrained.`

Moderate Condition: **Frenzied**
> `At the start of each Turn, you roll a Chaos Die, suffering the consequences according to your roll:`
> - 1-3: `You may act as normal.`
> - 4-5: `You must take at least 1 genuinely hostile Action like an Attack or other real harm against the nearest Creature.`
> - 6: `You must spend all your AP attempting to cause as much harm as possible to the nearest Creature.`

Moderate Condition: **Off-Balance**
> `You cannot take Reactions.` 

Moderate Condition: **Castigated**
> `You may not take Primary Actions.`

Moderate Condition: **Poisoned**
> `You suffer one Standard Strain at the start of each turn.`
#### Major Conditions
****

Major Condition: **Bleeding**
> `Unless Bandaged or otherwise stopped, you will Bleed Out and die within a number of Rounds equal to your Base Body.`
> *Counter-Action*
> `First-Aid ends the Bleeding Condition.`

Major Condition: **Suffocating**
> `You become Stunned. For each Round after this, the Stun increases, and you become Unconscious once it increments to 6. At 10, you die.`
> *Counter-Action*
> `Holding your Breath protects you from Suffocation.`

Major Condition: **On Fire**
> `You begin Suffocating, cannot Hold your Breath, and suffer a 1st Degree Burn. Each Round, the Permament Strain from this Burn increases by one until extinguished (or you die). The Severity of this Injury becomes Major at 6 Strain, Major at 12.`
> *Counter-Action*
> `You can end this Condition with a DC_12 Potence or Action Test. This becomes DC_8 if you have access to water to pour on yourself. Other Creatures can attempt this in Engagement, and this Condition ends instantly if you are submerged.`

Major Condition: **Doomed_x**
> `All applications of this Condition stack. When x equals your Tier, you suffer Major Panic Risk. When x is twice your Tier, you die.`
#### Exceptional Conditions:
****
- **Unconscious**: The Victim is unable to use any Actions and is Helpless. 
- **Helpless**: The victim cannot use any Actions other than Communicate and all Injuries become Lethal for them.
## On Buffs, Bonuses, and Penalties
****
Buffs and Bonuses are two kinds of numerical modifiers that can apply to a Creature's statistics. The primary difference is that two Buffs of the same kind do not stack while Bonuses do (as well as stacking with Buffs.) 

Being of the same kind means modifying the same value like, your Body. Hence, two Buffs to your Body do not stack, while two Bonuses or a Buff and Bonus do. A target benefits from the greater of the two Buffs.

*By contrast, penalties always stack, and so a penalty of 3 and 6 compound to a reduction of 9.*
