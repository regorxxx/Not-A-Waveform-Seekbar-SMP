# Not-A-Waveform-Seekbar-SMP
[![version][version_badge]][changelog]
[![CodeFactor][codefactor_badge]](https://www.codefactor.io/repository/github/regorxxx/Not-A-Waveform-Seekbar-SMP/overview/main)
[![CodacyBadge][codacy_badge]](https://www.codacy.com/gh/regorxxx/Not-A-Waveform-Seekbar-SMP/dashboard?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=regorxxx/Not-A-Waveform-Seekbar-SMP&amp;utm_campaign=Badge_Grade)
![GitHub](https://img.shields.io/github/license/regorxxx/Not-A-Waveform-Seekbar-SMP) 

A [foobar2000](https://www.foobar2000.org/) UI [Spider Monkey Panel](https://theqwertiest.github.io/foo_spider_monkey_panel/) seekbar, using [audiowaveform](https://github.com/bbc/audiowaveform) or [ffprobe](https://ffmpeg.org/ffprobe.html). It's based on RMS, peak levels, the actual waveform or visualization presets.

![visualizer](https://user-images.githubusercontent.com/83307074/215602830-06a48290-99f7-4bf5-99cd-b5766c893498.gif)

## Features
* Uses [audiowaveform](https://github.com/bbc/audiowaveform) by default (included).
* [ffprobe](https://ffmpeg.org/download.html) can be used if desired. Download it and copy ffprobe.exe into 'helpers-external\ffprobe\'.
* Visualizer mode to simply show an animation which changes according to BPM (if tag exists).
* Fully configurable using the R. Click menu:
	* Colors
	* Waveform modes
	* Analysis modes
	* Animations
	* Refresh rate (not recommended anything below 100 ms except on really modern CPUs)
	
Waveform (ffprobe):
![seek5](https://user-images.githubusercontent.com/83307074/215299705-5705544e-0b78-462c-b0ee-a3220fc72552.gif)

Waveform (audiowaveform):
![seek2](https://user-images.githubusercontent.com/83307074/215299699-ab57c6ec-1f3a-4c56-ad45-fdcf94980d60.gif)

Points:
![seek1](https://user-images.githubusercontent.com/83307074/215299701-1a97ca0a-fed1-4ed0-b8b8-796b3a9fe581.gif)

Half-Bars:
![seek4](https://user-images.githubusercontent.com/83307074/215299707-2e3d41b6-89e6-4d74-90fb-fcf25efa7632.gif)

Bars:
![seek3](https://user-images.githubusercontent.com/83307074/215299708-c70d1ebc-1c81-4af4-8cc5-183e03cfb4f5.gif)

Partial:
![seek6](https://user-images.githubusercontent.com/83307074/215299704-0696612e-6a3e-469e-8a68-4c698491dc9a.gif)

Alternate colors:
![smooth2](https://user-images.githubusercontent.com/83307074/215738478-ea3e9a5e-3d19-49ff-a363-fc4b4be5499c.gif)

### Integrated in
 1. [Georgia ReBORN](https://github.com/TT-ReBORN/Georgia-ReBORN): a Clean, Full Dynamic Color Reborn foobar2000 Theme.
 
## Installation
See [_TIPS and INSTALLATION (txt)](https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/blob/main/_TIPS%20and%20INSTALLATION.txt) and the [Wiki](https://github.com/regorxxx/Not-A-Waveform-Seekbar-SMP/wiki/Installation).
Not properly following the installation instructions will result in scripts not working as intended. Please don't report errors before checking this.

[changelog]: CHANGELOG.md
[version_badge]: https://img.shields.io/github/release/regorxxx/Not-A-Waveform-Seekbar-SMP.svg
[codacy_badge]: https://api.codacy.com/project/badge/Grade/e04be28637dd40d99fae7bd92f740677
[codefactor_badge]: https://www.codefactor.io/repository/github/regorxxx/Not-A-Waveform-Seekbar-SMP/badge/main
