'use strict';
//18/02/23
include('helpers\\helpers_xxx.js');
include('helpers\\helpers_xxx_UI.js');
include('helpers\\helpers_xxx_file.js');
include('helpers\\helpers_xxx_prototypes.js');
include('helpers\\helpers_xxx_properties.js');
include('main\\seekbar\\seekbar_xxx.js');
include('helpers\\callbacks_xxx.js');

window.DefineScript('Not-A-Waveform-Seekbar-SMP', {author: 'XXX', version: '1.0.0'});

let seekbarProperties = {
	binaries:	['Binaries paths', 
		JSON.stringify({
			ffprobe: fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers-external\\ffprobe\\ffprobe' + (soFeat.x64 ? '' : '_32') + '.exe',
			audiowaveform: fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers-external\\audiowaveform\\audiowaveform' + (soFeat.x64 ? '' : '_32') + '.exe'
		}), {func: isJSON}],
	analysis:	['Analysis config', 
		JSON.stringify({
			binaryMode: 'audiowaveform',
			resolution: 1,
			compressionMode: 'utf-16',
			bAutoAnalysis: true,
			bAutoRemove: false,
			bVisualizerFallback: true
		}), {func: isJSON}],
	preset:		['Preset config',
		JSON.stringify({
			waveMode: 'waveform',
			paintMode: 'full',
			bPaintFuture: false,
			bPaintCurrent: true
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
		}), {func: isJSON}]
};
Object.keys(seekbarProperties).forEach(p => seekbarProperties[p].push(seekbarProperties[p][1]))
setProperties(seekbarProperties, '', 0); //This sets all the panel properties at once
seekbarProperties = getPropertiesPairs(seekbarProperties, '', 0);

const seekbar = new _seekbar({
	binaries: JSON.parse(seekbarProperties.binaries[1]),
	analysis: JSON.parse(seekbarProperties.analysis[1]),
	preset: JSON.parse(seekbarProperties.preset[1]),
	ui: JSON.parse(seekbarProperties.ui[1])
});

// Callbacks
addEventListener('on_size', (width, height) => {
	seekbar.w = window.Width;
	seekbar.h = window.Height;
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
	const config = this.exportConfig();
	for (let key in config) {
		if (seekbarProperties.hasOwnProperty(key)) {seekbarProperties[key][1] = JSON.stringify(config[key]);}
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