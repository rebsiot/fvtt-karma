export class DieHardKarmaApp extends FormApplication {
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			closeOnSubmit: false,
			submitOnChange: true,
			submitOnClose: true,
			editable: game.user.isGM,
			width: 500,
			height: "auto",
			template: "modules/foundry-die-hard/templates/die-hard-karma-config.hbs",
			id: "die-hard-karma-config",
			title: "Die Hard Karma Config",
		});
	}

	async getData() {
		return {
			karma: game.settings.get("foundry-die-hard", "karma"),
			types: {
				simple: "Simple",
				average: "Average",
			},
			playerStats: this.constructor.getkarmaPlayerStats(),
			whoGmOptions: this.constructor.getUsers({ activeOnly: true, getGM: true }),
			whoUserOptions: this.constructor.getUsers(),
		};
	}

	/**
	 *Return an array of all users (map of id and name), defaulting to ones currently active
	 */
	static getUsers({ activeOnly = false, getGM = false } = {}) {
		const karmaUsers = game.settings.get("foundry-die-hard", "karma").users;
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
			const stats = user.getFlag("foundry-die-hard", "karma")?.history ?? [];
			let avg = 0;
			if (stats.length) {
				const sum = stats.reduce((total, value) => total + value, 0);
				avg = Math.round((sum / stats.length) * 10) / 10;
			}
			playerStats.push({
				name: user.name,
				stats,
				statsString: stats.join(", "),
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

		const original = game.settings.get("foundry-die-hard", "karma");
		await game.settings.set(
			"foundry-die-hard",
			"karma",
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
