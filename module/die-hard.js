import DieHardFudgeDialog from "./forms/DieHardFudgeDialog.js";
import DieHardKarmaDialog from "./forms/DieHardKarmaDialog.js";
import DieHardDnd5e from "./systems/DieHardDnd5e.js";
import DieHardPf2e from "./systems/DieHardPf2e.js";
import DieHardTemplate from "./systems/templates/DieHardSystem.js";

Hooks.once("init", () => {
	if (game.system.id === "dnd5e") {
		game.dieHard = new DieHardDnd5e();
	} else if (game.system.id === "pf2e") {
		game.dieHard = new DieHardPf2e();
	} else game.dieHard = new DieHardTemplate();
	DieHardTemplate.registerSettings();
});

Hooks.on("renderChatLog", (app, html) => {
	if (!game.user.isGM) return;
	const fudgeButton = document.createElement("label");
	fudgeButton.classList.add("die-hard-fudge-icon");
	fudgeButton.innerHTML = `<a data-tooltip="Fudge Paused" role="button">
      <i id="die-hard-pause-fudge-icon" class="fas fa-pause-circle die-hard-icon-hidden"></i>
      </a>
      <a data-tooltip="Fudge">
        <i id="die-hard-fudge-icon" class="fas fa-poop"></i>
      </a>`;
	fudgeButton.addEventListener("click", (ev) => new DieHardFudgeDialog().render(true));
	fudgeButton.addEventListener("contextmenu", (ev) => game.dieHard.disableAllFudges());

	const karmaButton = document.createElement("label");
	karmaButton.classList.add("die-hard-karma-icon");
	karmaButton.innerHTML =
		'<a data-tooltip="Karma" role="button"><i id="die-hard-karma-icon" class="fas fa-praying-hands"></i></a>';
	karmaButton.addEventListener("click", (ev) => new DieHardKarmaDialog().render(true));

	html.find(".chat-control-icon").after(fudgeButton);
	html.find(".chat-control-icon").after(karmaButton);
	DieHardTemplate.refreshDieHardIcons();
});

Hooks.on("renderChatMessage", (message, html, data) => {
	if (!game.user.isGM || !message.rolls?.length) return;
	const terms = message.rolls.find((r) => r.terms.find((t) => t.options.dieHard))?.terms;
	if (terms) {
		const dieHardOptions = terms.find((t) => t.options.dieHard).options.dieHard;
		const metadata = html.find(".message-metadata");
		const icon = {
			karma: "fa-praying-hands",
			fudge: "fa-poop",
		};
		Object.entries(dieHardOptions).forEach(([key, data]) => {
			const title = `data-tooltip="${data}" data-tooltip-direction="LEFT"`;
			const button = $(`<span ${title}><i class="fas ${icon[key]}"></i></span>`);
			metadata.append(button);
		});
	}
});
