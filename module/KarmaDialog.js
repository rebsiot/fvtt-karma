import { DiceField, DiceNumberField } from "./KarmaData.js";

export class KarmaApp extends FormApplication {
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			id: "karma-config",
			closeOnSubmit: false,
			submitOnChange: true,
			submitOnClose: true,
			editable: game.user.isGM,
			width: 500,
			height: "auto",
			template: "modules/karma/templates/karma-config.hbs",
			title: "Die Hard Karma Config",
		});
	}

	async getData() {
		const karma = game.settings.get("karma", "config");
		const translation =
			game.i18n.translations?.KARMA?.Form?.Inequality?.options ??
			game.i18n._fallback?.KARMA?.Form?.Inequality?.options;
		return {
			karma,
			inputs: this._getInputs(karma),
			inequalityOptions: Object.entries(translation).map(([key, value]) => ({
				value: key,
				label: value,
			})),
			types: {
				simple: "Simple",
				average: "Average",
			},
			playerStats: this.constructor.getkarmaPlayerStats(),
			whoGmOptions: this.constructor.getUsers({ activeOnly: true, getGM: true }),
			whoUserOptions: this.constructor.getUsers(),
		};
	}

	_getInputs(karma) {
		const max = karma.dice;
		const { fields } = foundry.data;
		return {
			dice: new DiceField({ initial: karma.dice }),
			inequality: new fields.StringField({
				initial: karma.inequality,
				choices: ["≤", "<", "≥", ">"],
				required: true,
			}),
			history: new DiceNumberField({ initial: karma.history, min: 2, max: 15 }),
			threshold: new DiceNumberField({
				initial: karma.threshold,
				max,
				hint: game.i18n.format("KARMA.Form.Threshold.hint", {
					number: karma.threshold,
					term: game.i18n.localize(`KARMA.Form.Inequality.options.${karma.inequality}`).toLowerCase(),
				}),
			}),
			floor: new DiceNumberField({ initial: karma.floor, max }),
			nudge: new DiceNumberField({
				initial: karma.nudge,
				max,
				hint: game.i18n.format("KARMA.Form.Nudge.hint", {
					number: karma.nudge,
					number2: karma.nudge * 2,
					number3: karma.nudge * 3,
					threshold: karma.threshold,
					cumulatively: karma.cumulative ? game.i18n.localize("KARMA.Form.Nudge.cumulatively") : "",
					term: game.i18n.localize(
						`KARMA.Form.Terms.${["≤", "<"].includes(karma.inequality) ? "greater" : "less"}`
					),
				}),
			}),
			cumulative: new fields.BooleanField({ initial: karma.cumulative }),
		};
	}

	/**
	 *Return an array of all users (map of id and name), defaulting to ones currently active
	 */
	static getUsers({ activeOnly = false, getGM = false } = {}) {
		const karmaUsers = game.settings.get("karma", "config").users;
		return game.users
			.filter((user) => getGM === user.isGM && (!activeOnly || user.active))
			.map((user) => ({
				id: user.id,
				name: user.name,
				karma: karmaUsers.includes(user.id),
			}));
	}

	static getkarmaPlayerStats() {
		const playerStats = [];
		for (const user of game.users) {
			const history = user.getFlag("karma", "stats")?.history ?? [];
			let avg = 0;
			if (history.length) {
				const sum = history.reduce((total, value) => total + value, 0);
				avg = Math.round((sum / history.length) * 10) / 10;
			}
			playerStats.push({
				name: user.name,
				stats: history,
				statsString: history.join(", "),
				avg,
			});
		}
		return playerStats;
	}

	async _updateObject(event, formData) {
		const expandForm = foundry.utils.expandObject(formData);
		const users = [...Object.values(expandForm?.gms ?? {}), ...Object.values(expandForm?.players ?? {})].filter(
			Boolean
		);

		const original = game.settings.get("karma", "config");
		await game.settings.set(
			"karma",
			"config",
			foundry.utils.mergeObject(
				{
					floor: formData.floor ?? original.floor,
					nudge: formData.nudge ?? original.nudge,
					cumulative: formData.cumulative ?? original.cumulative,
					users,
				},
				expandForm
			)
		);
		if (event.type === "submit") this.close();
		else this.render();
	}
}
