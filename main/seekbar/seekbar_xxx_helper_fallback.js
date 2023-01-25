'use strict';
//24/01/23

/* 
	helpers_xxx_prototypes.js
*/
function _q(value) {
	return '"' + value + '"';
}

function round(floatnum, decimals, eps = 10**-14) {
	let result;
	if (decimals > 0) {
		if (decimals === 15) {result = floatnum;}
		else {result = Math.round(floatnum * Math.pow(10, decimals) + eps) / Math.pow(10, decimals);}
	} else {result =  Math.round(floatnum);}
	return result;
}

/* 
	helpers_xxx_basic_js.js
*/
function tryMethod(fn, parent) {
	return (...args) => {
		let cache;
		try {cache = parent[fn](...args);} catch(e) {/* continue regardless of error */}
		return cache;
	};
}

/* 
	helpers_xxx_file.js
*/
const WshShell = new ActiveXObject('WScript.Shell');
const fso = new ActiveXObject('Scripting.FileSystemObject');

function _runCmd(command, bWait) {
	try {
		WshShell.Run(command, 0, bWait);
		return true;
	} catch (e) {
		console.log('_runCmd(): failed to run command ' + command + '(' + e + ')');
		return false;
	}
}

function _createFolder(folder) { // Creates complete dir tree if needed up to the final folder
	if (!folder.length) {return false;}
	if (!_isFolder(folder)) {
		if (folder.startsWith('.\\')) {folder = fb.FoobarPath + folder.replace('.\\','');}
		const subFolders = folder.split('\\').map((_, i, arr) => {return i ? arr.slice(0, i).reduce((path, name) => {return path + '\\' + name;}) : _;});
		subFolders.forEach((path) => {
			try {
				fso.CreateFolder(path);
			} catch (e) {
				return false;
			}
		});
		return _isFolder(folder);
	}
	return false;
}

function _open(file, codePage = 0) {
	if (_isFile(file)) {
		if (file.startsWith('.\\')) {file = fb.FoobarPath + file.replace('.\\','');}
		return tryMethod('ReadTextFile', utils)(file, codePage) || '';  // Bypasses crash on file locked by other process
	} else {
		return '';
	}
}

function _save(file, value, bBOM = false) {
	if (file.startsWith('.\\')) {file = fb.FoobarPath + file.replace('.\\','');}
	const filePath = utils.SplitFilePath(file)[0];
	if (!_isFolder(filePath)) {_createFolder(filePath);}
	if (_isFolder(filePath) && utils.WriteTextFile(file, value, bBOM)) {
		return true;
	}
	console.log('Error saving to ' + file);
	return false;
}

function _deleteFile(file, bForce = true) {
	if (_isFile(file)) {
		if (file.startsWith('.\\')) {file = fb.FoobarPath + file.replace('.\\','');}
		try {
			fso.DeleteFile(file, bForce);
		} catch (e) {
			return false;
		}
		return !(_isFile(file));
	}
	return false;
}

function _jsonParse(value) {
	try {
		let data = JSON.parse(value);
		return data;
	} catch (e) {
		return null;
	}
}

function _jsonParseFile(file, codePage = 0) {
	return _jsonParse(_open(file, codePage));
}

function _isFile(file) {
	try {return utils.IsFile(file);} catch (e) {return false;}
}

function _isFolder(folder) {
	try {return utils.IsDirectory(folder);} catch (e) {return false;} 
}

/* 
	helpers_xxx_UI.js 
*/
// Cache
const scaleDPI = {}; // Caches _scale() values;
const fonts = {notFound: []}; // Caches _gdifont() values;

function _scale(size, bRound = true) {
	if (!scaleDPI[size]) {
		let DPI;
		try {DPI = WshShell.RegRead('HKCU\\Control Panel\\Desktop\\WindowMetrics\\AppliedDPI');}
		catch (e) {DPI = 96;} // Fix for linux
		scaleDPI[size] = size * DPI / 72;
	}
	return (bRound ? Math.round(scaleDPI[size]) : scaleDPI[size]);
}

function _gdiFont(name, size, style) {
	let id = name.toLowerCase() + '_' + size + '_' + (style || 0);
	if (!fonts[id]) {
		fonts[id] = gdi.Font(name, size, style || 0);
	}
	if (fonts[id].Name !== name && fonts.notFound.indexOf(name) === -1) { // Display once per session, otherwise it floods the console with the same message...
		fonts.notFound.push(name);
		fb.ShowPopupMessage('Missing font: ' + name + '\n\nPlease install dependency found at:\n' + folders.xxx + '_resources', window.Name);
		console.log('Missing font: ' + name);
	}
	return fonts[id];
}

// These ones not used yet, meant to be used on final release (specially to make the waveform prettier with transparencies).
function _tt(value, font = 'Segoe UI', fontSize = _scale(10), width = 600) {
	this.tooltip = window.Tooltip;
	this.font = {name: font, size: fontSize};
	this.tooltip.SetFont(font, fontSize);
	this.width = width;
	this.tooltip.SetMaxWidth(width);
	this.text = this.tooltip.Text = value;
	this.oldDelay = this.tooltip.GetDelayTime(3); //TTDT_INITIAL
	this.bActive = false;
	
	this.SetValue = function (value,  bForceActivate = false) {
		if (value === null) {
			this.Deactivate();
			return;
		} else {
			if (this.tooltip.Text !== value) {
				this.tooltip.Text = value;
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
		this.bActive = true;
	};
	
	this.Deactivate = function () {
		this.tooltip.Deactivate();
		this.bActive = false;
	};
	
	this.SetDelayTime = function (type, time) {
		this.tooltip.SetDelayTime(type, time) ;
    };
	
	this.GetDelayTime = function (type) {
		this.tooltip.GetDelayTime(type) ;
	};

}

function RGB(r, g, b) {
	return (0xff000000 | (r << 16) | (g << 8) | (b));
}

function RGBA(r, g, b, a) {
	let res = 0xff000000 | (r << 16) | (g << 8) | (b);
	if (typeof a !== 'undefined') {res = (res & 0x00ffffff) | (a << 24);}
	return res;
}

function toRGB(color) { // returns an array like [192, 0, 0]
	const a = color - 0xFF000000;
	return [a >> 16, a >> 8 & 0xFF, a & 0xFF];
}

function getAlpha(color) {
	return ((color >> 24) & 0xff);
}

function getRed(color) {
	return ((color >> 16) & 0xff);
}

function getGreen(color) {
	return ((color >> 8) & 0xff);
}

function getBlue(color) {
	return (color & 0xff);
}

function getBrightness(r, g, b) { // https://www.w3.org/TR/AERT/#color-contrast
	return (r * 0.299 + g * 0.587 + b * 0.114);
}

function isDark(r, g, b) {
	return (getBrightness(r,g,b) < 186);
}

function invert(color, bBW = false) {
	const [r, g, b] = [getRed(color), getGreen(color), getBlue(color)];
	if (bBW) {
		return (isDark(r, g, b) ? RGB(255, 255, 255) : RGB(0, 0, 0));
	} else {
		return RGB(255 - r, 255 - g, 255 - b);
	}
}