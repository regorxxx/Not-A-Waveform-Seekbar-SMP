'use strict';
//24/12/23

include('seekbar.js');
/* global removeEventListeners:readable, seekbar:readable, MK_SHIFT:readable, windowMenu:readable */
include('main\\seekbar\\seekbar_xxx_options.js');
/* global options:readable */

// Overwrite all callbacks from main file
// Since Ids were not stored... easier to just remove them at once
removeEventListeners([
	'on_key_down', 'on_mouse_lbtn_up', 'on_mouse_lbtn_down', 'on_mouse_lbtn_dblclk',
	'on_mouse_move', 'on_mouse_leave', 'on_mouse_rbtn_up', 'on_paint', 'on_size'
]);

addEventListener('on_key_down', (k) => {
	if (options.properties.bOptions[1]) { options.key_down(k); }
});

addEventListener('on_char', (code) => {
	if (options.properties.bOptions[1]) { options.on_char(code); }
});

addEventListener('on_mouse_lbtn_up', (x, y, mask) => {
	if (options.properties.bOptions[1]) { options.btn_up(x, y, mask); }
	else { seekbar.lbtnUp(x, y, mask); }
});

addEventListener('on_mouse_lbtn_down', (x, y, mask) => {
	if (options.properties.bOptions[1]) { options.btn_down(x, y, mask); }
});

addEventListener('on_mouse_lbtn_dblclk', (x, y) => {
	if (options.properties.bOptions[1]) { options.lbtn_dblclk(x, y); }
});

addEventListener('on_mouse_move', (x, y, mask) => {
	if (options.properties.bOptions[1]) { options.move(x, y); }
	else { seekbar.move(x, y, mask); }
});

addEventListener('on_mouse_leave', () => {
	if (options.properties.bOptions[1]) { options.leave(); }
});

addEventListener('on_mouse_rbtn_up', (x, y, mask) => {
	// Must return true, if you want to suppress the default context menu.
	// Note: left shift + left windows key will bypass this callback and will open default context menu.
	if (mask === MK_SHIFT) { return windowMenu.btn_up(x, y); }
	if (options.properties.bOptions[1]) { options.rbtn_down(x, y, mask); }
	else { seekbar.rbtn_up(x, y, mask); }
	return true;
});

addEventListener('on_paint', (gr) => {
	if (options.properties.bOptions[1]) { options.paint(gr); }
	else { seekbar.paint(gr); }
});

addEventListener('on_size', (width, height) => {
	options.resize(width, height);
	seekbar.resize(width, height);
});