'use strict';
//08/05/23

/* 
	Window panel helper (+built-in options) v 0.1
	- Theme ('default', 'material', tabWidth ('full', text') behavior, data resizing and autosaving may be set at init.
	- Properties may be passed to the window to be used as data container.
	- '.save()' and '.load()' methods may be overwritten to manage properties saving/loading; either manually or automatically (autosave).
	- Use '.addTab()' to add a new tab: it may be either an embedded object or the buil-in options window (which uses passed data): 
		{title, columns, color, data, object, description}
	- Data has this structure: 
		[
			{title, subTitle, values: [{name, value, pId, pIdx, mode, list}]}
		]
	- value.mode: 'value' (input box), 'check' (tick box), 'toggleControl' (themed check box), 'checkGroup' (vinculated check boxes), 'list' (dropdown list), 'colorPicker'
	- Except name, all the values properties are optional. Either 'value' or 'pId' and 'pIdx' must be provided.
	- If no mode is specified, checks if value is a Boolean (check mode), has a list property and it's an array (list mode) any other thing (value mode).
	- If no property id is specified, value is updated reading from properties object while painting current tab. Therefore properties must be updated before showing the options window!
	- If property idx is specified the value is get from the properties object by key, considering it's an array. -> {value1: ['This is a description, 10]} -> 10
	- If no property idx is specified the value is get from the properties object directly by key. -> {value1: 10} -> 10
	- List of updated values of options panel must be saved after closing the options window. Take the properties object and save it to the properties panel, json, or whatever... for permanent storage.
	
	TODO:
		- Dropdown list without buttons
 */

include(fb.ComponentPath + 'docs\\Codepages.js');
include('window_xxx_helpers.js');
include('window_xxx_input.js');
include('..\\..\\helpers\\menu_xxx.js');

function _window({width = window.Width , height = window.Height, tabWidth = 'FULL', UI = 'MATERIAL', properties = {}, bFitData = true, bAutoSave = false, x = 0, y = 0} = {}) {
	const tooltip = new _tt('');
	let tabs = [];
	let tabsCopy = [];
	const tabsWidthMethod = {
		full: () => {return (tabs.length ? this.width  / tabs.length : 0);}, // Tabs occupy full width
		text: (tab) => {  // Tabs occupy text width unless it would result on no having space for all tabs
			const textWidth = (_gr.CalcTextWidth(tab.title, this.gFont) + 30);
			return (textWidth * tabs.length > this.width ? tabsWidthMethod.full() : textWidth);
		},
	}
	const UIMethod = {
		material: () => {
			this.panelColor = 0xF0F0F00; // Light grey
			this.tabColor = 0xFF808080; // Grey
			this.textTabColor = 0xFF000000; // Black
			this.currTabColor = 0xFF4354AF; // Blue
			// Tabs data
			this.tabsColumnColor = 0xFFFFFFFF; // White
			this.textColor = this.textTabColor;
			this.inputBgColor = this.tabsColumnColor;
			this.toggleColor = this.currTabColor;
			this.colorPickerHover = this.toggleColor;
		},
		default: () => {
			this.panelColor = 0xFFcbc5c5; // Grey tinted (r)
			this.tabColor = 0xFF808080; // Dark grey
			this.textTabColor = 0xFFFFFFFF; // White
			this.currTabColor = 0xFF4354AF; // Blue	
			// Tabs data
			this.tabsColumnColor = 0xFF000000; // Black
			this.textColor = this.tabsColumnColor;
			this.inputBgColor = this.textTabColor;
			this.toggleColor = 0xFFd75f00; // Orange
			this.colorPickerHover = null; // Use color from picker
		},
	}
	
	this.properties = properties;
	this.fontSize = typeof this.properties.fontSize !== 'undefined' ? this.properties.fontSize[1] : _scale(10);
	this.gFont = _gdiFont('Segoe UI', this.fontSize);
	this.tabWidth = tabWidth.toLowerCase();
	this.tabsWidth = tabsWidthMethod[this.tabWidth];
	this.UI = UI.toLowerCase();
	UIMethod[this.UI]();
	this.tabsHeight = () => {return 30;}
	this.tabsColumnWidth = 1;
	this.numTabs = () => {return tabs.length;}
	this.tabIdx = 0;
	this.width  = width;
	this.height = height;
	this.x = x;
	this.y = y;
	// Tabs data
	this.titleFont = _gdiFont('Segoe UI', this.fontSize + 4, FontStyle.Bold);
	this.subTitleFont = _gdiFont('Segoe UI', this.fontSize + 2, FontStyle.Bold);
	this.valueFont = this.gFont;
	this.bFitData = bFitData;
	let bFitOnce = false; // Do it once before painting
	this.bAutoSave = bAutoSave;
	
	// Paint
	this.repaint = () => {
		window.Repaint();
	}
	
	this.paintBg = (gr, x, y) => {
		gr.FillSolidRect(x, y, this.width, this.height, this.panelColor);
	}
	
	this.paintTabs = (gr, x, y) => {
		const num = this.numTabs();
		const height = this.tabsHeight();
		let widthSum = x;
		if (this.UI === 'default') {
			gr.FillSolidRect(x , y, this.width , height, this.panelColor);
			for (let i = 0; i < num; i++) {
				const width  = this.tabsWidth(tabs[i]);
				gr.FillSolidRect(widthSum, y, width, height, (this.tabIdx === i ? this.currTabColor : tabs[i].color));
				if (this.tabIdx !== i) {
					gr.DrawRect(widthSum, y, width, height - 1, 1, 0xFF000000);
				}
				gr.DrawLine(widthSum, y, widthSum + width, y, 1, 0xFF000000);
				gr.DrawLine(widthSum, y, widthSum, height - 1, 1, 0xFF000000);
				gr.DrawLine(widthSum + width, y, widthSum + width, height - 1, 1, 0xFF000000);
				// When the full titles can not be drawn the tab width method defaults to full, titles are cut in length and aligned to the left
				if (gr.CalcTextWidth(tabs[i].title, this.gFont) > width) {
					gr.GdiDrawText(tabs[i].title.substr(0,6) + '...', this.gFont, this.textTabColor , widthSum + 1, y, width, height, DT_LEFT|DT_VCENTER|DT_CALCRECT|DT_NOPREFIX);
				} else {
					gr.GdiDrawText(tabs[i].title, this.gFont, this.textTabColor , widthSum, y, width, height, DT_VCENTER|DT_CENTER|DT_CALCRECT|DT_NOPREFIX);
				}
				widthSum += width;
			}
			gr.DrawLine(x, y + height, this.width, y + height, 1, blendColors(this.tabColor, 0xFFFFFFFF, 0.5));
		} else if (this.UI === 'material') {
			gr.DrawLine(x, y + height, this.width, y + height, 1, blendColors(this.tabColor, 0xFFFFFFFF, 0.5));
			for (let i = 0; i < num; i++) {
				const width  = this.tabsWidth(tabs[i]);
				if (this.tabIdx === i) {gr.DrawLine(i * width, y + height, widthSum + width, y + height, 3, this.currTabColor);}
				// When the full titles can not be drawn the tab width method defaults to full, titles are cut in length and aligned to the left
				if (gr.CalcTextWidth(tabs[i].title, this.gFont) > width) {
					gr.GdiDrawText(tabs[i].title.substr(0,6) + '...', this.gFont, (this.tabIdx === i ? this.textTabColor : tabs[i].color) , widthSum + 1, y, width, height, DT_LEFT|DT_VCENTER|DT_CALCRECT|DT_NOPREFIX);
				} else {
					gr.GdiDrawText(tabs[i].title, this.gFont, (this.tabIdx === i ? this.textTabColor : tabs[i].color) , widthSum, y, width, height, DT_VCENTER|DT_CENTER|DT_CALCRECT|DT_NOPREFIX);
				}
				widthSum += width;
			}
		}
	}
	
	this.paintCurrent = (gr, x , y) => {
		const bAlignL = true;
		if (this.tabIdx >= tabs.length) {this.tabIdx = tabs.length - 1}; // Resizing and moving data to tabs may lead to a situation where the last idx makes no sense
		const tab = tabs[this.tabIdx];
		if (tab.object) {
			if (tab.object.hasOwnProperty('paint')) {tab.object.paint(gr);}
			else if (tab.object.hasOwnProperty('draw')) {tab.object.draw(gr);}
			else {fb.ShowPopupMessage('Tab does not have \'.paint\' or \'.draw\' methods: ' + tab.title);}
		} else {
			const columnOffset = 20;
			const columnWidth = this.width / tab.columns;
			const columnWidthDraw = columnWidth - columnOffset;
			const tabulation = columnWidth / this.fontSize;
			for (let i = 0; i < tab.columns; i++) {
				if (this.UI === 'default') {
					if (i) {gr.DrawRect(x + i * columnWidth, y + this.tabsHeight() + this.tabsColumnWidth, 1, this.height, this.tabsColumnWidth, this.tabsColumnColor)}
				} else if (this.UI === 'material') {
					if (i) {gr.DrawRect(x + i * columnWidth, y + this.tabsHeight() + this.tabsColumnWidth, 1, this.height, this.tabsColumnWidth, this.tabsColumnColor)}
				}
				let currY = this.tabsHeight() + 10 + y;
				const columnData = tab.data[i];
				const currX = i * columnWidth + columnOffset + x;
				if (columnData && columnData.length) {
					let maxW = 0;
					// First estimation for all data (used for the input boxes max width)
					columnData.forEach((data) => {
						if (data.values && data.values.length) {
							data.values.forEach((value) => {
								const textWidth = gr.CalcTextWidth(value.name, this.valueFont);
								maxW = Math.max(maxW, currX + textWidth);
							});
						}
					});
					// Paint each value
					columnData.forEach((data) => {
							if (data.title) {
								gr.GdiDrawText(data.title, this.titleFont, 0xFF0066CC, currX, currY, columnWidthDraw - columnOffset, this.height, DT_NOPREFIX);
								currY += gr.CalcTextHeight(data.title, this.titleFont) + 10;
							}
							if (data.subTitle) {
								gr.GdiDrawText(data.subTitle, this.subTitleFont, this.textColor, currX, currY, columnWidthDraw - columnOffset, this.height, DT_NOPREFIX);
								currY += gr.CalcTextHeight(data.subTitle, this.subTitleFont) + 5;
							}
							if (data.values && data.values.length) {
								data.values.forEach((value) => {
									// Draw text
									const textWidth = gr.CalcTextWidth(value.name, this.valueFont);
									const textHeight = gr.CalcTextHeight(value.name, this.valueFont);
									if (!bAlignL) {gr.GdiDrawText(value.name, this.valueFont, this.textColor, currX, currY, columnWidthDraw - columnOffset, this.height, DT_NOPREFIX);}
									let currW = 0;
									let currOffsetX = 0;
									let currOffsetY = 0;
									this.loadData(value);
									if (typeof value.value === 'undefined') {throw new Error('value.value is undefined\n' + JSON.stringify(value));}
									// These 3 modes may be enabled by value type only if no mode is specified
									// Checkboxes -> Booleans
									if (value.mode === 'check' || !value.hasOwnProperty('mode') && typeof value.value === 'boolean') {
										if (!value.hasOwnProperty('mode')) {value.mode = 'check';}
										if (!value.hasOwnProperty('checkFunc')) {
											value.checkFunc = new _check({x: currX + textWidth + 10, y: currY, size: this.fontSize * 1.2, value: value.value, color: this.toggleColor});
										}
										value.checkFunc.x = bAlignL ? currX : currX + textWidth + 10;
										value.checkFunc.y = currY;
										value.checkFunc.w = columnWidth * (i + 1) - value.checkFunc.x - columnOffset;
										value.checkFunc.paint(gr);
										currW = value.checkFunc.x + 10 + value.checkFunc.size;
									}
									// Dropdown list -> Arrays
									else if (value.mode === 'list' || !value.hasOwnProperty('mode') && value.hasOwnProperty('list') && Array.isArray(value.list)) {
										currY += bAlignL ? 0 : textHeight + 3;
										if (!value.hasOwnProperty('mode')) {value.mode = 'list';}
										if (!value.hasOwnProperty('value')) {value.value = value.list[0];}
										if (!value.hasOwnProperty('listFunc')) {
											const button = new _buttonList(currX, currY, gr.CalcTextWidth(value.value, this.valueFont) + 50, gr.CalcTextHeight(value.value, this.valueFont) + 5, value.value, function () {
													const menu = new _menu();
													const options = Array(value.list.length);
													value.list.forEach((item, i) => {
														const padWidth = _gr.CalcTextWidth(' ',_gdiFont('Arial', _scale(11))); 
														const count = this.w / padWidth; 
														// const padText = ' '.repeat(count / 2);
														let padText = ' '.repeat(count / 2);
														let entryText = padText + item + padText;
														let diff = _gr.CalcTextWidth(entryText, _gdiFont('Arial', _scale(11))) - this.w;
														while (Math.abs(diff) > padWidth) {
															if (diff > 0) {padText = padText.substr(1);}
															else {padText += ' ';}
															entryText = padText + item + padText;
															diff = _gr.CalcTextWidth(entryText, _gdiFont('Arial', _scale(11))) - this.w;
														}
														options[i] = entryText;
														menu.newEntry({entryText, func: () => {this.text = item;}});
													});
													menu.newCheckMenu(menu.getMainMenuName(), options[0], options[options.length - 1], () => {
														return value.list.indexOf(value.value);
													});
													menu.btn_up(this.x, this.y + this.h, void(0), void(0), void(0), void(0), TPM_TOPALIGN);
													return true;
												}, this.valueFont, value.tt || value.value, '\u25BC', this.valueFont);
											value.listFunc = button;
										}
										value.listFunc.text = value.value;
										value.listFunc.x =  bAlignL ? currX + textWidth + 7 : currX;
										value.listFunc.y = currY ;
										value.listFunc.w = Math.min(columnWidth * (i + 1) - value.listFunc.x - columnOffset + 3, Math.max(window.Width / 2 - value.listFunc.x - columnOffset, maxW - currX) + 4);
										value.listFunc.paint(gr);
										currY += 2;
										currW = currX;
									}
									// Input -> Any other value
									else if (value.mode === 'value' || !value.hasOwnProperty('mode')) {
										if (!value.hasOwnProperty('mode')) {value.mode = 'value';}
										const valWidth = gr.CalcTextWidth(value.value, this.valueFont);
										const valBgWidth = valWidth + 10;
										const xVal = currX + textWidth + 10;
										const offset = bAlignL ? 1 : xVal / tabulation >> 0;
										if (!value.hasOwnProperty('valueFunc')) {
											value.valueFunc = new _inputbox(bAlignL ? xVal : columnWidthDraw - (offset + 1) * tabulation, textHeight + 2, value.value.toString(), '', this.textColor, this.inputBgColor, this.tabColor, this.currTabColor, null, this);
										}
										value.valueFunc.x = bAlignL ? xVal : (offset + 1) * tabulation;
										value.valueFunc.w = Math.min(columnWidth * (i + 1) - value.valueFunc.x - columnOffset, Math.max(window.Width / 2 - value.valueFunc.x - columnOffset, maxW - xVal));
										value.valueFunc.paint(gr, value.valueFunc.x, currY);
										currW = currX;
									}
									// These are modes which require to be explicitly set
									// Vinculated checkboxes -> Groups the entire data.values array, affecting every other value which has same value.mode
									else if (value.mode === 'checkGroup') {
										if (!value.hasOwnProperty('mode')) {value.mode = 'checkGroup';}
										if (!value.hasOwnProperty('checkFunc')) {
											value.checkFunc = new _check({x: currX + textWidth + 10, y: currY + this.fontSize / 7, size: this.fontSize, value: value.value, shape: 'circle', color: this.toggleColor});
										}
										value.checkFunc.x = bAlignL ? currX : currX + textWidth + 10;
										value.checkFunc.y = currY + this.fontSize / 7;
										value.checkFunc.w = columnWidth * (i + 1) - value.checkFunc.x - columnOffset;
										value.checkFunc.paint(gr);
										currW = value.checkFunc.x  + 10 + value.checkFunc.size;
									}
									else if (value.mode === 'toggleControl') {
										if (!value.hasOwnProperty('mode')) {value.mode = 'toggleControl';}
										if (!value.hasOwnProperty('checkFunc')) {
											value.checkFunc = new _toggleControl({x: currX + textWidth + 10, y: currY, size: this.fontSize * 1.5, value: value.value, color: this.toggleColor});
										}
										value.checkFunc.x = bAlignL ? currX : currX + textWidth + 10;
										value.checkFunc.y = currY;
										value.checkFunc.w = columnWidth * (i + 1) - value.checkFunc.x - columnOffset - value.checkFunc.toggleW;
										value.checkFunc.paint(gr);
										currW = value.checkFunc.x  + 10 + value.checkFunc.toggleW;
									}
									// Colorpicker
									else if (value.mode === 'colorPicker') {
										// currY += textHeight + 3;
										if (!value.hasOwnProperty('mode')) {value.mode = 'colorPicker';}
										if (!value.hasOwnProperty('colorFunc')) {
											value.colorFunc = new _colorPicker({x: currX, y: currY + this.fontSize / 7, size: 40, color: value.value, hoverColor: this.colorPickerHover});
										}
										// value.colorFunc.color = value.value;
										value.colorFunc.x = currX;
										value.colorFunc.y = currY + this.fontSize / 7;
										value.colorFunc.w = columnWidth * (i + 1) - value.colorFunc.x - columnOffset;
										value.colorFunc.paint(gr);
										currY += value.colorFunc.size;
										// currOffsetX += value.colorFunc.size + 10;
										currOffsetY -= value.colorFunc.size * 1/ 3;
										currW = value.colorFunc.x + value.colorFunc.size + 10;
										// currW = value.colorFunc.x;
									}
									if (bAlignL) {
										gr.GdiDrawText(value.name, this.valueFont, this.textColor, currW + currOffsetX, currY + currOffsetY, columnWidthDraw - columnOffset, this.height, DT_NOPREFIX); 
										currW += textWidth;
									}
									currY += textHeight + 3;
									maxW = Math.max(maxW, currW);
								});
							}
					});
				}
			}
		}
	}

	this.paint = (gr, x = this.x, y = this.y) => { // on_paint
		if (!this.width || !this.height) {return;}
		if (!bFitOnce && this.bFitData && tabs[this.tabIdx].hasOwnProperty('data')) {bFitOnce = true; this.fitData();}
		if (this.bAutoSave) {this.loadAll();}
		this.paintBg(gr, x, y);
		this.paintTabs(gr, x, y);
		this.paintCurrent(gr, x, y);
	}
		
	this.estimateDataWidth = (tab) => {
		const columnOffset = 20;
		const columnWidth = this.width / tab.columns;
		const tabulation = columnWidth / this.fontSize;
		const maxX = Array(tab.columns);
		for (let i = 0; i < tab.columns; i++) {
			const columnData = tab.data[i];
			maxX[i] = 0;
			if (columnData && columnData.length) {
				columnData.forEach((data) => {
					if (data.title) {
						const textWidth = _gr.CalcTextWidth(data.title, this.titleFont);
						if (maxX[i] < textWidth) {maxX[i] = textWidth;}
					}
					if (data.subTitle) {
						const textWidth = _gr.CalcTextWidth(data.title, this.subTitleFont);
						if (maxX[i] < textWidth) {maxX[i] = textWidth;}
					}
					if (data.values && data.values.length) {
						data.values.forEach((value) => {
							let textWidth = _gr.CalcTextWidth(value.name, this.valueFont);
							if (value.mode === 'toggleControl') {textWidth += Math.round(this.fontSize * 1.5 / 2 * 5) - tabulation;}
							if (maxX[i] < textWidth) {maxX[i] = textWidth;}
						});
					}
				});
			}
			maxX[i] += columnOffset * 3 + tabulation;
			if (maxX[i] < columnWidth) {maxX[i] = columnWidth;}
			maxX[i] = Math.floor(maxX[i]);
		}
		return maxX;
	}
	
	this.fitData = () => {
		if (!tabs[this.tabIdx].hasOwnProperty('data')) {return;}
		if (this.bAutoSave) {this.loadAll();}
		tabs = clone(tabsCopy);
		const dataWidth = [];
		tabs.forEach((tab) => {dataWidth.push(this.estimateDataWidth(tab));});
		const newTabs = [];
		dataWidth.forEach( (tabWidth, i) => {
			const columnWidth = this.width / tabs[i].columns;
			let sumWidth = tabWidth.reduce((acc, val) => {return acc + val}, 0);
			if (sumWidth > this.width) {
				let columns = 0;
				while (Math.max(...tabWidth) > this.width / (tabs[i].columns - columns) && tabs[i].columns > columns + 1) {columns++;}
				if (columns) {newTabs.push({from: i, columns})}
			}
		});
		if (newTabs.length) {
			let offset = 0;
			newTabs.forEach((move) => {
				const currTab = tabs[move.from + offset];
				const currTabDataLength = currTab.data.length;
				// Clone
				tabs.splice(move.from + offset + 1, 0, clone(currTab));
				// Cut moved data from original tab
				currTab.data.splice(currTabDataLength - move.columns, move.columns)
				// Cut duplicated data from cloned tab
				offset++;
				const newTab = tabs[move.from + offset];
				newTab.data.splice(0, currTabDataLength - move.columns)
				// Rename and update columns
				currTab.title += ' (1)';
				newTab.title += ' (2)';
				currTab.columns -= move.columns;
				newTab.columns = move.columns;
			});
		}
	}
		
	this.addTab = ({title, columns = 1, color = this.tabColor, idx = tabs.length, data = new Array(columns), object = null, description = ''}) => {
		while (data.length < columns) {data.push([]);}
		if (data.length > columns) {console.log('_window.addTab: can not add a tab with data length ' + '(' + data.length + ') > columns set ' + '(' + columns + ')'); return;}
		// Add an id to every data value on the tab if they are not associated to a property
		let i = 0;
		data.forEach((column) => {
			column.forEach((columnData) => {
				if (columnData.hasOwnProperty('values')) {
					columnData.values.forEach((value) => {
						if (value.hasOwnProperty('value') && !value.hasOwnProperty('pId')) {value.dId = i++;}
					});
				}
			});
		});
		tabs.splice(idx, 0, {title, columns, color, data, object, description});
		tabsCopy = clone(tabs);
		return tabs[idx];
	}
	
	this.configTab = (title, tabData = {}) => { // Columns, color, idx, data, ....
		const idx = tabsCopy.findIndex((tab) => {return tab.title === title;});
		if (idx !== -1) {
			tabsCopy[idx] = {...tabsCopy[idx], ...tabData};
			return true;
		}
		return false;
	}
	
	// Returns data for the given original tab title (even if it has been split in multiple tabs)
	this.getTabData = (title) => {
		const tabsFiltered = tabsCopy.filter((tab) => {return tab.title.replace(/ \([1-9]\)/g, '') === title.replace(/ \([1-9]\)/g, '');});
		const data = []; // TODO: from tabs? and strip not needed data
		tabsFiltered.forEach((tab) => {data.push(...tab.data);});
		return data;
	}
	
	// Callbacks
	this.trackTab = (x, y) => {
		if (y >= this.y && y <= this.y + this.tabsHeight()) {
			const num = this.numTabs();
			let widthSum = this.x;
			for (let i = 0; i < num; i++) {
				const width  = this.tabsWidth(tabs[i]);
				if (x >= widthSum && x <= widthSum + width) {return i;}
				widthSum += width;
			}
		} 
		return -1;
	}
	
	let bHovered = false;
	this.move = (x, y) => {
		// Tooltip for tabs titles
		const hoverTab = this.trackTab(x, y);
		if (hoverTab !== -1) {
			tooltip.SetValue(tabs[hoverTab].title + (tabs[hoverTab].hasOwnProperty('description') && tabs[hoverTab].description.length ? '\n' + tabs[hoverTab].description : ''));
			bHovered = true;
		} else if (bHovered) {
			tooltip.SetValue('');
			bHovered = false;
		}
		// Items
		let bDataTT = false;
		const currTab = tabs[this.tabIdx];
		if (currTab.object && currTab.object.hasOwnProperty('move')) {return currTab.object.move(x, y);}
		else { // Current tabs with data
			for (let i = 0; i < currTab.columns; i++) {
				const columnData = currTab.data[i];
				if (columnData && columnData.length) {
					columnData.forEach((data) => {
						if (data.values && data.values.length) {
							data.values.forEach((value) => {
								if (value.mode === 'value') {
									if (value.hasOwnProperty('valueFunc')) {
										const bActive = value.valueFunc.check('move', x, y);
										if (bActive) {
											value.valueFunc.tt = value.tt ? (isFunction(value.tt) ? value.tt(value.value) : value.tt) : '';
											if (value.valueFunc.tt.length) {
												value.valueFunc.tt = isFunction(value.tt) ? value.tt(value.value).toString() : value.tt;
												tooltip.SetValue(value.valueFunc.tt, true);
												bDataTT = true;
											}
										}
									}
								}
								if (value.mode === 'toggleControl' || value.mode === 'checkGroup' || value.mode === 'check' || value.mode === 'colorPicker') {
									if (value.hasOwnProperty('checkFunc')) {
										const bActive = value.checkFunc.move(x, y);
										if (bActive) {
											value.checkFunc.tt = value.tt ? (isFunction(value.tt) ? value.tt(value.value).toString() : value.tt) : '';
											if (value.checkFunc.tt.length) {
												tooltip.SetValue(value.checkFunc.tt, true);
												bDataTT = true;
											}
										}
									}
								}
								if (value.mode === 'colorPicker') {
									if (value.hasOwnProperty('colorFunc')) {
										const bActive = value.colorFunc.move(x, y);
										if (bActive) {
											value.colorFunc.tt = value.tt ? (isFunction(value.tt) ? value.tt(value.value).toString() : value.tt) : '';
											if (value.colorFunc.tt.length) {
												tooltip.SetValue(value.colorFunc.tt, true);
												bDataTT = true;
											}
										}
									}
								}
								if (value.mode === 'list') {
									if (value.hasOwnProperty('listFunc')) {
										let bActive = value.listFunc.containXY(x,y);
										if (bActive) {
											value.listFunc.changeState(buttonStates.hover, value.value);
										} else {
											value.listFunc.changeState(buttonStates.normal, value.value);
										}
										window.Repaint(true)
										if (bActive && value.listFunc.tt.length) {
											tooltip.SetValue(value.listFunc.tt, true);
											bDataTT = true;
										}
									}
								}
							});
						}
					});
				}
			}
		}
		if (!bHovered && !bDataTT) {tooltip.Deactivate(); window.SetCursor(IDC_ARROW);}
		return;
	}
	
	this.leave = () => {
		// Items
		const currTab = tabs[this.tabIdx];
		if (currTab.object && currTab.object.hasOwnProperty('leave')) {return currTab.object.leave();}
		else { // Current tabs with data
			for (let i = 0; i < currTab.columns; i++) {
				const columnData = currTab.data[i];
				if (columnData && columnData.length) {
					columnData.forEach((data) => {
						if (data.values && data.values.length) {
							data.values.forEach((value) => {
								if (value.mode === 'value') {
									if (value.hasOwnProperty('valueFunc')) {
										value.valueFunc.check('move', -1, -1);
									}
								}
								if (value.mode === 'toggleControl' || value.mode === 'checkGroup' || value.mode === 'check' || value.mode === 'colorPicker') {
									if (value.hasOwnProperty('checkFunc') && value.checkFunc.bHovered) {
										value.checkFunc.bHovered = false;
										window.Repaint();
									}
								}
								if (value.mode === 'colorPicker') {
									if (value.hasOwnProperty('colorFunc')) {
										value.colorFunc.bHovered = false;
										window.Repaint();
									}
								}
								if (value.mode === 'list') {
									if (value.hasOwnProperty('listFunc')) {
										value.listFunc.changeState(buttonStates.normal);
										window.Repaint();
									}
								}
							});
						}
					});
				}
			}
		}
		return;
	}

	this.btn_up = (x, y, mask) => {
		let bDone = false;
		// Find currently selected tab
		const tabIdx = this.trackTab(x, y);
		if (tabIdx !== -1) {this.tabIdx = tabIdx; window.Repaint(true); return;}
		// Items
		const currTab = tabs[this.tabIdx];
		if (currTab.object && currTab.object.hasOwnProperty('btn_up')) {return currTab.object.btn_up(x, y, mask);}
		else { // Current tabs with data
			for (let i = 0; i < currTab.columns; i++) {
				const columnData = currTab.data[i];
				if (columnData && columnData.length) {
					columnData.forEach((data) => {
						if (data.values && data.values.length) {
							data.values.forEach((value, idx) => {
								if (bDone) {return;}
								if (value.hasOwnProperty('checkFunc')) {
									if (value.checkFunc.btn_up(x, y)) {
										value.value = value.checkFunc.value;
										this.saveData(value);
										if (value.mode === 'checkGroup') {
											data.values.forEach((otherVal, idxC) => {
												if (idxC === idx) {return;}
												if (otherVal.hasOwnProperty('checkFunc') && otherVal.mode === 'checkGroup') {
													otherVal.value = otherVal.checkFunc.value = false;
													this.saveData(otherVal); 
												}
											});
											window.Repaint(true);
										}
										bDone = true;
									}
								}
								if (value.hasOwnProperty('valueFunc')) {
									const bWasActive = value.valueFunc.active;
									const bIsActive = value.valueFunc.check('up', x, y);
									if (bWasActive && !bIsActive || bIsActive) {
										if (value.value !== value.valueFunc.text) {
											value.value = value.valueFunc.text;
											this.saveData(value);
											bDone = true;
										}
									}
								}
								if (value.hasOwnProperty('listFunc')) {
									if (value.listFunc.containXY(x,y)) {
										if (value.listFunc.onClick()) {
											value.listFunc.changeState(buttonStates.hover);
											if (value.value !== value.listFunc.text) {
												value.value = value.listFunc.text;
												this.saveData(value);
												bDone = true;
											}
											window.Repaint(true);
										}
									}
								}
								if (value.hasOwnProperty('colorFunc')) {
									if (value.colorFunc.btn_up(x, y)) {
										value.value = value.colorFunc.color;
										this.saveData(value);
										bDone = true;
									}
								}
							});
						}
					});
				}
			}
		}
		if (this.bAutoSave && bDone) {this.saveAll();}
		return;
	}
	
	this.btn_down = (x, y, mask) => {
		// Items
		const currTab = tabs[this.tabIdx];
		if (currTab.object && currTab.object.hasOwnProperty('btn_down')) {return currTab.object.btn_down(x, y, mask);}
		else { // Current tabs with data
			for (let i = 0; i < currTab.columns; i++) {
				const columnData = currTab.data[i];
				if (columnData && columnData.length) {
					columnData.forEach((data) => {
						if (data.values && data.values.length) {
							data.values.forEach((value) => {
								if (value.hasOwnProperty('valueFunc')) {
									value.valueFunc.check('down', x, y);
								}
								if (value.hasOwnProperty('listFunc')) {
									if (value.listFunc.containXY(x,y)) {
										value.listFunc.changeState(buttonStates.down);
										window.Repaint(true);
									}
								}
							});
						}
					});
				}
			}
		}
		return;
	}	
	
	this.lbtn_dblclk = (x, y, mask) => {
		// Items
		const currTab = tabs[this.tabIdx];
		if (currTab.object && currTab.object.hasOwnProperty('lbtn_dblclk')) {return currTab.object.lbtn_dblclk(x, y, mask);}
		else { // Current tabs with data
			for (let i = 0; i < currTab.columns; i++) {
				const columnData = currTab.data[i];
				if (columnData && columnData.length) {
					columnData.forEach((data) => {
						if (data.values && data.values.length) {
							data.values.forEach((value) => {
								if (value.hasOwnProperty('valueFunc')) {
									value.valueFunc.check('dblclk', x, y, mask);
								}
							});
						}
					});
				}
			}
		}
		return;
	}
	
	this.rbtn_down = (x, y, mask) => {
		// Items
		const currTab = tabs[this.tabIdx];
		if (currTab.object && currTab.object.hasOwnProperty('rbtn_down')) {return currTab.object.rbtn_down(x, y, mask);}
		else { // Current tabs with data
			for (let i = 0; i < currTab.columns; i++) {
				const columnData = currTab.data[i];
				if (columnData && columnData.length) {
					columnData.forEach((data) => {
						if (data.values && data.values.length) {
							data.values.forEach((value) => {
								if (value.hasOwnProperty('valueFunc')) {
									value.valueFunc.check('right', x, y);
								}
							});
						}
					});
				}
			}
		}
		return;
	}	
	
	this.key_down = (vkey) => {
		// Items
		let bDone = false;
		const currTab = tabs[this.tabIdx];
		if (currTab.object && currTab.object.hasOwnProperty('key_down')) {return currTab.object.key_down(vkey);}
		else { // Current tabs with data
			for (let i = 0; i < currTab.columns; i++) {
				const columnData = currTab.data[i];
				if (columnData && columnData.length) {
					columnData.forEach((data) => {
						if (data.values && data.values.length) {
							data.values.forEach((value) => {
								if (value.hasOwnProperty('valueFunc')) {
									value.valueFunc.on_key_down(vkey);
									if (value.value !== value.valueFunc.text) {
										value.value = value.valueFunc.text;
										this.saveData(value);
										bDone = true;
									}
								}
							});
						}
					});
				}
			}
		}
		if (this.bAutoSave && bDone) {this.saveAll();}
		return;
	}
	
	this.on_char = (code) => {
		// Items
		let bDone = false;
		const currTab = tabs[this.tabIdx];
		if (currTab.object && currTab.object.hasOwnProperty('on_char')) {return currTab.object.on_char(code);}
		else { // Current tabs with data
			for (let i = 0; i < currTab.columns; i++) {
				const columnData = currTab.data[i];
				if (columnData && columnData.length) {
					columnData.forEach((data) => {
						if (data.values && data.values.length) {
							data.values.forEach((value) => {
								if (value.hasOwnProperty('valueFunc')) {
									value.valueFunc.on_char(code);
									if (value.value !== value.valueFunc.text) {
										value.value = value.valueFunc.text;
										this.saveData(value);
										bDone = true;
									}
								}
							});
						}
					});
				}
			}
		}
		if (this.bAutoSave && bDone) {this.saveAll();}
		return;
	}
	
	this.resize = (width, height) => {
		tabs.forEach((tab) => {if (tab.object && tab.object.hasOwnProperty('resize')) {tab.object.resize(width, height);}});
		this.x = x * this.width / width;
		this.y = y * this.height / height;
		this.width = width;
		this.height = height;
		if (this.bFitData && tabs[this.tabIdx].hasOwnProperty('data')) {
			const currTitle = tabs[this.tabIdx].title;
			this.fitData();
			// Data fitting may change tabs title, so try to find current tab again by title
			this.tabIdx = tabs.findIndex((tab) => {return tab.title === currTitle});
			// Or get the latest tab with same starting title
			if (this.tabIdx === -1) {this.tabIdx = tabs.slice().findIndex((tab) => {return tab.title.replace(/ \([1-9]\)/g, '') === currTitle.replace(/ \([1-9]\)/g, '');});}
			if (this.tabIdx === -1) {this.tabIdx = 0; fb.ShowPopupMessage('Not found any tab with ' + currTitle, 'Window Panel');}
		}
	}
	
	this.saveAll = () => {
		tabs.forEach((tab) => {if (tab.object && tab.object.hasOwnProperty('save')) {tab.object.save();}});
		this.save();
	}
	this.loadAll = () => {
		tabs.forEach((tab) => {if (tab.object && tab.object.hasOwnProperty('load')) {tab.object.load();}});
		this.load();
	}
	this.save = () => {return this.properties;} // Meant to be replaced
	this.load = () => {return this.properties;}
	
	this.getValueByKey = (obj, ...args) => {
		return getNested(obj, ...args);
	}
	this.setValueByKey = (obj, value, ...args) => {
		return setNested(obj, value, ...args);
	}
	
	this.saveProperty = (value) => {
		if (value.hasOwnProperty('constructor')) {value.value = value.constructor(value.value);}
		if (value.hasOwnProperty('pId')) {
			if (value.hasOwnProperty('pIdx')) {
				this.properties[value.pId][value.pIdx] = value.value;
			} else {
				this.properties[value.pId] = value.value;
			}
		} else if (value.hasOwnProperty('pKey')) {
			if (Array.isArray(value.pKey)) {
				const old = this.getValueByKey(this.properties, ...value.pKey);
				if (typeof old === 'object') {
					this.setValueByKey(this.properties, JSON.parse(value.value), ...value.pKey);
				} else {
					this.setValueByKey(this.properties, value.value, ...value.pKey);
				}
			} else {
				if (typeof this.properties[value.pKey] === 'object') {
					this.properties[value.pKey] = JSON.parse(value.value);
				} else {
					this.properties[value.pKey] = value.value;
				}
			}
		}
	}
	this.loadProperty = (value) => {
		if (value.hasOwnProperty('pId')) {
			if (value.hasOwnProperty('pIdx')) {
				value.value = this.properties[value.pId][value.pIdx];
			} else {
				value.value = this.properties[value.pId];
			}
			if (Array.isArray(value.value)) {
				value.value = JSON.stringify(value.value);
			}
		} else if (value.hasOwnProperty('pKey')) {
			if (Array.isArray(value.pKey)) {
				value.value = this.getValueByKey(this.properties, ...value.pKey);
			} else {
				value.value = this.properties[value.pKey];
			}
			if (typeof value.value === 'object') {
				value.value = JSON.stringify(value.value);
			}
		}
		if (value.hasOwnProperty('constructor')) {value.value = value.constructor(value.value);}
	}
	this.saveData = (value) => {
		if (value.hasOwnProperty('pId') || value.hasOwnProperty('pKey')) {this.saveProperty(value);} // Just change the property
		else { // Look for value on entire original tab's data
			if (value.hasOwnProperty('constructor')) {value.value = value.constructor(value.value);}
			const currTab = tabs[this.tabIdx];
			const origIdx = tabsCopy.findIndex((tab) => {return tab.title === currTab.title || tab.title.replace(/ \([1-9]\)/g, '') === currTab.title.replace(/ \([1-9]\)/g, '');});
			const origTab = tabsCopy[origIdx];
			let bDone = false;
			origTab.data.forEach((column) => {
				if (bDone) {return;}
				column.forEach((columnData) => {
					if (bDone) {return;}
					if (columnData.hasOwnProperty('values')) {
						columnData.values.forEach((oldValue) => {
							if (bDone) {return;}
							if (oldValue.dId === value.dId) {
								oldValue.value = value.value;
								return;
							}
						});
					}
				});
			});
		}
	}
	this.loadData = (value) => {
		if (value.hasOwnProperty('pId') || value.hasOwnProperty('pKey')) {this.loadProperty(value);}
		else {
			if (value.hasOwnProperty('constructor')) {value.value = value.constructor(value.value);}
		}
	}
}