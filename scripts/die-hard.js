import DieHard from "./classes/DieHard.js";
import DieHardVersionNotification from "./classes/DieHardVersionNotification.js";

Hooks.once("init", () => {
	DieHard.registerSettings();
	debounce(DieHard.refreshDieHardIcons, 500);
});

Hooks.once("ready", () => {
	if (game.dieHardSystem == null) {
		return;
	}
	game.dieHardSystem.hookReady();

	// Check if new version; if so send DM to GM
	DieHardVersionNotification.checkVersion();
});

Hooks.on("renderChatMessage", DieHard.hideDieHardWhisper);

Hooks.on("renderSidebarTab", (app, html, data) => {
	// Only display for GM
	if (!game.user.isGM) return;
	if (document.getElementById("die-hard-fudge-icon") == null) {
		// ToDo: Figure out how to debounce this
		DieHard.renderDieHardIcons();
		// foundry.utils.debounce(() => , 100)
		DieHard.refreshDieHardStatus();
	}
});

Hooks.once("devModeReady", ({ registerPackageDebugFlag }) => {
	registerPackageDebugFlag("foundry-die-hard");
});
