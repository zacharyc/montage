/* <copyright>
 This file contains proprietary software owned by Motorola Mobility, Inc.<br/>
 No rights, expressed or implied, whatsoever to this software are provided by Motorola Mobility, Inc. hereunder.<br/>
 (c) Copyright 2011 Motorola Mobility, Inc.  All Rights Reserved.
 </copyright> */
/**
	@module "montage/ui/rich-text-editor.reel"
    @requires montage/core/core
*/
var Montage = require("montage").Montage,
    MutableEvent = require("core/event/mutable-event").MutableEvent,
    Component = require("ui/component").Component,
    dom = require("ui/dom"),
    Point = require("core/geometry/point").Point;

/**
    @class module:"montage/ui/rich-text-editor.reel".RichTextEditor
    @extends module:montage/ui/component.Component
*/
exports.RichTextEditor = Montage.create(Component,/** @lends module:"montage/ui/rich-text-editor.reel".RichTextEditor# */ {

    /**
      Description TODO
      @private
    */
    _hasSelectionChangeEvent: {
        enumerable: false,
        value: null     // Need to be preset to null, will be set to true or false later on
    },

    /**
      Description TODO
      @private
    */
    _needSelectionReset: {
        enumerable: false,
        value: false
    },

    /**
      Description TODO
      @private
    */
    _selectionChangeTimer: {
        enumerable: false,
        value: null
    },

    /**
      Description TODO
      @private
    */
    _hasFocus: {
        enumerable: false,
        value: false
    },

    /**
      Description TODO
     @type {Function}
    */
    hasFocus: {
        enumerable: true,
        get: function() {
            return this._hasFocus;
        }
    },

    /**
      Description TODO
      @private
    */
    _hasChanged: {
        enumerable: false,
        value: false
    },

    /**
      Description TODO
     @type {Function}
    */
    hasChanged: {
        enumerable: true,
        get: function() {
            return this._hasChanged;
        }
    },

    /**
      Description TODO
      @private
    */
    _value: {
        enumerable: false,
        value: ""
    },

    /**
      Description TODO
     @type {Function}
    */
    value: {
        enumerable: true,
        get: function() {
            if (this._hasChanged || !this._value) {
                this._value = this.element.innerHTML;
                this._hasChanged = false;
            }
            return this._value;
        },
        set: function(value) {
            if (this._value !== value) {
                this._value = value;
                this._textValue = null;
                this._needSelectionReset = true;
                this._needSetContent = true;
                this.needsDraw = true;
            }
        }
    },

    /**
      Description TODO
      @private
    */
    _textValue: {
        enumerable: false,
        value: ""
    },

    /**
      Description TODO
     @type {Function}
    */
    textValue: {
        enumerable: true,
        get: function() {
            if (this._hasChanged || !this._textValue) {
                this._textValue = this.element.innerText;
                this.__lookupGetter__("value").call(this); // Force the hasChanged state to sync up
            }
            return this._textValue;
        },
        set: function (value) {
            if (this._value !== value) {
                this._value = value;
                this._value = null;
                this._needSelectionReset = true;
                this._needSetContent = true;
                this.needsDraw = true;
            }
        }
    },

    /**
      Description TODO
      @private
    */
    _statesDirty: {
        enumerable: false,
        value: false
    },

    /**
      Description TODO
      @private
    */
    _states: {
        enumerable: false,
        value: null
    },

    /**
      Description TODO
     @type {Function}
    */
    states: {
        enumerable: true,
        get: function() {
            if (this._states == null || this._statesDirty) {
                this.updateStates();
            }

            return this._states;
        }
    },

    /**
      Description TODO
     @type {Function}
    */
    updateStates: {
        enumerable: true,
        value: function() {
            var actions = this._actions,
                key,
                action,
                states,
                state,
                statesChanged = false;

            states = this._states || {};
            for (key in actions) {
                action = actions[key];
                state = "false";
                if (action.enabled && action.status) {
                    state = document.queryCommandValue(key);
                    if (typeof state == "boolean") {
                        state = state ? "true" : "false";
                    }
                    // JFD TODO: We might need to do some conversion for fontsize, fontname and colors
                }

                if (states[key] !== state) {
                    states[key] = state;
                    statesChanged = true;
                }
            }
            if (statesChanged) {
                this._states = states;
                // As we do not use a setter, we need to manually dispatch a change event
                this.dispatchEvent(MutableEvent.changeEventForKeyAndValue("states" , this._states));
            }

            return this._states;
        }
    },

    /**
      Description TODO
      @private
    */
    _allowDrop: {
        enumerable: false,
        value: true
    },

    /**
      Description TODO
     @type {Function}
    */
    allowDrop: {
        enumerable: true,
        get: function() {
            return this._allowDrop;
        },
        set: function(value) {
            this._allowDrop = value;
        }
    },


    /**
      Description TODO
      @private
    */
    _actions: {
        enumerable: false,
        value: {
            bold: {enabled: true, needsValue:false, status: true},
            italic: {enabled: true, needsValue:false, status: true},
            underline: {enabled: true, needsValue:false, status: true},
            strikethrough: {enabled: true, needsValue:false, status: true},
            indent: {enabled: true, needsValue:false, status: false},
            outdent: {enabled: true, needsValue:false, status: false},
            insertorderedlist: {enabled: true, needsValue:false, status: true},
            insertunorderedlist: {enabled: true, needsValue:false, status: true},
            fontname: {enabled: true, needsValue:true, status: true},
            fontsize: {enabled: true, needsValue:true, status: true},
            hilitecolor: {enabled: true, needsValue:true, status: true},
            forecolor: {enabled: true, needsValue:true, status: true}
        }
    },

    /**
      Description TODO
     @type {Function}
    */
    actions: {
        enumerable: false,
        get: function() {
            return this._actions;
        }
    },

    /**
      Description TODO
     @type {Function}
    */
    enabledActions: {
        enumerable: true,
        set: function(enabledActions) {
            var actions = this._actions,
                nbrEnabledActions = enabledActions.length,
                action,
                i;

            for (action in actions) {
                actions[action].enabled = false;
            }

            for (i = 0; i < nbrEnabledActions; i ++) {
                action = enabledActions[i];
                if (actions[action] !== undefined) {
                    actions[action].enabled = true;
                }
            }
        }
    },


    // Component Callbacks
    /**
    Description TODO
    @function
    */
    prepareForDraw: {
        enumerable: false,
        value: function() {
            var el = this.element;
            el.classList.add('montage-editor');
            el.setAttribute("contentEditable", "true");

            el.addEventListener("focus", this);

            el.addEventListener("dragstart", this, false);
            el.addEventListener("dragend", this, false);
            el.addEventListener("dragover", this, false);
            el.addEventListener("drop", this, false);

            this._needSetContent = true;
        }
    },

    /**
    Description TODO
    @function
    */
    draw: {
        enumerable: false,
        value: function() {
            var thisRef = this,
                element,
                range,
                offset;

            if (this._needSetContent === true) {
                if (this._value) {
                    this.element.innerHTML = this._value;
                } else if (this._textValue) {
                    this.element.innerText = this._textValue;
                } else {
                    this.element.innerHTML = "";
                }
                delete this._needSetContent;
            }

            if (this._drawNeedResizerOn !== undefined) {
                element = this._drawNeedResizerOn;
                if (element) {
                    this._removeResizer(this._currentResizerElement);
                    this._addResizer(element);
                    this._currentResizerElement = element;

                    // Select the element and its resizer
                    this._selectingResizer = true;
                    offset = this._nodeOffset(element);
                    range = document.createRange();
                    range.setStart(element.parentNode, offset);
                    range.setEnd(element.parentNode, offset + 1);
                    if (window.getSelection) {
                        var selection = window.getSelection();
                        selection.removeAllRanges();
                        selection.addRange(range);
                    } else {
                        range.select();
                    }
                    // JFD Note: Chrome (and maybe other browsers) will fire 2 selectionchange event asynchronously, to work around it let's use a timer
                    setTimeout(function() {delete thisRef._selectingResizer;}, 0);
                } else {
                    this._removeResizer(this._currentResizerElement);
                    delete this._currentResizerElement
                }

                delete this._drawNeedResizerOn;
            }

            if (this._draggedElement) {
                // Resize the resizer frame
                var frame = this._draggedElement.parentNode.firstChild,
                    zero = Point.create().init(0, 0),
                    framePosition = dom.convertPointFromNodeToPage(frame, zero),
                    cursor = this._cursorPosition,
                    direction = this._draggedElement.id.substring("editor-resizer-".length),
                    element = this._draggedElement.parentNode.previousSibling,
                    info = this._resizerFrameInfo,
                    ratio = info.ratio,
                    height = frame.clientHeight,
                    width = frame.clientWidth,
                    top = parseFloat(frame.style.top, 10),
                    left = parseFloat(frame.style.left, 10),
                    minSize = 15;

                if (direction == "n") {
                    height += framePosition.y - cursor.y;
                    top = info.top - (height - info.height);
                } else if (direction == "ne") {
                    height += framePosition.y - cursor.y;
                    width = Math.round(height * ratio);
                    if (cursor.x > (framePosition.x + width)) {
                        width = cursor.x - framePosition.x;
                        height = Math.round(width / ratio);
                    }
                    top = info.top - (height - info.height);
                } else if (direction == "e") {
                    width = cursor.x - framePosition.x;
                } else if (direction == "se") {
                    height = cursor.y - framePosition.y;
                    width = Math.round(height * ratio);
                    if (cursor.x > (framePosition.x + width)) {
                        width = cursor.x - framePosition.x;
                        height = Math.round(width / ratio);
                    }
                } else if (direction == "s") {
                    height = cursor.y - framePosition.y;
                } else if (direction == "sw") {
                    height = cursor.y - framePosition.y;
                    width = Math.round(height * ratio);
                    if (cursor.x <= framePosition.x - width + frame.clientWidth) {
                        width = frame.clientWidth + framePosition.x - cursor.x;
                        height = Math.round(width / ratio);
                    }
                    left = info.left - (width - info.width);
                } else if (direction == "w") {
                    width += framePosition.x - cursor.x;
                    left = info.left - (width - info.width);
                } else if (direction == "nw") {
                    height += framePosition.y - cursor.y;
                    width = Math.round(height * ratio);
                    if (cursor.x <= framePosition.x - width + frame.clientWidth) {
                        width = frame.clientWidth + framePosition.x - cursor.x;
                        height = Math.round(width / ratio);
                    }
                    top = info.top - (height - info.height);
                    left = info.left - (width - info.width);
                }

	            //set the frame's new height and width
	            if (height > minSize && width > minSize) {
		            frame.style.height = height + "px";
                    frame.style.width = width + "px";
                    frame.style.top = top + "px";
                    frame.style.left = left + "px";
	            }

                if (this._finalizeDrag) {
                    this._draggedElement.parentNode.classList.remove("dragged");
                    delete this._finalizeDrag;
                    delete this._resizerFrameInfo;
                    delete this._draggedElement;

                    // Remove the resizer, we don't wont it in case of undo!
                    this._removeResizer(element);

                    // Take the element offline tp modify it
                    var div = document.createElement("div"),
                        offlineElement,
                        savedID;
                    div.innerHTML = element.outerHTML;
                    offlineElement = div.firstChild;

                    // Resize the element now that it's offline
                    offlineElement.width = (width + 1);
                    offlineElement.height = (height + 1);
                    offlineElement.style.removeProperty("width");
                    offlineElement.style.removeProperty("height");

                    savedID = offlineElement.id;
                    offlineElement.id = "montage-editor-resized-image";

                    // Inject the resized element into the contentEditable using execCommand in order to be in the browser undo queue
                    document.execCommand("inserthtml", false, div.innerHTML);
                    element = document.getElementById(offlineElement.id);
                    if (savedID !== undefined) {
                        element.id = savedID;
                    }
                    this._currentResizerElement = element;

                    // Add back the resizer frame
                    this._addResizer(element);

                    // Reset the selection
                    this._selectingResizer = true;
                    offset = this._nodeOffset(element);
                    range = document.createRange();
                    range.setStart(element.parentNode, offset);
                    range.setEnd(element.parentNode, offset + 1);
                    if (window.getSelection) {
                        var selection = window.getSelection();
                        selection.removeAllRanges();
                        selection.addRange(range);
                    } else {
                        range.select();
                    }
                    // JFD Note: Chrome (and maybe other browsers) will fire 2 selectionchange event asynchronously, to work around it let's use a timer
                    setTimeout(function() {delete thisRef._selectingResizer;}, 0);

                } else {
                    this._draggedElement.parentNode.classList.add("dragged");
                }
            }
        }
    },

    // Event handlers
    // Event handlers
    /**
    Description TODO
    @function
    */
    handleFocus: {
        enumerable: false,
        value: function() {
            var el = this.element;

            this._hasFocus = true;
            if (this._needSelectionReset) {
                // JFD TODO: reset the user selection, set the caret at the end of the last text element
                this._needSelectionReset = false;
            }

            el.addEventListener("blur", this);
            el.addEventListener("input", this);
            el.addEventListener("keydown", this);
            el.addEventListener("keypress", this);
            el.addEventListener(window.Touch ? "touchstart" : "mousedown", this);
            document.addEventListener(window.Touch ? "touchend" : "mouseup", this);

            document.addEventListener("selectionchange", this, false);
            // Check if the browser does not supports the DOM event selectionchange
            if (this._hasSelectionChangeEvent === null) {
                var thisRef = this;
                setTimeout(function(){
                    if (thisRef._hasSelectionChangeEvent === null) {
                        thisRef._hasSelectionChangeEvent = false;
                    }
                }, 0);
            }
            if (this._hasSelectionChangeEvent === false) {
                // We need to listen to more event in order to simulate a selectionchange event
                el.addEventListener("keydup", this);
            }

            // Turn off image resize (if supported)
            document.execCommand("enableObjectResizing", false, false);
            // Force use css for styling (if supported)
            document.execCommand("styleWithCSS", false, true);
        }
    },

    /**
    Description TODO
    @function
    */
    handleBlur: {
        enumerable: false,
        value: function() {
            var el = this.element;

            this._hasFocus = false;

            // Force a selectionchange when we lose the focus
            this.handleSelectionchange();

            el.removeEventListener("blur", this);
            el.removeEventListener("input", this);
            el.removeEventListener("keypress", this);
            el.removeEventListener(window.Touch ? "touchstart" : "mousedown", this);
            document.removeEventListener(window.Touch ? "touchend" : "mouseup", this);

            document.removeEventListener("selectionchange", this);

            if (this._hasSelectionChangeEvent === false) {
                el.removeEventListener("keydup", this);
            }
        }
    },

    /**
    Description TODO
    @function
    */
    handleKeypress: {
        enumerable: false,
        value: function() {
            this._hasChanged = true;
            if (this._hasSelectionChangeEvent === false) {
                this.handleSelectionchange();
            }
            this._dispatchEditorEvent("editorChange");
        }
    },

    /**
    Description TODO
    @function
    */
    handleInput: {
        enumerable: false,
        value: function(event) {
            // If the resizer what show, hide it
            if (this._currentResizerElement) {
               if (this._removeResizer(this._currentResizerElement)) {
                   delete this._currentResizerElement;
               }
            }

            this._hasChanged = true;
            if (this._hasSelectionChangeEvent === false) {
                this.handleSelectionchange();
            }
            this.handleDragend(event);
            this._dispatchEditorEvent("editorChange");
        }
    },

    /**
    Description TODO
    @function
    */
    handleKeydown: {
        enumerable: false,
        value: function(event) {
            var keychar = String.fromCharCode(event.keyCode),
                stopEvent = false;

            if (event.metaKey || event.ctrlKey) {
                var SHIFT = 1, CTRL = 2, ALT = 4, META = 8,
                    COMMAND = window.navigator.userAgent.match(/\bmacintosh\b/i) ? META : CTRL;
                    modifiers = event.shiftKey + (event.ctrlKey << 1) + (event.altKey << 2) + (event.metaKey << 3);

                if (modifiers == COMMAND) {
                    if (keychar == "B") {
                        this.doAction("bold");
                        stopEvent = true;
                    } else if (keychar == "U") {
                        this.doAction("underline");
                        stopEvent = true;
                    } else if (keychar == "I") {
                        this.doAction("italic");
                        stopEvent = true;
                    }
                }
            }

            if (stopEvent) {
                event.preventDefault();
                event.stopPropagation();
            }
        }
    },

    /**
    Description TODO
    @function
    */
    handleMousedown: {
        enumerable: false,
        value: function(event) {
            // Check if we are inside a resizer handle
            var element = event.target,
                frame;

            if (element.classList.contains("montage-resizer-handle")) {
                if (window.Touch) {
                    this._observePointer(target.id);
                    document.addEventListener("touchmove", this);
                } else {
                    this._observePointer("mouse");
                    document.addEventListener("mousemove", this);
                }

                this._draggedElement = element;

                frame = element.parentNode.firstChild;
                this._resizerFrameInfo = {
                    width: frame.clientWidth,
                    height: frame.clientHeight,
                    left: parseInt(frame.style.left, 10),
                    top: parseInt(frame.style.top, 10),
                    ratio: frame.clientWidth / frame.clientHeight
                };
                this._cursorPosition = {x:event.pageX, y:event.pageY};

                event.preventDefault();
                event.stopPropagation();
            }
        }
    },

    /**
    Description TODO
    @function
    */
    handleMousemove: {
        enumerable: false,
        value: function(event) {
            if (this._draggedElement) {
                // We are dragging the resizer

                this._cursorPosition = {x:event.pageX, y:event.pageY};
                this.needsDraw = true;

                event.preventDefault();
                event.stopPropagation();
                return;
            }
        }
    },

    /**
    Description TODO
    @function
    */
    handleMouseup: {
        enumerable: false,
        value: function(event) {
            var thisRef = this,
                element = event.target,
                range,
                offset;

            if (this._draggedElement) {
                // We are dragging the resizer
                if (window.Touch) {
                    document.removeEventListener("touchmove", this, false);
                } else {
                    this._cursorPosition = {x:event.pageX, y:event.pageY};
                    document.removeEventListener("mousemove", this, false);
                }

                this._releaseInterest();

                this._finalizeDrag = true;
                this.needsDraw = true;

                event.preventDefault();
                event.stopPropagation();
                return;
            }

            if (element.tagName === "IMG") {
                if (this._currentResizerElement !== element) {
                    this._drawNeedResizerOn = element;
                    this.needsDraw = true;
                }
            } else {
                if (this._currentResizerElement) {
                    this._drawNeedResizerOn = null;
                    this.needsDraw = true;
                }

                if (this._hasSelectionChangeEvent === false) {
                    this.handleSelectionchange();
                }
                this.handleDragend(event);
            }
        }
    },

    /**
    Description TODO
    @function
    */
    handleTouchstart: {
        enumerable: false,
        value: function() {
            this.handleMousedown(event);
        }
    },

    /**
    Description TODO
    @function
    */
    handleTouchend: {
        enumerable: false,
        value: function() {
            this.handleMouseup(event);
        }
    },

    /**
    Description TODO
    @function
    */
    handleSelectionchange: {
        enumerable: false,
        value: function() {
            var thisRef = this;

            if (this._ignoreSelectionchange) {
                return;
            }

            if (this._hasSelectionChangeEvent == null) {
                this._hasSelectionChangeEvent = true;
            }

            if (this._currentResizerElement) {
                if (this._selectingResizer !== true) {

                    this._removeResizer(this._currentResizerElement);
                    delete this._currentResizerElement;
                }
            }

            if (this._selectionChangeTimer) {
                clearTimeout(this._selectionChangeTimer);
            }

            this._statesDirty = true;    // clear the cached states to force query it again
            this._selectionChangeTimer = setTimeout(function() {
                thisRef._dispatchEditorEvent("editorSelect");
            }, 50);
        }
    },

    /**
    Description TODO
    @function
    */
    handleDragstart: {
        enumerable: false,
        value: function(event) {
            var element = event.target;
            if (element === this._currentResizerElement) {
                // We are showing the resize frame, prevent dragging the image
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            // let's remember which element we are dragging
            this._dragSourceElement = event.srcElement;
        }
    },

    /**
    Description TODO
    @function
    */
    handleDragend: {
        enumerable: false,
        value: function(event) {
            delete this._dragSourceElement;
            delete this._dragOverX;
            delete this._dragOverY;

            this.handleSelectionchange();
        }
    },

    /**
    Description TODO
    @function
    */
    handleDragover: {
        enumerable: false,
        value: function(event) {
            var range;

            // If we are moving an element from within the ourselves, let the browser deal with it...
            if (this._dragSourceElement) {
                return;
            }

            // JFD TODO: check if drop type is acceptable...
            event.dataTransfer.dropEffect = this._allowDrop ? "copy" : "none";

            event.preventDefault();
            event.stopPropagation();

            // Update the caret
            if (event.x !== this._dragOverX || event.y !== this._dragOverY) {
                this._dragOverX = event.x;
                this._dragOverY = event.y;

                this._ignoreSelectionchange = true;
                if (document.caretRangeFromPoint) {
                    range = document.caretRangeFromPoint(event.x, event.y);
                } else if (event.rangeParent && event.rangeOffset) {
                    range = document.createRange();
                    range.setStart(event.rangeParent, event.rangeOffset);
                    range.setEnd(event.rangeParent, event.rangeOffset);
                }

                if (range) {
                    if (window.getSelection) {
                        var selection = window.getSelection();
                        selection.removeAllRanges();
                        selection.addRange(range);
                    } else {
                        range.select();
                    }
                }
                delete this._ignoreSelectionchange;
            }
        }
    },

    /**
    Description TODO
    @function
    */
    handleDrop: {
        enumerable: false,
        value: function(event) {
            var files = event.dataTransfer.files,
                fileLength = files.length,
                file,
                data,
                reader,
                i,
                delegateMethod,
                response;

            if (this._dragSourceElement) {
                // Let the browser do the job for us, just make sure we cleanup after us
                this.handleDragend(event);
                this.handleSelectionchange();
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            if (fileLength) {
                for (i = 0; i < fileLength; i ++) {
                    file = files[i];
                    delegateMethod = this._delegateMethod("fileDrop");
                    response = true;

                    if (window.FileReader) {
                        reader = new FileReader();
                        reader.onload = function() {
                            data = reader.result;

                            if (delegateMethod) {
                                response = delegateMethod.call(this.delegate, this, file, data);
                            }
                            if (response === true) {
                                if (file.type.match(/^image\//i)) {
                                    document.execCommand("insertimage", false, data);
                                }
                            }
                        }
                        reader.onprogress = function(e) {
                        }
                        reader.onerror = function(e) {
                        }
                        reader.readAsDataURL(file);
                    } else {
                        // JFD: This browser does not support the File API, we cannot do a preview...
                        if (delegateMethod) {
                            response = delegateMethod.call(this.delegate, this, file);
                        }
                        if (response === true) {
                            // JFD TODO: for now, we do nothing, up to the consumer to deal with that case
                        }
                    }
                }
            } else {
                data = event.dataTransfer.getData("text/html");
                if (data) {
                    var delegateMethod = this._delegateMethod("drop"),
                        response;

                    if (delegateMethod) {
                        response = delegateMethod.call(this.delegate, this, data, "text/html");
                        if (response === true) {
                            data = data.replace(/\<meta [^>]+>/gi, ""); // Remove the meta tag.
                        } else {
                            data = response === false ? null : response ;
                        }
                    }
                    if (data && data.length) {
                        document.execCommand("inserthtml", false, data);
                    }
                } else {
                    data = event.dataTransfer.getData("text/plain") || event.dataTransfer.getData("text");
                    if (data) {
                        var div = document.createElement('div');
                        div.innerText = data;
                        document.execCommand("inserthtml", false, div.innerHTML);
                    }
                }
            }
            this.handleDragend(event);
        }
    },

    /**
    Description TODO
    @function
    @param {String} pointer TODO
    @param {Component} demandingComponent TODO
    @returns {Boolean} false
    */
    surrenderPointer: {
        value: function(pointer, demandingComponent) {
            return false;
        }
    },

    /**
    Description TODO
    @private
    */
    _observePointer: {
        value: function(pointer) {
            this.eventManager.claimPointer(pointer, this);
            this._observedPointer = pointer;
        }
    },

    /**
    Description TODO
    @private
    */
    _releaseInterest: {
        value: function() {
            this.eventManager.forfeitPointer(this._observedPointer, this);
            this._observedPointer = null;
        }
    },

    // Actions
    /**
    Description TODO
    @function
    */
    handleAction: {
        enumerable: false,
        value: function(event) {
            var target = event.currentTarget,
                action = target.action || target.identifier,
                value = false;
            if (action) {
                if (this._actions[action].needsValue) {
                    value = target.actionValue;
                    if (value !== undefined) {
                        value = target[value];
                        if (value === undefined) {
                            value = target.actionValue;
                        }
                    } else {
                        value = target.value;
                    }

                    if (value === undefined) {
                        value = false;
                    }
                }
                this.doAction(action, value);
            }
        }
    },

    /**
    Description TODO
    @function
    */
    doAction: {
        enumerable: true,
        value: function(action, value) {
            // Check if the action is valid and enabled
            if (this._actions[action] && this._actions[action].enabled === true) {
                if (value === undefined) {
                    value = false;
                }

                document.execCommand("styleWithCSS", false, true);
                document.execCommand(action, false, value);
                document.execCommand("styleWithCSS", false, false);

                this.handleSelectionchange();
            }
        }
    },


    // Element Resize methods
    /**
    Description TODO
    @private
    @function
    */
    _addResizer: {
        enumerable: true,
        value: function(element) {
            var parentNode = element.parentNode,
                nextSibling = element.nextSibling,
                frame,
                w  = element.offsetWidth -1,
                h  = element.offsetHeight -1,
                l  = element.offsetLeft,
                t  = element.offsetTop,
                resizerFrameHtml = '<div id="montage-resizer" class="montage-resizer">' +
                    '<div id="editor-resizer-frame" class="montage-resizer-frame" style="width:'+ w + 'px; height:' + h + 'px; left:' + l + 'px; top:' + t + 'px"></div>' +
                    '<div id="editor-resizer-nw" class="montage-resizer-handle montage-resizer-nw" style="left:' + (l - 4) + 'px; top:' + (t - 4) + 'px"></div>' +
                    '<div id="editor-resizer-n" class="montage-resizer-handle montage-resizer-n" style="left:' + (l-3+ (w/2)) + 'px; top:' + (t-4)+ 'px"></div>' +
                    '<div id="editor-resizer-ne" class="montage-resizer-handle montage-resizer-ne" style="left:' + (l+w-2) + 'px; top:' + (t-4) + 'px"></div>' +
                    '<div id="editor-resizer-w" class="montage-resizer-handle montage-resizer-w" style="left:' + (l-4) + 'px; top:' + (t-3 + (h/2)) + 'px"></div>' +
                    '<div id="editor-resizer-e" class="montage-resizer-handle montage-resizer-e" style="left:' +(l+w-2) + 'px; top:' + (t-3+(h/2)) + 'px"></div>' +
                    '<div id="editor-resizer-sw" class="montage-resizer-handle montage-resizer-sw" style="left:' +(l-4) + 'px; top:' + (t+h-2) + 'px"></div>' +
                    '<div id="editor-resizer-s" class="montage-resizer-handle montage-resizer-s" style="left:' + (l-3+ (w/2)) + 'px; top:' + (t+h-2) + 'px"></div>' +
                    '<div id="editor-resizer-se" class="montage-resizer-handle montage-resizer-se" style="left:' + (l+w-2) + 'px; top:' + (t+h-2) + 'px"></div>' +
                    '</div>',
                handles,
                i;
            // sanity check: make sure we don't already have a frame
            if (!nextSibling || nextSibling.tagName !== "DIV" || !nextSibling.classList.contains("montage-resizer")) {
                frame = document.createElement("DIV");
                frame.innerHTML = resizerFrameHtml;
                parentNode.insertBefore(frame.firstChild, nextSibling);
                element.classList.add("montage-resizer-element");
            }
        }
    },

    /**
    Description TODO
    @private
    @function
    */
    _removeResizer: {
        enumerable: true,
        value: function(element) {
            if (!element) {
                return;
            }
            var resizer = element.nextSibling;

            if (resizer && resizer.tagName === "DIV" && resizer.classList.contains("montage-resizer")) {
                element.parentNode.removeChild(resizer)
                element.classList.remove("montage-resizer-element");
            } else {
                // Handle case where the element has been removed from the DOM or the resizer is not in sync with the
                // element anymore (hapen after an undo)
                resizer = document.getElementById("montage-resizer");
                if (resizer && resizer.tagName === "DIV" && resizer.classList.contains("montage-resizer")) {
                    resizer.parentNode.removeChild(resizer);
                    return false;
                }
            }
            return true;
        }
    },


    // Private methods
    /**
    Description TODO
    @private
    @function
    */
    _dispatchEditorEvent: {
        enumerable: true,
        value: function(type, value) {
            var editorEvent = document.createEvent("CustomEvent");
            editorEvent.initCustomEvent(type, true, false, value === undefined ? null : value);
            editorEvent.type = type;
            this.dispatchEvent(editorEvent);
        }
    },

    /**
    Description TODO
    @private
    @function
    */
    _delegateMethod: {
        enumerable: false,
        value: function(name) {
            var delegate, delegateFunctionName, delegateFunction;
            if (typeof this.identifier === "string") {
                delegateFunctionName = this.identifier + name.toCapitalized();
            } else {
                delegateFunctionName = name;
            }
            if ((delegate = this.delegate) && typeof (delegateFunction = delegate[delegateFunctionName]) === "function") {
                return delegateFunction;
            }

            return null;
        }
    },

    /**
    Description TODO
    @private
    @function
    */
    _nodeOffset: {
        enumerable: false,
        value: function(node) {
            var parentNode = node.parentNode,
                childNodes = parentNode.childNodes,
                i;

            for (i in childNodes) {
                if (childNodes[i] === node) {
                    return parseInt(i, 10); // i is a string, we need an integer
                }
            }
            return 0;
        }
    }
});