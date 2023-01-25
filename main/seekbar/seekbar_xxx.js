'use strict';
//25/01/23
include('..\\..\\helpers-external\\lz-utf8\\lzutf8.js'); // For string compression
include('..\\..\\helpers-external\\lz-string\\lz-string.min.js'); // For string compression

function _seekbar({
		matchPattern = '$lower([%ALBUM ARTIST%]\\[%ALBUM%][ {$if2(%DESCRIPTION%,%COMMENT%)}]\\%TRACKNUMBER% - %TITLE%)', // Used to create folder path
		ffprobe = fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers-external\\ffprobe\\bin\\win32\\x64\\ffprobe.exe',
		waveMode = 'waveform', // waveform | bars
		analysisMode = 'Peak_level', // RMS_level | Peak_level | RMS_peak
		paintMode = 'full', // // full | partial
		bPaintCurrent = true,
		bPaintFuture = waveMode === 'waveform' && paintMode === 'partial',
		resolution = 0, // ms, set to zero to analyze each frame. Fastest is zero, since other values require resampling. Better to set resolution at paint averaging values if desired...
		bNormalize = true, // ms, set to zero to analyze each frame. Fastest is zero, since other values require resampling. Better to set resolution at paint averaging values if desired...
		gFont = _gdiFont('Segoe UI', _scale(15)),
		colors = {bg: colours.Black, bar: colours.LimeGreen, barBg: colours.Gray, barLine: colours.DimGray, currPos: colours.White},
		bAutoAnalysis = true,
		bCompress = true,
		x = 0, 
		y = 0, 
		w = window.Width,
		h = window.Height,
		scaleH = 0.9,
		marginW = w / 30
	} = {}) {
	this.gFont = gFont;
	this.colors = colors;
	this.bAutoAnalysis = bAutoAnalysis;
	this.ffprobe = ffprobe;
	this.paintMode = paintMode;
	this.waveMode = waveMode;
	this.analysisMode = analysisMode;
	this.bPaintCurrent = bPaintCurrent;
	this.bPaintFuture = bPaintFuture;
	this.bNormalize = bNormalize;
	this.resolution = resolution;
	this.bCompress = bCompress;
	this.bCompressV2 = this.bCompress && true;
	this.x = x; this.y = y; this.w = w; this.h = h;
	this.scaleH = scaleH; this.marginW = marginW;
	// Internals
	this.TF = fb.TitleFormat(matchPattern);
	this.folder = fb.ProfilePath + 'js_data\\seekbar\\';
	this.codePage = convertCharsetToCodepage('UTF-8');
	this.codePageV2 = convertCharsetToCodepage('UTF-16LE');
	this.current = [];
	this.time = 0;
	const modes = {RMS_level: {key: 'rms', pos: 1}, RMS_peak: {key: 'rmsPeak', pos: 2}, Peak_level: {key: 'peak', pos: 3}}
	
	if (!_isFolder(this.folder)) {_createFolder(this.folder);}
	
	this.newTrack = (handle = fb.GetNowPlaying()) => {
		this.current = [];
		if (handle) {
			const {seekbarFolder, seekbarFile} = this.getPaths(handle);
			// Uncompressed file -> Compressed UTF8 file -> Compressed UTF16 file -> Analyze
			if (_isFile(seekbarFile)) {
				this.current = _jsonParseFile(seekbarFile, this.codePage) || [];
			} else if (_isFile(seekbarFile + '.lz')) {
				const profiler = new FbProfiler('LZUTF8');
				let str = _open(seekbarFile + '.lz', this.codePage) || '';
				str = LZUTF8.decompress(str, {inputEncoding: 'Base64'}) || null;
				this.current = str ? JSON.parse(str) || [] : [];
				profiler.Print('Decompress.');
			} else if (_isFile(seekbarFile + '.lz16')) {
				const profiler = new FbProfiler('LZString');
				let str = _open(seekbarFile + '.lz16', this.codePageV2) || '';
				str = LZString.decompressFromUTF16(str) || null;
				this.current = str ? JSON.parse(str) || [] : [];
				profiler.Print('Decompress.');
			} else if (this.bAutoAnalysis && _isFile(handle.Path)) {
				window.Repaint();
				this.analyze(handle, seekbarFolder, seekbarFile);
			}
			// Calculate waveform on the fly
			if (this.current.length) {
				// Calculate max values
				let max = 0;
				const key = modes[this.analysisMode].key; 
				const pos = modes[this.analysisMode].pos;
				this.current.forEach((frame) => {
					// After parsing JSON, restore infinity values
					if (frame[pos] === null) {frame[pos] = -Infinity;}
					const val = frame[pos];
					max = Math.min(max, isFinite(val) ? val : 0);
				});
				// Calculate point scale
				let maxVal = 1;
				if (this.analysisMode !== 'RMS_level') {
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
				if (this.bNormalize && maxVal !== 0) {
					this.current.forEach((frame) => {
						if (frame[4] !== 1) {frame[4] = frame[4] - maxVal;}
					});
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
	
	this.paint = (gr) => {
		const frames = this.current.length;
		// Panel background
		gr.FillSolidRect(this.x , this.y, this.w, this.h, this.colors.bg);
		if (frames !== 0) {
			const size = (this.h - this.y) * this.scaleH;
			const barW = (this.w - this.marginW * 2) / frames;
			const barBgW = (this.w - this.marginW * 2) / 100;
			// The painting is done as "negative", first the background with the waveform color, then the waveform values with the background color
			// As result the waveform is painted without requiring to recalculate coordinates since gr methods paint from up to down...
			// Waveform background
			if (this.waveMode === 'waveform') {
				gr.FillSolidRect(this.x + this.marginW, this.h / 2 - size / 6, this.w - this.marginW * 2, size / 6, this.colors.barBg);
				gr.FillSolidRect(this.x + this.marginW, this.h / 2, this.w - this.marginW * 2, size / 6, this.colors.barBg);
			}
			if (this.waveMode === 'bars' && this.paintMode === 'partial') {
				gr.FillSolidRect(this.x + this.marginW, this.h / 2, this.w - this.marginW * 2, size / 6, this.colors.barBg);
				for (let i = 0; i < 100; i++){
					const x = this.x + this.marginW + barBgW * i;
					gr.DrawRect(x, this.h / 2, barBgW, size / 6, 1, this.colors.barLine);
				}
			}
			// Semi-random future waveform
			if (this.waveMode === 'waveform' && this.bPaintFuture && this.paintMode === 'partial') {
				let n = 0;
				for (let frame of this.current) { // [time, rms, rmsPeak, peak, scale]
					if (frame[0] < this.time) {n++; continue;}
					const rand = Math.random();
					const scale = frame[4] * rand;
					const scaleSize = Math.max(size / 6 * (1 - scale) / 2, 1); // "fix" for values too near 0
					const x = this.x + this.marginW + barW * n;
					// Colors should be changed here to use transparency...
					gr.FillSolidRect(x, this.h / 2 - size / 6, barW, size / 6, this.colors.bar);
					gr.FillSolidRect(x, this.h / 2 - size / 6, barW, size / 6 * scale, this.colors.bg);
					if (scale !== 1) {
						gr.FillSolidRect(x, this.h / 2 - scaleSize, barW, scaleSize, colours.LawnGreen);
					}
					gr.FillSolidRect(x, this.h / 2, barW, size / 6, this.colors.bg);
					gr.FillSolidRect(x, this.h / 2, barW, size / 6 * (1 - scale), this.colors.bar);
					if (scale !== 1) { // Force at least a line
							gr.FillSolidRect(x, this.h / 2, barW, scaleSize, colours.LawnGreen);
					} else {
						gr.DrawLine(x, this.h / 2, x + barW, this.h / 6, scaleSize, colours.LawnGreen);
					}
					n++;
				}
			}
			let n = 0, nFull = 0;
			// Paint waveform layer
			for (let frame of this.current) { // [time, rms, rmsPeak, peak, scale]
				if (this.paintMode === 'partial' && frame[0] > this.time) {break;}
				const scale = frame[4];
				const scaleSize = Math.max(size / 2 * (1 - scale) / 2, 1); // "fix" for values too near 0
				const x = this.x + this.marginW + barW * n;
				if (this.waveMode === 'bars') {
					gr.FillSolidRect(x, this.h / 2 - size / 3, barW, size / 2, this.colors.bar);
					gr.FillSolidRect(x, this.h / 2 - size / 3, barW, size / 2 * scale, this.colors.bg);
					if (scale !== 1) { // Highlight half waveform
						gr.FillSolidRect(x, this.h / 2 + size / 6 - scaleSize, barW, scaleSize, colours.LawnGreen);
					} else {
						gr.DrawLine(x, this.h / 2 + size / 6, x + barW, this.h / 2 + size / 6, scaleSize, colours.LawnGreen);
					}
				}
				if (this.waveMode === 'waveform') { // Invert and highlight
					gr.FillSolidRect(x, this.h / 2 - size / 2, barW, size / 2, this.colors.bar);
					gr.FillSolidRect(x, this.h / 2 - size / 2, barW, size / 2 * scale, this.colors.bg);
					if (scale !== 1) {
						gr.FillSolidRect(x, this.h / 2 - scaleSize, barW, scaleSize, colours.LawnGreen);
					}
					gr.FillSolidRect(x, this.h / 2, barW, size / 2, this.colors.bg);
					gr.FillSolidRect(x, this.h / 2, barW, size / 2 * (1 - scale), this.colors.bar);
					if (scale !== 1) { // Force at least a line
							gr.FillSolidRect(x, this.h / 2, barW, scaleSize, colours.LawnGreen);
					} else {
						gr.DrawLine(x, this.h / 2, x + barW, this.h / 2, scaleSize, colours.LawnGreen);
					}
				}
				n++;
				if (this.paintMode === 'full' && frame[0] <= this.time) {nFull++;}
			}
			// Paint rectangles
			if (this.waveMode === 'bars') {
				if (this.paintMode === 'full') {n = nFull;}
				for (let i = 0; i < 100; i++){
					if (barBgW * i >= barW * n) {break;}
					const x = this.x + this.marginW + barBgW * i;
					gr.DrawRect(x, this.h / 2 - size / 2 + size / 6, barBgW, size / 2 + 1, 1, this.colors.bg);
				}
				if (this.paintMode === 'full') {
					for (let i = 0; i < 100; i++){
						if (barBgW * i < barW * n) {continue;}
						const x = this.x + this.marginW + barBgW * i;
						gr.DrawRect(x, this.h / 2, barBgW, size / 6, 1, this.colors.barLine);
					}
				}
			}
			// Current position
			if (this.bPaintCurrent) {
				const currX = (this.x + this.marginW + barW * fb.PlaybackTime / fb.PlaybackLength * frames);
				if (this.waveMode === 'bars') {
					gr.DrawLine(currX, this.h / 2 - size / 2 + size / 6, currX, this.h / 2 + size / 6, barW, this.colors.currPos);
				} else if (this.waveMode === 'waveform') {
					gr.DrawLine(currX, this.y, currX, this.y + this.h, barW, this.colors.currPos);
				}
			}
		} else if (fb.IsPlaying) {
			const center = DT_VCENTER | DT_CENTER | DT_END_ELLIPSIS | DT_CALCRECT | DT_NOPREFIX;
			if (!this.bAutoAnalysis) {
				gr.GdiDrawText('Click to analyze track', this.gFont, colours.White, this.x + this.marginW, 0, this.w - this.marginW * 2, this.h, center)
			} else {
				gr.GdiDrawText('Analyzing track...', this.gFont, colours.White, this.x + this.marginW, 0, this.w - this.marginW * 2, this.h, center)
			}
		}
	};
	
	this.trace = (x, y) => {
		return (x >= this.x && y >= this.y && x <= this.x + this.w && y <= this.y + this.h);
	};
	
	this.lbtnUp = (x, y, mask) => {
		if (!this.trace(x,y)) {return false;}
		const handle = fb.GetSelection();
		if (handle) {
			const {seekbarFolder, seekbarFile} = this.getPaths(handle);
			if (_isFile(handle.Path) && !_isFile(seekbarFile) && !_isFile(seekbarFile + '.lz') && !_isFile(seekbarFile + '.lz16')) { // Manual analysis
				this.analyze(handle, seekbarFolder, seekbarFile);
			} else if (fb.IsPlaying) { // Seek
				const frames = this.current.length;
				if (frames !== 0) {
					const barW = (this.w - this.marginW * 2) / frames;
					let time = Math.round(fb.PlaybackLength / frames * (x - this.x - this.marginW) / barW);
					if (time < 0) {time = 0;}
					else if (time > fb.PlaybackLength) {time = fb.PlaybackLength;}
					fb.PlaybackTime = time;
				}
			}
		}
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
		const profiler = new FbProfiler('ffprobe');
		// Change to track folder since ffmpeg has stupid escape rules which are impossible to apply right with amovie input mode
		let handleFileName = handle.Path.split('\\').pop();
		const handleFolder = handle.Path.replace(handleFileName, '');
		handleFileName = handleFileName.replace(/[,:%]/g, '\\$&').replace(/'/g, '\\\\\\\''); // And here we go again...
		const bDone = _runCmd(
			'CMD /C PUSHD ' + _q(handleFolder) + ' && ' +
			_q(this.ffprobe) + ' -f lavfi -i amovie=' + _q(handleFileName) +
			(this.resolution ? ',aresample=' + (this.resolution * 100) + ',asetnsamples=' + (this.resolution / 10)**2  : '') +
			',astats=metadata=1:reset=1 -show_entries frame=pkt_pts_time:frame_tags=lavfi.astats.Overall.Peak_level,lavfi.astats.Overall.RMS_level,lavfi.astats.Overall.RMS_peak -print_format json > ' +
			_q(seekbarFolder + 'data.json'), true
		);
		if (bDone) {
			const data = _jsonParseFile(seekbarFolder + 'data.json', this.codePage);
			_deleteFile(seekbarFolder + 'data.json');
			if (data && data.frames) {
				if (data.frames.length) {
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
					if (this.bCompressV2) {
						const profiler = new FbProfiler('LZString');
						// To save UTF16-LE files, FSO is needed.
						// https://github.com/TheQwertiest/foo_spider_monkey_panel/issues/200
						const compressed = LZString.compressToUTF16(str);
						_saveFSO(seekbarFile + '.lz16', compressed, true);
						profiler.Print('Compress.');
					} else if (this.bCompress) {
						const profiler = new FbProfiler('LZUTF8');
						// Only Base64 strings can be saved on UTF8 files...
						// https://github.com/TheQwertiest/foo_spider_monkey_panel/issues/200
						const compressed = LZUTF8.compress(str, {outputEncoding: 'Base64'});
						_save(seekbarFile + '.lz', compressed);
						profiler.Print('Compress.');
					} else {
						_save(seekbarFile, str);
					}
					profiler.Print('Retrieve volume levels.');
				}
			}
			if (this.current.length) {window.Repaint();}
			else {console.log('ffprobe: failed anylizing the file -> ' + handle.Path);}
		}
	};
}