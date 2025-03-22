'use strict';
//21/03/25

if (!window.ScriptInfo.PackageId) { window.DefineScript('Not-A-Waveform-Seekbar-SMP', { author: 'regorxxx', version: '2.6.0' }); }

include('helpers\\helpers_xxx.js');
/* global folders:readable, globSettings:readable, globTags:readable, soFeat:readable, globFonts:readable, globProfiler:readable */
include('helpers\\helpers_xxx_UI.js');
/* global _scale:readable, RGB:readable, _gdiFont:readable */
include('helpers\\helpers_xxx_file.js');
/* global _open:readable, utf8:readable */
include('helpers\\helpers_xxx_prototypes.js');
/* global isJSON:readable, isBoolean:readable, deepAssign:readable, isString:readable */
include('helpers\\helpers_xxx_prototypes_smp.js');
/* global extendGR:readable */
include('helpers\\helpers_xxx_properties.js');
/* global setProperties:readable, getPropertiesPairs:readable, overwriteProperties:readable */
include('helpers\\menu_xxx.js');
/* global _menu:readable */
include('main\\seekbar\\seekbar_xxx.js');
/* global _seekbar:readable */
include('main\\seekbar\\seekbar_xxx_menu.js');
/* global createSeekbarMenu:readable */
include('helpers\\callbacks_xxx.js');
include('main\\window\\window_xxx_background.js');
/* global _background:readable */
include('main\\window\\window_xxx_dynamic_colors.js');
/* global dynamicColors:readable */

globProfiler.Print('helpers');

let seekbarProperties = {
	binaries: ['Binaries paths',
		JSON.stringify({
			ffprobe: folders.xxxRootName + 'helpers-external\\ffprobe\\ffprobe' + (soFeat.x64 ? '' : '_32') + '.exe',
			audiowaveform: folders.xxxRootName + 'helpers-external\\audiowaveform\\audiowaveform' + (soFeat.x64 ? '' : '_32') + '.exe'
		}), { func: isJSON }],
	analysis: ['Analysis config',
		JSON.stringify({
			binaryMode: 'audiowaveform',
			resolution: 2,
			compressionMode: 'utf-16',
			storeMode: 'library',
			bAutoAnalysis: true,
			bAutoRemove: false,
			bVisualizerFallback: true,
			bVisualizerFallbackAnalysis: true,
			bMultiChannel: false
		}), { func: isJSON }],
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
		}), { func: isJSON }],
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
				currPos: 100
			},
			refreshRate: 200,
			bVariableRefreshRate: true,
			bNormalizeWidth: false,
			normalizeWidth: _scale(4),
			bLogScale: true
		}), { func: isJSON }],
	bEnabled: ['Enable panel', true, { func: isBoolean }],
	matchPattern: ['File name TF format', '$lower(' +
		globTags.artistAlbumTrackTitleSanitize
			.replace(/(\[\$replace\(%ALBUM%,\$char\(92\),-\)\])/i, '$1[ {$if2($replace(%COMMENT%,\\,,/,),%MUSICBRAINZ_ALBUMID%)}]')
		+ ')', { func: isString }],
	background: ['Background options', JSON.stringify(deepAssign()(
		(new _background).defaults(),
		{ colorMode: 'bigradient', colorModeOptions: { color: [RGB(270, 270, 270), RGB(300, 300, 300)] }, coverMode: 'none' }
	)), { func: isJSON }],
	bDynamicColors: ['Adjust colors to artwork', false, { func: isBoolean }],
	bAutoUpdateCheck: ['Automatically check updates?', globSettings.bAutoUpdateCheck, { func: isBoolean }],
	firstPopup: ['Seekbar: Fired once', false, { func: isBoolean }, false],
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
	callbacks: {
		change: function (config, changeArgs, callbackArgs) {
			if (callbackArgs && callbackArgs.bSaveProperties) {
				['x', 'y', 'w', 'h'].forEach((key) => delete config[key]);
				seekbarProperties.background[1] = JSON.stringify(config);
				overwriteProperties(seekbarProperties);
			}
		},
		artColors: (colArray) => {
			if (!seekbarProperties.bDynamicColors[1]) { return; }
			if (colArray) {
				const { main, sec, note, mainAlt, secAlt } = dynamicColors(
					colArray,
					seekbar.ui.colors.bg !== -1 ? seekbar.ui.colors.bg : background.getColors()[0],
					seekbar.preset.waveMode !== 'vumeter'
				);
				if (seekbar.ui.colors.main !== -1) { seekbar.ui.colors.main = main; }
				if (seekbar.ui.colors.alt !== -1) { seekbar.ui.colors.alt = sec; }
				if (seekbar.ui.colors.currPos !== -1) { seekbar.ui.colors.currPos = note; }
				if (seekbar.ui.colors.mainFuture !== -1) { seekbar.ui.colors.mainFuture = mainAlt; }
				if (seekbar.ui.colors.altFuture !== -1) { seekbar.ui.colors.altFuture = secAlt; }
			} else {
				const defColors = JSON.parse(seekbarProperties.ui[1]).colors;
				for (const key in seekbar.ui.colors.colors) {
					seekbar.ui.colors[key] = defColors[key];
				}
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
	analysis: JSON.parse(seekbarProperties.analysis[1]),
	preset: JSON.parse(seekbarProperties.preset[1], (key, value) => { return value === null ? Infinity : value; }),
	ui: { ...JSON.parse(seekbarProperties.ui[1]), gFont: _gdiFont(globFonts.standardBig.name, _scale(globFonts.standardBig.size)), pos: { scaleH: 0.9, marginW: window.Width / 30 } },
	callbacks: { backgroundColor: () => background.getColors()[0] }
});
if (!seekbarProperties.bEnabled[1]) { seekbar.switch(); }
_menu.bindInstance(seekbar, createSeekbarMenu);

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

addEventListener('on_size', (width, height) => {
	background.resize({ w: width, h: height, bPaint: false });
	seekbar.resize(width, height);
});

addEventListener('on_selection_changed', () => {
	if (background.coverMode.toLowerCase() !== 'none' && (!background.coverModeOptions.bNowPlaying || !fb.IsPlaying)) {
		background.updateImageBg();
	}
});

addEventListener('on_item_focus_change', () => {
	if (background.coverMode.toLowerCase() !== 'none' && (!background.coverModeOptions.bNowPlaying || !fb.IsPlaying)) {
		background.updateImageBg();
	}
});

addEventListener('on_playlist_switch', () => {
	if (background.coverMode.toLowerCase() !== 'none' && (!background.coverModeOptions.bNowPlaying || !fb.IsPlaying)) {
		background.updateImageBg();
	}
});

addEventListener('on_playlists_changed', () => { // To show/hide loaded playlist indicators...
	if (background.coverMode.toLowerCase() !== 'none' && (!background.coverModeOptions.bNowPlaying || !fb.IsPlaying)) {
		background.updateImageBg();
	}
});

addEventListener('on_playback_new_track', (handle) => {
	if (background.coverMode.toLowerCase() !== 'none') { background.updateImageBg(); }
	seekbar.newTrackQueue(handle);
});

addEventListener('on_playback_time', (time) => {
	seekbar.updateTime(time);
});

addEventListener('on_playback_seek', (time) => {
	seekbar.updateTime(time);
});

addEventListener('on_playback_stop', (reason) => {
	if (reason !== 2) { // Invoked by user or Starting another track
		if (background.coverMode.toLowerCase() !== 'none' && background.coverModeOptions.bNowPlaying) { background.updateImageBg(); }
	}
	seekbar.stop(reason);
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
	if (window.debugPainting) { window.drawDebugRectAreas(gr); }
});

addEventListener('on_mouse_lbtn_up', (x, y, mask) => {
	seekbar.lbtnUp(x, y, mask);
});

addEventListener('on_mouse_move', (x, y, mask) => {
	seekbar.move(x, y, mask);
});

addEventListener('on_script_unload', () => {
	seekbar.unload();
});

addEventListener('on_mouse_rbtn_up', (x, y) => {
	seekbar.rbtn_up(x, y);
	return true; // left shift + left windows key will bypass this callback and will open default context menu.
});

addEventListener('on_mouse_wheel', (step) => {
	seekbar.wheel(step);
});

addEventListener('on_mouse_wheel_h', (step) => {
	seekbar.wheel(step);
});

if (fb.IsPlaying) { window.Repaint(); setTimeout(() => { on_playback_new_track(fb.GetNowPlaying()); seekbar.updateTime(fb.PlaybackTime); }, 0); }

globProfiler.Print('callbacks');