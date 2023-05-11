'use strict';
//10/05/23
include('helpers\\helpers_xxx.js');
include('helpers\\helpers_xxx_UI.js');
include('helpers\\helpers_xxx_file.js');
include('helpers\\helpers_xxx_prototypes.js');
include('helpers\\helpers_xxx_properties.js');
include('main\\seekbar\\seekbar_xxx.js');
include('helpers\\callbacks_xxx.js');

if (!window.ScriptInfo.PackageId) {window.DefineScript('Not-A-Waveform-Seekbar-SMP', {author: 'XXX', version: '1.0.0-beta.2'});}

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
			paintMode: 'full',
			bPrePaint: false,
			bPaintCurrent: true,
			bUseBPM: true,
			futureSecs: Infinity
		}), {func: isJSON}],
	ui:			['UI config', 
		JSON.stringify({
			colors: {
				bg: 0xFF000000, // Black
				main: 0xFF90EE90, // LimeGreen
				alt: 0xFF7CFC00, // LawnGreen
				bgFuture: 0xFF1B1B1B, 
				mainFuture: 0xFFB7FFA2, 
				altFuture: 0xFFF9FF99, 
				currPos: 0xFFFFFFFF // White
			},
			refreshRate: 200,
			bVariableRefreshRate: true
		}), {func: isJSON}],
	bEnabled: ['Enable panel', true, {func: isBoolean}],
	matchPattern: ['File name TF format', '$lower([$replace(%ALBUM ARTIST%,\\,)]\\[$replace(%ALBUM%,\\,)][ {$if2($replace(%COMMENT%,\\,),%MUSICBRAINZ_ALBUMID%)}]\\%TRACKNUMBER% - $replace(%TITLE%,\\,))', {func: isString}]
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

const seekbar = new _seekbar({
	matchPattern: seekbarProperties.matchPattern[1],
	binaries: JSON.parse(seekbarProperties.binaries[1]),
	analysis: JSON.parse(seekbarProperties.analysis[1]),
	preset: JSON.parse(seekbarProperties.preset[1], (key, value) => {return value === null ? Infinity : value;}),
	ui: {...JSON.parse(seekbarProperties.ui[1]), gFont: _gdiFont(globFonts.standardBig.name, _scale(globFonts.standardBig.size)), pos: {scaleH: 0.9, marginW: window.Width / 30}}
});
if (!seekbarProperties.bEnabled[1]) {seekbar.switch();}

// Callbacks
addEventListener('on_size', (width, height) => {
	seekbar.resize(width, height);
});

addEventListener('on_playback_new_track', (handle) => {
	seekbar.newTrack(handle);
});

addEventListener('on_playback_time', (time) => {
	seekbar.updateTime(time);
});

addEventListener('on_playback_seek', (time) => {
	seekbar.updateTime(time);
});

addEventListener('on_playback_stop', (reason) => {
	seekbar.stop(reason);
});

addEventListener('on_paint', (gr) => {
	seekbar.paint(gr);
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

if (fb.IsPlaying) {window.Repaint(); setTimeout(() => {on_playback_new_track(fb.GetNowPlaying()); seekbar.updateTime(fb.PlaybackTime);}, 0);}

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

// Menu, requires menu framework
include('helpers\\menu_xxx.js');
include('main\\seekbar\\seekbar_xxx_menu.js');
bindMenu(seekbar);
addEventListener('on_mouse_rbtn_up', (x, y, mask) => {
	seekbar.rbtn_up(x, y, mask);
	return true; // left shift + left windows key will bypass this callback and will open default context menu.
});