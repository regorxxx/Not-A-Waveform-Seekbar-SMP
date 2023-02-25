'use strict';
//25/02/23
include('..\\..\\helpers-external\\lz-utf8\\lzutf8.js'); // For string compression
include('..\\..\\helpers-external\\lz-string\\lz-string.min.js'); // For string compression

function _seekbar({
		matchPattern = '$lower([%ALBUM ARTIST%]\\[%ALBUM%][ {$if2(%COMMENT%,%MUSICBRAINZ_ALBUMID%)}]\\%TRACKNUMBER% - %TITLE%)', // Used to create folder path
		bDebug = true,
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
			bPaintFuture: false,
			bPaintCurrent: true,
			bUseBPM: true,
			futureSecs: Infinity
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
			pos: {x: 0, y: 0, w: window.Width, h: window.Height, scaleH: 0.9, marginW: window.Width / 30},
			refreshRate: 200, // ms when using animations of any type. 100 is smooth enough but the performance hit is high
			bVariableRefreshRate: false // Changes refresh rate around the selected value to ensure code is run smoothly (for too low refresh rates)
		},
		analysis = {
			binaryMode: 'audiowaveform', // ffprobe | audiowaveform | visualizer
			resolution: 1, // pixels per second on audiowaveform, per sample on ffmpeg (different than 1 requires resampling) . On visualizer mode is adjusted per window width.
			compressionMode: 'utf-16', // none | utf-8 (~50% compression) | utf-16 (~70% compression)  7zip (~80% compression)
			bAutoAnalysis: true,
			bAutoRemove: false, // Deletes analysis files when unloading the script, but they are kept during the session (to not recalculate)
			bVisualizerFallback: true // Uses visualizer mode when file can not be processed (not compatible format)
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
			bPaintFuture: false,
			bPaintCurrent: true,
			bUseBPM: true,
			futureSecs: Infinity
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
			pos: {x: 0, y: 0, w: window.Width, h: window.Height, scaleH: 0.9, marginW: window.Width / 30},
			refreshRate: 200,
			bVariableRefreshRate: false
		};
		const defAnalysis = {
			binaryMode: 'audiowaveform',
			resolution: 1,
			compressionMode: 'utf-16',
			bAutoAnalysis: true,
			bAutoRemove: false,
			bVisualizerFallback: true
		};
		const options = [{from: defBinaries, to: binaries}, {from: defPreset, to: preset}, {from: defUi, to: ui}, {from: defAnalysis, to: analysis}];
		options.forEach((option) => {
			for (let key in option.from){
				const subOption = option.from[key];
				if (!option.to.hasOwnProperty(key)) {option.to[key] = subOption;}
				if (typeof subOption === 'object' && !Array.isArray(subOption) &&  subOption !== null && Object.keys(subOption).length) {
					for (let key2 in subOption){
						if (!option.to[key].hasOwnProperty(key2)) {option.to[key][key2] = subOption[key2];}
					}
				}
			}
		});
	};
	this.checkConfig = () => {
		if (!this.binaries.hasOwnProperty(this.analysis.binaryMode)) {
			throw new Error('Binary mode not recognized or path not set: ' + this.analysis.binaryMode);
		}
		if (!_isFile(this.binaries[this.analysis.binaryMode])) {
			fb.ShowPopupMessage('Required dependency not found: ' + this.analysis.binaryMode + '\n\n' + JSON.stringify(this.binaries[this.analysis.binaryMode]), window.Name);
		}
		if (this.preset.futureSecs <= 0 || this.preset.futureSecs === null) {this.preset.futureSecs = Infinity;}
	};
	// Add default args
	this.defaults();
	// Set
	this.binaries = binaries;
	this.ui = ui;
	this.preset = preset;
	this.analysis = analysis;
	// Easy access
	this.x = ui.pos.x; this.y = ui.pos.y; this.w = ui.pos.w; this.h = ui.pos.h;
	this.scaleH = ui.pos.scaleH; this.marginW = ui.pos.marginW;
	// Internals
	this.active = true;
	this.Tf = fb.TitleFormat(matchPattern);
	this.TfMaxStep = fb.TitleFormat('[%BPM%]');
	this.bDebug = bDebug;
	this.bProfile = bProfile;
	this.folder = fb.ProfilePath + 'js_data\\seekbar\\';
	this.codePage = convertCharsetToCodepage('UTF-8');
	this.codePageV2 = convertCharsetToCodepage('UTF-16LE');
	this.current = [];
	this.cache = null;
	this.offset = [];
	this.step = 0; // 0 - maxStep
	this.maxStep = 4;
	this.time = 0;
	this.ui.refreshRateOpt = this.ui.refreshRate;
	this.mouseDown = false;
	this.isAllowedFile = true;
	this.isFallback = false;
	const modes = {rms_level: {key: 'rms', pos: 1}, rms_peak: {key: 'rmsPeak', pos: 2}, peak_level: {key: 'peak', pos: 3}}; // For ffprobe
	const compatibleFiles = {
		ffprobe: new RegExp('\\.(' + 
			['mp3', 'flac', 'wav' , 'ogg', 'opus', 'aac', 'ac3', 'aiff', 'ape', 'wv', 'wma', 'spx', 'spc', 'snd', 'ogx', 'mp4', 'au', 'aac', '2sf', 'dff', 'shn', 'tak', 'tta', 'vgm', 'minincsf', 'la', 'hmi']
			.join('|') + ')$', 'i'),
		audiowaveform: new RegExp('\\.(' + 
			['mp3', 'flac', 'wav', 'ogg', 'opus']
		.join('|') + ')$', 'i')
	}
	
	let throttlePaint = throttle((bForce = false) => window.RepaintRect(this.x, this.y, this.w, this.h, bForce), this.ui.refreshRate);
	let throttlePaintRect = throttle((x, y, w, h, bForce = false) => window.RepaintRect(x, y, w, h, bForce), this.ui.refreshRate);
	
	const profilerPaint = new FbProfiler('paint');
	
	// Check
	this.checkConfig();
	if (!_isFolder(this.folder)) {_createFolder(this.folder);}
	
	this.updateConfig = (newConfig) => { // Ensures the UI is updated properly after changing settings
		if (newConfig) {deepAssign()(this, newConfig);}
		this.checkConfig();
		if (newConfig.preset && (this.preset.paintMode === 'partial' && this.preset.bPaintFuture || this.analysis.binaryMode === 'visualizer')) {this.offset = []; this.step = 0;}
		if (newConfig.ui && newConfig.ui.hasOwnProperty('refreshRate')) {
			this.ui.refreshRateOpt = this.ui.refreshRate;
			throttlePaint = throttle((bForce = false) => window.RepaintRect(this.x, this.y, this.w, this.h, bForce), this.ui.refreshRate);
			throttlePaintRect = throttle((x, y, w, h, bForce = false) => window.RepaintRect(x, y, w, h, bForce), this.ui.refreshRate);
		}
		if (newConfig.preset && newConfig.preset.hasOwnProperty('bUseBPM')) {
			if (newConfig.preset.bUseBPM) {this.bpmSteps();} else {this.defaultSteps();}
		}
		if (newConfig.analysis) {this.newTrack();}
		else {throttlePaint();}
	};
	
	this.exportConfig = () => {
		const config = {};
		let notAllowed;
		config.binaries = {};
		notAllowed = new Set(['visualizer']);
		for (let key in this.binaries) {
			if (!notAllowed.has(key)) {config.binaries[key] = clone(this.binaries[key]);}
		}
		config.ui = {};
		notAllowed = new Set(['gFont']);
		for (let key in this.ui) {
			if (key === 'pos') {
				config.ui.pos = {scaleH: this.ui.pos.scaleH, marginW: this.ui.pos.marginW};
			} else if (!notAllowed.has(key)) {config.ui[key] = clone(this.ui[key]);}
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
				setTimeout(() => {seekbar.newTrack(fb.GetNowPlaying()); this.updateTime(fb.PlaybackTime);}, 0);
			} else if (wasActive && !this.active) {
				this.stop(-1);
			}
		}
	};
	
	this.newTrack = async (handle = fb.GetNowPlaying()) => {
		if (!this.active) {return;}
		this.reset();
		if (handle) {
			this.checkAllowedFile(handle);
			let bAnalysis = false;
			const {seekbarFolder, seekbarFile} = this.getPaths(handle);
			// Uncompressed file -> Compressed UTF8 file -> Compressed UTF16 file -> Analyze
			if (this.analysis.binaryMode === 'ffprobe' && _isFile(seekbarFile + '.ff.json')) {
				this.current = _jsonParseFile(seekbarFile + '.ff.json', this.codePage) || [];
			} else if (this.analysis.binaryMode === 'ffprobe' && _isFile(seekbarFile + '.ff.lz')) {
				let str = _open(seekbarFile + '.ff.lz', this.codePage) || '';
				str = LZUTF8.decompress(str, {inputEncoding: 'Base64'}) || null;
				this.current = str ? JSON.parse(str) || [] : [];
			} else if (this.analysis.binaryMode === 'ffprobe' && _isFile(seekbarFile + '.ff.lz16')) {
				let str = _open(seekbarFile + '.ff.lz16', this.codePageV2) || '';
				str = LZString.decompressFromUTF16(str) || null;
				this.current = str ? JSON.parse(str) || [] : [];
			} else if (this.analysis.binaryMode === 'audiowaveform' && _isFile(seekbarFile + '.aw.json')) {
				this.current = _jsonParseFile(seekbarFile + '.aw.json', this.codePage) || [];
			} else if (this.analysis.binaryMode === 'audiowaveform' &&_isFile(seekbarFile + '.aw.lz')) {
				let str = _open(seekbarFile + '.aw.lz', this.codePage) || '';
				str = LZUTF8.decompress(str, {inputEncoding: 'Base64'}) || null;
				this.current = str ? JSON.parse(str) || [] : [];
			} else if (this.analysis.binaryMode === 'audiowaveform' &&_isFile(seekbarFile + '.aw.lz16')) {
				let str = _open(seekbarFile + '.aw.lz16', this.codePageV2) || '';
				str = LZString.decompressFromUTF16(str) || null;
				this.current = str ? JSON.parse(str) || [] : [];
			} else if (this.analysis.bAutoAnalysis && _isFile(handle.Path)) {
				throttlePaint(true);
				await this.analyze(handle, seekbarFolder, seekbarFile);
				bAnalysis  = true;
			}
			if (!bAnalysis) {this.isFallback = false;} // Allow reading data from files even if track is not compatible
			// Calculate waveform on the fly
			if (this.current.length) {
				if (!this.isFallback && this.analysis.binaryMode === 'ffprobe') {
					// Calculate max values
					let max = 0;
					const key = modes[this.preset.analysisMode].key; 
					const pos = modes[this.preset.analysisMode].pos;
					this.current.forEach((frame) => {
						// After parsing JSON, restore infinity values
						if (frame[pos] === null) {frame[pos] = -Infinity;}
						const val = frame[pos];
						max = Math.min(max, isFinite(val) ? val : 0);
					});
					// Calculate point scale
					let maxVal = 1;
					if (this.preset.analysisMode !== 'RMS_level') {
						this.current.forEach((frame, n) => {
							if (frame.length === 5) {frame.length = 4;}
							frame.push(
								isFinite(frame[pos]) 
									? Math.abs(1 - (Math.log(Math.abs(max)) + Math.log(Math.abs(frame[pos]))) / Math.log(Math.abs(max))) 
									: 1
							);
							if (!isFinite(frame[4])) {frame[4] = 0;}
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
							if (frame[4] !== 1) {frame[4] = frame[4] - maxVal;}
						});
					}
				} else if (this.analysis.binaryMode === 'audiowaveform' || this.analysis.binaryMode === 'visualizer' || this.isFallback) {
					// Calculate max values
					let max = 0;
					this.current.forEach((frame) => {
						max = Math.max(max, Math.abs(frame));
					});
					// Calculate point scale
					this.current = this.current.map((frame) => {return frame / max;});
				}
			}
		}
		// Set animation using BPM if possible
		if (this.preset.bUseBPM) {this.bpmSteps(handle);}
		// Update time if needed
		if (fb.IsPlaying) {this.time = fb.PlaybackTime;}
		// And paint
		throttlePaint();
	};
	
	this.checkAllowedFile = (handle = fb.GetNowPlaying()) => {
		this.isAllowedFile = this.analysis.binaryMode !== 'visualizer' && handle.SubSong === 0 && compatibleFiles[this.analysis.binaryMode].test(handle.Path);
		this.isFallback = !this.isAllowedFile && this.analysis.bVisualizerFallback;
	};
	
	this.bpmSteps = (handle = fb.GetNowPlaying()) => { 
		// Don't allow anything faster than 2 steps or slower than 10 (scaled to 200 ms refresh rate) and consider all tracks have 100 BPM as default
		if (!handle) {return this.defaultSteps();}
		const BPM = Number(this.TfMaxStep.EvalWithMetadb(handle));
		this.maxStep = Math.round(Math.min(Math.max(200 / (BPM ? BPM : 100) * 2, 2), 10) * (200 / this.ui.refreshRate) ** (1/2));
		return this.maxStep;
	};
	
	this.defaultSteps = () => {
		this.maxStep = Math.round(4 * (200 / this.ui.refreshRate) ** (1/2));
		return this.maxStep;
	};
	this.defaultSteps();
	
	this.updateTime = (time) => {
		if (!this.active) {return;}
		this.time = time;
		if (this.cache === this.current) { // Paint only once if there is no animation
			if (this.preset.paintMode === 'full' && !this.preset.bPaintCurrent && this.analysis.binaryMode !== 'visualizer') {return;}
		} else {this.cache = this.current;}
		// Repaint by zone when possible
		if (this.analysis.binaryMode === 'visualizer' || !this.current.length) {throttlePaint();}
		else if (this.preset.paintMode === 'partial' && this.preset.bPaintFuture) {
			const currX = this.x + this.marginW + (this.w - this.marginW * 2) * fb.PlaybackTime / fb.PlaybackLength;
			const barW = Math.round(Math.max((this.w - this.marginW * 2) / this.current.length, _scale(2)));
			throttlePaintRect(currX - 2 * barW, 0, this.w, this.h);
		} else if (this.preset.bPaintCurrent || this.preset.paintMode === 'partial') {
			const currX = this.x + this.marginW + (this.w - this.marginW * 2) * fb.PlaybackTime / fb.PlaybackLength;
			const barW = Math.round(Math.max((this.w - this.marginW * 2) / this.current.length, _scale(2)));
			throttlePaintRect(currX - 2 * barW, 0, 4 * barW, this.h);
		}
	};
	
	this.reset = () => {
		this.current = [];
		this.cache = null;
		this.time = 0;
		this.step = 0;
		this.maxStep = 6;
		this.offset = [];
		this.isAllowedFile = true;
		this.isFallback = false;
	};
	
	this.stop = (reason = -1) => { // -1 Invoked by JS | 0 Invoked by user | 1 End of file | 2 Starting another track | 3 Fb2k is shutting down
		if (reason !== -1 && !this.active) {return;}
		this.reset();
		if (reason !== 2) {throttlePaint();}
	};
	
	this.paint = (gr) => {
		profilerPaint.Reset();
		if (!fb.IsPlaying) {this.reset();} // In case paint has been delayed after playback has stopped...
		const frames = this.current.length;
		const bPaintFuture = this.preset.paintMode === 'partial' && this.preset.bPaintFuture;
		const bVisualizer = this.analysis.binaryMode === 'visualizer' || this.isFallback;
		let bPaintedBg = this.ui.colors.bg === this.ui.colors.bgFuture && !bPaintFuture;
		// Panel background
		gr.FillSolidRect(this.x, this.y, this.w, this.h, this.ui.colors.bg);
		const currX = this.x + this.marginW + (this.w - this.marginW * 2) * ((fb.PlaybackTime / fb.PlaybackLength) || 0);
		if (frames !== 0) {
			const size = (this.h - this.y) * this.scaleH;
			const barW = (this.w - this.marginW * 2) / frames;
			const barBgW = (this.w - this.marginW * 2) / 100;
			if (this.analysis.binaryMode === 'ffprobe') {
				if (Array.isArray(this.current[0])) {this.current = this.current.map((x, i) => {return Math.sign((0.5 - i % 2)) * (1 - x[4]);});}
			}
			let n = 0, nFull = 0;
			// Paint waveform layer
			const top = this.h / 2 - size / 2;
			const bottom = this.h / 2 + size / 2;
			const timeConstant = fb.PlaybackLength / frames;
			let current, xPast = this.x;
			gr.SetSmoothingMode(this.analysis.binaryMode === 'ffprobe' ? 3 : 4);
			for (let frame of this.current) { // [peak]
				current = timeConstant * n;
				const bIsfuture = current > this.time;
				const bIsfutureAllowed = (current - this.time) < this.preset.futureSecs;
				if (this.preset.paintMode === 'partial' && !bPaintFuture && bIsfuture) {break;}
				else if (bPaintFuture && bIsfuture && !bIsfutureAllowed) {break;}
				if (!this.offset[n]) {this.offset.push(0);}
				const scale = frame;
				const x = this.x + this.marginW + barW * n;
				if (bIsfuture && bPaintFuture && !bPaintedBg) {
					gr.FillSolidRect(currX, this.y, this.w, this.h, this.ui.colors.bgFuture);
					bPaintedBg = true;
				}
				if ((x - xPast) > 0) {
					if (this.preset.waveMode === 'waveform') {
						const scaledSize = size / 2 * scale;
						this.offset[n] += (bPaintFuture && bIsfuture || bVisualizer ? - Math.sign(scale) * Math.random() * scaledSize / 10 * this.step / this.maxStep : 0); // Add movement when painting future
						const rand = Math.sign(scale) * this.offset[n];
						const y = (scaledSize > 0 ? Math.max(scaledSize + rand, 1) : Math.min(scaledSize + rand, -1));
						const color = bPaintFuture && bIsfuture ? this.ui.colors.mainFuture : this.ui.colors.main;
						const altColor = bPaintFuture && bIsfuture ? this.ui.colors.altFuture : this.ui.colors.alt;
						let z = bVisualizer ? Math.abs(y) : y;
						if (z > 0) {
							if (altColor !== color) {
								gr.FillSolidRect(x, this.h / 2 - z, 1, z / 2, color);
								gr.FillSolidRect(x, this.h / 2 - z / 2, 1, z / 2, altColor);
							} else {
								gr.FillSolidRect(x, this.h / 2 - z, 1, z, color);
							}
						}
						z = bVisualizer ? - Math.abs(y) : y;
						if (z < 0) {
							if (altColor !== color) {
								gr.FillSolidRect(x, this.h / 2 - z / 2, 1, - z / 2, color);
								gr.FillSolidRect(x, this.h / 2, 1, - z / 2, altColor);
							} else {
								gr.FillSolidRect(x, this.h / 2, 1, - z, color);
							}
						}
					} else if (this.preset.waveMode === 'halfbars') {
						const scaledSize = size / 2 * scale;
						this.offset[n] += (bPaintFuture && bIsfuture || bVisualizer ? - Math.sign(scale) * Math.random() * scaledSize / 10 * this.step / this.maxStep : 0); // Add movement when painting future
						const rand = Math.sign(scale) * this.offset[n];
						const y = (scaledSize > 0 ? Math.max(scaledSize + rand, 1) : Math.min(scaledSize + rand, -1));
						let color = bPaintFuture && bIsfuture ? this.ui.colors.mainFuture : this.ui.colors.main;
						let altColor = bPaintFuture && bIsfuture ? this.ui.colors.altFuture : this.ui.colors.alt;
						const x = this.x + this.marginW + barW * n;
						// Current position
						if ((this.preset.bPaintCurrent || this.mouseDown) && this.analysis.binaryMode !== 'ffprobe') {
							if (x <= currX && x >= currX - 2 * barW) {color = altColor = this.ui.colors.currPos;}
						}
						if (y > 0) {
							if (altColor !== color) {
								gr.DrawRect(x, this.h / 2 + size / 2 - 2 * y  , barW, y, 1, color);
								gr.DrawRect(x, this.h / 2 + size / 2 - y  , barW, y, 1, altColor);
							} else {
								gr.DrawRect(x, this.h / 2 + size / 2 - 2 * y  , barW, 2 * y, 1, color);
							}
						}
					} else if (this.preset.waveMode === 'bars') {
						const scaledSize = size / 2 * scale;
						this.offset[n] += (bPaintFuture && bIsfuture || bVisualizer ? - Math.sign(scale) * Math.random() * scaledSize / 10 * this.step / this.maxStep : 0); // Add movement when painting future
						const rand = Math.sign(scale) * this.offset[n];
						const y = (scaledSize > 0 ? Math.max(scaledSize + rand, 1) : Math.min(scaledSize + rand, -1));
						let color = bPaintFuture && bIsfuture ? this.ui.colors.mainFuture : this.ui.colors.main;
						let altColor = bPaintFuture && bIsfuture ? this.ui.colors.altFuture : this.ui.colors.alt;
						const x = this.x + this.marginW + barW * n;
						// Current position
						if ((this.preset.bPaintCurrent || this.mouseDown) && this.analysis.binaryMode !== 'ffprobe') {
							if (x <= currX && x >= currX - 2 * barW) {color = altColor = this.ui.colors.currPos;}
						}
						let z = bVisualizer ? Math.abs(y) : y;
						if (z > 0) { // Split waveform in 2, and then each half in 2 for highlighting
							if (altColor !== color) {
								gr.DrawRect(x, this.h / 2 - z, barW, z / 2, 1, color);
								gr.DrawRect(x, this.h / 2 - z / 2, barW, z / 2, 1, altColor);
							} else {
								gr.DrawRect(x, this.h / 2 - z, barW, z, 1, color);
							}
						}
						z = bVisualizer ? - Math.abs(y) : y;
						if (z < 0) {
							if (altColor !== color) {
								gr.DrawRect(x, this.h / 2 - z / 2, barW, - z / 2, 1, color);
								gr.DrawRect(x, this.h / 2, barW, - z / 2, 1, altColor);
							} else {
								gr.DrawRect(x, this.h / 2, barW, - z, 1, color);
							}
						}
					} else if (this.preset.waveMode === 'points') {
						const scaledSize = size / 2 * scale;
						const y = (scaledSize > 0 ? Math.max(scaledSize, 1) : Math.min(scaledSize, -1));
						const color = bPaintFuture && bIsfuture ? this.ui.colors.mainFuture : this.ui.colors.main;
						const altColor = bPaintFuture && bIsfuture ? this.ui.colors.altFuture : this.ui.colors.alt;
						this.offset[n] += (bPaintFuture && bIsfuture || bVisualizer ? Math.random() * Math.abs(this.step / this.maxStep) : 0); // Add movement when painting future
						const rand = this.offset[n];
						const step = Math.max(this.h / 80, 5) + (rand || 1) // Point density
						const circleSize = Math.max(step / 25, 1);
						// Split waveform in 2, and then each half in 2 for highlighting. If colors match, the same amount of points are painted anyway...
						const sign = Math.sign(y);
						let yCalc = this.h / 2;
						let bottom = this.h / 2 - y / 2;
						while (sign * (yCalc - bottom) > 0) {
							gr.DrawEllipse(x, yCalc, circleSize, circleSize, 1, altColor);
							yCalc += (- sign) * step;
						}
						bottom += - y / 2;
						while (sign * (yCalc - bottom) > 0) {
							gr.DrawEllipse(x, yCalc, circleSize, circleSize, 1, color);
							yCalc += (- sign) * step;
						}
						if (bVisualizer) {
							const sign = - Math.sign(y);
							let yCalc = this.h / 2;
							let bottom = this.h / 2 + y / 2;
							while (sign * (yCalc - bottom) > 0) {
								gr.DrawEllipse(x, yCalc, circleSize, circleSize, 1, altColor);
								yCalc += (- sign) * step;
							}
							bottom += + y / 2;
							while (sign * (yCalc - bottom) > 0) {
								gr.DrawEllipse(x, yCalc, circleSize, circleSize, 1, color);
								yCalc += (- sign) * step;
							}
						}
					}
					xPast = x;
				}
				n++;
			}
			gr.SetSmoothingMode(0);
			// Current position
			if (this.preset.bPaintCurrent || this.mouseDown) {
				const minBarW = Math.round(Math.max(barW, _scale(1)));
				if (this.analysis.binaryMode === 'ffprobe') {
					gr.DrawLine(currX, this.y, currX, this.y + this.h, minBarW, this.ui.colors.currPos);
				} else if (this.preset.waveMode === 'waveform' || this.preset.waveMode === 'points') {
					gr.DrawLine(currX, this.y, currX, this.y + this.h, minBarW, this.ui.colors.currPos);
				}
			}
		} else if (fb.IsPlaying) {
			const center = DT_VCENTER | DT_CENTER | DT_END_ELLIPSIS | DT_CALCRECT | DT_NOPREFIX;
			if (!this.isAllowedFile && !this.isFallback && this.analysis.binaryMode !== 'visualizer') {
				gr.GdiDrawText('Not compatible file format...', this.ui.gFont, 0xFFFFFFFF, this.x + this.marginW, 0, this.w - this.marginW * 2, this.h, center);
			} else if (!this.analysis.bAutoAnalysis) {
				gr.GdiDrawText('Seekbar file not found...', this.ui.gFont, 0xFFFFFFFF, this.x + this.marginW, 0, this.w - this.marginW * 2, this.h, center);
			} else if (this.active) {
				gr.GdiDrawText('Analyzing track...', this.ui.gFont, 0xFFFFFFFF, this.x + this.marginW, 0, this.w - this.marginW * 2, this.h, center);
			}
		}
		// Incrementally draw animation on small steps
		if (this.step >= this.maxStep) {this.step = - this.step;}
		else {
			if (this.step === 0) {this.offset = [];}
			this.step++;
		}
		// Animate smoothly, Repaint by zone when possible
		if (bVisualizer) {throttlePaint();}
		else if (bPaintFuture) {
			const barW = Math.round(Math.max((this.w - this.marginW * 2) / frames, _scale(2)));
			throttlePaintRect(currX - 2 * barW, 0, this.w, this.h);
		} else if (this.preset.bPaintCurrent && frames) {
			const barW = Math.round(Math.max((this.w - this.marginW * 2) / frames, _scale(2)));
			throttlePaintRect(currX - 2 * barW, 0, 4 * barW, this.h);
		}
		if (this.ui.bVariableRefreshRate) {
			if (profilerPaint.Time > this.ui.refreshRate) {this.updateConfig({ui: {refreshRate: this.ui.refreshRate + 50}});}
			else if (profilerPaint.Time < this.ui.refreshRate && profilerPaint.Time >= this.ui.refreshRateOpt) {this.updateConfig({ui: {refreshRate: this.ui.refreshRate - 25}});}
		}
	};
	
	this.trace = (x, y) => {
		return (x >= this.x && y >= this.y && x <= this.x + this.w && y <= this.y + this.h);
	};
	
	this.lbtnUp = (x, y, mask) => {
		this.mouseDown = false;
		if (!this.trace(x,y)) {return false;}
		const handle = fb.GetSelection();
		if (handle && fb.IsPlaying) { // Seek
			const frames = this.current.length;
			if (frames !== 0) {
				const barW = (this.w - this.marginW * 2) / frames;
				let time = Math.round(fb.PlaybackLength / frames * (x - this.x - this.marginW) / barW);
				if (time < 0) {time = 0;}
				else if (time > fb.PlaybackLength) {time = fb.PlaybackLength;}
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
		return {seekbarFolder, seekbarFile};
	};
	
	this.analyze = async (handle, seekbarFolder, seekbarFile) => {
		if (!_isFolder(seekbarFolder)) {_createFolder(seekbarFolder);}
		let profiler, cmd;
		// Change to track folder since ffprobe has stupid escape rules which are impossible to apply right with amovie input mode
		let handleFileName = handle.Path.split('\\').pop();
		const handleFolder = handle.Path.replace(handleFileName, '');
		if (this.isAllowedFile && this.analysis.binaryMode === 'audiowaveform') {
			if (this.bProfile) {profiler = new FbProfiler('audiowaveform');}
			const extension = handleFileName.match(/(?:\.)(\w+$)/i)[1];
			cmd = 'CMD /C PUSHD ' + _q(handleFolder) + ' && ' +
				_q(this.binaries.audiowaveform) + ' -i ' + _q(handleFileName) +
				' --pixels-per-second ' + (Math.round(this.analysis.resolution) || 1) + ' --input-format ' + extension + ' --bits 8 -o ' + _q(seekbarFolder + 'data.json');
		} else if (this.isAllowedFile && this.analysis.binaryMode === 'ffprobe') {
			if (this.bProfile) {profiler = new FbProfiler('ffprobe');}
			handleFileName = handleFileName.replace(/[,:%]/g, '\\$&').replace(/'/g, '\\\\\\\''); // And here we go again...
			cmd = 'CMD /C PUSHD ' + _q(handleFolder) + ' && ' +
				_q(this.binaries.ffprobe) + ' -hide_banner -v panic -f lavfi -i amovie=' + _q(handleFileName) +
				(this.analysis.resolution > 1 ? ',aresample=' + Math.round((this.analysis.resolution || 1) * 100) + ',asetnsamples=' + Math.round((this.analysis.resolution / 10)**2) : '') +
				',astats=metadata=1:reset=1 -show_entries frame=pkt_pts_time:frame_tags=lavfi.astats.Overall.Peak_level,lavfi.astats.Overall.RMS_level,lavfi.astats.Overall.RMS_peak -print_format json > ' +
				_q(seekbarFolder + 'data.json');
		} else if (this.isFallback || this.analysis.binaryMode === 'visualizer') {
			profiler = new FbProfiler('visualizer');
		}
		if (this.bDebug && cmd) {console.log(cmd);}
		let bDone = cmd ? _runCmd(cmd, false) : true;
		bDone = bDone && (await new Promise((resolve) => {
				if (this.isFallback || this.analysis.binaryMode === 'visualizer') {resolve(true);}
				const timeout = Date.now() + Math.round(10000 * (handle.Length / 180)); // Break if it takes too much time: 10 secs per 3 min of track
				const id = setInterval(() => {
					if (_isFile(seekbarFolder + 'data.json')) {
						// ffmpeg writes sequentially so wait until it finish...
						if (this.analysis.binaryMode === 'ffprobe' && _jsonParseFile(seekbarFolder + 'data.json', this.codePage)) {
							clearInterval(id); resolve(true);
						} else if (this.analysis.binaryMode !== 'ffprobe') {
							clearInterval(id); resolve(true);
						}
					} else if (Date.now() > timeout) {clearInterval(id); resolve(false);}
				}, 300);
			})
		);
		if (bDone) {
			const data = cmd ? _jsonParseFile(seekbarFolder + 'data.json', this.codePage) : this.visualizerData(handle);
			_deleteFile(seekbarFolder + 'data.json');
			if (data) {
				if (!this.isFallback && this.analysis.binaryMode === 'ffprobe' && data.frames && data.frames.length) {
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
						this.current.push([time, rms, rmsPeak, peak]);
					});
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
						const compressed = LZUTF8.compress(str, {outputEncoding: 'Base64'});
						_save(seekbarFile + '.ff.lz', compressed);
					} else {
						_save(seekbarFile + '.ff.json', str);
					}
				} else if (!this.isFallback && this.analysis.binaryMode === 'audiowaveform' && data.data && data.data.length) {
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
						const compressed = LZUTF8.compress(str, {outputEncoding: 'Base64'});
						_save(seekbarFile + '.aw.lz', compressed);
					} else {
						_save(seekbarFile + '.aw.json', str);
					}
				} else if ((this.isFallback || this.analysis.binaryMode === 'visualizer') && data.length) {
					this.current = data;
				}
			}
			// Set animation using BPM if possible
			if (this.preset.bUseBPM) {this.bpmSteps(handle);}
			// Console and paint
			if (this.bProfile) {
				if (cmd) {profiler.Print('Retrieve volume levels. Compression ' + this.analysis.compressionMode + '.');}
				else {profiler.Print('Visualizer.');}
			}
			if (this.current.length) {throttlePaint();}
			else {console.log(this.analysis.binaryMode + ': failed analyzing the file -> ' + handle.Path);}
		}
	};
	
	this.visualizerData = (handle, preset = 'classic spectrum analyzer', bVariableLen = false) => {
		const samples = bVariableLen 
			? handle.Length * (this.analysis.resolution || 1)
			: this.w / _scale(5) * (this.analysis.resolution || 1);
		const data = [];
		switch (preset) {
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
}