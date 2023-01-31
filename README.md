# Not-A-Waveform-Seekbar-SMP [WIP]
A seekbar for [foobar2000](https://www.foobar2000.org), using [Spider Monkey Panel](https://theqwertiest.github.io/foo_spider_monkey_panel), [audiowaveform](https://github.com/bbc/audiowaveform) or [ffprobe](https://ffmpeg.org/ffprobe.html).

It's based on RMS or peak levels, instead of the actual waveform.

1. Download this repository and copy at desired folder within foobar profile folder.
2. Script uses [audiowaveform](https://github.com/bbc/audiowaveform) by default (included), but [ffprobe](https://ffmpeg.org/download.html) can be used if desired. Download it and copy ffprobe.exe into the scripts folder.

3. At seekbar.js, line 11, edit paths and/or architecture as needed :
```
	const arch = 'x64'; // No need once path is manually set...
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

5. R. Click to configure. Configuration lost on restart. (i.e. apply it directly on main file once found your desired settings)

[See discussion for development](https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/discussions/1)

Waveform (ffprobe):
![seek5](https://user-images.githubusercontent.com/83307074/215299705-5705544e-0b78-462c-b0ee-a3220fc72552.gif)

Waveform:
![seek2](https://user-images.githubusercontent.com/83307074/215299699-ab57c6ec-1f3a-4c56-ad45-fdcf94980d60.gif)

Points:
![seek1](https://user-images.githubusercontent.com/83307074/215299701-1a97ca0a-fed1-4ed0-b8b8-796b3a9fe581.gif)

Half-Bars:
![seek4](https://user-images.githubusercontent.com/83307074/215299707-2e3d41b6-89e6-4d74-90fb-fcf25efa7632.gif)

Bars:
![seek3](https://user-images.githubusercontent.com/83307074/215299708-c70d1ebc-1c81-4af4-8cc5-183e03cfb4f5.gif)

Partial:
![seek6](https://user-images.githubusercontent.com/83307074/215299704-0696612e-6a3e-469e-8a68-4c698491dc9a.gif)

Visualizer mode (semi-random for every track, smooth animation):
![visualizer](https://user-images.githubusercontent.com/83307074/215602830-06a48290-99f7-4bf5-99cd-b5766c893498.gif)

Alternate colors:
![smooth2](https://user-images.githubusercontent.com/83307074/215738478-ea3e9a5e-3d19-49ff-a363-fc4b4be5499c.gif)
