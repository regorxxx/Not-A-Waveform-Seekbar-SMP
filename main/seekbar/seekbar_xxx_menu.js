'use strict';
//18/02/23

function bindMenu(parent) {
	return _attachedMenu.call(parent, {rMenu: createSeekbarMenu.bind(parent), popup: parent.pop});
}

// Generic menu for config
function createSeekbarMenu(bClear = true) {
	if (!this.menu) {this.menu = new _menu();}
	const menu = this.menu;
	if (bClear) {menu.clear(true);} // Reset on every call
	// helper
	menu.newEntry({entryText: 'Configure the seekbar:', flags: MF_GRAYED});
	menu.newEntry({entryText: 'sep'});
	// Menus
	{
		const subMenu = menu.newMenu('Binary type...');
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
		menu.newCheckMenu(subMenu, options[0].name, options[options.length - 1].name, () => {return options.findIndex(o => o.key === this.analysis.binaryMode);});
	}
	{
		const subMenu = menu.newMenu('Analysis settings...');
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
			menu.newCheckMenu(subMenu, options[0].name, options[options.length - 1].name, () => {return options.findIndex(o => o.key === this.preset.analysisMode);});
		}
		menu.newEntry({menuName: subMenu, entryText: 'sep'});
		{
			[{name: 'Auto-delete analysis files?', key: 'bAutoDelete'}]
				.forEach((o) => {
					menu.newEntry({menuName: subMenu, entryText: o.name, func: () => {
						this.updateConfig({analysis: {[o.key]: !this.analysis[o.key]}});
						this.saveProperties();
					}, flags: this.analysis.binaryMode !== 'visualizer' ? MF_STRING : MF_GRAYED});
					menu.newCheckMenu(subMenu, o.name, void(0), () => {return this.analysis[o.key];});
				});
		}
	}
	menu.newEntry({entryText: 'sep'});
	{
		const subMenu = menu.newMenu('Waveform shape...');
		const options = [
			{name: 'Waveform', key: 'waveform'},
			{name: 'Bars', key: 'bars'},
			{name: 'Points', key: 'points'},
			{name: 'Half-Bars', key: 'halfbars'}
		];
		options.forEach((o) => {
			menu.newEntry({menuName: subMenu, entryText: o.name, func: () => {
				this.updateConfig({preset: {waveMode: o.key}});
				this.saveProperties();
			}});
		});
		menu.newCheckMenu(subMenu, options[0].name, options[options.length - 1].name, () => {return options.findIndex(o => o.key === this.preset.waveMode);});
	}
	{
		const subMenu = menu.newMenu('Paint mode...');
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
		menu.newCheckMenu(subMenu, options[0].name, options[options.length - 1].name, () => {return options.findIndex(o => o.key === this.preset.paintMode);});
	}
	menu.newEntry({entryText: 'sep'});
	{
		[
			{name: 'Show current position', key: 'bPaintCurrent'},
			{name: 'Animate with BPM' + (this.preset.paintMode === 'full' && this.analysis.binaryMode !== 'visualizer' ? '\t(partial only)' : ''), key: 'bUseBPM', 
				flags: (this.preset.paintMode === 'partial' && this.preset.bPaintFuture) || this.analysis.binaryMode === 'visualizer' ? MF_STRING : MF_GRAYED},
			{name: 'Paint ahead?' + (this.preset.paintMode === 'full' ? '\t(partial only)' : ''), key: 'bPaintFuture', 
				flags: this.preset.paintMode === 'full' ? MF_GRAYED : MF_STRING}
		].forEach((o) => {
			menu.newEntry({entryText: o.name, func: () => {
				this.updateConfig({preset: {[o.key]: !this.preset[o.key]}});
				this.saveProperties();
			}, flags: o.flags || MF_STRING});
			menu.newCheckMenu(void(0), o.name, void(0), () => {return this.preset[o.key];});
		});
	}
	{
		const subMenu = menu.newMenu('Paint ahead seconds...', void(0), () => this.preset.paintMode === 'full' || !this.preset.bPaintFuture ? MF_GRAYED : MF_STRING);
		[Infinity, 2, 5, 10]
			.forEach((s) => {
				menu.newEntry({menuName: subMenu, entryText: s, func: () => {
					this.updateConfig({preset: {futureSecs: s}});
					this.saveProperties();
				}, flags: (this.preset.paintMode === 'full' || this.analysis.binaryMode === 'visualizer' || !this.preset.bPaintFuture) ? MF_GRAYED : MF_STRING});
				menu.newCheckMenu(subMenu, s, void(0), () => {return (this.preset.futureSecs === s);});
			});
	}
	{
		const subMenu = menu.newMenu('Refresh rate...' + (this.preset.paintMode === 'full' && this.analysis.binaryMode !== 'visualizer' ? '\t(partial only)' : ''), void(0), () => this.preset.paintMode === 'partial' && this.preset.bPaintFuture || this.analysis.binaryMode === 'visualizer' ? MF_STRING : MF_GRAYED);
		[1000, 500, 200, 100, 60]
			.forEach((s) => {
				menu.newEntry({menuName: subMenu, entryText: s, func: () => {
					this.updateConfig({ui: {refreshRate: s}});
					this.saveProperties();
				}});
				menu.newCheckMenu(subMenu, s, void(0), () => {return (this.ui.refreshRate === s);});
			});
		menu.newEntry({menuName: subMenu, entryText: 'sep'});
		[
			{name: 'Variable refresh rate', key: 'bVariableRefreshRate'},
		].forEach((o) => {
			menu.newEntry({menuName: subMenu, entryText: o.name, func: () => {
				this.updateConfig({ui: {[o.key]: !this.ui[o.key]}});
				this.saveProperties();
			}, flags: o.flags || MF_STRING});
			menu.newCheckMenu(subMenu, o.name, void(0), () => {return this.ui[o.key];});
		});
	}
	menu.newEntry({entryText: 'sep'});
	{
		const subMenu = menu.newMenu('Color presets...');
		const subMenuBg = menu.newMenu('Background...', subMenu);
		menu.newEntry({menuName: subMenu, entryText: 'sep'});
		const options = [
			{menuName: subMenu, name: 'Green', colors: {main: 0xFF90EE90, alt: 0xFF7CFC00, mainFuture: 0xFFB7FFA2, altFuture: 0xFFF9FF99, currPos: 0xFFFFFFFF}},
			{menuName: subMenu, name: 'Lavender', colors: {main: 0xFFCDB4DB, alt: 0xFFFFC8DD, mainFuture: 0xFFBDE0FE, altFuture: 0xFFA2D2FF, currPos: 0xFFFFAFCC}},
			{menuName: subMenu, name: 'Forest', colors: {main: 0xFF606C38, alt: 0xFFDDA15E, mainFuture: 0xFF283618, altFuture: 0xFFBC6C25, currPos: 0xFF606C38}},
			{menuName: subMenu, name: 'Sienna', colors: {main: 0xFFBF0603, alt: 0xFFEE6055, mainFuture: 0xFF8D0801, altFuture: 0xFFC52233, currPos: 0xFF450920}},
			{menuName: subMenu, name: 'Blue', colors: {main: 0xFF003559, alt: 0xFF006DAA,mainFuture: 0xFF0353A4, altFuture: 0xFF061A40, currPos: 0xFFB9D6F2}},
			{menuName: subMenuBg, name: 'White Bg', colors: {bg: 0xFFFFFFFF, bgFuture: 0xFFFFFFFF}},
			{menuName: subMenuBg, name: 'White Bg (alt)', colors: {bg: 0xFFFFFFFF, bgFuture: 0xFFF8F7FF}},
			{menuName: subMenuBg, name: 'Black Bg', colors: {bg: 0xFF000000, bgFuture: 0xFF000000}},
			{menuName: subMenuBg, name: 'Black Bg (alt)', colors: {bg: 0xFF000000, bgFuture: 0xFF1B1B1B}},
			{menuName: subMenuBg, name: 'Sienna Bg', colors: {bg: 0xFF450920, bgFuture: 0xFF74121D}},
			{menuName: subMenuBg, name: 'Blue Bg', colors: {bg: 0xFFB9D6F2, bgFuture: 0xFFBBDEFB}}
		];
		options.forEach((o) => {
			if (o.name === 'sep') {
				menu.newEntry({menuName: o.menuName, entryText: o.name});
			} else {
				menu.newEntry({menuName: o.menuName, entryText: o.name, func: () => {
					this.updateConfig({ui: {colors: o.colors}});
					this.saveProperties();
				}});
			}
		});
	}
	menu.newEntry({entryText: 'sep'});
	menu.newEntry({entryText: 'Enable seekbar?', func: () => {
		this.switch();
	}});
	menu.newCheckMenu(void(0), 'Enable seekbar?', void(0), () => {return this.active;});
	return menu;
}