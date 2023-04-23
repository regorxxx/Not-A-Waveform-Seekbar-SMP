'use strict';
//23/04/23

include('..\\window\\window_xxx.js');

// Set default properties (used on data later)
let propertiesOptions = {
	bOptions:	['Options panel opened?'			, false		], // To maintain the same window on script reload (would be an ID when having multiple windows)
	tabWidth:	['Options tab width: full / text'	, 'full'	], // Tab behaviour
	UI:			['Options theme: default / material', 'material'], // Theme
};
setProperties(propertiesOptions, '', 0);
propertiesOptions = getPropertiesPairs(propertiesOptions, '', 0);
_createFolder(folders.data);

// Set options window
const options = new _window({width: window.Width, height: window.Height, tabWidth: propertiesOptions.tabWidth[1], UI: propertiesOptions.UI[1], properties: {...propertiesOptions}, bFitData: true, bAutoSave: true});
// Set save and load methods to call them easily later (they would be used too if setting autosave to true)
options.save = () => {
	console.log('Seekbar: Saving options.');
	const seekbarOptions = {};
	for (let key in options.properties) {
		if (propertiesOptions.hasOwnProperty(key)) {
			propertiesOptions[key][1] = options.properties[key][1];
		} else {
			seekbarOptions[key] = options.properties[key];
		}
	}
	seekbar.updateConfig(seekbarOptions);
	seekbar.saveProperties();
	overwriteProperties(propertiesOptions);
}
options.load = () => {
	const properties = getPropertiesPairs(seekbarProperties, '', 0);
	for (let key in properties) {
		options.properties[key] = properties[key][3] === isJSON 
			? JSON.parse(properties[key][1], (key, value) => {return value === null ? Infinity : value;})
			: properties[key][1];
	}
}

// Add tabs with its data
options.addTab({title: 'Analysis', columns: 2, data: [
	[
		{subTitle: 'Binaries', values: [
			{name: 'FFprobe path:', pKey: ['binaries', 'ffprobe'], tt: 'Hola'},
			{name: 'AudioWaveform path:', pKey: ['binaries', 'audiowaveform'], tt: 'Hola'},
			{name: 'Binary type:', pKey: ['analysis', 'binaryMode'], list: ['ffprobe', 'audiowaveform', 'visualizer'], tt: 'Hola'}
		]},
		{subTitle: 'Analysis', values: [
			{name: 'Data compression:', pKey: ['analysis', 'compressionMode'], list: ['utf-16', 'utf-8', 'none'], tt: 'Hola'},
			{name: 'FFprobe mode:', pKey: ['preset', 'analysisMode'], list: ['peak_level', 'rms_level', 'rms_peak'], tt: 'Hola'}
		]}
	],
	[
		{subTitle: 'Analysis', values: [
			{name: 'Auto-analysis of files.', pKey: ['analysis', 'bAutoAnalysis'], tt: 'Hola'},
			{name: 'Delete data files on every session.', pKey: ['analysis', 'bAutoRemove'], tt: 'Hola'},
			{name: 'Use the visualizer as fallback.', pKey: ['analysis', 'bVisualizerFallback'], tt: 'Hola'},
		]}
	]
], description: 'This tab modifies data saved on properties panel'});

options.addTab({title: 'Seekbar', columns: 1, data: [
	[
		{subTitle: 'Waveform', values: [
			{name: 'Waveform shape:', pKey: ['preset', 'waveMode'], list: ['waveform', 'bars', 'points', 'halfbars'], tt: 'Hola'},
			{name: 'Show current position.', pKey: ['preset', 'bPaintCurrent'], tt: 'Hola'},
		]},
		{subTitle: 'Partial waveform and visualizer', values: [
			{name: 'Paint ahead.', pKey: ['preset', 'bPrePaint'], tt: 'Hola'},
			{name: 'Animate waveform usign BPM.', pKey: ['preset', 'bUseBPM'], tt: 'Hola'},
			{name: 'Show seconds:', pKey: ['preset', 'futureSecs'], constructor: Number, tt: 'Hola'}
		]}
	]
], description: 'This tab modifies data saved on properties panel'});

options.addTab({title: 'Other UI', columns: 3, data: [
	[
		{subTitle: 'Full mode', values: [
			{name: 'Background', pKey: ['ui', 'colors', 'bg'], mode: 'colorPicker', tt: 'Hola'},
			{name: 'Main waveform', pKey: ['ui', 'colors', 'main'], mode: 'colorPicker', tt: 'Hola'},
			{name: 'Secondary waveform', pKey: ['ui', 'colors', 'alt'], mode: 'colorPicker', tt: 'Hola'},
		]}
	],
	[
		{subTitle: 'Partial mode', values: [
			{name: 'Background (ahead)', pKey: ['ui', 'colors', 'bgFuture'], mode: 'colorPicker', tt: 'Hola'},
			{name: 'Main waveform (ahead)', pKey: ['ui', 'colors', 'mainFuture'], mode: 'colorPicker', tt: 'Hola'},
			{name: 'Secondary waveform (ahead)', pKey: ['ui', 'colors', 'altFuture'], mode: 'colorPicker', tt: 'Hola'},
		]}
	],
	[
		{subTitle: 'Current',values: [
			{name: 'Current position', pKey: ['ui', 'colors', 'currPos'], mode: 'colorPicker', tt: 'Hola'},
		]},
		{subTitle: 'Others', values: [
			{name: 'Scale (%)', pKey: ['ui', 'pos', 'scaleH'], constructor: Number, tt: 'Hola'},
			{name: 'Margins (px):', pKey: ['ui', 'pos', 'marginW'], constructor: Number, tt: 'Hola'},
			{name: 'Refresh (ms):', pKey: ['ui', 'refreshRate'], constructor: Number, tt: 'Hola'},
			{name: 'Variable refresh rate', pKey: ['ui', 'bVariableRefreshRate'], tt: 'Hola'},
		]}
	]
], description: 'This tab modifies data saved on properties panel'});

// Add a menu to swap windows
// Since auto-save is disabled, data saving is done when returning to the main window. Only exception to this rule is saving at script unload
// Using .loadAll() or .saveAll() instead of .load() / .save() will also apply for any embedded object
var menu = new _menu();
menu.newEntry({entryText: 'Show Options', func: () => {options.loadAll(); options.properties.bOptions[1] = true; options.saveAll(); window.Repaint(true);}});
menu.newEntry({entryText: 'Show Main', func: () => {options.properties.bOptions[1] = false; options.saveAll(); window.Repaint(true);}});