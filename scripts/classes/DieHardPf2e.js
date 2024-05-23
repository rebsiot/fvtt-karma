import DieHardSystem from "./DieHardSystem.js";

export default class DieHardPf2e extends DieHardSystem {
	constructor() {
		super();

		this.totalRollClassName = ["Roll", "CheckRoll", "StrikeAttackRoll"];
		this.fudgeWhatOptions = [];
	}

	hookReady() {}
}
