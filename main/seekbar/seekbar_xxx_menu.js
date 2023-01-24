'use strict';
//24/01/23

// Don't load this helper unless menu framework is also present
// https://github.com/regorxxx/Menu-Framework-SMP
try {include('..\\..\\helpers\\menu_xxx.js');} catch(e) {fb.ShowPopupMessage('Missing menu framework file', window.Name);}

function bindMenu(parent) {
	return _attachedMenu.call(parent, {rMenu: createSeekbarMenu.bind(parent), popup: parent.pop});
}

// Generic statistics menu which should work on almost any chart...
function createSeekbarMenu(bClear = true) {
	if (!this.menu) {this.menu = new _menu();}
	const menu = this.menu;
	if (bClear) {menu.clear(true);} // Reset on every call
	// helper
	menu.newEntry({entryText: 'Configure the seekbar:', flags: MF_GRAYED});
	menu.newEntry({entryText: 'sep'});
	// Menus
	{
		const subMenu = menu.newMenu('Waveform type...');
		const options = ['waveform', 'bars'];
		options.forEach((s) => {
			menu.newEntry({menuName: subMenu, entryText: s, func: () => {
				this.waveMode = s;
			}});
		});
		menu.newCheckMenu(subMenu, options[0], options[options.length - 1], () => {return options.indexOf(this.waveMode);});
	}
	{
		const subMenu = menu.newMenu('Paint mode...');
		const options = ['full', 'partial'];
		options.forEach((s) => {
			menu.newEntry({menuName: subMenu, entryText: s, func: () => {
				this.paintMode = s;
				window.Repaint();
			}});
		});
		menu.newCheckMenu(subMenu, options[0], options[options.length - 1], () => {return options.indexOf(this.paintMode);});
	}
	menu.newEntry({entryText: 'sep'});
	{
		['bPaintCurrent', 'bPaintFuture']
			.forEach((s) => {
				menu.newEntry({entryText: s, func: () => {
					this[s] = !this[s];
					window.Repaint();
				}, flags: this.waveMode !== 'waveform' && s === 'bPaintFuture' ? MF_GRAYED : MF_STRING});
				menu.newCheckMenu(void(0), s, void(0), () => {return this[s];});
			});
	}
	return menu;
}