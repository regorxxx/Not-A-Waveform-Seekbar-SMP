'use strict';
//24/01/23

function _seekbar({
		matchPattern = '$lower([%ALBUM ARTIST%]\\[%ALBUM%][ {$if2(%DESCRIPTION%,%COMMENT%)}]\\%TRACKNUMBER% - %TITLE%)', // Used to create folder path
		ffprobe = fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers-external\\ffprobe\\bin\\win32\\x64\\ffprobe.exe',
		waveMode = 'waveform', // waveform | bars
		analysisMode = 'RMS_level', // RMS_level | Peak_level | RMS_peak
		paintMode = 'full', // // full | partial
		bPaintCurrent = true,
		bPaintFuture = waveMode === 'waveform' && paintMode === 'partial',
		resolution = 0, // ms, set to zero to analyze each frame. Fastest is zero, since other values require resampling. Better to set resolution at paint averaging values if desired...
		gFont = _gdiFont('Segoe UI', _scale(15)),
		colors = {bg: colours.Black, bar: colours.LimeGreen, barBg: colours.Gray, barLine: colours.DimGray, currPos: colours.White},
		bAutoAnalysis = true,
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
	this.resolution = resolution;
	this.x = x; this.y = y; this.w = w; this.h = h;
	this.scaleH = scaleH; this.marginW = marginW;
	// Internals
	this.TF = fb.TitleFormat(matchPattern);
	this.folder = fb.ProfilePath + 'js_data\\seekbar\\';
	this.codePage = convertCharsetToCodepage('UTF-8');
	this.current = [];
	this.time = 0;
	this.bPaintFuture = bPaintFuture;
	
	if (!_isFolder(this.folder)) {_createFolder(this.folder);}
	
	this.newTrack = (handle) => {
		if (handle) {
			const {seekbarFolder, seekbarFile} = this.getPaths(handle);
			if (_isFile(seekbarFile)) {
				this.current = _jsonParseFile(seekbarFile, this.codePage) || [];
			} else if (this.bAutoAnalysis && _isFile(handle.Path)) {
				this.current = [];
				window.Repaint();
				this.analyze(handle, seekbarFolder, seekbarFile);
			} else {
				this.current = [];
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
		gr.FillSolidRect(this.x , this.y, this.w, this.h, this.colors.bg);
		if (frames !== 0) {
			const size = (this.h - this.y) * this.scaleH;
			const barW = (this.w - this.marginW * 2) / frames;
			const barBgW = (this.w - this.marginW * 2) / 100;
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
			if (this.waveMode === 'waveform' && this.bPaintFuture && this.paintMode === 'partial') { // Semi-random future waveform
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
			if (_isFile(handle.Path) && !_isFile(seekbarFile)) { // Manual analysis
				this.analyze(handle, seekbarFolder, seekbarFile);
			} else if (fb.IsPlaying) { // Seek
				const frames = this.current.length;
				if (frames !== 0) {
					const barW = (this.w - this.marginW * 2) / frames;
					let time = fb.PlaybackLength / frames * (x - this.x - this.marginW) / barW ;
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
					let max = {rms: 0, rmsPeak: 0, peak: 0};
					data.frames.forEach((frame) => {
						// Save values as array to compress file as much as possible, also round decimals...
						const rms = frame.tags['lavfi.astats.Overall.RMS_level'] !== '-inf' 
							? round(Number(frame.tags['lavfi.astats.Overall.RMS_level']), 0)
							: -Infinity;
						const rmsPeak = frame.tags['lavfi.astats.Overall.RMS_peak'] !== '-inf' 
							? round(Number(frame.tags['lavfi.astats.Overall.RMS_peak']), 0)
							: -Infinity;
						const peak = frame.tags['lavfi.astats.Overall.Peak_level'] !== '-inf' 
							? round(Number(frame.tags['lavfi.astats.Overall.Peak_level']), 0)
							: -Infinity;
						this.current.push([round(Number(frame.pkt_pts_time), 1), rms, rmsPeak, peak]);
						max.rms = Math.min(max.rms, isFinite(rms) ? rms : 0);
						max.rmsPeak = Math.min(max.rmsPeak, isFinite(rmsPeak) ? rmsPeak : 0);
						max.peak = Math.min(max.peak, isFinite(peak) ? peak : 0);
					});
					const key = (this.analysisMode === 'RMS_level' ? 'rms' : this.analysisMode === 'RMS_peak' ? 'rmsPeak' : 'peak');
					const keyArr = (this.analysisMode === 'RMS_level' ? 1 : this.analysisMode === 'RMS_peak' ? 2 : 3);
					this.current.forEach((frame) => {
						// < 2 decimals, too much quantization distortion
						frame.push(isFinite(frame[keyArr]) ? round(1 - Math.abs((frame[keyArr] - max[key]) / max[key]), 2) : 1);
					});
					_save(seekbarFile, JSON.stringify(this.current));
					profiler.Print('Retrieve volume levels.');
				}
			}
			if (this.current.length) {window.Repaint();}
			else {console.log('ffprobe: failed anylizing the file -> ' + handle.Path);}
		}
	};
}