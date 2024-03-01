'use strict';
//29/02/24

/* exported _background */

include('window_xxx_helpers.js');
/* global debounce:readable, InterpolationMode:readable, RGBA:readable, toRGB:readable , isFunction:readable , _scale:readable */

/**
 * Background for panel with different cover options
 *
 * @class
 * @name _background
 * @param {{ x: any y: any w: any h: any offsetH?: any coverMode: any coverModeOptions: any colorMode: any colorModeOptions: any timer: any callbacks: any }} { x, y, w, h, offsetH, coverMode, coverModeOptions, colorMode, colorModeOptions, timer, callbacks, }?
 */
function _background({
	x, y, w, h,
	offsetH = _scale(1),
	/* eslint-disable no-unused-vars */
	coverMode, coverModeOptions,
	colorMode, colorModeOptions,
	timer,
	callbacks,
	/* eslint-enable no-unused-vars */
} = {}) {

	this.defaults = () => {
		return {
			x: 0, y: 0, w: window.Width, h: window.Height,
			offsetH: _scale(1),
			timer: 60,
			coverMode: 'none', // none | front | back | disc | icon | artist | path
			coverModeOptions: { blur: 10, angle: 0, alpha: 153, path: '', bNowPlaying: true, bProportions: true, bFill: true },
			colorMode: 'none', // none | single | gradient | bigradient
			colorModeOptions: { bDither: true, angle: 91, color: [] },
			callbacks: { change: null  /* (config, arguments, callbackArgs) => void(0) */ },
		};
	};

	this.updateImageBg = debounce((bForce = false) => {
		const bPath = this.coverMode.toLowerCase() === 'path';
		if (this.coverMode.toLowerCase() === 'none') { this.coverImg.art.path = null; this.coverImg.art.image = null; this.coverImg.handle = null; this.coverImg.art.colors = null; }
		if (this.colorMode.toLowerCase() === 'none') { this.colorImg = null; }
		const handle = (this.coverModeOptions.bNowPlaying ? fb.GetNowPlaying() : null) || fb.GetFocusItem(true);
		if (!bForce && (handle && this.coverImg.handle === handle.RawPath || this.coverImg.handle === this.coverModeOptions.path)) { return; }
		const AlbumArtId = { front: 0, back: 1, disc: 2, icon: 3, artist: 4 };
		const promise = bPath && this.coverModeOptions.path.length
			? gdi.LoadImageAsyncV2('', this.coverModeOptions.path)
			: handle
				? utils.GetAlbumArtAsyncV2(void (0), handle, AlbumArtId[this.coverMode] || 0, true, false, false)
				: Promise.reject(new Error('No handle/art'));
		promise.then((result) => {
			if (bPath) {
				this.coverImg.art.image = result;
				this.coverImg.handle = this.coverImg.art.path = this.coverModeOptions.path;
			} else {
				if (!result.image) { throw new Error('Image not available'); }
				this.coverImg.art.image = result.image;
				this.coverImg.art.path = result.path;
				this.coverImg.handle = handle.RawPath;
			}
			if (this.coverImg.art.image && this.coverModeOptions.blur !== 0 && Number.isInteger(this.coverModeOptions.blur)) {
				this.coverImg.art.image.StackBlur(this.coverModeOptions.blur);
			}
			if (this.coverImg.art.image) {
				this.coverImg.art.colors = JSON.parse(this.coverImg.art.image.GetColourSchemeJSON(4));
			}
			return this.repaint();
		}).catch(() => {
			this.coverImg.art.path = null; this.coverImg.art.image = null; this.coverImg.handle = null; this.coverImg.art.colors = null;
			return this.repaint();
		});
	}, 250);

	this.paintImage = (gr, limits = { x, y, w, h, offsetH }, fill = null /* {transparency: 20} */) => { // NOSONAR
		if (this.coverImg.art.image) {
			gr.SetInterpolationMode(InterpolationMode.InterpolationModeBilinear);
			const img = this.coverImg.art.image;
			if (fill) {
				gr.DrawImage(img, limits.x, limits.y, limits.w, limits.h, 0, img.Height / 2, Math.min(img.Width, limits.w), Math.min(img.Height, limits.h), this.coverModeOptions.angle, fill.transparency);
			} else {
				if (this.coverModeOptions.bFill) {
					if (this.coverModeOptions.bProportions) {
						const prop = limits.w / (limits.h - limits.offsetH);
						if (prop > 1) {
							const offsetY = img.Height / prop;
							gr.DrawImage(img, limits.x, limits.y, limits.w, limits.h, 0, (img.Height - offsetY) / 2, img.Width, offsetY, this.coverModeOptions.angle, this.coverModeOptions.alpha);
						} else {
							const offsetX = img.Width * prop;
							gr.DrawImage(img, limits.x, limits.y, limits.w, limits.h, (img.Width - offsetX) / 2, 0, offsetX, img.Height, this.coverModeOptions.angle, this.coverModeOptions.alpha);
						}
					} else {
						gr.DrawImage(img, limits.x, limits.y, limits.w, limits.h, 0, 0, img.Width, img.Height, this.coverModeOptions.angle, this.coverModeOptions.alpha);
					}
				} else {
					let w, h;
					if (this.coverModeOptions.bProportions) { w = h = Math.min(limits.w, limits.h - limits.offsetH); }
					else { [w, h] = [limits.w, limits.h]; }
					gr.DrawImage(img, (limits.w - w) / 2, Math.max((limits.h - limits.y - h) / 2 + limits.y, limits.y), w, h, 0, 0, img.Width, img.Height, this.coverModeOptions.angle, this.coverModeOptions.alpha);
				}
			}
			gr.SetInterpolationMode(InterpolationMode.Default);
		}
	};

	this.paint = (gr) => {
		if (this.w <= 0 || this.h <= 0) { return; }
		let grImg, bCreateImg;
		if (this.colorModeOptions.bDither && !['single', 'none'].includes(this.colorMode.toLowerCase())) {
			if (!this.colorImg || this.colorImg.Width !== this.w || this.colorImg.Height !== this.h) { this.colorImg = gdi.CreateImage(this.w, this.h); bCreateImg = true; }
			grImg = this.colorImg.GetGraphics();
		}
		const color = this.colorModeOptions.color;
		switch (this.colorMode.toLowerCase()) {
			case 'single': {
				gr.FillSolidRect(this.x, this.y, this.w, this.h, color[0]);
				break;
			}
			case 'bigradient': {
				if (bCreateImg || !this.colorModeOptions.bDither) {
					(grImg || gr).FillGradRect(this.x, this.y, this.w, this.h / 2, Math.abs(360 - this.colorModeOptions.angle), color[0], color[1] || color[0]);
					(grImg || gr).FillGradRect(this.x, this.h / 2, this.w, this.h, this.colorModeOptions.angle, color[0], color[1] || color[0]);
				}
				break;
			}
			case 'gradient': {
				if (bCreateImg || !this.colorModeOptions.bDither) {
					(grImg || gr).FillGradRect(this.x, this.y, this.w, this.h, this.colorModeOptions.angle, color[0], color[1] || color[0]);
				}
				break;
			}
			case 'none':
			default:
				break;
		}
		if (this.colorModeOptions.bDither && this.colorImg) {
			if (bCreateImg) { this.dither(this.colorImg, grImg); }
			this.colorImg.ReleaseGraphics(grImg);
			gr.DrawImage(this.colorImg, this.x, this.y, this.w, this.h, 0, 0, this.colorImg.Width, this.colorImg.Height);
		}
		switch (this.coverMode.toLowerCase()) {
			case 'front':
			case 'back':
			case 'disc':
			case 'icon':
			case 'artist':
			case 'path': {
				this.paintImage(gr, { x: this.x, y: this.y, w: this.w, h: this.h, offsetH: this.offsetH });
				break;
			}
			case 'none':
			default:
				break;
		}
	};
	this.dither = (img, gr) => {
		const color = this.colorModeOptions.color;
		for (let i = Math.randomNum(0, 6); i < img.Height; i += Math.randomNum(0, 6)) {
			for (let j = Math.randomNum(0, 6); j < img.Width; j += Math.randomNum(0, 6)) {
				const rand = Math.randomNum(0, 50);
				gr.DrawEllipse(j + rand, i + rand, 1, 1, 1, RGBA(...toRGB(color[0]), 20));
			}
		}
		img.StackBlur(6);
		return img;
	};
	const debounced = {
		[this.timer]: debounce(window.RepaintRect, this.timer, false, window)
	};
	this.repaint = (timeout = 0) => {
		if (timeout === 0) { window.RepaintRect(this.x, this.y, this.x + this.w, this.y + this.h); }
		else {
			if (!Object.hasOwn(debounced, timeout)) { debounced[timeout] = debounce(window.RepaintRect, timeout, false, window); }
			debounced[timeout](this.x, this.y, this.x + this.w, this.y + this.h, true);
		}
	};
	this.trace = (x, y) => {
		return x > this.x && x < this.x + this.w && y > this.y && y < this.y + this.h;
	};
	this.resize = ({ x = this.x, y = this.y, w = this.w, h = this.h, bRepaint = true } = {}) => {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
		if (bRepaint) { this.repaint(); }
	};
	this.changeConfig = ({ config, bRepaint = true, callback = this.callbacks.change /* (config, arguments, callbackArgs) => void(0) */, callbackArgs = null } = {}) => {
		if (!config) { return; }
		Object.entries(config).forEach((pair) => {
			const key = pair[0];
			const value = pair[1];
			if (typeof value !== 'undefined') {
				if (value && Array.isArray(value)) {
					this[key] = [...this[key], ...value];
				} else if (value && typeof value === 'object') {
					this[key] = { ...this[key], ...value };
				} else {
					this[key] = value;
				}
			}
		});
		if (config.coverMode || config.coverModeOptions) { this.updateImageBg(true); }
		if (config.colorMode || config.colorModeOptions) { this.colorImg = null; }
		this.resize({ bRepaint });
		if (callback && isFunction(callback)) { callback.call(this, this.exportConfig(), arguments[0], callbackArgs); }
	};
	this.exportConfig = (bPosition = false) => {
		return {
			coverMode: this.coverMode,
			coverModeOptions: { ...this.coverModeOptions },
			colorMode: this.colorMode,
			colorModeOptions: { ...this.colorModeOptions },
			...(bPosition ? { x: this.x, y: this.y, w: this.w, h: this.h } : {}),
			timer: this.timer
		};
	};
	this.getColors = () => {
		switch (this.coverMode.toLowerCase()) {
			case 'front':
			case 'back':
			case 'disc':
			case 'icon':
			case 'artist':
			case 'path':
				return this.coverImg.art.image
					? this.coverImg.art.image.GetColourScheme(2)
					: [this.colorModeOptions.color[0], this.colorModeOptions.color[1] || this.colorModeOptions.color[0]];
			case 'none':
			default:
				return [this.colorModeOptions.color[0], this.colorModeOptions.color[1] || this.colorModeOptions.color[0]];
		}
	};
	this.init = () => {
		Object.entries(this.defaults()).forEach((pair) => {
			const key = pair[0];
			const value = pair[1];
			this[key] = value;
		});
		this.changeConfig({ config: arguments[0], bRepaint: false });
		this.updateImageBg();
	};
	this.colorImg = null;
	this.coverImg = { art: { path: '', image: null, colors: null }, handle: null };
	/** @type {Number} */
	this.x = this.y = this.w = this.h = 0;
	/** @type {Number} */
	this.offsetH = 0;
	/** @type {('none'|'front'|'back'|'disc'|'icon'|'artist'|'path')} */
	this.coverMode = '';
	/** @type {{ blur:Number, angle:Number, alpha:Number, path:String, bNowPlaying:Boolean, bProportions:Boolean, bFill:Boolean }} */
	this.coverModeOptions = {};
	/** @type {('single'|'gradient'|'bigradient'|'none')} */
	this.colorMode = '';
	/** @type {{ bDither:Boolean, angle:Number, color:Number[] }} */
	this.colorModeOptions = {};
	/** @type {Number} */
	this.timer = 0;
	/** @type {{ change: function(config, arguments, callbackArgs) }} */
	this.callbacks = {};

	this.init();
}