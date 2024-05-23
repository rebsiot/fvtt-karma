import { makeId } from "../lib/helpers.js";
import DieHard, { DieHardSetting } from "./DieHard.js";
import DieHardFudgeRoll from "./DieHardFudgeRoll.js";

export default class DieHardSystem {
	constructor() {
		// Total rolls
		CONFIG.Dice.Roll = Roll;
		libWrapper.register(
			"foundry-die-hard",
			"CONFIG.Dice.Roll.prototype.evaluate",
			this.wrapRollEvaluate,
			"WRAPPER"
		);

		// Raw rolls
		libWrapper.register(
			"foundry-die-hard",
			"CONFIG.Dice.termTypes.DiceTerm.prototype.roll",
			this.wrapDiceTermRoll,
			"MIXED"
		);

		CONFIG.Dice.DieHardFudgeRoll = DieHardFudgeRoll;

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
		DieHard.refreshDieHardIcons();
	}

	/**
	 * Wrapper for raw dice
	 * @param wrapped
	 * @param eval_options
	 * @returns {{result: undefined, active: boolean}|*}
	 */
	wrapDiceTermRoll(wrapped, eval_options) {
		let functionLogName = "DieHardSystem.wrapDiceTermRoll";

		if (!DieHardSetting("fudgeEnabled")) {
		} else if (DieHardSetting("dieHardSettings").fudgeConfig.globallyDisabled) {
		} else {
			// Check if user has an active raw fudge
			let userFudge = game.dieHardSystem.getUserFudge("rawd" + this.faces);

			if (userFudge !== null) {
				// Time to make the fudge
				let gen_new_result = true;
				let failedRolls = [];
				let SafetyLoopIndex = DieHardSetting("dieHardSettings").fudgeConfig.maxFudgeAttemptsPerRoll;
				let newResult = undefined;
				let roll = { result: undefined, active: true };
				while (gen_new_result && SafetyLoopIndex > 0) {
					SafetyLoopIndex--;

					// ToDo: remove this hack
					// Only force the roll on the first die
					if (DieHardSetting("debugDieResultEnabled") && newResult === undefined) {
						let debugResult = DieHardSetting("debugDieResult");

						DieHard.dmToGm("debugDieResult used to change " + newResult + " to " + debugResult);
						newResult = debugResult;
					} else {
						// This is copied from resources/app/client/dice/terms/dice.js - rolls method
						if (eval_options.minimize) roll.result = Math.min(1, this.faces);
						else if (eval_options.maximize) newResult = this.faces;
						else newResult = Math.ceil(CONFIG.Dice.randomUniform() * this.faces);
					}

					let evalResult = game.dieHardSystem.evalFudge(
						newResult,
						userFudge.operator,
						userFudge.operatorValue
					);
					if (evalResult) {
						gen_new_result = false;
						roll.result = newResult;
						this.results.push(roll);
						DieHard.dmToGm(
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
							game.dieHardSystem.isBetterFudge(
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
					DieHard.dmToGm("DieHard-Fudge: Gave up trying to fudge; loop safety reached...");
				}
				if (userFudge.statusEndless) {
				} else {
					game.dieHardSystem.disableUserFudge(userFudge.id);
				}
				// Return the fudged roll; no taking karma into consideration
				return roll;
			}
			// No user fudging to occur; continue roll as usual
		}

		if (!DieHardSetting("karmaEnabled")) {
		} else if (this.faces !== 20) {
		} else {
			let simpleKarmaSettings = DieHardSetting("simpleKarmaSettings");
			let avgKarmaSettings = DieHardSetting("avgKarmaSettings");
			const who = DieHardSetting("karmaWho");
			if (
				(who.length === 0 || who.includes(game.user.id)) &&
				(simpleKarmaSettings.enabled || avgKarmaSettings.enabled)
			) {
				// Make the initial roll
				let roll = { result: undefined, active: true };
				// This is copied from resources/app/client/dice/terms/dice.js - rolls method
				if (eval_options.minimize) roll.result = Math.min(1, this.faces);
				else if (eval_options.maximize) roll.result = this.faces;
				else roll.result = Math.ceil(CONFIG.Dice.randomUniform() * this.faces);

				// If the Die Hard debug roll is enabled, then override the roll
				if (DieHardSetting("debugDieResultEnabled")) {
					let debugResult = DieHardSetting("debugDieResult");

					DieHard.dmToGm("debugDieResult used to change " + roll.result + " to " + debugResult);
					roll.result = debugResult;
				}

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
							if (eval_options.minimize) roll.result = Math.min(1, this.faces);
							else if (eval_options.maximize) roll.result = this.faces;
							else roll.result = Math.ceil(CONFIG.Dice.randomUniform() * this.faces);
						}

						simpleKarmaData.push(roll.result);
						while (simpleKarmaData.length > simpleKarmaSettings.history) {
							simpleKarmaData.shift();
						}
						DieHard.dmToGm(
							"DieHard-Karma: Simple Karma for " +
								game.users.current.name +
								" adjusted a roll of " +
								originalResult +
								" to a " +
								roll.result
						);
					}
					game.users.current.setFlag("foundry-die-hard", "simpleKarma", simpleKarmaData);
				}

				if (avgKarmaSettings.enabled) {
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
						DieHard.dmToGm(
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
				} else {
				}
				this.results.push(roll);
				return roll;
			} else {
			}
		}
		return wrapped(eval_options);
	}

	/**
	 * Wrapper for a total roll
	 * @param wrapped
	 * @param eval_options
	 * @returns {*}
	 */
	wrapRollEvaluate(wrapped, eval_options) {
		let uuid = makeId(6);
		let functionLogName = "DieHardSystem.wrapRollEvaluate-" + uuid;

		if (!DieHardSetting("fudgeEnabled")) {
		} else if (DieHardSetting("dieHardSettings").fudgeConfig.globallyDisabled) {
		} else {
			// Check if a total die roll (otherwise some type of system specific roll)
			if (game.dieHardSystem.totalRollClassName.indexOf(this.constructor.name) !== -1) {
				for (let die in this.dice) {
					if (typeof this.dice[die] === "function") {
						continue;
					}

					let userFudge = game.dieHardSystem.getUserFudge("totald" + this.dice[die].faces);
					if (userFudge !== null) {
						foundry.utils.mergeObject(this, {
							data: {
								fudge: true,
								fudgeOperator: userFudge.operator,
								fudgeOperatorValue: userFudge.operatorValue,
								fudgeHow: userFudge.howFormula,
							},
						});

						if (userFudge.statusEndless) {
						} else {
							game.dieHardSystem.disableUserFudge(userFudge.id);
						}
						// This is a root roll, so allow fudge re-roll
						// Stop looking for more opportunities to fudge
						break;
					}
				}
				let result = null;
				if (this.data.fudge !== undefined) {
					result = wrapped({
						minimize: eval_options.minimize,
						maximize: eval_options.maximize,
						async: false,
					});

					if (this instanceof CONFIG.Dice.DieHardFudgeRoll) {
					} else {
						let gen_new_result = false;
						let evalResult = game.dieHardSystem.evalFudge(
							this.total,
							this.data.fudgeOperator,
							this.data.fudgeOperatorValue
						);

						if (evalResult) {
							DieHard.dmToGm("DieHard-Fudge: Total Fudge not needed, but still disabled...");
						} else {
							let failedRolls = [this.total];
							gen_new_result = true;

							let SafetyLoopIndex = DieHardSetting("dieHardSettings").fudgeConfig.maxFudgeAttemptsPerRoll;
							while (gen_new_result && SafetyLoopIndex > 0) {
								SafetyLoopIndex--;
								let new_roll = new DieHardFudgeRoll(this._formula, this.data, this.options);
								new_roll.evaluate({ async: false });
								evalResult = game.dieHardSystem.evalFudge(
									new_roll.total,
									this.data.fudgeOperator,
									this.data.fudgeOperatorValue
								);
								if (evalResult) {
									gen_new_result = false;
									foundry.utils.mergeObject(this, new_roll, { recursive: false });
									DieHard.dmToGm(
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
										game.dieHardSystem.isBetterFudge(
											this.total,
											new_roll.total,
											this.data.fudgeOperator,
											this.data.fudgeOperatorValue
										)
									) {
										foundry.utils.mergeObject(this, new_roll, { recursive: false });
									}
									failedRolls.push(new_roll.total);
								}
							}
							if (SafetyLoopIndex === 0) {
								DieHard.dmToGm("DieHard-Fudge: Gave up trying to fudge; loop safety reached...");
							}
						}
					}
				} else {
					result = wrapped(eval_options);
				}
				return result;
			}
			// No user fudging to occur; continue roll as usual
		}
		return wrapped(eval_options);
	}

	/**
   Return an array of all users (map of id and name), defaulting to ones currently active
   */
	getUsers(activeOnly = true, includeFudges = false, getGM = false, userId = null) {
		if (game.settings.get("foundry-die-hard", "dieHardSettings").debug.allActors) {
			activeOnly = false;
		}
		let activeUsers = [];
		const who = DieHardSetting("karmaWho");
		for (let userId of game.users.keys()) {
			let curUser = game.users.get(userId);
			let curUserType = curUser.isGM;
			if (getGM) {
				curUserType = !curUser.isGM;
			}
			if (activeOnly) {
				if (!curUserType && curUser.active) {
					let newUser = { id: userId, name: curUser.name, karma: who.includes(userId) };
					if (includeFudges) {
						newUser.fudges = curUser.getFlag("foundry-die-hard", "fudges");
						if (!Array.isArray(newUser.fudges)) {
							newUser.fudges = [];
						}
					}
					activeUsers.push(newUser);
				}
			} else {
				if (!curUserType) {
					let newUser = { id: userId, name: curUser.name, karma: who.includes(userId) };
					if (includeFudges) {
						newUser.fudges = curUser.getFlag("foundry-die-hard", "fudges");
						if (!Array.isArray(newUser.fudges)) {
							newUser.fudges = [];
						}
					}
					activeUsers.push(newUser);
				}
			}
		}
		return activeUsers;
	}

	/**
   Return an array of all fudges
   */
	getAllFudges() {
		let fudges = {
			// actorFudges: this.getActors(false, true),
			userFudges: this.getUsers(false, true),
			gmFudges: this.getUsers(false, true, true),
		};
		return fudges;
	}

	/*
    Return true if there are any active fudges (GM or Actor)
   */
	hasActiveFudges() {
		let allFudges = this.getAllFudges();

		for (let fudgeType in allFudges) {
			for (let fudgeSource of allFudges[fudgeType]) {
				try {
					if (fudgeSource.fudges.length > 0) {
						let fudgeIndex = fudgeSource.fudges.findIndex((element) => {
							return element.statusActive;
						});

						if (fudgeIndex !== -1) {
							return true;
						}
					}
				} catch (e) {}
			}
		}
		return false;
	}

	/*
    Return true if there are any active Karma
   */
	hasActiveKarma() {
		let avgKarmaSettings = DieHardSetting("avgKarmaSettings");
		let simpleKarmaSettings = DieHardSetting("simpleKarmaSettings");
		if (avgKarmaSettings.enabled || simpleKarmaSettings.enabled) {
			return true;
		}
		return false;
	}

	async refreshActiveFudgesIcon() {
		/*
    Handled in DieHard.refreshDieHardIcons
    if (game.settings.get('foundry-die-hard', 'dieHardSettings').fudgeConfig.globallyDisabled) {
      document.getElementById('die-hard-pause-fudge-icon').classList.remove("die-hard-icon-hidden");
      document.getElementById('die-hard-fudge-icon').classList.add("die-hard-icon-hidden");
      return;
    } else {
      document.getElementById('die-hard-pause-fudge-icon').classList.add("die-hard-icon-hidden");
      document.getElementById('die-hard-fudge-icon').classList.remove("die-hard-icon-hidden");
    }
     */

		// Ugly fix for objects not existing yet
		// ToDo: clean this up
		try {
			if (this.hasActiveFudges()) {
				document.getElementById("die-hard-fudge-icon").classList.add("die-hard-icon-active");
			} else {
				document.getElementById("die-hard-fudge-icon").classList.remove("die-hard-icon-active");
			}
		} catch (e) {}
	}

	getFudgeWhatOptions() {
		return this.fudgeWhatOptions;
	}

	getFudgeWhatRawOptions() {
		return this.fudgeWhatRawOptions;
	}

	getFudgeWhatTotalOptions() {
		return this.fudgeWhatTotalOptions;
	}

	/**
   Get an object of all who options
   */
	getFudgeWhoUserOptions() {
		return this.getUsers();
	}

	getFudgeWhoGmOptions() {
		return this.getUsers(true, false, true);
	}

	hookReady() {}

	// game.dieHardSystem.deleteAllFudges()
	deleteAllFudges() {
		// Players
		let users = game.dieHardSystem.getUsers(false);
		for (let user in users) {
			try {
				game.user.get(users[user].id).setFlag("foundry-die-hard", "fudges", null);
				game.user.get(users[user].id).setFlag("foundry-die-hard", "activeFudges", null);
				game.user.get(users[user].id).setFlag("foundry-die-hard", "userFudges", null);
			} catch (e) {}
		}

		// Players
		let gms = game.dieHardSystem.getUsers(false, false, true);
		for (let user in gms) {
			try {
				game.user.get(users[user].id).setFlag("foundry-die-hard", "fudges", null);
				game.user.get(users[user].id).setFlag("foundry-die-hard", "activeFudges", null);
				game.user.get(users[user].id).setFlag("foundry-die-hard", "userFudges", null);
			} catch (e) {}
		}
	}

	disableAllFudges() {
		let settings = game.settings.get("foundry-die-hard", "dieHardSettings");
		settings.fudgeConfig.globallyDisabled = !settings.fudgeConfig.globallyDisabled;
		game.settings.set("foundry-die-hard", "dieHardSettings", settings);
		DieHard.refreshDieHardIcons(settings.fudgeConfig.globallyDisabled);
	}

	static registerTests = (context) => {};
}
