export default class DieHardTemplate {
	constructor() {
		// Total rolls
		CONFIG.Dice.Roll ??= Roll;
		libWrapper.register(
			"foundry-die-hard",
			"CONFIG.Dice.Roll.prototype.evaluate",
			DieHardTemplate.wrapRollEvaluate,
			"WRAPPER"
		);

		// Raw rolls
		libWrapper.register(
			"foundry-die-hard",
			"CONFIG.Dice.termTypes.DiceTerm.prototype.roll",
			DieHardTemplate.wrapDiceTermRoll,
			"MIXED"
		);

		this.totalRollClassName = [];
		this.fudgeWhatOptions = [];
		this.fudgeWhatRawOptions = [
			{
				id: "rawd100",
				name: "Raw d100",
			},
			{
				id: "rawd20",
				name: "Raw d20",
			},
			{
				id: "rawd12",
				name: "Raw d12",
			},
			{
				id: "rawd10",
				name: "Raw d10",
			},
			{
				id: "rawd8",
				name: "Raw d8",
			},
			{
				id: "rawd6",
				name: "Raw d6",
			},
			{
				id: "rawd4",
				name: "Raw d4",
			},
		];
		this.fudgeWhatTotalOptions = [
			{
				id: "totald100",
				name: "Total d100",
			},
			{
				id: "totald20",
				name: "Total d20",
			},
			{
				id: "totald12",
				name: "Total d12",
			},
			{
				id: "totald10",
				name: "Total d10",
			},
			{
				id: "totald8",
				name: "Total d8",
			},
			{
				id: "totald6",
				name: "Total d6",
			},
			{
				id: "totald4",
				name: "Total d4",
			},
		];
		this.maxFudgeAttemptsPerRoll = 150;
	}

	/**
	 * Return an array of all fudges
	 */
	get allFudges() {
		return {
			userFudges: this.getUsers(false, true),
			gmFudges: this.getUsers(false, true, true),
		};
	}

	/*
	 * Return true if there are any active fudges (GM or Actor
	 */
	get activeFudges() {
		const allFudges = this.allFudges;
		for (let fudgeType in allFudges) {
			for (let fudgeSource of allFudges[fudgeType]) {
				if (fudgeSource?.fudges?.some((element) => element.statusActive)) {
					return true;
				}
			}
		}
		return false;
	}

	/*
	 * Return true if there are any active Karma
	 */
	get activeKarma() {
		const avgKarmaSettings = game.settings.get("foundry-die-hard", "avgKarmaSettings");
		const simpleKarmaSettings = game.settings.get("foundry-die-hard", "simpleKarmaSettings");
		return avgKarmaSettings.enabled || simpleKarmaSettings.enabled;
	}

	evalFudge(result, operator, operatorValue) {
		switch (operator) {
			case ">":
				return result > operatorValue;
			case "<":
				return result < operatorValue;
			case ">=":
				return result >= operatorValue;
			case "<=":
				return result <= operatorValue;
			case "!=":
				return result !== operatorValue;
			case "=":
				return result === operatorValue;
		}
	}

	isBetterFudge(oldTotal, newTotal, operator, operatorValue) {
		switch (operator) {
			case ">":
				return newTotal > oldTotal;
			case "<":
				return newTotal < oldTotal;
			case ">=":
				return newTotal >= oldTotal;
			case "<=":
				return newTotal <= oldTotal;
			case "!=":
				return false;
			case "=":
				return false;
		}
	}

	getUserFudge(fudgeType) {
		let userFudges = game.users.current.getFlag("foundry-die-hard", "fudges");

		if (!Array.isArray(userFudges)) {
			return null;
		}
		let fudgeIndex = userFudges.findIndex((element) => {
			return element.whatId === fudgeType && element.statusActive;
		});

		if (fudgeIndex !== -1) {
			return userFudges[fudgeIndex];
		} else {
			return null;
		}
	}

	disableUserFudge(fudgeId) {
		let userFudges = game.users.current.getFlag("foundry-die-hard", "fudges");
		let fudgeIndex = userFudges.findIndex((element) => {
			return element.id === fudgeId;
		});
		userFudges[fudgeIndex].statusActive = false;
		game.users.current.setFlag("foundry-die-hard", "fudges", userFudges);
		DieHardTemplate.refreshDieHardIcons();
	}

	/**
	 * Wrapper for raw dice
	 * @param wrapped
	 * @param options
	 * @returns {{result: undefined, active: boolean}|*}
	 */
	static wrapDiceTermRoll(wrapped, options) {
		if (
			game.settings.get("foundry-die-hard", "fudgeEnabled") &&
			!game.settings.get("foundry-die-hard", "globalDisable")
		) {
			// Check if user has an active raw fudge
			let userFudge = game.dieHard.getUserFudge("rawd" + this.faces);

			if (userFudge !== null) {
				// Time to make the fudge
				let gen_new_result = true;
				let failedRolls = [];
				let SafetyLoopIndex = this.maxFudgeAttemptsPerRoll;
				let newResult = undefined;
				let roll = { result: undefined, active: true };
				while (gen_new_result && SafetyLoopIndex > 0) {
					SafetyLoopIndex--;

					// ToDo: remove this hack
					// This is copied from resources/app/client/dice/terms/dice.js - rolls method
					if (options.minimize) roll.result = Math.min(1, this.faces);
					else if (options.maximize) newResult = this.faces;
					else newResult = Math.ceil(CONFIG.Dice.randomUniform() * this.faces);

					let evalResult = game.dieHard.evalFudge(newResult, userFudge.operator, userFudge.operatorValue);
					if (evalResult) {
						gen_new_result = false;
						roll.result = newResult;
						this.results.push(roll);
						DieHardTemplate.dmToGm(
							"Raw Fudge (" +
								userFudge.howFormula +
								")<br>Values: " +
								failedRolls.join(", ") +
								"<br>Final: " +
								newResult
						);
					} else {
						// New roll is insufficient, but lets at least check if it is "closer"
						if (
							game.dieHard.isBetterFudge(
								roll.result,
								newResult,
								userFudge.operator,
								userFudge.operatorValue
							)
						) {
							roll.result = newResult;
						}
						failedRolls.push(newResult);
					}
				}
				if (SafetyLoopIndex === 0) {
					DieHardTemplate.dmToGm("DieHard-Fudge: Gave up trying to fudge; loop safety reached...");
				}
				if (!userFudge.statusEndless) {
					game.dieHard.disableUserFudge(userFudge.id);
				}
				// Return the fudged roll; no taking karma into consideration
				return roll;
			}
		}

		if (game.settings.get("foundry-die-hard", "karmaEnabled") && this.faces === 20) {
			const simpleKarmaSettings = game.settings.get("foundry-die-hard", "simpleKarmaSettings");
			const avgKarmaSettings = game.settings.get("foundry-die-hard", "avgKarmaSettings");
			const who = game.settings.get("foundry-die-hard", "karmaWho");
			if (
				(who.length === 0 || who.includes(game.user.id)) &&
				(simpleKarmaSettings.enabled || avgKarmaSettings.enabled)
			) {
				// Make the initial roll
				const roll = { result: undefined, active: true };
				// This is copied from resources/app/client/dice/terms/dice.js - rolls method
				if (options.minimize) roll.result = Math.min(1, this.faces);
				else if (options.maximize) roll.result = this.faces;
				else roll.result = Math.ceil(CONFIG.Dice.randomUniform() * this.faces);

				if (simpleKarmaSettings.enabled) {
					let simpleKarmaData = game.users.current.getFlag("foundry-die-hard", "simpleKarma");
					if (!Array.isArray(simpleKarmaData)) {
						simpleKarmaData = [];
					}
					simpleKarmaData.push(roll.result);

					while (simpleKarmaData.length > simpleKarmaSettings.history) {
						simpleKarmaData.shift();
					}

					let tempResult = simpleKarmaData.findIndex((element) => {
						return element > simpleKarmaSettings.threshold;
					});

					if (simpleKarmaData.length === simpleKarmaSettings.history && tempResult === -1) {
						let originalResult = roll.result;
						while (roll.result < simpleKarmaSettings.floor) {
							// This is copied from resources/app/client/dice/terms/dice.js - rolls method
							if (options.minimize) roll.result = Math.min(1, this.faces);
							else if (options.maximize) roll.result = this.faces;
							else roll.result = Math.ceil(CONFIG.Dice.randomUniform() * this.faces);
						}

						simpleKarmaData.push(roll.result);
						while (simpleKarmaData.length > simpleKarmaSettings.history) {
							simpleKarmaData.shift();
						}
						DieHardTemplate.dmToGm(
							"DieHard-Karma: Simple Karma for " +
								game.users.current.name +
								" adjusted a roll of " +
								originalResult +
								" to a " +
								roll.result
						);
					}
					game.users.current.setFlag("foundry-die-hard", "simpleKarma", simpleKarmaData);
				} else if (avgKarmaSettings.enabled) {
					let avgKarmaData = game.users.current.getFlag("foundry-die-hard", "avgKarmaData");

					if (avgKarmaData === undefined) {
						avgKarmaData = {
							history: [],
							cumulative: 0,
						};
					}
					avgKarmaData.history.push(roll.result);
					while (avgKarmaData.history.length > avgKarmaSettings.history) {
						avgKarmaData.history.shift();
					}

					let tempResult = avgKarmaData.history.reduce((a, b) => a + b, 0) / avgKarmaData.history.length;

					if (
						avgKarmaData.history.length === avgKarmaSettings.history &&
						tempResult <= avgKarmaSettings.threshold
					) {
						let originalResult = roll.result;
						if (avgKarmaSettings.cumulative) {
							avgKarmaData.cumulative += 1;
						} else {
							avgKarmaData.cumulative = 1;
						}
						roll.result += avgKarmaData.cumulative * avgKarmaSettings.nudge;

						// Max at num faces
						if (roll.result > this.faces) {
							roll.result = this.faces;
						}

						avgKarmaData.history.push(roll.result);
						while (avgKarmaData.history.length > avgKarmaData.history.history) {
							avgKarmaData.history.shift();
						}
						DieHardTemplate.dmToGm(
							"DieHard-Karma: Avg Karma for " +
								game.users.current.name +
								" adjusted a roll of " +
								originalResult +
								" to a " +
								roll.result
						);
					} else {
						avgKarmaData.cumulative = 0;
					}
					game.users.current.setFlag("foundry-die-hard", "avgKarmaData", avgKarmaData);
				}
				this.results.push(roll);
				return roll;
			}
		}
		return wrapped(options);
	}

	/**
	 * Wrapper for a total roll
	 * @param wrapped
	 * @param options
	 * @returns {*}
	 */
	static wrapRollEvaluate(wrapped, options) {
		if (
			game.settings.get("foundry-die-hard", "fudgeEnabled") &&
			!game.settings.get("foundry-die-hard", "globalDisable")
		) {
			// Check if a total die roll (otherwise some type of system specific roll)
			if (game.dieHard.totalRollClassName.indexOf(this.constructor.name) !== -1) {
				for (let die in this.dice) {
					if (typeof this.dice[die] === "function") {
						continue;
					}

					let userFudge = game.dieHard.getUserFudge("totald" + this.dice[die].faces);
					if (userFudge !== null) {
						foundry.utils.foundry.utils.mergeObject(this, {
							data: {
								fudge: true,
								fudgeOperator: userFudge.operator,
								fudgeOperatorValue: userFudge.operatorValue,
								fudgeHow: userFudge.howFormula,
							},
						});

						if (userFudge.statusEndless) {
						} else {
							game.dieHard.disableUserFudge(userFudge.id);
						}
						// This is a root roll, so allow fudge re-roll
						// Stop looking for more opportunities to fudge
						break;
					}
				}
				let result = null;
				if (this.data.fudge !== undefined) {
					result = wrapped({
						minimize: options.minimize,
						maximize: options.maximize,
						async: false,
					});

					if (!(this instanceof Roll)) {
						let gen_new_result = false;
						let evalResult = game.dieHard.evalFudge(
							this.total,
							this.data.fudgeOperator,
							this.data.fudgeOperatorValue
						);

						if (evalResult) {
							DieHardTemplate.dmToGm("DieHard-Fudge: Total Fudge not needed, but still disabled...");
						} else {
							let failedRolls = [this.total];
							gen_new_result = true;

							let SafetyLoopIndex = this.maxFudgeAttemptsPerRoll;
							while (gen_new_result && SafetyLoopIndex > 0) {
								SafetyLoopIndex--;
								let new_roll = new Roll(this._formula, this.data, this.options);
								new_roll.evaluate({ async: false });
								evalResult = game.dieHard.evalFudge(
									new_roll.total,
									this.data.fudgeOperator,
									this.data.fudgeOperatorValue
								);
								if (evalResult) {
									gen_new_result = false;
									foundry.utils.foundry.utils.mergeObject(this, new_roll, { recursive: false });
									DieHardTemplate.dmToGm(
										"Total Fudge (" +
											result.data.fudgeHow +
											")<br>Values: " +
											failedRolls.join(", ") +
											"<br>Final: " +
											new_roll.total
									);
								} else {
									// New roll is insufficient, but lets at least check if it is "closer"
									if (
										game.dieHard.isBetterFudge(
											this.total,
											new_roll.total,
											this.data.fudgeOperator,
											this.data.fudgeOperatorValue
										)
									) {
										foundry.utils.foundry.utils.mergeObject(this, new_roll, { recursive: false });
									}
									failedRolls.push(new_roll.total);
								}
							}
							if (SafetyLoopIndex === 0) {
								DieHardTemplate.dmToGm(
									"DieHard-Fudge: Gave up trying to fudge; loop safety reached..."
								);
							}
						}
					}
				} else {
					result = wrapped(options);
				}
				return result;
			}
		}
		return wrapped(options);
	}

	/**
	 *Return an array of all users (map of id and name), defaulting to ones currently active
	 */
	getUsers(activeOnly = false, includeFudges = false, getGM = false) {
		const who = game.settings.get("foundry-die-hard", "karmaWho");
		return [...game.users.values()]
			.filter((user) => {
				const isGM = user.isGM;
				return (!getGM && !isGM) || (getGM && isGM);
			})
			.filter((user) => !activeOnly || user.active)
			.map((user) => {
				const newUser = { id: user.id, name: user.name, karma: who.includes(user.id) };
				if (includeFudges) {
					newUser.fudges = user.getFlag("foundry-die-hard", "fudges") || [];
				}
				return newUser;
			});
	}

	// game.dieHard.deleteAllFudges()
	deleteAllFudges() {
		// Players
		let users = game.dieHard.getUsers(false);
		for (let user in users) {
			try {
				game.user.get(users[user].id).setFlag("foundry-die-hard", "fudges", null);
				game.user.get(users[user].id).setFlag("foundry-die-hard", "activeFudges", null);
				game.user.get(users[user].id).setFlag("foundry-die-hard", "userFudges", null);
			} catch (e) {}
		}

		// Players
		let gms = game.dieHard.getUsers(false, false, true);
		for (let user in gms) {
			try {
				game.user.get(users[user].id).setFlag("foundry-die-hard", "fudges", null);
				game.user.get(users[user].id).setFlag("foundry-die-hard", "activeFudges", null);
				game.user.get(users[user].id).setFlag("foundry-die-hard", "userFudges", null);
			} catch (e) {}
		}
	}

	disableAllFudges() {
		const globalDisable = game.settings.get("foundry-die-hard", "globalDisable");
		game.settings.set("foundry-die-hard", "globalDisable", !globalDisable);
	}

	static async dmToGm(message) {
		ChatMessage.create({
			user: game.user.id,
			blind: true,
			content: message,
			whisper: game.users.activeGM,
			flags: { "foundry-die-hard": { dieHardWhisper: true } },
		});
	}

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
		if (game.settings.get("foundry-die-hard", "karmaEnabled")) {
			karmaIcon?.classList.remove("die-hard-icon-hidden");
			karmaIcon?.classList.toggle("die-hard-icon-active", game.dieHard.activeKarma);
		} else {
			karmaIcon?.classList.add("die-hard-icon-hidden");
		}
	}

	static registerSettings() {
		// Enables karma
		game.settings.register("foundry-die-hard", "karmaEnabled", {
			name: "Enable Karma",
			hint: "",
			scope: "world",
			config: true,
			default: true,
			type: Boolean,
			onChange: (value) => DieHardTemplate.refreshDieHardIcons(!value),
		});

		// Enables fudge
		game.settings.register("foundry-die-hard", "fudgeEnabled", {
			name: "Enable Fudge",
			hint: "",
			scope: "world",
			config: true,
			default: true,
			type: Boolean,
			onChange: (value) => DieHardTemplate.refreshDieHardIcons(!value),
		});

		game.settings.register("foundry-die-hard", "globalDisable", {
			default: false,
			type: Boolean,
			scope: "world",
			config: false,
			onChange: (value) => DieHardTemplate.refreshDieHardIcons(value),
		});

		// Simple Karma
		game.settings.register("foundry-die-hard", "simpleKarmaSettings", {
			name: "Simple Karma Settings",
			hint: "Simple Karma Settings",
			scope: "world",
			config: false,
			default: {
				enabled: false,
				history: 2,
				threshold: 7,
				floor: 13,
			},
			type: Object,
		});

		// Average Karma
		game.settings.register("foundry-die-hard", "avgKarmaSettings", {
			name: "Average Karma Settings",
			hint: "Average Karma Settings",
			scope: "world",
			config: false,
			default: {
				enabled: false,
				history: 3,
				threshold: 7,
				nudge: 5,
				cumulative: false,
			},
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
}
