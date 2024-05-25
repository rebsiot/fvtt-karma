import { DieHardKarmaApp } from "./DieHardKarmaDialog.js";
import { KarmaSettings } from "./KarmaData.js";

Hooks.once("init", () => {
	libWrapper.register("foundry-die-hard", "CONFIG.Dice.termTypes.DiceTerm.prototype.roll", wrapDiceTermRoll, "MIXED");
	game.settings.registerMenu("foundry-die-hard", "KarmaDialog", {
		name: "Karma",
		label: "Karma",
		hint: "",
		icon: "fas fa-praying-hands",
		type: DieHardKarmaApp,
		restricted: true,
	});

	game.settings.register("foundry-die-hard", "karma", {
		name: "Karma",
		hint: "Simple Karma Settings",
		scope: "world",
		config: false,
		type: KarmaSettings,
		default: {
			enabled: false,
			history: 2,
			threshold: 7,
			floor: 13,
			nudge: 5,
			cumulative: false,
		},
		onChange: (value) => refreshDieHardIcons(),
	});
});

Hooks.on("renderChatLog", (app, html) => {
	if (!game.user.isGM) return;
	const karmaButton = document.createElement("label");
	karmaButton.classList.add("die-hard-karma-icon");
	karmaButton.innerHTML =
		'<a data-tooltip="Karma" role="button"><i id="die-hard-karma-icon" class="fas fa-praying-hands"></i></a>';
	karmaButton.addEventListener("click", (ev) => new DieHardKarmaApp().render(true));

	html.find(".chat-control-icon").after(karmaButton);
	refreshDieHardIcons();
});

Hooks.on("renderChatMessage", (message, html, data) => {
	if (!game.user.isGM || !message.rolls?.length) return;
	const terms = message.rolls.find((r) => r.terms.find((t) => t.options.dieHard))?.terms;
	if (terms) {
		const dieHardOptions = terms.find((t) => t.options.dieHard).options.dieHard;
		const metadata = html.find(".message-metadata");
		Object.entries(dieHardOptions).forEach(([key, data]) => {
			const title = `data-tooltip="${data}" data-tooltip-direction="LEFT"`;
			const button = $(`<span ${title}><i class="fas fa-praying-hands"></i></span>`);
			metadata.append(button);
		});
	}
});

function refreshDieHardIcons() {
	const karmaIcon = document.getElementById("die-hard-karma-icon");
	const karmaEnabled = game.settings.get("foundry-die-hard", "karma").enabled;
	karmaIcon?.classList.toggle("hidden", !karmaEnabled);
	karmaIcon?.classList.toggle("active", karmaEnabled);
}

/**
 * Wrapper for raw dice
 * @param {function} wrapped
 * @param {object} options
 * @returns {{result: undefined, active: boolean}|*}
 */
function wrapDiceTermRoll(wrapped, options) {
	const karma = game.settings.get("foundry-die-hard", "karma");
	const roll = wrapped(options);
	if (karma.enabled && this.faces === karma.dice) {
		if (!karma.users.length || karma.users.includes(game.user.id)) {
			const userKarma = game.user.getFlag("foundry-die-hard", "karma") ?? {
				history: [],
				cumulative: 0,
			};
			const history = userKarma.history;
			history.push(roll.result);
			while (history.length > karma.history) {
				history.shift();
			}

			if (karma.type === "simple") {
				const tempResult = history.findIndex((element) => element > karma.threshold);

				if (history.length === karma.history && tempResult === -1) {
					let originalResult = roll.result;
					while (roll.result < karma.floor) {
						// This is copied from resources/app/client/dice/terms/dice.js - rolls method
						if (options.minimize) roll.result = Math.min(1, this.faces);
						else if (options.maximize) roll.result = this.faces;
						else roll.result = Math.ceil(CONFIG.Dice.randomUniform() * this.faces);
					}

					history.push(roll.result);
					while (history.length > karma.history) {
						history.shift();
					}
					if (karma.chat !== "none") {
						this.options.dieHard = {
							karma: `Adjusted ${originalResult} to a ${roll.result}.`,
						};
					}
				}
				game.user.setFlag("foundry-die-hard", "karma", userKarma);
			} else if (karma.type === "average") {
				const tempResult = history.reduce((a, b) => a + b, 0) / history.length;

				if (history.length === karma.history && tempResult <= karma.threshold) {
					let originalResult = roll.result;
					if (karma.cumulative) userKarma.cumulative += 1;
					else userKarma.cumulative = 1;

					roll.result += userKarma.cumulative * karma.nudge;

					// Max at num faces
					if (roll.result > this.faces) {
						roll.result = this.faces;
					}

					history.push(roll.result);
					while (history.length > history.history) {
						history.shift();
					}
					if (karma.chat !== "none") {
						this.options.dieHard = {
							karma: `Averaged ${originalResult} to a ${roll.result}.`,
						};
					}
				} else userKarma.cumulative = 0;

				game.user.setFlag("foundry-die-hard", "karma", userKarma);
			}
			this.results[this.results.length - 1] = roll;
		}
	}
	return roll;
}
