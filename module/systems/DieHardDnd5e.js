import DieHardTemplate from "./templates/DieHardSystem.js";

export default class DieHardDnd5e extends DieHardTemplate {
	constructor() {
		super();

		libWrapper.register(
			"foundry-die-hard",
			"CONFIG.Actor.documentClass.prototype.rollAbilitySave",
			this.actorRollAbilitySave,
			"WRAPPER"
		);
		libWrapper.register(
			"foundry-die-hard",
			"CONFIG.Actor.documentClass.prototype.rollSkill",
			this.actorRollSkill,
			"WRAPPER"
		);
		libWrapper.register(
			"foundry-die-hard",
			"CONFIG.Actor.documentClass.prototype.rollAbilityTest",
			this.actorRollAbilityTest,
			"WRAPPER"
		);
		libWrapper.register(
			"foundry-die-hard",
			"CONFIG.Actor.documentClass.prototype.rollDeathSave",
			this.actorRollDeathSave,
			"WRAPPER"
		);

		libWrapper.register(
			"foundry-die-hard",
			"CONFIG.Item.documentClass.prototype.rollAttack",
			this.entityRollAttack,
			"WRAPPER"
		);

		libWrapper.register(
			"foundry-die-hard",
			"game.dnd5e.dice.D20Roll.prototype._evaluate",
			this.d20rollEvaluate,
			"WRAPPER"
		);

		// See notes in DieHardFudgeD20Roll
		CONFIG.Dice.DieHardFudgeD20Roll = CONFIG.Dice.D20Roll;

		this.totalRollClassName = ["Roll", "D20Roll"];
		this.fudgeWhatOptions = [
			{
				id: "actorRollSkill",
				name: "Skill Roll",
			},
			{
				id: "actorRollAbilitySave",
				name: "Ability Save",
			},
			{
				id: "actorRollAbilityTest",
				name: "Ability Test",
			},
			{
				id: "actorRollDeathSave",
				name: "Death Save",
			},
			{
				id: "entityRollAttack",
				name: "Weapon/Spell/Feat Attack",
			},
		];
	}

	fudgeD20Roll(result, evaluate_options) {
		let fudgeOperator = result.data.fudgeOperator;
		let fudgeOperatorValue = result.data.fudgeOperatorValue;

		let gen_new_result = false;
		let evalResult = this.evalFudge(result.total, fudgeOperator, fudgeOperatorValue);
		if (evalResult) {
			DieHardTemplate.dmToGm("DieHard-Fudge: Fudge not needed, but still wiped from actor...");
		} else {
			gen_new_result = true;
			let dmMessage = "Fudge (" + result.data.fudgeHow + ")\nValues:" + result.total;

			// This is a safety to prevent endless loops from possibly sneaking in
			let SafetyLoopIndex = this.maxFudgeAttemptsPerRoll;
			while (gen_new_result && SafetyLoopIndex > 0) {
				SafetyLoopIndex--;

				// ToDo: Can a "clone()" or a "reroll()" be used instead?  https://foundryvtt.com/api/Roll.html#clone
				const new_roll = new DISABLED_DieHardFudgeD20Roll(result.formula, result.data, {
					flavor: result.options.flavor,
					advantageMode: result.options.advantageMode,
					defaultRollMode: result.options.defaultRollMode,
					rollMode: result.options.rollMode,
					critical: result.options.critical,
					fumble: result.options.fumble,
					targetValue: result.options.targetValue,
					elvenAccuracy: result.options.elvenAccuracy,
					halflingLucky: result.options.halflingLucky,
					reliableTalent: result.options.reliableTalent,
				});
				new_roll.evaluate({
					async: false,
					minimize: evaluate_options.minimize,
					maximize: evaluate_options.maximize,
				});

				evalResult = this.evalFudge(new_roll.total, fudgeOperator, fudgeOperatorValue);
				if (evalResult) {
					gen_new_result = false;
					foundry.utils.foundry.utils.mergeObject(result, new_roll);
					DieHardTemplate.dmToGm(dmMessage);
				} else {
					// New roll is insufficient, but lets at least check if it is "closer"
					if (this.isBetterFudge(result.total, new_roll.total, fudgeOperator, fudgeOperatorValue)) {
						foundry.utils.foundry.utils.mergeObject(result, new_roll);
					}
					dmMessage += "," + new_roll.total;
				}
			}
			if (SafetyLoopIndex === 0) {
				DieHardTemplate.dmToGm("DieHard-Fudge: Gave up trying to fudge; loop safety reached...");
			}
		}

		return result;
	}

	d20rollEvaluate(wrapped, evaluate_options) {
		let fudge = false;
		if (this.data.fudge === true) {
			evaluate_options.async = false;

			if (this instanceof CONFIG.Dice.DieHardFudgeD20Roll) {
				// This is a recursive roll; do sync
				evaluate_options.async = false;
			} else {
				// This is a root roll, so allow fudge re-roll
				fudge = true;
			}
		}

		let result = wrapped.call(evaluate_options);
		// If a fudge re-roll is allowed
		if (fudge) {
			result.then(function (value) {
				game.dieHard.fudgeD20Roll(value, evaluate_options);
			});
		}

		return result;
	}

	wrappedRoll(options, actorId, rollType) {
		if (
			game.settings.get("foundry-die-hard", "fudgeEnabled") &&
			!game.settings.get("foundry-die-hard", "globalDisable")
		) {
			// Check if user has an active fudge
			let userFudge = this.getUserFudge(rollType);
			if (userFudge !== null) {
				foundry.utils.foundry.utils.mergeObject(options, {
					data: {
						fudge: true,
						fudgeOperator: userFudge.operator,
						fudgeOperatorValue: userFudge.operatorValue,
						fudgeHow: userFudge.howFormula,
					},
				});
				// Disable the fudge
				if (!userFudge.statusEndless) this.disableUserFudge(userFudge.id);
			}
		}
	}

	actorRollSkill(wrapped, skillId, options = {}) {
		if (!game.settings.get("foundry-die-hard", "globalDisable")) {
			game.dieHard.wrappedRoll(options, this.id, "actorRollSkill");
		}
		wrapped(skillId, options);
	}

	actorRollAbilitySave(wrapped, abilityId, options = {}) {
		if (!game.settings.get("foundry-die-hard", "globalDisable")) {
			game.dieHard.wrappedRoll(options, this.id, "actorRollAbilitySave");
		}
		wrapped(abilityId, options);
	}

	actorRollAbilityTest(wrapped, abilityId, options = {}) {
		if (!game.settings.get("foundry-die-hard", "globalDisable")) {
			game.dieHard.wrappedRoll(options, this.id, "actorRollAbilityTest");
		}
		wrapped(abilityId, options);
	}

	actorRollDeathSave(wrapped, options = {}) {
		if (!game.settings.get("foundry-die-hard", "globalDisable")) {
			game.dieHard.wrappedRoll(options, this.id, "actorRollDeathSave");
		}
		wrapped(options);
	}

	entityRollAttack(wrapped, options = {}) {
		if (!game.settings.get("foundry-die-hard", "globalDisable")) {
			game.dieHard.wrappedRoll(options, this.actor.id, "entityRollAttack");
		}
		wrapped(options);
	}
}
