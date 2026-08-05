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
