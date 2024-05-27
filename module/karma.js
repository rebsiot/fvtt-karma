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

	game.settings.register("karma", "config", {
		scope: "world",
		config: false,
		type: KarmaData,
		default: {
			enabled: false,
			dice: 20,
			inequality: "≤",
			history: 2,
			threshold: 7,
			floor: 13,
			nudge: 5,
			cumulative: false,
		},
		onChange: (value) => {
			document.getElementById("karma-icon")?.classList.toggle("active", value.enabled);
		},
	});

	game.settings.register("karma", "showChatControlIcon", {
		name: "KARMA.Settings.showChatControlIcon.label",
		hint: "KARMA.Settings.showChatControlIcon.hint",
		scope: "world",
		config: true,
		type: Boolean,
		default: true,
		onChange: (value) => {
			document.getElementById("karma-icon")?.classList.toggle("hidden", !value);
		},
	});

	game.settings.register("karma", "showChatMessageIcon", {
		name: "KARMA.Settings.showChatMessageIcon.label",
		hint: "KARMA.Settings.showChatMessageIcon.hint",
		scope: "world",
		config: true,
		type: Boolean,
		default: true,
		onChange: (value) => {
			game.messages.contents
				.slice(-100)
				.filter((m) => m.rolls?.length && m.rolls.find((r) => r.terms.find((t) => t.options.karma)))
				.forEach((m) => ui.chat.updateMessage(m));
		},
	});

	game.keybindings.register("karma", "openKarmDialog", {
		name: "KARMA.Settings.KarmaDialog.label",
		onDown: () => {
			new KarmaApp().render(true);
		},
		restricted: true,
	});
});

Hooks.on("renderChatLog", (app, html) => {
	if (!game.user.isGM) return;
	const karmaButton = document.createElement("label");
	karmaButton.classList.add("karma-icon");
	karmaButton.innerHTML =
		'<a data-tooltip="Karma" role="button"><i id="karma-icon" class="fas fa-praying-hands"></i></a>';
	karmaButton.addEventListener("click", (ev) => new KarmaApp().render(true));

	html.find(".chat-control-icon").after(karmaButton);
	const karmaIcon = document.getElementById("karma-icon");
	karmaIcon?.classList.toggle("active", game.settings.get("karma", "config").enabled);
	karmaIcon?.classList.toggle("hidden", !game.settings.get("karma", "showChatControlIcon"));
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
	const karma = game.settings.get("karma", "config");
	const roll = await wrapped(options);
	if (karma.enabled && this.faces === karma.dice) {
		if (!karma.users.length || karma.users.includes(game.user.id)) {
			const userKarma = game.user.getFlag("karma", "stats") ?? {
				history: [],
				cumulative: 0,
			};
			const history = userKarma.history;
			history.push(roll.result);
			while (history.length > karma.history) {
				history.shift();
			}

			if (!options.maximize && !options.minimize) {
				const oldRoll = roll.result;
				const comparison = (v1, v2) => {
					switch (karma.inequality) {
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
				if (karma.type === "simple") {
					const tempResult = history.findIndex((element) => !comparison(element, karma.threshold));

					if (history.length === karma.history && tempResult === -1) {
						while (roll.result < karma.floor) {
							roll.result = Math.ceil(CONFIG.Dice.randomUniform() * this.faces);
						}

						history.push(roll.result);
					}
				} else if (karma.type === "average") {
					const tempResult = history.reduce((a, b) => a + b, 0) / history.length;

					if (history.length === karma.history && comparison(tempResult, karma.threshold)) {
						if (karma.cumulative) userKarma.cumulative += 1;
						else userKarma.cumulative = 1;

						const nudge = userKarma.cumulative * karma.nudge;
						if (["≤", "<"].includes(karma.inequality)) roll.result += nudge;
						else roll.result -= nudge;
						roll.result = Math.clamp(roll.result, 1, this.faces);

						history.push(roll.result);
					} else userKarma.cumulative = 0;
				}
				while (history.length > karma.history) {
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
	}
	return roll;
}
