export default class DieHard {
	static refreshDieHardIcons(globalDisable) {
		const iconDisabled = globalDisable ?? game.settings.get("foundry-die-hard", "globalDisable");
		const pauseFudgeIcon = document.getElementById("die-hard-pause-fudge-icon");
		const fudgeIcon = document.getElementById("die-hard-fudge-icon");
		if (game.settings.get("foundry-die-hard", "fudgeEnabled")) {
			if (iconDisabled) {
				pauseFudgeIcon?.classList.remove("die-hard-icon-hidden");
				fudgeIcon?.classList.add("die-hard-icon-hidden");
			} else {
				pauseFudgeIcon?.classList.add("die-hard-icon-hidden");
				fudgeIcon?.classList.remove("die-hard-icon-hidden");
			}
			fudgeIcon?.classList.toggle("die-hard-icon-active", game.dieHard.activeFudges);
		} else {
			pauseFudgeIcon?.classList.add("die-hard-icon-hidden");
			fudgeIcon?.classList.add("die-hard-icon-hidden");
		}

		const karmaIcon = document.getElementById("die-hard-karma-icon");
		const karmaEnabled = game.settings.get("foundry-die-hard", "karma").enabled;
		karmaIcon?.classList.toggle("die-hard-icon-hidden", !karmaEnabled);
		karmaIcon?.classList.toggle("die-hard-icon-active", karmaEnabled);
	}
}
