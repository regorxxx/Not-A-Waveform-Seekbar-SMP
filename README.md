# Not-A-Waveform-Seekbar-SMP
A seekbar for [foobar2000](https://www.foobar2000.org), using [Spider Monkey Panel](https://theqwertiest.github.io/foo_spider_monkey_panel) and [ffmpeg](https://ffmpeg.org/ffprobe.html).

It's based on RMS or peak levels, instead of the actual waveform.

1. Download this repository and copy at desired folder within foobar profile folder.

2. Download [ffprobe](https://ffmpeg.org/download.html) and copy ffprobe.exe into the scripts folder.

3. At seekbar.js, edit ffprobe path as needed:
```
	ffprobe: arch === 'x64' // Should be set by user to not hard-code paths
		? fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers-external\\ffprobe\\bin\\win32\\x64\\ffprobe.exe'
		: fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers-external\\ffprobe\\bin\\win32\\ia32\\ffprobe.exe',
```
4. Load seekbar.js in a blank panel.
