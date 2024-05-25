import { KarmaSettings } from "./KarmaData.js";
import { KarmaApp } from "./KarmaDialog.js";

Hooks.once("init", () => {
	libWrapper.register("karma", "CONFIG.Dice.termTypes.DiceTerm.prototype.roll", wrapDiceTermRoll, "MIXED");
	game.settings.registerMenu("karma", "KarmaDialog", {
		name: "Karma",
		label: "Karma",
		hint: "",
		icon: "fas fa-praying-hands",
		type: KarmaApp,
		restricted: true,
	});

	game.settings.register("karma", "karma", {
		name: "Karma",
		hint: "Simple Karma Settings",
		scope: "world",
		config: false,
		type: KarmaSettings,
		default: {
			enabled: true,
			history: 2,
			threshold: 7,
			floor: 13,
			nudge: 5,
			cumulative: false,
		},
		onChange: (value) => refreshKarmaIcons(),
	});

	game.keybindings.register("karma", "openKarmDialog", {
		name: "Open Karm Dialog",
		hint: "",
		editable: [],
		onDown: () => {
			new KarmaApp().render(true);
		},
		restricted: true,
		precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
		repeat: false,
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
	refreshKarmaIcons();
});

Hooks.on("renderChatMessage", (message, html, data) => {
	if (!game.user.isGM || !message.rolls?.length) return;
	const terms = message.rolls.find((r) => r.terms.find((t) => t.options.karma))?.terms;
	if (terms) {
		const desc = terms.find((t) => t.options.karma).options.karma;
		const button = $(
			`<span data-tooltip="${desc}" data-tooltip-direction="LEFT"><i class="fas fa-praying-hands"></i></span>`
		);
		html.find(".message-metadata").append(button);
	}
});

function refreshKarmaIcons() {
	const karmaIcon = document.getElementById("karma-icon");
	const karmaEnabled = game.settings.get("karma", "karma").enabled;
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
	const karma = game.settings.get("karma", "karma");
	const roll = wrapped(options);
	if (karma.enabled && this.faces === karma.dice) {
		if (!karma.users.length || karma.users.includes(game.user.id)) {
			const userKarma = game.user.getFlag("karma", "karma") ?? {
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
						this.options.karma = `Adjusted ${originalResult} to a ${roll.result}.`;
					}
				}
				game.user.setFlag("karma", "karma", userKarma);
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
						this.options.karma = `Averaged ${originalResult} to a ${roll.result}.`;
					}
				} else userKarma.cumulative = 0;

				game.user.setFlag("karma", "karma", userKarma);
			}
			this.results[this.results.length - 1] = roll;
		}
	}
	return roll;
}
