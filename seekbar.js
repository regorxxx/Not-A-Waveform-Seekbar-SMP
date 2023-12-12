'use strict';
//12/12/23

include('helpers\\helpers_xxx.js');
include('helpers\\helpers_xxx_UI.js');
include('helpers\\helpers_xxx_file.js');
include('helpers\\helpers_xxx_prototypes.js');
include('helpers\\helpers_xxx_properties.js');
include('helpers\\menu_xxx.js');
include('main\\seekbar\\seekbar_xxx.js');
include('main\\seekbar\\seekbar_xxx_menu.js');
include('helpers\\callbacks_xxx.js');
include('main\\window\\window_xxx_background.js');

if (!window.ScriptInfo.PackageId) {window.DefineScript('Not-A-Waveform-Seekbar-SMP', {author: 'regorxxx', version: '1.4.0'});}

let seekbarProperties = {
	binaries:	['Binaries paths', 
		JSON.stringify({
			ffprobe: folders.xxx + '\\helpers-external\\ffprobe\\ffprobe' + (soFeat.x64 ? '' : '_32') + '.exe',
			audiowaveform: folders.xxx + '\\helpers-external\\audiowaveform\\audiowaveform' + (soFeat.x64 ? '' : '_32') + '.exe'
		}), {func: isJSON}],
	analysis:	['Analysis config', 
		JSON.stringify({
			binaryMode: 'audiowaveform',
			resolution: 1,
			compressionMode: 'utf-16',
			bAutoAnalysis: true,
			bAutoRemove: false,
			bVisualizerFallback: true,
			bVisualizerFallbackAnalysis: true
		}), {func: isJSON}],
	preset:		['Preset config',
		JSON.stringify({
			analysisMode: 'peak_level',
			waveMode: 'waveform',
			paintMode: 'partial',
			bPrePaint: true,
			bPaintCurrent: true,
			bAnimate: true,
			bUseBPM: true,
			futureSecs: Infinity,
			bHalfBarsShowNeg: true
		}), {func: isJSON}],
	ui:			['UI config', 
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
			normalizeWidth: _scale(4)
		}), {func: isJSON}],
	bEnabled: ['Enable panel', true, {func: isBoolean}],
	matchPattern: ['File name TF format', '$lower([$replace(%ALBUM ARTIST%,\\,)]\\[$replace(%ALBUM%,\\,)][ {$if2($replace(%COMMENT%,\\,),%MUSICBRAINZ_ALBUMID%)}]\\%TRACKNUMBER% - $replace(%TITLE%,\\,))', {func: isString}],
	bAutoUpdateCheck: ['Automatically check updates?', globSettings.bAutoUpdateCheck, {func: isBoolean}],
	background:	['Background options', JSON.stringify(deepAssign()(
		(new _background).defaults(), 
		{colorMode: 'bigradient', colorModeOptions: {color: [RGB(270,270,270), RGB(300,300,300)]}, coverMode: 'none'}
	)), {func: isJSON}],
};
Object.keys(seekbarProperties).forEach(p => seekbarProperties[p].push(seekbarProperties[p][1]))
setProperties(seekbarProperties, '', 0); //This sets all the panel properties at once
seekbarProperties = getPropertiesPairs(seekbarProperties, '', 0);

{	// Delete pos property bug size
	const ui = JSON.parse(seekbarProperties.ui[1]);
	if (ui.hasOwnProperty('pos')) {
		console.log('Seekbar: Deleting "pos" property');
		delete ui.pos;
		seekbarProperties.ui[1] = JSON.stringify(ui);
		overwriteProperties(seekbarProperties);
	}
}

// Rename paths according to package folder (for portable installs)
if (folders.JsPackageDirs || _isFile(fb.FoobarPath + 'portable_mode_enabled')) {
	const binaries = JSON.parse(seekbarProperties.binaries[1]);
	const defBinaries = JSON.parse(seekbarProperties.binaries[3]);
	let bDone = false;
	for (let key in binaries) {
		if (!_isFile(binaries[key]) && _isFile(defBinaries[key])) {
			binaries[key] = defBinaries[key]; 
			bDone = true;
		}
	}
	if (bDone) {
		seekbarProperties.binaries[1] = JSON.stringify(binaries);
		overwriteProperties(seekbarProperties);
	}
}

/* 
	Panel background
*/
const background = new _background({
	...JSON.parse(seekbarProperties.background[1]),
	callbacks: {
		change: function(config, changeArgs, callbackArgs) {
			if (callbackArgs && callbackArgs.bSaveProperties) {
				['x', 'y', 'w', 'h'].forEach((key) => delete config[key]);
				seekbarProperties.background[1] = JSON.stringify(config);
				overwriteProperties(seekbarProperties);
			}
		},
	},
});

/* 
	Seekbar
*/
const seekbar = new _seekbar({
	matchPattern: seekbarProperties.matchPattern[1],
	binaries: JSON.parse(seekbarProperties.binaries[1]),
	analysis: JSON.parse(seekbarProperties.analysis[1]),
	preset: JSON.parse(seekbarProperties.preset[1], (key, value) => {return value === null ? Infinity : value;}),
	ui: {...JSON.parse(seekbarProperties.ui[1]), gFont: _gdiFont(globFonts.standardBig.name, _scale(globFonts.standardBig.size)), pos: {scaleH: 0.9, marginW: window.Width / 30}},
	callbacks: {backgroundColor: background.getColors}
});
if (!seekbarProperties.bEnabled[1]) {seekbar.switch();}
bindMenu(seekbar);

// Helpers
seekbar.saveProperties = function() {
	const config = this.exportConfig(true);
	for (let key in config) {
		if (seekbarProperties.hasOwnProperty(key)) {
			seekbarProperties[key][1] = JSON.stringify(config[key]);
		}
	}
	overwriteProperties(seekbarProperties);
};

// Update check
if (seekbarProperties.bAutoUpdateCheck[1]) {
	include('helpers\\helpers_xxx_web_update.js');
	setTimeout(checkUpdate, 120000, {bDownload: globSettings.bAutoUpdateDownload, bOpenWeb: globSettings.bAutoUpdateOpenWeb});
}

/* 
	Callbacks
*/

addEventListener('on_size', (width, height) => {
	background.resize({w: width, h: height, bPaint: false});
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
	if (background.coverMode.toLowerCase() !== 'none') {background.updateImageBg();}
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
		if (background.coverMode.toLowerCase() !== 'none' && background.coverModeOptions.bNowPlaying) {background.updateImageBg();}
	}
	seekbar.stop(reason);
});

addEventListener('on_paint', (gr) => {
	// extendGR(gr, {Repaint: true}); // helpers_xxx_prototypes_smp.js
	// Skip background if it will not be seen
	if (Math.round(seekbar.ui.transparency.bg) !== 100 || seekbar.preset.paintMode === 'partial' && Math.round(seekbar.ui.transparency.bgFuture) !== 100) {
		background.paint(gr);
	}
	seekbar.paint(gr);
	if (window.debugPainting) {window.drawDebugRectAreas(gr);}
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

addEventListener('on_mouse_rbtn_up', (x, y, mask) => {
	seekbar.rbtn_up(x, y, ['sep', createBackgroundMenu.call(background, {menuName: 'Background...'}, void(0), {nameColors: true})]);
	return true; // left shift + left windows key will bypass this callback and will open default context menu.
});

if (fb.IsPlaying) {window.Repaint(); setTimeout(() => {on_playback_new_track(fb.GetNowPlaying()); seekbar.updateTime(fb.PlaybackTime);}, 0);}