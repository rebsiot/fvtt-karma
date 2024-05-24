import DieHard from "../DieHard.js";

export default class DieHardDialog extends FormApplication {
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			closeOnSubmit: false,
			submitOnClose: true,
			editable: game.user.isGM,
		});
	}

	async close(options = {}) {
		DieHard.refreshDieHardIcons();
		return await super.close(options);
	}
}
