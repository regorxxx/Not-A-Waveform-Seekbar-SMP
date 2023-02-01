'use strict';
//01/02/23

// Don't load this helper unless menu framework is also present
// https://github.com/regorxxx/Menu-Framework-SMP
try {include('..\\..\\helpers\\menu_xxx.js');} catch(e) {fb.ShowPopupMessage('Missing menu framework file', window.Name);}

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
		const options = ['ffprobe', 'audiowaveform', 'visualizer'];
		options.forEach((s) => {
			menu.newEntry({menuName: subMenu, entryText: s, func: () => {
				this.updateConfig({analysis: {binaryMode: s}});
			}});
		});
		menu.newCheckMenu(subMenu, options[0], options[options.length - 1], () => {return options.indexOf(this.analysis.binaryMode);});
	}
	{
		const subMenu = menu.newMenu('Analysis type...');
		const options = ['rms_level', 'peak_level', 'rms_peak'];
		options.forEach((s) => {
			menu.newEntry({menuName: subMenu, entryText: s, func: () => {
				this.updateConfig({preset: {analysisMode: s}});
			}, flags: this.analysis.binaryMode === 'ffprobe' ? MF_STRING : MF_GRAYED});
		});
		menu.newCheckMenu(subMenu, options[0], options[options.length - 1], () => {return options.indexOf(this.preset.analysisMode);});
		menu.newEntry({menuName: subMenu, entryText: 'sep'});
		{
			['bAutoDelete']
				.forEach((s) => {
					menu.newEntry({menuName: subMenu, entryText: s, func: () => {
						this.updateConfig({analysis: {[s]: !this.analysis[s]}});
					}, flags: this.analysis.binaryMode !== 'visualizer' ? MF_STRING : MF_GRAYED});
					menu.newCheckMenu(subMenu, s, void(0), () => {return this.analysis[s];});
				});
		}
	}
	menu.newEntry({entryText: 'sep'});
	{
		const subMenu = menu.newMenu('Waveform type...');
		const options = ['waveform', 'bars', 'points','halfbars'];
		options.forEach((s) => {
			menu.newEntry({menuName: subMenu, entryText: s, func: () => {
				this.updateConfig({preset: {waveMode: s}});
			}});
		});
		menu.newCheckMenu(subMenu, options[0], options[options.length - 1], () => {return options.indexOf(this.preset.waveMode);});
	}
	{
		const subMenu = menu.newMenu('Paint mode...');
		const options = ['full', 'partial'];
		options.forEach((s) => {
			menu.newEntry({menuName: subMenu, entryText: s, func: () => {
				this.updateConfig({preset: {paintMode: s}});
			}, flags: this.analysis.binaryMode !== 'visualizer' ? MF_STRING : MF_GRAYED});
		});
		menu.newCheckMenu(subMenu, options[0], options[options.length - 1], () => {return options.indexOf(this.preset.paintMode);});
	}
	menu.newEntry({entryText: 'sep'});
	{
		['bPaintCurrent', 'bPaintFuture', 'bUseBPM']
			.forEach((s) => {
				menu.newEntry({entryText: s, func: () => {
					this.updateConfig({preset: {[s]: !this.preset[s]}});
				}, flags: (this.preset.paintMode === 'full' || this.analysis.binaryMode === 'visualizer') && s === 'bPaintFuture' ? MF_GRAYED : MF_STRING});
				menu.newCheckMenu(void(0), s, void(0), () => {return this.preset[s];});
			});
	}
	{
		const subMenu = menu.newMenu('Future paint...');
		[Infinity, 2, 5, 10]
			.forEach((s) => {
				menu.newEntry({menuName: subMenu, entryText: s, func: () => {
					this.updateConfig({preset: {futureSecs: s}});
				}, flags: (this.preset.paintMode === 'full' || this.analysis.binaryMode === 'visualizer' || !this.preset.bPaintFuture) ? MF_GRAYED : MF_STRING});
				menu.newCheckMenu(subMenu, s, void(0), () => {return (this.preset.futureSecs === s);});
			});
	}
	menu.newEntry({entryText: 'sep'});
	{
		const subMenu = menu.newMenu('Color presets...');
		const options = [
			{name: 'Green', colors: {main: colours.LimeGreen, alt: colours.LawnGreen, mainFuture: 0xFFB7FFA2, altFuture: 0xFFF9FF99, currPos: colours.White}},
			{name: 'Lavender', colors: {main: 0xFFCDB4DB, alt: 0xFFFFC8DD, mainFuture: 0xFFBDE0FE, altFuture: 0xFFA2D2FF, currPos: 0xFFFFAFCC}},
			{name: 'Forest', colors: {main: 0xFF606C38, alt: 0xFFDDA15E, mainFuture: 0xFF283618, altFuture: 0xFFBC6C25, currPos: 0xFF606C38}},
			{name: 'Sienna', colors: {main: 0xFFBF0603, alt: 0xFFEE6055, mainFuture: 0xFF8D0801, altFuture: 0xFFC52233, currPos: 0xFF450920}},
			{name: 'Blue', colors: {main: 0xFF003559, alt: 0xFF006DAA,mainFuture: 0xFF0353A4, altFuture: 0xFF061A40, currPos: 0xFFB9D6F2}},
			{name: 'sep'},
			{name: 'White Bg', colors: {bg: colours.White, bgFuture: colours.White}},
			{name: 'White Bg (alt)', colors: {bg: colours.White, bgFuture: 0xFFF8F7FF}},
			{name: 'Black Bg', colors: {bg: colours.Black, bgFuture: colours.Black}},
			{name: 'Black Bg (alt)', colors: {bg: colours.Black, bgFuture: 0xFF1B1B1B}},
			{name: 'Sienna Bg', colors: {bg: 0xFF450920, bgFuture: 0xFF74121D}},
			{name: 'Blue Bg', colors: {bg: 0xFFB9D6F2, bgFuture: 0xFFBBDEFB}}
		];
		options.forEach((opt) => {
			if (opt.name === 'sep') {
				menu.newEntry({menuName: subMenu, entryText: opt.name});
			} else {
				menu.newEntry({menuName: subMenu, entryText: opt.name, func: () => {
					this.updateConfig({ui: {colors: opt.colors}});
				}});
			}
		});
	}
	return menu;
}