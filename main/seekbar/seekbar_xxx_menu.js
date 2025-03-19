'use strict';
//19/03/25

/* exported createSeekbarMenu */

/* global MF_GRAYED:readable, _isFile:readable, MF_STRING:readable,seekbarProperties:readable, require:readable, _b:readable, _scale:readable, VK_CONTROL:readable, checkUpdate:readable, globSettings:readable, _isFolder:readable, _explorer:readable, background:readable, folders:readable */

include('..\\..\\helpers\\helpers_xxx_file.js');
/* global _open:readable, utf8:readable */
include('..\\..\\helpers\\helpers_xxx_input.js');
/* global Input:readable */
include('..\\window\\window_xxx_background_menu.js');
/* global _menu:readable, createBackgroundMenu:readable */
include('..\\..\\helpers-external\\namethatcolor\\ntc.js');
/* global ntc:readable */
const Chroma = require('..\\helpers-external\\chroma.js\\chroma.min'); // Relative to helpers folder

// Generic menu for config
function createSeekbarMenu(bClear = true) {
	if (!this.menu) { this.menu = new _menu(); }
	const menu = this.menu;
	if (bClear) { menu.clear(true); } // Reset on every call
	// helper
	const getColorName = (val) => val !== -1 && val !== null && typeof val !== 'undefined'
		? (ntc.name(Chroma(val).hex())[1] || '').toString() || 'unknown'
		: '-none-';
	menu.newEntry({ entryText: 'Configure the seekbar:', flags: MF_GRAYED });
	menu.newSeparator();
	{ // NOSONAR [menu block]
		menu.newEntry({
			entryText: 'Enable seekbar', func: () => {
				this.switch();
				seekbarProperties.bEnabled[1] = this.active;
				this.saveProperties();
			}
		});
		menu.newCheckMenuLast(() => this.active);
		menu.newSeparator();
	}
	// Menus
	{
		const subMenu = menu.newMenu('Mode');
		const options = [
			{ name: 'FFprobe', key: 'ffprobe' },
			{ name: 'Audiowaveform', key: 'audiowaveform' },
			{ name: 'Visualizer', key: 'visualizer' }
		].filter((o) => this.binaries[o.key] || o.key === 'visualizer');
		if (options.length) {
			options.forEach((o) => {
				const bFound = !this.binaries[o.key] || _isFile(this.binaries[o.key]);
				menu.newEntry({
					menuName: subMenu, entryText: o.name + (!bFound ? '\t(not found)' : ''), func: () => {
						this.updateConfig({ analysis: { binaryMode: o.key } });
						this.saveProperties();
					}, flags: bFound ? MF_STRING : MF_GRAYED
				});
			});
			menu.newCheckMenuLast(() => options.findIndex(o => o.key === this.analysis.binaryMode), options);
		}
		if (this.analysis.binaryMode !== 'visualizer') {
			menu.newSeparator(subMenu);
			menu.newEntry({
				menuName: subMenu, entryText: 'Show compatible extensions', func: () => {
					fb.ShowPopupMessage(this.reportCompatibleFileExtension().join(', '), window.Name + ': ' + this.analysis.binaryMode);
				}
			});
			if (!this.isCompatibleFileExtension(fb.GetNowPlaying() || fb.GetFocusItem())) {
				menu.addTipLast('(incompatible file)');
			}
		}
	}
	{
		const subMenu = menu.newMenu('Analysis');
		const options = [
			{ name: 'RMS levels', key: 'rms_level' },
			{ name: 'Peak levels', key: 'peak_level' },
			{ name: 'RMS peaks', key: 'rms_peak' }
		];
		options.forEach((o) => {
			menu.newEntry({
				menuName: subMenu, entryText: o.name + (this.analysis.binaryMode !== 'ffprobe' ? '\t (ffprobe only)' : ''), func: () => {
					this.updateConfig({ preset: { analysisMode: o.key } });
					this.saveProperties();
				}, flags: this.analysis.binaryMode === 'ffprobe' ? MF_STRING : MF_GRAYED
			});
		});
		if (this.analysis.binaryMode === 'ffprobe') {
			menu.newCheckMenuLast(() => options.findIndex(o => o.key === this.preset.analysisMode), options);
		}
		menu.newSeparator(subMenu);
		{
			const subMenuTwo = menu.newMenu('Data files storage', subMenu, this.analysis.binaryMode === 'visualizer' ? MF_GRAYED : MF_STRING);
			const options = [
				{ name: 'Store all', key: 'all' },
				{ name: 'Only tracks in library', key: 'library' },
				{ name: 'Store nothing', key: 'none' }
			];
			options.forEach((o) => {
				menu.newEntry({
					menuName: subMenuTwo, entryText: o.name, func: () => {
						this.updateConfig({ analysis: { storeMode: o.key } });
						if (o.key === 'none') { fb.ShowPopupMessage('In this mode new data files are never saved. Everytime a track is shown, it will be (re)analyzed, no matter if it was analyzed before too -even during the same session-.\n\nNote already created data files will not be deleted. If that\'s desired, use \'Auto-delete analysis files\' setting.\n\nIf wou want data files to be cleaned when closing foobar2000 but available to be reused during the same session, then check the auto-delete option and any of the other storage modes.', 'Not-A-Waveform-seekbar-SMP'); }
						this.saveProperties();
					}, flags: this.analysis.binaryMode !== 'visualizer' ? MF_STRING : MF_GRAYED
				});
			});
			menu.newCheckMenuLast(() => options.findIndex(o => o.key === this.analysis.storeMode), options);
			menu.newSeparator(subMenuTwo);
			menu.newEntry({
				menuName: subMenuTwo, entryText: 'Auto-delete analysis files', func: () => {
					this.updateConfig({ analysis: { bAutoRemove: !this.analysis.bAutoRemove } });
					this.saveProperties();
				}, flags: this.analysis.binaryMode !== 'visualizer' ? MF_STRING : MF_GRAYED
			});
			menu.newCheckMenuLast(() => this.analysis.bAutoRemove);
			menu.newSeparator(subMenuTwo);
			menu.newEntry({
				menuName: subMenuTwo, entryText: 'File match pattern...', func: () => {
					let tf = Input.string('string', this.Tf.Expression || '', 'File name format for data files:\n(TF expression)\n\nUsed for track identification, default string uses same data for all encodes of a track. Leave it empty to restore default.', window.Name, '$lower([$replace(%ALBUM ARTIST%,\\,)]\\[$replace(%ALBUM%,\\,)][ {$if2($replace(%COMMENT%,\\,),%MUSICBRAINZ_ALBUMID%)}]\\%TRACKNUMBER% - $replace(%TITLE%,\\,))');
					if (tf === null) { return; }
					if (!tf.length) { tf = seekbarProperties.matchPattern[1]; }
					this.Tf = fb.TitleFormat(tf);
					seekbarProperties.matchPattern[1] = tf;
					this.saveProperties();
				}
			});
		}
		menu.newSeparator(subMenu);
		{ // NOSONAR [menu block]
			[
				{ name: 'Visualizer for incompatible files', key: 'bVisualizerFallback' },
				{ name: 'Visualizer during analysis', key: 'bVisualizerFallbackAnalysis' },
			].forEach((o) => {
				if (menu.isSeparator(o)) { menu.newEntry({ menuName: subMenu, entryText: o.name }); return; }
				menu.newEntry({
					menuName: subMenu, entryText: o.name, func: () => {
						this.updateConfig({ analysis: { [o.key]: !this.analysis[o.key] } });
						this.saveProperties();
					}, flags: this.analysis.binaryMode !== 'visualizer' ? MF_STRING : MF_GRAYED
				});
				menu.newCheckMenuLast(() => this.analysis[o.key]);
			});
		}
		menu.newSeparator(subMenu);
		{ // NOSONAR [menu block]
			[
				{ name: 'Multi-channel mode', key: 'bMultiChannel' }
			].forEach((o) => {
				if (menu.isSeparator(o)) { menu.newEntry({ menuName: subMenu, entryText: o.name }); return; }
				menu.newEntry({
					menuName: subMenu, entryText: o.name, func: () => {
						this.updateConfig({ analysis: { [o.key]: !this.analysis[o.key] } });
						this.saveProperties();
					}
				});
				menu.newCheckMenuLast(() => this.analysis[o.key]);
			});
		}
	}
	menu.newSeparator();
	{
		const subMenu = menu.newMenu('Style');
		const options = [
			{ name: 'Waveform', key: 'waveform' },
			{ name: 'Bars', key: 'bars' },
			{ name: 'Points', key: 'points' },
			{ name: 'Half-Bars', key: 'halfbars' },
			{ name: 'VU Meter', key: 'vumeter' },
		];
		options.forEach((o) => {
			menu.newEntry({
				menuName: subMenu, entryText: o.name, func: () => {
					this.updateConfig({ preset: { waveMode: o.key } });
					this.saveProperties();
				}
			});
		});
		menu.newCheckMenuLast(() => options.findIndex(o => o.key === this.preset.waveMode), options);
		if (this.preset.waveMode === 'halfbars') {
			menu.newSeparator(subMenu);
			menu.newEntry({
				menuName: subMenu, entryText: 'Show negative values (inverted)', func: () => {
					this.updateConfig({ preset: { bHalfBarsShowNeg: !this.preset.bHalfBarsShowNeg } });
					this.saveProperties();
				}
			});
			menu.newCheckMenuLast(() => this.preset.bHalfBarsShowNeg);
		}
	}
	{
		const subMenu = menu.newMenu('Display');
		const options = [
			{ name: 'Full', key: 'full' },
			{ name: 'Partial', key: 'partial' }
		];
		options.forEach((o) => {
			menu.newEntry({
				menuName: subMenu, entryText: o.name, func: () => {
					this.updateConfig({ preset: { paintMode: o.key } });
					this.saveProperties();
				}, flags: this.preset.waveMode === 'vumeter' ? MF_GRAYED : MF_STRING
			});
			if (this.preset.waveMode === 'vumeter') { menu.addTipLast('(not VU Meter)'); }
		});
		menu.newCheckMenuLast(() => options.findIndex(o => o.key === this.preset.paintMode), options);
		menu.newSeparator(subMenu);
		[
			{
				name: 'Paint unplayed' + (this.preset.paintMode === 'full' ? '\t(partial only)' : ''), key: 'bPrePaint',
				flags: this.preset.paintMode === 'full' ? MF_GRAYED : MF_STRING
			}
		].forEach((o) => {
			menu.newEntry({
				menuName: subMenu, entryText: o.name, func: () => {
					this.updateConfig({ preset: { [o.key]: !this.preset[o.key] } });
					this.saveProperties();
				}, flags: o.flags || MF_STRING
			});
			menu.newCheckMenuLast(() => this.preset[o.key]);
		});
		if (menu.getLastEntry().flags !== MF_GRAYED) {
			const subMenuTwo = menu.newMenu('Seconds', subMenu, () => this.preset.paintMode === 'full' || !this.preset.bPrePaint ? MF_GRAYED : MF_STRING);
			[Infinity, 2, 5, 10]
				.forEach((s) => {
					const entryText = (isFinite(s) ? s : 'Full');
					menu.newEntry({
						menuName: subMenuTwo, entryText, func: () => {
							this.updateConfig({ preset: { futureSecs: s } });
							this.saveProperties();
						}, flags: (this.preset.paintMode === 'full' || this.analysis.binaryMode === 'visualizer' || !this.preset.bPrePaint) ? MF_GRAYED : MF_STRING
					});
					menu.newCheckMenuLast(() => (this.preset.futureSecs === s));
				});
		}
		menu.newSeparator(subMenu);
		[
			{ name: 'Show current position', key: 'bPaintCurrent' },
		].forEach((o) => {
			menu.newEntry({
				menuName: subMenu, entryText: o.name, func: () => {
					this.updateConfig({ preset: { [o.key]: !this.preset[o.key] } });
					this.saveProperties();
				}, flags: o.flags || MF_STRING
			});
			menu.newCheckMenuLast(() => this.preset[o.key]);
		});
		menu.newSeparator(subMenu);
		[
			{ name: 'Normalize width', key: 'bNormalizeWidth', flags: this.analysis.binaryMode === 'visualizer' || this.preset.waveMode === 'vumeter' ? MF_GRAYED : MF_STRING ? MF_GRAYED : MF_STRING }
		].forEach((o) => {
			menu.newEntry({
				menuName: subMenu, entryText: o.name, func: () => {
					this.updateConfig({ ui: { [o.key]: !this.ui[o.key] } });
					this.saveProperties();
				}, flags: o.flags || MF_STRING
			});
			if (this.preset.waveMode === 'vumeter') { menu.addTipLast('(not VU Meter)'); }
			menu.newCheckMenuLast(() => this.ui[o.key]);
		});
		if (menu.getLastEntry().flags !== MF_GRAYED) {
			const subMenuThree = menu.newMenu('Width', subMenu, () => this.ui.bNormalizeWidth ? MF_STRING : MF_GRAYED);
			[20, 10, 8, 6, 4, 2, 1]
				.forEach((s) => {
					menu.newEntry({
						menuName: subMenuThree, entryText: s, func: () => {
							this.updateConfig({ ui: { normalizeWidth: _scale(s) } });
							this.saveProperties();
						}, flags: (this.analysis.binaryMode === 'visualizer' || !this.ui.bNormalizeWidth) ? MF_GRAYED : MF_STRING
					});
					menu.newCheckMenuLast(() => (this.ui.normalizeWidth === _scale(s)));
				});
		}
		if (this.preset.waveMode === 'vumeter') {
			menu.newEntry({
				menuName: subMenu, entryText: 'Logarithmic scale (dB)', func: () => {
					this.updateConfig({ ui: { bLogScale: !this.ui.bLogScale } });
					this.saveProperties();
				}
			});
			menu.newCheckMenuLast(() => this.ui.bLogScale);
		}
		menu.newSeparator(subMenu);
		const subMenuFour = menu.newMenu('Channels display' + (this.analysis.bMultiChannel ? '' : '\t(multi-channel only)'), subMenu, () => this.analysis.bMultiChannel ? MF_STRING : MF_GRAYED);
		menu.newEntry({
			menuName: subMenuFour, entryText: 'All', func: () => {
				this.updateConfig({ preset: { displayChannels: [] } });
				this.saveProperties();
			}, flags: !this.analysis.bMultiChannel ? MF_GRAYED : MF_STRING
		});
		menu.newCheckMenuLast(() => this.preset.displayChannels.length === 0);
		menu.newSeparator(subMenuFour);
		[
			{ key: '[0] FL', val: new Set([0]) },
			{ key: '[1] FR', val: new Set([1]) },
			{ key: '[2] FC', val: new Set([2]) },
			{ key: '[3] LFE', val: new Set([3]) },
			{ key: '[4] BL', val: new Set([4]) },
			{ key: '[5] BR', val: new Set([5]) }
		]
			.forEach((opt) => {
				const oldVal = new Set(this.preset.displayChannels);
				menu.newEntry({
					menuName: subMenuFour, entryText: opt.key, func: () => {
						const displayChannels = opt.val.size
							? oldVal.isSuperset(opt.val)
								? [...oldVal.difference(opt.val)]
								: [...oldVal.union(opt.val)]
							: [];
						this.updateConfig({ preset: { displayChannels } });
						this.saveProperties();
					}, flags: !this.analysis.bMultiChannel ? MF_GRAYED : MF_STRING
				});
				menu.newCheckMenuLast(() => oldVal.isSuperset(opt.val));
			});
		menu.newSeparator(subMenuFour);
		menu.newEntry({
			menuName: subMenuFour, entryText: 'Downmix to mono', func: () => {
				this.updateConfig({ preset: { bDownMixToMono: !this.preset.bDownMixToMono } });
				this.saveProperties();
			}, flags: !this.analysis.bMultiChannel ? MF_GRAYED : MF_STRING
		});
		menu.newCheckMenuLast(() => this.preset.bDownMixToMono);
	}
	{
		const subMenu = menu.newMenu('Animation' + (this.preset.waveMode === 'vumeter' ? '\t(not VU Meter)' : ''), void (0), ((this.preset.paintMode === 'partial' && this.preset.bPrePaint) || this.analysis.binaryMode === 'visualizer') && this.preset.waveMode !== 'vumeter' ? MF_STRING : MF_GRAYED);
		[
			{ name: 'Enable animation', key: 'bAnimate', flags: this.analysis.binaryMode === 'visualizer' ? MF_GRAYED : MF_STRING },
			{
				name: 'Animate with BPM' + (this.preset.paintMode === 'full' && this.analysis.binaryMode !== 'visualizer' ? '\t(partial only)' : ''), key: 'bUseBPM',
				flags: (this.preset.paintMode === 'partial' && this.preset.bPrePaint && this.preset.bAnimate) || this.analysis.binaryMode === 'visualizer' ? MF_STRING : MF_GRAYED
			},
		].forEach((o) => {
			menu.newEntry({
				menuName: subMenu, entryText: o.name, func: () => {
					this.updateConfig({ preset: { [o.key]: !this.preset[o.key] } });
					this.saveProperties();
				}, flags: o.flags || MF_STRING
			});
			menu.newCheckMenuLast(() => { return this.preset[o.key] || o.key === 'bAnimate' && this.analysis.binaryMode === 'visualizer'; });
		});
		menu.newSeparator(subMenu);
		const subMenuTwo = menu.newMenu('Refresh rate' + (this.preset.paintMode === 'full' && this.analysis.binaryMode !== 'visualizer' ? '\t(partial only)' : ''), subMenu, () => (this.preset.paintMode === 'partial' && this.preset.bPrePaint && this.preset.bAnimate) || this.analysis.binaryMode === 'visualizer' ? MF_STRING : MF_GRAYED);
		[1000, 500, 200, 100, 80, 60, 30]
			.forEach((s) => {
				const entryText = s + ' ms';
				menu.newEntry({
					menuName: subMenuTwo, entryText, func: () => {
						this.updateConfig({ ui: { refreshRate: s } });
						this.saveProperties();
					}
				});
				menu.newCheckMenuLast(() => this.ui.refreshRate === s);
			});
		menu.newSeparator(subMenuTwo);
		[
			{ name: 'Variable refresh rate', key: 'bVariableRefreshRate' },
		].forEach((o) => {
			menu.newEntry({
				menuName: subMenuTwo, entryText: o.name, func: () => {
					this.updateConfig({ ui: { [o.key]: !this.ui[o.key] } });
					this.saveProperties();
				}, flags: o.flags || MF_STRING
			});
			menu.newCheckMenuLast(() => this.ui[o.key]);
		});
	}
	menu.newSeparator();
	{
		const subMenu = menu.newMenu('Colors');
		{
			const subMenuTwo = menu.newMenu('Background', subMenu);
			menu.newEntry({ menuName: subMenuTwo, entryText: 'Set waveform backgr.:', flags: MF_GRAYED });
			menu.newSeparator(subMenuTwo);
			[
				{ name: 'White', bPrepaint: false, colors: { bg: 0xFFFFFFFF, bgFuture: 0xFFF8F7FF } },
				{ name: 'Black', bPrepaint: false, colors: { bg: 0xFF000000, bgFuture: 0xFF1B1B1B } },
				{ name: 'Sienna', bPrepaint: false, colors: { bg: 0xFF450920, bgFuture: 0xFF74121D } },
				{ name: 'Blue', bPrepaint: false, colors: { bg: 0xFFB9D6F2, bgFuture: 0xFFBBDEFB } },
				{ name: 'sep' },
				{ name: 'None', bPrepaint: false, colors: { bg: -1, bgFuture: -1 } },
			].forEach((o) => {
				if (menu.isSeparator(o)) {
					menu.newEntry({ menuName: subMenuTwo, entryText: o.name, flags: MF_GRAYED });
				} else {
					menu.newEntry({
						menuName: subMenuTwo, entryText: o.name, func: () => {
							this.updateConfig({ ui: { colors: o.colors } });
							this.saveProperties();
						}
					});
					menu.newCheckMenuLast(() => Object.keys(o.colors).every((key) => this.ui.colors[key] === o.colors[key]));
				}
			});
			menu.newSeparator(subMenuTwo);
			{
				const subMenuCustom = menu.newMenu('Custom', subMenuTwo);
				menu.newEntry({ menuName: subMenuCustom, entryText: 'Ctrl + Click to set none:', flags: MF_GRAYED });
				menu.newSeparator(subMenuCustom);
				[
					{ name: 'Full panel', bPartial: false, key: 'bg' },
					{ name: 'Unplayed', bPartial: true, key: 'bgFuture' },
				].forEach((o) => {
					if (menu.isSeparator(o)) {
						menu.newEntry({ menuName: subMenuCustom, entryText: o.name, flags: MF_GRAYED });
					} else {
						const bEnabled = (!o.bPrepaint || this.preset.paintMode === 'partial' && this.preset.bPrePaint) && (!o.bPartial || this.preset.paintMode === 'partial');
						menu.newEntry({
							menuName: subMenuCustom, entryText: o.name + '\t' + _b(getColorName(this.ui.colors[o.key])), func: () => {
								this.updateConfig({
									ui: {
										colors: {
											[o.key]: utils.IsKeyPressed(VK_CONTROL) ? -1 : utils.ColourPicker(window.ID, this.ui.colors[o.key]),
										}
									}
								});
								this.saveProperties();
								if (this.ui.colors[o.key] !== -1) { console.log('Seekbar: Selected color ->\n\t Android: ' + this.ui.colors[o.key] + ' - RGB: ' + Chroma(this.ui.colors[o.key]).rgb()); }
							}, flags: bEnabled ? MF_STRING : MF_GRAYED
						});
					}
				});
			}
		}
		{
			const subMenuTwo = menu.newMenu('Waveform', subMenu);
			menu.newEntry({ menuName: subMenuTwo, entryText: 'Set waveform colors:', flags: MF_GRAYED });
			menu.newSeparator(subMenuTwo);
			[
				{ name: 'Green', colors: { main: 0xFF90EE90, alt: 0xFF7CFC00, mainFuture: 0xFFB7FFA2, altFuture: 0xFFF9FF99, currPos: 0xFFFFFFFF } },
				{ name: 'Lavender', colors: { main: 0xFFCDB4DB, alt: 0xFFFFC8DD, mainFuture: 0xFFBDE0FE, altFuture: 0xFFA2D2FF, currPos: 0xFFFFAFCC } },
				{ name: 'Forest', colors: { main: 0xFF606C38, alt: 0xFFDDA15E, mainFuture: 0xFF283618, altFuture: 0xFFBC6C25, currPos: 0xFF606C38 } },
				{ name: 'Sienna', colors: { main: 0xFFBF0603, alt: 0xFFEE6055, mainFuture: 0xFF8D0801, altFuture: 0xFFC52233, currPos: 0xFF450920 } },
				{ name: 'Blue', colors: { main: 0xFF003559, alt: 0xFF006DAA, mainFuture: 0xFF0353A4, altFuture: 0xFF061A40, currPos: 0xFFB9D6F2 } },
				{ name: 'sep' },
				{ name: 'None', colors: { main: -1, alt: -1, mainFuture: -1, altFuture: -1 } },
			].forEach((o) => {
				if (menu.isSeparator(o)) {
					menu.newEntry({ menuName: subMenuTwo, entryText: o.name, flags: MF_GRAYED });
				} else {
					menu.newEntry({
						menuName: subMenuTwo, entryText: o.name, func: () => {
							this.updateConfig({ ui: { colors: o.colors } });
							this.saveProperties();
						}
					});
					menu.newCheckMenuLast(() => Object.keys(o.colors).every((key) => this.ui.colors[key] === o.colors[key]));
				}
			});
			menu.newSeparator(subMenuTwo);
			{
				const subMenuCustom = menu.newMenu('Custom', subMenuTwo);
				menu.newEntry({ menuName: subMenuCustom, entryText: 'Ctrl + Click to set none:', flags: MF_GRAYED });
				menu.newSeparator(subMenuCustom);
				[
					{ name: 'Exterior (played)', bPrepaint: false, key: 'main' },
					{ name: 'Interior (played)', bPrepaint: false, key: 'alt' },
					{ name: 'Exterior (unplayed)', bPrepaint: true, key: 'mainFuture' },
					{ name: 'Interior (unplayed)', bPrepaint: true, key: 'altFuture' },
				].forEach((o) => {
					if (menu.isSeparator(o)) {
						menu.newEntry({ menuName: subMenuCustom, entryText: o.name, flags: MF_GRAYED });
					} else {
						const bEnabled = (!o.bPrepaint || this.preset.paintMode === 'partial' && this.preset.bPrePaint) && (!o.bPartial || this.preset.paintMode === 'partial');
						menu.newEntry({
							menuName: subMenuCustom, entryText: o.name + '\t' + _b(getColorName(this.ui.colors[o.key])), func: () => {
								this.updateConfig({
									ui: {
										colors: {
											[o.key]: utils.IsKeyPressed(VK_CONTROL) ? -1 : utils.ColourPicker(window.ID, this.ui.colors[o.key]),
										}
									}
								});
								this.saveProperties();
								if (this.ui.colors[o.key] !== -1) { console.log('Seekbar: Selected color ->\n\t Android: ' + this.ui.colors[o.key] + ' - RGB: ' + Chroma(this.ui.colors[o.key]).rgb()); }
							}, flags: bEnabled ? MF_STRING : MF_GRAYED
						});
					}
				});
			}
		}
		{
			const subMenuTwo = menu.newMenu('Current position', subMenu);
			menu.newEntry({ menuName: subMenuTwo, entryText: 'Set indicator colors:', flags: MF_GRAYED });
			menu.newSeparator(subMenuTwo);
			[
				{ name: 'Green', colors: { currPos: 0xFF90EE90 } },
				{ name: 'Pink', colors: { currPos: 0xFFFFAFCC } },
				{ name: 'Forest', colors: { currPos: 0xFF606C38 } },
				{ name: 'Purple', colors: { currPos: 0xFF450920 } },
				{ name: 'Sienna', colors: { currPos: 0xFFBF0603 } },
				{ name: 'Dark Blue', colors: { currPos: 0xFF003559 } },
				{ name: 'Blue', colors: { currPos: 0xFFB9D6F2 } },
				{ name: 'White', colors: { currPos: 0xFFFFFFFF } },
				{ name: 'Black', colors: { currPos: 0x00000000 } },
				{ name: 'sep' },
				{ name: 'None', colors: { currPos: -1 } },
			].forEach((o) => {
				if (menu.isSeparator(o)) {
					menu.newEntry({ menuName: subMenuTwo, entryText: o.name, flags: MF_GRAYED });
				} else {
					menu.newEntry({
						menuName: subMenuTwo, entryText: o.name, func: () => {
							this.updateConfig({ ui: { colors: o.colors } });
							this.saveProperties();
						}
					});
					menu.newCheckMenuLast(() => Object.keys(o.colors).every((key) => this.ui.colors[key] === o.colors[key]));
				}
			});
			menu.newSeparator(subMenuTwo);
			menu.newEntry({
				menuName: subMenuTwo, entryText: 'Custom\t' + _b(getColorName(this.ui.colors.currPos)), func: () => {
					this.updateConfig({
						ui: {
							colors: {
								currPos: utils.ColourPicker(window.ID, this.ui.colors.currPos),
							}
						}
					});
					this.saveProperties();
					console.log('Seekbar: Selected color ->\n\t Android: ' + this.ui.colors.currPos + ' - RGB: ' + Chroma(this.ui.colors.currPos).rgb());
				}
			});
		}
		menu.newSeparator(subMenu);
		{
			const subMenuTwo = menu.newMenu('Transparency', subMenu);
			menu.newEntry({ menuName: subMenuTwo, entryText: 'Ctrl + Click to reset:', flags: MF_GRAYED });
			menu.newSeparator(subMenuTwo);
			[
				{ name: 'Wav. Ext. (played)', bPrepaint: false, key: 'main' },
				{ name: 'Wav. Int. (played)', bPrepaint: false, key: 'alt' },
				{ name: 'Wav. Ext. (unplayed)', bPrepaint: true, key: 'mainFuture' },
				{ name: 'Wav. Int. (unplayed)', bPrepaint: true, key: 'altFuture' },
				{ name: 'Bg. full panel', bPrepaint: false, key: 'bg' },
				{ name: 'Bg. (unplayed)', bPartial: true, key: 'bgFuture' },
			].forEach((o) => {
				if (menu.isSeparator(o)) {
					menu.newEntry({ menuName: subMenuTwo, entryText: o.name, flags: MF_GRAYED });
				} else {
					const bEnabled = (!o.bPrepaint || this.preset.paintMode === 'partial' && this.preset.bPrePaint) && (!o.bPartial || this.preset.paintMode === 'partial');
					menu.newEntry({
						menuName: subMenuTwo, entryText: o.name + '\t' + _b(this.ui.transparency[o.key]), func: () => {
							const input = utils.IsKeyPressed(VK_CONTROL)
								? 100
								: Input.number('int', this.ui.transparency[o.key], 'Enter value:\n0 is transparent, 100 is opaque.\n(0 to 100)', window.Name, 200, [(n) => n >= 0 && n <= 100]);
							if (input === null) { return; }
							this.updateConfig({
								ui: {
									transparency: {
										[o.key]: input,
									}
								}
							});
							this.saveProperties();
						}, flags: bEnabled ? MF_STRING : MF_GRAYED
					});
				}
			});
		}
		menu.newEntry({
			menuName: subMenu, entryText: 'Dynamic (background cover mode)', func: () => {
				seekbarProperties.bDynamicColors[1] = !seekbarProperties.bDynamicColors[1];
				if (seekbarProperties.bDynamicColors[1]) {
					this.saveProperties();
					// Ensure it's applied with compatible settings
					if (background.coverMode === 'none') {
						background.coverModeOptions.alpha = 0;
						background.coverMode = 'front';
					}
					background.updateImageBg(true);
				} else {
					const defColors = JSON.parse(seekbarProperties.ui[1]).colors;
					this.updateConfig({ ui: { colors: defColors } });
					this.saveProperties();
				}
			}
		});
		menu.newCheckMenuLast(() => seekbarProperties.bDynamicColors[1]);
	}
	{ // NOSONAR [menu block]
		createBackgroundMenu.call(
			background,
			{ menuName: 'Background' },
			menu,
			{ nameColors: true }
		);
	}
	menu.newSeparator();
	{
		const subMenu = menu.newMenu('Other settings');
		{
			const subMenuTwo = menu.newMenu('Wheel scrolling', subMenu);
			menu.newEntry({
				menuName: subMenuTwo, entryText: 'Seek ahead/back...' + '\t' + _b(this.ui.wheel.step), func: () => {
					let input;
					switch (this.ui.wheel.unit.toLowerCase()) {
						case 's':
							input = Input.number('int', this.ui.wheel.step, 'Enter value:\n(s)', window.Name, 5, [(n) => n > 0 && n < Infinity]);
							break;
						case 'ms':
							input = Input.number('int', this.ui.wheel.step, 'Enter value:\n(ms)', window.Name, 250, [(n) => n > 0 && n < Infinity]);
							break;
						case '%':
							input = Input.number('int', this.ui.wheel.step, 'Enter value:\n(% of length)', window.Name, 10, [(n) => n > 0 && n <= 100]);
							break;
					}
					if (input === null) { return; }
					this.updateConfig({ ui: { wheel: { step: input } } });
					this.saveProperties();
				}
			});
			{
				const subMenuThree = menu.newMenu('Unit\t' + _b(this.ui.wheel.unit), subMenuTwo);
				const options = [{ entryText: 'Seconds', val: 's' }, { entryText: 'Miliseconds', val: 'ms' }, { entryText: '% of length', val: '%' }];
				options.forEach((opt) => {
					menu.newEntry({
						menuName: subMenuThree, entryText: opt.entryText, func: () => {
							this.updateConfig({ ui: { wheel: { unit: opt.val } } });
							this.saveProperties();
						}
					});
				});
				menu.newCheckMenuLast(() => options.findIndex((e) => e.val === this.ui.wheel.unit), options);
			}
			menu.newSeparator(subMenuTwo);
			menu.newEntry({
				menuName: subMenuTwo, entryText: 'Reverse seeking', func: () => {
					this.updateConfig({ ui: { wheel: { bReversed: this.ui.wheel.bReversed } } });
					this.saveProperties();
				}
			});
			menu.newCheckMenuLast(() => this.ui.wheel.bReversed);
		}
		menu.newSeparator(subMenu);
		menu.newEntry({
			menuName: subMenu, entryText: 'Refresh rate...' + '\t' + _b(this.ui.refreshRateOpt), func: () => {
				const input = Input.number('int', this.ui.refreshRate, 'Enter value:\n(ms)', window.Name, 200, [(n) => n >= 50]);
				if (input === null) { return; }
				this.updateConfig({ ui: { refreshRate: input } });
				this.saveProperties();
			}, flags: this.ui.bVariableRefreshRate ? MF_GRAYED : MF_STRING
		});
		menu.newEntry({
			menuName: subMenu, entryText: 'Variable refresh rate', func: () => {
				this.updateConfig({ ui: { bVariableRefreshRate: !this.ui.bVariableRefreshRate } });
				this.saveProperties();
			}
		});
		menu.newCheckMenuLast(() => this.ui.bVariableRefreshRate);
		menu.newSeparator(subMenu);
		menu.newEntry({
			menuName: subMenu, entryText: 'Automatically check for updates', func: () => {
				seekbarProperties.bAutoUpdateCheck[1] = !seekbarProperties.bAutoUpdateCheck[1];
				this.saveProperties();
				if (seekbarProperties.bAutoUpdateCheck[1]) {
					if (typeof checkUpdate === 'undefined') { include('helpers\\helpers_xxx_web_update.js'); }
					setTimeout(checkUpdate, 1000, { bDownload: globSettings.bAutoUpdateDownload, bOpenWeb: globSettings.bAutoUpdateOpenWeb, bDisableWarning: false });
				}
			}
		});
		menu.newCheckMenuLast(() => seekbarProperties.bAutoUpdateCheck[1]);
	}
	menu.newSeparator();
	menu.newEntry({
		entryText: 'Check for updates...', func: () => {
			if (typeof checkUpdate === 'undefined') { include('helpers\\helpers_xxx_web_update.js'); }
			checkUpdate({ bDownload: globSettings.bAutoUpdateDownload, bOpenWeb: globSettings.bAutoUpdateOpenWeb, bDisableWarning: false })
				.then((bFound) => !bFound && fb.ShowPopupMessage('No updates found.', window.Name));
		}
	});
	menu.newSeparator();
	menu.newEntry({
		entryText: 'Open data file...', func: () => {
			if (fb.IsPlaying) {
				const { seekbarFolder } = this.getPaths(fb.GetNowPlaying());
				if (_isFolder(seekbarFolder)) { _explorer(seekbarFolder); }
			}
		}, flags: fb.IsPlaying && this.active && this.analysis.binaryMode !== 'visualizer' ? MF_STRING : MF_GRAYED
	});
	menu.newSeparator();
	{	// Readme
		const path = folders.xxx + 'helpers\\readme\\seekbar.txt';
		menu.newEntry({
			entryText: 'Open readme...', func: () => {
				const readme = _open(path, utf8);
				if (readme.length) { fb.ShowPopupMessage(readme, 'Not-A-Waveform-seekbar-SMP'); }
				else { console.log('Seekbar: Readme not found\n\t ' + path); }
			}
		});
	}
	return menu;
}