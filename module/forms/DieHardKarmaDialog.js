import DieHardDialog from "./DieHardDialog.js";

export default class DieHardKarmaDialog extends DieHardDialog {
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			submitOnChange: true,
			width: 500,
			height: "auto",
			template: "modules/foundry-die-hard/templates/die-hard-karma-config.hbs",
			id: "die-hard-karma-config",
			title: "Die Hard Karma Config",
		});
	}

	async getData() {
		return {
			simpleKarma: game.settings.get("foundry-die-hard", "simpleKarmaSettings"),
			simpleKarmaPlayerStats: this.getkarmaPlayerStats("simpleKarma"),
			avgKarma: game.settings.get("foundry-die-hard", "avgKarmaSettings"),
			avgKarmaPlayerStats: this.getkarmaPlayerStats("avgKarmaData"),
			whoGmOptions: game.dieHard.getUsers(true, false, true),
			whoUserOptions: game.dieHard.getUsers(),
			//whoActorOptions: game.dieHard.getFudgeWhoActorOptions(),
		};
	}

	activateListeners(html) {
		super.activateListeners(html);
	}

	getkarmaPlayerStats(karmaType) {
		let playerStats = [];

		for (let userId of game.users.keys()) {
			let curUser = game.users.get(userId);

			let curUserStats = [];
			if (karmaType === "simpleKarma") {
				curUserStats = curUser.getFlag("foundry-die-hard", karmaType);
			} else {
				try {
					let karmaData = curUser.getFlag("foundry-die-hard", karmaType);
					curUserStats = karmaData.history;
				} catch (e) {}
			}

			if (!Array.isArray(curUserStats)) {
				curUserStats = [];
			}
			let curUserAvg = Math.round((curUserStats.reduce((a, b) => a + b, 0) / curUserStats.length) * 10) / 10;
			if (isNaN(curUserAvg)) {
				curUserAvg = 0;
			}
			playerStats.push({
				name: curUser.name,
				stats: curUserStats,
				statsString: curUserStats.join(", "),
				avg: curUserAvg,
			});
		}
		return playerStats;
	}

	async _onChangeInput(event) {
		if (event.currentTarget.matches(".die-hard-checkbox.karma")) {
			if (event.currentTarget.id === "karmaSimpleEnabled") {
				event.currentTarget.parentElement.querySelector(".die-hard-checkbox.karma.avg").checked = false;
			} else if (event.currentTarget.id === "karmaAvgEnabled") {
				event.currentTarget.parentElement.querySelector(".die-hard-checkbox.karma.simple").checked = false;
			}
		}
		return super._onChangeInput(event);
	}

	async _updateObject(event, formData) {
		const who = formData.karmaWho.filter(Boolean);
		await game.settings.set("foundry-die-hard", "karmaWho", who);
		await game.settings.set("foundry-die-hard", "simpleKarmaSettings", {
			enabled: formData.karmaSimpleEnabled === "true",
			history: formData.karmaSimpleHistory ?? 2,
			threshold: formData.karmaSimpleThreshold ?? 7,
			floor: formData.karmaSimpleFloor ?? 13,
		});
		await game.settings.set("foundry-die-hard", "avgKarmaSettings", {
			enabled: formData.karmaAvgEnabled === "true",
			history: formData.karmaAvgHistory ?? 3,
			threshold: formData.karmaAvgThreshold ?? 7,
			nudge: formData.karmaAvgNudge ?? 5,
			nudge2: formData.karmaAvgNudge * 2 ?? 10,
			nudge3: formData.karmaAvgNudge * 3 ?? 15,
			cumulative: formData.karmaAvgCumulative === "true",
		});

		if (event.type === "submit") {
			this.close();
		} else {
			this.render();
		}
	}
}
