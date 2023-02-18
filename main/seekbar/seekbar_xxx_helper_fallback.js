'use strict';
//02/02/23

/* 
	helpers_xxx_prototypes.js
*/
// deepAssign()(x,y)
function deepAssign(options = {nonEnum: false, symbols: false, descriptors: false, proto: false}) {
	return function deepAssignWithOptions (target, ...sources) {
		sources.forEach( (source) => {
			if (!isDeepObject(source) || !isDeepObject(target)){return;}
			// Copy source's own properties into target's own properties
			function copyProperty(property) {
				const descriptor = Object.getOwnPropertyDescriptor(source, property);
				//default: omit non-enumerable properties
				if (descriptor.enumerable || options.nonEnum) {
					// Copy in-depth first
					if (isDeepObject(source[property]) && isDeepObject(target[property])) {
						descriptor.value = deepAssign(options)(target[property], source[property]);
					}
					//default: omit descriptors
					if (options.descriptors) {
						Object.defineProperty(target, property, descriptor); // shallow copy descriptor
					} else {
						target[property] = descriptor.value; // shallow copy value only
					}
				}
			}
			// Copy string-keyed properties
			Object.getOwnPropertyNames(source).forEach(copyProperty);
			//default: omit symbol-keyed properties
			if (options.symbols) {
				Object.getOwnPropertySymbols(source).forEach(copyProperty);
			}
			//default: omit prototype's own properties
			if (options.proto) {
				// Copy souce prototype's own properties into target prototype's own properties
				deepAssign(Object.assign({},options,{proto:false})) (// Prevent deeper copy of the prototype chain
					Object.getPrototypeOf(target),
					Object.getPrototypeOf(source)
				);
			}
		});
		return target;
	}
}

function toType(a) {
	// Get fine type (object, array, function, null, error, date ...)
	return ({}).toString.call(a).match(/([a-z]+)(:?\])/i)[1];
}

function isDeepObject(obj) {
	return "Object" === toType(obj);
}

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

const throttle = (fn, delay, immediate = false, parent = this) => {
	let timerId;
	return (...args) => {
		const boundFunc = fn.bind(parent, ...args);
		if (timerId) {return;}
		if (immediate && !timerId) {boundFunc();}
		timerId = setTimeout(() => {
			if(!immediate) {
				boundFunc(); 
			}
			timerId = null; 
		}, delay);
	};
};

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

function sanitizePath(value) { // Sanitize illegal chars but skip drive
	if (!value || !value.length) {return '';}
	const disk = (value.match(/^\w:\\/g) || [''])[0];
	return disk + (disk && disk.length ? value.replace(disk, '') : value).replace(/[\/]/g, '\\').replace(/[|–]/g, '-').replace(/\*/g, 'x').replace(/"/g, '\'\'').replace(/[<>]/g, '_').replace(/[\?:]/g, '').replace(/(?! )\s/g, '');
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

function _saveFSO(file, value, bUTF16) {
	if (file.startsWith('.\\')) {file = fb.FoobarPath + file.replace('.\\','');}
	const filePath = utils.SplitFilePath(file)[0];
	if (!_isFolder(filePath)) {_createFolder(filePath);}
    if (_isFolder(filePath)) {
        try {
            const fileObj = fso.CreateTextFile(file, true, bUTF16);
            fileObj.Write(value);
            fileObj.Close();
            return true;
        } catch (e) {}
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

// Delete. Can not be undone.
function _deleteFolder(folder, bForce = true) {
	if (_isFolder(folder)) {
		if (folder.startsWith('.\\')) {folder = fb.FoobarPath + folder.replace('.\\','');}
		if (folder.endsWith('\\')) {folder = folder.slice(0, -1);}
		try {
			fso.DeleteFolder(folder, bForce);
		} catch (e) {
			return false;
		}
		return !(_isFolder(folder));
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