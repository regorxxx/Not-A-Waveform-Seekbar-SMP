'use strict';
//06/08/25

/* global setProperties:readable, getPropertiesPairs:readable, _createFolder:readable, folders:readable, seekbar:readable, overwriteProperties:readable, seekbarProperties:readable, isJSON:readable, _menu:readable */

include('..\\window\\window_xxx.js');
/* global _window:readable */

// Set default properties (used on data later)
let propertiesOptions = {
	bOptions: ['Options panel opened?', false], // To maintain the same window on script reload (would be an ID when having multiple windows)
	tabWidth: ['Options tab width: full / text', 'full'], // Tab behavior
	UI: ['Options theme: default / material', 'material'], // Theme
};
setProperties(propertiesOptions, '', 0);
propertiesOptions = getPropertiesPairs(propertiesOptions, '', 0);
_createFolder(folders.data);

// Set options window
const options = new _window({ width: window.Width, height: window.Height, tabWidth: propertiesOptions.tabWidth[1], UI: propertiesOptions.UI[1], properties: { ...propertiesOptions }, bFitData: true, bAutoSave: true });
// Set save and load methods to call them easily later (they would be used too if setting autosave to true)
options.save = () => {
	const seekbarOptions = {};
	for (const key in options.properties) {
		if (Object.hasOwn(propertiesOptions, key)) {
			propertiesOptions[key][1] = options.properties[key][1];
		} else {
			seekbarOptions[key] = options.properties[key];
		}
	}
	seekbar.updateConfig(seekbarOptions);
	seekbar.saveProperties();
	overwriteProperties(propertiesOptions);
};
options.load = () => {
	const properties = getPropertiesPairs(seekbarProperties, '', 0);
	for (const key in properties) {
		options.properties[key] = properties[key][2].func === isJSON
			? JSON.parse(properties[key][1], (key, value) => value === null ? Infinity : value)
			: properties[key][1];
	}
};

// Add tabs with its data
options.addTab({
	title: 'Analysis', columns: 3, data: [
		[
			{
				subTitle: 'Binaries', values: [
					{ name: 'FFprobe path:', pKey: ['binaries', 'ffprobe'], tt: 'Path to ffprobe.exe' },
					{ name: 'AudioWaveform path:', pKey: ['binaries', 'audiowaveform'], tt: 'Path to audiowaveform.exe' },
					{ name: 'Mode:', pKey: ['analysis', 'binaryMode'], list: ['ffprobe', 'audiowaveform', 'visualizer'], tt: 'Choose the binary mode used' }
				]
			}
		],
		[
			{
				subTitle: 'Analysis', values: [
					{ name: 'Data compression:', pKey: ['analysis', 'compressionMode'], list: ['utf-16', 'utf-8', 'none'], tt: 'Analysis data files may be compressed to save disk space' },
					{ name: 'FFprobe mode:', pKey: ['preset', 'analysisMode'], list: ['peak_level', 'rms_level', 'rms_peak'], tt: 'Only available when using ffprobe' }
				]
			}
		],
		[
			{
				subTitle: 'Analysis', values: [
					{ name: 'Auto-analysis of files.', pKey: ['analysis', 'bAutoAnalysis'], tt: 'Automatically analyze new tracks on playback' },
					{ name: 'Delete data files on every session.', pKey: ['analysis', 'bAutoRemove'], tt: 'Don\'t save analysis data files for future usage' },
					{ name: 'Use the visualizer as fallback.', pKey: ['analysis', 'bVisualizerFallback'], tt: 'Show an animation while analyzing new files' },
				]
			}
		]
	], description: 'Analysis and binary mode settings'
});

options.addTab({
	title: 'Display', columns: 3, data: [
		[
			{
				subTitle: 'Waveform', values: [
					{ name: 'Waveform style:', pKey: ['preset', 'waveMode'], list: ['waveform', 'bars', 'points', 'halfbars'], tt: 'Set the waveform style' },
					{ name: 'Show current position.', pKey: ['preset', 'bPaintCurrent'], tt: 'Show current position indicator' },
				]
			},
		],
		[
			{
				subTitle: 'Partial waveform and visualizer', values: [
					{ name: 'Paint after current position.', pKey: ['preset', 'bPrePaint'], tt: 'Paint waveform after current position\n(only on partial mode)' },
					{ name: 'Show seconds:', pKey: ['preset', 'futureSecs'], constructor: Number, tt: 'Set the seconds shown after the current position\nInfinity equals to the full track' },
				]
			},
			{
				subTitle: 'Animation', values: [
					{ name: 'Animate waveform.', pKey: ['preset', 'bAnimate'], tt: 'Animate waveform after current position' },
					{ name: 'Animate using BPM.', pKey: ['preset', 'bUseBPM'], tt: 'Animate it using BPM tag from track (if possible)' },
				]
			}
		],
		[
			{
				subTitle: 'Refresh rate', values: [
					{ name: 'Refresh (ms):', pKey: ['ui', 'refreshRate'], constructor: Number, tt: 'Set the refresh rate for the animation' },
					{ name: 'Variable refresh rate', pKey: ['ui', 'bVariableRefreshRate'], tt: 'Refresh rate will be adjusted automatically to current processor capabilities' },
				]
			}
		]
	], description: 'Analysis and binary mode settings'
});

options.addTab({
	title: 'Other UI', columns: 3, data: [
		[
			{
				subTitle: 'Full mode', values: [
					{ name: 'Background', pKey: ['ui', 'colors', 'bg'], mode: 'colorPicker', tt: 'Set color' },
					{ name: 'Main waveform', pKey: ['ui', 'colors', 'main'], mode: 'colorPicker', tt: 'Set color' },
					{ name: 'Secondary waveform', pKey: ['ui', 'colors', 'alt'], mode: 'colorPicker', tt: 'Set color' },
				]
			}
		],
		[
			{
				subTitle: 'Partial mode', values: [
					{ name: 'Background (ahead)', pKey: ['ui', 'colors', 'bgFuture'], mode: 'colorPicker', tt: 'Set color' },
					{ name: 'Main waveform (ahead)', pKey: ['ui', 'colors', 'mainFuture'], mode: 'colorPicker', tt: 'Set color' },
					{ name: 'Secondary waveform (ahead)', pKey: ['ui', 'colors', 'altFuture'], mode: 'colorPicker', tt: 'Set color' },
				]
			}
		],
		[
			{
				subTitle: 'Others', values: [
					{ name: 'Current position', pKey: ['ui', 'colors', 'currPos'], mode: 'colorPicker', tt: 'Set color' },
				]
			}
		]
	], description: 'This tab modifies data saved on properties panel'
});

// Add a menu to swap windows
// Since auto-save is disabled, data saving is done when returning to the main window. Only exception to this rule is saving at script unload
// Using .loadAll() or .saveAll() instead of .load() / .save() will also apply for any embedded object
const windowMenu = new _menu();
windowMenu.newEntry({ entryText: 'Show Options', func: () => { options.loadAll(); options.properties.bOptions[1] = true; options.saveAll(); window.Repaint(true); } });
windowMenu.newEntry({ entryText: 'Show Main', func: () => { options.properties.bOptions[1] = false; options.saveAll(); window.Repaint(true); console.log('Seekbar: Saving options.'); } });