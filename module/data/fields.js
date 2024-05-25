export class DiceNumberField extends foundry.data.fields.NumberField {
	initialize(value, model, options = {}) {
		if (model.dice && model?.dice !== this.max) this.max = model.dice;
		return super.initialize(value, model, options);
	}

	static get _defaults() {
		return mergeObject(super._defaults, {
			nullable: false,
		});
	}
}
