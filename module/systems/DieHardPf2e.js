import DieHardTemplate from "./templates/DieHardSystem.js";

export default class DieHardPf2e extends DieHardTemplate {
	constructor() {
		super();

		this.totalRollClassName = ["Roll", "CheckRoll", "StrikeAttackRoll"];
	}
}
