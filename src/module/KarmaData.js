const {
	StringField,
	NumberField,
	BooleanField,
	ObjectField
} = foundry.data.fields;

export class KarmaData extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		return {
			id: new StringField({
				required: true,
				blank: false,
				initial: () => foundry.utils.randomID(16)
			}),

			enabled: new BooleanField({
				required: true,
				initial: false
			}),

			name: new StringField({
				required: true,
				blank: false,
				initial: "d20"
			}),

			type: new StringField({
				required: true,
				blank: false,
				choices: ["simple", "average", "fudge"],
				initial: "simple"
			}),

			dice: new NumberField({
				required: true,
				integer: true,
				positive: true,
				initial: 20
			}),

			inequality: new StringField({
				required: true,
				blank: false,
				choices: ["≤", "<", "≥", ">"],
				initial: "≤"
			}),

			history: new NumberField({
				required: true,
				integer: true,
				min: 1,
				initial: 2
			}),

			threshold: new NumberField({
				required: true,
				integer: true,
				min: 1,
				initial: 7
			}),

			floor: new NumberField({
				required: true,
				integer: true,
				min: 1,
				initial: 13
			}),

			nudge: new NumberField({
				required: true,
				integer: true,
				min: 0,
				initial: 5
			}),

			cumulative: new BooleanField({
				required: true,
				initial: false
			}),

			recurring: new BooleanField({
				required: true,
				initial: false
			}),

			users: new ObjectField({
				required: true,
				initial: {}
			}),

			allGms: new BooleanField({
				required: true,
				initial: true
			}),

			allPlayers: new BooleanField({
				required: true,
				initial: true
			})
		};
	}
}
