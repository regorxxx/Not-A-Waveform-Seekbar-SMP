'use strict';
//27/01/23
include('..\\..\\helpers-external\\lz-utf8\\lzutf8.js'); // For string compression
include('..\\..\\helpers-external\\lz-string\\lz-string.min.js'); // For string compression

function _seekbar({
		matchPattern = '$lower([%ALBUM ARTIST%]\\[%ALBUM%][ {$if2(%DESCRIPTION%,%COMMENT%)}]\\%TRACKNUMBER% - %TITLE%)', // Used to create folder path
		binaries = {
			ffprobe: fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers-external\\ffprobe.exe',
			audiowaveform: fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers-external\\audiowaveform\\audiowaveform.exe'
		},
		preset = {
			waveMode: 'waveform', // waveform | bars | points
			analysisMode: 'Peak_level', // RMS_level | Peak_level | RMS_peak
			paintMode: 'full', // // full | partial
			bPaintFuture: false,
			bPaintCurrent: true,
		},
		ui = {
			gFont: _gdiFont('Segoe UI', _scale(15)),
			colors: {bg: colours.Black, bar: colours.LimeGreen, barBg: colours.Gray, barLine: colours.DimGray, currPos: colours.White},
			pos: {x: 0, y: 0, w: window.Width, h: window.Height, scaleH: 0.9, marginW: window.Width / 30}
		},
		analysis = {
			binaryMode: 'audiowaveform', // ffprobe | audiowaveform
			resolution: 0, // ms, set to zero to analyze each frame. Fastest is zero, since other values require resampling. Better to set resolution at paint averaging values if desired...
			bNormalize: true,
			bAutoAnalysis: true,
			bCompress: true,
			bAutoRemove: false // Deletes analysis files when unloading the script, but they are kept during the session (to not recalculate)
		}
	} = {}) {
		
	this.defaults = () => {
		const defBinaries = {
			ffprobe: fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers-external\\ffprobe\\bin\\win32\\x64\\ffprobe.exe',
			audiowaveform: fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers-external\\audiowaveform\\audiowaveform.exe'
		};
		const defPreset = {
			waveMode: 'waveform', // waveform | bars | points
			analysisMode: 'Peak_level', // RMS_level | Peak_level | RMS_peak
			paintMode: 'full', // // full | partial
			bPaintFuture: false,
			bPaintCurrent: true,
		};
		const defUi = {
			gFont: _gdiFont('Segoe UI', _scale(15)),
			colors: {bg: colours.Black, bar: colours.LimeGreen, barBg: colours.Gray, barLine: colours.DimGray, currPos: colours.White},
			pos: {x: 0, y: 0, w: window.Width, h: window.Height, scaleH: 0.9, marginW: window.Width / 30}
		};
		const defAnalysis = {
			binaryMode: 'audiowaveform', // ffprobe | audiowaveform
			resolution: 0, // ms, set to zero to analyze each frame. Fastest is zero, since other values require resampling. Better to set resolution at paint averaging values if desired...
			bNormalize: true,
			bAutoAnalysis: true,
			bCompress: true,
			bAutoRemove: false
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
	};
	// Add default args
	this.defaults();
	// Set
	this.binaries = binaries;
	this.ui = ui;
	this.preset = preset;
	this.analysis = analysis;
	this.analysis.bCompressV2 = this.analysis.bCompress && true; // Should be either enabled or completely disabled for audiowaveform mode. Standard compress is not good enough
	// Easy access
	this.x = ui.pos.x; this.y = ui.pos.y; this.w = ui.pos.w; this.h = ui.pos.h;
	this.scaleH = ui.pos.scaleH; this.marginW = ui.pos.marginW;
	// Internals
	this.TF = fb.TitleFormat(matchPattern);
	this.folder = fb.ProfilePath + 'js_data\\seekbar\\';
	this.codePage = convertCharsetToCodepage('UTF-8');
	this.codePageV2 = convertCharsetToCodepage('UTF-16LE');
	this.current = [];
	this.time = 0;
	const modes = {RMS_level: {key: 'rms', pos: 1}, RMS_peak: {key: 'rmsPeak', pos: 2}, Peak_level: {key: 'peak', pos: 3}}; // For ffprobe
	// Check
	this.checkConfig();
	if (!_isFolder(this.folder)) {_createFolder(this.folder);}
	
	this.newTrack = (handle = fb.GetNowPlaying()) => {
		this.current = [];
		if (handle) {
			const {seekbarFolder, seekbarFile} = this.getPaths(handle);
			// Uncompressed file -> Compressed UTF8 file -> Compressed UTF16 file -> Analyze
			if (this.analysis.binaryMode === 'ffprobe' && _isFile(seekbarFile)) {
				this.current = _jsonParseFile(seekbarFile, this.codePage) || [];
			} else if (this.analysis.binaryMode === 'ffprobe' && _isFile(seekbarFile + '.lz')) {
				const profiler = new FbProfiler('LZUTF8');
				let str = _open(seekbarFile + '.lz', this.codePage) || '';
				str = LZUTF8.decompress(str, {inputEncoding: 'Base64'}) || null;
				this.current = str ? JSON.parse(str) || [] : [];
				profiler.Print('Decompress.');
			} else if (this.analysis.binaryMode === 'ffprobe' && _isFile(seekbarFile + '.lz16')) {
				const profiler = new FbProfiler('LZString');
				let str = _open(seekbarFile + '.lz16', this.codePageV2) || '';
				str = LZString.decompressFromUTF16(str) || null;
				this.current = str ? JSON.parse(str) || [] : [];
				profiler.Print('Decompress.');
			} else if (this.analysis.binaryMode === 'audiowaveform' && _isFile(seekbarFile + '.json')) {
				this.current = _jsonParseFile(seekbarFile + '.json', this.codePage) || [];
			} else if (this.analysis.binaryMode === 'audiowaveform' &&_isFile(seekbarFile + '.json.lz')) {
				const profiler = new FbProfiler('LZUTF8');
				let str = _open(seekbarFile + '.json.lz', this.codePage) || '';
				str = LZUTF8.decompress(str, {inputEncoding: 'Base64'}) || null;
				this.current = str ? JSON.parse(str) || [] : [];
				profiler.Print('Decompress.');
			} else if (this.analysis.binaryMode === 'audiowaveform' &&_isFile(seekbarFile + '.json.lz16')) {
				const profiler = new FbProfiler('LZString');
				let str = _open(seekbarFile + '.json.lz16', this.codePageV2) || '';
				str = LZString.decompressFromUTF16(str) || null;
				this.current = str ? JSON.parse(str) || [] : [];
				profiler.Print('Decompress.');
			} else if (this.analysis.bAutoAnalysis && _isFile(handle.Path)) {
				window.Repaint();
				this.analyze(handle, seekbarFolder, seekbarFile);
			}
			// Calculate waveform on the fly
			if (this.current.length) {
				if (this.analysis.binaryMode === 'ffprobe') {
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
					if (this.analysis.bNormalize && maxVal !== 0) {
						this.current.forEach((frame) => {
							if (frame[4] !== 1) {frame[4] = frame[4] - maxVal;}
						});
					}
				} else if (this.analysis.binaryMode === 'audiowaveform') {
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
		window.Repaint();
	};
	
	this.updateTime = (time) => {
		this.time = time;
		window.Repaint();
	};
	
	this.stop = (reason) => {
		this.current = [];
		this.time = 0;
		if (reason !== 2) {window.Repaint();}
	};
	
	const throttlePaint = throttle(() => window.Repaint(), 200);
	
	this.paint = (gr) => {
		if (!fb.IsPlaying) {this.current = [];} // In case paint has been delayed after playback has stopped...
		const frames = this.current.length;
		// Panel background
		gr.FillSolidRect(this.x , this.y, this.w, this.h, this.ui.colors.bg);
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
			const bPaintFuture = this.preset.paintMode === 'partial' && this.preset.bPaintFuture;
			const timeConstant = fb.PlaybackLength / frames;
			let current, xPast = this.x;
			gr.SetSmoothingMode(this.analysis.binaryMode === 'ffprobe' ? 3 : 4);
			for (let frame of this.current) { // [peak]
				current = timeConstant * n;
				const bIsfuture = current > this.time;
				if (this.preset.paintMode === 'partial' && !bPaintFuture && bIsfuture) {break;}
				const scale = frame;
				const x = this.x + this.marginW + barW * n;
				if ((x - xPast) > 0) {
					if (this.preset.waveMode === 'waveform') {
						const scaledSize = size / 2 * scale;
						const y =  (scaledSize > 0 ? Math.max(scaledSize, 1) : Math.min(scaledSize, -1)) 
							+ (bPaintFuture && bIsfuture ? - Math.sign(scale) * Math.random() * scaledSize / 10: 0); // Add movement when painting future
						let color = this.ui.colors.bar, altColor = colours.LawnGreen; // TODO change colors for future wave
						if (y > 0) {
							if (altColor !== color) {
								gr.FillSolidRect(x, this.h / 2 - y, 1, y / 2, color);
								gr.FillSolidRect(x, this.h / 2 - y / 2, 1, y / 2, altColor);
							} else {
								gr.FillSolidRect(x, this.h / 2 - y, 1, y, color);
							}
						} else if (y < 0) {
							if (altColor !== color) {
								gr.FillSolidRect(x, this.h / 2 - y / 2, 1, - y / 2, color);
								gr.FillSolidRect(x, this.h / 2, 1, - y / 2, altColor);
							} else {
								gr.FillSolidRect(x, this.h / 2, 1, - y, color);
							}
						}
					} else if (this.preset.waveMode === 'halfbars') {
						const scaledSize = size / 2 * scale;
						const y = (scaledSize > 0 ? Math.max(scaledSize, 1) : Math.min(scaledSize, -1)) 
							+ (bPaintFuture && bIsfuture ? - Math.sign(scale) * Math.random() * scaledSize / 10: 0); // Add movement when painting future
						let color = this.ui.colors.bar, altColor = colours.LawnGreen; // TODO change colors for future wave
						const x = this.x + this.marginW + barW * n;
						// Current position
						const currX = (this.x + this.marginW + barW * fb.PlaybackTime / fb.PlaybackLength * frames);
						if (this.preset.bPaintCurrent) {
							if (x <= currX + barW && x >= currX - barW) {color = altColor = this.ui.colors.currPos;}
						}
						if (y > 0) {
							if (altColor !== color) {
								gr.DrawRect(x, this.h / 2 + size / 2 - 2 * y  , barW, y, 1, color);
								gr.DrawRect(x, this.h / 2 + size / 2 - y  , barW, y, 1, altColor);
							} else {
								gr.DrawRect(x, this.h / 2 + size / 2 - 2 * y  , barW, 2 * y, 1, color);
							}
						}
						// }
					} else if (this.preset.waveMode === 'bars') {
						const scaledSize = size / 2 * scale;
						const y = (scaledSize > 0 ? Math.max(scaledSize, 1) : Math.min(scaledSize, -1)) 
							+ (bPaintFuture && bIsfuture ? - Math.sign(scale) * Math.random() * scaledSize / 10: 0); // Add movement when painting future
						let color = this.ui.colors.barLine, altColor = colours.LawnGreen; // TODO change colors for future wave
						const x = this.x + this.marginW + barW * n;
						// Current position
						const currX = (this.x + this.marginW + barW * fb.PlaybackTime / fb.PlaybackLength * frames);
						if (this.preset.bPaintCurrent) {
							if (x <= currX + barW && x >= currX - barW) {color = altColor = this.ui.colors.currPos;}
						}
						if (y > 0) { // Split waveform in 2, and then each half in 2 for highlighting
							if (altColor !== color) {
								gr.DrawRect(x, this.h / 2 - y, barW, y / 2, 1, color);
								gr.DrawRect(x, this.h / 2 - y / 2, barW, y / 2, 1, altColor);
							} else {
								gr.DrawRect(x, this.h / 2 - y, barW, y, 1, color);
							}
						} else if (y < 0) {
							if (altColor !== color) {
								gr.DrawRect(x, this.h / 2 - y / 2, barW, - y / 2, 1, color);
								gr.DrawRect(x, this.h / 2, barW, - y / 2, 1, altColor);
							} else {
								gr.DrawRect(x, this.h / 2, barW, - y, 1, color);
							}
						}
					} else if (this.preset.waveMode === 'points') {
						const scaledSize = size / 2 * scale;
						const y = (scaledSize > 0 ? Math.max(scaledSize, 1) : Math.min(scaledSize, -1));
						let color = this.ui.colors.bar, altColor = colours.LawnGreen; // TODO change colors for future wave
						// // Current position
						// const currX = (this.x + this.marginW + barW * fb.PlaybackTime / fb.PlaybackLength * frames);
						// if (this.preset.bPaintCurrent) {
							// if (x <= currX + barW && x >= currX - barW) {color = altColor = this.ui.colors.currPos;}
						// }
						const step = Math.max(this.h / 80,  5) // Point density
							+ (bPaintFuture && bIsfuture ? Math.random() : 1); // Add movement when painting future
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
					}
					xPast = x;
				}
				n++;
				if (this.preset.paintMode === 'full' && frame[0] <= this.time) {nFull++;}
			}
			// Current position
			if (this.preset.bPaintCurrent) {
				const currX = (this.x + this.marginW + barW * fb.PlaybackTime / fb.PlaybackLength * frames);
				if (this.analysis.binaryMode === 'ffprobe') {
					// gr.DrawLine(currX, this.y, currX, this.y + this.h, barW, this.ui.colors.currPos);
				} else if (this.preset.waveMode === 'waveform' || this.preset.waveMode === 'points') {
					gr.DrawLine(currX, this.y, currX, this.y + this.h, barW, this.ui.colors.currPos);
				}
			}
		} else if (fb.IsPlaying) {
			const center = DT_VCENTER | DT_CENTER | DT_END_ELLIPSIS | DT_CALCRECT | DT_NOPREFIX;
			if (!this.analysis.bAutoAnalysis) {
				gr.GdiDrawText('Click to analyze track', this.ui.gFont, colours.White, this.x + this.marginW, 0, this.w - this.marginW * 2, this.h, center)
			} else {
				gr.GdiDrawText('Analyzing track...', this.ui.gFont, colours.White, this.x + this.marginW, 0, this.w - this.marginW * 2, this.h, center)
			}
		}
		if (this.preset.bPaintFuture) {throttlePaint();} // Animate smoothly
	};
	
	this.trace = (x, y) => {
		return (x >= this.x && y >= this.y && x <= this.x + this.w && y <= this.y + this.h);
	};
	
	this.lbtnUp = (x, y, mask) => {
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
				return true;
			}
		}
		return false;
	};
	
	this.move = (x, y, mask) => {
		if (mask === MK_LBUTTON && this.lbtnUp(x, y, mask)) {
			throttlePaint();
		}
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
		const id = this.TF.EvalWithMetadb(handle);
		const fileName = id.split('\\').pop();
		const seekbarFolder = this.folder + id.replace(fileName, '');
		const seekbarFile = this.folder + id + '.txt';
		return {seekbarFolder, seekbarFile};
	};
	
	this.analyze = (handle, seekbarFolder, seekbarFile) => {
		if (!_isFolder(seekbarFolder)) {_createFolder(seekbarFolder);}
		let profiler;
		// Change to track folder since ffprobe has stupid escape rules which are impossible to apply right with amovie input mode
		let handleFileName = handle.Path.split('\\').pop();
		const handleFolder = handle.Path.replace(handleFileName, '');
		let cmd;
		if (this.analysis.binaryMode === 'audiowaveform') {
			profiler = new FbProfiler('audiowaveform');
			cmd = 'CMD /C PUSHD ' + _q(handleFolder) + ' && ' +
				_q(this.binaries.audiowaveform) + ' -i ' + _q(handleFileName) +
				' --pixels-per-second ' + (this.analysis.resolution || 1) + ' -o ' + _q(seekbarFolder + 'data.json');
		} else if (this.analysis.binaryMode === 'ffprobe') {
			profiler = new FbProfiler('ffprobe');
			handleFileName = handleFileName.replace(/[,:%]/g, '\\$&').replace(/'/g, '\\\\\\\''); // And here we go again...
			cmd = 'CMD /C PUSHD ' + _q(handleFolder) + ' && ' +
				_q(this.binaries.ffprobe) + ' -f lavfi -i amovie=' + _q(handleFileName) +
				(this.analysis.resolution ? ',aresample=' + (this.analysis.resolution * 100) + ',asetnsamples=' + (this.analysis.resolution / 10)**2  : '') +
				',astats=metadata=1:reset=1 -show_entries frame=pkt_pts_time:frame_tags=lavfi.astats.Overall.Peak_level,lavfi.astats.Overall.RMS_level,lavfi.astats.Overall.RMS_peak -print_format json > ' +
				_q(seekbarFolder + 'data.json');
		}
		console.log(cmd);
		const bDone = _runCmd(cmd, true);
		if (bDone) {
			const data = _jsonParseFile(seekbarFolder + 'data.json', this.codePage);
			_deleteFile(seekbarFolder + 'data.json');
			if (data) {
				if (this.analysis.binaryMode === 'ffprobe' && data.frames && data.frames.length) {
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
					// To Base64:	~50% compression
					// To UTF16-LE:	~70% compression
					// To 7zip:		~80% compression
					const str = JSON.stringify(this.current);
					if (this.analysis.bCompressV2) {
						const profiler = new FbProfiler('LZString');
						// To save UTF16-LE files, FSO is needed.
						// https://github.com/TheQwertiest/foo_spider_monkey_panel/issues/200
						const compressed = LZString.compressToUTF16(str);
						_saveFSO(seekbarFile + '.lz16', compressed, true);
						profiler.Print('Compress.');
					} else if (this.analysis.bCompress) {
						const profiler = new FbProfiler('LZUTF8');
						// Only Base64 strings can be saved on UTF8 files...
						// https://github.com/TheQwertiest/foo_spider_monkey_panel/issues/200
						const compressed = LZUTF8.compress(str, {outputEncoding: 'Base64'});
						_save(seekbarFile + '.lz', compressed);
						profiler.Print('Compress.');
					} else {
						_save(seekbarFile, str);
					}
				} else if (this.analysis.binaryMode === 'audiowaveform' && data.data && data.data.length) {
					this.current = data.data;
					const str = JSON.stringify(this.current);
					if (this.analysis.bCompressV2) {
						const profiler = new FbProfiler('LZString');
						// To save UTF16-LE files, FSO is needed.
						// https://github.com/TheQwertiest/foo_spider_monkey_panel/issues/200
						const compressed = LZString.compressToUTF16(str);
						_saveFSO(seekbarFile + '.json.lz16', compressed, true);
						profiler.Print('Compress.');
					} else if (this.analysis.bCompress) {
						const profiler = new FbProfiler('LZUTF8');
						// Only Base64 strings can be saved on UTF8 files...
						// https://github.com/TheQwertiest/foo_spider_monkey_panel/issues/200
						const compressed = LZUTF8.compress(str, {outputEncoding: 'Base64'});
						_save(seekbarFile + '.json.lz', compressed);
						profiler.Print('Compress.');
					} else {
						_save(seekbarFile + '.json', str);
					}
				}
			}
			profiler.Print('Retrieve volume levels.');
			if (this.current.length) {window.Repaint();}
			else {console.log(this.analysis.binaryMode + ': failed analyzing the file -> ' + handle.Path);}
		}
	};
}