Player-authored custom Consumables. Like the custom Artifice, these live OUTSIDE the
PHB — they are merged into the database on every import, are NEVER deleted when a new
PHB version arrives, and are tagged **custom** so nobody mistakes them for standard,
buyable stock.

How to add one — copy the format of the PHB's Consumables chapter (the bare backtick
Trait line, `*Cost*:`, a description, `*Effects*:`, `*Overdose*:`, `*Withdrawal*:`), and add:
- `*Made On*:` the PHB version you designed it against (e.g. v17).
- `*Status*:` optional — force `outdated` if you know it needs revisiting. If omitted, an
  item is flagged **outdated** automatically once the current PHB moves past its version.

#### Poisons
****

**Agony**
	`Tier_3, Active_1 Minute/1 Day, Deadly_18, Contact, Edible`
	*Made On*: v17
	*Cost*: 500
	A wracking alchemical toxin with a fearsome reputation — even a brushing contact is enough.
	*Effects*: `An inexplicable pain wrenches through your body, provoking Major Panic. You are Stunned_2 for the Duration.`
	*Overdose*: `Roll 1d6 Chaos Dice; on any result but a 6, you die within one Minute.`
