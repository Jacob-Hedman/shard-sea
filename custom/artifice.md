Player-authored custom artifice items. These live OUTSIDE the PHB, so they are
merged into the database on every import and are NEVER deleted when a new PHB
version arrives (a custom item is never actually in the book).

How to add one — copy the format of the PHB's Artifice chapter, and add:
- `*Made On*:` the PHB version you designed it against (e.g. v17).
- `*Status*:` optional — force `outdated` if you know it needs revisiting.
  If omitted, an item is flagged **outdated** automatically once the current PHB
  moves past the version it was made on.

#### Custom Artifice
****

*Flicker Shield*
	*Pattern*: Force, Shell, Else
	*Made On*: v17
	*Bulk*: T+3|*Cost*: 4,000×T×(Bulk)| *Activation*: 10|
	A prototype ward that stutters a moment out of sync, catching a blow before it has fully landed.
	`When Activated as a !0 AP Reaction to being Attacked, the triggering instance of Damage is skipped forward T Seconds and resolves at the start of your next Turn — you may Move before it lands. Each use Notches the Shield once.`

*Auld Lantern*
	*Pattern*: Star, Echo, Density
	*Made On*: v16
	*Bulk*: T|*Cost*: 800×T×(Bulk)| *Activation*: 1|
	An older design kept for sentiment — its light lingers where you have already been.
	`Each Activation emits white light within 10T Meters for 1 Minute, and leaves a faint after-image of that light in each Space you left during the Duration for one further Round.`

#### Magical Items
****
Custom Magical Items designed by the group's GM. Where a value was left open, it is
GM-priced rather than buyable at a standard rate.

*Captain's Looking Glass*
	*Made On*: v17
	*Tier*: 3| *Cost*: 75,000| *Activation*: 1|
	A masterwork spyglass that folds several Runic devices into one brass barrel.
	`Integrated Scopes extend your Vision up to 500T Meters for 1 Minute per Activation.`
	`Heat Addon — your Vision switches to detecting heat sources instead.`
	`Integrated Greenlights let you see in complete darkness for T Minutes, cast in a colourless viridian hue; exposure to bright light while active Blinds you.`
	`Time Sight (costs T Plug Activations) — you gain a Preemption bonus up to T and learn everything that happened within the Space over the past T Minutes.`

*Heat Vision Goggles*
	*Made On*: v17
	*Tier*: 3| *Cost*: 45,000| *Activation*: 1 Plug|
	Bulky lenses that render the warmth of living things in glowing relief.
	`After Activation, you perceive heat sources out to your regular Vision range. This counts as a Direct Sense that bypasses Soft Cover such as fog or smoke.`

*Cloak of Many Stances*
	*Made On*: v17
	*Tier*: 3| *Bulk*: 3| *Cost*: 160,000|
	A billowing cloak that seems to move despite the absence of any wind.
	`You gain an additional 10 AP Reaction, usable only to change your Stances.`

*Timer*
	*Made On*: v17
	*Cost*: 250×T×(Bulk of the Consumable)|
	A clockwork Rune affixed to a Consumable to set it off on a delay.
	`Placed on a Consumable as a 1 AP Action. Set a countdown equal to T Full-Turns; the Consumable Activates when it completes. Multiply the Cost by 10 for a timer measured in Minutes instead.`

*Motion Sensor*
	*Made On*: v17
	*Cost*: 500×T×(Bulk of the Consumable)|
	A watchful Rune that trips a Consumable when the wrong thing draws near.
	`On Activation, designate Creatures and place the Sensor on a Consumable. It triggers that Consumable when any non-designated Creature Moves within T Meters.`

*Phase Shield*
	*Made On*: v17
	*Tier*: 3| *Bulk*: 3| *Cost*: 30,000| *Activation*: 1 Power Plug or 1 Loop (10 Plugs)|
	A one-handed magical Shield (Durability 6) that slips a moment out of phase.
	`Form of Fit — the hand holding it counts as technically free, but Tests using that hand and single-hand Weapon Attacks suffer a Bane.`
	`Extension Field — passively extends the benefits of your Iron Stance to Allies within your Engagement.`
	`Hard Cover — provides T Cover to everything in the Shield's Engagement; a missed Attack against those it covers always Damages the Shield instead.`

*Shard Dome*
	*Made On*: v17
	*Tier*: 3| *Cost*: 80,000|
	A deployable canopy of interlocking Residue shards that bristles against incoming fire (Reload_3, Craft_Metal).
	`Anti-Missile Defense — as a 0 AP Reaction to a Ranged Attack, negate its Damage instead of suffering it.`
	`Push-Back Protocol — as a 0 AP Reaction to a Melee Attack, push the attacking Creature as if Powerful_T before the Attack resolves.`

#### Ordnance
****
Artifice-built firearms. They carry full weapon profiles, but are Magical Items rather
than standard arms — each consumes Residue to fire.

*Launcher*
	*Made On*: v17
	*Tier*: 3| *Bulk*: 8| *Cost*: 50,000| *Activation*: 1 Plug to fire|
	A shoulder-braced tube of Artifice that hurls heavy objects at ferocious speed.
	`Ranged Weapon — Range 100, Accuracy 0, Durability 4, Traits: 2_Handed, Reload_3, Crushing, Craft_Metal.`
	`Loads and launches an Object of up to 30 Bulk. Each 10 Bulk of the loaded Object increases the shot's Vicious Quality by 1.`

*Big Fucking Shell*
	*Made On*: v17
	*Tier*: 3| *Bulk*: 30| *Cost*: 2,000|
	Ammunition for the Launcher — a massive iron shell built to carry a payload.
	`Launcher only. A shot made with a Big Fucking Shell has Bulk 30 and can carry an explosive payload (usually a grenade).`

*Dragon*
	*Made On*: v17
	*Tier*: 3| *Bulk*: 8| *Cost*: 50,000| *Activation*: 1 Plug to fire|
	A unique hand-cannon built for a single devastating short-range blast.
	`Ranged Weapon — Range 30, Accuracy 0, Durability 6, Traits: 1_Handed, Reload_3, Piercing, Vicious_3.`
	`Fires a solid iron ball or a spray of ball bearings in place of a bolt. Within 5 Meters it loses all Vicious and instead deals Traumatic Damage.`

#### Augmented Equipment
****
Weapon enchantments, applied to an existing Weapon the way the PHB's Augmentation Runes are.

*Impact*
	*Pattern*: Force, Touch, Weight, Cohesion
	*Made On*: v17
	*Cost*: 1,500×T×(Weapon Tier+6)| *Activation*: 1|
	*Equipment*: Any Melee Weapon that deals Crushing or Traumatic Damage
	It seems to pulse with energy, veins of glowing blue Residue running throughout.
	`When Activated, the Weapon gains the Powerful Trait, increased by T, for T Rounds. A Creature or Object it successfully strikes suffers additional Damage when it collides with something else.`

*Graviton Relay*
	*Made On*: v17
	*Cost*: 3,000×T×(Weapon Tier+6)| *Activation*: 1 Power Plug|
	*Equipment*: Any Weapon that deals Crushing Damage
	A denser cousin of Impact, wound tight around a caged core of gravity.
	`As a 1 AP Action fuelled by a Power Residue Plug, increase the Weapon's Powerful Quality by a multiple of T. The Weapon creates a Burst of T, pushing Creatures T Meters. The Enchantment fades after each strike.`

#### Relics
****
Unique found artifacts — not manufactured by Artifice, so they carry no Runic Pattern
and no standard price. They are one-of-a-kind and never for sale.

*Convenient Canvasbag*
	*Made On*: v17
	*Bulk*: 3|
	This bag has seen better days. Yet for its age, it seems remarkably intact.
	`Acts as a conduit to another space. Reach a hand inside while thinking of a stored Item to summon it. Contents are frozen in time within. Overturning the bag spills everything it holds.`

*Old Mining Pick*
	*Made On*: v17
	*Bulk*: 6|
	A shining pick made of an unknown metal, scribed entirely with runes.
	`Striking a stone Object with it immediately Breaks that Object.`

*Spiral Ring*
	*Made On*: v17
	*Bulk*: —|
	A gold band etched with faint, shifting runes that seem to rearrange when not directly observed, set with a deep violet gemstone that turns with an inner spiral of light.
	`Spatial Distortion — as part of a Movement Action, teleport to any visible Space within your Movement range. Observers see you collapse into purple light and reappear elsewhere.`
