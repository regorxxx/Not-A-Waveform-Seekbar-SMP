'use strict';
//18/12/25

if (!window.ScriptInfo.PackageId) { window.DefineScript('Not-A-Waveform-Seekbar-SMP', { author: 'regorxxx', version: '3.2.1' }); }

include('helpers\\helpers_xxx.js');
/* global folders:readable, globSettings:readable, globTags:readable, soFeat:readable, globFonts:readable, globProfiler:readable, VK_CONTROL:readable, popup:readable, VK_ALT:readable */
include('helpers\\helpers_xxx_flags.js');
/* global VK_LWIN:readable, MK_LBUTTON:readable */
include('helpers\\helpers_xxx_UI.js');
/* global _scale:readable, RGB:readable, _gdiFont:readable, _tt:readable, blendColors */
include('helpers\\helpers_xxx_file.js');
/* global _open:readable, utf8:readable, WshShell:readable, _save:readable, _foldPath:readable, _isFile:readable, _isFolder:readable, _copyDependencies:readable */
include('helpers\\helpers_xxx_prototypes.js');
/* global isJSON:readable, isBoolean:readable, isString:readable, clone:readable */
include('helpers\\helpers_xxx_prototypes_smp.js');
/* global extendGR:readable */
include('helpers\\helpers_xxx_properties.js');
/* global setProperties:readable, getPropertiesPairs:readable, overwriteProperties:readable */
include('helpers\\menu_xxx.js');
/* global _menu:readable */
include('main\\seekbar\\seekbar_xxx.js');
/* global _seekbar:readable */
include('main\\seekbar\\seekbar_xxx_menu.js');
/* global settingsMenu:readable, importSettingsMenu:readable, Input:readable */
include('helpers\\callbacks_xxx.js');
include('main\\window\\window_xxx_background.js');
/* global _background:readable */
include('main\\window\\window_xxx_dynamic_colors.js');
/* global dynamicColors:readable, mostContrastColor */

globProfiler.Print('dependencies');

_copyDependencies(['', 'ffprobe'], void (0), true);
if (_isFolder(folders.binaries + 'audiowaveform\\')) { _copyDependencies(['', 'audiowaveform'], void (0), false); }

globProfiler.Print('helpers');

let seekbarProperties = {
	binaries: ['Binaries paths',
		JSON.stringify({
			ffprobe: _foldPath(folders.binaries) + 'ffprobe\\ffprobe' + (soFeat.x64 ? '' : '_32') + '.exe',
			audiowaveform: (_isFile(folders.binaries + 'audiowaveform\\audiowaveform' + (soFeat.x64 ? '' : '_32') + '.exe')
				? _foldPath(folders.binaries)
				: folders.xxxRootName + 'helpers-external\\'
			) + 'audiowaveform\\audiowaveform' + (soFeat.x64 ? '' : '_32') + '.exe'
		}), { func: isJSON, forceDefaults: true }],
	analysis: ['Analysis config',
		JSON.stringify({
			binaryMode: 'audiowaveform',
			resolution: 2,
			compressionMode: 'utf-16',
			storeMode: 'library',
			trackMode: ['playing', 'selected', 'blank'],
			bAutoAnalysis: true,
			bAutoRemove: false,
			bVisualizerFallback: true,
			bVisualizerFallbackAnalysis: true,
			bMultiChannel: false
		}), { func: isJSON, forceDefaults: true }],
	preset: ['Preset config',
		JSON.stringify({
			analysisMode: 'peak_level',
			waveMode: 'waveform',
			paintMode: 'partial',
			bPrePaint: true,
			bPaintCurrent: true,
			bAnimate: true,
			bUseBPM: true,
			futureSecs: Infinity,
			bHalfBarsShowNeg: true,
			displayChannels: []
		}), { func: isJSON, forceDefaults: true }],
	ui: ['UI config',
		JSON.stringify({
			colors: {
				bg: 0xFF000000, // Black
				main: 0xFF003559, // Blue
				alt: 0xFF006DAA, // Blue
				bgFuture: 0xFF1B1B1B, // Grey
				mainFuture: 0xFF0353A4,
				altFuture: 0xFF061A40,
				currPos: 0xFFB9D6F2 // White
			},
			transparency: {
				bg: 30,
				main: 75,
				alt: 75,
				bgFuture: 15,
				mainFuture: 75,
				altFuture: 75,
				currPos: 50
			},
			refreshRate: 200,
			bVariableRefreshRate: true,
			bNormalizeWidth: false,
			normalizeWidth: _scale(4),
			bLogScale: true
		}), { func: isJSON, forceDefaults: true }],
	logging: ['Logging config',
		JSON.stringify({
			bDebug: false,
			bProfile: false,
			bLoad: false,
			bSave: true,
			bError: true
		}), { func: isJSON, forceDefaults: true }],
	bEnabled: ['Enable panel', true, { func: isBoolean }],
	matchPattern: ['File name TF format', globTags.artistAlbumTrackIdPath, { func: isString }],
	background: ['Background options', JSON.stringify(_background.defaults()), { func: isJSON, forceDefaults: true }],
	bDynamicColors: ['Adjust colors to artwork', true, { func: isBoolean }],
	bAutoUpdateCheck: ['Automatically check updates', globSettings.bAutoUpdateCheck, { func: isBoolean }],
	firstPopup: ['Seekbar: Fired once', false, { func: isBoolean }, false],
	bOnNotifyColors: ['Adjust colors on panel notify', true, { func: isBoolean }],
	bNotifyColors: ['Notify colors to other panels', false, { func: isBoolean }],
	bShowTooltip: ['Show tooltip', true, { func: isBoolean }],
	bShowExtendedTooltip: ['Show extended info at tooltip', true, { func: isBoolean }],
	bShowTooltipOnClick: ['Show tooltip only on click', false, { func: isBoolean }]
};
Object.keys(seekbarProperties).forEach(p => seekbarProperties[p].push(seekbarProperties[p][1]));
setProperties(seekbarProperties, '', 0); //This sets all the panel properties at once
seekbarProperties = getPropertiesPairs(seekbarProperties, '', 0);

{	// Delete pos property bug size
	const ui = JSON.parse(seekbarProperties.ui[1]);
	if (Object.hasOwn(ui, 'pos')) {
		console.log('Seekbar: Deleting "pos" property');
		delete ui.pos;
		seekbarProperties.ui[1] = JSON.stringify(ui);
		overwriteProperties(seekbarProperties);
	}
}

/*
	Panel background
*/
const background = new _background({
	...JSON.parse(seekbarProperties.background[1]),
	x: 0, y: 0, w: window.Width, h: window.Height,
	callbacks: {
		change: function (config, changeArgs, callbackArgs) {
			if (callbackArgs && callbackArgs.bSaveProperties) {
				['x', 'y', 'w', 'h'].forEach((key) => delete config[key]);
				seekbarProperties.background[1] = JSON.stringify(config);
				overwriteProperties(seekbarProperties);
			}
		},
		artColors: (colArray, bForced, bRepaint = true) => {
			if (!bForced && !seekbarProperties.bDynamicColors[1]) { return; }
			else if (colArray) {
				const { main, sec, note, mainAlt, secAlt } = dynamicColors(
					colArray,
					seekbar.ui.colors.bg !== -1 ? seekbar.ui.colors.bg : background.getColors()[0],
					seekbar.preset.waveMode !== 'vumeter'
				);
				if (seekbar.ui.colors.main !== -1) { seekbar.ui.colors.main = main; }
				if (seekbar.ui.colors.alt !== -1) { seekbar.ui.colors.alt = sec; }
				if (seekbar.ui.colors.currPos !== -1) {
					seekbar.ui.colors.currPos = mostContrastColor(
						seekbar.ui.colors.bg !== -1 ? seekbar.ui.colors.bg : background.getColors()[0],
						[note, blendColors(note, RGB(0, 0, 0), 0.4), blendColors(note, RGB(255, 255, 255), 0.4)]
					).color;
				}
				if (seekbar.ui.colors.mainFuture !== -1) { seekbar.ui.colors.mainFuture = mainAlt; }
				if (seekbar.ui.colors.altFuture !== -1) { seekbar.ui.colors.altFuture = secAlt; }
			} else {
				const defColors = JSON.parse(seekbarProperties.ui[1]).colors;
				for (const key in seekbar.ui.colors.colors) {
					seekbar.ui.colors[key] = defColors[key];
				}
			}
			if (bRepaint) { window.Repaint(); }
		},
		artColorsNotify: (colArray, bForced = false) => {
			if (!bForced && !seekbarProperties.bNotifyColors[1]) { return; }
			else if (colArray) {
				background.scheme = colArray;
				window.NotifyOthers('Colors: set color scheme', colArray);
			}
		}
	},
});

globProfiler.Print('settings');

/*
	Seekbar
*/
const seekbar = new _seekbar({
	matchPattern: seekbarProperties.matchPattern[1],
	binaries: JSON.parse(seekbarProperties.binaries[1]),
	analysis: JSON.parse(seekbarProperties.analysis[1], (key, value) => value === null ? Infinity : value),
	preset: JSON.parse(seekbarProperties.preset[1], (key, value) => value === null ? Infinity : value),
	ui: { ...JSON.parse(seekbarProperties.ui[1]), gFont: _gdiFont(globFonts.standardBig.name, _scale(globFonts.standardBig.size)), pos: { scaleH: 0.9, scaleW: 1 / 30 } },
	callbacks: { backgroundColor: () => background.getColors()[0] },
	logging: JSON.parse(seekbarProperties.logging[1]),
});
if (!seekbarProperties.bEnabled[1]) { seekbar.switch(); }
_menu.bindInstance(seekbar, settingsMenu);

// Helpers
seekbar.saveProperties = function () {
	const config = this.exportConfig(true);
	for (const key in config) {
		if (Object.hasOwn(seekbarProperties, key)) {
			seekbarProperties[key][1] = JSON.stringify(config[key]);
		}
	}
	overwriteProperties(seekbarProperties);
};

seekbar.shareUiSettings = function (mode = 'popup') {
	const settings = Object.fromEntries(
		['preset', 'ui', 'background', 'bDynamicColors']
			.map((key) => [key, clone(seekbarProperties[key].slice(0, 2))])
	);
	switch (mode.toLowerCase()) {
		case 'popup': {
			const keys = ['Colors', 'Preset', 'Background'];
			const answer = WshShell.Popup('Share current UI settings with other panels?\nSettings which will be copied:\n\n' + keys.join(', '), 0, window.ScriptInfo.Name + ': share UI settings', popup.question + popup.yes_no);
			if (answer === popup.yes) {
				window.NotifyOthers(window.ScriptInfo.Name + ': share UI settings', settings);
				return true;
			}
			return false;
		}
		case 'path': {
			const input = Input.string('file', folders.export + 'ui_settings_' + window.Name + '.json', 'File name name:', window.ScriptInfo.Name + ': export UI settings', folders.export + 'ui_settings.json', void (0), true) || (Input.isLastEqual ? Input.lastInput : null);
			if (input === null) { return null; }
			return _save(input, JSON.stringify(settings, null, '\t').replace(/\n/g, '\r\n'))
				? input
				: null;
		}
		default:
			return settings;
	}
};

seekbar.applyUiSettings = function (settings, bForce) {
	window.highlight = true;
	window.Repaint();
	const answer = bForce
		? popup.yes
		: WshShell.Popup('Apply current settings to highlighted panel?\nCheck UI.', 0, window.FullPanelName, popup.question + popup.yes_no);
	if (answer === popup.yes) {
		const newBg = JSON.parse(String(settings.background[1]));
		['x', 'y', 'w', 'h', 'callbacks'].forEach((key) => delete newBg[key]);
		['bDynamicColors'].forEach((key) => {
			seekbarProperties[key][1] = !!settings[key][1];
			if (Object.hasOwn(this, key)) { this[key] = seekbarProperties[key][1]; }
		});
		['preset', 'ui'].forEach((key) => {
			seekbarProperties[key][1] = String(settings[key][1]);
		});
		background.changeConfig({ config: newBg, bRepaint: false, callbackArgs: { bSaveProperties: true } });
		this.updateConfig({ preset: JSON.parse(seekbarProperties.preset[1]), ui: JSON.parse(seekbarProperties.ui[1]) });
		this.saveProperties();
	}
	window.highlight = false;
	window.Repaint();
};

seekbar.tooltip = new _tt(null);
seekbar.tooltip.SetDelayTime(3, seekbarProperties.bShowTooltipOnClick[1] ? 500 : 1500);
seekbar.tooltip.SetDelayTime(2, seekbarProperties.bShowTooltipOnClick[1] ? Infinity : 3000);

globProfiler.Print('seekbar');

// Info Popup
if (!seekbarProperties.firstPopup[1]) {
	seekbarProperties.firstPopup[1] = true;
	overwriteProperties(seekbarProperties); // Updates panel
	const readmePath = folders.xxx + 'helpers\\readme\\seekbar.txt';
	const readme = _open(readmePath, utf8);
	if (readme.length) { fb.ShowPopupMessage(readme, 'Not-A-Waveform-seekbar-SMP'); }
}

// Update check
if (seekbarProperties.bAutoUpdateCheck[1]) {
	/* global checkUpdate:readable */
	include('helpers\\helpers_xxx_web_update.js');
	setTimeout(checkUpdate, 120000, { bDownload: globSettings.bAutoUpdateDownload, bOpenWeb: globSettings.bAutoUpdateOpenWeb });
}

/*
	Callbacks
*/

const queueSelection = () => {
	if (seekbar.getPreferredTrackMode() === 'selected') {
		const handle = seekbar.getHandle();
		if (!seekbar.compareTrack(handle)) { seekbar.newTrackQueue(handle); return true; }
		else { return false; }
	}
};

addEventListener('on_size', (width, height) => {
	background.resize({ w: width, h: height, bPaint: false });
	seekbar.resize(width, height);
});

addEventListener('on_selection_changed', () => {
	if (background.useCover && (!background.coverModeOptions.bNowPlaying || !fb.IsPlaying)) {
		background.updateImageBg(void (0), void (0), seekbar.isOnDemandTrack());
	}
	queueSelection();
});

addEventListener('on_item_focus_change', () => {
	if (background.useCover && (!background.coverModeOptions.bNowPlaying || !fb.IsPlaying)) {
		background.updateImageBg(void (0), void (0), seekbar.isOnDemandTrack());
	}
	queueSelection();
});

addEventListener('on_playlist_switch', () => {
	if (background.useCover && (!background.coverModeOptions.bNowPlaying || !fb.IsPlaying)) {
		background.updateImageBg(void (0), void (0), seekbar.isOnDemandTrack());
	}
	queueSelection();
});

addEventListener('on_playlists_changed', () => { // To show/hide loaded playlist indicators...
	if (background.useCover && (!background.coverModeOptions.bNowPlaying || !fb.IsPlaying)) {
		background.updateImageBg(void (0), void (0), seekbar.isOnDemandTrack());
	}
	queueSelection();
});

addEventListener('on_playback_new_track', (handle) => {
	const bChangeTrack = seekbar.getPreferredTrackMode() === 'playing' && !seekbar.compareTrack(handle);
	if (background.useCover && background.coverModeOptions.bNowPlaying) { background.updateImageBg(void (0), void (0), bChangeTrack || seekbar.isOnDemandTrack()); }
	if (bChangeTrack) { seekbar.newTrackQueue(handle); }
});

addEventListener('on_playback_time', (time) => {
	if ((seekbar.analysis.binaryMode === 'visualizer' || seekbar.isTrackPlaying()) && !fb.IsPaused) {
		seekbar.updateTime(time);
	}
});

addEventListener('on_playback_seek', (time) => {
	if (seekbar.isTrackPlaying() || seekbar.analysis.binaryMode === 'visualizer' && !seekbar.isOnDemandTrack()) {
		seekbar.updateTime(time);
	}
});

addEventListener('on_playback_stop', (reason) => {
	if (reason !== 2) { // Invoked by user or Starting another track
		if (background.useCover && background.coverModeOptions.bNowPlaying) { background.updateImageBg(); }
	}
	if (!seekbar.isOnDemandTrack()) { seekbar.stop(reason); }
	else if (seekbar.analysis.binaryMode === 'visualizer') { seekbar.resetAnimation(); }
	queueSelection() || seekbar.updateTime(0);
});

addEventListener('on_playback_pause', (state) => {
	seekbar.pause(state);
});

addEventListener('on_paint', (gr) => {
	if (globSettings.bDebugPaint) { extendGR(gr, { Repaint: true }); }
	// Skip background if it will not be seen
	if (Math.round(seekbar.ui.transparency.bg) !== 100 || seekbar.preset.paintMode === 'partial' && Math.round(seekbar.ui.transparency.bgFuture) !== 100) {
		background.paint(gr);
	}
	seekbar.paint(gr);
	if (window.highlight) { extendGR(gr, { Highlight: true }); }
	if (window.debugPainting) { window.drawDebugRectAreas(gr); }
});

addEventListener('on_mouse_lbtn_up', (x, y, mask) => {
	seekbar.lbtnUp(x, y, mask);
});

addEventListener('on_playback_seek', (time) => { // Seeking outside panel
	if (seekbar.mx === -1 || seekbar.my === -1) {
		seekbar.updateTime(Math.round(time));
	}
});

addEventListener('on_mouse_move', (x, y, mask) => {
	if (seekbarProperties.bShowTooltip[1]) {
		if (seekbar.mx !== x || seekbar.my !== y) {
			if (!seekbarProperties.bShowTooltipOnClick[1] || utils.IsKeyPressed(MK_LBUTTON)) {
				seekbar.tooltip.tooltip.TrackPosition(x, y);
				seekbar.tooltip.SetValueDebounced(
					'Click to seek to: ' + utils.FormatDuration(seekbar.getPlaybackTimeAt(x)) + '/' + utils.FormatDuration(seekbar.getHandleLength()) + (
						seekbarProperties.bShowExtendedTooltip[1]
							? '\n' + '-'.repeat(60) +
							'\n(R. Click to open settings menu)' +
							'\n(Shift + Win + R. Click for SMP panel menu)' +
							'\n(Ctrl + Win + R. Click for script panel menu)'
							: ''
					)
				);
			} else { seekbar.tooltip.Deactivate(); }
		}
	} else { seekbar.tooltip.Deactivate(); }
	seekbar.move(x, y, mask);
});

addEventListener('on_mouse_leave', () => {
	seekbar.leave();
});

addEventListener('on_script_unload', () => {
	seekbar.unload();
});

addEventListener('on_mouse_rbtn_up', (x, y) => {
	if (utils.IsKeyPressed(VK_CONTROL) && utils.IsKeyPressed(VK_LWIN)) {
		return importSettingsMenu.call(seekbar).btn_up(x, y);
	}
	seekbar.rbtn_up(x, y);
	return true; // left shift + left windows key will bypass this callback and will open default context menu.
});

addEventListener('on_mouse_wheel', (step) => {
	if (utils.IsKeyPressed(VK_CONTROL) && utils.IsKeyPressed(VK_ALT) && seekbar.wheelResize(step)) {
		seekbar.saveProperties();
	} else {
		seekbar.wheel(step);
	}
});

addEventListener('on_mouse_wheel_h', (step) => {
	seekbar.wheel(step);
});

addEventListener('on_notify_data', (name, info) => {
	if (name === 'bio_imgChange' || name === 'bio_chkTrackRev' || name === 'xxx-scripts: panel name reply') { return; }
	switch (name) { // NOSONAR
		case window.ScriptInfo.Name + ': share UI settings': {
			if (info) { seekbar.applyUiSettings(clone(info)); }
			break;
		}
		case window.ScriptInfo.Name + ': set colors': { // Needs an array of 6 colors or an object {background, main, alt, currPos, mainFuture, altFuture}
			if (info && seekbarProperties.bOnNotifyColors[1]) {
				const colors = clone(info);
				const getColor = (key) => Object.hasOwn(colors, key) ? colors.background : colors[['background', 'main', 'alt', 'currPos', 'mainFuture', 'altFuture'].indexOf(key)];
				const hasColor = (key) => typeof getColor(key) !== 'undefined';
				if (background.colorMode !== 'none' && hasColor('background')) {
					background.changeConfig({ config: { colorModeOptions: { color: getColor('background') } }, callbackArgs: { bSaveProperties: false } });
				}
				if (seekbar.ui.colors.main !== -1 && hasColor('main')) { seekbar.ui.colors.main = getColor('main'); }
				if (seekbar.ui.colors.alt !== -1 && hasColor('alt')) { seekbar.ui.colors.alt = getColor('alt'); }
				if (seekbar.ui.colors.currPos !== -1 && hasColor('currPos')) { seekbar.ui.colors.currPos = getColor('currPos'); }
				if (seekbar.ui.colors.mainFuture !== -1 && hasColor('mainFuture')) { seekbar.ui.colors.mainFuture = getColor('mainFuture'); }
				if (seekbar.ui.colors.altFuture !== -1 && hasColor('altFuture')) { seekbar.ui.colors.altFuture = getColor('altFuture'); }
				window.Repaint();
			}
			break;
		}
		case 'Colors: set color scheme':
		case window.ScriptInfo.Name + ': set color scheme': { // Needs an array of at least 6 colors to automatically adjust dynamic colors
			if (info && seekbarProperties.bOnNotifyColors[1]) { background.callbacks.artColors(clone(info), true); }
			break;
		}
		case 'Colors: ask color scheme': {
			if (info && seekbarProperties.bNotifyColors[1] && background.scheme) {
				window.NotifyOthers(String(info), background.scheme);
			}
			break;
		}
	}
});

{
	const initHandle = seekbar.getHandle();
	if (initHandle) {
		window.Repaint();
		if (seekbar.getPreferredTrackMode() === 'selected') {
			setTimeout(() => { on_item_focus_change(); }, 0);
		} else {
			setTimeout(() => { on_playback_new_track(initHandle); }, 0);
		}
	}
}

if (seekbarProperties.bOnNotifyColors[1]) { // Ask color-servers at init
	setTimeout(() => {
		window.NotifyOthers('Colors: ask color scheme', window.ScriptInfo.Name + ': set color scheme');
		window.NotifyOthers('Colors: ask colors', window.ScriptInfo.Name + ': set colors');
	}, 1000);
}

globProfiler.Print('callbacks');