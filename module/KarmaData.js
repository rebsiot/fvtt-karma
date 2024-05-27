export class KarmaData extends foundry.abstract.DataModel {
	static defineSchema() {
		const { fields } = foundry.data;
		return {
			enabled: new fields.BooleanField(),
			type: new fields.StringField({ initial: "simple", choices: ["simple", "average"] }),
			dice: new DiceField(),
			inequality: new fields.StringField({
				initial: "≤",
				choices: ["≤", "<", "≥", ">"],
				required: true,
			}),
			history: new DiceNumberField({ initial: 2, min: 2, max: 15 }),
			// Exclusive to Simple Karma
			threshold: new DiceNumberField({ initial: 7 }),
			floor: new DiceNumberField({ initial: 13 }),
			// Exclusive to Average Karma
			nudge: new DiceNumberField({ initial: 5 }),
			cumulative: new fields.BooleanField(),
			users: new fields.ArrayField(new fields.ForeignDocumentField(foundry.documents.BaseUser, { idOnly: true })),
		};
	}
}

const DICE_DEFAULTS = {
	integer: true,
	nullable: false,
	positive: true,
	required: true,
};

export class DiceField extends foundry.data.fields.NumberField {
	static get _defaults() {
		return foundry.utils.mergeObject(super._defaults, {
			...DICE_DEFAULTS,
			initial: 20,
			min: 2,
			max: 100,
		});
	}

	toFormGroup(groupConfig = {}, inputConfig = {}) {
		inputConfig.value ??= this.initial;
		inputConfig.required ??= String(this.required);
		return super.toFormGroup(groupConfig, inputConfig);
	}
}

export class DiceNumberField extends foundry.data.fields.NumberField {
	initialize(value, model, options = {}) {
		if (model.dice && (model.dice !== this.max || !this.max)) this.max = model.dice;
		return super.initialize(value, model, options);
	}

	static get _defaults() {
		return foundry.utils.mergeObject(super._defaults, {
			...DICE_DEFAULTS,
			min: 1,
		});
	}

	toFormGroup(groupConfig = {}, inputConfig = {}) {
		inputConfig.value ??= this.initial;
		inputConfig.required ??= String(this.required);
		return super.toFormGroup(groupConfig, inputConfig);
	}
}
