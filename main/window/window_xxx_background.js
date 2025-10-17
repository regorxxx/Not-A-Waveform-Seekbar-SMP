'use strict';
//01/10/25

/* exported _background */

include('window_xxx_helpers.js');
/* global debounce:readable, InterpolationMode:readable, RGBA:readable, toRGB:readable , isFunction:readable , _scale:readable, _resolvePath:readable */

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

	this.defaults = (bPosition = false, bCallbacks = false) => {
		return {
			...(bPosition ? { x: 0, y: 0, w: window.Width, h: window.Height } : {}),
			offsetH: _scale(1),
			timer: 60,
			coverMode: 'none', // none | front | back | disc | icon | artist | path
			coverModeOptions: { blur: 50, angle: 0, alpha: 153, path: '', bNowPlaying: true, bProportions: true, bFill: true, bCacheAlbum: true, bProcessColors: true },
			colorMode: 'none', // none | single | gradient | bigradient
			colorModeOptions: { bDither: true, angle: 91, focus: 1, color: [] },
			...(bCallbacks
				? {
					callbacks: {
						change: null, /* (config, arguments, callbackArgs) => void(0) */
						artColors: null /* (colorArray, bForced) => void(0) */,
						artColorsNotify: null /* (colorArray, bForced) => void(0) */,
					}
				}
				: {}
			)
		};
	};
	/**
	 * Updates background image based from preferred handle and calls color callbacks.
	 * @property
	 * @name updateImageBg
	 * @kind method
	 * @memberof _background
	 * @type {function}
	 * @param {Boolean} bForce - [=false]
	 * @param {Function?} onDone - [=null]
	 * @returns {void}
	 */
	this.updateImageBg = debounce((bForce = false, onDone = null, bRepaint = true) => {
		const path = _resolvePath(this.coverModeOptions.path || '');
		const bPath = this.coverMode.toLowerCase() === 'path' && path.length;
		if (this.coverMode.toLowerCase() === 'none') {
			this.coverImg.art.path = null; this.coverImg.art.image = null; this.coverImg.art.colors = null;
			this.coverImg.handle = null; this.coverImg.id = null;
		}
		if (!this.coverModeOptions.bProcessColors) { this.coverImg.art.colors = null; }
		if (this.colorMode.toLowerCase() === 'none') { this.colorImg = null; }
		const handle = (this.coverModeOptions.bNowPlaying ? fb.GetNowPlaying() : null) || fb.GetFocusItem(true);
		if (!bForce && (handle && this.coverImg.handle === handle.RawPath || this.coverImg.handle === path)) { return; }
		let id = null;
		if (this.coverModeOptions.bCacheAlbum && handle) {
			const tf = fb.TitleFormat('%ALBUM%|$directory(%PATH%,1)');
			id = tf.EvalWithMetadb(handle);
			if (!bForce && id === this.coverImg.id) {
				if (onDone && isFunction(onDone)) { onDone(this.coverImg); }
				return;
			}
		}
		const AlbumArtId = { front: 0, back: 1, disc: 2, icon: 3, artist: 4 };
		const promise = bPath
			? gdi.LoadImageAsyncV2('', path)
			: handle
				? utils.GetAlbumArtAsyncV2(void (0), handle, AlbumArtId[this.coverMode] || 0, true, false, false)
				: Promise.reject(new Error('No handle/art'));
		promise.then((result) => {
			if (bPath) {
				this.coverImg.art.image = result;
				this.coverImg.handle = this.coverImg.art.path = path;
			} else {
				if (!result.image) { throw new Error('Image not available'); }
				this.coverImg.art.image = result.image;
				this.coverImg.art.path = result.path;
				this.coverImg.handle = handle.RawPath;
				this.coverImg.id = id;
			}
			if (this.coverImg.art.image && this.coverModeOptions.bProcessColors) {
				this.coverImg.art.colors = this.coverImg.art.image.GetColourScheme(6);
			}
			if (this.coverImg.art.image && this.coverModeOptions.blur !== 0 && Number.isInteger(this.coverModeOptions.blur)) {
				this.coverImg.art.image.StackBlur(this.coverModeOptions.blur);
			}
		}).catch(() => {
			this.coverImg.art.path = null; this.coverImg.art.image = null; this.coverImg.art.colors = null;
			this.coverImg.handle = null; this.coverImg.id = null;
		}).finally(() => {
			if (this.callbacks.artColors) {
				this.callbacks.artColors(this.coverImg.art.colors ? [...this.coverImg.art.colors] : null, void(0), bRepaint);
			}
			if (this.callbacks.artColorsNotify) {
				this.callbacks.artColorsNotify(this.coverImg.art.colors ? [...this.coverImg.art.colors] : null);
			}
			if (bRepaint) { this.repaint(); }
			if (onDone && isFunction(onDone)) { onDone(this.coverImg); }
		});
	}, 250);

	this.paintImage = (gr, limits = { x, y, w, h, offsetH }, fill = null /* {transparency: 20} */) => { // NOSONAR
		if (this.coverImg.art.image) {
			gr.SetInterpolationMode(InterpolationMode.InterpolationModeBilinear);
			const img = this.coverImg.art.image;
			if (fill) {
				gr.DrawImage(img, limits.x, limits.y, limits.w, limits.h, 0, img.Height / 2, Math.min(img.Width, limits.w), Math.min(img.Height, limits.h), this.coverModeOptions.angle, fill.transparency);
			} else {
				if (this.coverModeOptions.bFill) { // NOSONAR
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
		if (this.w <= 1 || this.h <= 1) { return; }
		const colorMode = this.colorMode.toLowerCase();
		let grImg, bCreateImg;
		if (this.colorModeOptions.bDither && !['single', 'none'].includes(colorMode)) {
			if (!this.colorImg || this.colorImg.Width !== this.w || this.colorImg.Height !== this.h) { this.colorImg = gdi.CreateImage(this.w, this.h); bCreateImg = true; }
			grImg = this.colorImg.GetGraphics();
		}
		const color = this.colorModeOptions.color;
		switch (colorMode) {
			case 'single': {
				gr.FillSolidRect(this.x, this.y, this.w, this.h, color[0]);
				break;
			}
			case 'bigradient': {
				if (bCreateImg || !this.colorModeOptions.bDither) {
					(grImg || gr).FillGradRect(this.x, this.y, this.w, this.h / 2, Math.abs(360 - this.colorModeOptions.angle), color[0], color[1] || color[0], this.colorModeOptions.focus);
					(grImg || gr).FillGradRect(this.x, this.h / 2, this.w, this.h / 2, this.colorModeOptions.angle, color[0], color[1] || color[0], this.colorModeOptions.focus);
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
		const color1 = RGBA(...toRGB(this.colorModeOptions.color[0]), 20);
		const color2 = RGBA(...toRGB(this.colorModeOptions.color[1]), 10);
		const scale = Math.round(img.Height / 300);
		let rand;
		for (let i = Math.randomNum(0, 6); i < img.Height; i += Math.randomNum(0, 6)) {
			for (let j = Math.randomNum(0, 6); j < img.Width; j += Math.randomNum(0, 6)) {
				rand = Math.randomNum(0, 50);
				gr.DrawEllipse(j + rand, i + rand, 1, 1, scale, color1);
				rand = Math.randomNum(0, 50);
				gr.DrawEllipse(j - rand, i - rand, 1, 1, scale, color2);
			}
		}
		img.StackBlur(scale * 2);
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
	this.getArtColors = () => {
		return this.coverMode.toLowerCase() === 'none'
			? null
			: this.coverImg.art.image ? [...this.coverImg.art.colors] : null;
	};
	this.getColors = () => {
		if (['front', 'back', 'disc', 'icon', 'artist', 'path'].includes(this.coverMode.toLowerCase())) {
			if (this.coverImg.art.colors && this.coverImg.art.colors.length && this.coverModeOptions.alpha !== 0) {
				return this.coverImg.art.colors.slice(0, 2);
			}
		}
		return this.colorModeOptions.color.filter(Boolean).length
			? [
				this.colorModeOptions.color[0],
				this.colorModeOptions.color[1] || this.colorModeOptions.color[0]
			]
			: [-1, -1].fill(
				window.InstanceType === 0 ? window.GetColourCUI(1) : window.GetColourDUI(1)
			);
	};
	/** @type {boolean} */
	this.useCover;
	Object.defineProperty(this, 'useCover', {
		enumerable: true,
		configurable: false,
		get: () => this.coverMode.toLowerCase() !== 'none'
	});
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
	this.coverImg = { art: { path: '', image: null, colors: null }, handle: null, id: null };
	/** @type {Number} */
	this.x = this.y = this.w = this.h = 0;
	/** @type {Number} */
	this.offsetH = 0;
	/** @type {('none'|'front'|'back'|'disc'|'icon'|'artist'|'path')} */
	this.coverMode = '';
	/** @type {{ blur:Number, angle:Number, alpha:Number, path:String, bNowPlaying:Boolean, bProportions:Boolean, bFill:Boolean, bProcessColors:Boolean }} */
	this.coverModeOptions = {};
	/** @type {('single'|'gradient'|'bigradient'|'none')} */
	this.colorMode = '';
	/** @type {{ bDither:Boolean, angle:Number, focus:Number, color:Number[] }} */
	this.colorModeOptions = {};
	/** @type {Number} */
	this.timer = 0;
	/** @type {{ change: function(config, arguments, callbackArgs), artColors: function(colorArray, bForced, bRepaint), artColorsNotify: function(colorArray, bForced) }} */
	this.callbacks = {};

	this.init();
}