![GitHub release](https://img.shields.io/github/release-date/mclemente/oundry-die-hard)
![GitHub Releases](https://img.shields.io/github/downloads/mclemente/foundry-die-hard/latest/module.zip)

# Die Hard

This Foundry VTT module is intended to provide functionality that modifies/adjusted die rolls in certain systems.

# Karma

Keep a history of die rolls per user, and if they are below a threshold over a defined history, either force the next roll to be above a minimum value (Simple), or increase the roll by a small amount until the average is above the threshold (Average).

With the module enabled, a praying hands icon will be displayed above the message tray.

![](docs/die-hard-karma-0.jpg)

Clicking on this icon will open a configuration dialog.
The available karma options can be enabled by clicking on the button

![](docs/die-hard-karma-1.jpg)

Within the dialog, the logic used to influence each Karma module is adjustable. For Avg Karma, the adjustment can be consistent (+X, +X, +X, etc.) until the threshold is reached, or it can be cumulative (+X, +2X, +3X, etc...) until the threshold is reached.
The current history of player rolls is displayed.

![](docs/die-hard-karma-2.jpg)

## Mechanics

Karma only works on raw die rolls; it does not influence total rolls directly (only indirectly by influencing the raw rolls).

For Simple Karma, it looks at the previous N rolls, and if all are below the threshold it will ensure that the following roll is over the value of Y.

For Avg Karma, it averages the previous N rolls, and if the average is below the threshold it will adjust (nudge) the result by an increment of Y. Y can be consistent (+X, +X, +X, etc.) or cumulative (+X, +2X, +3X, etc...). Each successive roll will be adjusted until the avg threshold is reached.

## Currently Supported Rolls

-   d20

# Attribution

This project is a fork of [Die Hard](https://github.com/UranusBytes/foundry-die-hard), made by Uranus Bytes AKA Jeremy.
