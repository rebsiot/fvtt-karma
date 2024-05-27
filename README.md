![GitHub release](https://img.shields.io/github/release-date/mclemente/fvtt-karma)
![GitHub Releases](https://img.shields.io/github/downloads/mclemente/fvtt-karma/latest/module.zip)

# Karmic Dice

Keep a history of dice rolls per user and, if they are below a threshold over a defined history, either force the next roll to be above a minimum value (Simple), or increase the roll by a small amount until the average is above the threshold (Average).

## How to Use

With the module enabled, a praying hands icon will be displayed above the message tray. Clicking on this icon will open a configuration dialog to adjust the karma.

![](docs/die-hard-karma-0.jpg)

For Simple Karma, if all the previous N rolls are below the threshold, the following roll will be over a set value.

For Average Karma, it the average of the previous N rolls is below the threshold, it will adjust the roll by incrementing a set value until the threshold is reached. The adjusment can be fixed (+1, +1, +1...) or cumulative (+1, +2, +3...).

# Attribution

This project is a fork of [Die Hard](https://github.com/UranusBytes/foundry-die-hard), made by Uranus Bytes AKA Jeremy.
