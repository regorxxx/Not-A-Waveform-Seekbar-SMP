'use strict';
//30/01/23

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
		const options = ['ffprobe', 'audiowaveform'];
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
			}});
		});
		menu.newCheckMenu(subMenu, options[0], options[options.length - 1], () => {return options.indexOf(this.preset.analysisMode);});
		menu.newEntry({menuName: subMenu, entryText: 'sep'});
		{
			['bAutoDelete']
				.forEach((s) => {
					menu.newEntry({menuName: subMenu, entryText: s, func: () => {
						this.updateConfig({analysis: {[s]: !this.analysis[s]}});
					}});
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
			}});
		});
		menu.newCheckMenu(subMenu, options[0], options[options.length - 1], () => {return options.indexOf(this.preset.paintMode);});
	}
	menu.newEntry({entryText: 'sep'});
	{
		['bPaintCurrent', 'bPaintFuture']
			.forEach((s) => {
				menu.newEntry({entryText: s, func: () => {
					this.updateConfig({preset: {[s]: !this.preset[s]}});
				}, flags: this.paintMode === 'full' && s === 'bPaintFuture' ? MF_GRAYED : MF_STRING});
				menu.newCheckMenu(void(0), s, void(0), () => {return this.preset[s];});
			});
	}
	return menu;
}