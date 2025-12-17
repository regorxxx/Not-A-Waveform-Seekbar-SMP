'use strict';
//17/12/25

/* exported _seekbar */
/* global _gdiFont:readable, _scale:readable, _isFile:readable, _isLink:readable, convertCharsetToCodepage:readable, throttle:readable, _isFolder:readable, _createFolder:readable, deepAssign:readable, clone:readable, _jsonParseFile:readable, _open:readable, _deleteFile:readable, DT_VCENTER:readable, DT_CENTER:readable, DT_END_ELLIPSIS:readable, DT_CALCRECT:readable, DT_NOPREFIX:readable, invert:readable, _p:readable, MK_LBUTTON:readable, _deleteFolder:readable, _q:readable, sanitizePath:readable, _runCmd:readable, round:readable, _saveFSO:readable, _save:readable, _resolvePath:readable, _foldPath:readable, addNested:readable, getNested:readable */

include('..\\..\\helpers-external\\lz-utf8\\lzutf8.js'); // For string compression
/* global LZUTF8:readable */
include('..\\..\\helpers-external\\lz-string\\lz-string.min.js'); // For string compression
/* global LZString:readable */

/**
 * Seekbar and UI animations based on {@link https://github.com/bbc/audiowaveform|audiowaveform} and {@link https://ffmpeg.org/ffprobe.html|ffprobe}.
 *
 * @name _seekbar
 * @constructor
 * @param {object} o - argument
 * @param {string} [o.matchPattern] - [='$replace($ascii($lower([$replace($if2($meta(ALBUM ARTIST,0),$meta(ARTIST,0)),\\,)]\\[$replace(%ALBUM%,\\,)][ {$if2($replace(%COMMENT%,\\,),%MUSICBRAINZ_ALBUMID%)}]\\%TRACKNUMBER% - $replace(%TITLE%,\\,))), ?,,= ,,?,)'] Analysis data files match pattern
 * @param {Binaries} [o.binaries] - Paths to binaries. May be relative paths to profile folder (.//profile//) or foobar folder (.//), root will be replaced on execution.
 * @param {Preset} [o.preset] - Waveform display related settings.
 * @param {UI} [o.ui] - Panel display related settings.
 * @param {Analysis} [o.analysis] - Analysis related settings.
 * @param {Callbacks} [o.callbacks] - Panel callbacks related settings.
 * @param {Logging} [o.logging] - Panel callbacks related settings.
 */
function _seekbar({
	matchPattern = '$replace($ascii($lower([$replace($if2($meta(ALBUM ARTIST,0),$meta(ARTIST,0)),\\,,/,)]\\[$replace(%ALBUM%,\\,,/,)][ {$if2($replace(%COMMENT%,\\,,/,),%MUSICBRAINZ_ALBUMID%)}]\\[%TRACKNUMBER% - ][$replace(%TITLE%,$char(92),-,/,-,$char(41),,$char(40),,:,, ?$char(92),,?,,¿,,/,-,$char(36),,$char(37),,# ,,#,,*,,!,,¡,,|,-,",$char(39)$char(39),<,,>,,^,,... ,,...,,.,)])), ?,,= ,,?,)',
	binaries = {
		ffprobe: '.\\profile\\binaries\\ffprobe\\ffprobe.exe',
		audiowaveform: '.\\profile\\binaries\\audiowaveform\\audiowaveform.exe',
		visualizer: null,
	},
	preset = {
		waveMode: 'waveform',
		analysisMode: 'peak_level',
		paintMode: 'full',
		bPrePaint: false,
		bPaintCurrent: true,
		bAnimate: true,
		bUseBPM: true,
		futureSecs: Infinity,
		bHalfBarsShowNeg: true,
		displayChannels: [],
		bDownMixToMono: false
	},
	ui = {
		gFont: _gdiFont('Segoe UI', _scale(15)),
		colors: {
			bg: 0xFF000000, // Black RGB(0,0,0)
			main: 0xFF90EE90, // Green RGB(144,234,144)
			alt: 0xFF7CFC00, // Green RGB(124,252,0)
			bgFuture: 0xFF1B1B1B, // Gray RGB(27,27,27)
			mainFuture: 0xFFB7FFA2, // Green RGB(183,255,162)
			altFuture: 0xFFF9FF99, // Lemon RGB(249,255,153)
			currPos: 0xFFFFFFFF // White RGB(255,255,255)
		},
		transparency: {
			bg: 30,
			main: 75,
			alt: 75,
			bgFuture: 15,
			mainFuture: 75,
			altFuture: 75,
			currPos: 50
		},
		pos: { x: 0, y: 0, w: window.Width, h: window.Height, scaleH: 0.9, scaleW: 1 / 30, marginW: null },
		wheel: {
			unit: 's',
			step: 5,
			bReversed: false
		},
		refreshRate: 200,
		bVariableRefreshRate: false,
		bNormalizeWidth: false,
		normalizeWidth: _scale(4),
		bLogScale: true
	},
	analysis = {
		binaryMode: 'audiowaveform',
		resolution: 2,
		compressionMode: 'utf-16',
		storeMode: 'library',
		trackMode: ['playing', 'selected', 'blank'],
		bAutoAnalysis: true,
		bAutoRemove: false,
		bVisualizerFallback: true,
		bVisualizerFallbackAnalysis: true,
		bMultiChannel: false
	},
	callbacks = {
		backgroundColor: null
	},
	logging = {
		bDebug: false,
		bProfile: false,
		bLoad: true,
		bSave: true,
		bError: true,
	}
} = {}) {

	this.defaults = () => {
		const defBinaries = {
			ffprobe: '.\\profile\\binaries\\ffprobe\\ffprobe.exe',
			audiowaveform: '.\\profile\\binaries\\audiowaveform\\audiowaveform.exe',
			visualizer: null,
		};
		const defPreset = {
			waveMode: 'waveform',
			analysisMode: 'peak_level',
			paintMode: 'full',
			bPrePaint: false,
			bPaintCurrent: true,
			bAnimate: true,
			bUseBPM: true,
			futureSecs: Infinity,
			bHalfBarsShowNeg: true,
			displayChannels: [],
			bDownMixToMono: false
		};
		const defUi = {
			gFont: _gdiFont('Segoe UI', _scale(15)),
			colors: {
				bg: 0xFF000000, // Black RGB(0,0,0)
				main: 0xFF90EE90, // Green RGB(144,234,144)
				alt: 0xFF7CFC00, // Green RGB(124,252,0)
				bgFuture: 0xFF1B1B1B, // Gray RGB(27,27,27)
				mainFuture: 0xFFB7FFA2, // Green RGB(183,255,162)
				altFuture: 0xFFF9FF99, // Lemon RGB(249,255,153)
				currPos: 0xFFFFFFFF // White RGB(255,255,255)
			},
			transparency: {
				bg: 100,
				main: 100,
				alt: 100,
				bgFuture: 100,
				mainFuture: 100,
				altFuture: 100,
				currPos: 100
			},
			pos: { x: 0, y: 0, w: window.Width, h: window.Height, scaleH: 0.9, scaleW: 1 / 30, marginW: null },
			wheel: { unit: 's', step: 5, bReversed: false },
			refreshRate: 200,
			bVariableRefreshRate: false,
			bNormalizeWidth: false,
			normalizeWidth: _scale(4),
			bLogScale: true
		};
		const defAnalysis = {
			binaryMode: 'audiowaveform',
			resolution: 1,
			compressionMode: 'utf-16',
			storeMode: 'library',
			trackMode: ['playing', 'selected', 'blank'],
			bAutoAnalysis: true,
			bAutoRemove: false,
			bVisualizerFallback: true,
			bVisualizerFallbackAnalysis: true,
			bMultiChannel: false
		};
		const defCallbacks = {
			backgroundColor: null,
		};
		const defLogging = {
			bDebug: false,
			bProfile: false,
			bLoad: true,
			bSave: true,
			bError: true
		};
		const options = [{ from: defBinaries, to: binaries }, { from: defPreset, to: preset }, { from: defUi, to: ui }, { from: defAnalysis, to: analysis }, { from: defCallbacks, to: callbacks }, { from: defLogging, to: logging }];
		options.forEach((option) => {
			for (const key in option.from) {
				const subOption = option.from[key];
				if (!Object.hasOwn(option.to, key)) { option.to[key] = subOption; }
				if (typeof subOption === 'object' && !Array.isArray(subOption) && subOption !== null && Object.keys(subOption).length) {
					for (const key2 in subOption) {
						if (!Object.hasOwn(option.to[key], key2)) { option.to[key][key2] = subOption[key2]; }
					}
				}
			}
		});
	};
	this.checkConfig = () => {
		if (!Object.hasOwn(this.binaries, this.analysis.binaryMode)) {
			throw new Error('Binary mode not recognized or path not set: ' + this.analysis.binaryMode);
		}
		if (this.binaries[this.analysis.binaryMode] && !_isFile(this.binaries[this.analysis.binaryMode])) {
			fb.ShowPopupMessage('Required dependency not found: ' + this.analysis.binaryMode + '\n\n' + JSON.stringify(this.binaries[this.analysis.binaryMode]), window.Name + ' (' + window.ScriptInfo.Name + ')');
			this.bBinaryFound = false;
		} else if (!this.binaries[this.analysis.binaryMode]) {
			this.bBinaryFound = this.analysis.binaryMode === 'visualizer';
		} else { this.bBinaryFound = true; }
		if (this.preset.waveMode === 'vumeter') {
			this.ui.bNormalizeWidth = false;
			this.preset.paintMode = 'full';
		}
		if (this.preset.futureSecs <= 0 || this.preset.futureSecs === null) { this.preset.futureSecs = Infinity; }
		if (this.ui.wheel.step < 0) { this.ui.wheel.step = 1; }
		else if (this.ui.wheel.step > 100 && this.ui.wheel.unit === '%') { this.ui.wheel.step = 100; }
		this.preset.displayChannels.sort((a, b) => a - b);
	};
	/**
	 * Updates all panel repaint functions to use refresh rate settings.
	 *
	 * @property
	 * @name updateRepaintMethods
	 * @kind method
	 * @memberof _seekbar
	 * @returns {number} Refresh rate
	*/
	this.updateRepaintMethods = () => {
		const timer = this.preset.bAnimate ? this.ui.refreshRate : 60;
		throttlePaint = throttle(
			(bForce = false) => window.RepaintRect(this.x, this.y, this.w, this.h, bForce),
			timer
		);
		throttlePaintRect = throttle(
			(x, y, w, h, bForce = false) => window.RepaintRect(x, y, w, h, bForce),
			timer
		);
		return timer;
	};
	// Add default args
	this.defaults();
	/**
	 * @typedef {object} Binaries - Binaries paths
	 * @property {string?} ffprobe - ffprobe path
	 * @property {string?} audiowaveform - audiowaveform path
	 * @property {null} visualizer - Dummy placeholder
	 */
	/** @type {Binaries} - Binaries paths */
	this.binaries = binaries;
	/**
	 * @typedef {object} UI - Panel UI related settings
	 * @property {GdiFont} gFont - ffprobe path
	 * @property {object} colors - Color settings
	 * @property {number} colors.bg - Background color
	 * @property {number} colors.main - Waveform main color
	 * @property {number} colors.alt - Waveform alt color
	 * @property {number} colors.bgFuture - After current time background color
	 * @property {number} colors.mainFuture - After current time main color
	 * @property {number} colors.altFuture - After current time alt color
	 * @property {number} colors.currPos - Current time indicator color
	 * @property {object} transparency - Current time indicator color
	 * @property {number} transparency.bg - Background transparency
	 * @property {number} transparency.main - Waveform main transparency
	 * @property {number} transparency.alt - Waveform alt transparency
	 * @property {number} transparency.bgFuture - After current time background transparency
	 * @property {number} transparency.mainFuture - After current time main transparency
	 * @property {number} transparency.altFuture - After current time alt transparency
	 * @property {number} transparency.currPos - Current time indicator transparency
	 * @property {object} pos - Panel coordinates
	 * @property {number} pos.x - X-Axis position
	 * @property {number} pos.y - Y-Axis position
	 * @property {number} pos.w - X-Axis width
	 * @property {number} pos.h - X-Axis width
	 * @property {number} pos.scaleH - Y-Axis panel fill in % of height
	 * @property {number|null} pos.scaleW - X-Axis panel fill in % of weight
	 * @property {number|null} pos.marginW - X-axis margin in px
	 * @property {object} wheel - Mouse wheel settings to control playback seeking
	 * @property {'s'|'ms'|'%'} wheel.unit - Seeking per second, ms or % of total playback
	 * @property {number} wheel.step - Wheel steps seeking ratio
	 * @property {Boolean} wheel.bReversed - Flag to reverse seeking
	 * @property {number} refreshRate - ms when using animations of any type.
	 * @property {Boolean} bVariableRefreshRate - Flag to change refresh rate around the selected value to ensure code is run smoothly (for too low refresh rates)
	 * @property {Boolean} bNormalizeWidth - Flag to use data interpolation to display it normalized to the window width adjusted by normalizeWidth param (instead of showing more or less points according to track length). Any track with any length will display with the same amount of detail this way.
	 * @property {number} normalizeWidth - Size unit for normalization.
	 * @property {Boolean} bLogScale - Flag to display VU Meter scale in log (dB) or linear scale.
	 * @property {number} refreshRate - Size unit for normalization.
	 */
	/** @type {UI} - Panel UI related settings */
	this.ui = ui;
	/**
	 * @typedef {object} Preset - Waveform display related settings.
	 * @property {'waveform'|'lines'|'bars'|'barsfilled'|'points'|'halfbars'|'vumeter'} waveMode - Waveform design.
	 * @property {'rms_level'|'rms_peak'|'peak_level'} analysisMode - Data analysis mode (only available using ffprobe).
	 * @property {'full'|'partial'} paintMode - Display mode. Entire track (full) or splits it into 2 regions (before/after current time). How the region after current time is displayed is set by {@link Preset.bPrePaint}
	 * @property {boolean} bPrePaint - Flag to display the region after current time. How many seconds are  shown is set by {@link Preset.futureSecs}
	 * @property {boolean} bPaintCurrent - Flag to paint current time indicator.
	 * @property {boolean} bAnimate - Flag to add animation to displayed waveform.
	 * @property {boolean} bUseBPM - Flag to sync animation with %BPM% tag.
	 * @property {number} futureSecs - Length (in seconds) to show after the current time. Requires {@link Preset.paintMode} set to 'partial' and {@link Preset.bPrePaint} to true.
	 * @property {boolean} bHalfBarsShowNeg - Flag to show (and invert) negative data values if using 'halfbars' {@link Preset.waveMode}.
	 * @property {Number[]?} displayChannels - Channels which will be displayed, 0-based. An empty array will display all.
	 * @property {boolean} bDownMixToMono - Flag to downmix selected display channels into a single channel-
	 */
	/** @type {Preset} - Waveform display related settings.*/
	this.preset = preset;
	/**
	 * @typedef {object} Analysis - Analysis related settings.
	 * @property {'ffprobe'|'audiowaveform'|'visualizer'} binaryMode - Binary used. Visualizer is processed internally.
	 * @property {number} resolution - Data points per second (every point has 2 values, i.e. + and -). On visualizer mode is adjusted per window width. Changing this setting requires re-analysis of files to apply, but previous data files will be compatible too (just with different number of points).
	 * @property {'none'|'utf-8'|'utf-16'} compressionMode - Anything but 'none' applies compression to analysis data files. For comparison: utf-8 (~50% compression), utf-16 (~70%  compression) and 7zip (~80% compression).
	 * @property {'library'|'all'|'none'} storeMode - Controls wether analysis data files are saved to disk, for library items only, any item or none.
	 * @property {Array.<'playing'|'selected'|'blank'>} trackMode - Track preferred for visualization (order by priority).
	 * @property {boolean} bAutoAnalysis - Flag to automatically analyze tracks on playback or on demand.
	 * @property {boolean} bAutoRemove - Flag to delete analysis files when unloading the script. They are kept during the session (to not recalculate them).
	 * @property {boolean} bVisualizerFallback -  Flag to use visualizer mode when file can not be processed (not compatible format).
	 * @property {boolean} bVisualizerFallbackAnalysis - Flag to use visualizer mode while analyzing files.
	 * @property {boolean} bMultiChannel - Flag to output analysis data files compatible with multichannel or downmixed to mono. Data files from both modes are not compatible, so changing it requires tracks to be analyzed again. Both data files may be present at match path though. Note using the multichannel mode still allows downmixing to mono via {@link Preset.bDownMixToMono} without requiring to analyze files again, so multichannel mode covers all use cases (but uses more disk space proportional to  track channels).
	 */
	/** @type {Analysis} - Waveform display related settings.*/
	this.analysis = analysis;
	/**
	 * @typedef {object} Callbacks - Panel callbacks related settings.
	 * @property {() => number} backgroundColor - Sets the fallback color for text when there is no background color set for the waveform, otherwise will be white.
	 */
	/** @type {Callbacks} - Panel callbacks related settings. */
	this.callbacks = callbacks;
	/**
	 * @typedef {object} Logging - Panel logging related settings.
	 * @property {boolean} [bDebug] - Debug logging flag.
	 * @property {boolean} [bProfile] - Profiling logging flag.
	 * @property {boolean} [bLoad] - On seekbar file load logging flag.
	 * @property {boolean} [bSave] - On seekbar file save logging flag.
	 * @property {boolean} [bError] - On seekbar errors logging flag.
	 */
	/** @type {Logging} - Panel logging related settings. */
	this.logging = logging;
	// Easy access
	/** @type {number} - X-Axis position */
	this.x = this.ui.pos.x;
	/** @type {number} - Y-Axis position */
	this.y = this.ui.pos.y;
	/** @type {number} - X-Axis width */
	this.w = this.ui.pos.w;
	/** @type {number} - Y-Axis height */
	this.h = this.ui.pos.h;
	/** @type {number} - Y-Axis panel fill in % of height */
	this.scaleH = this.ui.pos.scaleH;
	/** @type {number|null} - X-Axis panel fill in % of weight */
	this.scaleW = this.ui.pos.scaleW;
	/** @type {number} - X-axis margin in px */
	this.marginW = this.scaleW !== null
		? this.ui.pos.scaleW * this.w
		: this.ui.pos.marginW;
	['x', 'y', 'w', 'h', 'scaleH', 'scaleW'].forEach((key) => {
		Object.defineProperty(this, key, {
			get() { return this.ui.pos[key]; },
			set(val) { this.ui.pos[key] = val; }
		});
	});
	Object.defineProperty(this, 'marginW', {
		get() {
			return this.scaleW !== null
				? this.ui.pos.scaleW * this.w
				: this.ui.pos.marginW;
		},
		set(val) { this.ui.pos.marginW = val; }
	});
	// Internals
	/** @type {number|null} - Queue interval id */
	this.queueId = null;
	/** @type {number} - Queue interval timeout (ms) */
	this.queueMs = 1000;
	/** @type {boolean} - Binary status flag */
	this.bBinaryFound = true;
	/** @type {boolean} - Panel state flag */
	this.active = true;
	/** @type {FbTitleFormat} - Analysis data files match pattern */
	this.Tf = fb.TitleFormat(matchPattern);
	/** @type {FbTitleFormat} - Animation steps pattern */
	this.TfMaxStep = fb.TitleFormat('[%BPM%]');
	/** @type {string} - Analysis data files root */
	this.folder = fb.ProfilePath + 'js_data\\seekbar\\';
	/** @type {number} - UTF-8 codepage */
	this.codePage = convertCharsetToCodepage('UTF-8');
	/** @type {number} - UTF-16LE codepage */
	this.codePageV2 = convertCharsetToCodepage('UTF-16LE');
	/** @type {number[][]} - Current track data per channel */
	this.current = [];
	/** @type {number} - Number of data points (frames) per channel */
	this.frames = 0;
	/** @type {number} - Track length / Num of frames */
	this.timeConstant = 0;
	/** @type {number} - Current track channels */
	this.channels = 0;
	/** @type {number[][]|null} - Last cached track's data (for comparison) */
	this.cache = null;
	/** @type {number[]} - OFfset values used on painting */
	this.offset = [];
	/** @type {number} - Current step for VU animation. In a range [0, this.maxStep] */
	this.stepVu = 0;
	/** @type {number} - Current step for waveform animation. In a range [0, this.maxStep] */
	this.step = 0;
	/** @type {number} - Max number of waveform animation steps */
	this.maxStep = 4;
	/** @type {number} - Max number of VU animation steps */
	this.maxStepVu = Math.max(1, 1000 / this.ui.refreshRate);
	/** @type {number} - Current playback time */
	this.time = 0;
	/** @type {number} - Reference refresh rate when using variable refresh rate setting */
	this.ui.refreshRateOpt = this.ui.refreshRate;
	/** @type {boolean} - Mouse L. Button flag */
	this.mouseDown = false;
	/** @type {boolean} - Flag for existing files (false if dead or online source). Set at this.checkAllowedFile */
	this.isFile = false;
	/** @type {boolean} - Flag for online files sources. Set at this.checkAllowedFile */
	this.isLink = false;
	/** @type {boolean} - Flag for compressed files. Set at this.checkAllowedFile */
	this.isZippedFile = false;
	/** @type {boolean} - Flag for compatible files. Set at this.checkAllowedFile */
	this.isAllowedFile = false;
	/** @type {boolean} - Flag when visualizer should be used as fallback. Set at this.checkAllowedFile() */
	this.isFallback = false;
	/** @type {boolean} - Flag for analysis error. Set at this.verifyData after retrying analysis */
	this.isError = false;
	/** @type {FbMetadbHandle} - Current handle being displayed */
	this.currentHandle = null;
	/** @type {number} - Last x mouse position within panel */
	this.mx = -1;
	/** @type {number} - Last y mouse position within panel */
	this.my = -1;
	// Private
	/** @type {{paint: boolean, analysis: boolean}} - Used when this.analysis.bVisualizerFallbackAnalysis is true, to track current step on processing */
	const bFallbackMode = { paint: false, analysis: false };
	/** @type {{rms_level: { key:string, pos:number }, rms_peak: { key:string, pos:number }, peak_level: { key:string, pos:number }}} - Used with ffprobe binary to unpack analysis data */
	const ffprobeModes = { rms_level: { key: 'rms', pos: 1 }, rms_peak: { key: 'rmsPeak', pos: 2 }, peak_level: { key: 'peak', pos: 3 } };
	/** @type {number} - Used with ffprobe binary, analysis data length (+ time)*/
	const ffprobeDataLen = Object.keys(ffprobeModes).length;
	/** @type {{ffprobeList: string[], audiowaveformList: string[], ffprobe: RegExp, audiowaveform: RegExp}} - Helpers to check for compatible files for different binaries */
	const compatibleFiles = {
		ffprobeList: ['2sf', 'aa', 'aac', 'ac3', 'ac4', 'aiff', 'ape', 'dff', 'dts', 'eac3', 'flac', 'hmi', 'la', 'lpcm', 'm4a', 'minincsf', 'mp2', 'mp3', 'mp4', 'mpc', 'ogg', 'ogx', 'opus', 'ra', 'snd', 'shn', 'spc', 'tak', 'tta', 'vgm', 'wav', 'wma', 'wv'],
		ffprobe: null,
		audiowaveformList: ['mp3', 'flac', 'wav', 'ogg', 'opus'],
		audiowaveform: null
	};
	['ffprobe', 'audiowaveform'].forEach((key) => {
		compatibleFiles[key] = new RegExp('\\.(' + compatibleFiles[key + 'List'].join('|') + ')$', 'i');
	});
	/** @type {Number} - Last time update */
	this.lastUpdate = Date.now();
	/** @type {Number[]} - Frames around current time to draw VU animation */
	const framesVu = [];
	/** @type {(bForce = false) => void} - Repaint entire window throttled */
	let throttlePaint;
	/** @type {(x:number, y:number, w:number, h:number, bForce = false) => void(0)} - Repaint part of window throttled */
	let throttlePaintRect;
	/** @type {FbProfiler} - Used for profiling when this.logging.bProfile is true */
	const profilerPaint = new FbProfiler('paint');

	// Check & Init
	this.checkConfig();
	if (!_isFolder(this.folder)) { _createFolder(this.folder); }
	this.updateRepaintMethods();

	/**
	 * Updates all panel related settings. Use this instead of changing settings directly to ensure the UI and variables are updated properly.
	 *
	 * @property
	 * @name updateConfig
	 * @kind method
	 * @memberof _seekbar
	 * @param {{binaries?: Binaries, ui?: UI, preset?: Preset, analysis?: Analysis, callbacks?: Callbacks}} newConfig - Config object, which is applied over current settings. Only include the variables needed.
	 * @returns {void}
	*/
	this.updateConfig = (newConfig) => {
		if (newConfig) { deepAssign()(this, newConfig); }
		this.checkConfig();
		let bRecalculate = false;
		if (newConfig.preset) {
			const bStyle = Object.hasOwn(newConfig.preset, 'waveMode');
			const bPaintMethod = this.preset.paintMode === 'partial' && this.preset.bPrePaint || this.analysis.binaryMode === 'visualizer' || Object.hasOwn(newConfig.preset, 'paintMode') || Object.hasOwn(newConfig.preset, 'bPrePaint');
			if (bStyle || bPaintMethod) {
				this.resetAnimation();
			}
			if (Object.hasOwn(newConfig.preset, 'bUseBPM') || Object.hasOwn(newConfig.preset, 'bAnimate')) {
				if (this.preset.bAnimate && this.preset.bUseBPM) { this.bpmSteps(); }
				else { this.defaultSteps(); }
				this.resetAnimation();
			}
			if (Object.hasOwn(newConfig.preset, 'bDownMixToMono') || this.preset.bDownMixToMono && Object.hasOwn(newConfig.preset, 'displayChannels')) {
				bRecalculate = true;
			}
			if (Object.hasOwn(newConfig.preset, 'analysisMode')) {
				bRecalculate = true;
			}
			if (Object.hasOwn(newConfig.preset, 'bAnimate')) {
				this.updateRepaintMethods();
			}
		}
		if (newConfig.ui) {
			if (Object.hasOwn(newConfig.ui, 'refreshRate')) {
				this.ui.refreshRateOpt = this.ui.refreshRate;
				if (this.preset.bAnimate) { this.updateRepaintMethods(); }
				this.maxStepVu = Math.max(1, 1000 / this.ui.refreshRate);
			}
			if (Object.hasOwn(newConfig.ui, 'bNormalizeWidth') || Object.hasOwn(newConfig.ui, 'normalizeWidth')) {
				bRecalculate = true;
			}
		}
		if (newConfig.analysis) {
			bRecalculate = true;
			if (Object.hasOwn(newConfig.analysis, 'trackMode')) {
				this.currentHandle = null;
			}
		}
		// Recalculate data points or repaint
		if (bRecalculate) { this.newTrack(void (0), void (0), true); }
		else if (window.IsVisible) { throttlePaint(); }
	};
	/**
	 * Retrieves JSON-compatible panel settings
	 *
	 * @property
	 * @name exportConfig
	 * @kind method
	 * @memberof _seekbar
	 * @param {boolean} bSkipPanelDependent - Flag to skip host-UI related settings, like coordinates
	 * @returns {void}
	*/
	this.exportConfig = (bSkipPanelDependent = true) => {
		const config = {};
		let notAllowed;
		config.binaries = {};
		notAllowed = new Set(['visualizer']);
		for (const key in this.binaries) {
			if (!notAllowed.has(key)) { config.binaries[key] = clone(this.binaries[key]); }
		}
		config.ui = {};
		notAllowed = new Set(['gFont']);
		for (const key in this.ui) {
			if (key === 'pos') {
				if (bSkipPanelDependent) { continue; }
				config.ui.pos = { scaleH: this.ui.pos.scaleH, scaleW: this.ui.posScaleW, marginW: this.ui.marginW };
			} else if (!notAllowed.has(key)) { config.ui[key] = clone(this.ui[key]); }
		}
		config.preset = clone(this.preset);
		config.analysis = clone(this.analysis);
		config.logging = clone(this.logging);
		return config;
	};
	/**
	 * Loads a JSON data file
	 *
	 * @property
	 * @name loadDataFile
	 * @kind method
	 * @memberof _seekbar
	 * @param {string} file - File path without extension
	 * @param {string} ext - Extension
	 * @returns {number[][]}
	*/
	this.loadDataFile = (file, ext) => {
		let data = [];
		if (this.logging.bLoad) { console.log('Seekbar: Analysis file path -> ' + _foldPath(file) + ext); }
		if (ext.endsWith('.json')) {
			data = _jsonParseFile(file + ext, this.codePage) || [];
		} else if (ext.endsWith('.lz')) {
			let str = _open(file + ext, this.codePage) || '';
			str = LZUTF8.decompress(str, { inputEncoding: 'Base64' }) || null;
			data = str ? JSON.parse(str) || [] : [];
		} else if (ext.endsWith('.lz16')) {
			let str = _open(file + ext, this.codePageV2) || '';
			str = LZString.decompressFromUTF16(str) || null;
			data = str ? JSON.parse(str) || [] : [];
		}
		// Support both old and new file format for single channel files
		if (this.channels === 1 && /\.m\.(json|lz(16)?)$/i.test(ext) && data.length !== 1) {
			data = [data];
		}
		return data;
	};
	/**
	 * Switches panel functionality
	 *
	 * @property
	 * @name switch
	 * @kind method
	 * @memberof _seekbar
	 * @param {boolean} bEnable - [=!this.active] New State. If not provided, switches previous one.
	 * @returns {boolean} New state
	*/
	this.switch = (bEnable = !this.active) => {
		const wasActive = this.active;
		this.active = bEnable;
		if (!wasActive && this.active) {
			window.Repaint();
			setTimeout(() => {
				const handle = this.getHandle();
				this.newTrack(handle, void (0), true);
				if (this.isTrackPlaying()) { this.updateTime(fb.PlaybackTime); }
			}, 0);
		} else if (wasActive && !this.active) {
			this.stop(-1);
		}
		return this.active;
	};
	/**
	 * Adds new track to queue to be processed after some ms. This avoids filling the call stack when changing selection too fast. See .newTrack()
	 *
	 * @property
	 * @name newTrackQueue
	 * @kind method
	 * @memberof _seekbar
	 * @returns {void}
	*/
	this.newTrackQueue = function () {
		if (this.queueId) { clearTimeout(this.queueId); }
		this.queueId = setTimeout(() => {
			this.newTrack(...arguments);
		}, this.queueMs); // Arguments points to the first non arrow func
	};
	/**
	 * Retrieves preferred track mode for usage in callbacks.
	 *
	 * @property
	 * @name getPreferredTrackMode
	 * @kind method
	 * @memberof _seekbar
	 * @returns {'playing'|'selected'|'blank'}
	*/
	this.getPreferredTrackMode = function () {
		let trackMode = '';
		this.analysis.trackMode.some((mode) => {
			switch (mode.toLowerCase()) {
				case 'playing': {
					if (fb.IsPlaying) { trackMode = 'playing'; return true; }
					break;
				}
				case 'selected': {
					if (fb.GetSelections(1).Count || fb.GetFocusItem(true)) { trackMode = 'selected'; return true; }
					break;
				}
				case 'blank': { trackMode = 'blank'; return true; }
			}
		});
		return trackMode;
	};
	/**
	 * Retrieves handle to process according to preferred track settings.
	 *
	 * @property
	 * @name getHandle
	 * @kind method
	 * @memberof _seekbar
	 * @returns {FbMetadbHandle}
	*/
	this.getHandle = function () {
		let handle = null;
		this.analysis.trackMode.some((mode) => {
			switch (mode.toLowerCase()) {
				case 'playing': {
					if (fb.IsPlaying) { handle = fb.GetNowPlaying(); return !!handle; }
					break;
				}
				case 'selected': {
					const sel = fb.GetSelectionType() > 0 ? fb.GetSelections(1) : null;
					const h = sel && sel.Count ? sel[0] : fb.GetFocusItem(true);
					if (h) { handle = h; return !!handle; }
					break;
				}
				case 'blank': {
					return true;
				}
			}
		});
		if (this.analysis.trackMode.length <= 1 && this.isOnDemandTrack() && this.currentHandle) {
			handle = this.currentHandle;
		}
		return handle;
	};
	/**
	 * Retrieves handle to process according to preferred track settings.
	 *
	 * @property
	 * @name getHandleLength
	 * @kind method
	 * @memberof _seekbar
	 * @returns {number}
	*/
	this.getHandleLength = function () {
		let len = 0;
		this.analysis.trackMode.some((mode) => {
			if (mode.toLowerCase() === 'playing') {
				if (fb.IsPlaying) { len = fb.PlaybackLength; return true; }
			} else if (this.currentHandle) {
				len = this.currentHandle.Length; return true;
			} else {
				const handle = this.getHandle();
				if (handle) {
					if (fb.IsPlaying) {
						const np = fb.GetNowPlaying();
						if (np && np.Compare(handle)) {
							len = fb.PlaybackLength; return true;
						}
					}
					len = handle.Length; return true;
				}
			}
		});
		return len;
	};
	/**
	 * Retrieves time associated to any x-coordinate within panel, for seeking purposes.
	 *
	 * @property
	 * @name getPlaybackTimeAt
	 * @kind method
	 * @memberof _seekbar
	 * @param {number} [x] - X position within panel
	 * @returns {number}
	*/
	this.getPlaybackTimeAt = function (x) {
		if (this.frames !== 0) {
			const len = this.getHandleLength();
			const barW = (this.w - this.marginW * 2) / this.frames;
			let time = Math.round(len / this.frames * (x - this.x - this.marginW) / barW);
			if (time < 0) { time = 0; }
			else if (time > len) { time = len; }
			return time;
		}
		return 0;
	};
	/**
	 * Sets playback time at given value (in seconds). If playback is stopped, it plays the current track.
	 *
	 * @property
	 * @name setPlaybackTime
	 * @kind method
	 * @memberof _seekbar
	 * @param {number} [time] - Time in seconds
	 * @returns {number}
	*/
	this.setPlaybackTime = function (time) {
		if (this.frames !== 0) {
			if (!this.isTrackPlaying()) {
				if (this.isTrackPlaying()) {
					fb.Play();
					setTimeout(() => {
						fb.PlaybackTime = time;
						if (window.IsVisible) { throttlePaint(true); }
					}, 100);
				} else {
					const queue = plman.GetPlaybackQueueHandles();
					plman.FlushPlaybackQueue();
					[this.currentHandle, ...queue.Convert()].forEach((handle) => plman.AddItemToPlaybackQueue(handle));
					fb.Play();
					setTimeout(() => {
						fb.PlaybackTime = time;
						if (window.IsVisible) { throttlePaint(true); }
					}, 100);
				}
			} else {
				fb.PlaybackTime = time;
				if (window.IsVisible) { throttlePaint(true); }
			}
			return true;
		}
		return false;
	};
	/**
	 * Compares handle to process to current one.
	 *
	 * @property
	 * @name compareTrack
	 * @kind method
	 * @memberof _seekbar
	 * @param {FbMetadbHandle} [handle] - [=this.getHandle()] Handle to get data for.
	 * @returns {boolean} True when tracks match
	*/
	this.compareTrack = function (handle = this.getHandle()) {
		return !!this.currentHandle && !!handle && handle.Compare(this.currentHandle);
	};
	/**
	 * Outputs wether the currently displayed track is also the playing track or not
	 *
	 * @property
	 * @name isTrackPlaying
	 * @kind method
	 * @memberof _seekbar
	 * @returns {boolean} True when tracks match
	*/
	this.isTrackPlaying = function () {
		return this.compareTrack(fb.GetNowPlaying());
	};
	/**
	 * Process a track to get its data and use it to paint the panel afterwards.
	 *
	 * @property
	 * @name newTrack
	 * @kind method
	 * @memberof _seekbar
	 * @param {FbMetadbHandle} [handle] - [=this.getHandle()] Handle to get data for.
	 * @param {boolean} [bIsRetry] - [=false] If false, will retry analysis a second time.
	 * @returns {boolean} New state
	*/
	this.newTrack = async (handle = this.getHandle(), bIsRetry = false, bForce = false) => {
		if (!this.active) { return; }
		if (this.compareTrack(handle) && !bForce) { return; }
		this.reset();
		if (handle) {
			this.currentHandle = handle;
			this.checkAllowedFile(handle);
			let bAnalysis = false;
			const { seekbarFolder, seekbarFile, sourceFile } = this.getPaths(handle);
			const bVisualizer = this.analysis.binaryMode === 'visualizer';
			const bAuWav = this.analysis.binaryMode === 'audiowaveform';
			const bFfProbe = this.analysis.binaryMode === 'ffprobe';
			const bMulti = this.analysis.bMultiChannel;
			// Uncompressed file -> Compressed UTF8 file -> Compressed UTF16 file -> Analyze
			if (bFfProbe && !bMulti && _isFile(seekbarFile + '.ff.json')) {
				this.current = this.loadDataFile(seekbarFile, '.ff.json');
				if (!this.verifyData(handle, seekbarFile + '.ff.json', bIsRetry)) { return; }
			} else if (bFfProbe && !bMulti && _isFile(seekbarFile + '.ff.lz')) {
				this.current = this.loadDataFile(seekbarFile, '.ff.lz');
				if (!this.verifyData(handle, seekbarFile + '.ff.lz', bIsRetry)) { return; }
			} else if (bFfProbe && !bMulti && _isFile(seekbarFile + '.ff.lz16')) {
				this.current = this.loadDataFile(seekbarFile, '.ff.lz16');
				if (!this.verifyData(handle, seekbarFile + '.ff.lz16', bIsRetry)) { return; }
			} else if (bFfProbe && bMulti && _isFile(seekbarFile + '.ff.m.json')) {
				this.current = this.loadDataFile(seekbarFile, '.ff.m.json');
				if (!this.verifyData(handle, seekbarFile + '.ff.m.json', bIsRetry)) { return; }
			} else if (bFfProbe && bMulti && _isFile(seekbarFile + '.ff.m.lz')) {
				this.current = this.loadDataFile(seekbarFile, '.ff.m.lz');
				if (!this.verifyData(handle, seekbarFile + '.ff.m.lz', bIsRetry)) { return; }
			} else if (bFfProbe && bMulti && _isFile(seekbarFile + '.ff.m.lz16')) {
				this.current = this.loadDataFile(seekbarFile, '.ff.m.lz16');
				if (!this.verifyData(handle, seekbarFile + '.ff.m.lz16', bIsRetry)) { return; }
			} else if (bAuWav && !bMulti && _isFile(seekbarFile + '.aw.json')) {
				this.current = this.loadDataFile(seekbarFile, '.aw.json');
				if (!this.verifyData(handle, seekbarFile + '.aw.json', bIsRetry)) { return; }
			} else if (bAuWav && !bMulti && _isFile(seekbarFile + '.aw.lz')) {
				this.current = this.loadDataFile(seekbarFile, '.aw.lz');
				if (!this.verifyData(handle, seekbarFile + '.aw.lz', bIsRetry)) { return; }
			} else if (bAuWav && !bMulti && _isFile(seekbarFile + '.aw.lz16')) {
				this.current = this.loadDataFile(seekbarFile, '.aw.lz16');
				if (!this.verifyData(handle, seekbarFile + '.aw.lz16', bIsRetry)) { return; }
			} else if (bAuWav && bMulti && _isFile(seekbarFile + '.aw.m.json')) {
				this.current = this.loadDataFile(seekbarFile, '.aw.m.json');
				if (!this.verifyData(handle, seekbarFile + '.aw.m.json', bIsRetry)) { return; }
			} else if (bAuWav && bMulti && _isFile(seekbarFile + '.aw.m.lz')) {
				this.current = this.loadDataFile(seekbarFile, '.aw.m.lz');
				if (!this.verifyData(handle, seekbarFile + '.aw.m.lz', bIsRetry)) { return; }
			} else if (bAuWav && bMulti && _isFile(seekbarFile + '.aw.m.lz16')) {
				this.current = this.loadDataFile(seekbarFile, '.aw.m.lz16');
				if (!this.verifyData(handle, seekbarFile + '.aw.m.lz16', bIsRetry)) { return; }
			} else if (this.analysis.bAutoAnalysis && (this.isFile || this.isLink) && this.bBinaryFound) {
				if (this.analysis.bVisualizerFallbackAnalysis && this.isAllowedFile) {
					bFallbackMode.analysis = bFallbackMode.paint = true;
					await this.analyze(handle, seekbarFolder, seekbarFile, sourceFile);
					if (this.currentHandle && !this.compareTrack(handle)) { return; }
					// Calculate waveform on the fly
					if (this.current[0]) { this.normalizePoints(); }
					// Set animation using BPM if possible
					if (this.preset.bAnimate && this.preset.bUseBPM) { this.bpmSteps(handle); }
					// Update time if needed
					if (this.isTrackPlaying()) { this.time = fb.PlaybackTime < Number.MAX_SAFE_INTEGER ? fb.PlaybackTime : 0; }
				}
				if (window.IsVisible) { throttlePaint(true); }
				if (this.analysis.bVisualizerFallbackAnalysis) { bFallbackMode.analysis = false; }
				await this.analyze(handle, seekbarFolder, seekbarFile, sourceFile);
				if (this.currentHandle && !this.compareTrack(handle)) { return; }
				if (!this.verifyData(handle, void (0), bIsRetry)) { return; }
				bFallbackMode.analysis = bFallbackMode.paint = false;
				bAnalysis = true;
			}
			if (!bAnalysis) { this.isFallback = false; } // Allow reading data from files even if track is not compatible
			if (this.current[0]) {
				// Calculate waveform on the fly
				if (this.analysis.bMultiChannel && this.preset.bDownMixToMono) { this.downMixToMono(); }
				this.normalizePoints(!bVisualizer && this.ui.bNormalizeWidth);
				this.timeConstant = handle.Length / this.frames;
			}
		}
		this.resetAnimation();
		// Set animation using BPM if possible
		if (this.preset.bAnimate && this.preset.bUseBPM) { this.bpmSteps(handle); }
		// Update time if needed
		if (this.isTrackPlaying()) { this.time = fb.PlaybackTime < Number.MAX_SAFE_INTEGER ? fb.PlaybackTime : 0; }
		// And paint
		if (window.IsVisible) { throttlePaint(); }
	};
	/**
	 * Normalize data to have amplitudes between [0, 1]. Alternatively, it may also normalize quantity of points according to panel width.
	 *
	 * @property
	 * @name normalizePoints
	 * @kind method
	 * @memberof _seekbar
	 * @param {boolean} [bNormalizeWidth] - [=false] Flag to also normalize in X-Axis.
	 * @returns {void}
	*/
	this.normalizePoints = (bNormalizeWidth = false) => {
		this.frames = this.current[0].length;
		if (this.frames) {
			const bDiscardedSamples = this.clampResolution(Math.max(this.w / _scale(1), 40000));
			const limits = this.normalizeAmplitude();
			// Adjust num of frames to window size
			if (bNormalizeWidth && !bDiscardedSamples) { this.normalizeResolution(limits); }
		}
	};
	/**
	 * Limits quantity of points to avoid OOM errors (which may happen when setting resolution to Infinity)
	 *
	 * @property
	 * @name clampResolution
	 * @kind method
	 * @memberof _seekbar
	 * @param {Number} maxFrames - Max number of frames allowed
	 * @returns {boolean} true if data was over limits
	*/
	this.clampResolution = (maxFrames) => {
		if (this.frames) {
			if (this.frames > maxFrames) {
				const scale = Math.ceil(this.frames / maxFrames);
				this.current = this.current.map((channel) => channel.filter((val, i) => !(i % scale)));
				this.frames = this.current[0].length;
				return true;
			}
		}
		return false;
	};
	/**
	 * Normalize data to have amplitudes between [0, 1].
	 *
	 * @property
	 * @name normalizeAmplitude
	 * @kind method
	 * @memberof _seekbar
	 * @returns {{ upper:number[], lower:number[] }} Max amplitude value per channel
	*/
	this.normalizeAmplitude = () => {
		const upper = Array.from({ length: this.channels }, () => 0);
		const lower = Array.from({ length: this.channels }, () => 0);
		if (this.frames) {
			if (!this.isFallback && !bFallbackMode.paint && this.analysis.binaryMode === 'ffprobe') {
				for (let c = 0; c < this.channels; c++) {
					// Calculate max values
					const pos = ffprobeModes[this.preset.analysisMode].pos;
					let max = 0;
					this.current[c].forEach((frame) => {
						// After parsing JSON, restore infinity values
						if (frame[pos] === null) { frame[pos] = -Infinity; }
						const val = frame[pos];
						max = Math.min(max, isFinite(val) ? val : 0);
					});
					// Calculate point scale
					let maxVal = 1;
					const lastIdx = ffprobeDataLen + 1; // + Time
					const maxLen = lastIdx + 1;
					if (this.preset.analysisMode !== 'rms_level') {
						this.current[c].forEach((frame) => {
							if (frame.length === maxLen) { frame.length = lastIdx; }
							frame.push(
								isFinite(frame[pos])
									? 1 - Math.abs(Math.pow(2, frame[pos] / 10) * (1 - Math.log2(10)))
									// ? Math.abs(1 - (Math.log(Math.abs(max)) + Math.log(Math.abs(frame[pos]))) / Math.log(Math.abs(max)))
									: 1
							);
							if (!isFinite(frame[lastIdx])) { frame[lastIdx] = 0; }
							maxVal = Math.min(maxVal, frame[lastIdx]);
						});
					} else {
						this.current[c].forEach((frame) => {
							frame.push(isFinite(frame[pos]) ? 1 - Math.abs((frame[pos] - max) / max) : 1);
							maxVal = Math.min(maxVal, frame[lastIdx]);
						});
					}
					// Normalize
					if (maxVal !== 0) {
						const limit = round(1 + maxVal, 3);
						this.current[c].forEach((frame) => {
							if (frame[lastIdx] <= limit) { frame[lastIdx] = round(frame[lastIdx] - maxVal, 3); }
						});
					}
					// Flat data
					this.current[c] = this.current[c].map((x, i) => Math.sign((0.5 - i % 2)) * (1 - x[lastIdx]));
					// Calculate max values
					this.current[c].forEach((frame) => {
						upper[c] = Math.max(upper[c], frame);
						lower[c] = Math.min(lower[c], frame);
					});
					max = Math.max(Math.abs(upper[c]), Math.abs(lower[c]));
				}
			} else if (['audiowaveform', 'visualizer'].some((m) => this.analysis.binaryMode === m) || this.isFallback || bFallbackMode.paint) {
				for (let c = 0; c < this.channels; c++) {
					// Calculate max values
					let max = 0;
					this.current[c].forEach((frame) => {
						upper[c] = Math.max(upper[c], frame);
						lower[c] = Math.min(lower[c], frame);
					});
					max = Math.max(Math.abs(upper[c]), Math.abs(lower[c]));
					// Calculate point scale
					this.current[c] = this.current[c].map((frame) => round(frame / max, 3));
				}
			}
		}
		return { upper, lower };
	};
	/**
	 * Normalize quantity of points according to panel width.
	 *
	 * @property
	 * @name normalizeResolution
	 * @kind method
	 * @memberof _seekbar
	 * @param {object} o - Arguments
	 * @param {Number[]} o.upper - Max amplitude value per channel
	 * @param {Number[]} o.lower - Min amplitude value per channel
	 * @returns {void}
	*/
	this.normalizeResolution = ({ upper, lower, newFrames }) => {
		const frames = this.frames;
		if (frames) {
			// Adjust num of frames to window size
			if (!newFrames) {
				const barW = this.ui.normalizeWidth;
				newFrames = Math.floor((this.w - this.marginW * 2) / barW);
			}
			if (newFrames && newFrames !== frames) {
				for (let c = 0; c < this.channels; c++) {
					let data;
					if (newFrames < frames) {
						const scale = frames / newFrames;
						data = Array.from({ length: newFrames }, () => { return { val: 0, count: 0 }; });
						let j = 0, h = 0, frame;
						for (let i = 0; i < frames; i++) {
							frame = this.current[c][i];
							if (h >= scale) {
								const w = (h - scale);
								if (i % 2 === 0) {
									if ((j + 1) >= newFrames) { break; }
									data[j + 1].val += frame * w;
									data[j + 1].count += w;
								} else {
									data[j].val += frame * w;
									data[j].count += w;
								}
								j += 2;
								h = 0;
								data[j].val += frame * (1 - w);
								data[j].count += (1 - w);
							} else {
								if (i % 2 === 0) { // NOSONAR
									if ((j + 1) >= newFrames) { break; }
									data[j + 1].val += frame;
									data[j + 1].count++;
								} else {
									data[j].val += frame;
									data[j].count++;
									h++;
								}
							}
						}
					} else {
						const scale = newFrames / frames;
						data = Array.from({ length: newFrames }, () => { return { val: 0, count: 0 }; });
						let j = 0, h = 0, frame;
						for (let i = 0; i < frames; i++) {
							frame = this.current[c][i];
							while (h < scale) {
								data[j].val += frame;
								data[j].count++;
								h++;
								j++;
								if (j >= newFrames) { break; }
							}
							h = (h - scale);
							if (j >= newFrames) { break; }
						}
					}
					// Filter non valid values
					let len = data.length;
					while (data[len - 1].count === 0) { data.pop(); len--; }
					// Normalize
					this.current[c] = data.map((el) => el.val / el.count);
					// Some combinations of bar widths and number of points may affect the bias to the upper or lower part of the waveform
					const bias = Math.abs(upper[c] / lower[c]);
					upper[c] = lower[c] = 0;
					let upperAvg = 0, lowerAvg = 0;
					this.current[c].forEach((frame, i) => {
						if (i === 0) { return; } // spurious first point
						upper[c] = Math.max(upper[c], frame);
						lower[c] = Math.min(lower[c], frame);
						if (frame > 0) { upperAvg += frame; }
						else { lowerAvg += frame; }
					});
					// Some combinations also throw an spurious first point which should not be taken into account sometimes
					if (this.current[c][0] > 0) {
						upperAvg /= newFrames / 2;
						const diff = this.current[c][0] - upperAvg;
						if (diff < 0.3) { upper[c] = Math.max(upper[c], this.current[c][0]); }
					} else {
						lowerAvg /= newFrames / 2;
						const diff = Math.abs(this.current[c][0]) - Math.abs(lowerAvg);
						if (diff < 0.3) { lower[c] = Math.min(lower[c], this.current[c][0]); }
					}
					// Lower or upper side can be normalized to the max value of the other side to account for this
					const newBias = Math.abs(upper[c] / lower[c]);
					const diff = bias - newBias;
					if (diff > 0.1) {
						const distort = bias / newBias;
						const sign = Math.sign(diff);
						this.current[c] = this.current[c].map((frame) => {
							return sign === 1 && frame > 0 || sign !== 1 && frame < 0 ? frame * distort : frame;
						});
					}
				}
				this.frames = this.current[0].length;
			}
		}
	};
	/**
	 * Downmix data to a single channel.
	 *
	 * @property
	 * @name downMixToMono
	 * @kind method
	 * @memberof _seekbar
	 * @returns {void}
	*/
	this.downMixToMono = () => {
		if (this.channels <= 1) { return; }
		this.frames = this.current[0].length;
		const monoData = [];
		const channelsNum = this.getDisplayChannels(false).length;
		if (this.analysis.binaryMode === 'ffprobe') {
			const defFrame = Array(ffprobeDataLen + 1).fill(0); // + Time
			for (let i = 0; i < this.frames; i++) {
				const frame = [...defFrame];
				for (let c = 0; c < channelsNum; c++) {
					frame[0] = this.current[c][i][0]; // Time
					for (let mode = 1; mode <= ffprobeDataLen; mode++) {
						frame[mode] += this.current[c][i][mode];
					}
				}
				monoData.push(frame.map((v) => v / channelsNum));
			}
		} else {
			for (let i = 0; i < this.frames; i++) {
				let frame = 0;
				for (let c = 0; c < channelsNum; c++) {
					frame += this.current[c][i];
				}
				monoData.push(frame / channelsNum);
			}
		}
		this.channels = 1;
		this.current = [monoData];
	};
	/**
	 *  Checks if data is valid for a given track.
	 *
	 * @property
	 * @name isDataValid
	 * @kind method
	 * @memberof _seekbar
	 * @param {FbMetadbHandle} handle - Track from which data was sourced
	 * @returns {boolean}
	*/
	this.isDataValid = (handle) => {
		// When iterating too many tracks in a short amount of time weird things may happen without this check
		if (!Array.isArray(this.current) || !this.current.length || this.current.some((channel) => !Array.isArray(channel) || !channel.length)) { return false; }
		// Same frames per channel
		if ((new Set(this.current.map((channel) => channel.length))).size > 1) { return false; }
		switch (this.analysis.binaryMode) {
			case 'ffprobe': {
				const lastIdx = ffprobeDataLen + 1; // + Time
				const maxLen = lastIdx + 1;
				return this.current.every((channel) => channel.every((frame) => {
					const len = Object.hasOwn(frame, 'length') ? frame.length : null;
					return (len === lastIdx || len === maxLen);
				}));
			}
			case 'audiowaveform': { // NOSONAR
				if (this.analysis.bMultiChannel) { // Must have N points of data per frame, N = channels
					if (!handle) { return false; }
					if (!this.channels) { return false; }
				}
			}
			default: { // eslint-disable-line no-fallthrough
				return this.current.every((channel) => channel.every((frame) => {
					return (frame >= -128 && frame <= 127);
				}));
			}
		}
	};
	/**
	 * Checks if data is valid for a given track, sets associated flags and handles errors.
	 *
	 * @property
	 * @name verifyData
	 * @kind method
	 * @memberof _seekbar
	 * @param {FbMetadbHandle} handle - Track from which data was sourced
	 * @param {string} file - Data file path
	 * @param {boolean} bIsRetry - [=false] Flag to retry analysis if there are errors
	 * @returns {boolean}
	*/
	this.verifyData = (handle, file, bIsRetry = false) => {
		if (!this.isDataValid(handle)) {
			if (bIsRetry) {
				if (this.logging.bError) { console.log('Seekbar: Track was not successfully analyzed after retrying'); }
				file && _deleteFile(file);
				this.isAllowedFile = false;
				this.isFallback = this.analysis.bVisualizerFallback;
				this.isError = true;
				this.current = [];
				this.frames = 0;
				this.timeConstant = 0;
			} else if (this.analysis.binaryMode === 'visualizer') {
				this.isAllowedFile = true;
				this.isFallback = false;
				this.isError = true;
				this.current = [];
				this.frames = 0;
				this.timeConstant = 0;
			} else {
				if (this.logging.bError) { console.log('Seekbar: Analysis file not valid.' + (file ? ' Creating new one -> ' + file : '')); }
				file && _deleteFile(file);
				this.newTrack(handle, true, true);
			}
			return false;
		}
		return true;
	};
	/**
	 * Checks if track can be analyzed.
	 *
	 * @property
	 * @name checkAllowedFile
	 * @kind method
	 * @memberof _seekbar
	 * @param {FbMetadbHandle} handle - [=this.getHandle()] Track
	 * @returns {void}
	*/
	this.checkAllowedFile = (handle = this.getHandle()) => {
		if (!handle) { throw new Error('No handle argument'); }
		const bNoVisual = this.analysis.binaryMode !== 'visualizer';
		const bNoSubSong = !this.isSubSong(handle);
		const bValidExt = this.isCompatibleFileExtension(handle);
		this.isFile = _isFile(handle.Path);
		this.isLink = _isLink(handle.Path);
		this.isZippedFile = handle.RawPath.startsWith('unpack://');
		this.isAllowedFile = bNoVisual && bNoSubSong && bValidExt && !this.isZippedFile;
		this.isFallback = !this.isAllowedFile && this.analysis.bVisualizerFallback;
		this.channels = this.analysis.bMultiChannel
			? Number(new FbTitleFormat('$info(channels)').EvalWithMetadb(handle))
			: 1;
	};
	/**
	 * Checks if track is compatible with analysis according to extension and binary mode.
	 *
	 * @property
	 * @name isCompatibleFileExtension
	 * @kind method
	 * @memberof _seekbar
	 * @param {FbMetadbHandle} handle - [=this.getHandle()] Track
	 * @param {string} mode - [=this.analysis.binaryMode] Binary mode
	 * @returns {boolean}
	*/
	this.isCompatibleFileExtension = (handle = this.getHandle(), mode = this.analysis.binaryMode) => {
		return mode === 'visualizer'
			? true
			: handle
				? compatibleFiles[mode].test(handle.Path)
				: false;
	};
	/**
	 * Checks if a track references a container with subsongs
	 *
	 * @property
	 * @name isSubSong
	 * @kind method
	 * @memberof _seekbar
	 * @param {FbMetadbHandle} handle - Track
	 * @param {string} ext - [=''] Track extension (provide it if already known)
	 * @returns {boolean}
	*/
	this.isSubSong = (handle, ext = '') => {
		const blackList = new Set(['dsf']);
		return handle.SubSong !== 0 && !blackList.has(ext || handle.Path.split('.').pop());
	};
	/**
	 * Checks if the preferred track mode is blank (i.e. on demand rendering)
	 *
	 * @property
	 * @name isOnDemandTrack
	 * @kind method
	 * @memberof _seekbar
	 * @returns {boolean}
	*/
	this.isOnDemandTrack = () => {
		return this.getPreferredTrackMode() === 'blank';
	};
	/**
	 * Gets the compatible extensions for a given binary mode.
	 *
	 * @property
	 * @name reportCompatibleFileExtension
	 * @kind method
	 * @memberof _seekbar
	 * @param {string} mode - [=this.analysis.binaryMode] Binary mode
	 * @returns {string[]}
	*/
	this.reportCompatibleFileExtension = (mode = this.analysis.binaryMode) => {
		return [...compatibleFiles[mode + 'List']];
	};
	/**
	 * Sets the steps required to draw the animation for the track's BPM. By default BPM is considered 100 if not available.
	 *
	 * @property
	 * @name bpmSteps
	 * @kind method
	 * @memberof _seekbar
	 * @param {FbMetadbHandle} handle - [=this.getHandle()] Track
	 * @returns {number} Max steps for a given BPM
	*/
	this.bpmSteps = (handle = this.getHandle()) => {
		// Don't allow anything faster than 2 steps or slower than 10 (scaled to 200 ms refresh rate) and consider all tracks have 100 BPM as default
		if (!handle) { return this.defaultSteps(); }
		const BPM = Number(this.TfMaxStep.EvalWithMetadb(handle));
		this.maxStep = Math.round(Math.min(Math.max(200 / (BPM || 100) * 2, 2), 10) * (200 / this.ui.refreshRate) ** (1 / 2));
		return this.maxStep;
	};
	/**
	 * Sets the steps required to draw an animation if no track is provided.
	 *
	 * @property
	 * @name defaultSteps
	 * @kind method
	 * @memberof _seekbar
	 * @returns {number}
	*/
	this.defaultSteps = () => {
		this.maxStep = Math.round(4 * (200 / this.ui.refreshRate) ** (1 / 2));
		this.maxStepVu = Math.max(1, 1000 / this.ui.refreshRate);
		return this.maxStep;
	};
	this.defaultSteps();
	/**
	 * Sets the current playback time in panel and repaints if needed.
	 *
	 * @property
	 * @name updateTime
	 * @kind method
	 * @memberof _seekbar
	 * @param {number} time
	 * @returns {void}
	*/
	this.updateTime = (time) => {
		if (!this.active) { return; }
		// Workaround for foo_skip_track
		const now = Date.now();
		const bFull = (now - this.lastUpdate) < 500;
		this.lastUpdate = now;
		this.time = Number.isSafeInteger(time) ? time : 0;
		framesVu.length = 0;
		if (this.cache === this.current) { // Paint only once if there is no animation
			if (this.preset.paintMode === 'full' && !this.preset.bPaintCurrent && this.analysis.binaryMode !== 'visualizer') { return; }
			if (this.isOnDemandTrack() && this.analysis.binaryMode === 'visualizer' && !this.isTrackPlaying()) { return; }
		} else { this.cache = this.current; }
		if (!window.IsVisible) { return; }
		// Repaint by zone when possible
		const frames = this.frames;
		const bPartial = this.preset.paintMode === 'partial';
		const bPrePaint = bPartial && this.preset.bPrePaint;
		const bFullAnimated = !bPartial && this.preset.bAnimate;
		if (this.analysis.binaryMode === 'visualizer' || bFullAnimated || this.preset.waveMode === 'vumeter' || !frames || bFull) {
			throttlePaint(bFull);
		} else if (bPrePaint || this.preset.bPaintCurrent || bPartial) {
			const widerModesScale = (this.preset.waveMode === 'bars' || this.preset.waveMode === 'halfbars' ? 2 : 1);
			const currX = this.x + this.marginW + (this.w - this.marginW * 2) * time / this.getHandleLength();
			const barW = Math.ceil(Math.max((this.w - this.marginW * 2) / frames, _scale(2))) * widerModesScale;
			const prePaintW = Math.min(
				bPrePaint && this.preset.futureSecs !== Infinity || this.preset.bAnimate
					? this.preset.futureSecs === Infinity && this.preset.bAnimate
						? Infinity
						: this.preset.futureSecs / this.timeConstant * barW + barW
					: 2.5 * barW * 2,
				this.w - currX + barW
			);
			throttlePaintRect(currX - barW, this.y, prePaintW, this.h);
		}
	};
	/**
	 * Resets panel internal variables.
	 *
	 * @property
	 * @name reset
	 * @kind method
	 * @memberof _seekbar
	 * @returns {void}
	*/
	this.reset = () => {
		this.current = [];
		this.currentHandle = null;
		this.channels = 0;
		this.frames = 0;
		this.timeConstant = 0;
		this.cache = null;
		this.time = 0;
		this.isFile = false;
		this.isLink = false;
		this.isZippedFile = false;
		this.isAllowedFile = false;
		this.isFallback = false;
		this.isError = false;
		bFallbackMode.paint = bFallbackMode.analysis = false;
		this.resetAnimation();
		if (this.queueId) { clearTimeout(this.queueId); }
	};
	/**
	 * Resets animation variables.
	 *
	 * @property
	 * @name resetAnimation
	 * @kind method
	 * @memberof _seekbar
	 * @returns {void}
	*/
	this.resetAnimation = () => {
		this.step = 0;
		this.stepVu = 0;
		this.offset = [];
		this.defaultSteps();
	};
	/**
	 * Called on_playback_stop. Resets data and painting.
	 *
	 * @property
	 * @name stop
	 * @kind method
	 * @memberof _seekbar
	 * @param {(-1|0|1|2|3)} [reason] - [=-1] -1 Invoked by JS | 0 Invoked by user | 1 End of file | 2 Starting another track | 3 Fb2k is shutting down
	 * @returns {void}
	*/
	this.stop = (reason = -1) => {
		if (reason !== -1 && !this.active) { return; }
		if (reason !== -1 && this.getPreferredTrackMode() === 'selected') {
			if (window.IsVisible) { throttlePaint(); }
		} else if (this.isOnDemandTrack() && this.analysis.binaryMode === 'visualizer') {
			this.resetAnimation();
		} else {
			this.reset();
			if (reason !== 2 && window.IsVisible) { throttlePaint(); }
		}
	};
	/**
	 * Called on_playback_pause. Resets painting.
	 *
	 * @property
	 * @name stop
	 * @kind method
	 * @memberof _seekbar
	 * @param {boolean} state - True when paused
	 * @returns {void}
	*/
	this.pause = (state) => {
		if (!window.IsVisible) { return; }
		throttlePaint(true);
		if (!state) { [60, 250, 500, 750, 1000].forEach((time) => setTimeout(throttlePaint, time)); }
	};
	/**
	 * Retrieves current panel colors with transparency applied
	 *
	 * @property
	 * @name getColors
	 * @kind method
	 * @memberof _seekbar
	 * @returns {Object<string,number>} Dictionary of available colors
	*/
	this.getColors = () => {
		return Object.fromEntries(
			Object.keys(this.ui.transparency).map((key) => {
				return [
					key,
					this.ui.colors[key] !== -1 && this.ui.transparency[key] !== 0
						? Math.round(this.ui.transparency[key]) === 100
							? this.ui.colors[key]
							: this.applyAlpha(this.ui.colors[key], this.ui.transparency[key])
						: -1
				];
			})
		);
	};
	/**
	 * Retrieves current channels to display downmixing and/or user selected channels filtering
	 *
	 * @property
	 * @name getDisplayChannels
	 * @kind method
	 * @memberof _seekbar
	 * @returns {number[]} List of available channels to display
	*/
	this.getDisplayChannels = (bDownMix = this.preset.bDownMixToMono) => {
		return this.preset.displayChannels.length
			? bDownMix
				? [0]
				: this.preset.displayChannels.filter((c) => c < this.channels)
			: Array.from({ length: this.channels }, (x, i) => i);
	};
	/**
	 * Draws the waveform bar with various designs based on the current settings.
	 *
	 * @property
	 * @name paint
	 * @kind method
	 * @memberof _seekbar
	 * @param {GdiGraphics} gr - GDI graphics object from on_paint callback.
	 * @returns {void}
	*/
	this.paint = (gr) => {
		profilerPaint.Reset();
		const colors = this.getColors();
		// Panel background
		if (colors.bg !== -1) { gr.FillSolidRect(this.x, this.y, this.w, this.h, colors.bg); }
		// In case paint has been delayed after playback has stopped...
		if (!this.getHandle()) {
			if (this.isOnDemandTrack() && this.analysis.binaryMode === 'visualizer') { return; }
			this.reset();
			return;
		} else if (this.frames === 0) {
			this.paintPlaybackText(gr, colors);
			return;
		}
		const displayChannels = this.getDisplayChannels();
		const channelsNum = displayChannels.length;
		const bVisualizer = this.analysis.binaryMode === 'visualizer' || this.isFallback || bFallbackMode.paint;
		if (!bVisualizer && !this.isTrackPlaying()) { this.resetAnimation(); }
		if (channelsNum && (this.getHandleLength() > 1 || bVisualizer)) {
			const bIsTrackPlaying = this.isTrackPlaying();
			const bPartial = this.preset.paintMode === 'partial';
			const bPrePaint = bPartial && this.preset.bPrePaint;
			const bFfProbe = this.analysis.binaryMode === 'ffprobe';
			const bBars = this.preset.waveMode === 'bars';
			const bHalfBars = this.preset.waveMode === 'halfbars';
			const bWaveForm = this.preset.waveMode === 'waveform';
			const bPoints = this.preset.waveMode === 'points';
			const bBarsFilled = this.preset.waveMode === 'barsfilled';
			const bVuMeter = this.preset.waveMode === 'vumeter';
			let bPaintedVu = false;
			let bFilledVu = framesVu.length >= this.maxStepVu;
			let bPaintedBg = this.ui.colors.bg === this.ui.colors.bgFuture && !bPrePaint;
			const currX = bIsTrackPlaying && Number.isFinite(fb.PlaybackTime)
				? this.x + this.marginW + (this.w - this.marginW * 2) * ((fb.PlaybackTime / this.getHandleLength()) || 0)
				: 0;
			const margin = channelsNum > 1 ? _scale(5) : 0;
			const size = (this.h - this.y - margin) * this.scaleH / channelsNum;
			const barW = (this.w - this.marginW * 2) / this.frames;
			const minPointDiff = 1; // in px
			const timeConstant = this.timeConstant;
			for (let c = 0; c < channelsNum; c++) {
				const offsetY = channelsNum > 1
					? size * (c - 1 / 2 * (channelsNum - 1))
					: 0;
				const channel = displayChannels[c];
				let n = 0;
				// Paint waveform layer
				let current, past = [{ x: 0, y: 1 }, { x: 0, y: -1 }];
				gr.SetSmoothingMode(bFfProbe ? 3 : 4);
				for (const frame of this.current[channel]) { // [peak]
					current = timeConstant * n;
					const bIsFuture = current > this.time;
					const bIsFutureAllowed = (current - this.time) < this.preset.futureSecs;
					if (bPartial && !bPrePaint && bIsFuture && bIsTrackPlaying) {
						if (colors.bgFuture !== -1) { gr.FillSolidRect(currX, this.y, this.w, this.h, colors.bgFuture); }
						break;
					} else if (bPrePaint && bIsFuture && !bIsFutureAllowed) { break; }
					if (!this.offset[n]) { this.offset.push(0); }
					const scale = this.ui.bLogScale
						? Math.sign(frame) * Math.log10((10 - 1) / 1 * Math.abs(frame) + 1)
						: frame;
					const x = this.x + this.marginW + barW * n;
					// Paint the alt background at the proper point
					if (bIsFuture && bPrePaint && !bPaintedBg && bIsTrackPlaying) {
						if (colors.bgFuture !== -1) { gr.FillSolidRect(currX, this.y, this.w, this.h, colors.bgFuture); }
						bPaintedBg = true;
					}
					// Don't calculate waveform if not needed
					if ([colors.main, colors.alt, colors.mainFuture, colors.altFuture].every((col) => col === -1)) {
						n++;
						if (bIsFuture && bPrePaint && bPaintedBg) { break; }
						else { continue; }
					}
					// Ensure points don't overlap too much without normalization
					if (bVuMeter) {
						if (this.stepVu >= this.maxStepVu) { this.stepVu = 0; }
						if (!bFilledVu && Math.abs(current - this.time) / this.getHandleLength() <= 0.001) {
							framesVu.push(Math.abs(scale));
							bFilledVu = framesVu.length >= this.maxStepVu;
						}
						if (!bPaintedVu) {
							const value = framesVu[this.stepVu++];
							[3, 2].forEach((i) => {
								const prevValue = this.stepVu > 0 ? framesVu[this.stepVu - i] : 0;
								if (prevValue && prevValue > value) {
									this.paintVuMeter(gr, offsetY, size, prevValue, colors, true);
								}
							});
							bPaintedVu = this.paintVuMeter(gr, offsetY, size, value, colors);
							if (bPaintedVu) {
								gr.DrawRect(this.x + this.marginW, this.h / 2 - offsetY - size / 2, (this.w - this.marginW * 2), size, _scale(1) / 2, this.applyAlpha(colors.alt, 0.6));
							}
						}
					} else if (past.every((p) => (p.y !== Math.sign(scale) && !bHalfBars) || (p.y === Math.sign(scale) || bHalfBars) && (x - p.x) >= minPointDiff)) {
						if (bWaveForm) {
							this.paintWave(gr, n, x, offsetY, size, scale, bPrePaint, bIsFuture, bVisualizer, colors);
						} else if (bHalfBars) {
							this.paintHalfBars(gr, n, x, barW, currX, offsetY, size, scale, bPrePaint, bIsFuture, bVisualizer, bFfProbe, colors);
						} else if (bBars) {
							this.paintBars(gr, n, x, barW, currX, offsetY, size, scale, bPrePaint, bIsFuture, bVisualizer, bFfProbe, colors);
						} else if (bPoints) {
							this.paintPoints(gr, n, x, offsetY, size, scale, bPrePaint, bIsFuture, bVisualizer, colors);
						} else if (bBarsFilled) {
							this.paintBarsFilled(gr, n, x, barW, offsetY, size, scale, bPrePaint, bIsFuture, bVisualizer, colors);
						}
						past.shift();
						past.push({ x, y: Math.sign(scale) });
					}
					n++;
				}
				gr.SetSmoothingMode(0);
				// Current position
				if ((bFfProbe || bWaveForm || bPoints || bBarsFilled || bVuMeter) && bIsTrackPlaying) {
					this.paintCurrentPos(gr, currX, barW, colors);
				}
			}
			// Animate smoothly, Repaint by zone when possible. Only when not in pause!
			if (bIsTrackPlaying && !fb.IsPaused) {
				this.paintAnimation(gr, this.frames, currX, bPrePaint, bVisualizer, bPartial, bBars, bHalfBars, bVuMeter);
			}
		}
	};
	/**
	 * Draws current time indicator.
	 *
	 * @property
	 * @name paintCurrentPos
	 * @kind method
	 * @memberof _seekbar
	 * @param {GdiGraphics} gr - GDI graphics object from on_paint callback.
	 * @param {number} currX - Current time position
	 * @param {number} barW - Point size
	 * @param {{currPos: number}} colors - Colors used
	 * @returns {void}
	*/
	this.paintCurrentPos = (gr, currX, barW, colors) => {
		if (colors.currPos !== -1 && (this.preset.bPaintCurrent || this.mouseDown)) {
			const minBarW = Math.round(Math.max(barW, _scale(1)));
			gr.DrawLine(currX, this.y, currX, this.y + this.h, minBarW, colors.currPos);
		}
	};
	/**
	 * Draws waveform wave mode.
	 *
	 * @property
	 * @name paintWave
	 * @kind method
	 * @memberof _seekbar
	 * @param {GdiGraphics} gr - GDI graphics object from on_paint callback.
	 * @param {number} n - Point idx
	 * @param {number} x - X-point coord
	 * @param {number} offsetY - Offset in Y-Axis due to multichannel handling
	 * @param {number} size - Panel point size
	 * @param {number} scale - Point scaling
	 * @param {boolean} bPrePaint - Flag used when points after current time must be paint
	 * @param {boolean} bIsFuture - Flag used when point is after current time
	 * @param {boolean} bVisualizer - Flag used when mode is visualizer
	 * @param {{bg:number, main:number, alt:number, bgFuture:number, mainFuture:number, altFuture:number}} colors - Colors used
	 * @returns {void}
	*/
	this.paintWave = (gr, n, x, offsetY, size, scale, bPrePaint, bIsFuture, bVisualizer, colors) => { // NOSONAR
		const scaledSize = size / 2 * scale;
		this.offset[n] += ((bPrePaint && bIsFuture || this.preset.paintMode === 'full') && this.preset.bAnimate || bVisualizer ? - Math.sign(scale) * Math.random() * scaledSize / 10 * this.step / this.maxStep : 0); // Add movement when painting future
		const rand = Math.sign(scale) * this.offset[n];
		const y = scaledSize > 0
			? Math.min(Math.max(scaledSize + rand, 1), size / 2)
			: Math.max(Math.min(scaledSize + rand, -1), - size / 2);
		const color = bPrePaint && bIsFuture ? colors.mainFuture : colors.main;
		const altColor = bPrePaint && bIsFuture ? colors.altFuture : colors.alt;
		let z = bVisualizer ? Math.abs(y) : y;
		if (z > 0) {
			if (altColor !== color) {
				if (color !== -1) { gr.FillSolidRect(x, this.h / 2 - offsetY - z, 1, z / 2, color); }
				if (altColor !== -1) { gr.FillSolidRect(x, this.h / 2 - offsetY - z / 2, 1, z / 2, altColor); }
			} else if (color !== -1) { gr.FillSolidRect(x, this.h / 2 - offsetY - z, 1, z, color); }
		}
		z = bVisualizer ? - Math.abs(y) : y;
		if (z < 0) {
			if (altColor !== color) {
				if (color !== -1) { gr.FillSolidRect(x, this.h / 2 - offsetY - z / 2, 1, - z / 2, color); }
				if (altColor !== -1) { gr.FillSolidRect(x, this.h / 2 - offsetY, 1, - z / 2, altColor); }
			} else if (color !== -1) { gr.FillSolidRect(x, this.h / 2 - offsetY, 1, - z, color); }
		}
	};
	/**
	 * Draws half bars wave mode.
	 *
	 * @property
	 * @name paintHalfBars
	 * @kind method
	 * @memberof _seekbar
	 * @param {GdiGraphics} gr - GDI graphics object from on_paint callback.
	 * @param {number} n - Point idx
	 * @param {number} x - X-point coord
	 * @param {number} barW - Bar size
	 * @param {number} currX - Current time position to handle indicator within bars
	 * @param {number} offsetY - Offset in Y-Axis due to multichannel handling
	 * @param {number} size - Panel point size
	 * @param {number} scale - Point scaling
	 * @param {boolean} bPrePaint - Flag used when points after current time must be paint
	 * @param {boolean} bIsFuture - Flag used when point is after current time
	 * @param {boolean} bVisualizer - Flag used when mode is visualizer
	 * @param {{bg:number, main:number, alt:number, bgFuture:number, mainFuture:number, altFuture:number, currPos: number}} colors - Colors used
	 * @returns {void}
	*/
	this.paintHalfBars = (gr, n, x, barW, currX, offsetY, size, scale, bPrePaint, bIsFuture, bVisualizer, bFfProbe, colors) => { // NOSONAR
		const scaledSize = size / 2 * scale;
		this.offset[n] += ((bPrePaint && bIsFuture || this.preset.paintMode === 'full') && this.preset.bAnimate || bVisualizer ? - Math.sign(scale) * Math.random() * scaledSize / 10 * this.step / this.maxStep : 0); // Add movement when painting future
		const rand = Math.sign(scale) * this.offset[n];
		let y = scaledSize > 0
			? Math.min(Math.max(scaledSize + rand, 1), size / 2)
			: Math.max(Math.min(scaledSize + rand, -1), - size / 2);
		if (this.preset.bHalfBarsShowNeg) { y = Math.abs(y); }
		let color = bPrePaint && bIsFuture ? colors.mainFuture : colors.main;
		let altColor = bPrePaint && bIsFuture ? colors.altFuture : colors.alt;
		// Current position
		if ((this.preset.bPaintCurrent || this.mouseDown) && !bFfProbe && colors.currPos !== -1) {
			if (x <= currX && x >= currX - 2 * barW) { color = altColor = colors.currPos; }
		}
		if (y > 0) {
			if (altColor !== color) {
				if (color !== -1) { gr.DrawRect(x, this.h / 2 - offsetY + size / 2 - 2 * y, barW, y, 1, color); }
				if (altColor !== -1) { gr.DrawRect(x, this.h / 2 - offsetY + size / 2 - y, barW, y, 1, altColor); }
			} else if (color !== -1) { gr.DrawRect(x, this.h / 2 - offsetY + size / 2 - 2 * y, barW, 2 * y, 1, color); }
		}
	};
	/**
	 * Draws bars wave mode.
	 *
	 * @property
	 * @name paintBars
	 * @kind method
	 * @memberof _seekbar
	 * @param {GdiGraphics} gr - GDI graphics object from on_paint callback.
	 * @param {number} n - Point idx
	 * @param {number} x - X-point coord
	 * @param {number} barW - Bar size
	 * @param {number} currX - Current time position to handle indicator within bars
	 * @param {number} offsetY - Offset in Y-Axis due to multichannel handling
	 * @param {number} size - Panel point size
	 * @param {number} scale - Point scaling
	 * @param {boolean} bPrePaint - Flag used when points after current time must be paint
	 * @param {boolean} bIsFuture - Flag used when point is after current time
	 * @param {boolean} bVisualizer - Flag used when mode is visualizer
	 * @param {{bg:number, main:number, alt:number, bgFuture:number, mainFuture:number, altFuture:number, currPos: number}} colors - Colors used
	 * @returns {void}
	*/
	this.paintBars = (gr, n, x, barW, currX, offsetY, size, scale, bPrePaint, bIsFuture, bVisualizer, bFfProbe, colors) => { // NOSONAR
		const scaledSize = size / 2 * scale;
		this.offset[n] += ((bPrePaint && bIsFuture || this.preset.paintMode === 'full') && this.preset.bAnimate || bVisualizer ? - Math.sign(scale) * Math.random() * scaledSize / 10 * this.step / this.maxStep : 0); // Add movement when painting future
		const rand = Math.sign(scale) * this.offset[n];
		const y = scaledSize > 0
			? Math.min(Math.max(scaledSize + rand, 1), size / 2)
			: Math.max(Math.min(scaledSize + rand, -1), - size / 2);
		let color = bPrePaint && bIsFuture ? colors.mainFuture : colors.main;
		let altColor = bPrePaint && bIsFuture ? colors.altFuture : colors.alt;
		// Current position
		if ((this.preset.bPaintCurrent || this.mouseDown) && !bFfProbe && colors.currPos !== -1) {
			if (x <= currX && x >= currX - 2 * barW) { color = altColor = colors.currPos; }
		}
		let z = bVisualizer ? Math.abs(y) : y;
		if (z > 0) { // Split waveform in 2, and then each half in 2 for highlighting
			if (altColor !== color) {
				if (color !== -1) { gr.DrawRect(x, this.h / 2 - offsetY - z, barW, z / 2, 1, color); }
				if (altColor !== -1) { gr.DrawRect(x, this.h / 2 - offsetY - z / 2, barW, z / 2, 1, altColor); }
			} else {
				gr.DrawRect(x, this.h / 2 - offsetY - z, barW, z, 1, color);
			}
		}
		z = bVisualizer ? - Math.abs(y) : y;
		if (z < 0) {
			if (altColor !== color) {
				if (color !== -1) { gr.DrawRect(x, this.h / 2 - offsetY - z / 2, barW, - z / 2, 1, color); }
				if (altColor !== -1) { gr.DrawRect(x, this.h / 2 - offsetY, barW, - z / 2, 1, altColor); }
			} else if (color !== -1) { gr.DrawRect(x, this.h / 2 - offsetY, barW, - z, 1, color); }
		}
	};
	/**
	 * Draws points wave mode.
	 *
	 * @property
	 * @name paintPoints
	 * @kind method
	 * @memberof _seekbar
	 * @param {GdiGraphics} gr - GDI graphics object from on_paint callback.
	 * @param {number} n - Point idx
	 * @param {number} x - X-point coord
	 * @param {number} offsetY - Offset in Y-Axis due to multichannel handling
	 * @param {number} size - Panel point size
	 * @param {number} scale - Point scaling
	 * @param {boolean} bPrePaint - Flag used when points after current time must be paint
	 * @param {boolean} bIsFuture - Flag used when point is after current time
	 * @param {boolean} bVisualizer - Flag used when mode is visualizer
	 * @param {{bg:number, main:number, alt:number, bgFuture:number, mainFuture:number, altFuture:number}} colors - Colors used
	 * @returns {void}
	*/
	this.paintPoints = (gr, n, x, offsetY, size, scale, bPrePaint, bIsFuture, bVisualizer, colors) => { // NOSONAR
		const scaledSize = size / 2 * scale;
		const y = scaledSize > 0
			? Math.max(scaledSize, 1)
			: Math.min(scaledSize, -1);
		const color = bPrePaint && bIsFuture ? colors.mainFuture : colors.main;
		const altColor = bPrePaint && bIsFuture ? colors.altFuture : colors.alt;
		this.offset[n] += ((bPrePaint && bIsFuture || this.preset.paintMode === 'full') && this.preset.bAnimate || bVisualizer ? Math.random() * Math.abs(this.step / this.maxStep) : 0); // Add movement when painting future
		const rand = this.offset[n];
		const step = Math.max(size / 80, 5) + (rand || 1); // Point density
		const circleSize = Math.max(step / 25, 1);
		// Split waveform in 2, and then each half in 2 for highlighting. If colors match, the same amount of points are painted anyway...
		const sign = Math.sign(y);
		let yCalc = this.h / 2 - offsetY;
		let bottom = this.h / 2 - offsetY - y / 2;
		while (sign * (yCalc - bottom) > 0) {
			if (altColor !== -1) { gr.DrawEllipse(x, yCalc, circleSize, circleSize, 1, altColor); }
			yCalc += (- sign) * step;
		}
		bottom += - y / 2;
		while (sign * (yCalc - bottom) > 0) {
			if (color !== -1) { gr.DrawEllipse(x, yCalc, circleSize, circleSize, 1, color); }
			yCalc += (- sign) * step;
		}
		if (bVisualizer) {
			const sign = - Math.sign(y);
			let yCalc = this.h / 2 - offsetY;
			let bottom = this.h / 2 - offsetY + y / 2;
			while (sign * (yCalc - bottom) > 0) {
				if (altColor !== -1) { gr.DrawEllipse(x, yCalc, circleSize, circleSize, 1, altColor); }
				yCalc += (- sign) * step;
			}
			bottom += + y / 2;
			while (sign * (yCalc - bottom) > 0) {
				if (color !== -1) { gr.DrawEllipse(x, yCalc, circleSize, circleSize, 1, color); }
				yCalc += (- sign) * step;
			}
		}
	};
	/**
	 * Draws points wave mode.
	 *
	 * @property
	 * @name paintBarsFilled
	 * @kind method
	 * @memberof _seekbar
	 * @param {GdiGraphics} gr - GDI graphics object from on_paint callback.
	 * @param {number} n - Point idx
	 * @param {number} x - X-point coord
	 * @param {number} offsetY - Offset in Y-Axis due to multichannel handling
	 * @param {number} size - Panel point size
	 * @param {number} scale - Point scaling
	 * @param {boolean} bPrePaint - Flag used when points after current time must be paint
	 * @param {boolean} bIsFuture - Flag used when point is after current time
	 * @param {boolean} bVisualizer - Flag used when mode is visualizer
	 * @param {{bg:number, main:number, alt:number, bgFuture:number, mainFuture:number, altFuture:number}} colors - Colors used
	 * @returns {void}
	*/
	this.paintBarsFilled = (gr, n, x, barW, offsetY, size, scale, bPrePaint, bIsFuture, bVisualizer, colors) => { // NOSONAR
		const scaledSize = size / 2 * scale;
		this.offset[n] += ((bPrePaint && bIsFuture || this.preset.paintMode === 'full') && this.preset.bAnimate || bVisualizer ? - Math.sign(scale) * Math.random() * scaledSize / 10 * this.step / this.maxStep : 0); // Add movement when painting future
		const rand = Math.sign(scale) * this.offset[n];
		const y = scaledSize > 0
			? Math.min(Math.max(scaledSize + rand, 1), size / 2)
			: Math.max(Math.min(scaledSize + rand, -1), - size / 2);
		const color = bPrePaint && bIsFuture ? colors.mainFuture : colors.main;
		const altColor = bPrePaint && bIsFuture ? colors.altFuture : colors.alt;
		let z = bVisualizer ? Math.abs(y) : y;
		if (z > 0) {
			if (altColor !== color) {
				if (color !== -1) { gr.FillSolidRect(x, this.h / 2 - offsetY - z, barW, z / 2, color); }
				if (altColor !== -1) { gr.FillSolidRect(x, this.h / 2 - offsetY - z / 2, barW, z / 2, altColor); }
			} else if (color !== -1) { gr.FillSolidRect(x, this.h / 2 - offsetY - z, barW, z, color); }
		}
		z = bVisualizer ? - Math.abs(y) : y;
		if (z < 0) {
			if (altColor !== color) {
				if (color !== -1) { gr.FillSolidRect(x, this.h / 2 - offsetY - z / 2, barW, - z / 2, color); }
				if (altColor !== -1) { gr.FillSolidRect(x, this.h / 2 - offsetY, barW, - z / 2, altColor); }
			} else if (color !== -1) { gr.FillSolidRect(x, this.h / 2 - offsetY, barW, - z, color); }
		}
	};
	/**
	 * VU meter paint
	 *
	 * @property
	 * @name paintVuMeter
	 * @kind method
	 * @memberof _seekbar
	 * @param {GdiGraphics} gr - GDI graphics object from on_paint callback.
	 * @param {number} offsetY - Offset in Y-Axis due to multichannel handling
	 * @param {number} size - Panel point size
	 * @param {number} scale - Point scaling
	 * @param {{main: number, alt:number}} colors - Colors used
	 * @param {boolean} bFade - Flag used when drawn point should be faded
	 * @returns {boolean}
	*/
	this.paintVuMeter = (gr, offsetY, size, scale, colors, bFade) => {
		if (!scale) { return false; }
		const color = bFade ? this.applyAlpha(colors.main, 70) : colors.main;
		const altColor = bFade ? this.applyAlpha(colors.alt, 70) : colors.alt;
		gr.FillGradRect(this.x + this.marginW, this.h / 2 - offsetY - size / 2, (this.w - this.marginW * 2) * scale, size, 1, color, altColor);
		return true;
	};
	/**
	 * Draws fallback text if required
	 *
	 * @property
	 * @name paintPlaybackText
	 * @kind method
	 * @memberof _seekbar
	 * @param {GdiGraphics} gr - GDI graphics object from on_paint callback.
	 * @param {{bg: number}} colors - Colors used
	 * @returns {void}
	*/
	this.paintPlaybackText = (gr, colors) => {
		const center = DT_VCENTER | DT_CENTER | DT_END_ELLIPSIS | DT_CALCRECT | DT_NOPREFIX;
		const textColor = colors.bg !== -1
			? invert(colors.bg, true)
			: this.callbacks.backgroundColor ? invert(this.callbacks.backgroundColor(), true) : 0xFFFFFFFF;
		if (!this.bBinaryFound) {
			gr.GdiDrawText('Binary ' + _p(this.analysis.binaryMode) + ' not found', this.ui.gFont, textColor, this.x + this.marginW, 0, this.w - this.marginW * 2, this.h, center);
		} else if (this.isError) {
			if (!fb.IsPlaying && this.analysis.binaryMode === 'visualizer') {
				gr.GdiDrawText('Visualizer only works while playing', this.ui.gFont, textColor, this.x + this.marginW, 0, this.w - this.marginW * 2, this.h, center);
			} else {
				gr.GdiDrawText('File can not be analyzed', this.ui.gFont, textColor, this.x + this.marginW, 0, this.w - this.marginW * 2, this.h, center);
			}
		} else if (!this.isAllowedFile && !this.isFallback && (this.isFile || this.isLink) && this.analysis.binaryMode !== 'visualizer') {
			gr.GdiDrawText('Not compatible file format', this.ui.gFont, textColor, this.x + this.marginW, 0, this.w - this.marginW * 2, this.h, center);
		} else if (!this.analysis.bAutoAnalysis) {
			gr.GdiDrawText('Seekbar file not found', this.ui.gFont, textColor, this.x + this.marginW, 0, this.w - this.marginW * 2, this.h, center);
		} else if (this.isAllowedFile && !this.isFile && !this.isLink) {
			gr.GdiDrawText('Dead or not found file', this.ui.gFont, textColor, this.x + this.marginW, 0, this.w - this.marginW * 2, this.h, center);
		} else if (this.active) {
			gr.GdiDrawText('Analyzing track...', this.ui.gFont, textColor, this.x + this.marginW, 0, this.w - this.marginW * 2, this.h, center);
		}
	};
	/**
	 * Handles the different steps of animations and refresh the panel if needed
	 *
	 * @property
	 * @name paintAnimation
	 * @kind method
	 * @memberof _seekbar
	 * @param {GdiGraphics} gr - GDI graphics object from on_paint callback.
	 * @param {number} frames - Total number of data points
	 * @param {number} currX - Current time position
	 * @param {boolean} bPrePaint - Flag used when points after current time must be paint
	 * @param {boolean} bVisualizer - Flag used when mode is visualizer
	 * @param {boolean} bPartial - Flag used when paint mode is partial
	 * @param {boolean} bBars - Flag used when wave mode is bars
	 * @param {boolean} bHalfBars - Flag used when wave mode is half bars
	 * @param {boolean} bVuMeter - Flag used when wave mode is VU meter
	 * @returns {void}
	*/
	this.paintAnimation = (gr, frames, currX, bPrePaint, bVisualizer, bPartial, bBars, bHalfBars, bVuMeter) => { // NOSONAR
		const bFullAnimated = !bPartial && this.preset.bAnimate;
		// Incrementally draw animation on small steps
		if ((bPrePaint && this.preset.bAnimate) || bFullAnimated || bVisualizer) {
			if (this.step >= this.maxStep) { this.step = - this.step; }
			else {
				if (this.step === 0) { this.offset = this.offset.map((n) => Math.max(Math.min(n, 10), -5)); }
				this.step++;
			}
		}
		if (bVisualizer || bFullAnimated || (bVuMeter && frames)) { throttlePaint(); }
		else if ((bPrePaint || this.preset.bPaintCurrent || bPartial) && frames) {
			const widerModesScale = (bBars || bHalfBars ? 2 : 1);
			const barW = Math.ceil(Math.max((this.w - this.marginW * 2) / frames, _scale(2))) * widerModesScale;
			const prePaintW = Math.min(
				bPrePaint && this.preset.futureSecs !== Infinity || this.preset.bAnimate
					? this.preset.futureSecs === Infinity && this.preset.bAnimate
						? Infinity
						: this.preset.futureSecs / this.timeConstant * barW + barW
					: 2.5 * barW * 2,
				this.w - currX + barW
			);
			throttlePaintRect(currX - barW, this.y, prePaintW, this.h);
		}
		if (this.ui.bVariableRefreshRate) {
			if (profilerPaint.Time > this.ui.refreshRate) { this.updateConfig({ ui: { refreshRate: this.ui.refreshRate + 50 } }); }
			else if (profilerPaint.Time < this.ui.refreshRate && profilerPaint.Time >= this.ui.refreshRateOpt) { this.updateConfig({ ui: { refreshRate: this.ui.refreshRate - 25 } }); }
		}
	};
	/**
	 * Checks if position is over panel
	 *
	 * @property
	 * @name trace
	 * @kind method
	 * @memberof _seekbar
	 * @param {number} x
	 * @param {number} y
	 * @returns {boolean}
	*/
	this.trace = (x, y) => {
		return (x >= this.x && y >= this.y && x <= this.x + this.w && y <= this.y + this.h);
	};
	/**
	 * Called on on_mouse_lbtn_up
	 *
	 * @property
	 * @name lbtnUp
	 * @kind method
	 * @memberof _seekbar
	 * @param {number} x
	 * @param {number} y
	 * @param {number} mask - keyboard mask
	 * @returns {boolean} True if click was processed
	*/
	this.lbtnUp = (x, y, mask) => { // eslint-disable-line no-unused-vars
		this.mouseDown = false;
		if (!this.active) { return; }
		if (!this.trace(x, y)) { return false; }
		if (this.currentHandle) { // Seek
			const frames = this.frames;
			if (frames !== 0) {
				const time = this.getPlaybackTimeAt(x);
				return this.setPlaybackTime(time);
			}
		}
		return false;
	};
	/**
	 * Called on on_mouse_wheel or on_mouse_wheel_h
	 *
	 * @property
	 * @name wheel
	 * @kind method
	 * @memberof _seekbar
	 * @param {number} step
	 * @returns {boolean}
	*/
	this.wheel = (step) => { // eslint-disable-line no-unused-vars
		if (!this.active) { return; }
		if (this.currentHandle && this.isTrackPlaying()) { // Seek
			const frames = this.frames;
			if (frames !== 0) {
				const scroll = step * this.ui.wheel.step * (this.ui.wheel.bReversed ? -1 : 1);
				let time = fb.PlaybackTime < Number.MAX_SAFE_INTEGER ? fb.PlaybackTime : 0;
				switch (this.ui.wheel.unit.toLowerCase()) {
					case 'ms': time += scroll / 1000; break;
					case '%': time += scroll / 100 * this.getHandleLength(); break;
					case 's':
					default: time += scroll; break;
				}
				if (time < 0) { time = 0; }
				else if (time > this.getHandleLength()) { time = this.getHandleLength(); }
				fb.PlaybackTime = time;
				if (window.IsVisible) { throttlePaint(true); }
				return true;
			}
		}
		return false;
	};
	/**
	 * Called on on_mouse_wheel.
	 *
	 * @property
	 * @name wheelResize
	 * @kind method
	 * @memberof _seekbar
	 * @param {number} step
	 * @param {boolean} bForce
	 * @returns {boolean}
	*/
	this.wheelResize = (step, bForce) => {
		if ((this.trace(this.mx, this.my) || bForce) && step !== 0) {
			let key, min, max;
			switch (true) {
				case true:
					key = ['ui', 'normalizeWidth']; min = 0.5;  max = 100; break;
			}
			if (!key) { return; }
			else {
				const newConfig = {};
				const value = Math.min(Math.max(min, getNested(this, ...key) + Math.sign(step) / 2), max);
				addNested(newConfig, value, ...key);
				if (key.includes('normalizeWidth')) {
					if (!this.ui.bNormalizeWidth) {
						if (newConfig.ui.normalizeWidth < 1) { return; }
						newConfig.ui.bNormalizeWidth = true;
						newConfig.ui.normalizeWidth = 1;
					} else if (newConfig.ui.normalizeWidth < 1) {
						newConfig.ui.bNormalizeWidth = false;
						newConfig.ui.normalizeWidth = 1;
					}
				}
				this.updateConfig(newConfig);
			}
			throttlePaint();
			return true;
		}
		return false;
	};
	/**
	 * Called on on_mouse_move
	 *
	 * @property
	 * @name move
	 * @kind method
	 * @memberof _seekbar
	 * @param {number} x
	 * @param {number} y
	 * @param {number} mask - keyboard mask
	 * @returns {void}
	*/
	this.move = (x, y, mask) => {
		this.mx = x;
		this.my = y;
		if (mask === MK_LBUTTON && this.lbtnUp(x, y, mask)) {
			this.mouseDown = true;
		}
	};
	/**
	 * Called on on_mouse_leave
	 *
	 * @property
	 * @name leave
	 * @kind method
	 * @memberof _seekbar
	 * @returns {void}
	*/
	this.leave = () => {
		this.mx = -1;
		this.my = -1;
	};
	/**
	 * Called on on_size. Resizes panel.
	 *
	 * @property
	 * @name resize
	 * @kind method
	 * @memberof _seekbar
	 * @param {number} w
	 * @param {number} h
	 * @returns {void}
	*/
	this.resize = (w, h) => {
		this.w = w;
		this.h = h;
		if (this.scaleW !== null) { this.marginW = this.scaleW * this.w; }
	};
	/**
	 * Called on on_script_unload. Removes data files if such setting is enabled.
	 *
	 * @property
	 * @name unload
	 * @kind method
	 * @memberof _seekbar
	 * @returns {void}
	*/
	this.unload = () => {
		if (this.analysis.bAutoRemove) {
			this.removeData();
		}
	};
	/**
	 * Checks if data file is allowed to be saved for a given track.
	 *
	 * @property
	 * @name allowedSaveData
	 * @kind method
	 * @memberof _seekbar
	 * @param {FbMetadbHandle} handle
	 * @returns {boolean}
	*/
	this.allowedSaveData = (handle) => {
		return this.analysis.storeMode === 'all' || this.analysis.storeMode === 'library' && handle && fb.IsMetadbInMediaLibrary(handle);
	};
	/**
	 * Removes all data files
	 *
	 * @property
	 * @name removeData
	 * @kind method
	 * @memberof _seekbar
	 * @returns {boolean} True on success
	*/
	this.removeData = () => {
		return _deleteFolder(this.folder);
	};
	/**
	 * Saves data file
	 *
	 * @property
	 * @name saveData
	 * @kind method
	 * @memberof _seekbar
	 * @param {object} processedData - Processed seekbar data
	 * @param {string} seekbarFile - Track ID file path
	 * @param {'.ff'|'.aw'} prefix - Binary mode prefix
	 * @returns {boolean} True on success
	*/
	this.saveData = (processedData, seekbarFile, prefix) => {
		const str = JSON.stringify(processedData);
		if (this.analysis.bMultiChannel) { prefix += '.m'; }
		if (this.analysis.compressionMode === 'utf-16') {
			// To save UTF16-LE files, FSO is needed.
			// https://github.com/TheQwertiest/foo_spider_monkey_panel/issues/200
			const compressed = LZString.compressToUTF16(str);
			return _saveFSO(seekbarFile + prefix + '.lz16', compressed, true);
		} else if (this.analysis.compressionMode === 'utf-8') {
			// Only Base64 strings can be saved on UTF8 files...
			// https://github.com/TheQwertiest/foo_spider_monkey_panel/issues/200
			const compressed = LZUTF8.compress(str, { outputEncoding: 'Base64' });
			return _save(seekbarFile + prefix + '.lz', compressed);
		} else {
			return _save(seekbarFile + prefix + '.json', str);
		}
	};
	/**
	 * Retrieves associated data paths by TF for a given track
	 *
	 * @property
	 * @name move
	 * @kind method
	 * @memberof _seekbar
	 * @param {FbMetadbHandle} handle
	 * @returns {{seekbarFolder: string, seekbarFile: string, sourceFile: string}} Track data folder, track data filename and track source path
	*/
	this.getPaths = (handle) => {
		if (!handle) { return { seekbarFolder: '', seekbarFile: '', sourceFile: '' }; }
		const id = sanitizePath(this.Tf.EvalWithMetadb(handle)); // Ensure paths are valid!
		const fileName = id.split('\\').pop();
		const seekbarFolder = this.folder + id.replace(fileName, '');
		const seekbarFile = this.folder + id;
		const sourceFile = this.isZippedFile ? handle.Path.split('|')[0] : handle.Path;
		return { seekbarFolder, seekbarFile, sourceFile };
	};
	/**
	 * Analyzes a track, saves data file if needed and sets current data for panel.
	 *
	 * @property
	 * @name analyze
	 * @kind method
	 * @async
	 * @memberof _seekbar
	 * @param {FbMetadbHandle} handle
	 * @param {string} seekbarFolder - Track data folder
	 * @param {string} seekbarFile - Track data filename
	 * @param {string} [sourceFile] - [=handle.Path] track source path
	 * @param {number} mask - keyboard mask
	 * @returns {Promise.<Boolean>}
	*/
	this.analyze = async (handle, seekbarFolder, seekbarFile, sourceFile = handle.Path) => {
		if (!_isFolder(seekbarFolder)) { _createFolder(seekbarFolder); }
		let profiler, cmd;
		// Change to track folder since ffprobe has stupid escape rules which are impossible to apply right with amovie input mode
		let handleFileName = sourceFile.split('\\').pop();
		const handleFolder = sourceFile.replace(handleFileName, '');
		const bVisualizer = this.analysis.binaryMode === 'visualizer';
		const bAuWav = this.analysis.binaryMode === 'audiowaveform';
		const bFfProbe = this.analysis.binaryMode === 'ffprobe';
		const sampleRate = fb.TitleFormat('%SAMPLERATE%').EvalWithMetadb(handle);
		if (this.isAllowedFile && !bFallbackMode.analysis && bAuWav) {
			if (this.logging.bProfile) { profiler = new FbProfiler('audiowaveform'); }
			const extension = RegExp(/(?:\.)(\w+$)/i).exec(handleFileName)[1];
			const pxPerSecond = this.analysis.resolution <= sampleRate / 2
				? this.analysis.resolution || 1
				: Math.round(sampleRate / 2);
			cmd = 'CMD /C PUSHD ' + _q(handleFolder) + ' && ' +
				_q(_resolvePath(this.binaries.audiowaveform)) + ' -i ' + _q(handleFileName) +
				' --pixels-per-second ' + pxPerSecond +
				' --input-format ' + extension + ' --bits 8' +
				(this.analysis.bMultiChannel ? ' --split-channels' : '') +
				' -o ' + _q(seekbarFolder + 'data.json');
		} else if (this.isAllowedFile && !bFallbackMode.analysis && bFfProbe) {
			if (this.logging.bProfile) { profiler = new FbProfiler('ffprobe'); }
			handleFileName = handleFileName.replace(/[,:%.*+?^${}()|[\]\\]/g, '\\$&')
				.replace(/'/g, '\\\\\\\''); // And here we go again...
			// https://ayosec.github.io/ffmpeg-filters-docs/3.0/Filters/Audio/astats.html
			const samplesPerFrame = this.analysis.resolution <= sampleRate / 2
				? Math.round(sampleRate / (this.analysis.resolution * 2 || 2))
				: 1;
			cmd = 'CMD /C PUSHD ' + _q(handleFolder) + ' && ' +
				_q(_resolvePath(this.binaries.ffprobe)) +
				' -hide_banner -v panic -f lavfi -i amovie=' + _q(handleFileName) +
				',asetnsamples=n=' + samplesPerFrame + ':p=0' +
				',astats=metadata=1:reset=1 -show_entries frame=pkt_pts_time:frame_tags=' +
				(
					this.analysis.bMultiChannel
						? Array.from({ length: this.channels }, (_, i) => 'lavfi.astats.' + (i + 1) + '.Peak_level,lavfi.astats.' + (i + 1) + '.RMS_level,lavfi.astats.' + (i + 1) + '.RMS_peak').join(',')
						: 'lavfi.astats.Overall.Peak_level,lavfi.astats.Overall.RMS_level,lavfi.astats.Overall.RMS_peak'
				) +
				' -print_format json > ' + _q(seekbarFolder + 'data.json');
		} else if (this.isFallback || bVisualizer || bFallbackMode.analysis) {
			profiler = new FbProfiler('visualizer');
		}
		if (cmd) {
			if (this.logging.bSave) { console.log('Seekbar: Scanning -> ' + sourceFile); }
			if (this.logging.bDebug) { console.log(cmd); }
		} else if (!this.isAllowedFile && !bVisualizer && !bFallbackMode.analysis) {
			if (this.logging.bError) { console.log('Seekbar: Skipping incompatible file -> ' + sourceFile); }
		}
		const channels = this.channels; // If playback is changed during analysis it may change
		let bDone = cmd ? _runCmd(cmd, false) : true;
		bDone = bDone && (await new Promise((resolve) => {
			if (this.isFallback || bVisualizer || bFallbackMode.analysis) { resolve(true); }
			const timeout = Date.now() + Math.round(10000 * (handle.Length / 180));
			// Break if it takes too much time: 10 secs per 3 min of track
			const id = setInterval(() => {
				if (_isFile(seekbarFolder + 'data.json')) {
					// ffmpeg writes sequentially so wait until it finish...
					if (!bFfProbe || _jsonParseFile(seekbarFolder + 'data.json', this.codePage)) {
						clearInterval(id); resolve(true);
					}
				} else if (Date.now() > timeout) { clearInterval(id); resolve(false); }
			}, 300);
		})
		);
		if (bDone) {
			let data = cmd
				? _jsonParseFile(seekbarFolder + 'data.json', this.codePage)
				: this.visualizerData(handle);
			_deleteFile(seekbarFolder + 'data.json');
			const bSameHandle = this.compareTrack(handle);
			const bNotFallback = cmd && !this.isFallback && !bFallbackMode.analysis;
			const bDisplayVisualizer = this.isFallback || bVisualizer || bFallbackMode.analysis;
			if (data) {
				if (bNotFallback) {
					if (bFfProbe && data.frames) { data = data.frames; }
					else if (bAuWav && data.data) { data = data.data; }
				}
				const len = data.length;
				if (bNotFallback && bFfProbe && len) {
					const processedData = Array.from({ length: channels }, () => []);
					if (this.analysis.bMultiChannel) {
						for (let i = 1; i <= channels; i++) {
							data.forEach((frame) => {
								processedData[i - 1].push(this.processFfmpegFrame(frame, i));
							});
						}
					} else {
						data.forEach((frame) => {
							processedData[0].push(this.processFfmpegFrame(frame, 'Overall'));
						});
					}
					if (bSameHandle) { this.current = processedData; }
					// Save data and optionally compress it
					if (this.allowedSaveData(handle)) {
						this.saveData(processedData, seekbarFile, '.ff');
						if (this.logging.bSave) { console.log('Seekbar: Analysis file path -> ' + _foldPath(seekbarFile) + '.ff'); }
					}
				} else if (bNotFallback && bAuWav && len) {
					const processedData = Array.from({ length: channels }, () => []);
					if (this.analysis.bMultiChannel) {
						let c = 0, i = 0;
						data.forEach((frame) => {
							if (i === 2) {
								c = c === (channels - 1) ? 0 : c + 1;
								i = 0;
							}
							processedData[c].push(frame);
							i++;
						});
					} else {
						processedData[0] = data;
					}
					if (bSameHandle) { this.current = processedData; }
					if (this.allowedSaveData(handle)) {
						this.saveData(processedData, seekbarFile, '.aw');
						if (this.logging.bSave) { console.log('Seekbar: Analysis file path -> ' + _foldPath(seekbarFile) + '.aw'); }
					}
				} else if (bDisplayVisualizer && len && (this.isTrackPlaying() || bSameHandle && this.isOnDemandTrack())) {
					this.current = data;
				}
			}
			// Set animation using BPM if possible
			if (bSameHandle && this.preset.bAnimate && this.preset.bUseBPM) { this.bpmSteps(handle); }
			// Console and paint
			if (this.logging.bProfile) {
				if (cmd) { profiler.Print('Retrieve volume levels. Compression ' + this.analysis.compressionMode + '.'); }
				else { profiler.Print('Visualizer.'); }
			}
			if (bSameHandle) {
				if (this.current.length && this.current.some((channel) => channel.length)) {
					if (window.IsVisible) { throttlePaint(); }
				} else if (bNotFallback && this.logging.bError) { console.log('Seekbar: ' + this.analysis.binaryMode + ' - Failed analyzing file -> ' + sourceFile); }
			}
		}
		return bDone;
	};
	/**
	 * Extracts Time, RMS level, RMS peak and Peak level ffmpeg data for a given channel.
	 *
	 * @property
	 * @name processFfmpegFrame
	 * @kind method
	 * @memberof _seekbar
	 * @param {string} data - ffmpeg raw data frame
	 * @param {number|'Overall'} channel - Channel to extract (1, 2, ... or Overall)
	 * @returns {[number, number, number, number]} [Time, RMS level, RMS peak, Peak level]
	*/
	this.processFfmpegFrame = (frame, channel) => {
		// Save values as array to compress file as much as possible, also round decimals...
		const rms = frame.tags['lavfi.astats.' + channel + '.RMS_level'] !== '-inf'
			? round(Number(frame.tags['lavfi.astats.' + channel + '.RMS_level']), 1)
			: -Infinity;
		const rmsPeak = frame.tags['lavfi.astats.' + channel + '.RMS_peak'] !== '-inf'
			? round(Number(frame.tags['lavfi.astats.' + channel + '.RMS_peak']), 1)
			: -Infinity;
		const peak = frame.tags['lavfi.astats.' + channel + '.Peak_level'] !== '-inf'
			? round(Number(frame.tags['lavfi.astats.' + channel + '.Peak_level']), 1)
			: -Infinity;
		const time = round(Number(frame.pkt_pts_time), 2);
		return [time, rms, rmsPeak, peak];
	};
	/**
	 * Creates fake data based on a visualizer preset to feed any of the wave modes.
	 *
	 * @property
	 * @name visualizerData
	 * @kind method
	 * @memberof _seekbar
	 * @param {FbMetadbHandle} handle
	 * @param {'classic spectrum analyzer'} preset - Visualizer preset to use
	 * @param {Boolean} bVariableLen - Flag to use track length (true) or panel size (false)
	 * @returns {Number[][]}
	*/
	this.visualizerData = (handle, preset = 'classic spectrum analyzer', bVariableLen = false) => {
		const samples = (bVariableLen ? handle.Length : this.w / _scale(5)) * Math.min(this.analysis.resolution || 1, this.w / _scale(1));
		const data = Array.from({ length: this.channels }, () => []);
		for (let c = 0; c < this.channels; c++) {
			switch (preset) { // NOSONAR
				case 'classic spectrum analyzer': {
					const third = Math.round(samples / 3);
					const half = Math.round(samples / 2);
					for (let i = 0; i < third; i++) {
						const val = (Math.random() * i) / third;
						data[c].push(val);
					}
					for (let i = third; i < half; i++) {
						const val = (Math.random() * i) / third;
						data[c].push(val);
					}
					[...data[c]].reverse().forEach((frame) => data[c].push(frame));
					break;
				}
			}
		}
		return data;
	};
	/**
	 * Applies transparency to a color. Uses a lookup table to be as efficient as possible.
	 *
	 * @property
	 * @name applyAlpha
	 * @kind method
	 * @memberof _seekbar
	 * @param {number} color
	 * @param {number} percent - Range [0, 100]
	 * @returns {void}
	*/
	this.applyAlpha = (color, percent) => {
		// 64/32 bit color
		if (color < 4294967296) { color += 4294967296; }
		return parseInt(hexTransparencies[Math.max(Math.min(Math.round(percent), 100), 0)] + color.toString(16).slice(2), 16);
	};
	const hexTransparencies = { 100: 'FF', 99: 'FC', 98: 'FA', 97: 'F7', 96: 'F5', 95: 'F2', 94: 'F0', 93: 'ED', 92: 'EB', 91: 'E8', 90: 'E6', 89: 'E3', 88: 'E0', 87: 'DE', 86: 'DB', 85: 'D9', 84: 'D6', 83: 'D4', 82: 'D1', 81: 'CF', 80: 'CC', 79: 'C9', 78: 'C7', 77: 'C4', 76: 'C2', 75: 'BF', 74: 'BD', 73: 'BA', 72: 'B8', 71: 'B5', 70: 'B3', 69: 'B0', 68: 'AD', 67: 'AB', 66: 'A8', 65: 'A6', 64: 'A3', 63: 'A1', 62: '9E', 61: '9C', 60: '99', 59: '96', 58: '94', 57: '91', 56: '8F', 55: '8C', 54: '8A', 53: '87', 52: '85', 51: '82', 50: '80', 49: '7D', 48: '7A', 47: '78', 46: '75', 45: '73', 44: '70', 43: '6E', 42: '6B', 41: '69', 40: '66', 39: '63', 38: '61', 37: '5E', 36: '5C', 35: '59', 34: '57', 33: '54', 32: '52', 31: '4F', 30: '4D', 29: '4A', 28: '47', 27: '45', 26: '42', 25: '40', 24: '3D', 23: '3B', 22: '38', 21: '36', 20: '33', 19: '30', 18: '2E', 17: '2B', 16: '29', 15: '26', 14: '24', 13: '21', 12: '1F', 11: '1C', 10: '1A', 9: '17', 8: '14', 7: '12', 6: '0F', 5: '0D', 4: '0A', 3: '08', 2: '05', 1: '03', 0: '00' };
}