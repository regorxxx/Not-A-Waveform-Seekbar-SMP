'use strict';
//07/08/25

/* exported fso, debounce, _tt, blendColors, lightenColor, darkenColor, tintColor, opaqueColor, _gdiFont, _textWidth, clone, getNested, setNested, _resolvePath */

/*
	Global Variables
*/

const fso = new ActiveXObject('Scripting.FileSystemObject');
const WshShellUI = new ActiveXObject('WScript.Shell');
const _bmp = gdi.CreateImage(1, 1);
const _gr = _bmp.GetGraphics();

// Callbacks: append to any previously existing callback
function onScriptUnloadTT() {
	window.Tooltip.Deactivate();
}
if (on_script_unload) {
	const oldFunc = on_script_unload;
	on_script_unload = () => {
		oldFunc();
		onScriptUnloadTT();
	};
	// eslint-disable-next-line no-redeclare
} else { var on_script_unload = onScriptUnloadTT; } // NOSONAR


// Cache
const scaleDPI = { factor: -1, reference: 72 }; // Caches _scale() values;
const fonts = { notFound: [] }; // Caches _gdiFont() values;iFont() values;


function _scale(size, bRound = true) {
	if (scaleDPI.factor === -1) {
		if (typeof window.DPI === 'number') {
			scaleDPI.factor = window.DPI / scaleDPI.reference;
		} else {
			try {
				scaleDPI.factor = Number(WshShellUI.RegRead('HKCU\\Control Panel\\Desktop\\WindowMetrics\\AppliedDPI')) / scaleDPI.reference;
			} catch (e) { // eslint-disable-line no-unused-vars
				try {
					scaleDPI.factor = Number(WshShellUI.RegRead('HKCU\\Control Panel\\Desktop\\LogPixels')) / scaleDPI.reference;
				} catch (e) { // eslint-disable-line no-unused-vars
					try {
						scaleDPI.factor = Number(WshShellUI.RegRead('HKCU\\Software\\System\\CurrentControlSet\\Hardware Profiles\\Current\\Software\\Fonts\\LogPixels')) / scaleDPI.reference;
					} catch (e) { // eslint-disable-line no-unused-vars
						try {
							scaleDPI.factor = Number(WshShellUI.RegRead('HKLM\\Software\\Microsoft\\Windows NT\\CurrentVersion\\FontDPI\\LogPixels')) / scaleDPI.reference;
						} catch (e) { // eslint-disable-line no-unused-vars
							try {
								scaleDPI.factor = Number(WshShellUI.RegRead('HKLM\\System\\CurrentControlSet\\Hardware Profiles\\Current\\Software\\Fonts\\LogPixels')) / scaleDPI.reference;
							} catch (e) { // eslint-disable-line no-unused-vars
								scaleDPI.factor = 1;
							}
						}
					}
				}
			}
		}
	}
	return (bRound ? Math.round(size * scaleDPI.factor) : size * scaleDPI.factor);
}

/*
	Funcs
*/
const debounce = (fn, delay, immediate = false, parent = this) => {
	let timerId;
	return (...args) => {
		const boundFunc = fn.bind(parent, ...args);
		clearTimeout(timerId);
		if (immediate && !timerId) { boundFunc(); }
		const calleeFunc = immediate ? () => { timerId = null; } : boundFunc;
		timerId = setTimeout(calleeFunc, delay);
		return timerId;
	};
};

/*
	Files
*/
function _resolvePath(path) {
	if (path.startsWith('.\\profile\\')) { path = path.replace('.\\profile\\', fb.ProfilePath); }
	else if (path.startsWith('.\\')) { path = path.replace('.\\', fb.FoobarPath); }
	return path;
}

/*
	Tooltip
*/

function _tt(value, font = 'Segoe UI', fontSize = _scale(10), width = 1200) {
	this.tooltip = window.Tooltip;
	this.font = { name: font, size: fontSize };
	this.tooltip.SetFont(font, fontSize);
	this.width = this.tooltip.SetMaxWidth(width);
	this.text = this.tooltip.Text = value;
	this.oldDelay = this.tooltip.GetDelayTime(3); //TTDT_INITIAL

	this.SetValue = function (value, bForceActivate = false) {
		if (value === null) {
			this.Deactivate();
		} else {
			if (this.tooltip.Text !== value) {
				this.text = this.tooltip.Text = value;
				this.Activate();
			}
			if (bForceActivate) { this.Activate(); } // Only on force to avoid flicker
		}
	};

	this.SetFont = function (font_name, font_size_pxopt, font_styleopt) {
		this.tooltip.SetFont(font_name, font_size_pxopt, font_styleopt);
	};

	this.SetMaxWidth = function (width) {
		this.tooltip.SetMaxWidth(width);
	};

	this.Activate = function () {
		this.tooltip.Activate();
	};

	this.Deactivate = function () {
		this.tooltip.Deactivate();
	};

	this.SetDelayTime = function (type, time) {
		this.tooltip.SetDelayTime(type, time);
	};

	this.GetDelayTime = function (type) {
		this.tooltip.GetDelayTime(type);
	};

}

/*
	Colors
*/

function RGBA(r, g, b, a) {
	return ((a << 24) | (r << 16) | (g << 8) | (b));
}

function RGB(r, g, b) {
	return (0xff000000 | (r << 16) | (g << 8) | (b));
}

function toRGB(col) { // returns an array like [192, 0, 0]
	const a = col - 0xFF000000;
	return [a >> 16, a >> 8 & 0xFF, a & 0xFF];
}

function blendColors(c1, c2, f) {
	// When factor is 0, result is 100% color1, when factor is 1, result is 100% color2.
	c1 = toRGB(c1);
	c2 = toRGB(c2);
	const r = Math.round(c1[0] + f * (c2[0] - c1[0]));
	const g = Math.round(c1[1] + f * (c2[1] - c1[1]));
	const b = Math.round(c1[2] + f * (c2[2] - c1[2]));
	return RGB(r, g, b);
}

function getAlpha(col) {
	return ((col >> 24) & 0xff);
}

function getRed(col) {
	return ((col >> 16) & 0xff);
}

function getGreen(col) {
	return ((col >> 8) & 0xff);
}

function getBlue(col) {
	return (col & 0xff);
}

function lightenColor(color, percent) {
	const [r, g, b] = [getRed(color), getGreen(color), getBlue(color)];
	return RGBA(lightenColorVal(r, percent), lightenColorVal(g, percent), lightenColorVal(b, percent), getAlpha(color));
}

function darkenColor(color, percent) {
	const [r, g, b] = [getRed(color), getGreen(color), getBlue(color)];
	return RGBA(darkenColorVal(r, percent), darkenColorVal(g, percent), darkenColorVal(b, percent), getAlpha(color));
}

function tintColor(color, percent) {
	const [r, g, b] = [getRed(color), getGreen(color), getBlue(color)];
	return isDark(r, g, b)
		? RGBA(lightenColorVal(r, percent), lightenColorVal(g, percent), lightenColorVal(b, percent), getAlpha(color))
		: RGBA(darkenColorVal(r, percent), darkenColorVal(g, percent), darkenColorVal(b, percent), getAlpha(color));
}

function darkenColorVal(color, percent) {
	const shift = Math.max(color * percent / 100, percent / 2);
	const val = Math.round(color - shift);
	return Math.max(val, 0);
}
function lightenColorVal(color, percent) {
	const val = Math.round(color + ((255 - color) * (percent / 100)));
	return Math.min(val, 255);
}

function opaqueColor(color, percent) {
	return RGBA(...toRGB(color), Math.min(255, 255 * (percent / 100)));
}

function getBrightness(r, g, b) { // https://www.w3.org/TR/AERT/#color-contrast
	return (r * 0.299 + g * 0.587 + b * 0.114);
}

function isDark(r, g, b) {
	return (getBrightness(r, g, b) < 186);
}

/*
	Fonts
*/

function _gdiFont(name, size, style) {
	const id = name.toLowerCase() + '_' + size + '_' + (style || 0);
	if (!fonts[id]) {
		fonts[id] = gdi.Font(name, size, style || 0);
	}
	if (fonts[id].Name !== name) { console.log('Missing font: ' + name); }
	return fonts[id];
}

function _textWidth(value, font) {
	return _gr.CalcTextWidth(value, font);
}

/*
	Objects
*/
function clone(obj) {
	const raw = new Set(['function', 'number', 'boolean', 'string', 'undefined']);
	if (raw.has(typeof obj) || obj === null) { return obj; }
	let result;
	if (obj instanceof Set) {
		result = new Set();
		for (const value of obj) {
			// include prototype properties
			const type = {}.toString.call(value).slice(8, -1);
			if (type === 'Array' || type === 'Object') {
				result.add(clone(value));
			} else if (type === 'Date') {
				result.add(new Date(value.getTime()));
			} else if (type === 'RegExp') {
				result.add(RegExp(value.source, value.flags));
			} else {
				result.add(value);
			}
		}
		return result;
	} else if (obj instanceof Map) {
		result = new Map();
		for (let [key, value] of obj) {
			// include prototype properties
			const type = {}.toString.call(value).slice(8, -1);
			if (type === 'Array' || type === 'Object') {
				result.set(key, clone(value));
			} else if (type === 'Date') {
				result.set(key, new Date(value.getTime()));
			} else if (type === 'RegExp') {
				result.set(key, RegExp(value.source, value.flags));
			} else {
				result.set(key, value);
			}
		}
		return result;
	} else {
		result = Array.isArray(obj) ? [] : {};
		for (const key in obj) {
			// include prototype properties
			const value = obj[key];
			const type = {}.toString.call(value).slice(8, -1);
			if (type === 'Array' || type === 'Object') {
				result[key] = clone(value);
			} else if (type === 'Date') {
				result[key] = new Date(value.getTime());
			} else if (type === 'RegExp') {
				result[key] = RegExp(value.source, value.flags);
			} else {
				result[key] = value;
			}
		}
	}
	return result;
}

function getNested(obj, ...args) {
	return args.reduce((obj, level) => obj && obj[level], obj);
}

function setNested(obj, value, ...args) {
	const len = args.length - 1;
	return args.reduce((obj, level, idx) => {
		if (obj && len === idx && Object.hasOwn(obj, level)) { obj[level] = value; }
		return obj && obj[level];
	}, obj);
}

// Add ES2022 method
// https://github.com/tc39/proposal-accessible-object-hasownproperty
if (!Object.hasOwn) {
	Object.defineProperty(Object, 'hasOwn', {
		enumerable: false,
		configurable: false,
		writable: false,
		value: function (object, property) {
			if (object === null) {
				throw new TypeError('Cannot convert undefined or null to object');
			}
			return Object.prototype.hasOwnProperty.call(Object(object), property); // NOSONAR
		}
	});
}

/*
	Num
*/

Math.randomNum = function randomNum(min, max, options = { integer: false, includeMax: false }) {
	if (options.integer) {
		min = Math.ceil(min);
		max = Math.floor(max) + (options.includeMax ? 1 : 0);
		return (Math.random() * (max - min) | 0) + min;
	} else {
		return Math.random() * (max - min + (options.includeMax ? 1 : 0)) + min;
	}
};