'use strict';
//27/12/23

/* exported createBackgroundMenu */

/* global Chroma:readable */
include('window_xxx_helpers.js');
/* global MF_GRAYED:readable, MF_STRING:readable,  */
include('..\\..\\helpers\\menu_xxx.js');
/* global _menu:readable */
include('..\\..\\helpers\\helpers_xxx_input.js');
/* global Input:readable */
include('..\\..\\helpers-external\\namethatcolor\\ntc.js');
/* global ntc:readable */

function createBackgroundMenu(appendTo /* {menuName, subMenuFrom, flags} */, parentMenu, options = { nameColors: false /* Requires Chroma */ }) { // NOSONAR [Must be bound to _background() instance]
	// Constants
	if (Object.prototype.hasOwn(this, 'tooltip')) { this.tooltip.SetValue(null); }
	const menu = parentMenu || new _menu();
	if (appendTo) { menu.findOrNewMenu(appendTo.menuName, appendTo.subMenuFrom, appendTo.flags); }
	const mainMenuName = appendTo.menuName || menu.getMainMenuName();
	// helper
	const getColorName = (val) => {
		return (val !== -1 ? (ntc.name(Chroma(val).hex())[1] || '').toString() || 'unknown' : '-none-');
	};
	const createMenuOption = (key, subKey, menuName = mainMenuName, bCheck = true, addFunc = null) => {
		return function (option) {
			if (option.entryText === 'sep' && menu.getEntries().pop().entryText !== 'sep') { menu.newEntry({ menuName, entryText: 'sep' }); return; } // Add sep only if any entry has been added
			if (option.isEq && option.key === option.value || !option.isEq && option.key !== option.value || option.isEq === null) {
				menu.newEntry({
					menuName, entryText: option.entryText, func: () => {
						if (addFunc) { addFunc(option); }
						if (subKey) {
							if (Array.isArray(subKey)) {
								const len = subKey.length - 1;
								const obj = { [key]: {}, callbackArgs: { bSaveProperties: true } };
								let prev = obj[key];
								subKey.forEach((curr, i) => {
									prev[curr] = i === len ? option.newValue : {};
									prev = prev[curr];
								});
								this.changeConfig({ config: obj, callbackArgs: { bSaveProperties: true } });
							} else {
								this.changeConfig({ config: { [key]: { [subKey]: option.newValue } }, callbackArgs: { bSaveProperties: true } });
							}
						}
						else { this.changeConfig({ config: { [key]: option.newValue }, callbackArgs: { bSaveProperties: true } }); }
					}
				});
				if (bCheck) {
					menu.newCheckMenuLast(() => {
						const val = subKey
							? Array.isArray(subKey)
								? subKey.reduce((acc, curr) => acc[curr], this[key])
								: this[key][subKey]
							: this[key];
						if (option.newValue && typeof option.newValue === 'function') { return !!(val && val.name === option.newValue.name); }
						if (option.newValue && typeof option.newValue === 'object') {
							if (Array.isArray(val)) {
								return !!(val && val.toString() === option.newValue.toString());
							} else if (val) {
								const keys = Object.keys(option.newValue);
								return keys.every((key) => val[key] === option.newValue[key]);
							}
						} else {
							return option.isEq === null && option.value === null && (option.newValue === true || option.newValue === false)
								? !!val
								: (val === option.newValue);
						}
					});
				}
			}
		}.bind(this);
	};
	// Header
	menu.newEntry({ menuName: mainMenuName, entryText: 'Background settings:', flags: MF_GRAYED });
	menu.newEntry({ menuName: mainMenuName, entryText: 'sep' });
	// Menus
	{
		const subMenu = menu.newMenu('Cover mode...', mainMenuName);
		[
			{ isEq: null, key: this.coverMode, value: null, newValue: 'none', entryText: 'None' },
			{ isEq: null, key: this.coverMode, value: null, newValue: 'front', entryText: 'Front' },
			{ isEq: null, key: this.coverMode, value: null, newValue: 'back', entryText: 'Back' },
			{ isEq: null, key: this.coverMode, value: null, newValue: 'disc', entryText: 'Disc' },
			{ isEq: null, key: this.coverMode, value: null, newValue: 'icon', entryText: 'Icon' },
			{ isEq: null, key: this.coverMode, value: null, newValue: 'artist', entryText: 'Artist' },
			{ isEq: null, key: this.coverMode, value: null, newValue: 'path', entryText: 'File...' },
		].forEach(createMenuOption('coverMode', void (0), subMenu, true, (option) => {
			if (option.newValue === 'path') {
				const input = Input.string('string', this.coverModeOptions.path, 'Enter TF expression or File Path:\n\nFor example:\n$lower([$replace(%ALBUM ARTIST%,\\,)]).jpg', window.Name, '%FILENAME%.jpg');
				if (input === null) { return; }
				this.changeConfig({ config: { coverModeOptions: { path: input } }, callbackArgs: { bSaveProperties: true } });
			}
		}));
		menu.newEntry({ menuName: subMenu, entryText: 'sep' });
		[
			{ isEq: null, key: this.coverModeOptions.bNowPlaying, value: null, newValue: !this.coverModeOptions.bNowPlaying, entryText: 'Follow now playing' }
		].forEach(createMenuOption('coverModeOptions', 'bNowPlaying', subMenu, true));
		menu.getLastEntry().flags = this.coverMode === 'none' ? MF_GRAYED : MF_STRING;
		[
			{ isEq: null, key: this.coverModeOptions.bProportions, value: null, newValue: !this.coverModeOptions.bProportions, entryText: 'Maintain proportions' }
		].forEach(createMenuOption('coverModeOptions', 'bProportions', subMenu, true));
		[
			{ isEq: null, key: this.coverModeOptions.bFill, value: null, newValue: !this.coverModeOptions.bFill, entryText: 'Fill panel' }
		].forEach(createMenuOption('coverModeOptions', 'bFill', subMenu, true));
		menu.newEntry({ menuName: subMenu, entryText: 'sep' });
		[
			{ key: 'blur', entryText: 'Blur...', checks: [(num) => num >= 0 && num < Infinity], inputHint: '\n(0 to ∞)' },
			{ key: 'angle', entryText: 'Angle...', checks: [(num) => num >= 0 && num <= 360], inputHint: '\nClockwise.\n(0 to 360)' },
			{ key: 'alpha', entryText: 'Transparency...', checks: [(num) => num > 0 && num <= 100], inputHint: '\n0 is transparent, 100 is opaque.\n(0 to 100)' },
		].forEach((option) => {
			const prevVal = option.key === 'alpha' ? Math.round(this.coverModeOptions[option.key] * 100 / 255) : this.coverModeOptions[option.key];
			menu.newEntry({
				menuName: subMenu, entryText: option.entryText + '\t[' + prevVal + ']', func: () => {
					const input = Input.number('int positive', prevVal, 'Enter number:' + option.inputHint, window.Name, 100, option.checks);
					if (input === null) { return; }
					const newVal = option.key === 'alpha' ? Math.round(input * 255 / 100) : input;
					this.changeConfig({ config: { coverModeOptions: { [option.key]: newVal } }, callbackArgs: { bSaveProperties: true } });
				}
			});
		});
	}
	{
		const subMenu = menu.newMenu('Color mode...', mainMenuName);
		[
			{ isEq: null, key: this.colorMode, value: null, newValue: 'none', entryText: 'None' },
			{ isEq: null, key: this.colorMode, value: null, newValue: 'single', entryText: 'Single...' + (options.nameColors ? '\t[' + getColorName(this.colorModeOptions.color[0]) + ']' : '') },
			{ isEq: null, key: this.colorMode, value: null, newValue: 'gradient', entryText: 'Gradient...' + (options.nameColors ? '\t[' + this.colorModeOptions.color.map(getColorName).join(', ') + ']' : '') },
			{ isEq: null, key: this.colorMode, value: null, newValue: 'bigradient', entryText: 'Bigradient...' + (options.nameColors ? '\t[' + this.colorModeOptions.color.map(getColorName).join(', ') + ']' : '') },
		].forEach(createMenuOption('colorMode', void (0), subMenu, true, (option) => {
			if (option.newValue !== 'none') {
				let input;
				if (option.newValue === 'single') {
					input = [utils.ColourPicker(0, this.colorModeOptions.color[0]), this.colorModeOptions.color[1]];
				} else {
					input = this.colorModeOptions.color.map((color) => utils.ColourPicker(0, color));
				}
				this.changeConfig({ config: { colorModeOptions: { color: input } }, callbackArgs: { bSaveProperties: true } });
			}
		}));
		menu.newEntry({ menuName: subMenu, entryText: 'sep' });
		[
			{ isEq: null, key: this.colorModeOptions.bDither, value: null, newValue: !this.colorModeOptions.bDither, entryText: 'Apply dither' }
		].forEach(createMenuOption('colorModeOptions', 'bDither', subMenu, true));
		menu.newEntry({ menuName: subMenu, entryText: 'sep' });
		[
			{ key: 'angle', entryText: 'Angle...', checks: [(num) => num > 0 && num < 360], inputHint: '\nClockwise.\n(0 to 360)' },
		].forEach((option) => {
			menu.newEntry({
				menuName: subMenu, entryText: option.entryText + '\t[' + this.colorModeOptions[option.key] + ']', func: () => {
					const input = Input.number('int positive', this.colorModeOptions[option.key], 'Enter number:' + option.inputHint, window.Name, 100, option.checks);
					if (input === null) { return; }
					this.changeConfig({ config: { colorModeOptions: { [option.key]: input } }, callbackArgs: { bSaveProperties: true } });
				}
			});
		});
	}

	return menu;
}