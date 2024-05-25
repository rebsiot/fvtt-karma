import { DiceNumberField } from "./fields.js";

export class KarmaSettings extends foundry.abstract.DataModel {
	static defineSchema() {
		const fields = foundry.data.fields;
		return {
			enabled: new fields.BooleanField(),
			chat: new fields.StringField({ initial: "full", choices: ["full", "simple", "none"] }),
			type: new fields.StringField({ initial: "simple", choices: ["simple", "average"] }),
			dice: new fields.NumberField({ initial: 20, choices: [4, 6, 8, 10, 12, 20, 100] }),
			rollUnder: new fields.BooleanField(),
			history: new DiceNumberField({ initial: 2, min: 2, max: 20 }),
			threshold: new DiceNumberField({ initial: 7, min: 1, max: 20 }),
			floor: new DiceNumberField({ initial: 13, min: 1, max: 20 }),
			nudge: new DiceNumberField({ initial: 5, min: 1, max: 5 }),
			cumulative: new fields.BooleanField(),
			users: new fields.ArrayField(new fields.ForeignDocumentField(foundry.documents.BaseUser, { idOnly: true })),
		};
	}
}
