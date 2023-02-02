'use strict';
//02/02/23
include('main\\seekbar\\seekbar_xxx_helper.js');
include('main\\seekbar\\seekbar_xxx.js');
include('helpers\\callbacks_xxx.js'); // Not needed if event listeners below are implemented as callbacks

window.DefineScript('Not-A-Waveform-Seekbar-SMP', {author: 'XXX', version: '1.0.0'});

const arch = 'x64'; // No need once path is manually set...
const seekbar = new _seekbar({
	binaries: {
		ffprobe: arch === 'x64' // Should be set by user to not hard-code paths
			? fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers-external\\ffprobe\\ffprobe.exe'
			: fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers-external\\ffprobe\\ffprobe_32.exe',
		audiowaveform: arch === 'x64'
			? fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers-external\\audiowaveform\\audiowaveform.exe'
			: fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers-external\\audiowaveform\\audiowaveform_32.exe'
	},
	analysis: {
		binaryMode: 'audiowaveform',
		compressionMode: 'utf-16',
		bAutoRemove: false
	},
	preset: {
		waveMode: 'waveform',
		paintMode: 'full'
	},
	ui: {
		x: 0,
		w: window.Width,
		scaleH: 0.9,
		refreshRate: 200,
		bVariableRefreshRate: false
	}
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

// Menu, requires menu framework
include('main\\seekbar\\seekbar_xxx_menu.js');
bindMenu(seekbar);
addEventListener('on_mouse_rbtn_up', (x, y, mask) => {
	seekbar.rbtn_up(x, y, mask);
	return true; // left shift + left windows key will bypass this callback and will open default context menu.
});

if (fb.IsPlaying) {window.Repaint(); setTimeout(() => {on_playback_new_track(fb.GetNowPlaying()); seekbar.updateTime(fb.PlaybackTime);}, 0);}