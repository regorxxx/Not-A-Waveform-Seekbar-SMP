'use strict';
//29/07/24

/* exported bindMenu */

/* global MF_GRAYED:readable, _isFile:readable, MF_STRING:readable,seekbarProperties:readable, require:readable, _b:readable, _scale:readable, VK_CONTROL:readable, checkUpdate:readable, globSettings:readable, _isFolder:readable, _explorer:readable, background:readable */

include('..\\..\\helpers\\helpers_xxx_input.js');
/* global Input:readable */
include('..\\window\\window_xxx_background_menu.js');
/* global _menu:readable, _attachedMenu:readable, createBackgroundMenu:readable */
include('..\\..\\helpers-external\\namethatcolor\\ntc.js');
/* global ntc:readable */
const Chroma = require('..\\helpers-external\\chroma.js\\chroma-ultra-light.min'); // Relative to helpers folder

function bindMenu(parent) {
	return _attachedMenu.call(parent, { rMenu: createSeekbarMenu.bind(parent), popup: parent.pop});
}

// Generic menu for config
function createSeekbarMenu(bClear = true) {
	if (!this.menu) {this.menu = new _menu();}
	const menu = this.menu;
	if (bClear) {menu.clear(true);} // Reset on every call
	// helper
	const getColorName = (val) => {
		return (val !== -1 ? (ntc.name(Chroma(val).hex())[1] || '').toString() || 'unknown' : '-none-');
	};
	menu.newEntry({entryText: 'Configure the seekbar:', flags: MF_GRAYED});
	menu.newEntry({entryText: 'sep'});
	{ // NOSONAR [menu block]
		menu.newEntry({entryText: 'Enable seekbar', func: () => {
			this.switch();
			seekbarProperties.bEnabled[1] = this.active;
			this.saveProperties();
		}});
		menu.newCheckMenu(void(0), 'Enable seekbar', void(0), () => this.active);
		menu.newEntry({entryText: 'sep'});
	}
	// Menus
	{
		const subMenu = menu.newMenu('Mode');
		const options = [
			{name: 'FFprobe', key: 'ffprobe'},
			{name: 'Audiowaveform', key: 'audiowaveform'},
			{name: 'Visualizer', key: 'visualizer'}
		];
		options.forEach((o) => {
			const bFound = _isFile(this.binaries[o.key]);
			menu.newEntry({menuName: subMenu, entryText: o.name + (!bFound ? '\t(not found' : ''), func: () => {
				this.updateConfig({analysis: {binaryMode: o.key}});
				this.saveProperties();
			}, flags: bFound ? MF_STRING : MF_GRAYED});
		});
		menu.newCheckMenu(subMenu, options[0].name, options[options.length - 1].name, () => options.findIndex(o => o.key === this.analysis.binaryMode));
	}
	{
		const subMenu = menu.newMenu('Analysis');
		const options = [
			{name: 'RMS levels', key: 'rms_level'},
			{name: 'Peak levels', key: 'peak_level'},
			{name: 'RMS peaks', key: 'rms_peak'}
		];
		options.forEach((o) => {
			menu.newEntry({menuName: subMenu, entryText: o.name + (this.analysis.binaryMode !== 'ffprobe' ? '\t (ffprobe only)' : ''), func: () => {
				this.updateConfig({preset: {analysisMode: o.key}});
				this.saveProperties();
			}, flags: this.analysis.binaryMode === 'ffprobe' ? MF_STRING : MF_GRAYED});
		});
		if (this.analysis.binaryMode === 'ffprobe') {
			menu.newCheckMenu(subMenu, options[0].name, options[options.length - 1].name, () => options.findIndex(o => o.key === this.preset.analysisMode));
		}
		menu.newEntry({menuName: subMenu, entryText: 'sep'});
		{ // NOSONAR [menu block]
			[
				{name: 'Auto-delete analysis files', key: 'bAutoRemove'},
				{name: 'sep'},
				{name: 'Visualizer for incompatible files', key: 'bVisualizerFallback'},
				{name: 'Visualizer during analysis', key: 'bVisualizerFallbackAnalysis'},
			].forEach((o) => {
				if (o.name === 'sep') {menu.newEntry({menuName: subMenu, entryText: o.name}); return;}
				menu.newEntry({menuName: subMenu, entryText: o.name, func: () => {
					this.updateConfig({analysis: {[o.key]: !this.analysis[o.key]}});
					this.saveProperties();
				}, flags: this.analysis.binaryMode !== 'visualizer' ? MF_STRING : MF_GRAYED});
				menu.newCheckMenu(subMenu, o.name, void(0), () => this.analysis[o.key]);
			});
		}
		menu.newEntry({menuName: subMenu, entryText: 'sep'});
		{ // NOSONAR [menu block]
			menu.newEntry({menuName: subMenu, entryText: 'File name format...', func: () => {
				const tf = Input.string('string', this.Tf.Expression || '', 'File name format:\n(TF expression)', window.Name, '$lower([$replace(%ALBUM ARTIST%,\\,)]\\[$replace(%ALBUM%,\\,)][ {$if2($replace(%COMMENT%,\\,),%MUSICBRAINZ_ALBUMID%)}]\\%TRACKNUMBER% - $replace(%TITLE%,\\,))');
				if (tf === null) {return;}
				this.Tf = fb.TitleFormat(tf);
				seekbarProperties.matchPattern[1] = tf;
				this.saveProperties();
			}});
		}
	}
	menu.newEntry({entryText: 'sep'});
	{
		const subMenu = menu.newMenu('Style');
		const options = [
			{name: 'Waveform', key: 'waveform'},
			{name: 'Bars', key: 'bars'},
			{name: 'Points', key: 'points'},
			{name: 'Half-Bars', key: 'halfbars'},
		];
		options.forEach((o) => {
			menu.newEntry({menuName: subMenu, entryText: o.name, func: () => {
				this.updateConfig({preset: {waveMode: o.key}});
				this.saveProperties();
			}});
		});
		menu.newCheckMenu(subMenu, options[0].name, options[options.length - 1].name, () => options.findIndex(o => o.key === this.preset.waveMode));
		if (this.preset.waveMode === 'halfbars') {
			menu.newEntry({menuName: subMenu, entryText: 'sep'});
			menu.newEntry({menuName: subMenu, entryText: 'Show negative values (inverted)', func: () => {
				this.updateConfig({preset: {bHalfBarsShowNeg: !this.preset.bHalfBarsShowNeg}});
				this.saveProperties();
			}});
			menu.newCheckMenu(subMenu, 'Show negative values (inverted)', void(0), () => this.preset.bHalfBarsShowNeg);
		}
	}
	{
		const subMenu = menu.newMenu('Display');
		const options = [
			{name: 'Full', key: 'full'},
			{name: 'Partial', key: 'partial'}
		];
		options.forEach((o) => {
			menu.newEntry({menuName: subMenu, entryText: o.name, func: () => {
				this.updateConfig({preset: {paintMode: o.key}});
				this.saveProperties();
			}});
		});
		menu.newCheckMenu(subMenu, options[0].name, options[options.length - 1].name, () => options.findIndex(o => o.key === this.preset.paintMode));
		menu.newEntry({menuName: subMenu, entryText: 'sep'});
		[
			{name: 'Paint after current' + (this.preset.paintMode === 'full' ? '\t(partial only)' : ''), key: 'bPrePaint',
				flags: this.preset.paintMode === 'full' ? MF_GRAYED : MF_STRING}
		].forEach((o) => {
			menu.newEntry({menuName: subMenu, entryText: o.name, func: () => {
				this.updateConfig({preset: {[o.key]: !this.preset[o.key]}});
				this.saveProperties();
			}, flags: o.flags || MF_STRING});
			menu.newCheckMenu(subMenu, o.name, void(0), () => this.preset[o.key]);
		});
		const subMenuTwo = menu.newMenu('Seconds', subMenu, () => this.preset.paintMode === 'full' || !this.preset.bPrePaint ? MF_GRAYED : MF_STRING);
		[Infinity, 2, 5, 10]
			.forEach((s) => {
				const entryText = (isFinite(s) ? s : 'Full');
				menu.newEntry({menuName: subMenuTwo, entryText , func: () => {
					this.updateConfig({preset: {futureSecs: s}});
					this.saveProperties();
				}, flags: (this.preset.paintMode === 'full' || this.analysis.binaryMode === 'visualizer' || !this.preset.bPrePaint) ? MF_GRAYED : MF_STRING});
				menu.newCheckMenu(subMenuTwo, entryText, void(0), () => (this.preset.futureSecs === s));
			});
		menu.newEntry({menuName: subMenu, entryText: 'sep'});
		[
			{name: 'Show current position', key: 'bPaintCurrent'},
		].forEach((o) => {
			menu.newEntry({menuName: subMenu, entryText: o.name, func: () => {
				this.updateConfig({preset: {[o.key]: !this.preset[o.key]}});
				this.saveProperties();
			}, flags: o.flags || MF_STRING});
			menu.newCheckMenu(subMenu, o.name, void(0), () => this.preset[o.key]);
		});
		menu.newEntry({menuName: subMenu, entryText: 'sep'});
		[
			{name: 'Normalize width', key: 'bNormalizeWidth', flags: this.analysis.binaryMode === 'visualizer' ? MF_GRAYED : MF_STRING}
		].forEach((o) => {
			menu.newEntry({menuName: subMenu, entryText: o.name, func: () => {
				this.updateConfig({ui: {[o.key]: !this.ui[o.key]}});
				this.saveProperties();
			}, flags: o.flags || MF_STRING});
			menu.newCheckMenu(subMenu, o.name, void(0), () => this.ui[o.key]);
		});
		const subMenuThree = menu.newMenu('Width', subMenu, () => this.ui.bNormalizeWidth ? MF_STRING : MF_GRAYED);
		[20, 10, 8, 6, 4, 2, 1]
			.forEach((s) => {
				menu.newEntry({menuName: subMenuThree, entryText: s , func: () => {
					this.updateConfig({ui: {normalizeWidth: _scale(s)}});
					this.saveProperties();
				}, flags: (this.analysis.binaryMode === 'visualizer' || !this.ui.bNormalizeWidth) ? MF_GRAYED : MF_STRING});
				menu.newCheckMenu(subMenuThree, s, void(0), () => (this.ui.normalizeWidth === _scale(s)));
			});
	}
	{
		const subMenu = menu.newMenu('Animation', void(0), (this.preset.paintMode === 'partial' && this.preset.bPrePaint) || this.analysis.binaryMode === 'visualizer' ? MF_STRING : MF_GRAYED);
		[
			{name: 'Enable animation', key: 'bAnimate', flags: this.analysis.binaryMode === 'visualizer' ? MF_GRAYED : MF_STRING},
			{name: 'Animate with BPM' + (this.preset.paintMode === 'full' && this.analysis.binaryMode !== 'visualizer' ? '\t(partial only)' : ''), key: 'bUseBPM',
				flags: (this.preset.paintMode === 'partial' && this.preset.bPrePaint && this.preset.bAnimate) || this.analysis.binaryMode === 'visualizer' ? MF_STRING : MF_GRAYED},
		].forEach((o) => {
			menu.newEntry({menuName: subMenu, entryText: o.name, func: () => {
				this.updateConfig({preset: {[o.key]: !this.preset[o.key]}});
				this.saveProperties();
			}, flags: o.flags || MF_STRING});
			menu.newCheckMenu(subMenu, o.name, void(0), () => {return this.preset[o.key] || o.key === 'bAnimate' && this.analysis.binaryMode === 'visualizer';});
		});
		menu.newEntry({menuName: subMenu, entryText: 'sep'});
		const subMenuTwo = menu.newMenu('Refresh rate' + (this.preset.paintMode === 'full' && this.analysis.binaryMode !== 'visualizer' ? '\t(partial only)' : ''), subMenu, () => (this.preset.paintMode === 'partial' && this.preset.bPrePaint && this.preset.bAnimate) || this.analysis.binaryMode === 'visualizer' ? MF_STRING : MF_GRAYED);
		[1000, 500, 200, 100, 80, 60, 30]
			.forEach((s) => {
				const entryText = s + ' ms';
				menu.newEntry({menuName: subMenuTwo, entryText, func: () => {
					this.updateConfig({ui: {refreshRate: s}});
					this.saveProperties();
				}});
				menu.newCheckMenuLast(() => this.ui.refreshRate === s);
			});
		menu.newEntry({menuName: subMenuTwo, entryText: 'sep'});
		[
			{name: 'Variable refresh rate', key: 'bVariableRefreshRate'},
		].forEach((o) => {
			menu.newEntry({menuName: subMenuTwo, entryText: o.name, func: () => {
				this.updateConfig({ui: {[o.key]: !this.ui[o.key]}});
				this.saveProperties();
			}, flags: o.flags || MF_STRING});
			menu.newCheckMenu(subMenuTwo, o.name, void(0), () => this.ui[o.key]);
		});
	}
	menu.newEntry({entryText: 'sep'});
	{ // NOSONAR [menu block]
		createBackgroundMenu.call(
			background,
			{ menuName: menu.newMenu('Background') },
			menu,
			{ nameColors: true }
		);
	}
	{
		const subMenu = menu.newMenu('Colors');
		{
			const subMenuTwo = menu.newMenu('Background', subMenu);
			menu.newEntry({menuName: subMenuTwo, entryText: 'Set waveform backgr.:', flags: MF_GRAYED});
			menu.newEntry({menuName: subMenuTwo, entryText: 'sep'});
			[
				{name: 'White',		bPrepaint: false,	colors: {bg: 0xFFFFFFFF, bgFuture: 0xFFF8F7FF}},
				{name: 'Black',		bPrepaint: false,	colors: {bg: 0xFF000000, bgFuture: 0xFF1B1B1B}},
				{name: 'Sienna',	bPrepaint: false,	colors: {bg: 0xFF450920, bgFuture: 0xFF74121D}},
				{name: 'Blue',		bPrepaint: false,	colors: {bg: 0xFFB9D6F2, bgFuture: 0xFFBBDEFB}},
				{name: 'sep'},
				{name: 'None',		bPrepaint: false,	colors: {bg: -1, bgFuture: -1}},
			].forEach((o) => {
				if (o.name === 'sep' || !Object.hasOwn(o, 'colors')) {
					menu.newEntry({menuName: subMenuTwo, entryText: o.name, flags: MF_GRAYED});
				} else {
					menu.newEntry({menuName: subMenuTwo, entryText: o.name, func: () => {
						this.updateConfig({ui: {colors: o.colors}});
						this.saveProperties();
					}});
					menu.newCheckMenuLast(() => Object.keys(o.colors).every((key) => this.ui.colors[key] === o.colors[key]));
				}
			});
			menu.newEntry({menuName: subMenuTwo, entryText: 'sep'});
			{
				const subMenuCustom = menu.newMenu('Custom', subMenuTwo);
				[
					{name: 'Ctrl + Click to set none:'},
					{name: 'sep'},
					{name: 'Full panel',		bPartial: false,	key: 'bg'},
					{name: 'After current pos.',bPartial: true,	key: 'bgFuture'},
				].forEach((o) => {
					if (o.name === 'sep' || !Object.hasOwn(o, 'key')) {
						menu.newEntry({menuName: subMenuCustom, entryText: o.name, flags: MF_GRAYED});
					} else {
						const bEnabled = (!o.bPrepaint || this.preset.paintMode === 'partial' && this.preset.bPrePaint) && (!o.bPartial || this.preset.paintMode === 'partial');
						menu.newEntry({menuName: subMenuCustom, entryText: o.name + '\t' + _b(getColorName(this.ui.colors[o.key])), func: () => {
							this.updateConfig({ui: {colors: {
								[o.key]: utils.IsKeyPressed(VK_CONTROL) ? -1 : utils.ColourPicker(window.ID, this.ui.colors[o.key]),
							}}});
							this.saveProperties();
						}, flags: bEnabled ? MF_STRING : MF_GRAYED});
					}
				});
			}
		}
		{
			const subMenuTwo = menu.newMenu('Waveform', subMenu);
			menu.newEntry({menuName: subMenuTwo, entryText: 'Set waveform colors:', flags: MF_GRAYED});
			menu.newEntry({menuName: subMenuTwo, entryText: 'sep'});
			[
				{name: 'Green',		colors: {main: 0xFF90EE90, alt: 0xFF7CFC00, mainFuture: 0xFFB7FFA2, altFuture: 0xFFF9FF99, currPos: 0xFFFFFFFF}},
				{name: 'Lavender',	colors: {main: 0xFFCDB4DB, alt: 0xFFFFC8DD, mainFuture: 0xFFBDE0FE, altFuture: 0xFFA2D2FF, currPos: 0xFFFFAFCC}},
				{name: 'Forest',	colors: {main: 0xFF606C38, alt: 0xFFDDA15E, mainFuture: 0xFF283618, altFuture: 0xFFBC6C25, currPos: 0xFF606C38}},
				{name: 'Sienna',	colors: {main: 0xFFBF0603, alt: 0xFFEE6055, mainFuture: 0xFF8D0801, altFuture: 0xFFC52233, currPos: 0xFF450920}},
				{name: 'Blue',		colors: {main: 0xFF003559, alt: 0xFF006DAA, mainFuture: 0xFF0353A4, altFuture: 0xFF061A40, currPos: 0xFFB9D6F2}},
				{name: 'sep'},
				{name: 'None',		colors: {main: -1, alt: -1, mainFuture: -1, altFuture: -1}},
			].forEach((o) => {
				if (o.name === 'sep' || !Object.hasOwn(o, 'colors')) {
					menu.newEntry({menuName: subMenuTwo, entryText: o.name, flags: MF_GRAYED});
				} else {
					menu.newEntry({menuName: subMenuTwo, entryText: o.name, func: () => {
						this.updateConfig({ui: {colors: o.colors}});
						this.saveProperties();
					}});
					menu.newCheckMenuLast(() => Object.keys(o.colors).every((key) => this.ui.colors[key] === o.colors[key]));
				}
			});
			menu.newEntry({menuName: subMenuTwo, entryText: 'sep'});
			{
				const subMenuCustom = menu.newMenu('Custom', subMenuTwo);
				[
					{name: 'Ctrl + Click to set none:'},
					{name: 'sep'},
					{name: 'Exterior',					bPrepaint: false,	key: 'main'},
					{name: 'Interior',					bPrepaint: false,	key: 'alt'},
					{name: 'Exterior (after current)',	bPrepaint: true,	key: 'mainFuture'},
					{name: 'Interior (after current)',	bPrepaint: true,	key: 'altFuture'},
				].forEach((o) => {
					if (o.name === 'sep' || !Object.hasOwn(o, 'key')) {
						menu.newEntry({menuName: subMenuCustom, entryText: o.name, flags: MF_GRAYED});
					} else {
						const bEnabled = (!o.bPrepaint || this.preset.paintMode === 'partial' && this.preset.bPrePaint) && (!o.bPartial || this.preset.paintMode === 'partial');
						menu.newEntry({menuName: subMenuCustom, entryText: o.name + '\t' + _b(getColorName(this.ui.colors[o.key])), func: () => {
							this.updateConfig({ui: {colors: {
								[o.key]: utils.IsKeyPressed(VK_CONTROL) ? -1 : utils.ColourPicker(window.ID, this.ui.colors[o.key]),
							}}});
							this.saveProperties();
						}, flags: bEnabled ? MF_STRING : MF_GRAYED});
					}
				});
			}
		}
		{
			const subMenuTwo = menu.newMenu('Current position', subMenu);
			menu.newEntry({menuName: subMenuTwo, entryText: 'Set indicator colors:', flags: MF_GRAYED});
			menu.newEntry({menuName: subMenuTwo, entryText: 'sep'});
			[
				{name: 'Green',		colors: {currPos: 0xFF90EE90}},
				{name: 'Pink',		colors: {currPos: 0xFFFFAFCC}},
				{name: 'Forest',	colors: {currPos: 0xFF606C38}},
				{name: 'Purple',	colors: {currPos: 0xFF450920}},
				{name: 'Sienna',	colors: {currPos: 0xFFBF0603}},
				{name: 'Dark Blue',	colors: {currPos: 0xFF003559}},
				{name: 'Blue',		colors: {currPos: 0xFFB9D6F2}},
				{name: 'White',		colors: {currPos: 0xFFFFFFFF}},
				{name: 'Black',		colors: {currPos: 0x00000000}},
				{name: 'sep'},
				{name: 'None',		colors: {currPos: -1}},
			].forEach((o) => {
				if (o.name === 'sep' || !Object.hasOwn(o, 'colors')) {
					menu.newEntry({menuName: subMenuTwo, entryText: o.name, flags: MF_GRAYED});
				} else {
					menu.newEntry({menuName: subMenuTwo, entryText: o.name, func: () => {
						this.updateConfig({ui: {colors: o.colors}});
						this.saveProperties();
					}});
					menu.newCheckMenuLast(() => Object.keys(o.colors).every((key) => this.ui.colors[key] === o.colors[key]));
				}
			});
			menu.newEntry({menuName: subMenuTwo, entryText: 'sep'});
			menu.newEntry({menuName: subMenuTwo, entryText: 'Custom\t' + _b(getColorName(this.ui.colors.currPos)), func: () => {
				this.updateConfig({ui: {colors: {
					currPos: utils.ColourPicker(window.ID, this.ui.colors.currPos),
				}}});
				this.saveProperties();
			}});
		}
		menu.newEntry({menuName: subMenu, entryText: 'sep'});
		{
			const subMenuTwo = menu.newMenu('Transparency', subMenu);
			menu.newEntry({menuName: subMenuTwo, entryText: 'Ctrl + Click to reset:', flags: MF_GRAYED});
			menu.newEntry({menuName: subMenuTwo, entryText: 'sep'});
			[
				{name: 'Wav, exterior',					bPrepaint: false,	key: 'main'},
				{name: 'Wav. Interior',					bPrepaint: false,	key: 'alt'},
				{name: 'Wav. Ext. (after current)',		bPrepaint: true,	key: 'mainFuture'},
				{name: 'Wav. Int. (after current)',		bPrepaint: true,	key: 'altFuture'},
				{name: 'Bg. full panel',				bPrepaint: false,	key: 'bg'},
				{name: 'Bg. (after current).',			bPartial: true,		key: 'bgFuture'},
			].forEach((o) => {
				if (o.name === 'sep' || !Object.hasOwn(o, 'key')) {
					menu.newEntry({menuName: subMenuTwo, entryText: o.name, flags: MF_GRAYED});
				} else {
					const bEnabled = (!o.bPrepaint || this.preset.paintMode === 'partial' && this.preset.bPrePaint) && (!o.bPartial || this.preset.paintMode === 'partial');
					menu.newEntry({menuName: subMenuTwo, entryText: o.name + '\t' + _b(this.ui.transparency[o.key]), func: () => {
						const input = utils.IsKeyPressed(VK_CONTROL)
							? 100
							: Input.number('int', this.ui.transparency[o.key], 'Enter value:\n0 is transparent, 100 is opaque.\n(0 to 100)', window.Name, 200, [(n) => n >= 0 && n <= 100]);
						if (input === null) {return;}
						this.updateConfig({ui: {transparency: {
							[o.key]: input,
						}}});
						this.saveProperties();
					}, flags: bEnabled ? MF_STRING : MF_GRAYED});
				}
			});
		}
	}
	menu.newEntry({entryText: 'sep'});
	{
		const subMenu = menu.newMenu('Other settings');
		menu.newEntry({menuName: subMenu, entryText: 'Refresh rate...' + '\t' + _b(this.ui.refreshRateOpt), func: () => {
			const input = Input.number('int', this.ui.refreshRate, 'Enter value:\n(ms)', window.Name, 200, [(n) => n >= 50]);
			if (input === null) {return;}
			this.updateConfig({ui: {refreshRate: input}});
			this.saveProperties();
		}, flags: this.ui.bVariableRefreshRate ? MF_GRAYED : MF_STRING});
		menu.newEntry({menuName: subMenu, entryText: 'Variable refresh rate', func: () => {
			this.updateConfig({ui: {bVariableRefreshRate: !this.ui.bVariableRefreshRate}});
			this.saveProperties();
		}});
		menu.newCheckMenuLast(() => this.ui.bVariableRefreshRate);
		menu.newEntry({menuName: subMenu, entryText: 'sep'});
		menu.newEntry({menuName: subMenu, entryText: 'Automatically check for updates', func: () => {
			seekbarProperties.bAutoUpdateCheck[1] = !seekbarProperties.bAutoUpdateCheck[1];
			this.saveProperties();
			if (seekbarProperties.bAutoUpdateCheck[1]) {
				if (typeof checkUpdate === 'undefined') {include('helpers\\helpers_xxx_web_update.js');}
				setTimeout(checkUpdate, 1000, {bDownload: globSettings.bAutoUpdateDownload, bOpenWeb: globSettings.bAutoUpdateOpenWeb, bDisableWarning: false});
			}
		}});
		menu.newCheckMenuLast(() => seekbarProperties.bAutoUpdateCheck[1]);
	}
	menu.newEntry({entryText: 'sep'});
	menu.newEntry({entryText: 'Check for updates...',  func: () => {
		if (typeof checkUpdate === 'undefined') {include('helpers\\helpers_xxx_web_update.js');}
		checkUpdate({bDownload: globSettings.bAutoUpdateDownload, bOpenWeb: globSettings.bAutoUpdateOpenWeb, bDisableWarning: false})
			.then((bFound) => !bFound && fb.ShowPopupMessage('No updates found.', window.Name));
	}});
	menu.newEntry({entryText: 'sep'});
	menu.newEntry({entryText: 'Open data file', func: () => {
		if (fb.IsPlaying) {
			const {seekbarFolder} = this.getPaths(fb.GetNowPlaying());
			if (_isFolder(seekbarFolder)) {_explorer(seekbarFolder);}
		}
	}, flags: fb.IsPlaying && this.active ? MF_STRING : MF_GRAYED});
	return menu;
}