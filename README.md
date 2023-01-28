# Not-A-Waveform-Seekbar-SMP [WIP]
A seekbar for [foobar2000](https://www.foobar2000.org), using [Spider Monkey Panel](https://theqwertiest.github.io/foo_spider_monkey_panel) and [ffmpeg](https://ffmpeg.org/ffprobe.html).

It's based on RMS or peak levels, instead of the actual waveform.

1. Download this repository and copy at desired folder within foobar profile folder.
2. Script uses [audiowaveform](https://github.com/bbc/audiowaveform) by default (included), but [ffprobe](https://ffmpeg.org/download.html) can be used if desired. Download it and copy ffprobe.exe into the scripts folder.

3. At seekbar.js, line 11, edit paths as needed:
```
	binaries: {
		ffprobe: arch === 'x64' // Should be set by user to not hard-code paths
			? fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers-external\\ffprobe\\ffprobe.exe'
			: fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers-external\\ffprobe\\ffprobe_32.exe',
		audiowaveform: arch === 'x64
			? fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers-external\\audiowaveform\\audiowaveform.exe''
			: fb.ProfilePath + 'scripts\\SMP\\xxx-scripts\\helpers-external\\audiowaveform\\audiowaveform_32.exe'',
	},
```
4. Load seekbar.js in a blank panel.

Waveform full
![imagen](https://user-images.githubusercontent.com/83307074/214268040-55fe0213-2ddc-44e6-9286-68590f7b0eb9.png)
Waveform partial + future
![imagen](https://user-images.githubusercontent.com/83307074/214268107-22c3a76b-7a31-4b6e-b4e7-c401089e9817.png)
Waveform partial
![imagen](https://user-images.githubusercontent.com/83307074/214268200-64942fc4-458b-416b-a77d-eb14f17c0336.png)
Bars full
![imagen](https://user-images.githubusercontent.com/83307074/214268369-f12ffe73-6fc9-4685-8c93-05c5c74833ec.png)
Bars partial
![imagen](https://user-images.githubusercontent.com/83307074/214268312-0b5b9ee5-b399-4fdc-91b5-7b296bce2436.png)

R. Click to configure. Configuration lost on restart.

See discussion for development:
https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/discussions/1
