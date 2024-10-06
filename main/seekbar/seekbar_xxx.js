'use strict';
//06/10/24

/* exported _seekbar */
/* global _gdiFont:readable, _scale:readable, _isFile:readable, convertCharsetToCodepage:readable, throttle:readable, _isFolder:readable, _createFolder:readable, deepAssign:readable, clone:readable, _jsonParseFile:readable, _open:readable, _deleteFile:readable, DT_VCENTER:readable, DT_CENTER:readable, DT_END_ELLIPSIS:readable, DT_CALCRECT:readable, DT_NOPREFIX:readable, invert:readable, _p:readable, MK_LBUTTON:readable, _deleteFolder:readable, _q:readable, sanitizePath:readable, _runCmd:readable, round:readable, _saveFSO:readable, _save:readable */

include('..\\..\\helpers-external\\lz-utf8\\lzutf8.js'); // For string compression
/* global LZUTF8:readable */
include('..\\..\\helpers-external\\lz-string\\lz-string.min.js'); // For string compression
/* global LZString:readable */

function _seekbar({
	matchPattern = '$replace($ascii($lower([$replace(%ALBUM ARTIST%,\\,)]\\[$replace(%ALBUM%,\\,)][ {$if2($replace(%COMMENT%,\\,),%MUSICBRAINZ_ALBUMID%)}]\\%TRACKNUMBER% - $replace(%TITLE%,\\,))),?,)', // Used to create folder path
	bDebug = false,
	bProfile = false,
	binaries = {
		ffprobe: fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers-external\\ffprobe\\ffprobe.exe',
		audiowaveform: fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers-external\\audiowaveform\\audiowaveform.exe',
		visualizer: fb.ProfilePath + 'running', // Just a placeholder
	},
	preset = {
		waveMode: 'waveform', // waveform | bars | points | halfbars
		analysisMode: 'peak_level', // rms_level | peak_level | rms_peak (only available for ffprobe)
		paintMode: 'full', // full | partial
		bPrePaint: false,
		bPaintCurrent: true,
		bAnimate: true,
		bUseBPM: true,
		futureSecs: Infinity,
		bHalfBarsShowNeg: true
	},
	ui = {
		gFont: _gdiFont('Segoe UI', _scale(15)),
		colors: {
			bg: 0xFF000000, // Black
			main: 0xFF90EE90, // LimeGreen
			alt: 0xFF7CFC00, // LawnGreen
			bgFuture: 0xFF1B1B1B,
			mainFuture: 0xFFB7FFA2,
			altFuture: 0xFFF9FF99,
			currPos: 0xFFFFFFFF // White
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
		pos: { x: 0, y: 0, w: window.Width, h: window.Height, scaleH: 0.9, marginW: window.Width / 30 },
		refreshRate: 200, // ms when using animations of any type. 100 is smooth enough but the performance hit is high
		bVariableRefreshRate: false, // Changes refresh rate around the selected value to ensure code is run smoothly (for too low refresh rates)
		bNormalizeWidth: false,
		normalizeWidth: _scale(4)
	},
	analysis = {
		binaryMode: 'audiowaveform', // ffprobe | audiowaveform | visualizer
		resolution: 1, // pixels per second on audiowaveform, per sample on ffmpeg (different than 1 requires resampling) . On visualizer mode is adjusted per window width.
		compressionMode: 'utf-16', // none | utf-8 (~50% compression) | utf-16 (~70% compression)  7zip (~80% compression)
		bAutoAnalysis: true,
		bAutoRemove: false, // Deletes analysis files when unloading the script, but they are kept during the session (to not recalculate)
		bVisualizerFallback: true, // Uses visualizer mode when file can not be processed (not compatible format)
		bVisualizerFallbackAnalysis: true // Uses visualizer mode while analyzing file
	},
	callbacks = {
		backgroundColor: null, // Used to set the fallback color for text when there is no background color set for the waveform, otherwise will be white
	}
} = {}) {

	this.defaults = () => {
		const defBinaries = {
			ffprobe: fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers-external\\ffprobe\\ffprobe.exe',
			audiowaveform: fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers-external\\audiowaveform\\audiowaveform.exe',
			visualizer: fb.ProfilePath + 'running',
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
			bHalfBarsShowNeg: true
		};
		const defUi = {
			gFont: _gdiFont('Segoe UI', _scale(15)),
			colors: {
				bg: 0xFF000000, // Black
				main: 0xFF90EE90, // LimeGreen
				alt: 0xFF7CFC00, // LawnGreen
				bgFuture: 0xFF1B1B1B,
				mainFuture: 0xFFB7FFA2,
				altFuture: 0xFFF9FF99,
				currPos: 0xFFFFFFFF // White
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
			pos: { x: 0, y: 0, w: window.Width, h: window.Height, scaleH: 0.9, marginW: window.Width / 30 },
			refreshRate: 200,
			bVariableRefreshRate: false,
			bNormalizeWidth: false,
			normalizeWidth: _scale(4)
		};
		const defAnalysis = {
			binaryMode: 'audiowaveform',
			resolution: 1,
			compressionMode: 'utf-16',
			bAutoAnalysis: true,
			bAutoRemove: false,
			bVisualizerFallback: true,
			bVisualizerFallbackAnalysis: true
		};
		const defCallbacks = {
			backgroundColor: null,
		};
		const options = [{ from: defBinaries, to: binaries }, { from: defPreset, to: preset }, { from: defUi, to: ui }, { from: defAnalysis, to: analysis }, { from: defCallbacks, to: callbacks }];
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
		if (!_isFile(this.binaries[this.analysis.binaryMode])) {
			fb.ShowPopupMessage('Required dependency not found: ' + this.analysis.binaryMode + '\n\n' + JSON.stringify(this.binaries[this.analysis.binaryMode]), window.Name);
			this.bBinaryFound = false;
		} else { this.bBinaryFound = true; }
		if (this.preset.futureSecs <= 0 || this.preset.futureSecs === null) { this.preset.futureSecs = Infinity; }
	};
	// Add default args
	this.defaults();
	// Set
	this.binaries = binaries;
	this.ui = ui;
	this.preset = preset;
	this.analysis = analysis;
	this.callbacks = callbacks;
	// Easy access
	this.x = ui.pos.x; this.y = ui.pos.y; this.w = ui.pos.w; this.h = ui.pos.h;
	this.scaleH = ui.pos.scaleH; this.marginW = ui.pos.marginW;
	// Internals
	this.queueId = null;
	this.queueMs = 1000;
	this.bBinaryFound = true;
	this.active = true;
	this.Tf = fb.TitleFormat(matchPattern);
	this.TfMaxStep = fb.TitleFormat('[%BPM%]');
	this.bDebug = bDebug;
	this.bProfile = bProfile;
	this.folder = fb.ProfilePath + 'js_data\\seekbar\\';
	this.codePage = convertCharsetToCodepage('UTF-8');
	this.codePageV2 = convertCharsetToCodepage('UTF-16LE');
	this.current = [];
	this.frames = 0;
	this.timeConstant = 0;
	this.cache = null;
	this.offset = [];
	this.step = 0; // 0 - maxStep
	this.maxStep = 4;
	this.time = 0;
	this.ui.refreshRateOpt = this.ui.refreshRate;
	this.mouseDown = false;
	this.isZippedFile = false; // Set at checkAllowedFile()
	this.isAllowedFile = true; // Set at checkAllowedFile()
	this.isFallback = false; // For bVisualizerFallback, set at checkAllowedFile()
	this.isError = false; // Set at verifyData() after retrying analysis
	const bFallbackMode = { paint: false, analysis: false }; // For bVisualizerFallbackAnalysis
	const modes = { rms_level: { key: 'rms', pos: 1 }, rms_peak: { key: 'rmsPeak', pos: 2 }, peak_level: { key: 'peak', pos: 3 } }; // For ffprobe
	const compatibleFiles = {
		ffprobe: new RegExp('\\.(' +
			['mp3', 'flac', 'wav', 'ogg', 'opus', 'aac', 'ac3', 'aiff', 'ape', 'wv', 'wma', 'spx', 'spc', 'snd', 'ogx', 'mp4', 'au', 'aac', '2sf', 'dff', 'shn', 'tak', 'tta', 'vgm', 'minincsf', 'la', 'hmi']
				.join('|') + ')$', 'i'),
		audiowaveform: new RegExp('\\.(' +
			['mp3', 'flac', 'wav', 'ogg', 'opus']
				.join('|') + ')$', 'i')
	};

	let throttlePaint = throttle((bForce = false) => window.RepaintRect(this.x, this.y, this.w, this.h, bForce), this.ui.refreshRate);
	let throttlePaintRect = throttle((x, y, w, h, bForce = false) => window.RepaintRect(x, y, w, h, bForce), this.ui.refreshRate);

	const profilerPaint = new FbProfiler('paint');

	// Check
	this.checkConfig();
	if (!_isFolder(this.folder)) { _createFolder(this.folder); }

	this.updateConfig = (newConfig) => { // Ensures the UI is updated properly after changing settings
		if (newConfig) { deepAssign()(this, newConfig); }
		this.checkConfig();
		let bRecalculate = false;
		if (newConfig.preset) {
			if (this.preset.paintMode === 'partial' && this.preset.bPrePaint || this.analysis.binaryMode === 'visualizer') {
				this.offset = [];
				this.step = 0;
			}
			if (Object.hasOwn(newConfig.preset, 'bUseBPM') || Object.hasOwn(newConfig.preset, 'bAnimate')) {
				if (this.preset.bAnimate && this.preset.bUseBPM) { this.bpmSteps(); }
				else { this.defaultSteps(); }
			}
		}
		if (newConfig.ui) {
			if (Object.hasOwn(newConfig.ui, 'refreshRate')) {
				this.ui.refreshRateOpt = this.ui.refreshRate;
				throttlePaint = throttle((bForce = false) => window.RepaintRect(this.x, this.y, this.w, this.h, bForce), this.ui.refreshRate);
				throttlePaintRect = throttle((x, y, w, h, bForce = false) => window.RepaintRect(x, y, w, h, bForce), this.ui.refreshRate);
			}
			if (Object.hasOwn(newConfig.ui, 'bNormalizeWidth') || Object.hasOwn(newConfig.ui, 'normalizeWidth')) {
				bRecalculate = true;
			}
		}
		if (newConfig.analysis) {
			bRecalculate = true;
		}
		// Recalculate data points or repaint
		if (bRecalculate) { this.newTrack(); }
		else { throttlePaint(); }
	};

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
				config.ui.pos = { scaleH: this.ui.pos.scaleH, marginW: this.ui.pos.marginW };
			} else if (!notAllowed.has(key)) { config.ui[key] = clone(this.ui[key]); }
		}
		config.preset = clone(this.preset);
		config.analysis = clone(this.analysis);
		return config;
	};

	this.switch = (bEnable = !this.active) => {
		const wasActive = this.active;
		this.active = bEnable;
		if (fb.IsPlaying) {
			if (!wasActive && this.active) {
				window.Repaint();
				setTimeout(() => { this.newTrack(fb.GetNowPlaying()); this.updateTime(fb.PlaybackTime); }, 0);
			} else if (wasActive && !this.active) {
				this.stop(-1);
			}
		}
	};

	this.newTrackQueue = function () {
		if (this.queueId) { clearTimeout(this.queueId); }
		this.queueId = setTimeout(() => { this.newTrack(...arguments); }, this.queueMs); // Arguments points to the first non arrow func
	};

	this.newTrack = async (handle = fb.GetNowPlaying(), bIsRetry = false) => {
		if (!this.active) { return; }
		this.reset();
		if (handle) {
			this.checkAllowedFile(handle);
			let bAnalysis = false;
			const { seekbarFolder, seekbarFile, sourceFile } = this.getPaths(handle);
			const bVisualizer = this.analysis.binaryMode === 'visualizer';
			const bAuWav = this.analysis.binaryMode === 'audiowaveform';
			const bFfProbe = this.analysis.binaryMode === 'ffprobe';
			// Uncompressed file -> Compressed UTF8 file -> Compressed UTF16 file -> Analyze
			if (bFfProbe && _isFile(seekbarFile + '.ff.json')) {
				console.log('Analysis file path: ' + seekbarFile.replace(fb.ProfilePath,'.\\') + '.ff.json');
				this.current = _jsonParseFile(seekbarFile + '.ff.json', this.codePage) || [];
				if (!this.verifyData(handle, seekbarFile + '.ff.json', bIsRetry)) { return; }
			} else if (bFfProbe && _isFile(seekbarFile + '.ff.lz')) {
				console.log('Analysis file path: ' + seekbarFile.replace(fb.ProfilePath,'.\\') + '.ff.lz');
				let str = _open(seekbarFile + '.ff.lz', this.codePage) || '';
				str = LZUTF8.decompress(str, { inputEncoding: 'Base64' }) || null;
				this.current = str ? JSON.parse(str) || [] : [];
				if (!this.verifyData(handle, seekbarFile + '.ff.lz', bIsRetry)) { return; }
			} else if (bFfProbe && _isFile(seekbarFile + '.ff.lz16')) {
				console.log('Analysis file path: ' + seekbarFile.replace(fb.ProfilePath,'.\\') + '.ff.lz16');
				let str = _open(seekbarFile + '.ff.lz16', this.codePageV2) || '';
				str = LZString.decompressFromUTF16(str) || null;
				this.current = str ? JSON.parse(str) || [] : [];
				if (!this.verifyData(handle, seekbarFile + '.ff.lz16', bIsRetry)) { return; }
			} else if (bAuWav && _isFile(seekbarFile + '.aw.json')) {
				console.log('Analysis file path: ' + seekbarFile.replace(fb.ProfilePath,'.\\') + '.aw.json');
				this.current = _jsonParseFile(seekbarFile + '.aw.json', this.codePage) || [];
				if (!this.verifyData(handle, seekbarFile + '.aw.json', bIsRetry)) { return; }
			} else if (bAuWav && _isFile(seekbarFile + '.aw.lz')) {
				console.log('Analysis file path: ' + seekbarFile.replace(fb.ProfilePath,'.\\') + '.aw.lz');
				let str = _open(seekbarFile + '.aw.lz', this.codePage) || '';
				str = LZUTF8.decompress(str, { inputEncoding: 'Base64' }) || null;
				this.current = str ? JSON.parse(str) || [] : [];
				if (!this.verifyData(handle, seekbarFile + '.aw.lz', bIsRetry)) { return; }
			} else if (bAuWav && _isFile(seekbarFile + '.aw.lz16')) {
				console.log('Analysis file path: ' + seekbarFile.replace(fb.ProfilePath,'.\\') + '.aw.lz16');
				let str = _open(seekbarFile + '.aw.lz16', this.codePageV2) || '';
				str = LZString.decompressFromUTF16(str) || null;
				this.current = str ? JSON.parse(str) || [] : [];
				if (!this.verifyData(handle, seekbarFile + '.aw.lz16', bIsRetry)) { return; }
			} else if (this.analysis.bAutoAnalysis && _isFile(sourceFile)) {
				if (this.analysis.bVisualizerFallbackAnalysis && this.isAllowedFile) {
					bFallbackMode.analysis = bFallbackMode.paint = true;
					await this.analyze(handle, seekbarFolder, seekbarFile, sourceFile);
					// Calculate waveform on the fly
					this.normalizePoints();
					// Set animation using BPM if possible
					if (this.preset.bAnimate && this.preset.bUseBPM) { this.bpmSteps(handle); }
					// Update time if needed
					if (fb.IsPlaying) { this.time = fb.PlaybackTime; }
				}
				throttlePaint(true);
				if (this.analysis.bVisualizerFallbackAnalysis) { bFallbackMode.analysis = false; }
				await this.analyze(handle, seekbarFolder, seekbarFile, sourceFile);
				if (!this.verifyData(handle, void (0), bIsRetry)) { return; }
				bFallbackMode.analysis = bFallbackMode.paint = false;
				bAnalysis = true;
			}
			if (!bAnalysis) { this.isFallback = false; } // Allow reading data from files even if track is not compatible
			// Calculate waveform on the fly
			this.normalizePoints(!bVisualizer && this.ui.bNormalizeWidth);
			this.timeConstant = handle.Length / this.frames;
		}
		this.resetAnimation();
		// Set animation using BPM if possible
		if (this.preset.bAnimate && this.preset.bUseBPM) { this.bpmSteps(handle); }
		// Update time if needed
		if (fb.IsPlaying) { this.time = fb.PlaybackTime; }
		// And paint
		throttlePaint();
	};

	this.normalizePoints = (bNormalizeWidth = false) => {
		this.frames = this.current.length;
		if (this.frames) {
			let upper = 0;
			let lower = 0;
			if (!this.isFallback && !bFallbackMode.paint && this.analysis.binaryMode === 'ffprobe') {
				// Calculate max values
				const pos = modes[this.preset.analysisMode].pos;
				let max = 0;
				this.current.forEach((frame) => {
					// After parsing JSON, restore infinity values
					if (frame[pos] === null) { frame[pos] = -Infinity; }
					const val = frame[pos];
					max = Math.min(max, isFinite(val) ? val : 0);
				});
				// Calculate point scale
				let maxVal = 1;
				if (this.preset.analysisMode !== 'RMS_level') {
					this.current.forEach((frame) => {
						if (frame.length === 5) { frame.length = 4; }
						frame.push(
							isFinite(frame[pos])
								? Math.abs(1 - (Math.log(Math.abs(max)) + Math.log(Math.abs(frame[pos]))) / Math.log(Math.abs(max)))
								: 1
						);
						if (!isFinite(frame[4])) { frame[4] = 0; }
						maxVal = Math.min(maxVal, frame[4]);
					});
				} else {
					this.current.forEach((frame) => {
						frame.push(isFinite(frame[pos]) ? 1 - Math.abs((frame[pos] - max) / max) : 1);
						maxVal = Math.min(maxVal, frame[4]);
					});
				}
				// Normalize
				if (maxVal !== 0) {
					this.current.forEach((frame) => {
						if (frame[4] !== 1) { frame[4] = frame[4] - maxVal; }
					});
				}
				// Flat data
				this.current = this.current.map((x, i) => Math.sign((0.5 - i % 2)) * (1 - x[4]));
				// Calculate max values
				this.current.forEach((frame) => {
					upper = Math.max(upper, frame);
					lower = Math.min(lower, frame);
				});
				max = Math.max(Math.abs(upper), Math.abs(lower));
			} else if (this.analysis.binaryMode === 'audiowaveform' || this.analysis.binaryMode === 'visualizer' || this.isFallback || bFallbackMode.paint) {
				// Calculate max values
				let max = 0;
				this.current.forEach((frame) => {
					upper = Math.max(upper, frame);
					lower = Math.min(lower, frame);
				});
				max = Math.max(Math.abs(upper), Math.abs(lower));
				// Calculate point scale
				this.current = this.current.map((frame) => frame / max);
			}
			// Adjust num of frames to window size
			if (bNormalizeWidth) {
				const barW = this.ui.normalizeWidth;
				const frames = this.frames;
				const newFrames = Math.floor((this.w - this.marginW * 2) / barW);
				let data;
				if (newFrames !== frames) {
					if (newFrames < frames) {
						const scale = frames / newFrames;
						data = Array(newFrames).fill(null).map(() => { return { val: 0, count: 0 }; });
						let j = 0, h = 0, frame;
						for (let i = 0; i < frames; i++) {
							frame = this.current[i];
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
						data = Array(newFrames).fill(null).map(() => { return { val: 0, count: 0 }; });
						let j = 0, h = 0, frame;
						for (let i = 0; i < frames; i++) {
							frame = this.current[i];
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
					this.current = data.map((el) => el.val / el.count);
					// Some combinations of bar widths and number of points may affect the bias to the upper or lower part of the waveform
					// Lower or upper side can be normalized to the max value of the other side to account for this
					const bias = Math.abs(upper / lower);
					upper = lower = 0;
					this.current.forEach((frame) => {
						upper = Math.max(upper, frame);
						lower = Math.min(lower, frame);
					});
					const newBias = Math.abs(upper / lower);
					const diff = bias - newBias;
					if (diff > 0.1) {
						const distort = bias / newBias;
						const sign = Math.sign(diff);
						this.current = this.current.map((frame) => {
							return sign === 1 && frame > 0 || sign !== 1 && frame < 0 ? frame * distort : frame;
						});
					}
					this.frames = this.current.length;
				}
			}
		}
	};

	this.isDataValid = () => {
		// When iterating too many tracks in a short ammount of time weird things may happen without this check
		if (!Array.isArray(this.current) || !this.current.length) { return false; }
		return this.analysis.binaryMode === 'ffprobe'
			? this.current.every((frame) => {
				const len = Object.hasOwn(frame, 'length') ? frame.length : null;
				return (len === 4 || len === 5);
			})
			: this.current.every((frame) => {
				return (frame >= -128 && frame <= 127);
			});
	};

	this.verifyData = (handle, file, bIsRetry = false) => {
		if (!this.isDataValid()) {
			if (bIsRetry) {
				console.log('File was not successfully analyzed after retrying.');
				file && _deleteFile(file);
				this.isAllowedFile = false;
				this.isFallback = this.analysis.bVisualizerFallback;
				this.isError = true;
				this.current = [];
				this.frames = 0;
				this.timeConstant = 0;
			} else {
				console.log('Seekbar file not valid. Creating new one' + (file ? ': ' + file : '.'));
				file && _deleteFile(file);
				this.newTrack(handle, true);
			}
			return false;
		}
		return true;
	};

	this.checkAllowedFile = (handle = fb.GetNowPlaying()) => {
		const bNoVisual = this.analysis.binaryMode !== 'visualizer';
		const bNoSubSong = handle.SubSong === 0;
		const bValidExt = compatibleFiles[this.analysis.binaryMode].test(handle.Path);
		this.isZippedFile = handle.RawPath.indexOf('unpack://') !== -1;
		this.isAllowedFile = bNoVisual && bNoSubSong && bValidExt && !this.isZippedFile;
		this.isFallback = !this.isAllowedFile && this.analysis.bVisualizerFallback;
	};

	this.bpmSteps = (handle = fb.GetNowPlaying()) => {
		// Don't allow anything faster than 2 steps or slower than 10 (scaled to 200 ms refresh rate) and consider all tracks have 100 BPM as default
		if (!handle) { return this.defaultSteps(); }
		const BPM = Number(this.TfMaxStep.EvalWithMetadb(handle));
		this.maxStep = Math.round(Math.min(Math.max(200 / (BPM || 100) * 2, 2), 10) * (200 / this.ui.refreshRate) ** (1 / 2));
		return this.maxStep;
	};

	this.defaultSteps = () => {
		this.maxStep = Math.round(4 * (200 / this.ui.refreshRate) ** (1 / 2));
		return this.maxStep;
	};
	this.defaultSteps();

	this.updateTime = (time) => {
		if (!this.active) { return; }
		this.time = time;
		if (this.cache === this.current) { // Paint only once if there is no animation
			if (this.preset.paintMode === 'full' && !this.preset.bPaintCurrent && this.analysis.binaryMode !== 'visualizer') { return; }
		} else { this.cache = this.current; }
		// Repaint by zone when possible
		const frames = this.frames;
		const bPrePaint = this.preset.paintMode === 'partial' && this.preset.bPrePaint;
		if (this.analysis.binaryMode === 'visualizer' || !frames) { throttlePaint(); }
		else if (bPrePaint || this.preset.bPaintCurrent || this.preset.paintMode === 'partial') {
			const widerModesScale = (this.preset.waveMode === 'bars' || this.preset.waveMode === 'halfbars' ? 2 : 1);
			const currX = this.x + this.marginW + (this.w - this.marginW * 2) * time / fb.PlaybackLength;
			const barW = Math.ceil(Math.max((this.w - this.marginW * 2) / frames, _scale(2))) * widerModesScale;
			const prePaintW = Math.min(
				bPrePaint && this.preset.futureSecs !== Infinity || this.preset.bAnimate
					? this.preset.futureSecs === Infinity && this.preset.bAnimate
						? Infinity
						: this.preset.futureSecs / this.timeConstant * barW + barW
					: 2.5 * barW,
				this.w - currX + barW
			);
			throttlePaintRect(currX - barW, this.y, prePaintW, this.h);
		}
	};

	this.reset = () => {
		this.current = [];
		this.frames = 0;
		this.timeConstant = 0;
		this.cache = null;
		this.time = 0;
		this.isZippedFile = false;
		this.isAllowedFile = true;
		this.isFallback = false;
		this.isError = false;
		bFallbackMode.paint = bFallbackMode.analysis = false;
		this.resetAnimation();
		if (this.queueId) { clearTimeout(this.queueId); }
	};

	this.resetAnimation = () => {
		this.step = 0;
		this.offset = [];
		this.defaultSteps();
	};

	this.stop = (reason = -1) => { // -1 Invoked by JS | 0 Invoked by user | 1 End of file | 2 Starting another track | 3 Fb2k is shutting down
		if (reason !== -1 && !this.active) { return; }
		this.reset();
		if (reason !== 2) { throttlePaint(); }
	};

	this.paint = (gr) => {
		profilerPaint.Reset();
		if (!fb.IsPlaying) { this.reset(); } // In case paint has been delayed after playback has stopped...
		const frames = this.frames;
		const bPartial = this.preset.paintMode === 'partial';
		const bPrePaint = bPartial && this.preset.bPrePaint;
		const bModeVisualizer = this.analysis.binaryMode === 'visualizer';
		const bVisualizer = bModeVisualizer || this.isFallback || bFallbackMode.paint;
		const bFfProbe = this.analysis.binaryMode === 'ffprobe';
		const bBars = this.preset.waveMode === 'bars';
		const bHalfBars = this.preset.waveMode === 'halfbars';
		const bWaveForm = this.preset.waveMode === 'waveform';
		const bPoints = this.preset.waveMode === 'points';
		let bPaintedBg = this.ui.colors.bg === this.ui.colors.bgFuture && !bPrePaint;
		const colors = Object.fromEntries(
			Object.keys(this.ui.transparency).map((key) => {
				return [
					key,
					this.ui.colors[key] !== -1 && this.ui.transparency[key] !== 0
						? Math.round(this.ui.transparency[key]) === 100 ? this.ui.colors[key] : this.applyAlpaha(this.ui.colors[key], this.ui.transparency[key])
						: -1
				];
			})
		);
		// Panel background
		if (colors.bg !== -1) { gr.FillSolidRect(this.x, this.y, this.w, this.h, colors.bg); }
		const currX = this.x + this.marginW + (this.w - this.marginW * 2) * ((fb.PlaybackTime / fb.PlaybackLength) || 0);
		if (frames !== 0) {
			const size = (this.h - this.y) * this.scaleH;
			const barW = (this.w - this.marginW * 2) / frames;
			const minPointDiff = 1; // in px
			let n = 0;
			// Paint waveform layer
			const timeConstant = this.timeConstant;
			let current, past = [{ x: 0, y: 1 }, { x: 0, y: -1 }];
			gr.SetSmoothingMode(bFfProbe ? 3 : 4);
			for (const frame of this.current) { // [peak]
				current = timeConstant * n;
				const bIsfuture = current > this.time;
				const bIsfutureAllowed = (current - this.time) < this.preset.futureSecs;
				if (bPartial && !bPrePaint && bIsfuture) {
					if (colors.bgFuture !== -1) { gr.FillSolidRect(currX, this.y, this.w, this.h, colors.bgFuture); }
					break;
				} else if (bPrePaint && bIsfuture && !bIsfutureAllowed) { break; }
				if (!this.offset[n]) { this.offset.push(0); }
				const scale = frame;
				const x = this.x + this.marginW + barW * n;
				// Paint the alt background at the proper point
				if (bIsfuture && bPrePaint && !bPaintedBg) {
					if (colors.bgFuture !== -1) { gr.FillSolidRect(currX, this.y, this.w, this.h, colors.bgFuture); }
					bPaintedBg = true;
				}
				// Don't calculate waveform if not needed
				if ([colors.main, colors.alt, colors.mainFuture, colors.altFuture].every((col) => col === -1)) {
					n++;
					if (bIsfuture && bPrePaint && bPaintedBg) { break; }
					else { continue; }
				}
				// Ensure points don't overlap too much without normalization
				if (past.every((p) => (p.y !== Math.sign(scale) && !bHalfBars) || (p.y === Math.sign(scale) || bHalfBars) && (x - p.x) >= minPointDiff)) {
					if (bWaveForm) {
						const scaledSize = size / 2 * scale;
						this.offset[n] += (bPrePaint && bIsfuture && this.preset.bAnimate || bVisualizer ? - Math.sign(scale) * Math.random() * scaledSize / 10 * this.step / this.maxStep : 0); // Add movement when painting future
						const rand = Math.sign(scale) * this.offset[n];
						const y = scaledSize > 0
							? Math.min(Math.max(scaledSize + rand, 1), size / 2)
							: Math.max(Math.min(scaledSize + rand, -1), - size / 2);
						const color = bPrePaint && bIsfuture ? colors.mainFuture : colors.main;
						const altColor = bPrePaint && bIsfuture ? colors.altFuture : colors.alt;
						let z = bVisualizer ? Math.abs(y) : y;
						if (z > 0) {
							if (altColor !== color) {
								if (color !== -1) { gr.FillSolidRect(x, this.h / 2 - z, 1, z / 2, color); }
								if (altColor !== -1) { gr.FillSolidRect(x, this.h / 2 - z / 2, 1, z / 2, altColor); }
							} else if (color !== -1) { gr.FillSolidRect(x, this.h / 2 - z, 1, z, color); }
						}
						z = bVisualizer ? - Math.abs(y) : y;
						if (z < 0) {
							if (altColor !== color) {
								if (color !== -1) { gr.FillSolidRect(x, this.h / 2 - z / 2, 1, - z / 2, color); }
								if (altColor !== -1) { gr.FillSolidRect(x, this.h / 2, 1, - z / 2, altColor); }
							} else if (color !== -1) { gr.FillSolidRect(x, this.h / 2, 1, - z, color); }
						}
					} else if (bHalfBars) {
						const scaledSize = size / 2 * scale;
						this.offset[n] += (bPrePaint && bIsfuture && this.preset.bAnimate || bVisualizer ? - Math.sign(scale) * Math.random() * scaledSize / 10 * this.step / this.maxStep : 0); // Add movement when painting future
						const rand = Math.sign(scale) * this.offset[n];
						let y = scaledSize > 0
							? Math.min(Math.max(scaledSize + rand, 1), size / 2)
							: Math.max(Math.min(scaledSize + rand, -1), - size / 2);
						if (this.preset.bHalfBarsShowNeg) { y = Math.abs(y); }
						let color = bPrePaint && bIsfuture ? colors.mainFuture : colors.main;
						let altColor = bPrePaint && bIsfuture ? colors.altFuture : colors.alt;
						const x = this.x + this.marginW + barW * n;
						// Current position
						if ((this.preset.bPaintCurrent || this.mouseDown) && !bFfProbe && colors.currPos !== -1) {
							if (x <= currX && x >= currX - 2 * barW) { color = altColor = colors.currPos; }
						}
						if (y > 0) {
							if (altColor !== color) {
								if (color !== -1) { gr.DrawRect(x, this.h / 2 + size / 2 - 2 * y, barW, y, 1, color); }
								if (altColor !== -1) { gr.DrawRect(x, this.h / 2 + size / 2 - y, barW, y, 1, altColor); }
							} else if (color !== -1) { gr.DrawRect(x, this.h / 2 + size / 2 - 2 * y, barW, 2 * y, 1, color); }
						}
					} else if (bBars) {
						const scaledSize = size / 2 * scale;
						this.offset[n] += (bPrePaint && bIsfuture && this.preset.bAnimate || bVisualizer ? - Math.sign(scale) * Math.random() * scaledSize / 10 * this.step / this.maxStep : 0); // Add movement when painting future
						const rand = Math.sign(scale) * this.offset[n];
						const y = scaledSize > 0
							? Math.min(Math.max(scaledSize + rand, 1), size / 2)
							: Math.max(Math.min(scaledSize + rand, -1), - size / 2);
						let color = bPrePaint && bIsfuture ? colors.mainFuture : colors.main;
						let altColor = bPrePaint && bIsfuture ? colors.altFuture : colors.alt;
						const x = this.x + this.marginW + barW * n;
						// Current position
						if ((this.preset.bPaintCurrent || this.mouseDown) && !bFfProbe && colors.currPos !== -1) {
							if (x <= currX && x >= currX - 2 * barW) { color = altColor = colors.currPos; }
						}
						let z = bVisualizer ? Math.abs(y) : y;
						if (z > 0) { // Split waveform in 2, and then each half in 2 for highlighting
							if (altColor !== color) {
								if (color !== -1) { gr.DrawRect(x, this.h / 2 - z, barW, z / 2, 1, color); }
								if (altColor !== -1) { gr.DrawRect(x, this.h / 2 - z / 2, barW, z / 2, 1, altColor); }
							} else {
								gr.DrawRect(x, this.h / 2 - z, barW, z, 1, color);
							}
						}
						z = bVisualizer ? - Math.abs(y) : y;
						if (z < 0) {
							if (altColor !== color) {
								if (color !== -1) { gr.DrawRect(x, this.h / 2 - z / 2, barW, - z / 2, 1, color); }
								if (altColor !== -1) { gr.DrawRect(x, this.h / 2, barW, - z / 2, 1, altColor); }
							} else if (color !== -1) { gr.DrawRect(x, this.h / 2, barW, - z, 1, color); }
						}
					} else if (bPoints) {
						const scaledSize = size / 2 * scale;
						const y = scaledSize > 0
							? Math.max(scaledSize, 1)
							: Math.min(scaledSize, -1);
						const color = bPrePaint && bIsfuture ? colors.mainFuture : colors.main;
						const altColor = bPrePaint && bIsfuture ? colors.altFuture : colors.alt;
						this.offset[n] += (bPrePaint && bIsfuture && this.preset.bAnimate || bVisualizer ? Math.random() * Math.abs(this.step / this.maxStep) : 0); // Add movement when painting future
						const rand = this.offset[n];
						const step = Math.max(this.h / 80, 5) + (rand || 1); // Point density
						const circleSize = Math.max(step / 25, 1);
						// Split waveform in 2, and then each half in 2 for highlighting. If colors match, the same amount of points are painted anyway...
						const sign = Math.sign(y);
						let yCalc = this.h / 2;
						let bottom = this.h / 2 - y / 2;
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
							let yCalc = this.h / 2;
							let bottom = this.h / 2 + y / 2;
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
					}
					past.shift();
					past.push({ x, y: Math.sign(scale) });
				}
				n++;
			}
			gr.SetSmoothingMode(0);
			// Current position
			if (colors.currPos !== -1 && (this.preset.bPaintCurrent || this.mouseDown)) {
				const minBarW = Math.round(Math.max(barW, _scale(1)));
				if (bFfProbe || bWaveForm || bPoints) {
					gr.DrawLine(currX, this.y, currX, this.y + this.h, minBarW, colors.currPos);
				}
			}
		} else if (fb.IsPlaying) {
			const center = DT_VCENTER | DT_CENTER | DT_END_ELLIPSIS | DT_CALCRECT | DT_NOPREFIX;
			const textColor = colors.bg !== -1
				? invert(colors.bg, true)
				: callbacks.backgroundColor ? invert(callbacks.backgroundColor()[0], true) : 0xFFFFFFFF;
			if (!this.isAllowedFile && !this.isFallback && !bModeVisualizer) {
				gr.GdiDrawText('Not compatible file format', this.ui.gFont, textColor, this.x + this.marginW, 0, this.w - this.marginW * 2, this.h, center);
			} else if (!this.analysis.bAutoAnalysis) {
				gr.GdiDrawText('Seekbar file not found', this.ui.gFont, textColor, this.x + this.marginW, 0, this.w - this.marginW * 2, this.h, center);
			} else if (!this.bBinaryFound) {
				gr.GdiDrawText('Binary ' + _p(this.analysis.binaryMode) + ' not found', this.ui.gFont, textColor, this.x + this.marginW, 0, this.w - this.marginW * 2, this.h, center);
			} else if (this.isError) {
				gr.GdiDrawText('File can not be analyzed', this.ui.gFont, textColor, this.x + this.marginW, 0, this.w - this.marginW * 2, this.h, center);
			} else if (this.active) {
				gr.GdiDrawText('Analyzing track...', this.ui.gFont, textColor, this.x + this.marginW, 0, this.w - this.marginW * 2, this.h, center);
			}
		}
		// Incrementally draw animation on small steps
		if ((bPrePaint && this.preset.bAnimate) || bVisualizer) {
			if (this.step >= this.maxStep) { this.step = - this.step; }
			else {
				if (this.step === 0) { this.offset = []; }
				this.step++;
			}
		}
		// Animate smoothly, Repaint by zone when possible. Only when not in pause!
		if (fb.IsPlaying && !fb.IsPaused) {
			if (bVisualizer) { throttlePaint(); }
			else if ((bPrePaint || this.preset.bPaintCurrent || bPartial) && frames) {
				const widerModesScale = (bBars || bHalfBars ? 2 : 1);
				const barW = Math.ceil(Math.max((this.w - this.marginW * 2) / frames, _scale(2))) * widerModesScale;
				const prePaintW = Math.min(
					bPrePaint && this.preset.futureSecs !== Infinity || this.preset.bAnimate
						? this.preset.futureSecs === Infinity && this.preset.bAnimate
							? Infinity
							: this.preset.futureSecs / this.timeConstant * barW + barW
						: 2.5 * barW,
					this.w - currX + barW
				);
				throttlePaintRect(currX - barW, this.y, prePaintW, this.h);
			}
			if (this.ui.bVariableRefreshRate) {
				if (profilerPaint.Time > this.ui.refreshRate) { this.updateConfig({ ui: { refreshRate: this.ui.refreshRate + 50 } }); }
				else if (profilerPaint.Time < this.ui.refreshRate && profilerPaint.Time >= this.ui.refreshRateOpt) { this.updateConfig({ ui: { refreshRate: this.ui.refreshRate - 25 } }); }
			}
		}
	};

	this.trace = (x, y) => {
		return (x >= this.x && y >= this.y && x <= this.x + this.w && y <= this.y + this.h);
	};

	this.lbtnUp = (x, y, mask) => { // eslint-disable-line no-unused-vars
		this.mouseDown = false;
		if (!this.trace(x, y)) { return false; }
		const handle = fb.GetSelection();
		if (handle && fb.IsPlaying) { // Seek
			const frames = this.frames;
			if (frames !== 0) {
				const barW = (this.w - this.marginW * 2) / frames;
				let time = Math.round(fb.PlaybackLength / frames * (x - this.x - this.marginW) / barW);
				if (time < 0) { time = 0; }
				else if (time > fb.PlaybackLength) { time = fb.PlaybackLength; }
				fb.PlaybackTime = time;
				throttlePaint(true);
				return true;
			}
		}
		return false;
	};

	this.move = (x, y, mask) => {
		if (mask === MK_LBUTTON && this.lbtnUp(x, y, mask)) {
			this.mouseDown = true;
		}
	};

	this.resize = (w, h) => {
		this.w = w;
		this.h = h;
	};

	this.unload = () => {
		if (this.analysis.bAutoRemove) {
			this.removeData();
		}
	};

	this.removeData = () => {
		_deleteFolder(this.folder);
	};

	this.getPaths = (handle) => {
		const id = sanitizePath(this.Tf.EvalWithMetadb(handle)); // Ensure paths are valid!
		const fileName = id.split('\\').pop();
		const seekbarFolder = this.folder + id.replace(fileName, '');
		const seekbarFile = this.folder + id;
		const sourceFile = this.isZippedFile ? handle.Path.split('|')[0] : handle.Path;
		return { seekbarFolder, seekbarFile, sourceFile };
	};

	this.analyze = async (handle, seekbarFolder, seekbarFile, sourceFile = handle.Path) => {
		if (!_isFolder(seekbarFolder)) { _createFolder(seekbarFolder); }
		let profiler, cmd;
		// Change to track folder since ffprobe has stupid escape rules which are impossible to apply right with amovie input mode
		let handleFileName = sourceFile.split('\\').pop();
		const handleFolder = sourceFile.replace(handleFileName, '');
		const bVisualizer = this.analysis.binaryMode === 'visualizer';
		const bAuWav = this.analysis.binaryMode === 'audiowaveform';
		const bFfProbe = this.analysis.binaryMode === 'ffprobe';
		if (this.isAllowedFile && !bFallbackMode.analysis && bAuWav) {
			if (this.bProfile) { profiler = new FbProfiler('audiowaveform'); }
			const extension = handleFileName.match(/(?:\.)(\w+$)/i)[1];
			cmd = 'CMD /C PUSHD ' + _q(handleFolder) + ' && ' +
				_q(this.binaries.audiowaveform) + ' -i ' + _q(handleFileName) +
				' --pixels-per-second ' + (Math.round(this.analysis.resolution) || 1) + ' --input-format ' + extension + ' --bits 8' +
				' -o ' + _q(seekbarFolder + 'data.json');
		} else if (this.isAllowedFile && !bFallbackMode.analysis && bFfProbe) {
			if (this.bProfile) { profiler = new FbProfiler('ffprobe'); }
			handleFileName = handleFileName.replace(/[,:%.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, '\\\\\\\''); // And here we go again...
			cmd = 'CMD /C PUSHD ' + _q(handleFolder) + ' && ' +
				_q(this.binaries.ffprobe) + ' -hide_banner -v panic -f lavfi -i amovie=' + _q(handleFileName) +
				(this.analysis.resolution > 1 ? ',aresample=' + Math.round((this.analysis.resolution || 1) * 100) + ',asetnsamples=' + Math.round((this.analysis.resolution / 10) ** 2) : '') +
				',astats=metadata=1:reset=1 -show_entries frame=pkt_pts_time:frame_tags=lavfi.astats.Overall.Peak_level,lavfi.astats.Overall.RMS_level,lavfi.astats.Overall.RMS_peak -print_format json > ' +
				_q(seekbarFolder + 'data.json');
		} else if (this.isFallback || bVisualizer || bFallbackMode.analysis) {
			profiler = new FbProfiler('visualizer');
		}
		if (cmd) {
			console.log('Seekbar scanning: ' + sourceFile);
			if (this.bDebug) { console.log(cmd); }
		} else if (!this.isAllowedFile && !bVisualizer && !bFallbackMode.analysis) {
			console.log('Seekbar skipping incompatible file: ' + sourceFile);
		}
		let bDone = cmd ? _runCmd(cmd, false) : true;
		bDone = bDone && (await new Promise((resolve) => {
			if (this.isFallback || bVisualizer || bFallbackMode.analysis) { resolve(true); }
			const timeout = Date.now() + Math.round(10000 * (handle.Length / 180)); // Break if it takes too much time: 10 secs per 3 min of track
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
			const data = cmd ? _jsonParseFile(seekbarFolder + 'data.json', this.codePage) : this.visualizerData(handle);
			_deleteFile(seekbarFolder + 'data.json');
			if (data) {
				if (!this.isFallback && !bFallbackMode.analysis && bFfProbe && data.frames && data.frames.length) {
					const processedData = [];
					data.frames.forEach((frame) => {
						// Save values as array to compress file as much as possible, also round decimals...
						const rms = frame.tags['lavfi.astats.Overall.RMS_level'] !== '-inf'
							? round(Number(frame.tags['lavfi.astats.Overall.RMS_level']), 1)
							: -Infinity;
						const rmsPeak = frame.tags['lavfi.astats.Overall.RMS_peak'] !== '-inf'
							? round(Number(frame.tags['lavfi.astats.Overall.RMS_peak']), 1)
							: -Infinity;
						const peak = frame.tags['lavfi.astats.Overall.Peak_level'] !== '-inf'
							? round(Number(frame.tags['lavfi.astats.Overall.Peak_level']), 1)
							: -Infinity;
						const time = round(Number(frame.pkt_pts_time), 2);
						processedData.push([time, rms, rmsPeak, peak]);
					});
					this.current = processedData;
					// Save data and optionally compress it
					const str = JSON.stringify(this.current);
					if (this.analysis.compressionMode === 'utf-16') {
						// To save UTF16-LE files, FSO is needed.
						// https://github.com/TheQwertiest/foo_spider_monkey_panel/issues/200
						const compressed = LZString.compressToUTF16(str);
						_saveFSO(seekbarFile + '.ff.lz16', compressed, true);
					} else if (this.analysis.compressionMode === 'utf-8') {
						// Only Base64 strings can be saved on UTF8 files...
						// https://github.com/TheQwertiest/foo_spider_monkey_panel/issues/200
						const compressed = LZUTF8.compress(str, { outputEncoding: 'Base64' });
						_save(seekbarFile + '.ff.lz', compressed);
					} else {
						_save(seekbarFile + '.ff.json', str);
					}
				} else if (!this.isFallback && !bFallbackMode.analysis && bAuWav && data.data && data.data.length) {
					this.current = data.data;
					const str = JSON.stringify(this.current);
					if (this.analysis.compressionMode === 'utf-16') {
						// To save UTF16-LE files, FSO is needed.
						// https://github.com/TheQwertiest/foo_spider_monkey_panel/issues/200
						const compressed = LZString.compressToUTF16(str);
						_saveFSO(seekbarFile + '.aw.lz16', compressed, true);
					} else if (this.analysis.compressionMode === 'utf-8') {
						// Only Base64 strings can be saved on UTF8 files...
						// https://github.com/TheQwertiest/foo_spider_monkey_panel/issues/200
						const compressed = LZUTF8.compress(str, { outputEncoding: 'Base64' });
						_save(seekbarFile + '.aw.lz', compressed);
					} else {
						_save(seekbarFile + '.aw.json', str);
					}
				} else if ((this.isFallback || bVisualizer || bFallbackMode.analysis) && data.length) {
					this.current = data;
				}
			}
			// Set animation using BPM if possible
			if (this.preset.bAnimate && this.preset.bUseBPM) { this.bpmSteps(handle); }
			// Console and paint
			if (this.bProfile) {
				if (cmd) { profiler.Print('Retrieve volume levels. Compression ' + this.analysis.compressionMode + '.'); }
				else { profiler.Print('Visualizer.'); }
			}
			if (this.current.length) { throttlePaint(); }
			else { console.log(this.analysis.binaryMode + ': failed analyzing the file -> ' + sourceFile); }
		}
	};

	this.visualizerData = (handle, preset = 'classic spectrum analyzer', bVariableLen = false) => {
		const samples = bVariableLen
			? handle.Length * (this.analysis.resolution || 1)
			: this.w / _scale(5) * (this.analysis.resolution || 1);
		const data = [];
		switch (preset) { // NOSONAR
			case 'classic spectrum analyzer': {
				const third = Math.round(samples / 3);
				const half = Math.round(samples / 2);
				for (let i = 0; i < third; i++) {
					const val = (Math.random() * i) / third;
					data.push(val);
				}
				for (let i = third; i < half; i++) {
					const val = (Math.random() * i) / third;
					data.push(val);
				}
				[...data].reverse().forEach((frame) => data.push(frame));
				break;
			}
		}
		return data;
	};

	this.applyAlpaha = (color, percent) => {
		return parseInt(hexTransparencies[Math.max(Math.min(Math.round(percent), 100), 0)] + color.toString(16).slice(2), 16);
	};
	const hexTransparencies = { 100: 'FF', 99: 'FC', 98: 'FA', 97: 'F7', 96: 'F5', 95: 'F2', 94: 'F0', 93: 'ED', 92: 'EB', 91: 'E8', 90: 'E6', 89: 'E3', 88: 'E0', 87: 'DE', 86: 'DB', 85: 'D9', 84: 'D6', 83: 'D4', 82: 'D1', 81: 'CF', 80: 'CC', 79: 'C9', 78: 'C7', 77: 'C4', 76: 'C2', 75: 'BF', 74: 'BD', 73: 'BA', 72: 'B8', 71: 'B5', 70: 'B3', 69: 'B0', 68: 'AD', 67: 'AB', 66: 'A8', 65: 'A6', 64: 'A3', 63: 'A1', 62: '9E', 61: '9C', 60: '99', 59: '96', 58: '94', 57: '91', 56: '8F', 55: '8C', 54: '8A', 53: '87', 52: '85', 51: '82', 50: '80', 49: '7D', 48: '7A', 47: '78', 46: '75', 45: '73', 44: '70', 43: '6E', 42: '6B', 41: '69', 40: '66', 39: '63', 38: '61', 37: '5E', 36: '5C', 35: '59', 34: '57', 33: '54', 32: '52', 31: '4F', 30: '4D', 29: '4A', 28: '47', 27: '45', 26: '42', 25: '40', 24: '3D', 23: '3B', 22: '38', 21: '36', 20: '33', 19: '30', 18: '2E', 17: '2B', 16: '29', 15: '26', 14: '24', 13: '21', 12: '1F', 11: '1C', 10: '1A', 9: '17', 8: '14', 7: '12', 6: '0F', 5: '0D', 4: '0A', 3: '08', 2: '05', 1: '03', 0: '00' };
}