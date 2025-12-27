'use strict';
//27/12/25

/* exported _background */

include('window_xxx_helpers.js');
/* global debounce:readable, InterpolationMode:readable, RGBA:readable, toRGB:readable , isFunction:readable , _scale:readable, _resolvePath:readable, applyAsMask:readable */

/**
 * Background for panel with different cover options
 *
 * @class
 * @name _background
 * @param {{ x: number, y: number, w: number, h: number, offsetH?: number, coverMode: coverMode, coverModeOptions: coverModeOptions, colorMode: colorMode, colorModeOptions: colorModeOptions, timer: number, callbacks: callbacks }} { x, y, w, h, offsetH, coverMode, coverModeOptions, colorMode, colorModeOptions, timer, callbacks, }?
 */
function _background({
	x, y, w, h,
	offsetH = _scale(1),
	/* eslint-disable no-unused-vars */
	coverMode, coverModeOptions,
	colorMode, colorModeOptions,
	timer,
	callbacks
	/* eslint-enable no-unused-vars */
} = {}) {
	/**
	 * Updates background image based from preferred handle and calls color callbacks.
	 * @property
	 * @name updateImageBg
	 * @kind method
	 * @memberof _background
	 * @type {function}
	 * @param {Boolean} bForce - [=false]
	 * @param {Function?} onDone - [=null]
	 * @returns {_background['defaults']}
	 */
	this.defaults = _background.defaults;
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
		if (!this.useCover) {
			this.coverImg.art.path = null; this.coverImg.art.image = null; this.coverImg.art.colors = null;
			this.coverImg.handle = null; this.coverImg.id = null;
		}
		if (!this.coverModeOptions.bProcessColors) { this.coverImg.art.colors = null; }
		if (!this.useColors) { this.colorImg = null; }
		if (!this.useCover) { return; }
		const handle = (this.coverModeOptions.bNowPlaying ? fb.GetNowPlaying() : null)
			|| (this.coverModeOptions.bNowPlaying && this.coverModeOptions.bNoSelection ? null : fb.GetFocusItem(true));
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
			if (this.coverModeOptions.alpha > 0) {
				if (this.coverImg.art.image && this.coverModeOptions.blur !== 0 && Number.isInteger(this.coverModeOptions.blur)) {
					if (this.coverModeOptions.bCircularBlur) {
						this.coverImg.art.image.StackBlur(Math.max(this.coverModeOptions.blur / 5, 1));
						applyAsMask(
							this.coverImg.art.image,
							(img) => img.StackBlur(this.coverModeOptions.blur),
							(mask, gr, w, h) => { gr.FillEllipse(w / 4, h / 4, w / 2, h / 2, 0xFFFFFFFF); mask.StackBlur(w / 10); },
						);
					} else {
						this.coverImg.art.image.StackBlur(this.coverModeOptions.blur);
					}
				}
			}
		}).catch(() => {
			this.coverImg.art.path = null; this.coverImg.art.image = null; this.coverImg.art.colors = null;
			this.coverImg.handle = null; this.coverImg.id = null;
		}).finally(() => {
			this.applyArtColors(bRepaint);
			this.notifyArtColors();
			if (bRepaint) { this.repaint(); }
			if (onDone && isFunction(onDone)) { onDone(this.coverImg); }
		});
	}, 250);
	/**
	 * Changes panel config
	 * @property
	 * @name paintImage
	 * @kind method
	 * @memberof _background
	 * @param {GdiGraphics} gr - From on_paint
	 * @param {{x?:number, y?:number, w?:number, h?:number, offsetH?:number}} limits - Drawing coordinates
	 * @param {{transparency:number}|null} fill - Used for panel filling instead of internal settings
	 * @returns {void}
	 */
	this.paintImage = (gr, limits = { x, y, w, h, offsetH }, fill = null) => {
		if (this.coverImg.art.image && this.coverModeOptions.alpha > 0) {
			gr.SetInterpolationMode(InterpolationMode.InterpolationModeBilinear);
			const img = this.coverImg.art.image;
			if (fill) {
				gr.DrawImage(img, limits.x, limits.y, limits.w, limits.h, 0, img.Height / 2, Math.min(img.Width, limits.w), Math.min(img.Height, limits.h), this.coverModeOptions.angle, fill.transparency);
			} else {
				const zoomX = this.coverModeOptions.zoom > 0
					? Math.max(Math.min(this.coverModeOptions.zoom / 100, 0.99), 0) * img.Width / 2
					: 0;
				const zoomY = this.coverModeOptions.zoom > 0
					? Math.max(Math.min(this.coverModeOptions.zoom / 100, 0.99), 0) * img.Height / 2
					: 0;
				if (this.coverModeOptions.bFill) { // NOSONAR
					if (this.coverModeOptions.bProportions) {
						switch ((this.coverModeOptions.fillCrop || '').toLowerCase()) {
							case 'top': {
								const prop = limits.w / (limits.h - limits.offsetH);
								const imgProp = img.Width / img.Height;
								if (imgProp < prop) {
									gr.DrawImage(img, limits.x, limits.y, limits.w, limits.h,
										zoomX,
										zoomY / prop,
										img.Width - zoomX * 2,
										(img.Width - zoomY * 2) / prop,
										this.coverModeOptions.angle, this.coverModeOptions.alpha
									);
								} else {
									gr.DrawImage(img, limits.x, limits.y, limits.w, limits.h,
										img.Width * (1 - prop) / 2 + zoomX * prop,
										zoomY,
										(img.Width - zoomX * 2) * prop,
										img.Height - zoomY * 2,
										this.coverModeOptions.angle, this.coverModeOptions.alpha
									);
								}
								break;
							}
							case 'bottom': {
								const prop = limits.w / (limits.h - limits.offsetH);
								const imgProp = img.Width / img.Height;
								if (imgProp < prop) {
									gr.DrawImage(img, limits.x, limits.y, limits.w, limits.h,
										zoomX,
										img.Width * (1 - 1 / prop) + zoomY / prop,
										img.Width - zoomX * 2,
										(img.Width - zoomY * 2) / prop,
										this.coverModeOptions.angle, this.coverModeOptions.alpha
									);
								} else {
									gr.DrawImage(img, limits.x, limits.y, limits.w, limits.h,
										img.Width * (1 - prop) / 2 + zoomX * prop,
										zoomY,
										(img.Width - zoomX * 2) * prop,
										img.Height - zoomY * 2,
										this.coverModeOptions.angle, this.coverModeOptions.alpha
									);
								}
								break;
							}
							case 'center':
							default: {
								const prop = limits.w / (limits.h - limits.offsetH);
								if (prop > 1) {
									const offsetY = (img.Height - zoomY * 2) / prop;
									gr.DrawImage(img, limits.x, limits.y, limits.w, limits.h,
										zoomX,
										(img.Height - offsetY) / 2,
										img.Width - zoomX * 2,
										offsetY,
										this.coverModeOptions.angle, this.coverModeOptions.alpha
									);
								} else {
									const offsetX = (img.Width - zoomX * 2) * prop;
									gr.DrawImage(img, limits.x, limits.y, limits.w, limits.h,
										(img.Width - offsetX) / 2,
										zoomY,
										offsetX,
										img.Height - zoomY * 2,
										this.coverModeOptions.angle, this.coverModeOptions.alpha
									);
								}
							}
						}
					} else {
						gr.DrawImage(img, limits.x, limits.y, limits.w, limits.h, zoomX, zoomY, img.Width - zoomX * 2, img.Height - zoomY * 2, this.coverModeOptions.angle, this.coverModeOptions.alpha);
					}
				} else {
					let w, h;
					if (this.coverModeOptions.bProportions) { w = h = Math.min(limits.w, limits.h - limits.offsetH); }
					else { [w, h] = [limits.w, limits.h]; }
					gr.DrawImage(img,
						(limits.w - w) / 2,
						Math.max((limits.h - limits.y - h) / 2 + limits.y, limits.y),
						w,
						h,
						zoomX, zoomY, img.Width - zoomX * 2, img.Height - zoomY * 2, this.coverModeOptions.angle, this.coverModeOptions.alpha
					);
				}
			}
			gr.SetInterpolationMode(InterpolationMode.Default);
		}
	};
	/**
	 * Panel painting
	 * @property
	 * @name paintImage
	 * @kind method
	 * @memberof _background
	 * @param {GdiGraphics} gr - From on_paint
	 * @returns {void}
	 */
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
	/**
	 * Color image dithering
	 * @property
	 * @name dither
	 * @kind method
	 * @memberof _background
	 * @param {GdiBitmap} img - Color image
	 * @param {GdiGraphics} gr - From on_paint
	 * @returns {GdiBitmap}
	 */
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
	/**
	 * Helper for debounced repainting
	 *
	 * @constant
	 * @name debounced
	 * @kind variable
	 * @private
	 * @memberof _background.constructor
	 * @type {{ [key:number]: (x:number, y:number, w:number, h:number, bForce:boolean) => void }}
	 */
	const debounced = {
		[this.timer]: debounce(window.RepaintRect, this.timer, false, window)
	};
	/**
	 * Panel repainting (debounced)
	 * @property
	 * @name repaint
	 * @kind method
	 * @memberof _background
	 * @param {number} timeout - [=0] If >0 it's debounced
	 * @returns {void}
	 */
	this.repaint = (timeout = 0) => {
		if (timeout === 0) { window.RepaintRect(this.x, this.y, this.x + this.w, this.y + this.h); }
		else {
			if (!Object.hasOwn(debounced, timeout)) { debounced[timeout] = debounce(window.RepaintRect, timeout, false, window); }
			debounced[timeout](this.x, this.y, this.x + this.w, this.y + this.h, true);
		}
	};
	/**
	 * Panel mouse tracing
	 * @property
	 * @name trace
	 * @kind method
	 * @memberof _background
	 * @param {number} x
	 * @param {number} y
	 * @returns {Boolean}
	 */
	this.trace = (x, y) => {
		return x > this.x && x < this.x + this.w && y > this.y && y < this.y + this.h;
	};
	/**
	 * Panel resizing
	 * @property
	 * @name resize
	 * @kind method
	 * @memberof _background
	 * @param {{ x?: number, y?: number, w?:number, h?:number, bRepaint?:boolean }}
	 * @returns {void}
	 */
	this.resize = ({ x = this.x, y = this.y, w = this.w, h = this.h, bRepaint = true } = {}) => {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
		if (bRepaint) { this.repaint(); }
	};
	/**
	 * Change panel config and call .change callback if provided to save to properties
	 *
	 * @method
	 * @name changeConfig
	 * @kind variable
	 * @memberof _background
	 * @type {{ config?: { x: number, y: number, w: number, h: number, offsetH?: number, coverMode: coverMode, coverModeOptions: coverModeOptions, colorMode: colorMode, colorModeOptions: colorModeOptions, timer: number, callbacks: callbacks }, bRepaint?: boolean, callback?: (config, arguments, callbackArgs) => void, callbackArgs? }}
	 * @returns {void}
	 */
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
	/**
	 * Gets panel settings ready to be saved as properties
	 * @property
	 * @name exportConfig
	 * @kind method
	 * @param {boolean} bPosition - Flag to include panel position
	 * @memberof _background
	 * @returns {{coverMode: coverMode, coverModeOptions: coverModeOptions, colorMode: colorMode, x?:number, y?:number, w?:number, h?:number, offsetH?:number, timer: number }}
	 */
	this.exportConfig = (bPosition = false) => {
		return {
			coverMode: this.coverMode,
			coverModeOptions: { ...this.coverModeOptions },
			colorMode: this.colorMode,
			colorModeOptions: { ...this.colorModeOptions },
			...(bPosition ? { x: this.x, y: this.y, w: this.w, h: this.h, offsetH: this.offsetH } : {}),
			timer: this.timer
		};
	};
	/**
	 * Gets all art colors from panel if available
	 * @property
	 * @name getArtColors
	 * @kind method
	 * @memberof _background
	 * @returns {number[]|null}
	 */
	this.getArtColors = () => {
		return !this.useCover
			? null
			: this.coverImg.art.image ? [...this.coverImg.art.colors] : null;
	};
	/**
	 * Gets the 2 main colors from panel (either art or color settings)
	 * @property
	 * @name getColors
	 * @kind method
	 * @memberof _background
	 * @returns {[number, number]}
	 */
	this.getColors = () => {
		if (this.useCover && this.coverImg.art.colors && this.coverImg.art.colors.length) {
			return this.coverImg.art.colors.slice(0, 2);
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
	/**
	 * Called when colors are extracted from art, to apply colors to other elements within panel
	 * @property
	 * @name applyArtColors
	 * @kind method
	 * @memberof _background
	 * @returns {void}
	 */
	this.applyArtColors = (bRepaint) => {
		if (!this.callbacks.artColors) { return false; }
		this.callbacks.artColors(this.coverImg.art.colors ? [...this.coverImg.art.colors] : null, void (0), bRepaint);
	};
	/**
	 * Called when colors are extracted from art, to use as color server
	 * @property
	 * @name notifyArtColors
	 * @kind method
	 * @memberof _background
	 * @returns {void}
	 */
	this.notifyArtColors = () => {
		if (!this.callbacks.artColorsNotify) { return false; }
		return this.callbacks.artColorsNotify(this.coverImg.art.colors ? [...this.coverImg.art.colors] : null);
	};
	/** @type {boolean} */
	this.useColors;
	Object.defineProperty(this, 'useColors', {
		enumerable: true,
		configurable: false,
		get: () => this.colorMode.toLowerCase() !== 'none'
	});
	/** @type {boolean} - Flag which indicates wether panel is using any art or not  */
	this.useCover;
	Object.defineProperty(this, 'useCover', {
		enumerable: true,
		configurable: false,
		get: () => this.coverMode.toLowerCase() !== 'none'
	});
	/** @type {boolean} - Flag which indicates if panel is using any art and also if it's visible */
	this.showCover;
	Object.defineProperty(this, 'showCover', {
		enumerable: true,
		configurable: false,
		get: () => this.useCover && this.coverModeOptions.alpha > 0
	});
	/**
	 * Panel init.
	 * @property
	 * @name init
	 * @kind method
	 * @memberof _background
	 * @returns {void}
	 */
	this.init = () => {
		Object.entries(this.defaults()).forEach((pair) => {
			const key = pair[0];
			const value = pair[1];
			this[key] = value;
		});
		this.changeConfig({ config: arguments[0], bRepaint: false });
		this.updateImageBg();
	};
	/** @type {Number} - Image for internal use. Drawing colors */
	this.colorImg = null;
	/** @type {{ art: { path: string, image: GdiBitmap|null, colors: number[]|null }, handle: FbMetadbHandle|null, id: string|null }} - Img properties */
	this.coverImg = { art: { path: '', image: null, colors: null }, handle: null, id: null };
	/** @type {Number} - Panel position */
	this.x = this.y = this.w = this.h = 0;
	/** @type {Number} - Height margin for image drawing */
	this.offsetH = 0;
	/**
	 * @typedef {'none'|'front'|'back'|'disc'|'icon'|'artist'|'path'} coverMode - Available art modes
	 */
	/** @type {coverMode} - Art type used by panel */
	this.coverMode = '';
	/**
	 * @typedef {object} coverModeOptions - Art settings
	 * @property {number} blur - Blur effect in px
	 * @property {number} angle - Image angle drawing (0-360)
	 * @property {number} alpha - Image transparency (0-100)
	 * @property {String} path - Img path for 'path' coverMode
	 * @property {boolean} bNowPlaying - Follow now playing
	 * @property {boolean} bNoSelection - Skip updates on selection changes
	 * @property {boolean} bProportions - Maintain art proportions
	 * @property {boolean} bFill - Fill panel
	 * @property {string} fillCrop - Fill panel mode
	 * @property {number} zoom - Image zoom (0-100)
	 * @property {boolean} bProcessColors - Process art colors (required as color server)
	 */
	/** @type {coverModeOptions} - Panel art settings */
	this.coverModeOptions = {};
	/**
	 * @typedef {'single'|'gradient'|'bigradient'|'none'} colorMode - Available color modes
	 */
	/** @type {colorMode} - Color type used by panel */
	this.colorMode = '';
	/**
	 * @typedef {object} colorModeOptions - Art settings
	 * @property {Boolean} bDither - Flag to apply dither effect
	 * @property {number} angle - Gradient angle (0-360)
	 * @property {number} focus - Gradient focus (0-1)
	 * @property {[Number, Number]} color - Array of colors (at least 2 required for gradient usage)
	 */
	/** @type {colorModeOptions} - Color settings */
	this.colorModeOptions = {};
	/** @type {Number} - Repainting max refresh rate */
	this.timer = 0;
	/**
	 * @typedef {object} callbacks - Callbacks for third party integration
	 * @property {(config, arguments, callbackArgs) => void} change - Called on config changes
	 * @property {(colorArray:num[], bForced:boolean, bRepaint:boolean) => void} artColors - Called when colors are extracted from art, to apply colors to other elements within panel
	 * @property {(colorArray:num[], bForced:boolean) => void} artColorsNotify - Called when colors are extracted from art, to use as color server
	 */
	/** @type {callbacks} - Callbacks for third party integration */
	this.callbacks = {};

	this.init();
}

_background.defaults = (bPosition = false, bCallbacks = false) => {
	return {
		...(bPosition ? { x: 0, y: 0, w: window.Width, h: window.Height } : {}),
		offsetH: _scale(1),
		timer: 60,
		coverMode: 'front', // none | front | back | disc | icon | artist | path
		coverModeOptions: { blur: 90, bCircularBlur: false, angle: 0, alpha: 85, path: '', bNowPlaying: true, bNoSelection: false, bProportions: true, bFill: true, fillCrop: 'auto', zoom: 0, bCacheAlbum: true, bProcessColors: true },
		colorMode: 'bigradient', // none | single | gradient | bigradient
		colorModeOptions: { bDither: true, angle: 91, focus: 1, color: [0xff2e2e2e, 0xff212121] }, // RGB(45,45,45), RGB(33,33,33)
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