import { insertAfter } from "../lib/helpers.js";
import DieHardDnd5e from "./DieHardDnd5e.js";
import DieHardFudgeDialog from "./DieHardFudgeDialog.js";
import DieHardKarmaDialog from "./DieHardKarmaDialog.js";
import DieHardPf2e from "./DieHardPf2e.js";

export const DieHardSetting = (setting) => game.settings.get("foundry-die-hard", setting);

export default class DieHard {
	static renderDieHardIcons() {
		if (game.dieHardSystem == null) {
			return;
		}

		if (document.querySelector(".die-hard-pause-fudge-icon") === null) {
			let fudgeButton = document.createElement("label");
			fudgeButton.classList.add("die-hard-fudge-icon");
			fudgeButton.innerHTML =
				'<span title="Fudge Paused"><i id="die-hard-pause-fudge-icon" class="fas fa-pause-circle die-hard-icon-hidden"></i></span><span title="Fudge"><i id="die-hard-fudge-icon" class="fas fa-poop"></i></span>';
			fudgeButton.addEventListener("click", async (ev) => {
				new DieHardFudgeDialog().render(true);
			});
			fudgeButton.addEventListener("contextmenu", async (ev) => {
				game.dieHardSystem.disableAllFudges();
			});

			// ToDo: Fix this ugly hack
			// the document object isn't existing sometimes yet, so just ignore.  It'll eventually render
			try {
				//insertAfter(pauseButton, document.querySelector('.chat-control-icon'));
				insertAfter(fudgeButton, document.querySelector(".chat-control-icon"));
				//game.dieHardSystem.refreshActiveFudgesIcon()
			} catch (e) {}
		}

		if (document.querySelector(".die-hard-karma-icon") === null) {
			let karmaButton = document.createElement("label");
			karmaButton.classList.add("die-hard-karma-icon");
			karmaButton.innerHTML =
				'<span title="Karma"><i id="die-hard-karma-icon" class="fas fa-praying-hands"></i></span>';
			karmaButton.addEventListener("click", async (ev) => {
				new DieHardKarmaDialog().render(true);
			});

			// ToDo: Fix this ugly hack
			// the document object isn't existing sometimes yet, so just ignore.  It'll eventually render
			try {
				insertAfter(karmaButton, document.querySelector(".chat-control-icon"));
			} catch (e) {}
		}
		DieHard.refreshDieHardIcons();
	}

	static getDefaultDieHardSettings() {
		let dieHardSettings = {
			debug: {
				allActors: true,
			},
			fudgeConfig: {
				maxFudgeAttemptsPerRoll: 150,
				globalDisable: false,
			},
			gmFudges: [],
		};
		return dieHardSettings;
	}

	static getDefaultSimpleKarmaSettings() {
		return {
			enabled: false,
			history: 2,
			threshold: 7,
			floor: 13,
		};
	}

	static getAvgSimpleKarmaSettings() {
		return {
			enabled: false,
			history: 3,
			threshold: 7,
			nudge: 5,
		};
	}

	static registerSettings() {
		if (game.system.id === "dnd5e") {
			game.dieHardSystem = new DieHardDnd5e();
		} else if (game.system.id === "pf2e") {
			game.dieHardSystem = new DieHardPf2e();
		} else {
		}

		// Enables fudge
		game.settings.register("foundry-die-hard", "fudgeEnabled", {
			name: "Fudge Enabled",
			hint: "Fudge Enabled",
			scope: "world",
			config: true,
			default: true,
			type: Boolean,
			onChange: DieHard.refreshDieHardStatus,
		});

		// Enables karma
		game.settings.register("foundry-die-hard", "karmaEnabled", {
			name: "Karma Enabled",
			hint: "Karma Enabled",
			scope: "world",
			config: true,
			default: true,
			type: Boolean,
			onChange: DieHard.refreshDieHardStatus,
		});

		// Enables debug die
		game.settings.register("foundry-die-hard", "debugDieResultEnabled", {
			name: "Debug Die Result Enabled",
			hint: "Enable the use of Debug Die Result",
			scope: "world",
			config: true,
			default: false,
			type: Boolean,
		});
		game.settings.register("foundry-die-hard", "debugDieResult", {
			name: "Debug Die Result",
			hint: "Make every initial roll of die value",
			scope: "world",
			config: true,
			default: 5,
			type: Number,
			range: {
				min: 1,
				max: 20,
				step: 1,
			},
		});

		game.settings.register("foundry-die-hard", "dieHardSettings", {
			name: "",
			default: DieHard.getDefaultDieHardSettings(),
			type: Object,
			scope: "world",
			config: false,
		});

		// Simple Karma
		game.settings.register("foundry-die-hard", "simpleKarmaSettings", {
			name: "Simple Karma Settings",
			hint: "Simple Karma Settings",
			scope: "world",
			config: false,
			default: DieHard.getDefaultSimpleKarmaSettings(),
			type: Object,
		});

		// Average Karma
		game.settings.register("foundry-die-hard", "avgKarmaSettings", {
			name: "Average Karma Settings",
			hint: "Average Karma Settings",
			scope: "world",
			config: false,
			default: DieHard.getAvgSimpleKarmaSettings(),
			type: Object,
		});

		// Karma Who
		game.settings.register("foundry-die-hard", "karmaWho", {
			scope: "world",
			config: false,
			default: [],
			type: Array,
		});
	}

	static async refreshDieHardStatus() {
		await DieHard.refreshDieHardIcons();
		game.dieHardSystem.refreshActiveFudgesIcon();
	}

	static async refreshDieHardIcons(globallyDisabled = undefined) {
		let iconDisabled;
		if (globallyDisabled === undefined) {
			iconDisabled = DieHardSetting("dieHardSettings").fudgeConfig.globallyDisabled;
		} else {
			iconDisabled = globallyDisabled;
		}
		// Ugly fix for objects not existing yet
		// ToDo: clean this up
		try {
			if (DieHardSetting("fudgeEnabled")) {
				if (iconDisabled) {
					//Disabled

					document.getElementById("die-hard-pause-fudge-icon").classList.remove("die-hard-icon-hidden");
					document.getElementById("die-hard-fudge-icon").classList.add("die-hard-icon-hidden");
					return;
				} else {
					//Enabled

					document.getElementById("die-hard-pause-fudge-icon").classList.add("die-hard-icon-hidden");
					document.getElementById("die-hard-fudge-icon").classList.remove("die-hard-icon-hidden");
				}
				if (game.dieHardSystem.hasActiveFudges()) {
					document.getElementById("die-hard-fudge-icon").classList.add("die-hard-icon-active");
				} else {
					document.getElementById("die-hard-fudge-icon").classList.remove("die-hard-icon-active");
				}
			} else {
				document.getElementById("die-hard-pause-fudge-icon").classList.add("die-hard-icon-hidden");
				document.getElementById("die-hard-fudge-icon").classList.add("die-hard-icon-hidden");
			}

			if (DieHardSetting("karmaEnabled")) {
				document.getElementById("die-hard-karma-icon").classList.remove("die-hard-icon-hidden");
				if (game.dieHardSystem.hasActiveKarma()) {
					document.getElementById("die-hard-karma-icon").classList.add("die-hard-icon-active");
				} else {
					document.getElementById("die-hard-karma-icon").classList.remove("die-hard-icon-active");
				}
			} else {
				document.getElementById("die-hard-karma-icon").classList.add("die-hard-icon-hidden");
			}
		} catch (e) {}
	}

	static async dmToGm(message) {
		ChatMessage.create({
			user: game.user.id,
			blind: true,
			content: message,
			whisper: game.users.filter((u) => u.isGM),
			flags: { "foundry-die-hard": { dieHardWhisper: true } },
		});
	}

	// Inspired from https://github.com/ElfFriend-DnD/foundryvtt-attack-roll-check-5e
	static hideDieHardWhisper(message, html) {
		if (!game.user.isGM && message.getFlag("foundry-die-hard", "dieHardWhisper")) {
			html.addClass("die-hard-blind-whisper");
		}
	}
}
