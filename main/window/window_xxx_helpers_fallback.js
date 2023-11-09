'use strict';
//05/04/23

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
	on_script_unload = function() {
		oldFunc();
		onScriptUnloadTT();
	}
} else {var on_script_unload = onScriptUnloadTT;}


// Cache
const scaleDPI = {}; // Caches _scale() values;
const fonts = {}; // Caches _gdifont() values;


function _scale(size) {
	if (!scaleDPI[size]) {
		let DPI;
		try {DPI = WshShellUI.RegRead('HKCU\\Control Panel\\Desktop\\WindowMetrics\\AppliedDPI')}
		catch (e) {DPI = 96} // Fix for linux
		scaleDPI[size] = Math.round(size * DPI / 72);
	}
	return scaleDPI[size];
}

/* 
	Funcs
*/
const debounce = (fn, delay, immediate = false, parent = this) => {
	let timerId;
	return (...args) => {
		const boundFunc = fn.bind(parent, ...args);
		clearTimeout(timerId);
		if (immediate && !timerId) {boundFunc();}
		const calleeFunc = immediate ? () => {timerId = null;} : boundFunc;
		timerId = setTimeout(calleeFunc, delay);
		return timerId;
	};
};

/* 
	Tooltip
*/

function _tt(value, font = 'Segoe UI', fontSize = _scale(10), width = 1200) {
	this.tooltip = window.Tooltip;
	this.font = {name: font, size: fontSize};
	this.tooltip.SetFont(font, fontSize);
	this.width = this.tooltip.SetMaxWidth(width);
	this.text = this.tooltip.Text = value;
	this.oldDelay = this.tooltip.GetDelayTime(3); //TTDT_INITIAL
	
	this.SetValue = function (value,  bForceActivate = false) {
		if (value === null) {
			this.Deactivate();
			return;
		} else {
			if (this.tooltip.Text !== value) {
				this.text = this.tooltip.Text = value;
				this.Activate();
			}
			if (bForceActivate) {this.Activate();} // Only on force to avoid flicker
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
		this.tooltip.SetDelayTime(type, time) ;
    };
	
	this.GetDelayTime = function (type) {
		this.tooltip.GetDelayTime(type) ;
	};

}

/* 
	Colours
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

function blendColours(c1, c2, f) {
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
		: RGBA(darkenColorVal(r, percent), darkenColorVal(g, percent), darkenColorVal(b, percent), getAlpha(color));;
}

function darkenColorVal(color, percent) {
	const shift = Math.max(color * percent / 100, percent / 2);
	const val = Math.round(color - shift);
	return Math.max(val, 0);
}
function lightenColorVal(color, percent) {
	const val = Math.round(color + ((255-color) * (percent / 100)));
	return Math.min(val, 255);
}

function getBrightness(r, g, b) { // https://www.w3.org/TR/AERT/#color-contrast
	return (r * 0.299 + g * 0.587 + b * 0.114);
}

function isDark(r, g, b) {
	return (getBrightness(r,g,b) < 186);
}

/* 
	Fonts
*/

function _gdiFont(name, size, style) {
	let id = name.toLowerCase() + '_' + size + '_' + (style || 0);
	if (!fonts[id]) {
		fonts[id] = gdi.Font(name, size, style || 0);
	}
	if (fonts[id].Name !== name) {console.log('Missing font: ' + name);}
	return fonts[id];
}

function _textWidth(value, font) {
	return _gr.CalcTextWidth(value, font);
}

/* 
	Objects
*/
function clone(obj) {
	const raw = new Set(['function', 'number', 'boolean', 'string']);
	if (raw.has(typeof obj)) {return obj;}
	let result;
	if (obj instanceof Set) {
		result = new Set();
		for (let value of obj) {
			// include prototype properties
			let type = {}.toString.call(value).slice(8, -1);
			if (type === 'Array' || type === 'Object') {
				result.add(clone(value));
			} else if (type === 'Date') {
				result.add(new Date(value.getTime()));
			} else if (type === 'RegExp') {
				result.add(RegExp(value.source, getRegExpFlags(value)));
			} else {
				result.add(value);
			}
		}
		return result;
	} else if (obj instanceof Map) {
		result = new Map();
		for (let [key, value] of obj) {
			// include prototype properties
			let type = {}.toString.call(value).slice(8, -1);
			if (type === 'Array' || type === 'Object') {
				result.set(key, clone(value));
			} else if (type === 'Date') {
				result.set(key, new Date(value.getTime()));
			} else if (type === 'RegExp') {
				result.set(key, RegExp(value.source, getRegExpFlags(value)));
			} else {
				result.set(key, value);
			}
		}
		return result;
	} else {
		result = Array.isArray(obj) ? [] : {};
		for (let key in obj) {
			// include prototype properties
			let value = obj[key];
			let type = {}.toString.call(value).slice(8, -1);
			if (type === 'Array' || type === 'Object') {
				result[key] = clone(value);
			} else if (type === 'Date') {
				result[key] = new Date(value.getTime());
			} else if (type === 'RegExp') {
				result[key] = RegExp(value.source, getRegExpFlags(value));
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

function setNested(obj, value, ...args) => {
	const len = args.length - 1;
	return args.reduce((obj, level, idx) => {
		if (obj && len === idx && obj.hasOwnProperty(level)) {obj[level] = value;}
		return obj && obj[level];
	}, obj);
	return obj;
}

/* 
	Num
*/

Math.randomNum = function randomNum(min, max, options = {integer: false, includeMax: false}) {
	if (options.integer) {
		min = Math.ceil(min);
		max = Math.floor(max) + (options.includeMax ? 1 : 0);
		return (Math.random() * (max - min) | 0) + min;
	} else {
		return Math.random() * (max - min + (options.includeMax ? 1 : 0)) + min;
	}
}