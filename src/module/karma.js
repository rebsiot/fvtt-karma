import { libWrapper } from "../libs/libWrapper.js";
import { KarmaData } from "./KarmaData.js";
import { KarmaApp } from "./KarmaDialog.js";

Hooks.once("init", () => {
	libWrapper.register("karma", "CONFIG.Dice.termTypes.DiceTerm.prototype.roll", wrapDiceTermRoll, "MIXED");
	game.settings.registerMenu("karma", "KarmaDialog", {
		name: "KARMA.Karma",
		label: "KARMA.Settings.KarmaDialog.label",
		hint: "KARMA.Settings.KarmaDialog.hint",
		icon: "fas fa-praying-hands",
		type: KarmaApp,
		restricted: true,
	});

	// TODO remove on V14
	// Used to convert old 1.0 settings to 2.0
	game.settings.register("karma", "resetSettings", {
		scope: "world",
		config: false,
		type: Boolean,
		default: false
	});

	// TODO remove on V14
	if (!game.settings.get("karma", "resetSettings")) {
		// V1 setting, not used anymore. Kept to avoid issues.
		game.settings.register("karma", "config", {
			scope: "world",
			config: false,
			type: KarmaData
		});
	}

	const { ArrayField, EmbeddedDataField } = foundry.data.fields;
	game.settings.register("karma", "configs", {
		scope: "world",
		config: false,
		type: new ArrayField(
			new EmbeddedDataField(KarmaData),
			{
				empty: false,
				initial: [{
					id: "karma".padEnd(16, "0"),
					enabled: false,
					name: "d20",
					type: "simple",
					dice: 20,
					inequality: "≤",
					history: 2,
					threshold: 7,
					floor: 13,
					nudge: 5,
					cumulative: false,
					users: {},
					allGms: true,
					allPlayers: true,
				}]
			}
		)
	});

	game.settings.register("karma", "showChatMessageIcon", {
		name: "KARMA.Settings.showChatMessageIcon.label",
		hint: "KARMA.Settings.showChatMessageIcon.hint",
		scope: "world",
		config: true,
		type: Boolean,
		default: false,
		onChange: (value) => {
			game.messages.contents
				.slice(-100)
				.filter((m) => m.rolls?.length && m.rolls.find((r) => r.terms.find((t) => t.options.karma)))
				.forEach((m) => ui.chat.updateMessage(m));
		},
	});

	game.settings.register("karma", "controlsButton", {
		name: "KARMA.Settings.controlsButton.label",
		hint: "KARMA.Settings.controlsButton.hint",
		scope: "world",
		config: true,
		type: Boolean,
		default: true,
		onChange: async () => await ui.controls.render({ reset: true }),
	});

	game.settings.register("karma", "hideModule", {
		name: "KARMA.Settings.hideModule.label",
		hint: "KARMA.Settings.hideModule.hint",
		scope: "world",
		config: true,
		type: Boolean,
		default: true,
	});

	game.keybindings.register("karma", "openKarmDialog", {
		name: "KARMA.Settings.KarmaDialog.label",
		onDown: () => {
			new KarmaApp().render(true);
		},
		restricted: true,
	});

	Handlebars.registerHelper("karma-leastMost", function (inequality) {
		return game.i18n.localize(`KARMA.Form.${["≤", "<"].includes(inequality) ? "least" : "most"}`);
	});
});

Hooks.once("ready", async () => {
	// TODO remove on V14
	if (!game.settings.get("karma", "resetSettings")) {
		const config = game.settings.get("karma", "config");
		const defaultValue = game.settings.settings.get("karma.configs").default[0];
		await game.settings.set("karma", "configs", [{ ...defaultValue, ...config }]);
		for (const user of game.users) {
			let flag = foundry.utils.deepClone(user.getFlag("karma", "stats"));
			if (!flag) continue;
			flag = { [config[0].id]: { history: flag.history, cumulative: flag.cumulative } };
			await user.unsetFlag("karma", "stats");
			await user.setFlag("karma", "stats", flag);
		}
		await game.settings.set("karma", "resetSettings", true);
	}
	if (!game.user.isGM && game.settings.get("karma", "hideModule")) {
		const karma = game.modules.get("karma");
		karma._source.title = "libDiceStats";
		karma._source.description = "";
		karma._source.url = "";
	}
});

Hooks.on("getSceneControlButtons", (controls) => {
	if (!game.user.isGM || !game.settings.get("karma", "controlsButton")) return;
	controls.tokens.tools.karma = {
		name: "karma",
		title: "KARMA.Karma",
		icon: "fas fa-praying-hands",
		onChange: () => new KarmaApp().render(true),
		button: true,
	};
});

Hooks.on("renderChatMessage", (message, html, data) => {
	if (!game.user.isGM || !message.rolls?.length || !game.settings.get("karma", "showChatMessageIcon")) return;
	const terms = message.rolls.find((r) => r.terms.find((t) => t.options.karma))?.terms;
	if (terms) {
		const karma = terms.find((t) => t.options.karma).options.karma;
		const button = $(
			`<span
			data-tooltip="${karma.join("<br>")}"
			data-tooltip-direction="LEFT">
				<i class="fas fa-praying-hands"></i>
			</span>`
		);
		html.find(".message-metadata").append(button);
	}
});

/**
 * Wrapper for raw dice
 * @param {function} wrapped
 * @param {object} options
 * @returns {{result: undefined, active: boolean}|*}
 */
async function wrapDiceTermRoll(wrapped, options) {
	const karma = game.settings.get("karma", "configs");
	const roll = await wrapped(options);
	const validKarma = karma.filter((k) => k.enabled && this.faces === k.dice);
	for (const k of validKarma) {
		const valid = (game.user.isGM && k.allGms) || (!game.user.isGM && k.allPlayers) || k.users[game.user.id];
		if (!valid) continue;
		const userKarma = game.user.getFlag("karma", "stats") ?? { [k.id]: { history: [], cumulative: 0 } };
		if (!userKarma[k.id]) userKarma[k.id] = { history: [], cumulative: 0 };
		const history = userKarma[k.id].history;
		history.push(roll.result);
		while (history.length > k.history) {
			history.shift();
		}

		if (!options.maximize && !options.minimize) {
			const oldRoll = roll.result;
			const comparison = (v1, v2) => {
				switch (k.inequality) {
					case "≤":
						return v1 <= v2;
					case "<":
						return v1 < v2;
					case "≥":
						return v1 >= v2;
					case ">":
						return v1 > v2;
				}
			};
			if (k.type === "simple") {
				const tempResult = history.findIndex((element) => !comparison(element, k.threshold));

				if (history.length === k.history && tempResult === -1) {
					const compare = ["≤", "<"].includes(k.inequality)
						? (result) => result < k.floor
						: (result) => result > k.floor;
					while (compare(roll.result)) {
						roll.result = Math.ceil(CONFIG.Dice.randomUniform() * this.faces);
					}

					history.push(roll.result);
				}
			} else if (k.type === "average") {
				const tempResult = history.reduce((a, b) => a + b, 0) / history.length;

				if (history.length === k.history && comparison(tempResult, k.threshold)) {
					if (k.cumulative) userKarma[k.id].cumulative += 1;
					else userKarma[k.id].cumulative = 1;

					const nudge = userKarma[k.id].cumulative * k.nudge;
					if (["≤", "<"].includes(k.inequality)) roll.result += nudge;
					else roll.result -= nudge;
					roll.result = Math.clamp(roll.result, 1, this.faces);

					history.push(roll.result);
				} else userKarma[k.id].cumulative = 0;
			}
			while (history.length > k.history) {
				history.shift();
			}
			if (oldRoll !== roll.result) {
				const message = game.i18n.format("KARMA.AdjustRoll", { oldRoll, newRoll: roll.result });
				if (this.options.karma) this.options.karma.push(message);
				else this.options.karma = [message];
			}
			game.user.setFlag("karma", "stats", userKarma);
			this.results[this.results.length - 1] = roll;
		}
	}
	return roll;
}
