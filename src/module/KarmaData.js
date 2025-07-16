export class KarmaData extends foundry.abstract.DataModel {
	static defineSchema() {
		const { fields } = foundry.data;
		return {
			id: new fields.DocumentIdField(),
			enabled: new fields.BooleanField({ label: "KARMA.Form.enabled" }),
			name: new fields.StringField({ required: true, nullable: false, initial: "New Karma", label: "Name" }),
			type: new fields.StringField({
				required: true,
				initial: "simple",
				choices: {
					simple: "KARMA.Form.Type.simple",
					average: "KARMA.Form.Type.average",
				},
				label: "KARMA.Form.Type.label"
			}),
			dice: new fields.NumberField({
				...DICE_DEFAULTS,
				initial: 20,
				min: 2,
				max: 100,
				label: "KARMA.Form.Faces.label",
				hint: "KARMA.Form.Faces.hint"
			}),
			inequality: new fields.StringField({
				required: true,
				initial: "≤",
				choices: {
					"≤": "KARMA.Form.Inequality.options.≤",
					"<": "KARMA.Form.Inequality.options.<",
					"≥": "KARMA.Form.Inequality.options.≥",
					">": "KARMA.Form.Inequality.options.>"
				},
				label: "KARMA.Form.Inequality.label",
				hint: "KARMA.Form.Inequality.hint",
			}),
			history: new fields.NumberField({
				...DICE_DEFAULTS,
				initial: 2,
				min: 2,
				max: 15,
				label: "KARMA.Form.History.label"
			}),
			// Exclusive to Simple Karma
			threshold: new fields.NumberField({ ...DICE_DEFAULTS, initial: 7, label: "KARMA.Form.Threshold.label" }),
			// This used to be Floor-only, but now works for Ceiling
			// TODO rename to "target"
			floor: new fields.NumberField({ ...DICE_DEFAULTS, initial: 13, label: "KARMA.Form.Floor.label" }),
			// Exclusive to Average Karma
			nudge: new fields.NumberField({ ...DICE_DEFAULTS, initial: 5, label: "KARMA.Form.Nudge.label" }),
			cumulative: new fields.BooleanField({ label: "KARMA.Form.Cumulative.label", hint: "KARMA.Form.Cumulative.hint"}),
			// User Configuration
			allGms: new fields.BooleanField({ initial: true }),
			allPlayers: new fields.BooleanField({ initial: true }),
			users: new fields.TypedObjectField(new fields.BooleanField(),
				{validateKey: foundry.data.validators.isValidId}),
		};
	}
}

const DICE_DEFAULTS = {
	integer: true,
	nullable: false,
	positive: true,
	required: true,
};
