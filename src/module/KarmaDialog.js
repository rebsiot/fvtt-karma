import { DiceField, DiceNumberField } from "./KarmaData.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
export class KarmaApp extends HandlebarsApplicationMixin(ApplicationV2) {
	static DEFAULT_OPTIONS = {
		id: "karma-config",
		actions: {
			markUsers: KarmaApp.markUsers,
		},
		form: {
			handler: KarmaApp.#onSubmit,
			closeOnSubmit: false,
			submitOnChange: true,
			submitOnClose: true,
		},
		position: {
			width: 500,
			height: "auto",
		},
		tag: "form",
		window: {
			contentClasses: ["karma-config", "standard-form"],
			icon: "fas fa-praying-hands",
			title: "KARMA.Form.title",
		},
	};

	static PARTS = {
		form: {
			template: "modules/karma/templates/karma-config.hbs",
		},
	};

	_prepareContext() {
		const karma = game.settings.get("karma", "config");
		const translation =
			game.i18n.translations?.KARMA?.Form?.Inequality?.options
				?? game.i18n._fallback?.KARMA?.Form?.Inequality?.options;
		const gms = this.constructor.getUsers({ gm: true });
		const players = this.constructor.getUsers();
		const allGms = gms.every((gm) => gm.karma);
		const allPlayers = players.every((p) => p.karma);
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
			gms,
			players,
			allGms,
			allPlayers
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

	static markUsers(event, target) {
		const checked = !target.classList.contains("checked");
		target.classList.toggle("checked", checked);
		for (const element of target.closest(".form-group").querySelectorAll(".karma-checkbox:has(input)")) {
			element.querySelector("input").setAttribute("checked", checked);
			element.querySelector("label").classList.toggle("checked", checked);
		}
	}

	/**
	 *Return an array of all users (map of id and name), defaulting to ones currently active
	 */
	static getUsers({ activeOnly = false, gm = false } = {}) {
		const karmaUsers = game.settings.get("karma", "config").users;
		return game.users
			.filter((user) => gm === user.isGM && (!activeOnly || user.active))
			.map((user) => ({
				id: user.id,
				name: user.name,
				karma: karmaUsers.includes(user.id),
			}));
	}

	static async #onSubmit(event, form, formData) {
		const expandForm = foundry.utils.expandObject(formData.object);
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
