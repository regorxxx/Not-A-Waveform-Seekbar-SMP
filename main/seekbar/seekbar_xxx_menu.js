'use strict';
//275/01/23

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
				this.analysis.binaryMode = s;
				this.newTrack();
				window.Repaint();
			}});
		});
		menu.newCheckMenu(subMenu, options[0], options[options.length - 1], () => {return options.indexOf(this.analysis.binaryMode);});
	}
	{
		const subMenu = menu.newMenu('Analysis type...');
		const options = ['RMS_level', 'Peak_level', 'RMS_peak'];
		options.forEach((s) => {
			menu.newEntry({menuName: subMenu, entryText: s, func: () => {
				this.analysis.analysisMode = s;
				this.newTrack();
				window.Repaint();
			}});
		});
		menu.newCheckMenu(subMenu, options[0], options[options.length - 1], () => {return options.indexOf(this.analysis.analysisMode);});
		menu.newEntry({menuName: subMenu, entryText: 'sep'});
		{
			['bNormalize']
				.forEach((s) => {
					menu.newEntry({menuName: subMenu, entryText: s, func: () => {
						this.analysis[s] = !this.analysis[s];
						this.newTrack();
						window.Repaint();
					}});
					menu.newCheckMenu(subMenu, s, void(0), () => {return this.analysis[s];});
				});
		}
		{
			['bAutoDelete']
				.forEach((s) => {
					menu.newEntry({menuName: subMenu, entryText: s, func: () => {
						this.analysis[s] = !this.analysis[s];
						this.newTrack();
						window.Repaint();
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
				this.preset.waveMode = s;
				window.Repaint();
			}});
		});
		menu.newCheckMenu(subMenu, options[0], options[options.length - 1], () => {return options.indexOf(this.preset.waveMode);});
	}
	{
		const subMenu = menu.newMenu('Paint mode...');
		const options = ['full', 'partial'];
		options.forEach((s) => {
			menu.newEntry({menuName: subMenu, entryText: s, func: () => {
				this.preset.paintMode = s;
				window.Repaint();
			}});
		});
		menu.newCheckMenu(subMenu, options[0], options[options.length - 1], () => {return options.indexOf(this.preset.paintMode);});
	}
	menu.newEntry({entryText: 'sep'});
	{
		['bPaintCurrent', 'bPaintFuture']
			.forEach((s) => {
				menu.newEntry({entryText: s, func: () => {
					this.preset[s] = !this.preset[s];
					window.Repaint();
				}, flags: this.paintMode === 'full' && s === 'bPaintFuture' ? MF_GRAYED : MF_STRING});
				menu.newCheckMenu(void(0), s, void(0), () => {return this.preset[s];});
			});
	}
	return menu;
}