// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
//
// This file exists to aggregate all of the javascript used by the
// settings page into a single file which will be flattened and served
// as a single resource.
// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {

  /////////////////////////////////////////////////////////////////////////////
  // Preferences class:

  /**
   * Preferences class manages access to Chrome profile preferences.
   * @constructor
   */
  function Preferences() {
  }

  lbm.addSingletonGetter(Preferences);

  /**
   * Sets value of a boolean preference.
   * and signals its changed value.
   * @param {string} name Preference name.
   * @param {boolean} value New preference value.
   * @param {string} metric User metrics identifier.
   */
  Preferences.setBooleanPref = function(name, value, metric) {
    var argumentList = [name, Boolean(value)];
    if (metric != undefined) argumentList.push(metric);
    chrome.send('setBooleanPref', argumentList);
  };

  /**
   * Sets value of an integer preference.
   * and signals its changed value.
   * @param {string} name Preference name.
   * @param {number} value New preference value.
   * @param {string} metric User metrics identifier.
   */
  Preferences.setIntegerPref = function(name, value, metric) {
    var argumentList = [name, Number(value)];
    if (metric != undefined) argumentList.push(metric);
    chrome.send('setIntegerPref', argumentList);
  };

  /**
   * Sets value of a double-valued preference.
   * and signals its changed value.
   * @param {string} name Preference name.
   * @param {number} value New preference value.
   * @param {string} metric User metrics identifier.
   */
  Preferences.setDoublePref = function(name, value, metric) {
    var argumentList = [name, Number(value)];
    if (metric != undefined) argumentList.push(metric);
    chrome.send('setDoublePref', argumentList);
  };

  /**
   * Sets value of a string preference.
   * and signals its changed value.
   * @param {string} name Preference name.
   * @param {string} value New preference value.
   * @param {string} metric User metrics identifier.
   */
  Preferences.setStringPref = function(name, value, metric) {
    var argumentList = [name, String(value)];
    if (metric != undefined) argumentList.push(metric);
    chrome.send('setStringPref', argumentList);
  };

  /**
   * Sets value of a JSON list preference.
   * and signals its changed value.
   * @param {string} name Preference name.
   * @param {Array} value New preference value.
   * @param {string} metric User metrics identifier.
   */
  Preferences.setListPref = function(name, value, metric) {
    var argumentList = [name, JSON.stringify(value)];
    if (metric != undefined) argumentList.push(metric);
    chrome.send('setListPref', argumentList);
  };

  /**
   * Clears value of a JSON preference.
   * @param {string} name Preference name.
   * @param {string} metric User metrics identifier.
   */
  Preferences.clearPref = function(name, metric) {
    var argumentList = [name];
    if (metric != undefined) argumentList.push(metric);
    chrome.send('clearPref', argumentList);
  };

  Preferences.prototype = {
    __proto__: lbm.EventTarget.prototype,

    // Map of registered preferences.
    registeredPreferences_: {},

    /**
     * Adds an event listener to the target.
     * @param {string} type The name of the event.
     * @param {!Function|{handleEvent:Function}} handler The handler for the
     *     event. This is called when the event is dispatched.
     */
    addEventListener: function(type, handler) {
      lbm.EventTarget.prototype.addEventListener.call(this, type, handler);
      this.registeredPreferences_[type] = true;
    },

    /**
     * Initializes preference reading and change notifications.
     */
    initialize: function() {
      var params1 = ['Preferences.prefsFetchedCallback'];
      var params2 = ['Preferences.prefsChangedCallback'];
      for (var prefName in this.registeredPreferences_) {
        params1.push(prefName);
        params2.push(prefName);
      }
      chrome.send('fetchPrefs', params1);
      chrome.send('observePrefs', params2);
    },

    /**
     * Helper function for flattening of dictionary passed via fetchPrefs
     * callback.
     * @param {string} prefix Preference name prefix.
     * @param {object} dict Map with preference values.
     */
    flattenMapAndDispatchEvent_: function(prefix, dict) {
      for (var prefName in dict) {
        if (typeof dict[prefName] == 'object' &&
            !this.registeredPreferences_[prefix + prefName]) {
          this.flattenMapAndDispatchEvent_(prefix + prefName + '.',
              dict[prefName]);
        } else {
          var event = new lbm.Event(prefix + prefName);
          event.value = dict[prefName];
          this.dispatchEvent(event);
        }
      }
    }
  };

  /**
   * Callback for fetchPrefs method.
   * @param {object} dict Map of fetched property values.
   */
  Preferences.prefsFetchedCallback = function(dict) {
    Preferences.getInstance().flattenMapAndDispatchEvent_('', dict);
  };

  /**
   * Callback for observePrefs method.
   * @param {array} notification An array defining changed preference values.
   * notification[0] contains name of the change preference while its new value
   * is stored in notification[1].
   */
  Preferences.prefsChangedCallback = function(notification) {
    var event = new lbm.Event(notification[0]);
    event.value = notification[1];
    Preferences.getInstance().dispatchEvent(event);
  };

  // Export
  return {
    Preferences: Preferences
  };

});

// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {

  var Preferences = options.Preferences;

  /**
   * Allows an element to be disabled for several reasons.
   * The element is disabled if at least one reason is true, and the reasons
   * can be set separately.
   * @private
   * @param {!HTMLElement} el The element to update.
   * @param {string} reason The reason for disabling the element.
   * @param {boolean} disabled Whether the element should be disabled or enabled
   * for the given |reason|.
   */
  function updateDisabledState_(el, reason, disabled) {
    if (!el.disabledReasons)
      el.disabledReasons = {};
    if (el.disabled && (Object.keys(el.disabledReasons).length == 0)) {
      // The element has been previously disabled without a reason, so we add
      // one to keep it disabled.
      el.disabledReasons['other'] = true;
    }
    if (!el.disabled) {
      // If the element is not disabled, there should be no reason, except for
      // 'other'.
      delete el.disabledReasons['other'];
      if (Object.keys(el.disabledReasons).length > 0)
        console.error("Element is not disabled but should be");
    }
    if (disabled) {
      el.disabledReasons[reason] = true;
    } else {
      delete el.disabledReasons[reason];
    }
    el.disabled = Object.keys(el.disabledReasons).length > 0;
  }

  /**
   * Helper function to update element's state from pref change event.
   * @private
   * @param {!HTMLElement} el The element to update.
   * @param {!Event} event The pref change event.
   */
  function updateElementState_(el, event) {
    el.controlledBy = null;

    if (!event.value)
      return;

    updateDisabledState_(el, 'notUserModifiable', event.value.disabled);

    el.controlledBy = event.value['controlledBy'];

    OptionsPage.updateManagedBannerVisibility();
  }

  /////////////////////////////////////////////////////////////////////////////
  // PrefCheckbox class:
  // TODO(jhawkins): Refactor all this copy-pasted code!

  // Define a constructor that uses an input element as its underlying element.
  var PrefCheckbox = lbm.ui.define('input');

  PrefCheckbox.prototype = {
    // Set up the prototype chain
    __proto__: HTMLInputElement.prototype,

    /**
     * Initialization function for the lbm.ui framework.
     */
    decorate: function() {
      this.type = 'checkbox';
      var self = this;

      self.initializeValueType(self.getAttribute('value-type'));

      // Listen to pref changes.
      Preferences.getInstance().addEventListener(
          this.pref,
          function(event) {
            var value = event.value && event.value['value'] != undefined ?
                event.value['value'] : event.value;

            // Invert pref value if inverted_pref == true.
            if (self.inverted_pref)
              self.checked = !Boolean(value);
            else
              self.checked = Boolean(value);

            updateElementState_(self, event);
          });

      // Listen to user events.
      this.addEventListener(
          'change',
          function(e) {
            if (self.customChangeHandler(e))
              return;
            var value = self.inverted_pref ? !self.checked : self.checked;
            switch(self.valueType) {
              case 'number':
                Preferences.setIntegerPref(self.pref,
                    Number(value), self.metric);
                break;
              case 'boolean':
                Preferences.setBooleanPref(self.pref,
                    value, self.metric);
                break;
            }
          });
    },

    /**
     * Sets up options in checkbox element.
     * @param {String} valueType The preference type for this checkbox.
     */
    initializeValueType: function(valueType) {
      this.valueType = valueType || 'boolean';
    },

    /**
     * See |updateDisabledState_| above.
     */
    setDisabled: function(reason, disabled) {
      updateDisabledState_(this, reason, disabled);
    },

    /**
     * This method is called first while processing an onchange event. If it
     * returns false, regular onchange processing continues (setting the
     * associated pref, etc). If it returns true, the rest of the onchange is
     * not performed. I.e., this works like stopPropagation or cancelBubble.
     * @param {Event} event Change event.
     */
    customChangeHandler: function(event) {
      return false;
    },
  };

  /**
   * The preference name.
   * @type {string}
   */
  lbm.defineProperty(PrefCheckbox, 'pref', lbm.PropertyKind.ATTR);

  /**
   * Whether the preference is controlled by something else than the user's
   * settings (either 'policy' or 'extension').
   * @type {string}
   */
  lbm.defineProperty(PrefCheckbox, 'controlledBy', lbm.PropertyKind.ATTR);

  /**
   * The user metric string.
   * @type {string}
   */
  lbm.defineProperty(PrefCheckbox, 'metric', lbm.PropertyKind.ATTR);

  /**
   * Whether to use inverted pref value.
   * @type {boolean}
   */
  lbm.defineProperty(PrefCheckbox, 'inverted_pref', lbm.PropertyKind.BOOL_ATTR);

  /////////////////////////////////////////////////////////////////////////////
  // PrefRadio class:

  //Define a constructor that uses an input element as its underlying element.
  var PrefRadio = lbm.ui.define('input');

  PrefRadio.prototype = {
    // Set up the prototype chain
    __proto__: HTMLInputElement.prototype,

    /**
     * Initialization function for the lbm.ui framework.
     */
    decorate: function() {
      this.type = 'radio';
      var self = this;

      // Listen to pref changes.
      Preferences.getInstance().addEventListener(this.pref,
          function(event) {
            var value = event.value && event.value['value'] != undefined ?
                event.value['value'] : event.value;
            self.checked = String(value) == self.value;

            updateElementState_(self, event);
          });

      // Listen to user events.
      this.addEventListener('change',
          function(e) {
            if(self.value == 'true' || self.value == 'false') {
              Preferences.setBooleanPref(self.pref,
                  self.value == 'true', self.metric);
            } else {
              Preferences.setIntegerPref(self.pref,
                  parseInt(self.value, 10), self.metric);
            }
          });
    },

    /**
     * See |updateDisabledState_| above.
     */
    setDisabled: function(reason, disabled) {
      updateDisabledState_(this, reason, disabled);
    },
  };

  /**
   * The preference name.
   * @type {string}
   */
  lbm.defineProperty(PrefRadio, 'pref', lbm.PropertyKind.ATTR);

  /**
   * Whether the preference is controlled by something else than the user's
   * settings (either 'policy' or 'extension').
   * @type {string}
   */
  lbm.defineProperty(PrefRadio, 'controlledBy', lbm.PropertyKind.ATTR);

  /**
   * The user metric string.
   * @type {string}
   */
  lbm.defineProperty(PrefRadio, 'metric', lbm.PropertyKind.ATTR);

  /////////////////////////////////////////////////////////////////////////////
  // PrefNumeric class:

  // Define a constructor that uses an input element as its underlying element.
  var PrefNumeric = function() {};
  PrefNumeric.prototype = {
    // Set up the prototype chain
    __proto__: HTMLInputElement.prototype,

    /**
     * Initialization function for the lbm.ui framework.
     */
    decorate: function() {
      var self = this;

      // Listen to pref changes.
      Preferences.getInstance().addEventListener(this.pref,
          function(event) {
            self.value = event.value && event.value['value'] != undefined ?
                event.value['value'] : event.value;

            updateElementState_(self, event);
          });

      // Listen to user events.
      this.addEventListener('change',
          function(e) {
            if (this.validity.valid) {
              Preferences.setIntegerPref(self.pref, self.value, self.metric);
            }
          });
    },

    /**
     * See |updateDisabledState_| above.
     */
    setDisabled: function(reason, disabled) {
      updateDisabledState_(this, reason, disabled);
    },
  };

  /**
   * The preference name.
   * @type {string}
   */
  lbm.defineProperty(PrefNumeric, 'pref', lbm.PropertyKind.ATTR);

  /**
   * Whether the preference is controlled by something else than the user's
   * settings (either 'policy' or 'extension').
   * @type {string}
   */
  lbm.defineProperty(PrefNumeric, 'controlledBy', lbm.PropertyKind.ATTR);

  /**
   * The user metric string.
   * @type {string}
   */
  lbm.defineProperty(PrefNumeric, 'metric', lbm.PropertyKind.ATTR);

  /////////////////////////////////////////////////////////////////////////////
  // PrefNumber class:

  // Define a constructor that uses an input element as its underlying element.
  var PrefNumber = lbm.ui.define('input');

  PrefNumber.prototype = {
    // Set up the prototype chain
    __proto__: PrefNumeric.prototype,

    /**
     * Initialization function for the lbm.ui framework.
     */
    decorate: function() {
      this.type = 'number';
      PrefNumeric.prototype.decorate.call(this);

      // Listen to user events.
      this.addEventListener('input',
          function(e) {
            if (this.validity.valid) {
              Preferences.setIntegerPref(self.pref, self.value, self.metric);
            }
          });
    },

    /**
     * See |updateDisabledState_| above.
     */
    setDisabled: function(reason, disabled) {
      updateDisabledState_(this, reason, disabled);
    },
  };

  /////////////////////////////////////////////////////////////////////////////
  // PrefRange class:

  // Define a constructor that uses an input element as its underlying element.
  var PrefRange = lbm.ui.define('input');

  PrefRange.prototype = {
    // Set up the prototype chain
    __proto__: HTMLInputElement.prototype,

    /**
     * The map from input range value to the corresponding preference value.
     */
    valueMap: undefined,

    /**
     * If true, the associated pref will be modified on each onchange event;
     * otherwise, the pref will only be modified on the onmouseup event after
     * the drag.
     */
    continuous: true,

    /**
     * Initialization function for the lbm.ui framework.
     */
    decorate: function() {
      this.type = 'range';

      // Update the UI when the pref changes.
      Preferences.getInstance().addEventListener(
          this.pref, this.onPrefChange_.bind(this));

      // Listen to user events.
      // TODO(jhawkins): Add onmousewheel handling once the associated WK bug is
      // fixed.
      // https://bugs.webkit.org/show_bug.cgi?id=52256
      this.onchange = this.onChange_.bind(this);
      this.onkeyup = this.onmouseup = this.onInputUp_.bind(this);
    },

    /**
     * Event listener that updates the UI when the underlying pref changes.
     * @param {Event} event The event that details the pref change.
     * @private
     */
    onPrefChange_: function(event) {
      var value = event.value && event.value['value'] != undefined ?
          event.value['value'] : event.value;
      if (value != undefined)
        this.value = this.valueMap ? this.valueMap.indexOf(value) : value;
    },

    /**
     * onchange handler that sets the pref when the user changes the value of
     * the input element.
     * @private
     */
    onChange_: function(event) {
      if (this.continuous)
        this.setRangePref_();

      if (this.notifyChange)
        this.notifyChange(this, this.mapValueToRange_(this.value));
    },

    /**
     * Sets the integer value of |pref| to the value of this element.
     * @private
     */
    setRangePref_: function() {
      Preferences.setIntegerPref(
          this.pref, this.mapValueToRange_(this.value), this.metric);

      if (this.notifyPrefChange)
        this.notifyPrefChange(this, this.mapValueToRange_(this.value));
    },

    /**
     * onkeyup/onmouseup handler that modifies the pref if |continuous| is
     * false.
     * @private
     */
    onInputUp_: function(event) {
      if (!this.continuous)
        this.setRangePref_();
    },

    /**
     * Maps the value of this element into the range provided by the client,
     * represented by |valueMap|.
     * @param {number} value The value to map.
     * @private
     */
    mapValueToRange_: function(value) {
      return this.valueMap ? this.valueMap[value] : value;
    },

    /**
     * Called when the client has specified non-continuous mode and the value of
     * the range control changes.
     * @param {Element} el This element.
     * @param {number} value The value of this element.
     */
    notifyChange: function(el, value) {
    },

    /**
     * See |updateDisabledState_| above.
     */
    setDisabled: function(reason, disabled) {
      updateDisabledState_(this, reason, disabled);
    },
  };

  /**
   * The preference name.
   * @type {string}
   */
  lbm.defineProperty(PrefRange, 'pref', lbm.PropertyKind.ATTR);

  /**
   * Whether the preference is controlled by something else than the user's
   * settings (either 'policy' or 'extension').
   * @type {string}
   */
  lbm.defineProperty(PrefRange, 'controlledBy', lbm.PropertyKind.ATTR);

  /**
   * The user metric string.
   * @type {string}
   */
  lbm.defineProperty(PrefRange, 'metric', lbm.PropertyKind.ATTR);

  /////////////////////////////////////////////////////////////////////////////
  // PrefSelect class:

  // Define a constructor that uses a select element as its underlying element.
  var PrefSelect = lbm.ui.define('select');

  PrefSelect.prototype = {
    // Set up the prototype chain
    __proto__: HTMLSelectElement.prototype,

    /**
    * Initialization function for the lbm.ui framework.
    */
    decorate: function() {
      var self = this;

      // Listen to pref changes.
      Preferences.getInstance().addEventListener(this.pref,
          function(event) {
            var value = event.value && event.value['value'] != undefined ?
                event.value['value'] : event.value;

            // Make sure |value| is a string, because the value is stored as a
            // string in the HTMLOptionElement.
            value = value.toString();

            updateElementState_(self, event);

            var found = false;
            for (var i = 0; i < self.options.length; i++) {
              if (self.options[i].value == value) {
                self.selectedIndex = i;
                found = true;
              }
            }

            // Item not found, select first item.
            if (!found)
              self.selectedIndex = 0;

            if (self.onchange != undefined)
              self.onchange(event);
          });

      // Listen to user events.
      this.addEventListener('change',
          function(e) {
            if (!self.dataType) {
              console.error('undefined data type for <select> pref');
              return;
            }

            switch(self.dataType) {
              case 'number':
                Preferences.setIntegerPref(self.pref,
                    self.options[self.selectedIndex].value, self.metric);
                break;
              case 'double':
                Preferences.setDoublePref(self.pref,
                    self.options[self.selectedIndex].value, self.metric);
                break;
              case 'boolean':
                var option = self.options[self.selectedIndex];
                var value = (option.value == 'true') ? true : false;
                Preferences.setBooleanPref(self.pref, value, self.metric);
                break;
              case 'string':
                Preferences.setStringPref(self.pref,
                    self.options[self.selectedIndex].value, self.metric);
                break;
              default:
                console.error('unknown data type for <select> pref: ' +
                              self.dataType);
            }
          });
    },

    /**
     * See |updateDisabledState_| above.
     */
    setDisabled: function(reason, disabled) {
      updateDisabledState_(this, reason, disabled);
    },
  };

  /**
   * The preference name.
   * @type {string}
   */
  lbm.defineProperty(PrefSelect, 'pref', lbm.PropertyKind.ATTR);

  /**
   * Whether the preference is controlled by something else than the user's
   * settings (either 'policy' or 'extension').
   * @type {string}
   */
  lbm.defineProperty(PrefSelect, 'controlledBy', lbm.PropertyKind.ATTR);

  /**
   * The user metric string.
   * @type {string}
   */
  lbm.defineProperty(PrefSelect, 'metric', lbm.PropertyKind.ATTR);

  /**
   * The data type for the preference options.
   * @type {string}
   */
  lbm.defineProperty(PrefSelect, 'dataType', lbm.PropertyKind.ATTR);

  /////////////////////////////////////////////////////////////////////////////
  // PrefTextField class:

  // Define a constructor that uses an input element as its underlying element.
  var PrefTextField = lbm.ui.define('input');

  PrefTextField.prototype = {
    // Set up the prototype chain
    __proto__: HTMLInputElement.prototype,

    /**
     * Initialization function for the lbm.ui framework.
     */
    decorate: function() {
      var self = this;

      // Listen to pref changes.
      Preferences.getInstance().addEventListener(this.pref,
          function(event) {
            self.value = event.value && event.value['value'] != undefined ?
                event.value['value'] : event.value;

            updateElementState_(self, event);
          });

      // Listen to user events.
      this.addEventListener('change',
          function(e) {
            switch(self.dataType) {
              case 'number':
                Preferences.setIntegerPref(self.pref, self.value, self.metric);
                break;
              case 'double':
                Preferences.setDoublePref(self.pref, self.value, self.metric);
                break;
              default:
                Preferences.setStringPref(self.pref, self.value, self.metric);
                break;
            }
          });

      window.addEventListener('unload',
          function() {
            if (document.activeElement == self)
              self.blur();
          });
    },

    /**
     * See |updateDisabledState_| above.
     */
    setDisabled: function(reason, disabled) {
      updateDisabledState_(this, reason, disabled);
    },
  };

  /**
   * The preference name.
   * @type {string}
   */
  lbm.defineProperty(PrefTextField, 'pref', lbm.PropertyKind.ATTR);

  /**
   * Whether the preference is controlled by something else than the user's
   * settings (either 'policy' or 'extension').
   * @type {string}
   */
  lbm.defineProperty(PrefTextField, 'controlledBy', lbm.PropertyKind.ATTR);

  /**
   * The user metric string.
   * @type {string}
   */
  lbm.defineProperty(PrefTextField, 'metric', lbm.PropertyKind.ATTR);

  /**
   * The data type for the preference options.
   * @type {string}
   */
  lbm.defineProperty(PrefTextField, 'dataType', lbm.PropertyKind.ATTR);

  /////////////////////////////////////////////////////////////////////////////
  // PrefButton class:

  // Define a constructor that uses a button element as its underlying element.
  var PrefButton = lbm.ui.define('button');

  PrefButton.prototype = {
    // Set up the prototype chain
    __proto__: HTMLButtonElement.prototype,

    /**
    * Initialization function for the lbm.ui framework.
    */
    decorate: function() {
      var self = this;

      // Listen to pref changes. This element behaves like a normal button and
      // doesn't affect the underlying preference; it just becomes disabled
      // when the preference is managed, and its value is false.
      // This is useful for buttons that should be disabled when the underlying
      // boolean preference is set to false by a policy or extension.
      Preferences.getInstance().addEventListener(this.pref,
          function(event) {
            var e = {
              value: {
                'disabled': event.value['disabled'] && !event.value['value'],
                'controlledBy': event.value['controlledBy']
              }
            };
            updateElementState_(self, e);
          });
    },

    /**
     * See |updateDisabledState_| above.
     */
    setDisabled: function(reason, disabled) {
      updateDisabledState_(this, reason, disabled);
    },
  };

  /**
   * The preference name.
   * @type {string}
   */
  lbm.defineProperty(PrefButton, 'pref', lbm.PropertyKind.ATTR);

  /**
   * Whether the preference is controlled by something else than the user's
   * settings (either 'policy' or 'extension').
   * @type {string}
   */
  lbm.defineProperty(PrefButton, 'controlledBy', lbm.PropertyKind.ATTR);

  // Export
  return {
    PrefCheckbox: PrefCheckbox,
    PrefNumber: PrefNumber,
    PrefNumeric: PrefNumeric,
    PrefRadio: PrefRadio,
    PrefRange: PrefRange,
    PrefSelect: PrefSelect,
    PrefTextField: PrefTextField,
    PrefButton: PrefButton
  };

});

// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {
  const List = lbm.ui.List;
  const ListItem = lbm.ui.ListItem;

  /**
   * Creates a deletable list item, which has a button that will trigger a call
   * to deleteItemAtIndex(index) in the list.
   */
  var DeletableItem = lbm.ui.define('li');

  DeletableItem.prototype = {
    __proto__: ListItem.prototype,

    /**
     * The element subclasses should populate with content.
     * @type {HTMLElement}
     * @private
     */
    contentElement_: null,

    /**
     * The close button element.
     * @type {HTMLElement}
     * @private
     */
    closeButtonElement_: null,

    /**
     * Whether or not this item can be deleted.
     * @type {boolean}
     * @private
     */
    deletable_: true,

    /** @inheritDoc */
    decorate: function() {
      ListItem.prototype.decorate.call(this);

      this.classList.add('deletable-item');

      this.contentElement_ = this.ownerDocument.createElement('div');
      this.appendChild(this.contentElement_);

      this.closeButtonElement_ = this.ownerDocument.createElement('button');
      this.closeButtonElement_.classList.add('raw-button');
      this.closeButtonElement_.classList.add('close-button');
      this.closeButtonElement_.addEventListener('mousedown',
                                                this.handleMouseDownUpOnClose_);
      this.closeButtonElement_.addEventListener('mouseup',
                                                this.handleMouseDownUpOnClose_);
      this.appendChild(this.closeButtonElement_);
    },

    /**
     * Returns the element subclasses should add content to.
     * @return {HTMLElement} The element subclasses should popuplate.
     */
    get contentElement() {
      return this.contentElement_;
    },

    /* Gets/sets the deletable property. An item that is not deletable doesn't
     * show the delete button (although space is still reserved for it).
     */
    get deletable() {
      return this.deletable_;
    },
    set deletable(value) {
      this.deletable_ = value;
      this.closeButtonElement_.disabled = !value;
    },

    /**
     * Don't let the list have a crack at the event. We don't want clicking the
     * close button to change the selection of the list.
     * @param {Event} e The mouse down/up event object.
     * @private
     */
    handleMouseDownUpOnClose_: function(e) {
      if (!e.target.disabled)
        e.stopPropagation();
    },
  };

  var DeletableItemList = lbm.ui.define('list');

  DeletableItemList.prototype = {
    __proto__: List.prototype,

    /** @inheritDoc */
    decorate: function() {
      List.prototype.decorate.call(this);
      this.addEventListener('click', this.handleClick_);
      this.addEventListener('keydown', this.handleKeyDown_);
    },

    /**
     * Callback for onclick events.
     * @param {Event} e The click event object.
     * @private
     */
    handleClick_: function(e) {
      if (this.disabled)
        return;

      var target = e.target;
      if (target.classList.contains('close-button')) {
        var listItem = this.getListItemAncestor(target);
        var selected = this.selectionModel.selectedIndexes;

        // Check if the list item that contains the close button being clicked
        // is not in the list of selected items. Only delete this item in that
        // case.
        var idx = this.getIndexOfListItem(listItem);
        if (selected.indexOf(idx) == -1) {
          this.deleteItemAtIndex(idx);
        } else {
          this.deleteSelectedItems_();
        }
      }
    },

    /**
     * Callback for keydown events.
     * @param {Event} e The keydown event object.
     * @private
     */
    handleKeyDown_: function(e) {
      // Map delete (and backspace on Mac) to item deletion (unless focus is
      // in an input field, where it's intended for text editing).
      if ((e.keyCode == 46 || (e.keyCode == 8 && lbm.isMac)) &&
          e.target.tagName != 'INPUT') {
        this.deleteSelectedItems_();
        // Prevent the browser from going back.
        e.preventDefault();
      }
    },

    /**
     * Deletes all the currently selected items that are deletable.
     * @private
     */
    deleteSelectedItems_: function() {
      var selected = this.selectionModel.selectedIndexes;
      // Reverse through the list of selected indexes to maintain the
      // correct index values after deletion.
      for (var j = selected.length - 1; j >= 0; j--) {
        var index = selected[j];
        if (this.getListItemByIndex(index).deletable)
          this.deleteItemAtIndex(index);
      }
    },

    /**
     * Called when an item should be deleted; subclasses are responsible for
     * implementing.
     * @param {number} index The index of the item that is being deleted.
     */
    deleteItemAtIndex: function(index) {
    },
  };

  return {
    DeletableItemList: DeletableItemList,
    DeletableItem: DeletableItem,
  };
});

// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {
  const DeletableItem = options.DeletableItem;
  const DeletableItemList = options.DeletableItemList;

  /**
   * Creates a new list item with support for inline editing.
   * @constructor
   * @extends {options.DeletableListItem}
   */
  function InlineEditableItem() {
    var el = lbm.doc.createElement('div');
    InlineEditableItem.decorate(el);
    return el;
  }

  /**
   * Decorates an element as a inline-editable list item. Note that this is
   * a subclass of DeletableItem.
   * @param {!HTMLElement} el The element to decorate.
   */
  InlineEditableItem.decorate = function(el) {
    el.__proto__ = InlineEditableItem.prototype;
    el.decorate();
  };

  InlineEditableItem.prototype = {
    __proto__: DeletableItem.prototype,

    /**
     * Whether or not this item can be edited.
     * @type {boolean}
     * @private
     */
    editable_: true,

    /**
     * Whether or not this is a placeholder for adding a new item.
     * @type {boolean}
     * @private
     */
    isPlaceholder_: false,

    /**
     * Fields associated with edit mode.
     * @type {array}
     * @private
     */
    editFields_: null,

    /**
     * Whether or not the current edit should be considered cancelled, rather
     * than committed, when editing ends.
     * @type {boolean}
     * @private
     */
    editCancelled_: true,

    /**
     * The editable item corresponding to the last click, if any. Used to decide
     * initial focus when entering edit mode.
     * @type {HTMLElement}
     * @private
     */
    editClickTarget_: null,

    /** @inheritDoc */
    decorate: function() {
      DeletableItem.prototype.decorate.call(this);

      this.editFields_ = [];
      this.addEventListener('mousedown', this.handleMouseDown_);
      this.addEventListener('keydown', this.handleKeyDown_);
      this.addEventListener('leadChange', this.handleLeadChange_);
    },

    /** @inheritDoc */
    selectionChanged: function() {
      this.updateEditState();
    },

    /**
     * Called when the input element receives focus. Selects this item in the
     * list selection model.
     * @private
     */
    handleFocus_: function() {
      var list = this.parentNode;
      var index = list.getIndexOfListItem(this);
      list.selectionModel.selectedIndex = index;
      list.selectionModel.anchorIndex = index;
    },

    /**
     * Called when this element gains or loses 'lead' status. Updates editing
     * mode accordingly.
     * @private
     */
    handleLeadChange_: function() {
      this.updateEditState();
    },

    /**
     * Updates the edit state based on the current selected and lead states.
     */
    updateEditState: function() {
      if (this.editable)
        this.editing = this.selected && this.lead;
    },

    /**
     * Whether the user is currently editing the list item.
     * @type {boolean}
     */
    get editing() {
      return this.hasAttribute('editing');
    },
    set editing(editing) {
      if (this.editing == editing)
        return;

      if (editing)
        this.setAttribute('editing', '');
      else
        this.removeAttribute('editing');

      if (editing) {
        this.editCancelled_ = false;

        lbm.dispatchSimpleEvent(this, 'edit', true);

        var focusElement = this.editClickTarget_ || this.initialFocusElement;
        this.editClickTarget_ = null;

        // When this is called in response to the selectedChange event,
        // the list grabs focus immediately afterwards. Thus we must delay
        // our focus grab.
        var self = this;
        if (focusElement) {
          window.setTimeout(function() {
            // Make sure we are still in edit mode by the time we execute.
            if (self.editing && self.focusPlaceholder) {
              focusElement.focus();
              focusElement.select();
            }
          }, 50);
        }
      } else {
        if (!this.editCancelled_ && this.hasBeenEdited &&
            this.currentInputIsValid) {
          if (this.isPlaceholder)
            this.parentNode.focusPlaceholder = true;

          this.updateStaticValues_();
          lbm.dispatchSimpleEvent(this, 'commitedit', true);
        } else {
          this.resetEditableValues_();
          lbm.dispatchSimpleEvent(this, 'canceledit', true);
        }
      }
    },

    /**
     * Whether the item is editable.
     * @type {boolean}
     */
    get editable() {
      return this.editable_;
    },
    set editable(editable) {
      this.editable_ = editable;
      if (!editable)
        this.editing = false;
    },

    /**
     * Whether the item is a new item placeholder.
     * @type {boolean}
     */
    get isPlaceholder() {
      return this.isPlaceholder_;
    },
    set isPlaceholder(isPlaceholder) {
      this.isPlaceholder_ = isPlaceholder;
      if (isPlaceholder)
        this.deletable = false;
    },

    /**
     * The HTML element that should have focus initially when editing starts,
     * if a specific element wasn't clicked.
     * Defaults to the first <input> element; can be overriden by subclasses if
     * a different element should be focused.
     * @type {HTMLElement}
     */
    get initialFocusElement() {
      return this.contentElement.querySelector('input');
    },

    /**
     * Whether the input in currently valid to submit. If this returns false
     * when editing would be submitted, either editing will not be ended,
     * or it will be cancelled, depending on the context.
     * Can be overrided by subclasses to perform input validation.
     * @type {boolean}
     */
    get currentInputIsValid() {
      return true;
    },

    /**
     * Returns true if the item has been changed by an edit.
     * Can be overrided by subclasses to return false when nothing has changed
     * to avoid unnecessary commits.
     * @type {boolean}
     */
    get hasBeenEdited() {
      return true;
    },

    /**
     * Returns a div containing an <input>, as well as static text if
     * isPlaceholder is not true.
     * @param {string} text The text of the cell.
     * @return {HTMLElement} The HTML element for the cell.
     * @private
     */
    createEditableTextCell: function(text) {
      var container = this.ownerDocument.createElement('div');

      if (!this.isPlaceholder) {
        var textEl = this.ownerDocument.createElement('div');
        textEl.className = 'static-text';
        textEl.textContent = text;
        textEl.setAttribute('displaymode', 'static');
        container.appendChild(textEl);
      }

      var inputEl = this.ownerDocument.createElement('input');
      inputEl.type = 'text';
      inputEl.value = text;
      if (!this.isPlaceholder) {
        inputEl.setAttribute('displaymode', 'edit');
        inputEl.staticVersion = textEl;
      } else {
        // At this point |this| is not attached to the parent list yet, so give
        // a short timeout in order for the attachment to occur.
        var self = this;
        window.setTimeout(function() {
          var list = self.parentNode;
          if (list && list.focusPlaceholder) {
            list.focusPlaceholder = false;
            if (list.shouldFocusPlaceholder())
              inputEl.focus();
          }
        }, 50);
      }

      inputEl.addEventListener('focus', this.handleFocus_.bind(this));
      container.appendChild(inputEl);
      this.editFields_.push(inputEl);

      return container;
    },

    /**
     * Resets the editable version of any controls created by createEditable*
     * to match the static text.
     * @private
     */
    resetEditableValues_: function() {
      var editFields = this.editFields_;
      for (var i = 0; i < editFields.length; i++) {
        var staticLabel = editFields[i].staticVersion;
        if (!staticLabel && !this.isPlaceholder)
          continue;

        if (editFields[i].tagName == 'INPUT') {
          editFields[i].value =
            this.isPlaceholder ? '' : staticLabel.textContent;
        }
        // Add more tag types here as new createEditable* methods are added.

        editFields[i].setCustomValidity('');
      }
    },

    /**
     * Sets the static version of any controls created by createEditable*
     * to match the current value of the editable version. Called on commit so
     * that there's no flicker of the old value before the model updates.
     * @private
     */
    updateStaticValues_: function() {
      var editFields = this.editFields_;
      for (var i = 0; i < editFields.length; i++) {
        var staticLabel = editFields[i].staticVersion;
        if (!staticLabel)
          continue;

        if (editFields[i].tagName == 'INPUT')
          staticLabel.textContent = editFields[i].value;
        // Add more tag types here as new createEditable* methods are added.
      }
    },

    /**
     * Called a key is pressed. Handles committing and cancelling edits.
     * @param {Event} e The key down event.
     * @private
     */
    handleKeyDown_: function(e) {
      if (!this.editing)
        return;

      var endEdit = false;
      switch (e.keyIdentifier) {
        case 'U+001B':  // Esc
          this.editCancelled_ = true;
          endEdit = true;
          break;
        case 'Enter':
          if (this.currentInputIsValid)
            endEdit = true;
          break;
      }

      if (endEdit) {
        // Blurring will trigger the edit to end; see InlineEditableItemList.
        this.ownerDocument.activeElement.blur();
        // Make sure that handled keys aren't passed on and double-handled.
        // (e.g., esc shouldn't both cancel an edit and close a subpage)
        e.stopPropagation();
      }
    },

    /**
     * Called when the list item is clicked. If the click target corresponds to
     * an editable item, stores that item to focus when edit mode is started.
     * @param {Event} e The mouse down event.
     * @private
     */
    handleMouseDown_: function(e) {
      if (!this.editable || this.editing)
        return;

      var clickTarget = e.target;
      var editFields = this.editFields_;
      for (var i = 0; i < editFields.length; i++) {
        if (editFields[i] == clickTarget ||
            editFields[i].staticVersion == clickTarget) {
          this.editClickTarget_ = editFields[i];
          return;
        }
      }
    },
  };

  /**
   * Takes care of committing changes to inline editable list items when the
   * window loses focus.
   */
  function handleWindowBlurs() {
    window.addEventListener('blur', function(e) {
      var itemAncestor = findAncestor(document.activeElement, function(node) {
        return node instanceof InlineEditableItem;
      });
      if (itemAncestor);
        document.activeElement.blur();
    });
  }
  handleWindowBlurs();

  var InlineEditableItemList = lbm.ui.define('list');

  InlineEditableItemList.prototype = {
    __proto__: DeletableItemList.prototype,

    /**
     * Focuses the input element of the placeholder if true.
     * @type {boolean}
     */
    focusPlaceholder: false,

    /** @inheritDoc */
    decorate: function() {
      DeletableItemList.prototype.decorate.call(this);
      this.setAttribute('inlineeditable', '');
      this.addEventListener('hasElementFocusChange',
                            this.handleListFocusChange_);
    },

    /**
     * Called when the list hierarchy as a whole loses or gains focus; starts
     * or ends editing for the lead item if necessary.
     * @param {Event} e The change event.
     * @private
     */
    handleListFocusChange_: function(e) {
      var leadItem = this.getListItemByIndex(this.selectionModel.leadIndex);
      if (leadItem) {
        if (e.newValue)
          leadItem.updateEditState();
        else
          leadItem.editing = false;
      }
    },

    /**
     * May be overridden by subclasses to disable focusing the placeholder.
     * @return true if the placeholder element should be focused on edit commit.
     */
    shouldFocusPlaceholder: function() {
      return true;
    },
  };

  // Export
  return {
    InlineEditableItem: InlineEditableItem,
    InlineEditableItemList: InlineEditableItemList,
  };
});

// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {
  /////////////////////////////////////////////////////////////////////////////
  // OptionsPage class:

  /**
   * Base class for options page.
   * @constructor
   * @param {string} name Options page name, also defines id of the div element
   *     containing the options view and the name of options page navigation bar
   *     item as name+'PageNav'.
   * @param {string} title Options page title, used for navigation bar
   * @extends {EventTarget}
   */
  function OptionsPage(name, title, pageDivName) {
    this.name = name;
    this.title = title;
    this.pageDivName = pageDivName;
    this.pageDiv = $(this.pageDivName);
    this.tab = null;
  }

  const SUBPAGE_SHEET_COUNT = 2;

  /**
   * Main level option pages. Maps lower-case page names to the respective page
   * object.
   * @protected
   */
  OptionsPage.registeredPages = {};

  /**
   * Pages which are meant to behave like modal dialogs. Maps lower-case overlay
   * names to the respective overlay object.
   * @protected
   */
  OptionsPage.registeredOverlayPages = {};

  /**
   * Whether or not |initialize| has been called.
   * @private
   */
  OptionsPage.initialized_ = false;

  /**
   * Gets the default page (to be shown on initial load).
   */
  OptionsPage.getDefaultPage = function() {
    return BrowserOptions.getInstance();
  };

  /**
   * Shows the default page.
   */
  OptionsPage.showDefaultPage = function() {
    this.navigateToPage(this.getDefaultPage().name);
  };

  /**
   * "Navigates" to a page, meaning that the page will be shown and the
   * appropriate entry is placed in the history.
   * @param {string} pageName Page name.
   */
  OptionsPage.navigateToPage = function(pageName) {
    this.showPageByName(pageName, true);
  };

  /**
   * Shows a registered page. This handles both top-level pages and sub-pages.
   * @param {string} pageName Page name.
   * @param {boolean} updateHistory True if we should update the history after
   *     showing the page.
   * @private
   */
  OptionsPage.showPageByName = function(pageName, updateHistory) {
    // Find the currently visible root-level page.
    var rootPage = null;
    for (var name in this.registeredPages) {
      var page = this.registeredPages[name];
      if (page.visible && !page.parentPage) {
        rootPage = page;
        break;
      }
    }

    // Find the target page.
    var targetPage = this.registeredPages[pageName.toLowerCase()];
    if (!targetPage || !targetPage.canShowPage()) {
      // If it's not a page, try it as an overlay.
      if (!targetPage && this.showOverlay_(pageName, rootPage)) {
        if (updateHistory)
          this.updateHistoryState_();
        return;
      } else {
        targetPage = this.getDefaultPage();
      }
    }

    pageName = targetPage.name.toLowerCase();

    // Determine if the root page is 'sticky', meaning that it
    // shouldn't change when showing a sub-page.  This can happen for special
    // pages like Search.
    var isRootPageLocked =
        rootPage && rootPage.sticky && targetPage.parentPage;

    // Notify pages if they will be hidden.
    for (var name in this.registeredPages) {
      var page = this.registeredPages[name];
      if (!page.parentPage && isRootPageLocked)
        continue;
      if (page.willHidePage && name != pageName &&
          !page.isAncestorOfPage(targetPage))
        page.willHidePage();
    }

    var prevVisible = false;

    // Update visibilities to show only the hierarchy of the target page.
    for (var name in this.registeredPages) {
      var page = this.registeredPages[name];
      if (!page.parentPage && isRootPageLocked)
        continue;
      prevVisible = page.visible;
      page.visible = name == pageName ||
          (!document.documentElement.classList.contains('hide-menu') &&
           page.isAncestorOfPage(targetPage));
    }

    // Update the history and current location.
    if (updateHistory)
      this.updateHistoryState_();

    // Always update the page title.
    document.title = targetPage.title;

    // Notify pages if they were shown.
    for (var name in this.registeredPages) {
      var page = this.registeredPages[name];
      if (!page.parentPage && isRootPageLocked)
        continue;
      if (!prevVisible && page.didShowPage && (name == pageName ||
          page.isAncestorOfPage(targetPage)))
        page.didShowPage();
    }
  };

  /**
   * Updates the visibility and stacking order of the subpage backdrop
   * according to which subpage is topmost and visible.
   * @private
   */
  OptionsPage.updateSubpageBackdrop_ = function () {
    var topmostPage = this.getTopmostVisibleNonOverlayPage_();
    var nestingLevel = topmostPage ? topmostPage.nestingLevel : 0;

    var subpageBackdrop = $('subpage-backdrop');
    if (nestingLevel > 0) {
      var container = $('subpage-sheet-container-' + nestingLevel);
      subpageBackdrop.style.zIndex =
          parseInt(window.getComputedStyle(container).zIndex) - 1;
      subpageBackdrop.hidden = false;
    } else {
      subpageBackdrop.hidden = true;
    }
  };

  /**
   * Pushes the current page onto the history stack, overriding the last page
   * if it is the generic chrome://settings/.
   * @private
   */
  OptionsPage.updateHistoryState_ = function() {
    var page = this.getTopmostVisiblePage();
    var path = location.pathname;
    if (path)
      path = path.slice(1).replace(/\/$/, '');  // Remove trailing slash.
    // The page is already in history (the user may have clicked the same link
    // twice). Do nothing.
    if (path == page.name)
      return;

    // If there is no path, the current location is chrome://settings/.
    // Override this with the new page.
    var historyFunction = path ? window.history.pushState :
                                 window.history.replaceState;
    historyFunction.call(window.history,
                         {pageName: page.name},
                         page.title,
                         '/' + page.name);
    // Update tab title.
    document.title = page.title;
  };

  /**
   * Shows a registered Overlay page. Does not update history.
   * @param {string} overlayName Page name.
   * @param {OptionPage} rootPage The currently visible root-level page.
   * @return {boolean} whether we showed an overlay.
   */
  OptionsPage.showOverlay_ = function(overlayName, rootPage) {
    var overlay = this.registeredOverlayPages[overlayName.toLowerCase()];
    if (!overlay || !overlay.canShowPage())
      return false;

    if ((!rootPage || !rootPage.sticky) && overlay.parentPage)
      this.showPageByName(overlay.parentPage.name, false);

    if (!overlay.visible) {
      overlay.visible = true;
      if (overlay.didShowPage) overlay.didShowPage();
    }

    return true;
  };

  /**
   * Returns whether or not an overlay is visible.
   * @return {boolean} True if an overlay is visible.
   * @private
   */
  OptionsPage.isOverlayVisible_ = function() {
    return this.getVisibleOverlay_() != null;
  };

  /**
   * Returns the currently visible overlay, or null if no page is visible.
   * @return {OptionPage} The visible overlay.
   */
  OptionsPage.getVisibleOverlay_ = function() {
    for (var name in this.registeredOverlayPages) {
      var page = this.registeredOverlayPages[name];
      if (page.visible)
        return page;
    }
    return null;
  };

  /**
   * Closes the visible overlay. Updates the history state after closing the
   * overlay.
   */
  OptionsPage.closeOverlay = function() {
    var overlay = this.getVisibleOverlay_();
    if (!overlay)
      return;

    overlay.visible = false;
    if (overlay.didClosePage) overlay.didClosePage();
    this.updateHistoryState_();
  };

  /**
   * Hides the visible overlay. Does not affect the history state.
   * @private
   */
  OptionsPage.hideOverlay_ = function() {
    var overlay = this.getVisibleOverlay_();
    if (overlay)
      overlay.visible = false;
  };

  /**
   * Returns the topmost visible page (overlays excluded).
   * @return {OptionPage} The topmost visible page aside any overlay.
   * @private
   */
  OptionsPage.getTopmostVisibleNonOverlayPage_ = function() {
    var topPage = null;
    for (var name in this.registeredPages) {
      var page = this.registeredPages[name];
      if (page.visible &&
          (!topPage || page.nestingLevel > topPage.nestingLevel))
        topPage = page;
    }

    return topPage;
  };

  /**
   * Returns the topmost visible page, or null if no page is visible.
   * @return {OptionPage} The topmost visible page.
   */
  OptionsPage.getTopmostVisiblePage = function() {
    // Check overlays first since they're top-most if visible.
    return this.getVisibleOverlay_() || this.getTopmostVisibleNonOverlayPage_();
  };

  /**
   * Closes the topmost open subpage, if any.
   * @private
   */
  OptionsPage.closeTopSubPage_ = function() {
    var topPage = this.getTopmostVisiblePage();
    if (topPage && !topPage.isOverlay && topPage.parentPage) {
      if (topPage.willHidePage)
        topPage.willHidePage();
      topPage.visible = false;
    }

    this.updateHistoryState_();
  };

  /**
   * Closes all subpages below the given level.
   * @param {number} level The nesting level to close below.
   */
  OptionsPage.closeSubPagesToLevel = function(level) {
    var topPage = this.getTopmostVisiblePage();
    while (topPage && topPage.nestingLevel > level) {
      if (topPage.willHidePage)
        topPage.willHidePage();
      topPage.visible = false;
      topPage = topPage.parentPage;
    }

    this.updateHistoryState_();
  };

  /**
   * Updates managed banner visibility state based on the topmost page.
   */
  OptionsPage.updateManagedBannerVisibility = function() {
    var topPage = this.getTopmostVisiblePage();
    if (topPage)
      topPage.updateManagedBannerVisibility();
  };

  /**
  * Shows the tab contents for the given navigation tab.
  * @param {!Element} tab The tab that the user clicked.
  */
  OptionsPage.showTab = function(tab) {
    // Search parents until we find a tab, or the nav bar itself. This allows
    // tabs to have child nodes, e.g. labels in separately-styled spans.
    while (tab && !tab.classList.contains('subpages-nav-tabs') &&
           !tab.classList.contains('tab')) {
      tab = tab.parentNode;
    }
    if (!tab || !tab.classList.contains('tab'))
      return;

    // Find tab bar of the tab.
    var tabBar = tab;
    while (tabBar && !tabBar.classList.contains('subpages-nav-tabs')) {
      tabBar = tabBar.parentNode;
    }
    if (!tabBar)
      return;

    if (tabBar.activeNavTab != null) {
      tabBar.activeNavTab.classList.remove('active-tab');
      $(tabBar.activeNavTab.getAttribute('tab-contents')).classList.
          remove('active-tab-contents');
    }

    tab.classList.add('active-tab');
    $(tab.getAttribute('tab-contents')).classList.add('active-tab-contents');
    tabBar.activeNavTab = tab;
  };

  /**
   * Registers new options page.
   * @param {OptionsPage} page Page to register.
   */
  OptionsPage.register = function(page) {
    this.registeredPages[page.name.toLowerCase()] = page;
    // Create and add new page <li> element to navbar.
    var pageNav = document.createElement('li');
    pageNav.id = page.name + 'PageNav';
    pageNav.className = 'navbar-item';
    pageNav.setAttribute('pageName', page.name);
    pageNav.setAttribute('role', 'tab');
    pageNav.textContent = page.pageDiv.querySelector('h1').textContent;
    pageNav.tabIndex = -1;
    pageNav.onclick = function(event) {
      OptionsPage.navigateToPage(this.getAttribute('pageName'));
    };
    pageNav.onkeydown = function(event) {
        if ((event.keyCode == 37 || event.keyCode==38) &&
             this.previousSibling && this.previousSibling.onkeydown) {
        // Left and up arrow moves back one tab.
        OptionsPage.navigateToPage(
            this.previousSibling.getAttribute('pageName'));
        this.previousSibling.focus();
        } else if ((event.keyCode == 39 || event.keyCode == 40) &&
                    this.nextSibling) {
        // Right and down arrows move forward one tab.
        OptionsPage.navigateToPage(this.nextSibling.getAttribute('pageName'));
        this.nextSibling.focus();
      }
    };
    pageNav.onkeypress = function(event) {
      // Enter or space
      if (event.keyCode == 13 || event.keyCode == 32) {
        OptionsPage.navigateToPage(this.getAttribute('pageName'));
      }
    };
    var navbar = $('navbar');
    navbar.appendChild(pageNav);
    page.tab = pageNav;
    page.initializePage();
  };

  /**
   * Find an enclosing section for an element if it exists.
   * @param {Element} element Element to search.
   * @return {OptionPage} The section element, or null.
   * @private
   */
  OptionsPage.findSectionForNode_ = function(node) {
    while (node = node.parentNode) {
      if (node.nodeName == 'SECTION')
        return node;
    }
    return null;
  };

  /**
   * Registers a new Sub-page.
   * @param {OptionsPage} subPage Sub-page to register.
   * @param {OptionsPage} parentPage Associated parent page for this page.
   * @param {Array} associatedControls Array of control elements that lead to
   *     this sub-page. The first item is typically a button in a root-level
   *     page. There may be additional buttons for nested sub-pages.
   */
  OptionsPage.registerSubPage = function(subPage,
                                         parentPage,
                                         associatedControls) {
    this.registeredPages[subPage.name.toLowerCase()] = subPage;
    subPage.parentPage = parentPage;
    if (associatedControls) {
      subPage.associatedControls = associatedControls;
      if (associatedControls.length) {
        subPage.associatedSection =
            this.findSectionForNode_(associatedControls[0]);
      }
    }
    subPage.tab = undefined;
    subPage.initializePage();
  };

  /**
   * Registers a new Overlay page.
   * @param {OptionsPage} overlay Overlay to register.
   * @param {OptionsPage} parentPage Associated parent page for this overlay.
   * @param {Array} associatedControls Array of control elements associated with
   *   this page.
   */
  OptionsPage.registerOverlay = function(overlay,
                                         parentPage,
                                         associatedControls) {
    this.registeredOverlayPages[overlay.name.toLowerCase()] = overlay;
    overlay.parentPage = parentPage;
    if (associatedControls) {
      overlay.associatedControls = associatedControls;
      if (associatedControls.length) {
        overlay.associatedSection =
            this.findSectionForNode_(associatedControls[0]);
      }
    }
    overlay.tab = undefined;
    overlay.isOverlay = true;
    overlay.initializePage();
  };

  /**
   * Callback for window.onpopstate.
   * @param {Object} data State data pushed into history.
   */
  OptionsPage.setState = function(data) {
    if (data && data.pageName) {
      // It's possible an overlay may be the last top-level page shown.
      if (this.isOverlayVisible_() &&
          !this.registeredOverlayPages[data.pageName.toLowerCase()]) {
        this.hideOverlay_();
      }

      this.showPageByName(data.pageName, false);
    }
  };

  /**
   * Callback for window.onbeforeunload. Used to notify overlays that they will
   * be closed.
   */
  OptionsPage.willClose = function() {
    var overlay = this.getVisibleOverlay_();
    if (overlay && overlay.didClosePage)
      overlay.didClosePage();
  };

  /**
   * Freezes/unfreezes the scroll position of given level's page container.
   * @param {boolean} freeze Whether the page should be frozen.
   * @param {number} level The level to freeze/unfreeze.
   * @private
   */
  OptionsPage.setPageFrozenAtLevel_ = function(freeze, level) {
    var container = level == 0 ? $('page-container')
                               : $('subpage-sheet-container-' + level);

    if (container.classList.contains('frozen') == freeze)
      return;

    if (freeze) {
      var scrollPosition = document.body.scrollTop;
      // Lock the width, since auto width computation may change.
      container.style.width = window.getComputedStyle(container).width;
      container.classList.add('frozen');
      container.style.top = -scrollPosition + 'px';
      this.updateFrozenElementHorizontalPosition_(container);
    } else {
      var scrollPosition = - parseInt(container.style.top, 10);
      container.classList.remove('frozen');
      container.style.top = '';
      container.style.left = '';
      container.style.right = '';
      container.style.width = '';
      // Restore the scroll position.
      if (!container.hidden)
        window.scroll(document.body.scrollLeft, scrollPosition);
    }
  };

  /**
   * Freezes/unfreezes the scroll position of visible pages based on the current
   * page stack.
   */
  OptionsPage.updatePageFreezeStates = function() {
    var topPage = OptionsPage.getTopmostVisiblePage();
    if (!topPage)
      return;
    var nestingLevel = topPage.isOverlay ? 100 : topPage.nestingLevel;
    for (var i = 0; i <= SUBPAGE_SHEET_COUNT; i++) {
      this.setPageFrozenAtLevel_(i < nestingLevel, i);
    }
  };

  /**
   * Initializes the complete options page.  This will cause all C++ handlers to
   * be invoked to do final setup.
   */
  OptionsPage.initialize = function() {
    chrome.send('coreOptionsInitialize');
    this.initialized_ = true;

    document.addEventListener('scroll', this.handleScroll_.bind(this));
    window.addEventListener('resize', this.handleResize_.bind(this));

    if (!document.documentElement.classList.contains('hide-menu')) {
      // Close subpages if the user clicks on the html body. Listen in the
      // capturing phase so that we can stop the click from doing anything.
      document.body.addEventListener('click',
                                     this.bodyMouseEventHandler_.bind(this),
                                     true);
      // We also need to cancel mousedowns on non-subpage content.
      document.body.addEventListener('mousedown',
                                     this.bodyMouseEventHandler_.bind(this),
                                     true);

      var self = this;
      // Hook up the close buttons.
      subpageCloseButtons = document.querySelectorAll('.close-subpage');
      for (var i = 0; i < subpageCloseButtons.length; i++) {
        subpageCloseButtons[i].onclick = function() {
          self.closeTopSubPage_();
        };
      };

      // Install handler for key presses.
      document.addEventListener('keydown',
                                this.keyDownEventHandler_.bind(this));

      document.addEventListener('focus', this.manageFocusChange_.bind(this),
                                true);
    }

    // Calculate and store the horizontal locations of elements that may be
    // frozen later.
    var sidebarWidth =
        parseInt(window.getComputedStyle($('mainview')).webkitPaddingStart, 10);
    $('page-container').horizontalOffset = sidebarWidth +
        parseInt(window.getComputedStyle(
            $('mainview-content')).webkitPaddingStart, 10);
    for (var level = 1; level <= SUBPAGE_SHEET_COUNT; level++) {
      var containerId = 'subpage-sheet-container-' + level;
      $(containerId).horizontalOffset = sidebarWidth;
    }
    $('subpage-backdrop').horizontalOffset = sidebarWidth;
    // Trigger the resize handler manually to set the initial state.
    this.handleResize_(null);
  };

  /**
   * Does a bounds check for the element on the given x, y client coordinates.
   * @param {Element} e The DOM element.
   * @param {number} x The client X to check.
   * @param {number} y The client Y to check.
   * @return {boolean} True if the point falls within the element's bounds.
   * @private
   */
  OptionsPage.elementContainsPoint_ = function(e, x, y) {
    var clientRect = e.getBoundingClientRect();
    return x >= clientRect.left && x <= clientRect.right &&
        y >= clientRect.top && y <= clientRect.bottom;
  };

  /**
   * Called when focus changes; ensures that focus doesn't move outside
   * the topmost subpage/overlay.
   * @param {Event} e The focus change event.
   * @private
   */
  OptionsPage.manageFocusChange_ = function(e) {
    var focusableItemsRoot;
    var topPage = this.getTopmostVisiblePage();
    if (!topPage)
      return;

    if (topPage.isOverlay) {
      // If an overlay is visible, that defines the tab loop.
      focusableItemsRoot = topPage.pageDiv;
    } else {
      // If a subpage is visible, use its parent as the tab loop constraint.
      // (The parent is used because it contains the close button.)
      if (topPage.nestingLevel > 0)
        focusableItemsRoot = topPage.pageDiv.parentNode;
    }

    if (focusableItemsRoot && !focusableItemsRoot.contains(e.target))
      topPage.focusFirstElement();
  };

  /**
   * Called when the page is scrolled; moves elements that are position:fixed
   * but should only behave as if they are fixed for vertical scrolling.
   * @param {Event} e The scroll event.
   * @private
   */
  OptionsPage.handleScroll_ = function(e) {
    var scrollHorizontalOffset = document.body.scrollLeft;
    // position:fixed doesn't seem to work for horizontal scrolling in RTL mode,
    // so only adjust in LTR mode (where scroll values will be positive).
    if (scrollHorizontalOffset >= 0) {
      $('navbar-container').style.left = -scrollHorizontalOffset + 'px';
      var subpageBackdrop = $('subpage-backdrop');
      subpageBackdrop.style.left = subpageBackdrop.horizontalOffset -
          scrollHorizontalOffset + 'px';
      this.updateAllFrozenElementPositions_();
    }
  };

  /**
   * Updates all frozen pages to match the horizontal scroll position.
   * @private
   */
  OptionsPage.updateAllFrozenElementPositions_ = function() {
    var frozenElements = document.querySelectorAll('.frozen');
    for (var i = 0; i < frozenElements.length; i++) {
      this.updateFrozenElementHorizontalPosition_(frozenElements[i]);
    }
  };

  /**
   * Updates the given frozen element to match the horizontal scroll position.
   * @param {HTMLElement} e The frozen element to update
   * @private
   */
  OptionsPage.updateFrozenElementHorizontalPosition_ = function(e) {
    if (document.documentElement.dir == 'rtl')
      e.style.right = e.horizontalOffset + 'px';
    else
      e.style.left = e.horizontalOffset - document.body.scrollLeft + 'px';
  };

  /**
   * Called when the page is resized; adjusts the size of elements that depend
   * on the veiwport.
   * @param {Event} e The resize event.
   * @private
   */
  OptionsPage.handleResize_ = function(e) {
    // Set an explicit height equal to the viewport on all the subpage
    // containers shorter than the viewport. This is used instead of
    // min-height: 100% so that there is an explicit height for the subpages'
    // min-height: 100%.
    var viewportHeight = document.documentElement.clientHeight;
    var subpageContainers =
        document.querySelectorAll('.subpage-sheet-container');
    for (var i = 0; i < subpageContainers.length; i++) {
      if (subpageContainers[i].scrollHeight > viewportHeight)
        subpageContainers[i].style.removeProperty('height');
      else
        subpageContainers[i].style.height = viewportHeight + 'px';
    }
  };

  /**
   * A function to handle mouse events (mousedown or click) on the html body by
   * closing subpages and/or stopping event propagation.
   * @return {Event} a mousedown or click event.
   * @private
   */
  OptionsPage.bodyMouseEventHandler_ = function(event) {
    // Do nothing if a subpage isn't showing.
    var topPage = this.getTopmostVisiblePage();
    if (!topPage || topPage.isOverlay || !topPage.parentPage)
      return;

    // Don't close subpages if a user is clicking in a select element.
    // This is necessary because WebKit sends click events with strange
    // coordinates when a user selects a new entry in a select element.
    // See: http://crbug.com/87199
    if (event.srcElement.nodeName == 'SELECT')
      return;

    // Do nothing if the client coordinates are not within the source element.
    // This occurs if the user toggles a checkbox by pressing spacebar.
    // This is a workaround to prevent keyboard events from closing the window.
    // See: crosbug.com/15678
    if (event.clientX == -document.body.scrollLeft &&
        event.clientY == -document.body.scrollTop) {
      return;
    }

    // Don't interfere with navbar clicks.
    if ($('navbar').contains(event.target))
      return;

    // Figure out which page the click happened in.
    for (var level = topPage.nestingLevel; level >= 0; level--) {
      var clickIsWithinLevel = level == 0 ? true :
          OptionsPage.elementContainsPoint_(
              $('subpage-sheet-' + level), event.clientX, event.clientY);

      if (!clickIsWithinLevel)
        continue;

      // Event was within the topmost page; do nothing.
      if (topPage.nestingLevel == level)
        return;

      // Block propgation of both clicks and mousedowns, but only close subpages
      // on click.
      if (event.type == 'click')
        this.closeSubPagesToLevel(level);
      event.stopPropagation();
      event.preventDefault();
      return;
    }
  };

  /**
   * A function to handle key press events.
   * @return {Event} a keydown event.
   * @private
   */
  OptionsPage.keyDownEventHandler_ = function(event) {
    // Close the top overlay or sub-page on esc.
    if (event.keyCode == 27) {  // Esc
      if (this.isOverlayVisible_())
        this.closeOverlay();
      else
        this.closeTopSubPage_();
    }
  };

  OptionsPage.setClearPluginLSODataEnabled = function(enabled) {
    if (enabled) {
      document.documentElement.setAttribute(
          'flashPluginSupportsClearSiteData', '');
    } else {
      document.documentElement.removeAttribute(
          'flashPluginSupportsClearSiteData');
    }
  };

  /**
   * Re-initializes the C++ handlers if necessary. This is called if the
   * handlers are torn down and recreated but the DOM may not have been (in
   * which case |initialize| won't be called again). If |initialize| hasn't been
   * called, this does nothing (since it will be later, once the DOM has
   * finished loading).
   */
  OptionsPage.reinitializeCore = function() {
    if (this.initialized_)
      chrome.send('coreOptionsInitialize');
  }

  OptionsPage.prototype = {
    __proto__: lbm.EventTarget.prototype,

    /**
     * The parent page of this option page, or null for top-level pages.
     * @type {OptionsPage}
     */
    parentPage: null,

    /**
     * The section on the parent page that is associated with this page.
     * Can be null.
     * @type {Element}
     */
    associatedSection: null,

    /**
     * An array of controls that are associated with this page.  The first
     * control should be located on a top-level page.
     * @type {OptionsPage}
     */
    associatedControls: null,

    /**
     * Initializes page content.
     */
    initializePage: function() {},

    /**
     * Updates managed banner visibility state. This function iterates over
     * all input fields of a window and if any of these is marked as managed
     * it triggers the managed banner to be visible. The banner can be enforced
     * being on through the managed flag of this class but it can not be forced
     * being off if managed items exist.
     */
    updateManagedBannerVisibility: function() {
      var bannerDiv = $('managed-prefs-banner');

      var controlledByPolicy = false;
      var controlledByExtension = false;
      var inputElements = this.pageDiv.querySelectorAll('input[controlledBy]');
      for (var i = 0, len = inputElements.length; i < len; i++) {
        if (inputElements[i].controlledBy == 'policy')
          controlledByPolicy = true;
        else if (inputElements[i].controlledBy == 'extension')
          controlledByExtension = true;
      }
      if (!controlledByPolicy && !controlledByExtension) {
        bannerDiv.hidden = true;
        $('subpage-backdrop').style.top = '0';
      } else {
        bannerDiv.hidden = false;
        var height = window.getComputedStyle(bannerDiv).height;
        $('subpage-backdrop').style.top = height;
        if (controlledByPolicy && !controlledByExtension) {
          $('managed-prefs-text').textContent =
              templateData.policyManagedPrefsBannerText;
        } else if (!controlledByPolicy && controlledByExtension) {
          $('managed-prefs-text').textContent =
              templateData.extensionManagedPrefsBannerText;
        } else if (controlledByPolicy && controlledByExtension) {
          $('managed-prefs-text').textContent =
              templateData.policyAndExtensionManagedPrefsBannerText;
        }
      }
    },

    /**
     * Gets page visibility state.
     */
    get visible() {
      return !this.pageDiv.hidden;
    },

    /**
     * Sets page visibility.
     */
    set visible(visible) {
      if ((this.visible && visible) || (!this.visible && !visible))
        return;

      this.setContainerVisibility_(visible);
      if (visible) {
        this.pageDiv.hidden = false;

        if (this.tab) {
          this.tab.classList.add('navbar-item-selected');
          this.tab.setAttribute('aria-selected', 'true');
          this.tab.tabIndex = 0;
        }
      } else {
        this.pageDiv.hidden = true;

        if (this.tab) {
          this.tab.classList.remove('navbar-item-selected');
          this.tab.setAttribute('aria-selected', 'false');
          this.tab.tabIndex = -1;
        }
      }

      OptionsPage.updatePageFreezeStates();

      // A subpage was shown or hidden.
      if (!this.isOverlay && this.nestingLevel > 0) {
        OptionsPage.updateSubpageBackdrop_();
        if (visible) {
          // Scroll to the top of the newly-opened subpage.
          window.scroll(document.body.scrollLeft, 0)
        }
      }

      // The managed prefs banner is global, so after any visibility change
      // update it based on the topmost page, not necessarily this page
      // (e.g., if an ancestor is made visible after a child).
      OptionsPage.updateManagedBannerVisibility();

      lbm.dispatchPropertyChange(this, 'visible', visible, !visible);
    },

    /**
     * Shows or hides this page's container.
     * @param {boolean} visible Whether the container should be visible or not.
     * @private
     */
    setContainerVisibility_: function(visible) {
      var container = null;
      if (this.isOverlay) {
        container = $('overlay');
      } else {
        var nestingLevel = this.nestingLevel;
        if (nestingLevel > 0)
          container = $('subpage-sheet-container-' + nestingLevel);
      }
      var isSubpage = !this.isOverlay;

      if (!container)
        return;

      if (container.hidden != visible) {
        if (visible) {
          // If the container is set hidden and then immediately set visible
          // again, the fadeCompleted_ callback would cause it to be erroneously
          // hidden again. Removing the transparent tag avoids that.
          container.classList.remove('transparent');
        }
        return;
      }

      if (visible) {
        container.hidden = false;
        if (isSubpage) {
          var computedStyle = window.getComputedStyle(container);
          container.style.WebkitPaddingStart =
              parseInt(computedStyle.WebkitPaddingStart, 10) + 100 + 'px';
        }
        // Separate animating changes from the removal of display:none.
        window.setTimeout(function() {
          container.classList.remove('transparent');
          if (isSubpage)
            container.style.WebkitPaddingStart = '';
        });
      } else {
        var self = this;
        container.addEventListener('webkitTransitionEnd', function f(e) {
          if (e.propertyName != 'opacity')
            return;
          container.removeEventListener('webkitTransitionEnd', f);
          self.fadeCompleted_(container);
        });
        container.classList.add('transparent');
      }
    },

    /**
     * Called when a container opacity transition finishes.
     * @param {HTMLElement} container The container element.
     * @private
     */
    fadeCompleted_: function(container) {
      if (container.classList.contains('transparent'))
        container.hidden = true;
    },

    /**
     * Focuses the first control on the page.
     */
    focusFirstElement: function() {
      // Sets focus on the first interactive element in the page.
      var focusElement =
          this.pageDiv.querySelector('button, input, list, select');
      if (focusElement)
        focusElement.focus();
    },

    /**
     * The nesting level of this page.
     * @type {number} The nesting level of this page (0 for top-level page)
     */
    get nestingLevel() {
      var level = 0;
      var parent = this.parentPage;
      while (parent) {
        level++;
        parent = parent.parentPage;
      }
      return level;
    },

    /**
     * Whether the page is considered 'sticky', such that it will
     * remain a top-level page even if sub-pages change.
     * @type {boolean} True if this page is sticky.
     */
    get sticky() {
      return false;
    },

    /**
     * Checks whether this page is an ancestor of the given page in terms of
     * subpage nesting.
     * @param {OptionsPage} page
     * @return {boolean} True if this page is nested under |page|
     */
    isAncestorOfPage: function(page) {
      var parent = page.parentPage;
      while (parent) {
        if (parent == this)
          return true;
        parent = parent.parentPage;
      }
      return false;
    },

    /**
     * Whether it should be possible to show the page.
     * @return {boolean} True if the page should be shown
     */
    canShowPage: function() {
      return true;
    },
  };

  // Export
  return {
    OptionsPage: OptionsPage
  };
});


// Copyright (c) 2010 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {
  const Tree = lbm.ui.Tree;
  const TreeItem = lbm.ui.TreeItem;

  /**
   * Creates a new tree item for certificate data.
   * @param {Object=} data Data used to create a certificate tree item.
   * @constructor
   * @extends {TreeItem}
   */
  function CertificateTreeItem(data) {
    // TODO(mattm): other columns
    var treeItem = new TreeItem({
      label: data.name,
      data: data
    });
    treeItem.__proto__ = CertificateTreeItem.prototype;

    if (data.icon) {
      treeItem.icon = data.icon;
    }

    return treeItem;
  }

  CertificateTreeItem.prototype = {
    __proto__: TreeItem.prototype,

    /**
     * The tree path id/.
     * @type {string}
     */
    get pathId() {
      var parent = this.parentItem;
      if (parent && parent instanceof CertificateTreeItem) {
        return parent.pathId + ',' + this.data.id;
      } else {
        return this.data.id;
      }
    }
  };

  /**
   * Creates a new cookies tree.
   * @param {Object=} opt_propertyBag Optional properties.
   * @constructor
   * @extends {Tree}
   */
  var CertificatesTree = lbm.ui.define('tree');

  CertificatesTree.prototype = {
    __proto__: Tree.prototype,

    /** @inheritDoc */
    decorate: function() {
      Tree.prototype.decorate.call(this);
      this.treeLookup_ = {};
    },

    /** @inheritDoc */
    addAt: function(child, index) {
      Tree.prototype.addAt.call(this, child, index);
      if (child.data && child.data.id)
        this.treeLookup_[child.data.id] = child;
    },

    /** @inheritDoc */
    remove: function(child) {
      Tree.prototype.remove.call(this, child);
      if (child.data && child.data.id)
        delete this.treeLookup_[child.data.id];
    },

    /**
     * Clears the tree.
     */
    clear: function() {
      // Remove all fields without recreating the object since other code
      // references it.
      for (var id in this.treeLookup_){
        delete this.treeLookup_[id];
      }
      this.textContent = '';
    },

    /**
     * Populate the tree.
     * @param {Array} nodesData Nodes data array.
     */
    populate: function(nodesData) {
      this.clear();

      for (var i = 0; i < nodesData.length; ++i) {
        var subnodes = nodesData[i]['subnodes'];
        delete nodesData[i]['subnodes'];

        var item = new CertificateTreeItem(nodesData[i]);
        this.addAt(item, i);

        for (var j = 0; j < subnodes.length; ++j) {
          var subitem = new CertificateTreeItem(subnodes[j]);
          item.addAt(subitem, j);
        }
        // Make tree expanded by default.
        item.expanded = true;
      }

      lbm.dispatchSimpleEvent(this, 'change');
    },
  };

  return {
    CertificatesTree: CertificatesTree
  };
});


  // Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {

  var OptionsPage = options.OptionsPage;

  /////////////////////////////////////////////////////////////////////////////
  // CertificateManagerTab class:

  /**
   * blah
   * @param {!string} id The id of this tab.
   */
  function CertificateManagerTab(id) {
    this.tree = $(id + '-tree');

    options.CertificatesTree.decorate(this.tree);
    this.tree.addEventListener('change',
        this.handleCertificatesTreeChange_.bind(this));

    var tree = this.tree;

    this.viewButton = $(id + '-view');
    this.viewButton.onclick = function(e) {
      var selected = tree.selectedItem;
      chrome.send('viewCertificate', [selected.data.id]);
    }

    this.editButton = $(id + '-edit');
    if (this.editButton !== null) {
      if (id == 'serverCertsTab') {
        this.editButton.onclick = function(e) {
          var selected = tree.selectedItem;
          chrome.send('editServerCertificate', [selected.data.id]);
        }
      } else if (id == 'caCertsTab') {
        this.editButton.onclick = function(e) {
          var data = tree.selectedItem.data;
          CertificateEditCaTrustOverlay.show(data.id, data.name);
        }
      }
    }

    this.backupButton = $(id + '-backup');
    if (this.backupButton !== null) {
      this.backupButton.onclick = function(e) {
        var selected = tree.selectedItem;
        chrome.send('exportPersonalCertificate', [selected.data.id]);
      }
    }

    this.backupAllButton = $(id + '-backup-all');
    if (this.backupAllButton !== null) {
      this.backupAllButton.onclick = function(e) {
        chrome.send('exportAllPersonalCertificates', []);
      }
    }

    this.importButton = $(id + '-import');
    if (this.importButton !== null) {
      if (id == 'personalCertsTab') {
        this.importButton.onclick = function(e) {
          chrome.send('importPersonalCertificate', [false]);
        }
      } else if (id == 'serverCertsTab') {
        this.importButton.onclick = function(e) {
          chrome.send('importServerCertificate', []);
        }
      } else if (id == 'caCertsTab') {
        this.importButton.onclick = function(e) {
          chrome.send('importCaCertificate', []);
        }
      }
    }

    this.importAndBindButton = $(id + '-import-and-bind');
    if (this.importAndBindButton !== null) {
      if (id == 'personalCertsTab') {
        this.importAndBindButton.onclick = function(e) {
          chrome.send('importPersonalCertificate', [true]);
        }
      }
    }

    this.exportButton = $(id + '-export');
    if (this.exportButton !== null) {
      this.exportButton.onclick = function(e) {
        var selected = tree.selectedItem;
        chrome.send('exportCertificate', [selected.data.id]);
      }
    }

    this.deleteButton = $(id + '-delete');
    this.deleteButton.onclick = function(e) {
      var data = tree.selectedItem.data;
      AlertOverlay.show(
          localStrings.getStringF(id + 'DeleteConfirm', data.name),
          localStrings.getString(id + 'DeleteImpact'),
          localStrings.getString('ok'),
          localStrings.getString('cancel'),
          function() {
            tree.selectedItem = null;
            chrome.send('deleteCertificate', [data.id]);
          });
    }
  }

  CertificateManagerTab.prototype = {

    /**
     * Update button state.
     * @private
     * @param {!Object} data The data of the selected item.
     */
    updateButtonState: function(data) {
      var isCert = !!data && data.id.substr(0, 5) == 'cert-';
      var readOnly = !!data && data.readonly;
      var hasChildren = this.tree.items.length > 0;
      this.viewButton.disabled = !isCert;
      if (this.editButton !== null)
        this.editButton.disabled = !isCert;
      if (this.backupButton !== null)
        this.backupButton.disabled = !isCert;
      if (this.backupAllButton !== null)
        this.backupAllButton.disabled = !hasChildren;
      if (this.exportButton !== null)
        this.exportButton.disabled = !isCert;
      this.deleteButton.disabled = !isCert || readOnly;
    },

    /**
     * Handles certificate tree selection change.
     * @private
     * @param {!Event} e The change event object.
     */
    handleCertificatesTreeChange_: function(e) {
      var data = null;
      if (this.tree.selectedItem) {
        data = this.tree.selectedItem.data;
      }

      this.updateButtonState(data);
    },

  }

  // TODO(xiyuan): Use notification from backend instead of polling.
  // TPM token check polling timer.
  var tpmPollingTimer;

  // Initiate tpm token check if needed.
  function checkTpmToken() {
    var importAndBindButton = $('personalCertsTab-import-and-bind');

    if (importAndBindButton && importAndBindButton.disabled)
      chrome.send('checkTpmTokenReady');
  }

  // Stop tpm polling timer.
  function stopTpmTokenCheckPolling() {
    if (tpmPollingTimer) {
      window.clearTimeout(tpmPollingTimer);
      tpmPollingTimer = undefined;
    }
  }

  /////////////////////////////////////////////////////////////////////////////
  // CertificateManager class:

  /**
   * Encapsulated handling of ChromeOS accounts options page.
   * @constructor
   */
  function CertificateManager(model) {
    OptionsPage.call(this, 'certificates',
                     templateData.certificateManagerPageTabTitle,
                     'certificateManagerPage');
  }

  lbm.addSingletonGetter(CertificateManager);

  CertificateManager.prototype = {
    __proto__: OptionsPage.prototype,

    initializePage: function() {
      OptionsPage.prototype.initializePage.call(this);

      this.personalTab = new CertificateManagerTab('personalCertsTab');
      this.serverTab = new CertificateManagerTab('serverCertsTab');
      this.caTab = new CertificateManagerTab('caCertsTab');
      this.otherTab = new CertificateManagerTab('otherCertsTab');

      this.addEventListener('visibleChange', this.handleVisibleChange_);
    },

    initalized_: false,

    /**
     * Handler for OptionsPage's visible property change event.
     * @private
     * @param {Event} e Property change event.
     */
    handleVisibleChange_: function(e) {
      if (!this.initalized_ && this.visible) {
        this.initalized_ = true;
        OptionsPage.showTab($('personal-certs-nav-tab'));
        chrome.send('populateCertificateManager');
      }

      if (lbm.isChromeOS) {
        // Ensure TPM token check on visible and stop polling when hidden.
        if (this.visible)
          checkTpmToken();
        else
          stopTpmTokenCheckPolling();
      }
    }
  };

  // CertificateManagerHandler callbacks.
  CertificateManager.onPopulateTree = function(args) {
    $(args[0]).populate(args[1]);
  };

  CertificateManager.exportPersonalAskPassword = function(args) {
    CertificateBackupOverlay.show();
  };

  CertificateManager.importPersonalAskPassword = function(args) {
    CertificateRestoreOverlay.show();
  };

  CertificateManager.onCheckTpmTokenReady = function(ready) {
    var importAndBindButton = $('personalCertsTab-import-and-bind');
    if (importAndBindButton) {
      importAndBindButton.disabled = !ready;

      // Check again after 5 seconds if Tpm is not ready and certificate manager
      // is still visible.
      if (!ready && CertificateManager.getInstance().visible)
        tpmPollingTimer = window.setTimeout(checkTpmToken, 5000);
    }
  };

  // Export
  return {
    CertificateManagerTab: CertificateManagerTab,
    CertificateManager: CertificateManager
  };

});

  // Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {
  const OptionsPage = options.OptionsPage;

  /**
   * CertificateRestoreOverlay class
   * Encapsulated handling of the 'enter restore password' overlay page.
   * @class
   */
  function CertificateRestoreOverlay() {
    OptionsPage.call(this, 'certificateRestore',
                     '',
                     'certificateRestoreOverlay');
  }

  lbm.addSingletonGetter(CertificateRestoreOverlay);

  CertificateRestoreOverlay.prototype = {
    __proto__: OptionsPage.prototype,

    /**
     * Initializes the page.
     */
    initializePage: function() {
      OptionsPage.prototype.initializePage.call(this);

      var self = this;
      $('certificateRestoreCancelButton').onclick = function(event) {
        self.cancelRestore_();
      }
      $('certificateRestoreOkButton').onclick = function(event) {
        self.finishRestore_();
      }

      self.clearInputFields_();
    },

    /**
     * Clears any uncommitted input, and dismisses the overlay.
     * @private
     */
    dismissOverlay_: function() {
      this.clearInputFields_();
      OptionsPage.closeOverlay();
    },

    /**
     * Attempt the restore operation.
     * The overlay will be left up with inputs disabled until the backend
     * finishes and dismisses it.
     * @private
     */
    finishRestore_: function() {
      chrome.send('importPersonalCertificatePasswordSelected',
                  [$('certificateRestorePassword').value]);
      $('certificateRestoreCancelButton').disabled = true;
      $('certificateRestoreOkButton').disabled = true;
    },

    /**
     * Cancel the restore operation.
     * @private
     */
    cancelRestore_: function() {
      chrome.send('cancelImportExportCertificate');
      this.dismissOverlay_();
    },

    /**
     * Clears the value of each input field.
     * @private
     */
    clearInputFields_: function() {
      $('certificateRestorePassword').value = '';
      $('certificateRestoreCancelButton').disabled = false;
      $('certificateRestoreOkButton').disabled = false;
    },
  };

  CertificateRestoreOverlay.show = function() {
    CertificateRestoreOverlay.getInstance().clearInputFields_();
    OptionsPage.navigateToPage('certificateRestore');
  };

  CertificateRestoreOverlay.dismiss = function() {
    CertificateRestoreOverlay.getInstance().dismissOverlay_();
  };

  // Export
  return {
    CertificateRestoreOverlay: CertificateRestoreOverlay
  };

});

  // Copyright (c) 2010 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {
  const OptionsPage = options.OptionsPage;

  /**
   * CertificateBackupOverlay class
   * Encapsulated handling of the 'enter backup password' overlay page.
   * @class
   */
  function CertificateBackupOverlay() {
    OptionsPage.call(this, 'certificateBackupOverlay',
                     '',
                     'certificateBackupOverlay');
  }

  lbm.addSingletonGetter(CertificateBackupOverlay);

  CertificateBackupOverlay.prototype = {
    __proto__: OptionsPage.prototype,

    /**
     * Initializes the page.
     */
    initializePage: function() {
      OptionsPage.prototype.initializePage.call(this);

      var self = this;
      $('certificateBackupCancelButton').onclick = function(event) {
        self.cancelBackup_();
      }
      $('certificateBackupOkButton').onclick = function(event) {
        self.finishBackup_();
      }
      $('certificateBackupPassword').oninput =
      $('certificateBackupPassword2').oninput = function(event) {
        self.comparePasswords_();
      }

      self.clearInputFields_();
    },

    /**
     * Clears any uncommitted input, and dismisses the overlay.
     * @private
     */
    dismissOverlay_: function() {
      this.clearInputFields_();
      OptionsPage.closeOverlay();
    },

    /**
     * Attempt the Backup operation.
     * The overlay will be left up with inputs disabled until the backend
     * finishes and dismisses it.
     * @private
     */
    finishBackup_: function() {
      chrome.send('exportPersonalCertificatePasswordSelected',
                  [$('certificateBackupPassword').value]);
      $('certificateBackupCancelButton').disabled = true;
      $('certificateBackupOkButton').disabled = true;
      $('certificateBackupPassword').disabled = true;
      $('certificateBackupPassword2').disabled = true;
    },

    /**
     * Cancel the Backup operation.
     * @private
     */
    cancelBackup_: function() {
      chrome.send('cancelImportExportCertificate');
      this.dismissOverlay_();
    },

    /**
     * Compares the password fields and sets the button state appropriately.
     * @private
     */
    comparePasswords_: function() {
      var password1 = $('certificateBackupPassword').value;
      var password2 = $('certificateBackupPassword2').value;
      $('certificateBackupOkButton').disabled =
          !password1 || password1 != password2;
    },

    /**
     * Clears the value of each input field.
     * @private
     */
    clearInputFields_: function() {
      $('certificateBackupPassword').value = '';
      $('certificateBackupPassword2').value = '';
      $('certificateBackupPassword').disabled = false;
      $('certificateBackupPassword2').disabled = false;
      $('certificateBackupCancelButton').disabled = false;
      $('certificateBackupOkButton').disabled = true;
    },
  };

  CertificateBackupOverlay.show = function() {
    CertificateBackupOverlay.getInstance().clearInputFields_();
    OptionsPage.navigateToPage('certificateBackupOverlay');
  };

  CertificateBackupOverlay.dismiss = function() {
    CertificateBackupOverlay.getInstance().dismissOverlay_();
  };

  // Export
  return {
    CertificateBackupOverlay: CertificateBackupOverlay
  };
});

  // Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {
  const OptionsPage = options.OptionsPage;

  /**
   * CertificateEditCaTrustOverlay class
   * Encapsulated handling of the 'edit ca trust' and 'import ca' overlay pages.
   * @class
   */
  function CertificateEditCaTrustOverlay() {
    OptionsPage.call(this, 'certificateEditCaTrustOverlay',
                     '',
                     'certificateEditCaTrustOverlay');
  }

  lbm.addSingletonGetter(CertificateEditCaTrustOverlay);

  CertificateEditCaTrustOverlay.prototype = {
    __proto__: OptionsPage.prototype,

    /**
     * Dismisses the overlay.
     * @private
     */
    dismissOverlay_: function() {
      OptionsPage.closeOverlay();
    },

    /**
     * Enables or disables input fields.
     * @private
     */
    enableInputs_: function(enabled) {
      $('certificateCaTrustSSLCheckbox').disabled =
      $('certificateCaTrustEmailCheckbox').disabled =
      $('certificateCaTrustObjSignCheckbox').disabled =
      $('certificateEditCaTrustCancelButton').disabled =
      $('certificateEditCaTrustOkButton').disabled = !enabled;
    },

    /**
     * Attempt the Edit operation.
     * The overlay will be left up with inputs disabled until the backend
     * finishes and dismisses it.
     * @private
     */
    finishEdit_: function() {
      // TODO(mattm): Send checked values as booleans.  For now send them as
      // strings, since WebUIBindings::send does not support any other types :(
      chrome.send('editCaCertificateTrust',
                  [this.certId,
                   $('certificateCaTrustSSLCheckbox').checked.toString(),
                   $('certificateCaTrustEmailCheckbox').checked.toString(),
                   $('certificateCaTrustObjSignCheckbox').checked.toString()]);
      this.enableInputs_(false);
    },

    /**
     * Cancel the Edit operation.
     * @private
     */
    cancelEdit_: function() {
      this.dismissOverlay_();
    },

    /**
     * Attempt the Import operation.
     * The overlay will be left up with inputs disabled until the backend
     * finishes and dismisses it.
     * @private
     */
    finishImport_: function() {
      // TODO(mattm): Send checked values as booleans.  For now send them as
      // strings, since WebUIBindings::send does not support any other types :(
      chrome.send('importCaCertificateTrustSelected',
                  [$('certificateCaTrustSSLCheckbox').checked.toString(),
                   $('certificateCaTrustEmailCheckbox').checked.toString(),
                   $('certificateCaTrustObjSignCheckbox').checked.toString()]);
      this.enableInputs_(false);
    },

    /**
     * Cancel the Import operation.
     * @private
     */
    cancelImport_: function() {
      chrome.send('cancelImportExportCertificate');
      this.dismissOverlay_();
    },
  };

  /**
   * Callback from CertificateManagerHandler with the trust values.
   * @param {boolean} trustSSL The initial value of SSL trust checkbox.
   * @param {boolean} trustEmail The initial value of Email trust checkbox.
   * @param {boolean} trustObjSign The initial value of Object Signing trust
   */
  CertificateEditCaTrustOverlay.populateTrust = function(
      trustSSL, trustEmail, trustObjSign) {
    $('certificateCaTrustSSLCheckbox').checked = trustSSL;
    $('certificateCaTrustEmailCheckbox').checked = trustEmail;
    $('certificateCaTrustObjSignCheckbox').checked = trustObjSign;
    CertificateEditCaTrustOverlay.getInstance().enableInputs_(true);
  }

  /**
   * Show the Edit CA Trust overlay.
   * @param {string} certId The id of the certificate to be passed to the
   * certificate manager model.
   * @param {string} certName The display name of the certificate.
   * checkbox.
   */
  CertificateEditCaTrustOverlay.show = function(certId, certName) {
    var self = CertificateEditCaTrustOverlay.getInstance();
    self.certId = certId;
    $('certificateEditCaTrustCancelButton').onclick = function(event) {
      self.cancelEdit_();
    }
    $('certificateEditCaTrustOkButton').onclick = function(event) {
      self.finishEdit_();
    }
    $('certificateEditCaTrustDescription').textContent =
        localStrings.getStringF('certificateEditCaTrustDescriptionFormat',
                                certName);
    self.enableInputs_(false);
    OptionsPage.navigateToPage('certificateEditCaTrustOverlay');
    chrome.send('getCaCertificateTrust', [certId]);
  }

  /**
   * Show the Import CA overlay.
   * @param {string} certId The id of the certificate to be passed to the
   * certificate manager model.
   * @param {string} certName The display name of the certificate.
   * checkbox.
   */
  CertificateEditCaTrustOverlay.showImport = function(certName) {
    var self = CertificateEditCaTrustOverlay.getInstance();
    // TODO(mattm): do we want a view certificate button here like firefox has?
    $('certificateEditCaTrustCancelButton').onclick = function(event) {
      self.cancelImport_();
    }
    $('certificateEditCaTrustOkButton').onclick = function(event) {
      self.finishImport_();
    }
    $('certificateEditCaTrustDescription').textContent =
        localStrings.getStringF('certificateImportCaDescriptionFormat',
                                certName);
    CertificateEditCaTrustOverlay.populateTrust(false, false, false);
    OptionsPage.navigateToPage('certificateEditCaTrustOverlay');
  }

  CertificateEditCaTrustOverlay.dismiss = function() {
    CertificateEditCaTrustOverlay.getInstance().dismissOverlay_();
  };

  // Export
  return {
    CertificateEditCaTrustOverlay: CertificateEditCaTrustOverlay
  };
});

  // Copyright (c) 2010 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {

  var OptionsPage = options.OptionsPage;

  /**
   * CertificateImportErrorOverlay class
   * Displays a list of certificates and errors.
   * @class
   */
  function CertificateImportErrorOverlay() {
    OptionsPage.call(this, 'certificateImportErrorOverlay', '',
                     'certificateImportErrorOverlay');
  }

  lbm.addSingletonGetter(CertificateImportErrorOverlay);

  CertificateImportErrorOverlay.prototype = {
    // Inherit CertificateImportErrorOverlay from OptionsPage.
    __proto__: OptionsPage.prototype,

    /**
     * Initialize the page.
     */
    initializePage: function() {
      // Call base class implementation to start preference initialization.
      OptionsPage.prototype.initializePage.call(this);

      $('certificateImportErrorOverlayOk').onclick = function(event) {
        OptionsPage.closeOverlay();
      };
    },
  };

  /**
   * Show an alert overlay with the given message, button titles, and
   * callbacks.
   * @param {string} title The alert title to display to the user.
   * @param {string} message The alert message to display to the user.
   * @param {Array} certErrors The list of cert errors.  Each error should have
   *                           a .name and .error attribute.
   */
  CertificateImportErrorOverlay.show = function(title, message, certErrors) {
    $('certificateImportErrorOverlayTitle').textContent = title;
    $('certificateImportErrorOverlayMessage').textContent = message;

    ul = $('certificateImportErrorOverlayCertErrors');
    ul.innerHTML = '';
    for (var i = 0; i < certErrors.length; ++i) {
      li = document.createElement("li");
      li.textContent = localStrings.getStringF('certificateImportErrorFormat',
                                               certErrors[i].name,
                                               certErrors[i].error);
      ul.appendChild(li);
    }

    OptionsPage.navigateToPage('certificateImportErrorOverlay');
  }

  // Export
  return {
    CertificateImportErrorOverlay: CertificateImportErrorOverlay
  };

});

  var CertificateManager = options.CertificateManager;
  var CertificateRestoreOverlay = options.CertificateRestoreOverlay;
  var CertificateBackupOverlay = options.CertificateBackupOverlay;
  var CertificateEditCaTrustOverlay = options.CertificateEditCaTrustOverlay;
  var CertificateImportErrorOverlay = options.CertificateImportErrorOverlay;
// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {

var OptionsPage = options.OptionsPage;

  //
  // AdvancedOptions class
  // Encapsulated handling of advanced options page.
  //
  function AdvancedOptions() {
    OptionsPage.call(this, 'advanced', templateData.advancedPageTabTitle,
                     'advancedPage');
  }

  lbm.addSingletonGetter(AdvancedOptions);

  AdvancedOptions.prototype = {
    // Inherit AdvancedOptions from OptionsPage.
    __proto__: options.OptionsPage.prototype,

    /**
     * Initializes the page.
     */
    initializePage: function() {
      // Call base class implementation to starts preference initialization.
      OptionsPage.prototype.initializePage.call(this);

      // Set up click handlers for buttons.
      $('privacyContentSettingsButton').onclick = function(event) {
        OptionsPage.navigateToPage('content');
        OptionsPage.showTab($('cookies-nav-tab'));
        chrome.send('coreOptionsUserMetricsAction',
            ['Options_ContentSettings']);
      };
      $('privacyClearDataButton').onclick = function(event) {
        OptionsPage.navigateToPage('clearBrowserData');
        chrome.send('coreOptionsUserMetricsAction', ['Options_ClearData']);
      };

      // 'metricsReportingEnabled' element is only present on Chrome branded
      // builds.
      if ($('metricsReportingEnabled')) {
        $('metricsReportingEnabled').onclick = function(event) {
          chrome.send('metricsReportingCheckboxAction',
              [String(event.target.checked)]);
        };
      }

      if (!lbm.isChromeOS) {
        $('autoOpenFileTypesResetToDefault').onclick = function(event) {
          chrome.send('autoOpenFileTypesAction');
        };
      }

      $('fontSettingsCustomizeFontsButton').onclick = function(event) {
        OptionsPage.navigateToPage('fonts');
        chrome.send('coreOptionsUserMetricsAction', ['Options_FontSettings']);
      };
      $('defaultFontSize').onchange = function(event) {
        chrome.send('defaultFontSizeAction',
            [String(event.target.options[event.target.selectedIndex].value)]);
      };
      $('language-button').onclick = function(event) {
        OptionsPage.navigateToPage('languages');
        chrome.send('coreOptionsUserMetricsAction',
            ['Options_LanuageAndSpellCheckSettings']);
      };

      if (lbm.isWindows || lbm.isMac) {
        $('certificatesManageButton').onclick = function(event) {
          chrome.send('showManageSSLCertificates');
        };
      } else {
        $('certificatesManageButton').onclick = function(event) {
          OptionsPage.navigateToPage('certificates');
          chrome.send('coreOptionsUserMetricsAction',
                      ['Options_ManageSSLCertificates']);
        };
      }

      if (!lbm.isChromeOS) {
        $('proxiesConfigureButton').onclick = function(event) {
          chrome.send('showNetworkProxySettings');
        };
        $('downloadLocationChangeButton').onclick = function(event) {
          chrome.send('selectDownloadLocation');
        };
        $('promptForDownload').onclick = function(event) {
          chrome.send('promptForDownloadAction',
              [String($('promptForDownload').checked)]);
        };
      }

      $('sslCheckRevocation').onclick = function(event) {
        chrome.send('checkRevocationCheckboxAction',
            [String($('sslCheckRevocation').checked)]);
      };

      if ($('backgroundModeCheckbox')) {
        $('backgroundModeCheckbox').onclick = function(event) {
          chrome.send('backgroundModeAction',
              [String($('backgroundModeCheckbox').checked)]);
        };
      }

      // 'cloudPrintProxyEnabled' is true for Chrome branded builds on
      // certain platforms, or could be enabled by a lab.
      if (!lbm.isChromeOS) {
        $('cloudPrintProxySetupButton').onclick = function(event) {
          if ($('cloudPrintProxyManageButton').style.display == 'none') {
            // Disable the button, set it's text to the intermediate state.
            $('cloudPrintProxySetupButton').textContent =
              localStrings.getString('cloudPrintProxyEnablingButton');
            $('cloudPrintProxySetupButton').disabled = true;
            chrome.send('showCloudPrintSetupDialog');
          } else {
            chrome.send('disableCloudPrintProxy');
          }
        };
      }
      $('cloudPrintProxyManageButton').onclick = function(event) {
        chrome.send('showCloudPrintManagePage');
      };

  }
  };

  //
  // Chrome callbacks
  //

  // Set the checked state of the metrics reporting checkbox.
  AdvancedOptions.SetMetricsReportingCheckboxState = function(
      checked, disabled) {
    $('metricsReportingEnabled').checked = checked;
    $('metricsReportingEnabled').disabled = disabled;
    if (disabled)
      $('metricsReportingEnabledText').className = 'disable-services-span';
  }

  AdvancedOptions.SetMetricsReportingSettingVisibility = function(visible) {
    if (visible) {
      $('metricsReportingSetting').style.display = 'block';
    } else {
      $('metricsReportingSetting').style.display = 'none';
    }
  }

  // Set the font size selected item.
  AdvancedOptions.SetFontSize = function(font_size_value) {
    var selectCtl = $('defaultFontSize');
    for (var i = 0; i < selectCtl.options.length; i++) {
      if (selectCtl.options[i].value == font_size_value) {
        selectCtl.selectedIndex = i;
        if ($('Custom'))
          selectCtl.remove($('Custom').index);
        return;
      }
    }

    // Add/Select Custom Option in the font size label list.
    if (!$('Custom')) {
      var option = new Option(localStrings.getString('fontSizeLabelCustom'),
                              -1, false, true);
      option.setAttribute("id", "Custom");
      selectCtl.add(option);
    }
    $('Custom').selected = true;
  };

  // Set the download path.
  AdvancedOptions.SetDownloadLocationPath = function(path, disabled) {
    if (!lbm.isChromeOS) {
      $('downloadLocationPath').value = path;
      $('downloadLocationChangeButton').disabled = disabled;
    }
  };

  // Set the prompt for download checkbox.
  AdvancedOptions.SetPromptForDownload = function(checked, disabled) {
    if (!lbm.isChromeOS) {
      $('promptForDownload').checked = checked;
      $('promptForDownload').disabled = disabled;
      if (disabled)
        $('promptForDownloadLabel').className = 'informational-text';
      else
        $('promptForDownloadLabel').className = '';
    }
  };

  // Set the enabled state for the autoOpenFileTypesResetToDefault button.
  AdvancedOptions.SetAutoOpenFileTypesDisabledAttribute = function(disabled) {
    if (!lbm.isChromeOS) {
      $('autoOpenFileTypesResetToDefault').disabled = disabled;

      if (disabled)
        $('auto-open-file-types-label').classList.add('disabled');
      else
        $('auto-open-file-types-label').classList.remove('disabled');
    }
  };

  // Set the enabled state for the proxy settings button.
  AdvancedOptions.SetupProxySettingsSection = function(disabled, label) {
    if (!lbm.isChromeOS) {
      $('proxiesConfigureButton').disabled = disabled;
      $('proxiesLabel').textContent = label;
    }
  };

  // Set the checked state for the sslCheckRevocation checkbox.
  AdvancedOptions.SetCheckRevocationCheckboxState = function(
      checked, disabled) {
    $('sslCheckRevocation').checked = checked;
    $('sslCheckRevocation').disabled = disabled;
  };

  // Set the checked state for the backgroundModeCheckbox element.
  AdvancedOptions.SetBackgroundModeCheckboxState = function(checked) {
    $('backgroundModeCheckbox').checked = checked;
  };

  // Set the Cloud Print proxy UI to enabled, disabled, or processing.
  AdvancedOptions.SetupCloudPrintProxySection = function(
        disabled, label, allowed) {
    if (!lbm.isChromeOS) {
      $('cloudPrintProxyLabel').textContent = label;
      if (disabled || !allowed) {
        $('cloudPrintProxySetupButton').textContent =
          localStrings.getString('cloudPrintProxyDisabledButton');
        $('cloudPrintProxyManageButton').style.display = 'none';
      } else {
        $('cloudPrintProxySetupButton').textContent =
          localStrings.getString('cloudPrintProxyEnabledButton');
        $('cloudPrintProxyManageButton').style.display = 'inline';
      }
      $('cloudPrintProxySetupButton').disabled = !allowed;
    }
  };

  AdvancedOptions.RemoveCloudPrintProxySection = function() {
    if (!lbm.isChromeOS) {
      var proxySectionElm = $('cloud-print-proxy-section');
      if (proxySectionElm)
        proxySectionElm.parentNode.removeChild(proxySectionElm);
    }
  };

  // Export
  return {
    AdvancedOptions: AdvancedOptions
  };

});

// Copyright (c) 2010 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {
  var OptionsPage = options.OptionsPage;

  /**
   * AlertOverlay class
   * Encapsulated handling of a generic alert.
   * @class
   */
  function AlertOverlay() {
    OptionsPage.call(this, 'alertOverlay', '', 'alertOverlay');
  }

  lbm.addSingletonGetter(AlertOverlay);

  AlertOverlay.prototype = {
    // Inherit AlertOverlay from OptionsPage.
    __proto__: OptionsPage.prototype,

    /**
     * Whether the page can be shown. Used to make sure the page is only
     * shown via AlertOverlay.Show(), and not via the address bar.
     * @private
     */
    canShow_: false,

    /**
     * Initialize the page.
     */
    initializePage: function() {
      // Call base class implementation to start preference initialization.
      OptionsPage.prototype.initializePage.call(this);

      var self = this;
      $('alertOverlayOk').onclick = function(event) {
        self.handleOK_();
      };

      $('alertOverlayCancel').onclick = function(event) {
        self.handleCancel_();
      };
    },

    /**
     * Handle the 'ok' button.  Clear the overlay and call the ok callback if
     * available.
     * @private
     */
    handleOK_: function() {
      OptionsPage.closeOverlay();
      if (this.okCallback != undefined) {
        this.okCallback.call();
      }
    },

    /**
     * Handle the 'cancel' button.  Clear the overlay and call the cancel
     * callback if available.
     * @private
     */
    handleCancel_: function() {
      OptionsPage.closeOverlay();
      if (this.cancelCallback != undefined) {
        this.cancelCallback.call();
      }
    },

    /**
     * The page is getting hidden. Don't let it be shown again.
     */
    willHidePage: function() {
      canShow_ = false;
    },

    /** @inheritDoc */
    canShowPage: function() {
      return this.canShow_;
    },
  };

  /**
   * Show an alert overlay with the given message, button titles, and
   * callbacks.
   * @param {string} title The alert title to display to the user.
   * @param {string} message The alert message to display to the user.
   * @param {string} okTitle The title of the OK button. If undefined or empty,
   *     no button is shown.
   * @param {string} cancelTitle The title of the cancel button. If undefined or
   *     empty, no button is shown.
   * @param {function} okCallback A function to be called when the user presses
   *     the ok button.  The alert window will be closed automatically.  Can be
   *     undefined.
   * @param {function} cancelCallback A function to be called when the user
   *     presses the cancel button.  The alert window will be closed
   *     automatically.  Can be undefined.
   */
  AlertOverlay.show = function(
      title, message, okTitle, cancelTitle, okCallback, cancelCallback) {
    if (title != undefined) {
      $('alertOverlayTitle').textContent = title;
      $('alertOverlayTitle').style.display = 'block';
    } else {
      $('alertOverlayTitle').style.display = 'none';
    }

    if (message != undefined) {
      $('alertOverlayMessage').textContent = message;
      $('alertOverlayMessage').style.display = 'block';
    } else {
      $('alertOverlayMessage').style.display = 'none';
    }

    if (okTitle != undefined && okTitle != '') {
      $('alertOverlayOk').textContent = okTitle;
      $('alertOverlayOk').style.display = 'block';
    } else {
      $('alertOverlayOk').style.display = 'none';
    }

    if (cancelTitle != undefined && cancelTitle != '') {
      $('alertOverlayCancel').textContent = cancelTitle;
      $('alertOverlayCancel').style.display = 'inline';
    } else {
      $('alertOverlayCancel').style.display = 'none';
    }

    var alertOverlay = AlertOverlay.getInstance();
    alertOverlay.okCallback = okCallback;
    alertOverlay.cancelCallback = cancelCallback;
    alertOverlay.canShow_ = true;

    // Intentionally don't show the URL in the location bar as we don't want
    // people trying to navigate here by hand.
    OptionsPage.showPageByName('alertOverlay', false);
  }

  // Export
  return {
    AlertOverlay: AlertOverlay
  };
});

// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {
  const ArrayDataModel = lbm.ui.ArrayDataModel;
  const List = lbm.ui.List;
  const ListItem = lbm.ui.ListItem;

  /**
   * Creates a new autocomplete list item.
   * @param {Object} pageInfo The page this item represents.
   * @constructor
   * @extends {lbm.ui.ListItem}
   */
  function AutocompleteListItem(pageInfo) {
    var el = lbm.doc.createElement('div');
    el.pageInfo_ = pageInfo;
    AutocompleteListItem.decorate(el);
    return el;
  }

  /**
   * Decorates an element as an autocomplete list item.
   * @param {!HTMLElement} el The element to decorate.
   */
  AutocompleteListItem.decorate = function(el) {
    el.__proto__ = AutocompleteListItem.prototype;
    el.decorate();
  };

  AutocompleteListItem.prototype = {
    __proto__: ListItem.prototype,

    /** @inheritDoc */
    decorate: function() {
      ListItem.prototype.decorate.call(this);

      var title = this.pageInfo_['title'];
      var url = this.pageInfo_['displayURL'];
      var titleEl = this.ownerDocument.createElement('span');
      titleEl.className = 'title';
      titleEl.textContent = title || url;
      this.appendChild(titleEl);

      if (title && title.length > 0 && url != title) {
        var separatorEl = this.ownerDocument.createTextNode(' - ');
        this.appendChild(separatorEl);

        var urlEl = this.ownerDocument.createElement('span');
        urlEl.className = 'url';
        urlEl.textContent = url;
        this.appendChild(urlEl);
      }
    },
  };

  /**
   * Creates a new autocomplete list popup.
   * @constructor
   * @extends {lbm.ui.List}
   */
  var AutocompleteList = lbm.ui.define('list');

  AutocompleteList.prototype = {
    __proto__: List.prototype,

    /**
     * The text field the autocomplete popup is currently attached to, if any.
     * @type {HTMLElement}
     * @private
     */
    targetInput_: null,

    /**
     * Keydown event listener to attach to a text field.
     * @type {Function}
     * @private
     */
    textFieldKeyHandler_: null,

    /**
     * Input event listener to attach to a text field.
     * @type {Function}
     * @private
     */
    textFieldInputHandler_: null,

    /**
     * A function to call when new suggestions are needed.
     * @type {Function}
     * @private
     */
    suggestionUpdateRequestCallback_: null,

    /** @inheritDoc */
    decorate: function() {
      List.prototype.decorate.call(this);
      this.classList.add('autocomplete-suggestions');
      this.selectionModel = new lbm.ui.ListSingleSelectionModel;

      this.textFieldKeyHandler_ = this.handleAutocompleteKeydown_.bind(this);
      var self = this;
      this.textFieldInputHandler_ = function(e) {
        if (self.suggestionUpdateRequestCallback_)
          self.suggestionUpdateRequestCallback_(self.targetInput_.value);
      };
      this.addEventListener('change', function(e) {
        var input = self.targetInput;
        if (!input || !self.selectedItem)
          return;
        input.value = self.selectedItem['url'];
        // Programatically change the value won't trigger a change event, but
        // clients are likely to want to know when changes happen, so fire one.
        var changeEvent = document.createEvent('Event');
        changeEvent.initEvent('change', true, true);
        input.dispatchEvent(changeEvent);
      });
      // Start hidden; adding suggestions will unhide.
      this.hidden = true;
    },

    /** @inheritDoc */
    createItem: function(pageInfo) {
      return new AutocompleteListItem(pageInfo);
    },

    /**
     * The suggestions to show.
     * @type {Array}
     */
    set suggestions(suggestions) {
      this.dataModel = new ArrayDataModel(suggestions);
      this.hidden = !this.targetInput_ || suggestions.length == 0;
    },

    /**
     * A function to call when the attached input field's contents change.
     * The function should take one string argument, which will be the text
     * to autocomplete from.
     * @type {Function}
     */
    set suggestionUpdateRequestCallback(callback) {
      this.suggestionUpdateRequestCallback_ = callback;
    },

    /**
     * Attaches the popup to the given input element. Requires
     * that the input be wrapped in a block-level container of the same width.
     * @param {HTMLElement} input The input element to attach to.
     */
    attachToInput: function(input) {
      if (this.targetInput_ == input)
        return;

      this.detach();
      this.targetInput_ = input;
      this.style.width = input.getBoundingClientRect().width + 'px';
      this.hidden = false;  // Necessary for positionPopupAroundElement to work.
      lbm.ui.positionPopupAroundElement(input, this, lbm.ui.AnchorType.BELOW)
      // Start hidden; when the data model gets results the list will show.
      this.hidden = true;

      input.addEventListener('keydown', this.textFieldKeyHandler_, true);
      input.addEventListener('input', this.textFieldInputHandler_);
    },

    /**
     * Detaches the autocomplete popup from its current input element, if any.
     */
    detach: function() {
      var input = this.targetInput_
      if (!input)
        return;

      input.removeEventListener('keydown', this.textFieldKeyHandler_);
      input.removeEventListener('input', this.textFieldInputHandler_);
      this.targetInput_ = null;
      this.suggestions = [];
    },

    /**
     * Makes sure that the suggestion list matches the width of the input it is.
     * attached to. Should be called any time the input is resized.
     */
    syncWidthToInput: function() {
      var input = this.targetInput_
      if (input)
        this.style.width = input.getBoundingClientRect().width + 'px';
    },

    /**
     * The text field the autocomplete popup is currently attached to, if any.
     * @return {HTMLElement}
     */
    get targetInput() {
      return this.targetInput_;
    },

    /**
     * Handles input field key events that should be interpreted as autocomplete
     * commands.
     * @param {Event} event The keydown event.
     * @private
     */
    handleAutocompleteKeydown_: function(event) {
      if (this.hidden)
        return;
      var handled = false;
      switch (event.keyIdentifier) {
        case 'U+001B':  // Esc
          this.suggestions = [];
          handled = true;
          break;
        case 'Enter':
          var hadSelection = this.selectedItem != null;
          this.suggestions = [];
          // Only count the event as handled if a selection is being commited.
          handled = hadSelection;
          break;
        case 'Up':
        case 'Down':
          this.dispatchEvent(event);
          handled = true;
          break;
      }
      // Don't let arrow keys affect the text field, or bubble up to, e.g.,
      // an enclosing list item.
      if (handled) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
  };

  return {
    AutocompleteList: AutocompleteList
  };
});

// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {
  const OptionsPage = options.OptionsPage;
  const ArrayDataModel = lbm.ui.ArrayDataModel;

  // The GUID of the loaded address.
  var guid;

  /**
   * AutofillEditAddressOverlay class
   * Encapsulated handling of the 'Add Page' overlay page.
   * @class
   */
  function AutofillEditAddressOverlay() {
    OptionsPage.call(this, 'autofillEditAddress',
                     templateData.autofillEditAddressTitle,
                     'autofill-edit-address-overlay');
  }

  lbm.addSingletonGetter(AutofillEditAddressOverlay);

  AutofillEditAddressOverlay.prototype = {
    __proto__: OptionsPage.prototype,

    /**
     * Initializes the page.
     */
    initializePage: function() {
      OptionsPage.prototype.initializePage.call(this);

      this.createMultiValueLists_();

      var self = this;
      $('autofill-edit-address-cancel-button').onclick = function(event) {
        self.dismissOverlay_();
      }
      $('autofill-edit-address-apply-button').onclick = function(event) {
        self.saveAddress_();
        self.dismissOverlay_();
      }

      self.guid = '';
      self.populateCountryList_();
      self.clearInputFields_();
      self.connectInputEvents_();
    },

    /**
     * Creates, decorates and initializes the multi-value lists for full name,
     * phone, fax, and email.
     * @private
     */
    createMultiValueLists_: function() {
      var list = $('full-name-list');
      options.autofillOptions.AutofillValuesList.decorate(list);
      list.autoExpands = true;

      list = $('phone-list');
      options.autofillOptions.AutofillPhoneValuesList.decorate(list);
      list.autoExpands = true;

      list = $('fax-list');
      options.autofillOptions.AutofillFaxValuesList.decorate(list);
      list.autoExpands = true;

      list = $('email-list');
      options.autofillOptions.AutofillValuesList.decorate(list);
      list.autoExpands = true;
    },

    /**
     * Updates the data model for the list named |listName| with the values from
     * |entries|.
     * @param {String} listName The id of the list.
     * @param {Array} entries The list of items to be added to the list.
     */
    setMultiValueList_: function(listName, entries) {
      // Add data entries, filtering null or empty strings.
      var list = $(listName);
      list.dataModel = new ArrayDataModel(
          entries.filter(function(i) {return i}));

      // Add special entry for adding new values.
      list.dataModel.splice(list.dataModel.length, 0, null);

      var self = this;
      list.dataModel.addEventListener(
        'splice', function(event) { self.inputFieldChanged_(); });
      list.dataModel.addEventListener(
        'change', function(event) { self.inputFieldChanged_(); });
    },

    /**
     * Clears any uncommitted input, resets the stored GUID and dismisses the
     * overlay.
     * @private
     */
    dismissOverlay_: function() {
      this.clearInputFields_();
      this.guid = '';
      OptionsPage.closeOverlay();
    },

    /**
     * Aggregates the values in the input fields into an array and sends the
     * array to the Autofill handler.
     * @private
     */
    saveAddress_: function() {
      var address = new Array();
      address[0] = this.guid;
      var list = $('full-name-list');
      address[1] = list.dataModel.slice(0, list.dataModel.length - 1);
      address[2] = $('company-name').value;
      address[3] = $('addr-line-1').value;
      address[4] = $('addr-line-2').value;
      address[5] = $('city').value;
      address[6] = $('state').value;
      address[7] = $('postal-code').value;
      address[8] = $('country').value;
      list = $('phone-list');
      address[9] = list.dataModel.slice(0, list.dataModel.length - 1);
      list = $('fax-list');
      address[10] = list.dataModel.slice(0, list.dataModel.length - 1);
      list = $('email-list');
      address[11] = list.dataModel.slice(0, list.dataModel.length - 1);

      chrome.send('setAddress', address);
    },

    /**
     * Connects each input field to the inputFieldChanged_() method that enables
     * or disables the 'Ok' button based on whether all the fields are empty or
     * not.
     * @private
     */
    connectInputEvents_: function() {
      var self = this;
      $('company-name').oninput = $('addr-line-1').oninput =
      $('addr-line-2').oninput = $('city').oninput = $('state').oninput =
      $('postal-code').oninput = function(event) {
        self.inputFieldChanged_();
      }

      $('country').onchange = function(event) {
        self.countryChanged_();
      }
    },

    /**
     * Checks the values of each of the input fields and disables the 'Ok'
     * button if all of the fields are empty.
     * @private
     */
    inputFieldChanged_: function() {
      // Length of lists are tested for <= 1 due to the "add" placeholder item
      // in the list.
      var disabled =
          $('full-name-list').items.length <= 1 &&
          !$('company-name').value &&
          !$('addr-line-1').value && !$('addr-line-2').value &&
          !$('city').value && !$('state').value && !$('postal-code').value &&
          !$('country').value && $('phone-list').items.length <= 1 &&
          $('fax-list').items.length <= 1 && $('email-list').items.length <= 1;
      $('autofill-edit-address-apply-button').disabled = disabled;
    },

    /**
     * Updates the postal code and state field labels appropriately for the
     * selected country.
     * @private
     */
    countryChanged_: function() {
      var countryCode = $('country').value;
      if (!countryCode)
        countryCode = templateData.defaultCountryCode;

      var details = templateData.autofillCountryData[countryCode];
      var postal = $('postal-code-label');
      postal.textContent = details['postalCodeLabel'];
      $('state-label').textContent = details['stateLabel'];

      // Also update the 'Ok' button as needed.
      this.inputFieldChanged_();
    },

    /**
     * Populates the country <select> list.
     * @private
     */
    populateCountryList_: function() {
      var countryData = templateData.autofillCountryData;
      var defaultCountryCode = templateData.defaultCountryCode;

      // Build an array of the country names and their corresponding country
      // codes, so that we can sort and insert them in order.
      var countries = [];
      for (var countryCode in countryData) {
        var country = {
          countryCode: countryCode,
          name: countryData[countryCode]['name']
        };
        countries.push(country);
      }

      // Sort the countries in alphabetical order by name.
      countries = countries.sort(function(a, b) {
        return a.name < b.name ? -1 : 1;
      });

      // Insert the empty and default countries at the beginning of the array.
      var emptyCountry = {
        countryCode: '',
        name: ''
      };
      var defaultCountry = {
        countryCode: defaultCountryCode,
        name: countryData[defaultCountryCode]['name']
      };
      var separator = {
        countryCode: '',
        name: '---'
      }
      countries.unshift(emptyCountry, defaultCountry, separator);

      // Add the countries to the country <select> list.
      var countryList = $('country');
      for (var i = 0; i < countries.length; i++) {
        var country = new Option(countries[i].name, countries[i].countryCode);
        countryList.appendChild(country)
      }
    },

    /**
     * Clears the value of each input field.
     * @private
     */
    clearInputFields_: function() {
      this.setMultiValueList_('full-name-list', []);
      $('company-name').value = '';
      $('addr-line-1').value = '';
      $('addr-line-2').value = '';
      $('city').value = '';
      $('state').value = '';
      $('postal-code').value = '';
      $('country').value = '';
      this.setMultiValueList_('phone-list', []);
      this.setMultiValueList_('fax-list', []);
      this.setMultiValueList_('email-list', []);

      this.countryChanged_();
    },

    /**
     * Loads the address data from |address|, sets the input fields based on
     * this data and stores the GUID of the address.
     * @private
     */
    loadAddress_: function(address) {
      this.setInputFields_(address);
      this.inputFieldChanged_();
      this.guid = address['guid'];
    },

    /**
     * Sets the value of each input field according to |address|
     * @private
     */
    setInputFields_: function(address) {
      this.setMultiValueList_('full-name-list', address['fullName']);
      $('company-name').value = address['companyName'];
      $('addr-line-1').value = address['addrLine1'];
      $('addr-line-2').value = address['addrLine2'];
      $('city').value = address['city'];
      $('state').value = address['state'];
      $('postal-code').value = address['postalCode'];
      $('country').value = address['country'];
      this.setMultiValueList_('phone-list', address['phone']);
      this.setMultiValueList_('fax-list', address['fax']);
      this.setMultiValueList_('email-list', address['email']);

      this.countryChanged_();
    },
  };

  AutofillEditAddressOverlay.clearInputFields = function() {
    AutofillEditAddressOverlay.getInstance().clearInputFields_();
  };

  AutofillEditAddressOverlay.loadAddress = function(address) {
    AutofillEditAddressOverlay.getInstance().loadAddress_(address);
  };

  AutofillEditAddressOverlay.setTitle = function(title) {
    $('autofill-address-title').textContent = title;
  };

  AutofillEditAddressOverlay.setValidatedPhoneNumbers = function(numbers) {
    AutofillEditAddressOverlay.getInstance().setMultiValueList_('phone-list',
                                                                numbers);
  };

  AutofillEditAddressOverlay.setValidatedFaxNumbers = function(numbers) {
    AutofillEditAddressOverlay.getInstance().setMultiValueList_('fax-list',
                                                                numbers);
  };

  // Export
  return {
    AutofillEditAddressOverlay: AutofillEditAddressOverlay
  };
});

// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {
  const OptionsPage = options.OptionsPage;

  // The GUID of the loaded credit card.
  var guid_;

  /**
   * AutofillEditCreditCardOverlay class
   * Encapsulated handling of the 'Add Page' overlay page.
   * @class
   */
  function AutofillEditCreditCardOverlay() {
    OptionsPage.call(this, 'autofillEditCreditCard',
                     templateData.autofillEditCreditCardTitle,
                     'autofill-edit-credit-card-overlay');
  }

  lbm.addSingletonGetter(AutofillEditCreditCardOverlay);

  AutofillEditCreditCardOverlay.prototype = {
    __proto__: OptionsPage.prototype,

    /**
     * Initializes the page.
     */
    initializePage: function() {
      OptionsPage.prototype.initializePage.call(this);

      var self = this;
      $('autofill-edit-credit-card-cancel-button').onclick = function(event) {
        self.dismissOverlay_();
      }
      $('autofill-edit-credit-card-apply-button').onclick = function(event) {
        self.saveCreditCard_();
        self.dismissOverlay_();
      }

      self.guid_ = '';
      self.hasEditedNumber_ = false;
      self.clearInputFields_();
      self.connectInputEvents_();
      self.setDefaultSelectOptions_();
    },

    /**
     * Clears any uncommitted input, and dismisses the overlay.
     * @private
     */
    dismissOverlay_: function() {
      this.clearInputFields_();
      this.guid_ = '';
      this.hasEditedNumber_ = false;
      OptionsPage.closeOverlay();
    },

    /**
     * Aggregates the values in the input fields into an array and sends the
     * array to the Autofill handler.
     * @private
     */
    saveCreditCard_: function() {
      var creditCard = new Array(5);
      creditCard[0] = this.guid_;
      creditCard[1] = $('name-on-card').value;
      creditCard[2] = $('credit-card-number').value;
      creditCard[3] = $('expiration-month').value;
      creditCard[4] = $('expiration-year').value;
      chrome.send('setCreditCard', creditCard);
    },

    /**
     * Connects each input field to the inputFieldChanged_() method that enables
     * or disables the 'Ok' button based on whether all the fields are empty or
     * not.
     * @private
     */
    connectInputEvents_: function() {
      var ccNumber = $('credit-card-number');
      $('name-on-card').oninput = ccNumber.oninput =
          $('expiration-month').onchange = $('expiration-year').onchange =
              this.inputFieldChanged_.bind(this);
    },

    /**
     * Checks the values of each of the input fields and disables the 'Ok'
     * button if all of the fields are empty.
     * @param {Event} opt_event Optional data for the 'input' event.
     * @private
     */
    inputFieldChanged_: function(opt_event) {
      var disabled = !$('name-on-card').value && !$('credit-card-number').value;
      $('autofill-edit-credit-card-apply-button').disabled = disabled;
    },

    /**
     * Sets the default values of the options in the 'Expiration date' select
     * controls.
     * @private
     */
    setDefaultSelectOptions_: function() {
      // Set the 'Expiration month' default options.
      var expirationMonth = $('expiration-month');
      expirationMonth.options.length = 0;
      for (var i = 1; i <= 12; ++i) {
        var text;
        if (i < 10)
          text = '0' + i;
        else
          text = i;

        var option = document.createElement('option');
        option.text = text;
        option.value = text;
        expirationMonth.add(option, null);
      }

      // Set the 'Expiration year' default options.
      var expirationYear = $('expiration-year');
      expirationYear.options.length = 0;

      var date = new Date();
      var year = parseInt(date.getFullYear());
      for (var i = 0; i < 10; ++i) {
        var text = year + i;
        var option = document.createElement('option');
        option.text = text;
        option.value = text;
        expirationYear.add(option, null);
      }
    },

    /**
     * Clears the value of each input field.
     * @private
     */
    clearInputFields_: function() {
      $('name-on-card').value = '';
      $('credit-card-number').value = '';
      $('expiration-month').selectedIndex = 0;
      $('expiration-year').selectedIndex = 0;
    },

    /**
     * Sets the value of each input field according to |creditCard|
     * @private
     */
    setInputFields_: function(creditCard) {
      $('name-on-card').value = creditCard['nameOnCard'];
      $('credit-card-number').value = creditCard['creditCardNumber'];

      // The options for the year select control may be out-dated at this point,
      // e.g. the user opened the options page before midnight on New Year's Eve
      // and then loaded a credit card profile to edit in the new year, so
      // reload the select options just to be safe.
      this.setDefaultSelectOptions_();

      var idx = parseInt(creditCard['expirationMonth'], 10);
      $('expiration-month').selectedIndex = idx - 1;

      expYear = creditCard['expirationYear'];
      var date = new Date();
      var year = parseInt(date.getFullYear());
      for (var i = 0; i < 10; ++i) {
        var text = year + i;
        if (expYear == String(text))
          $('expiration-year').selectedIndex = i;
      }
    },

    /**
     * Loads the credit card data from |creditCard|, sets the input fields based
     * on this data and stores the GUID of the credit card.
     * @private
     */
    loadCreditCard_: function(creditCard) {
      this.setInputFields_(creditCard);
      this.inputFieldChanged_();
      this.guid_ = creditCard['guid'];
    },
  };

  AutofillEditCreditCardOverlay.clearInputFields = function(title) {
    AutofillEditCreditCardOverlay.getInstance().clearInputFields_();
  };

  AutofillEditCreditCardOverlay.loadCreditCard = function(creditCard) {
    AutofillEditCreditCardOverlay.getInstance().loadCreditCard_(creditCard);
  };

  AutofillEditCreditCardOverlay.setTitle = function(title) {
    $('autofill-credit-card-title').textContent = title;
  };

  // Export
  return {
    AutofillEditCreditCardOverlay: AutofillEditCreditCardOverlay
  };
});

// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options.autofillOptions', function() {
  const DeletableItem = options.DeletableItem;
  const DeletableItemList = options.DeletableItemList;
  const InlineEditableItem = options.InlineEditableItem;
  const InlineEditableItemList = options.InlineEditableItemList;

  /**
   * Creates a new address list item.
   * @param {Array} entry An array of the form [guid, label].
   * @constructor
   * @extends {options.DeletableItem}
   */
  function AddressListItem(entry) {
    var el = lbm.doc.createElement('div');
    el.guid = entry[0];
    el.label = entry[1];
    el.__proto__ = AddressListItem.prototype;
    el.decorate();

    return el;
  }

  AddressListItem.prototype = {
    __proto__: DeletableItem.prototype,

    /** @inheritDoc */
    decorate: function() {
      DeletableItem.prototype.decorate.call(this);

      // The stored label.
      var label = this.ownerDocument.createElement('div');
      label.className = 'autofill-list-item';
      label.textContent = this.label;
      this.contentElement.appendChild(label);
    },
  };

  /**
   * Creates a new credit card list item.
   * @param {Array} entry An array of the form [guid, label, icon].
   * @constructor
   * @extends {options.DeletableItem}
   */
  function CreditCardListItem(entry) {
    var el = lbm.doc.createElement('div');
    el.guid = entry[0];
    el.label = entry[1];
    el.icon = entry[2];
    el.description = entry[3];
    el.__proto__ = CreditCardListItem.prototype;
    el.decorate();

    return el;
  }

  CreditCardListItem.prototype = {
    __proto__: DeletableItem.prototype,

    /** @inheritDoc */
    decorate: function() {
      DeletableItem.prototype.decorate.call(this);

      // The stored label.
      var label = this.ownerDocument.createElement('div');
      label.className = 'autofill-list-item';
      label.textContent = this.label;
      this.contentElement.appendChild(label);

      // The credit card icon.
      var icon = this.ownerDocument.createElement('image');
      icon.src = this.icon;
      icon.alt = this.description;
      this.contentElement.appendChild(icon);
    },
  };

  /**
   * Creates a new value list item.
   * @param {AutofillValuesList} list The parent list of this item.
   * @param {String} entry A string value.
   * @constructor
   * @extends {options.InlineEditableItem}
   */
  function ValuesListItem(list, entry) {
    var el = lbm.doc.createElement('div');
    el.list = list;
    el.value = entry;
    el.__proto__ = ValuesListItem.prototype;
    el.decorate();

    return el;
  }

  ValuesListItem.prototype = {
    __proto__: InlineEditableItem.prototype,

    /** @inheritDoc */
    decorate: function() {
      InlineEditableItem.prototype.decorate.call(this);

      this.isPlaceholder = !this.value;

      // The stored value.
      var cell = this.createEditableTextCell(this.value);
      this.contentElement.appendChild(cell);
      this.input = cell.querySelector('input');

      this.addEventListener('commitedit', this.onEditCommitted_);
    },

    /**
     * Called when committing an edit.
     * @param {Event} e The end event.
     * @private
     */
    onEditCommitted_: function(e) {
      var i = this.list.items.indexOf(this);
      if (this.input.value == this.list.dataModel.item(i))
        return;

      if (this.input.value &&
          this.list.dataModel.indexOf(this.input.value) == -1) {
        // Update with new value.
        this.list.validateAndSave(i, 1, this.input.value);
      } else {
        // Reject empty values and duplicates.
        this.list.dataModel.splice(i, 1);
      }
    },
  };

  /**
   * Creates a new list item for the Add New Item row, which doesn't represent
   * an actual entry in the values list but allows the user to add new
   * values.
   * @param {AutofillValuesList} entry The parent list of this item.
   * @constructor
   * @extends {lbm.ui.ValuesListItem}
   */
  function ValuesAddRowListItem(list) {
    var el = lbm.doc.createElement('div');
    el.list = list;
    el.__proto__ = ValuesAddRowListItem.prototype;
    el.decorate();

    return el;
  }

  ValuesAddRowListItem.prototype = {
    __proto__: ValuesListItem.prototype,

    decorate: function() {
      ValuesListItem.prototype.decorate.call(this);
      this.input.value = '';
      this.input.placeholder = this.list.getAttribute('placeholder');
      this.deletable = false;
    },

    /**
     * Called when committing an edit.  Committing a non-empty value adds it
     * to the end of the values list, leaving this "AddRow" in place.
     * @param {Event} e The end event.
     * @extends {options.ValuesListItem}
     * @private
     */
    onEditCommitted_: function(e) {
      var i = this.list.items.indexOf(this);
      if (i < 0 || i >= this.list.dataModel.length || !this.input.value.length)
        return;

      if (this.input.value &&
          this.list.dataModel.indexOf(this.input.value) == -1) {
        // It is important that updateIndex is done before validateAndSave.
        // Otherwise we can not be sure about AddRow index.
        this.list.dataModel.updateIndex(i);
        this.list.validateAndSave(i, 0, this.input.value);
      } else {
        this.input.value = '';
      }
    },
  };

  /**
   * Create a new address list.
   * @constructor
   * @extends {options.DeletableItemList}
   */
  var AutofillAddressList = lbm.ui.define('list');

  AutofillAddressList.prototype = {
    __proto__: DeletableItemList.prototype,

    decorate: function() {
      DeletableItemList.prototype.decorate.call(this);

      this.addEventListener('blur', this.onBlur_);
    },

    /**
     * When the list loses focus, unselect all items in the list.
     * @private
     */
    onBlur_: function() {
      this.selectionModel.unselectAll();
    },

    /** @inheritDoc */
    createItem: function(entry) {
      return new AddressListItem(entry);
    },

    /** @inheritDoc */
    activateItemAtIndex: function(index) {
      AutofillOptions.loadAddressEditor(this.dataModel.item(index)[0]);
    },

    /** @inheritDoc */
    deleteItemAtIndex: function(index) {
      AutofillOptions.removeAddress(this.dataModel.item(index)[0]);
    },
  };

  /**
   * Create a new credit card list.
   * @constructor
   * @extends {options.DeletableItemList}
   */
  var AutofillCreditCardList = lbm.ui.define('list');

  AutofillCreditCardList.prototype = {
    __proto__: DeletableItemList.prototype,

    decorate: function() {
      DeletableItemList.prototype.decorate.call(this);

      this.addEventListener('blur', this.onBlur_);
    },

    /**
     * When the list loses focus, unselect all items in the list.
     * @private
     */
    onBlur_: function() {
      this.selectionModel.unselectAll();
    },

    /** @inheritDoc */
    createItem: function(entry) {
      return new CreditCardListItem(entry);
    },

    /** @inheritDoc */
    activateItemAtIndex: function(index) {
      AutofillOptions.loadCreditCardEditor(this.dataModel.item(index)[0]);
    },

    /** @inheritDoc */
    deleteItemAtIndex: function(index) {
      AutofillOptions.removeCreditCard(this.dataModel.item(index)[0]);
    },
  };

  /**
   * Create a new value list.
   * @constructor
   * @extends {options.InlineEditableItemList}
   */
  var AutofillValuesList = lbm.ui.define('list');

  AutofillValuesList.prototype = {
    __proto__: InlineEditableItemList.prototype,

    decorate: function() {
      InlineEditableItemList.prototype.decorate.call(this);

      var self = this;
      function handleBlur(e) {
        // When the blur event happens we do not know who is getting focus so we
        // delay this a bit until we know if the new focus node is outside the
        // list.
        var doc = e.target.ownerDocument;
        window.setTimeout(function() {
          var activeElement = doc.activeElement;
          if (!self.contains(activeElement))
            self.selectionModel.unselectAll();
        }, 50);
      }

      this.addEventListener('blur', handleBlur, true);
    },

    /** @inheritDoc */
    createItem: function(entry) {
      if (entry != null)
        return new ValuesListItem(this, entry);
      else
        return new ValuesAddRowListItem(this);
    },

    /** @inheritDoc */
    deleteItemAtIndex: function(index) {
      this.dataModel.splice(index, 1);
    },

    /** @inheritDoc */
    shouldFocusPlaceholder: function() {
      return false;
    },

    /**
     * Called when a new list item should be validated; subclasses are
     * responsible for implementing if validation is required.
     * @param {number} index The index of the item that was inserted or changed.
     * @param {number} remove The number items to remove.
     * @param {string} value The value of the item to insert.
     */
    validateAndSave: function(index, remove, value) {
      this.dataModel.splice(index, remove, value);
    },
  };

  /**
   * Create a new value list for phone number validation.
   * @constructor
   * @extends {options.AutofillValuesList}
   */
  var AutofillPhoneValuesList = lbm.ui.define('list');

  AutofillPhoneValuesList.prototype = {
    __proto__: AutofillValuesList.prototype,

    decorate: function() {
      AutofillValuesList.prototype.decorate.call(this);
    },

    /** @inheritDoc */
    validateAndSave: function(index, remove, value) {
      var numbers = this.dataModel.slice(0, this.dataModel.length - 1);
      numbers.splice(index, remove, value);
      var info = new Array();
      info[0] = index;
      info[1] = numbers;
      info[2] = $('country').value;
      chrome.send('validatePhoneNumbers', info);
    },
  };

  /**
   * Create a new value list for fax number validation.
   * @constructor
   * @extends {options.AutofillValuesList}
   */
  var AutofillFaxValuesList = lbm.ui.define('list');

  AutofillFaxValuesList.prototype = {
    __proto__: AutofillValuesList.prototype,

    decorate: function() {
      AutofillValuesList.prototype.decorate.call(this);
    },

    /** @inheritDoc */
    validateAndSave: function(index, remove, value) {
      var numbers = this.dataModel.slice(0, this.dataModel.length - 1);
      numbers.splice(index, remove, value);
      var info = new Array();
      info[0] = index;
      info[1] = numbers;
      info[2] = $('country').value;
      chrome.send('validateFaxNumbers', info);
    },
  };

  return {
    AddressListItem: AddressListItem,
    CreditCardListItem: CreditCardListItem,
    ValuesListItem: ValuesListItem,
    ValuesAddRowListItem: ValuesAddRowListItem,
    AutofillAddressList: AutofillAddressList,
    AutofillCreditCardList: AutofillCreditCardList,
    AutofillValuesList: AutofillValuesList,
    AutofillPhoneValuesList: AutofillPhoneValuesList,
    AutofillFaxValuesList: AutofillFaxValuesList,
  };
});

// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {
  const OptionsPage = options.OptionsPage;
  const ArrayDataModel = lbm.ui.ArrayDataModel;

  /////////////////////////////////////////////////////////////////////////////
  // AutofillOptions class:

  /**
   * Encapsulated handling of Autofill options page.
   * @constructor
   */
  function AutofillOptions() {
    OptionsPage.call(this,
                     'autofill',
                     templateData.autofillOptionsPageTabTitle,
                     'autofill-options');
  }

  lbm.addSingletonGetter(AutofillOptions);

  AutofillOptions.prototype = {
    __proto__: OptionsPage.prototype,

    /**
     * The address list.
     * @type {DeletableItemList}
     * @private
     */
    addressList_: null,

    /**
     * The credit card list.
     * @type {DeletableItemList}
     * @private
     */
    creditCardList_: null,

    initializePage: function() {
      OptionsPage.prototype.initializePage.call(this);

      this.createAddressList_();
      this.createCreditCardList_();

      var self = this;
      $('autofill-add-address').onclick = function(event) {
        self.showAddAddressOverlay_();
      };
      $('autofill-add-creditcard').onclick = function(event) {
        self.showAddCreditCardOverlay_();
      };

      // TODO(jhawkins): What happens when Autofill is disabled whilst on the
      // Autofill options page?
    },

    /**
     * Creates, decorates and initializes the address list.
     * @private
     */
    createAddressList_: function() {
      this.addressList_ = $('address-list');
      options.autofillOptions.AutofillAddressList.decorate(this.addressList_);
      this.addressList_.autoExpands = true;
    },

    /**
     * Creates, decorates and initializes the credit card list.
     * @private
     */
    createCreditCardList_: function() {
      this.creditCardList_ = $('creditcard-list');
      options.autofillOptions.AutofillCreditCardList.decorate(
          this.creditCardList_);
      this.creditCardList_.autoExpands = true;
    },

    /**
     * Shows the 'Add address' overlay, specifically by loading the
     * 'Edit address' overlay, emptying the input fields and modifying the
     * overlay title.
     * @private
     */
    showAddAddressOverlay_: function() {
      var title = localStrings.getString('addAddressTitle');
      AutofillEditAddressOverlay.setTitle(title);
      AutofillEditAddressOverlay.clearInputFields();
      OptionsPage.navigateToPage('autofillEditAddress');
    },

    /**
     * Shows the 'Add credit card' overlay, specifically by loading the
     * 'Edit credit card' overlay, emptying the input fields and modifying the
     * overlay title.
     * @private
     */
    showAddCreditCardOverlay_: function() {
      var title = localStrings.getString('addCreditCardTitle');
      AutofillEditCreditCardOverlay.setTitle(title);
      AutofillEditCreditCardOverlay.clearInputFields();
      OptionsPage.navigateToPage('autofillEditCreditCard');
    },

    /**
     * Updates the data model for the address list with the values from
     * |entries|.
     * @param {Array} entries The list of addresses.
     */
    setAddressList_: function(entries) {
      this.addressList_.dataModel = new ArrayDataModel(entries);
    },

    /**
     * Updates the data model for the credit card list with the values from
     * |entries|.
     * @param {Array} entries The list of credit cards.
     */
    setCreditCardList_: function(entries) {
      this.creditCardList_.dataModel = new ArrayDataModel(entries);
    },

    /**
     * Removes the Autofill address represented by |guid|.
     * @param {String} guid The GUID of the address to remove.
     * @private
     */
    removeAddress_: function(guid) {
      chrome.send('removeAddress', [guid]);
    },

    /**
     * Removes the Autofill credit card represented by |guid|.
     * @param {String} guid The GUID of the credit card to remove.
     * @private
     */
    removeCreditCard_: function(guid) {
      chrome.send('removeCreditCard', [guid]);
    },

    /**
     * Requests profile data for the address represented by |guid| from the
     * PersonalDataManager. Once the data is loaded, the AutofillOptionsHandler
     * calls showEditAddressOverlay().
     * @param {String} guid The GUID of the address to edit.
     * @private
     */
    loadAddressEditor_: function(guid) {
      chrome.send('loadAddressEditor', [guid]);
    },

    /**
     * Requests profile data for the credit card represented by |guid| from the
     * PersonalDataManager. Once the data is loaded, the AutofillOptionsHandler
     * calls showEditCreditCardOverlay().
     * @param {String} guid The GUID of the credit card to edit.
     * @private
     */
    loadCreditCardEditor_: function(guid) {
      chrome.send('loadCreditCardEditor', [guid]);
    },

    /**
     * Shows the 'Edit address' overlay, using the data in |address| to fill the
     * input fields. |address| is a list with one item, an associative array
     * that contains the address data.
     * @private
     */
    showEditAddressOverlay_: function(address) {
      var title = localStrings.getString('editAddressTitle');
      AutofillEditAddressOverlay.setTitle(title);
      AutofillEditAddressOverlay.loadAddress(address);
      OptionsPage.navigateToPage('autofillEditAddress');
    },

    /**
     * Shows the 'Edit credit card' overlay, using the data in |credit_card| to
     * fill the input fields. |address| is a list with one item, an associative
     * array that contains the credit card data.
     * @private
     */
    showEditCreditCardOverlay_: function(creditCard) {
      var title = localStrings.getString('editCreditCardTitle');
      AutofillEditCreditCardOverlay.setTitle(title);
      AutofillEditCreditCardOverlay.loadCreditCard(creditCard);
      OptionsPage.navigateToPage('autofillEditCreditCard');
    },
  };

  AutofillOptions.setAddressList = function(entries) {
    AutofillOptions.getInstance().setAddressList_(entries);
  };

  AutofillOptions.setCreditCardList = function(entries) {
    AutofillOptions.getInstance().setCreditCardList_(entries);
  };

  AutofillOptions.removeAddress = function(guid) {
    AutofillOptions.getInstance().removeAddress_(guid);
  };

  AutofillOptions.removeCreditCard = function(guid) {
    AutofillOptions.getInstance().removeCreditCard_(guid);
  };

  AutofillOptions.loadAddressEditor = function(guid) {
    AutofillOptions.getInstance().loadAddressEditor_(guid);
  };

  AutofillOptions.loadCreditCardEditor = function(guid) {
    AutofillOptions.getInstance().loadCreditCardEditor_(guid);
  };

  AutofillOptions.editAddress = function(address) {
    AutofillOptions.getInstance().showEditAddressOverlay_(address);
  };

  AutofillOptions.editCreditCard = function(creditCard) {
    AutofillOptions.getInstance().showEditCreditCardOverlay_(creditCard);
  };

  // Export
  return {
    AutofillOptions: AutofillOptions
  };

});


// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {
  const OptionsPage = options.OptionsPage;
  const ArrayDataModel = lbm.ui.ArrayDataModel;

  //
  // BrowserOptions class
  // Encapsulated handling of browser options page.
  //
  function BrowserOptions() {
    OptionsPage.call(this, 'browser',
                     templateData.browserPageTabTitle,
                     'browserPage');
  }

  lbm.addSingletonGetter(BrowserOptions);

  BrowserOptions.prototype = {
    // Inherit BrowserOptions from OptionsPage.
    __proto__: options.OptionsPage.prototype,

    startup_pages_pref_: {
      'name': 'session.urls_to_restore_on_startup',
      'managed': false
    },

    homepage_pref_: {
      'name': 'homepage',
      'value': '',
      'managed': false
    },

    homepage_is_newtabpage_pref_: {
      'name': 'homepage_is_newtabpage',
      'value': true,
      'managed': false
    },

    /**
     * At autocomplete list that can be attached to a text field during editing.
     * @type {HTMLElement}
     * @private
     */
    autocompleteList_: null,

    // The cached value of the instant.confirm_dialog_shown preference.
    instantConfirmDialogShown_: false,

    /**
     * Initialize BrowserOptions page.
     */
    initializePage: function() {
      // Call base class implementation to start preference initialization.
      OptionsPage.prototype.initializePage.call(this);

      // Wire up controls.
      $('startupUseCurrentButton').onclick = function(event) {
        chrome.send('setStartupPagesToCurrentPages');
      };
      $('toolbarShowBookmarksBar').onchange = function() {
        chrome.send('toggleShowBookmarksBar');
      };
      $('defaultSearchManageEnginesButton').onclick = function(event) {
        OptionsPage.navigateToPage('searchEngines');
        chrome.send('coreOptionsUserMetricsAction',
            ['Options_ManageSearchEngines']);
      };
      $('defaultSearchEngine').onchange = this.setDefaultSearchEngine_;

      var self = this;
      $('instantEnabledCheckbox').customChangeHandler = function(event) {
        if (this.checked) {
          if (self.instantConfirmDialogShown_)
            chrome.send('enableInstant');
          else
            OptionsPage.navigateToPage('instantConfirm');
        } else {
          chrome.send('disableInstant');
        }
        return true;
      };

      $('instantFieldTrialCheckbox').addEventListener('change',
          function(event) {
            this.checked = true;
            chrome.send('disableInstant');
          });

      Preferences.getInstance().addEventListener('instant.confirm_dialog_shown',
          this.onInstantConfirmDialogShownChanged_.bind(this));

      Preferences.getInstance().addEventListener('instant.enabled',
          this.onInstantEnabledChanged_.bind(this));

      var homepageField = $('homepageURL');
      $('homepageUseNTPButton').onchange =
          this.handleHomepageUseNTPButtonChange_.bind(this);
      $('homepageUseURLButton').onchange =
          this.handleHomepageUseURLButtonChange_.bind(this);
      var homepageChangeHandler = this.handleHomepageURLChange_.bind(this);
      homepageField.addEventListener('change', homepageChangeHandler);
      homepageField.addEventListener('input', homepageChangeHandler);
      homepageField.addEventListener('focus', function(event) {
        self.autocompleteList_.attachToInput(homepageField);
      });
      homepageField.addEventListener('blur', function(event) {
        self.autocompleteList_.detach();
      });
      homepageField.addEventListener('keydown', function(event) {
        // Remove focus when the user hits enter since people expect feedback
        // indicating that they are done editing.
        if (event.keyIdentifier == 'Enter')
          homepageField.blur();
      });
      // Text fields may change widths when the window changes size, so make
      // sure the suggestion list stays in sync.
      window.addEventListener('resize', function() {
        self.autocompleteList_.syncWidthToInput();
      });

      // Ensure that changes are committed when closing the page.
      window.addEventListener('unload', function() {
        if (document.activeElement == homepageField)
          homepageField.blur();
      });

      if (!lbm.isChromeOS) {
        $('defaultBrowserUseAsDefaultButton').onclick = function(event) {
          chrome.send('becomeDefaultBrowser');
        };
      }

      var startupPagesList = $('startupPagesList');
      options.browser_options.StartupPageList.decorate(startupPagesList);
      startupPagesList.autoExpands = true;

      // Check if we are in the guest mode.
      if (lbm.commandLine.options['--bwsi']) {
        // Hide the startup section.
        $('startupSection').hidden = true;
      } else {
        // Initialize control enabled states.
        Preferences.getInstance().addEventListener('session.restore_on_startup',
            this.updateCustomStartupPageControlStates_.bind(this));
        Preferences.getInstance().addEventListener(
            this.startup_pages_pref_.name,
            this.handleStartupPageListChange_.bind(this));
        Preferences.getInstance().addEventListener(
            this.homepage_pref_.name,
            this.handleHomepageChange_.bind(this));
        Preferences.getInstance().addEventListener(
            this.homepage_is_newtabpage_pref_.name,
            this.handleHomepageIsNewTabPageChange_.bind(this));

        this.updateCustomStartupPageControlStates_();
      }

      var suggestionList = new options.AutocompleteList();
      suggestionList.autoExpands = true;
      suggestionList.suggestionUpdateRequestCallback =
          this.requestAutocompleteSuggestions_.bind(this);
      $('main-content').appendChild(suggestionList);
      this.autocompleteList_ = suggestionList;
      startupPagesList.autocompleteList = suggestionList;
    },

    /**
     * Called when the value of the instant.confirm_dialog_shown preference
     * changes. Cache this value.
     * @param {Event} event Change event.
     * @private
     */
    onInstantConfirmDialogShownChanged_: function(event) {
      this.instantConfirmDialogShown_ = event.value['value'];
    },

    /**
     * Called when the value of the instant.enabled preference changes. Request
     * the state of the Instant field trial experiment.
     * @param {Event} event Change event.
     * @private
     */
    onInstantEnabledChanged_: function(event) {
      chrome.send('getInstantFieldTrialStatus');
    },

    /**
     * Called to set the Instant field trial status.
     * @param {boolean} enabled If true, the experiment is enabled.
     * @private
     */
    setInstantFieldTrialStatus_: function(enabled) {
      $('instantEnabledCheckbox').hidden = enabled;
      $('instantFieldTrialCheckbox').hidden = !enabled;
    },

    /**
     * Update the Default Browsers section based on the current state.
     * @param {string} statusString Description of the current default state.
     * @param {boolean} isDefault Whether or not the browser is currently
     *     default.
     * @param {boolean} canBeDefault Whether or not the browser can be default.
     * @private
     */
    updateDefaultBrowserState_: function(statusString, isDefault,
                                         canBeDefault) {
      var label = $('defaultBrowserState');
      label.textContent = statusString;

      $('defaultBrowserUseAsDefaultButton').disabled = !canBeDefault ||
                                                       isDefault;
    },

    /**
     * Clears the search engine popup.
     * @private
     */
    clearSearchEngines_: function() {
      $('defaultSearchEngine').textContent = '';
    },

    /**
     * Updates the search engine popup with the given entries.
     * @param {Array} engines List of available search engines.
     * @param {number} defaultValue The value of the current default engine.
     * @param {boolean} defaultManaged Whether the default search provider is
     *     managed. If true, the default search provider can't be changed.
     */
    updateSearchEngines_: function(engines, defaultValue, defaultManaged) {
      this.clearSearchEngines_();
      engineSelect = $('defaultSearchEngine');
      engineSelect.disabled = defaultManaged;
      engineCount = engines.length;
      var defaultIndex = -1;
      for (var i = 0; i < engineCount; i++) {
        var engine = engines[i];
        var option = new Option(engine['name'], engine['index']);
        if (defaultValue == option.value)
          defaultIndex = i;
        engineSelect.appendChild(option);
      }
      if (defaultIndex >= 0)
        engineSelect.selectedIndex = defaultIndex;
    },

    /**
     * Returns true if the custom startup page control block should
     * be enabled.
     * @returns {boolean} Whether the startup page controls should be
     *     enabled.
     */
    shouldEnableCustomStartupPageControls: function(pages) {
      return $('startupShowPagesButton').checked &&
          !this.startup_pages_pref_.controlledBy;
    },

    /**
     * Updates the startup pages list with the given entries.
     * @param {Array} pages List of startup pages.
     * @private
     */
    updateStartupPages_: function(pages) {
      var model = new ArrayDataModel(pages);
      // Add a "new page" row.
      model.push({
        'modelIndex': '-1'
      });
      $('startupPagesList').dataModel = model;
    },

    /**
     * Handles change events of the radio button 'homepageUseURLButton'.
     * @param {event} change event.
     * @private
     */
    handleHomepageUseURLButtonChange_: function(event) {
      Preferences.setBooleanPref(this.homepage_is_newtabpage_pref_.name, false);
    },

    /**
     * Handles change events of the radio button 'homepageUseNTPButton'.
     * @param {event} change event.
     * @private
     */
    handleHomepageUseNTPButtonChange_: function(event) {
      Preferences.setBooleanPref(this.homepage_is_newtabpage_pref_.name, true);
    },

    /**
     * Handles input and change events of the text field 'homepageURL'.
     * @param {event} input/change event.
     * @private
     */
    handleHomepageURLChange_: function(event) {
      var homepageField = $('homepageURL');
      var doFixup = event.type == 'change' ? '1' : '0';
      chrome.send('setHomePage', [homepageField.value, doFixup]);
    },

    /**
     * Handle change events of the preference 'homepage'.
     * @param {event} preference changed event.
     * @private
     */
    handleHomepageChange_: function(event) {
      this.homepage_pref_.value = event.value['value'];
      this.homepage_pref_.controlledBy = event.value['controlledBy'];
      if (this.isHomepageURLNewTabPageURL_() &&
          !this.homepage_pref_.controlledBy &&
          !this.homepage_is_newtabpage_pref_.controlledBy) {
        var useNewTabPage = this.isHomepageIsNewTabPageChoiceSelected_();
        Preferences.setStringPref(this.homepage_pref_.name, '')
        Preferences.setBooleanPref(this.homepage_is_newtabpage_pref_.name,
                                   useNewTabPage)
      }
      this.updateHomepageControlStates_();
    },

    /**
     * Handle change events of the preference homepage_is_newtabpage.
     * @param {event} preference changed event.
     * @private
     */
    handleHomepageIsNewTabPageChange_: function(event) {
      this.homepage_is_newtabpage_pref_.value = event.value['value'];
      this.homepage_is_newtabpage_pref_.controlledBy =
          event.value['controlledBy'];
      this.updateHomepageControlStates_();
    },

    /**
     * Update homepage preference UI controls.  Here's a table describing the
     * desired characteristics of the homepage choice radio value, its enabled
     * state and the URL field enabled state. They depend on the values of the
     * managed bits for homepage (m_hp) and homepageIsNewTabPage (m_ntp)
     * preferences, as well as the value of the homepageIsNewTabPage preference
     * (ntp) and whether the homepage preference is equal to the new tab page
     * URL (hpisntp).
     *
     * m_hp m_ntp ntp hpisntp| choice value| choice enabled| URL field enabled
     * ------------------------------------------------------------------------
     * 0    0     0   0      | homepage    | 1             | 1
     * 0    0     0   1      | new tab page| 1             | 0
     * 0    0     1   0      | new tab page| 1             | 0
     * 0    0     1   1      | new tab page| 1             | 0
     * 0    1     0   0      | homepage    | 0             | 1
     * 0    1     0   1      | homepage    | 0             | 1
     * 0    1     1   0      | new tab page| 0             | 0
     * 0    1     1   1      | new tab page| 0             | 0
     * 1    0     0   0      | homepage    | 1             | 0
     * 1    0     0   1      | new tab page| 0             | 0
     * 1    0     1   0      | new tab page| 1             | 0
     * 1    0     1   1      | new tab page| 0             | 0
     * 1    1     0   0      | homepage    | 0             | 0
     * 1    1     0   1      | new tab page| 0             | 0
     * 1    1     1   0      | new tab page| 0             | 0
     * 1    1     1   1      | new tab page| 0             | 0
     *
     * thus, we have:
     *
     *    choice value is new tab page === ntp || (hpisntp && (m_hp || !m_ntp))
     *    choice enabled === !m_ntp && !(m_hp && hpisntp)
     *    URL field enabled === !ntp && !mhp && !(hpisntp && !m_ntp)
     *
     * which also make sense if you think about them.
     * @private
     */
    updateHomepageControlStates_: function() {
      var homepageField = $('homepageURL');
      homepageField.disabled = !this.isHomepageURLFieldEnabled_();
      if (homepageField.value != this.homepage_pref_.value)
        homepageField.value = this.homepage_pref_.value;
      homepageField.style.backgroundImage = url('chrome://favicon/' +
                                                this.homepage_pref_.value);
      var disableChoice = !this.isHomepageChoiceEnabled_();
      $('homepageUseURLButton').disabled = disableChoice;
      $('homepageUseNTPButton').disabled = disableChoice;
      var useNewTabPage = this.isHomepageIsNewTabPageChoiceSelected_();
      $('homepageUseNTPButton').checked = useNewTabPage;
      $('homepageUseURLButton').checked = !useNewTabPage;
    },

    /**
     * Tests whether the value of the 'homepage' preference equls the new tab
     * page url (chrome://newtab).
     * @returns {boolean} True if the 'homepage' value equals the new tab page
     *     url.
     * @private
     */
    isHomepageURLNewTabPageURL_ : function() {
      return (this.homepage_pref_.value.toLowerCase() == 'chrome://newtab');
    },

    /**
     * Tests whether the Homepage choice "Use New Tab Page" is selected.
     * @returns {boolean} True if "Use New Tab Page" is selected.
     * @private
     */
    isHomepageIsNewTabPageChoiceSelected_: function() {
      return (this.homepage_is_newtabpage_pref_.value ||
              (this.isHomepageURLNewTabPageURL_() &&
               (this.homepage_pref_.controlledBy ||
                !this.homepage_is_newtabpage_pref_.controlledBy)));
    },

    /**
     * Tests whether the home page choice controls are enabled.
     * @returns {boolean} True if the home page choice controls are enabled.
     * @private
     */
    isHomepageChoiceEnabled_: function() {
      return (!this.homepage_is_newtabpage_pref_.controlledBy &&
              !(this.homepage_pref_.controlledBy &&
                this.isHomepageURLNewTabPageURL_()));
    },

    /**
     * Checks whether the home page field should be enabled.
     * @returns {boolean} True if the home page field should be enabled.
     * @private
     */
    isHomepageURLFieldEnabled_: function() {
      return (!this.homepage_is_newtabpage_pref_.value &&
              !this.homepage_pref_.controlledBy &&
              !(this.isHomepageURLNewTabPageURL_() &&
                !this.homepage_is_newtabpage_pref_.controlledBy));
    },

    /**
     * Sets the enabled state of the custom startup page list controls
     * based on the current startup radio button selection.
     * @private
     */
    updateCustomStartupPageControlStates_: function() {
      var disable = !this.shouldEnableCustomStartupPageControls();
      var startupPagesList = $('startupPagesList');
      startupPagesList.disabled = disable;
      // Explicitly set disabled state for input text elements.
      var inputs = startupPagesList.querySelectorAll("input[type='text']");
      for (var i = 0; i < inputs.length; i++)
        inputs[i].disabled = disable;
      $('startupUseCurrentButton').disabled = disable;
    },

    /**
     * Handle change events of the preference
     * 'session.urls_to_restore_on_startup'.
     * @param {event} preference changed event.
     * @private
     */
    handleStartupPageListChange_: function(event) {
      this.startup_pages_pref_.controlledBy = event.value['controlledBy'];
      this.updateCustomStartupPageControlStates_();
    },

    /**
     * Set the default search engine based on the popup selection.
     */
    setDefaultSearchEngine_: function() {
      var engineSelect = $('defaultSearchEngine');
      var selectedIndex = engineSelect.selectedIndex;
      if (selectedIndex >= 0) {
        var selection = engineSelect.options[selectedIndex];
        chrome.send('setDefaultSearchEngine', [String(selection.value)]);
      }
    },

    /**
     * Sends an asynchronous request for new autocompletion suggestions for the
     * the given query. When new suggestions are available, the C++ handler will
     * call updateAutocompleteSuggestions_.
     * @param {string} query List of autocomplete suggestions.
     * @private
     */
    requestAutocompleteSuggestions_: function(query) {
      chrome.send('requestAutocompleteSuggestions', [query]);
    },

    /**
     * Updates the autocomplete suggestion list with the given entries.
     * @param {Array} pages List of autocomplete suggestions.
     * @private
     */
    updateAutocompleteSuggestions_: function(suggestions) {
      var list = this.autocompleteList_;
      // If the trigger for this update was a value being selected from the
      // current list, do nothing.
      if (list.targetInput && list.selectedItem &&
          list.selectedItem['url'] == list.targetInput.value)
        return;
      list.suggestions = suggestions;
    },
  };

  BrowserOptions.updateDefaultBrowserState = function(statusString, isDefault,
                                                      canBeDefault) {
    if (!lbm.isChromeOS) {
      BrowserOptions.getInstance().updateDefaultBrowserState_(statusString,
                                                              isDefault,
                                                              canBeDefault);
    }
  };

  BrowserOptions.updateSearchEngines = function(engines, defaultValue,
                                                defaultManaged) {
    BrowserOptions.getInstance().updateSearchEngines_(engines, defaultValue,
                                                      defaultManaged);
  };

  BrowserOptions.updateStartupPages = function(pages) {
    BrowserOptions.getInstance().updateStartupPages_(pages);
  };

  BrowserOptions.updateAutocompleteSuggestions = function(suggestions) {
    BrowserOptions.getInstance().updateAutocompleteSuggestions_(suggestions);
  };

  BrowserOptions.setInstantFieldTrialStatus = function(enabled) {
    BrowserOptions.getInstance().setInstantFieldTrialStatus_(enabled);
  };

  // Export
  return {
    BrowserOptions: BrowserOptions
  };

});

// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options.browser_options', function() {
  const AutocompleteList = options.AutocompleteList;
  const InlineEditableItem = options.InlineEditableItem;
  const InlineEditableItemList = options.InlineEditableItemList;

  /**
   * Creates a new startup page list item.
   * @param {Object} pageInfo The page this item represents.
   * @constructor
   * @extends {lbm.ui.ListItem}
   */
  function StartupPageListItem(pageInfo) {
    var el = lbm.doc.createElement('div');
    el.pageInfo_ = pageInfo;
    StartupPageListItem.decorate(el);
    return el;
  }

  /**
   * Decorates an element as a startup page list item.
   * @param {!HTMLElement} el The element to decorate.
   */
  StartupPageListItem.decorate = function(el) {
    el.__proto__ = StartupPageListItem.prototype;
    el.decorate();
  };

  StartupPageListItem.prototype = {
    __proto__: InlineEditableItem.prototype,

    /**
     * Input field for editing the page url.
     * @type {HTMLElement}
     * @private
     */
    urlField_: null,

    /** @inheritDoc */
    decorate: function() {
      InlineEditableItem.prototype.decorate.call(this);

      var pageInfo = this.pageInfo_;

      if (pageInfo['modelIndex'] == '-1') {
        this.isPlaceholder = true;
        pageInfo['title'] = localStrings.getString('startupAddLabel');
        pageInfo['url'] = '';
      }

      var titleEl = this.ownerDocument.createElement('div');
      titleEl.className = 'title';
      titleEl.classList.add('favicon-cell');
      titleEl.classList.add('weakrtl');
      titleEl.textContent = pageInfo['title'];
      if (!this.isPlaceholder) {
        titleEl.style.backgroundImage = url('chrome://favicon/' +
                                            pageInfo['url']);
        titleEl.title = pageInfo['tooltip'];
      }

      this.contentElement.appendChild(titleEl);

      var urlEl = this.createEditableTextCell(pageInfo['url']);
      urlEl.className = 'url';
      urlEl.classList.add('weakrtl');
      this.contentElement.appendChild(urlEl);

      var urlField = urlEl.querySelector('input')
      urlField.required = true;
      urlField.className = 'weakrtl';
      this.urlField_ = urlField;

      this.addEventListener('commitedit', this.onEditCommitted_);

      var self = this;
      urlField.addEventListener('focus', function(event) {
        self.parentNode.autocompleteList.attachToInput(urlField);
      });
      urlField.addEventListener('blur', function(event) {
        self.parentNode.autocompleteList.detach();
      });

      this.draggable = true;
    },

    /** @inheritDoc */
    get currentInputIsValid() {
      return this.urlField_.validity.valid;
    },

    /** @inheritDoc */
    get hasBeenEdited() {
      return this.urlField_.value != this.pageInfo_['url'];
    },

    /**
     * Called when committing an edit; updates the model.
     * @param {Event} e The end event.
     * @private
     */
    onEditCommitted_: function(e) {
      var url = this.urlField_.value;
      if (this.isPlaceholder)
        chrome.send('addStartupPage', [url]);
      else
        chrome.send('editStartupPage', [this.pageInfo_['modelIndex'], url]);
    },
  };

  var StartupPageList = lbm.ui.define('list');

  StartupPageList.prototype = {
    __proto__: InlineEditableItemList.prototype,

    /**
     * An autocomplete suggestion list for URL editing.
     * @type {AutocompleteList}
     */
    autocompleteList: null,

    /**
     * The drop position information: "below" or "above".
     */
    dropPos: null,

    /** @inheritDoc */
    decorate: function() {
      InlineEditableItemList.prototype.decorate.call(this);

      // Listen to drag and drop events.
      this.addEventListener('dragstart', this.handleDragStart_.bind(this));
      this.addEventListener('dragenter', this.handleDragEnter_.bind(this));
      this.addEventListener('dragover', this.handleDragOver_.bind(this));
      this.addEventListener('drop', this.handleDrop_.bind(this));
      this.addEventListener('dragleave', this.handleDragLeave_.bind(this));
      this.addEventListener('dragend', this.handleDragEnd_.bind(this));
    },

    /** @inheritDoc */
    createItem: function(pageInfo) {
      var item = new StartupPageListItem(pageInfo);
      item.urlField_.disabled = this.disabled;
      return item;
    },

    /** @inheritDoc */
    deleteItemAtIndex: function(index) {
      chrome.send('removeStartupPages', [String(index)]);
    },

    /*
     * Computes the target item of drop event.
     * @param {Event} e The drop or dragover event.
     * @private
     */
    getTargetFromDropEvent_ : function(e) {
      var target = e.target;
      // e.target may be an inner element of the list item
      while (target != null && !(target instanceof StartupPageListItem)) {
        target = target.parentNode;
      }
      return target;
    },

    /*
     * Handles the dragstart event.
     * @param {Event} e The dragstart event.
     * @private
     */
    handleDragStart_: function(e) {
      // Prevent dragging if the list is disabled.
      if (this.disabled) {
        e.preventDefault();
        return false;
      }

      var target = e.target;
      // StartupPageListItem should be the only draggable element type in the
      // page but let's make sure.
      if (target instanceof StartupPageListItem) {
        this.draggedItem = target;
        this.draggedItem.editable = false;
        e.dataTransfer.effectAllowed = 'move';
        // We need to put some kind of data in the drag or it will be
        // ignored.  Use the URL in case the user drags to a text field or the
        // desktop.
        e.dataTransfer.setData('text/plain', target.urlField_.value);
      }
    },

    /*
     * Handles the dragenter event.
     * @param {Event} e The dragenter event.
     * @private
     */
    handleDragEnter_: function(e) {
      e.preventDefault();
    },

    /*
     * Handles the dragover event.
     * @param {Event} e The dragover event.
     * @private
     */
    handleDragOver_: function(e) {
      var dropTarget = this.getTargetFromDropEvent_(e);
      // Determines whether the drop target is to accept the drop.
      // The drop is only successful on another StartupPageListItem.
      if (!(dropTarget instanceof StartupPageListItem) ||
          dropTarget == this.draggedItem || dropTarget.isPlaceholder) {
        this.hideDropMarker_();
        return;
      }
      // Compute the drop postion. Should we move the dragged item to
      // below or above the drop target?
      var rect = dropTarget.getBoundingClientRect();
      var dy = e.clientY - rect.top;
      var yRatio = dy / rect.height;
      var dropPos = yRatio <= .5 ? 'above' : 'below';
      this.dropPos = dropPos;
      this.showDropMarker_(dropTarget, dropPos);
      e.preventDefault();
    },

    /*
     * Handles the drop event.
     * @param {Event} e The drop event.
     * @private
     */
    handleDrop_: function(e) {
      var dropTarget = this.getTargetFromDropEvent_(e);
      this.hideDropMarker_();

      // Insert the selection at the new position.
      var newIndex = this.dataModel.indexOf(dropTarget.pageInfo_);
      if (this.dropPos == 'below')
        newIndex += 1;

      var selected = this.selectionModel.selectedIndexes;
      var stringized_selected = [];
      for (var j = 0; j < selected.length; j++)
        stringized_selected.push(String(selected[j]));

      chrome.send('dragDropStartupPage',
          [String(newIndex), stringized_selected] );
    },

    /*
     * Handles the dragleave event.
     * @param {Event} e The dragleave event
     * @private
     */
    handleDragLeave_: function(e) {
      this.hideDropMarker_();
    },

    /**
     * Handles the dragend event.
     * @param {Event} e The dragend event
     * @private
     */
    handleDragEnd_: function(e) {
      this.draggedItem.editable = true;
      this.draggedItem.updateEditState();
    },

    /*
     * Shows and positions the marker to indicate the drop target.
     * @param {HTMLElement} target The current target list item of drop
     * @param {string} pos 'below' or 'above'
     * @private
     */
    showDropMarker_ : function(target, pos) {
      window.clearTimeout(this.hideDropMarkerTimer_);
      var marker = $('startupPagesListDropmarker');
      var rect = target.getBoundingClientRect();
      var markerHeight = 6;
      if (pos == 'above') {
        marker.style.top = (rect.top - markerHeight/2) + 'px';
      } else {
        marker.style.top = (rect.bottom - markerHeight/2) + 'px';
      }
      marker.style.width = rect.width + 'px';
      marker.style.left = rect.left + 'px';
      marker.style.display = 'block';
    },

    /*
     * Hides the drop marker.
     * @private
     */
    hideDropMarker_ : function() {
      // Hide the marker in a timeout to reduce flickering as we move between
      // valid drop targets.
      window.clearTimeout(this.hideDropMarkerTimer_);
      this.hideDropMarkerTimer_ = window.setTimeout(function() {
        $('startupPagesListDropmarker').style.display = '';
      }, 100);
    },
  };

  return {
    StartupPageList: StartupPageList
  };
});

// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {
  var OptionsPage = options.OptionsPage;

  /**
   * ClearBrowserDataOverlay class
   * Encapsulated handling of the 'Clear Browser Data' overlay page.
   * @class
   */
  function ClearBrowserDataOverlay() {
    OptionsPage.call(this, 'clearBrowserData',
                     templateData.clearBrowserDataOverlayTabTitle,
                     'clearBrowserDataOverlay');
  }

  lbm.addSingletonGetter(ClearBrowserDataOverlay);

  ClearBrowserDataOverlay.prototype = {
    // Inherit ClearBrowserDataOverlay from OptionsPage.
    __proto__: OptionsPage.prototype,

    /**
     * Initialize the page.
     */
    initializePage: function() {
      // Call base class implementation to starts preference initialization.
      OptionsPage.prototype.initializePage.call(this);

      var f = this.updateCommitButtonState_.bind(this);
      var types = ['browser.clear_data.browsing_history',
                   'browser.clear_data.download_history',
                   'browser.clear_data.cache',
                   'browser.clear_data.cookies',
                   'browser.clear_data.passwords',
                   'browser.clear_data.form_data'];
      types.forEach(function(type) {
          Preferences.getInstance().addEventListener(type, f);
      });

      var checkboxes = document.querySelectorAll(
          '#cbdContentArea input[type=checkbox]');
      for (var i = 0; i < checkboxes.length; i++) {
        checkboxes[i].onclick = f;
      }
      this.updateCommitButtonState_();

      $('clearBrowserDataDismiss').onclick = function(event) {
        ClearBrowserDataOverlay.dismiss();
      };
      $('clearBrowserDataCommit').onclick = function(event) {
        chrome.send('performClearBrowserData');
      };
    },

    // Set the enabled state of the commit button.
    updateCommitButtonState_: function() {
      var checkboxes = document.querySelectorAll(
          '#cbdContentArea input[type=checkbox]');
      var isChecked = false;
      for (var i = 0; i < checkboxes.length; i++) {
        if (checkboxes[i].checked) {
          isChecked = true;
          break;
        }
      }
      $('clearBrowserDataCommit').disabled = !isChecked;
    },
  };

  //
  // Chrome callbacks
  //
  ClearBrowserDataOverlay.setClearingState = function(state) {
    $('deleteBrowsingHistoryCheckbox').disabled = state;
    $('deleteDownloadHistoryCheckbox').disabled = state;
    $('deleteCacheCheckbox').disabled = state;
    $('deleteCookiesCheckbox').disabled = state;
    $('deletePasswordsCheckbox').disabled = state;
    $('deleteFormDataCheckbox').disabled = state;
    $('clearBrowserDataTimePeriod').disabled = state;
    $('cbdThrobber').style.visibility = state ? 'visible' : 'hidden';

    if (state)
      $('clearBrowserDataCommit').disabled = true;
    else
      ClearBrowserDataOverlay.getInstance().updateCommitButtonState_();
  };

  ClearBrowserDataOverlay.doneClearing = function() {
    // The delay gives the user some feedback that the clearing
    // actually worked. Otherwise the dialog just vanishes instantly in most
    // cases.
    window.setTimeout(function() {
      ClearBrowserDataOverlay.dismiss();
    }, 200);
  };

  ClearBrowserDataOverlay.dismiss = function() {
    OptionsPage.closeOverlay();
    this.setClearingState(false);
  };

  // Export
  return {
    ClearBrowserDataOverlay: ClearBrowserDataOverlay
  };
});

// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {

  var OptionsPage = options.OptionsPage;

  //////////////////////////////////////////////////////////////////////////////
  // ContentSettings class:

  /**
   * Encapsulated handling of content settings page.
   * @constructor
   */
  function ContentSettings() {
    this.activeNavTab = null;
    OptionsPage.call(this, 'content', templateData.contentSettingsPageTabTitle,
                     'content-settings-page');
  }

  lbm.addSingletonGetter(ContentSettings);

  ContentSettings.prototype = {
    __proto__: OptionsPage.prototype,

    initializePage: function() {
      OptionsPage.prototype.initializePage.call(this);

      chrome.send('getContentFilterSettings');

      var exceptionsButtons =
          this.pageDiv.querySelectorAll('.exceptions-list-button');
      for (var i = 0; i < exceptionsButtons.length; i++) {
        exceptionsButtons[i].onclick = function(event) {
          var page = ContentSettingsExceptionsArea.getInstance();
          page.showList(
              event.target.getAttribute('contentType'));
          OptionsPage.navigateToPage('contentExceptions');
          // Add on the proper hash for the content type, and store that in the
          // history so back/forward and tab restore works.
          var hash = event.target.getAttribute('contentType');
          window.history.replaceState({pageName: page.name}, page.title,
                                      '/' + page.name + "#" + hash);
        };
      }

      var manageHandlersButton = $('manage-handlers-button');
      if (manageHandlersButton) {
        manageHandlersButton.onclick = function(event) {
          OptionsPage.navigateToPage('handlers');
        };
      }

      var manageIntentsButton = $('manage-intents-button');
      if (manageIntentsButton) {
        manageIntentsButton.onclick = function(event) {
          OptionsPage.navigateToPage('intents');
        };
      }

      // Cookies filter page ---------------------------------------------------
      $('show-cookies-button').onclick = function(event) {
        chrome.send('coreOptionsUserMetricsAction', ['Options_ShowCookies']);
        OptionsPage.navigateToPage('cookies');
      };

      if (!templateData.enable_click_to_play)
        $('click_to_play').hidden = true;

      if (!templateData.enable_web_intents && $('intent-section'))
        $('intent-section').hidden = true;
    },
  };

  ContentSettings.updateHandlersEnabledRadios = function(enabled) {
    var selector = '#content-settings-page input[type=radio][value=' +
        (enabled ? 'allow' : 'block') + '].handler-radio';
    document.querySelector(selector).checked = true;
  };

  /**
   * Sets the values for all the content settings radios.
   * @param {Object} dict A mapping from radio groups to the checked value for
   *     that group.
   */
  ContentSettings.setContentFilterSettingsValue = function(dict) {
    for (var group in dict) {
      document.querySelector('input[type=radio][name=' + group + '][value=' +
                             dict[group]['value'] + ']').checked = true;
      var radios = document.querySelectorAll('input[type=radio][name=' +
                                             group + ']');
      for (var i = 0, len = radios.length; i < len; i++) {
        var managed = dict[group]['managed'];
        radios[i].disabled = managed;
        radios[i].controlledBy = managed ? 'policy': null;
      }
    }
    OptionsPage.updateManagedBannerVisibility();
  };

  /**
   * Initializes an exceptions list.
   * @param {string} type The content type that we are setting exceptions for.
   * @param {Array} list An array of pairs, where the first element of each pair
   *     is the filter string, and the second is the setting (allow/block).
   */
  ContentSettings.setExceptions = function(type, list) {
    var exceptionsList =
        document.querySelector('div[contentType=' + type + ']' +
                               ' list[mode=normal]');
    exceptionsList.setExceptions(list);
  };

  ContentSettings.setHandlers = function(list) {
    $('handlers-list').setHandlers(list);
  };

  ContentSettings.setIgnoredHandlers = function(list) {
    $('ignored-handlers-list').setHandlers(list);
  };

  ContentSettings.setOTRExceptions = function(type, list) {
    var exceptionsList =
        document.querySelector('div[contentType=' + type + ']' +
                               ' list[mode=otr]');

    exceptionsList.parentNode.hidden = false;
    exceptionsList.setExceptions(list);
  };

  /**
   * The browser's response to a request to check the validity of a given URL
   * pattern.
   * @param {string} type The content type.
   * @param {string} mode The browser mode.
   * @param {string} pattern The pattern.
   * @param {bool} valid Whether said pattern is valid in the context of
   *     a content exception setting.
   */
  ContentSettings.patternValidityCheckComplete =
      function(type, mode, pattern, valid) {
    var exceptionsList =
        document.querySelector('div[contentType=' + type + '] ' +
                               'list[mode=' + mode + ']');
    exceptionsList.patternValidityCheckComplete(pattern, valid);
  };

  // Export
  return {
    ContentSettings: ContentSettings
  };

});

// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options.contentSettings', function() {
  const InlineEditableItemList = options.InlineEditableItemList;
  const InlineEditableItem = options.InlineEditableItem;
  const ArrayDataModel = lbm.ui.ArrayDataModel;

  /**
   * Creates a new exceptions list item.
   * @param {string} contentType The type of the list.
   * @param {string} mode The browser mode, 'otr' or 'normal'.
   * @param {boolean} enableAskOption Whether to show an 'ask every time'
   *     option in the select.
   * @param {Object} exception A dictionary that contains the data of the
   *     exception.
   * @constructor
   * @extends {options.InlineEditableItem}
   */
  function ExceptionsListItem(contentType, mode, enableAskOption, exception) {
    var el = lbm.doc.createElement('div');
    el.mode = mode;
    el.contentType = contentType;
    el.enableAskOption = enableAskOption;
    el.dataItem = exception;
    el.__proto__ = ExceptionsListItem.prototype;
    el.decorate();

    return el;
  }

  ExceptionsListItem.prototype = {
    __proto__: InlineEditableItem.prototype,

    /**
     * Called when an element is decorated as a list item.
     */
    decorate: function() {
      InlineEditableItem.prototype.decorate.call(this);

      this.isPlaceholder = !this.pattern;
      var patternCell = this.createEditableTextCell(this.pattern);
      patternCell.className = 'exception-pattern';
      patternCell.classList.add('weakrtl');
      this.contentElement.appendChild(patternCell);
      if (this.pattern)
        this.patternLabel = patternCell.querySelector('.static-text');
      var input = patternCell.querySelector('input');

      // TODO(stuartmorgan): Create an createEditableSelectCell abstracting
      // this code.
      // Setting label for display mode. |pattern| will be null for the 'add new
      // exception' row.
      if (this.pattern) {
        var settingLabel = lbm.doc.createElement('span');
        settingLabel.textContent = this.settingForDisplay();
        settingLabel.className = 'exception-setting';
        settingLabel.setAttribute('displaymode', 'static');
        this.contentElement.appendChild(settingLabel);
        this.settingLabel = settingLabel;
      }

      // Setting select element for edit mode.
      var select = lbm.doc.createElement('select');
      var optionAllow = lbm.doc.createElement('option');
      optionAllow.textContent = templateData.allowException;
      optionAllow.value = 'allow';
      select.appendChild(optionAllow);

      if (this.enableAskOption) {
        var optionAsk = lbm.doc.createElement('option');
        optionAsk.textContent = templateData.askException;
        optionAsk.value = 'ask';
        select.appendChild(optionAsk);
      }

      if (this.contentType == 'cookies') {
        var optionSession = lbm.doc.createElement('option');
        optionSession.textContent = templateData.sessionException;
        optionSession.value = 'session';
        select.appendChild(optionSession);
      }

      var optionBlock = lbm.doc.createElement('option');
      optionBlock.textContent = templateData.blockException;
      optionBlock.value = 'block';
      select.appendChild(optionBlock);

      this.contentElement.appendChild(select);
      select.className = 'exception-setting';
      if (this.pattern)
        select.setAttribute('displaymode', 'edit');

      // Used to track whether the URL pattern in the input is valid.
      // This will be true if the browser process has informed us that the
      // current text in the input is valid. Changing the text resets this to
      // false, and getting a response from the browser sets it back to true.
      // It starts off as false for empty string (new exceptions) or true for
      // already-existing exceptions (which we assume are valid).
      this.inputValidityKnown = this.pattern;
      // This one tracks the actual validity of the pattern in the input. This
      // starts off as true so as not to annoy the user when he adds a new and
      // empty input.
      this.inputIsValid = true;

      this.input = input;
      this.select = select;

      this.updateEditables();

      // Editing notifications and geolocation is disabled for now.
      if (this.contentType == 'notifications' ||
          this.contentType == 'location') {
        this.editable = false;
      }

      // If the source of the content setting exception is a policy, then the
      // content settings exception is managed and the user can't edit it.
      if (this.dataItem.source == 'policy') {
        this.setAttribute('managedby', this.dataItem.source);
        this.deletable = false;
        this.editable = false;
      }

      var listItem = this;
      // Handle events on the editable nodes.
      input.oninput = function(event) {
        listItem.inputValidityKnown = false;
        chrome.send('checkExceptionPatternValidity',
                    [listItem.contentType, listItem.mode, input.value]);
      };

      // Listen for edit events.
      this.addEventListener('canceledit', this.onEditCancelled_);
      this.addEventListener('commitedit', this.onEditCommitted_);
    },

    /**
     * The pattern (e.g., a URL) for the exception.
     * @type {string}
     */
    get pattern() {
      return this.dataItem['displayPattern'];
    },
    set pattern(pattern) {
      this.dataItem['displayPattern'] = pattern;
    },

    /**
     * The setting (allow/block) for the exception.
     * @type {string}
     */
    get setting() {
      return this.dataItem['setting'];
    },
    set setting(setting) {
      this.dataItem['setting'] = setting;
    },

    /**
     * Gets a human-readable setting string.
     * @type {string}
     */
    settingForDisplay: function() {
      var setting = this.setting;
      if (setting == 'allow')
        return templateData.allowException;
      else if (setting == 'block')
        return templateData.blockException;
      else if (setting == 'ask')
        return templateData.askException;
      else if (setting == 'session')
        return templateData.sessionException;
    },

    /**
     * Update this list item to reflect whether the input is a valid pattern.
     * @param {boolean} valid Whether said pattern is valid in the context of
     *     a content exception setting.
     */
    setPatternValid: function(valid) {
      if (valid || !this.input.value)
        this.input.setCustomValidity('');
      else
        this.input.setCustomValidity(' ');
      this.inputIsValid = valid;
      this.inputValidityKnown = true;
    },

    /**
     * Set the <input> to its original contents. Used when the user quits
     * editing.
     */
    resetInput: function() {
      this.input.value = this.pattern;
    },

    /**
     * Copy the data model values to the editable nodes.
     */
    updateEditables: function() {
      this.resetInput();

      var settingOption =
          this.select.querySelector('[value=\'' + this.setting + '\']');
      if (settingOption)
        settingOption.selected = true;
    },

    /** @inheritDoc */
    get currentInputIsValid() {
      return this.inputValidityKnown && this.inputIsValid;
    },

    /** @inheritDoc */
    get hasBeenEdited() {
      var livePattern = this.input.value;
      var liveSetting = this.select.value;
      return livePattern != this.pattern || liveSetting != this.setting;
    },

    /**
     * Called when committing an edit.
     * @param {Event} e The end event.
     * @private
     */
    onEditCommitted_: function(e) {
      var newPattern = this.input.value;
      var newSetting = this.select.value;

      this.finishEdit(newPattern, newSetting);
    },

    /**
     * Called when cancelling an edit; resets the control states.
     * @param {Event} e The cancel event.
     * @private
     */
    onEditCancelled_: function() {
      this.updateEditables();
      this.setPatternValid(true);
    },

    /**
     * Editing is complete; update the model.
     * @param {string} newPattern The pattern that the user entered.
     * @param {string} newSetting The setting the user chose.
     */
    finishEdit: function(newPattern, newSetting) {
      this.patternLabel.textContent = newPattern;
      this.settingLabel.textContent = this.settingForDisplay();
      var oldPattern = this.pattern;
      this.pattern = newPattern;
      this.setting = newSetting;

      // TODO(estade): this will need to be updated if geolocation/notifications
      // become editable.
      if (oldPattern != newPattern) {
        chrome.send('removeException',
                    [this.contentType, this.mode, oldPattern]);
      }

      chrome.send('setException',
                  [this.contentType, this.mode, newPattern, newSetting]);
    }
  };

  /**
   * Creates a new list item for the Add New Item row, which doesn't represent
   * an actual entry in the exceptions list but allows the user to add new
   * exceptions.
   * @param {string} contentType The type of the list.
   * @param {string} mode The browser mode, 'otr' or 'normal'.
   * @param {boolean} enableAskOption Whether to show an 'ask every time'
   *     option in the select.
   * @constructor
   * @extends {lbm.ui.ExceptionsListItem}
   */
  function ExceptionsAddRowListItem(contentType, mode, enableAskOption) {
    var el = lbm.doc.createElement('div');
    el.mode = mode;
    el.contentType = contentType;
    el.enableAskOption = enableAskOption;
    el.dataItem = [];
    el.__proto__ = ExceptionsAddRowListItem.prototype;
    el.decorate();

    return el;
  }

  ExceptionsAddRowListItem.prototype = {
    __proto__: ExceptionsListItem.prototype,

    decorate: function() {
      ExceptionsListItem.prototype.decorate.call(this);

      this.input.placeholder = templateData.addNewExceptionInstructions;

      // Do we always want a default of allow?
      this.setting = 'allow';
    },

    /**
     * Clear the <input> and let the placeholder text show again.
     */
    resetInput: function() {
      this.input.value = '';
    },

    /** @inheritDoc */
    get hasBeenEdited() {
      return this.input.value != '';
    },

    /**
     * Editing is complete; update the model. As long as the pattern isn't
     * empty, we'll just add it.
     * @param {string} newPattern The pattern that the user entered.
     * @param {string} newSetting The setting the user chose.
     */
    finishEdit: function(newPattern, newSetting) {
      this.resetInput();
      chrome.send('setException',
                  [this.contentType, this.mode, newPattern, newSetting]);
    },
  };

  /**
   * Creates a new exceptions list.
   * @constructor
   * @extends {lbm.ui.List}
   */
  var ExceptionsList = lbm.ui.define('list');

  ExceptionsList.prototype = {
    __proto__: InlineEditableItemList.prototype,

    /**
     * Called when an element is decorated as a list.
     */
    decorate: function() {
      InlineEditableItemList.prototype.decorate.call(this);

      this.classList.add('settings-list');

      for (var parentNode = this.parentNode; parentNode;
           parentNode = parentNode.parentNode) {
        if (parentNode.hasAttribute('contentType')) {
          this.contentType = parentNode.getAttribute('contentType');
          break;
        }
      }

      this.mode = this.getAttribute('mode');

      var exceptionList = this;

      // Whether the exceptions in this list allow an 'Ask every time' option.
      this.enableAskOption = (this.contentType == 'plugins' &&
                              templateData.enable_click_to_play);

      this.autoExpands = true;
      this.reset();
    },

    /**
     * Creates an item to go in the list.
     * @param {Object} entry The element from the data model for this row.
     */
    createItem: function(entry) {
      if (entry) {
        return new ExceptionsListItem(this.contentType,
                                      this.mode,
                                      this.enableAskOption,
                                      entry);
      } else {
        var addRowItem = new ExceptionsAddRowListItem(this.contentType,
                                                      this.mode,
                                                      this.enableAskOption);
        addRowItem.deletable = false;
        return addRowItem;
      }
    },

    /**
     * Sets the exceptions in the js model.
     * @param {Object} entries A list of dictionaries of values, each dictionary
     *     represents an exception.
     */
    setExceptions: function(entries) {
      var deleteCount = this.dataModel.length;

      if (this.isEditable()) {
        // We don't want to remove the Add New Exception row.
        deleteCount = deleteCount - 1;
      }

      var args = [0, deleteCount];
      args.push.apply(args, entries);
      this.dataModel.splice.apply(this.dataModel, args);
    },

    /**
     * The browser has finished checking a pattern for validity. Update the
     * list item to reflect this.
     * @param {string} pattern The pattern.
     * @param {bool} valid Whether said pattern is valid in the context of
     *     a content exception setting.
     */
    patternValidityCheckComplete: function(pattern, valid) {
      var listItems = this.items;
      for (var i = 0; i < listItems.length; i++) {
        var listItem = listItems[i];
        // Don't do anything for messages for the item if it is not the intended
        // recipient, or if the response is stale (i.e. the input value has
        // changed since we sent the request to analyze it).
        if (pattern == listItem.input.value)
          listItem.setPatternValid(valid);
      }
    },

    /**
     * Returns whether the rows are editable in this list.
     */
    isEditable: function() {
      // Editing notifications and geolocation is disabled for now.
      return !(this.contentType == 'notifications' ||
               this.contentType == 'location');
    },

    /**
     * Removes all exceptions from the js model.
     */
    reset: function() {
      if (this.isEditable()) {
        // The null creates the Add New Exception row.
        this.dataModel = new ArrayDataModel([null]);
      } else {
        this.dataModel = new ArrayDataModel([]);
      }
    },

    /** @inheritDoc */
    deleteItemAtIndex: function(index) {
      var listItem = this.getListItemByIndex(index);
      if (listItem.undeletable)
        return;

      var dataItem = listItem.dataItem;
      var args = [listItem.contentType];
      if (listItem.contentType == 'location')
        args.push(dataItem['origin'], dataItem['embeddingOrigin']);
      else if (listItem.contentType == 'notifications')
        args.push(dataItem['origin'], dataItem['setting']);
      else
        args.push(listItem.mode, listItem.pattern);

      chrome.send('removeException', args);
    },
  };

  var OptionsPage = options.OptionsPage;

  /**
   * Encapsulated handling of content settings list subpage.
   * @constructor
   */
  function ContentSettingsExceptionsArea() {
    OptionsPage.call(this, 'contentExceptions',
                     templateData.contentSettingsPageTabTitle,
                     'content-settings-exceptions-area');
  }

  lbm.addSingletonGetter(ContentSettingsExceptionsArea);

  ContentSettingsExceptionsArea.prototype = {
    __proto__: OptionsPage.prototype,

    initializePage: function() {
      OptionsPage.prototype.initializePage.call(this);

      var exceptionsLists = this.pageDiv.querySelectorAll('list');
      for (var i = 0; i < exceptionsLists.length; i++) {
        options.contentSettings.ExceptionsList.decorate(exceptionsLists[i]);
      }

      ContentSettingsExceptionsArea.hideOTRLists();

      // If the user types in the URL without a hash, show just cookies.
      this.showList('cookies');
    },

    /**
     * Shows one list and hides all others.
     * @param {string} type The content type.
     */
    showList: function(type) {
      var header = this.pageDiv.querySelector('h1');
      header.textContent = templateData[type + '_header'];

      var divs = this.pageDiv.querySelectorAll('div[contentType]');
      for (var i = 0; i < divs.length; i++) {
        if (divs[i].getAttribute('contentType') == type)
          divs[i].hidden = false;
        else
          divs[i].hidden = true;
      }
    },

    /**
     * Called after the page has been shown. Show the content type for the
     * location's hash.
     */
    didShowPage: function() {
      var hash = location.hash;
      if (hash)
        this.showList(hash.slice(1));
    },
  };

  /**
   * Called when the last incognito window is closed.
   */
  ContentSettingsExceptionsArea.OTRProfileDestroyed = function() {
    this.hideOTRLists();
  };

  /**
   * Clears and hides the incognito exceptions lists.
   */
  ContentSettingsExceptionsArea.hideOTRLists = function() {
    var otrLists = document.querySelectorAll('list[mode=otr]');

    for (var i = 0; i < otrLists.length; i++) {
      otrLists[i].reset();
      otrLists[i].parentNode.hidden = true;
    }
  };

  return {
    ExceptionsListItem: ExceptionsListItem,
    ExceptionsAddRowListItem: ExceptionsAddRowListItem,
    ExceptionsList: ExceptionsList,
    ContentSettingsExceptionsArea: ContentSettingsExceptionsArea,
  };
});

// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {

  //////////////////////////////////////////////////////////////////////////////
  // ContentSettingsRadio class:

  // Define a constructor that uses an input element as its underlying element.
  var ContentSettingsRadio = lbm.ui.define('input');

  ContentSettingsRadio.prototype = {
    __proto__: HTMLInputElement.prototype,

    /**
     * Initialization function for the lbm.ui framework.
     */
    decorate: function() {
      this.type = 'radio';
      var self = this;

      this.addEventListener('change',
          function(e) {
            chrome.send('setContentFilter', [this.name, this.value]);
          });
    },
  };

  /**
   * Whether the content setting is controlled by something else than the user's
   * settings (either 'policy' or 'extension').
   * @type {string}
   */
  lbm.defineProperty(ContentSettingsRadio, 'controlledBy', lbm.PropertyKind.ATTR);

  //////////////////////////////////////////////////////////////////////////////
  // HandlersEnabledRadio class:

  // Define a constructor that uses an input element as its underlying element.
  var HandlersEnabledRadio = lbm.ui.define('input');

  HandlersEnabledRadio.prototype = {
    __proto__: HTMLInputElement.prototype,

    /**
     * Initialization function for the lbm.ui framework.
     */
    decorate: function() {
      this.type = 'radio';
      var self = this;

      this.addEventListener('change',
          function(e) {
            chrome.send('setHandlersEnabled', [this.value == 'allow']);
          });
    },
  };

  // Export
  return {
    ContentSettingsRadio: ContentSettingsRadio,
    HandlersEnabledRadio: HandlersEnabledRadio
  };

});


// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {
  const DeletableItemList = options.DeletableItemList;
  const DeletableItem = options.DeletableItem;
  const ArrayDataModel = lbm.ui.ArrayDataModel;
  const ListSingleSelectionModel = lbm.ui.ListSingleSelectionModel;

  // This structure maps the various cookie type names from C++ (hence the
  // underscores) to arrays of the different types of data each has, along with
  // the i18n name for the description of that data type.
  const cookieInfo = {
    'cookie': [ ['name', 'label_cookie_name'],
                ['content', 'label_cookie_content'],
                ['domain', 'label_cookie_domain'],
                ['path', 'label_cookie_path'],
                ['sendfor', 'label_cookie_send_for'],
                ['accessibleToScript', 'label_cookie_accessible_to_script'],
                ['created', 'label_cookie_created'],
                ['expires', 'label_cookie_expires'] ],
    'app_cache': [ ['manifest', 'label_app_cache_manifest'],
                   ['size', 'label_local_storage_size'],
                   ['created', 'label_cookie_created'],
                   ['accessed', 'label_cookie_last_accessed'] ],
    'database': [ ['name', 'label_cookie_name'],
                  ['desc', 'label_webdb_desc'],
                  ['size', 'label_local_storage_size'],
                  ['modified', 'label_local_storage_last_modified'] ],
    'local_storage': [ ['origin', 'label_local_storage_origin'],
                       ['size', 'label_local_storage_size'],
                       ['modified', 'label_local_storage_last_modified'] ],
    'indexed_db': [ ['origin', 'label_indexed_db_origin'],
                    ['size', 'label_indexed_db_size'],
                    ['modified', 'label_indexed_db_last_modified'] ],
    'file_system': [ ['origin', 'label_file_system_origin'],
                     ['persistent', 'label_file_system_persistent_usage' ],
                     ['temporary', 'label_file_system_temporary_usage' ] ],
  };

  const localStrings = new LocalStrings();

  /**
   * Returns the item's height, like offsetHeight but such that it works better
   * when the page is zoomed. See the similar calculation in @{code lbm.ui.List}.
   * This version also accounts for the animation done in this file.
   * @param {Element} item The item to get the height of.
   * @return {number} The height of the item, calculated with zooming in mind.
   */
  function getItemHeight(item) {
    var height = item.style.height;
    // Use the fixed animation target height if set, in case the element is
    // currently being animated and we'd get an intermediate height below.
    if (height && height.substr(-2) == 'px')
      return parseInt(height.substr(0, height.length - 2));
    return item.getBoundingClientRect().height;
  }

  /**
   * Create tree nodes for the objects in the data array, and insert them all
   * into the given list using its @{code splice} method at the given index.
   * @param {Array.<Object>} data The data objects for the nodes to add.
   * @param {number} start The index at which to start inserting the nodes.
   * @return {Array.<CookieTreeNode>} An array of CookieTreeNodes added.
   */
  function spliceTreeNodes(data, start, list) {
    var nodes = data.map(function(x) { return new CookieTreeNode(x); });
    // Insert [start, 0] at the beginning of the array of nodes, making it
    // into the arguments we want to pass to @{code list.splice} below.
    nodes.splice(0, 0, start, 0);
    list.splice.apply(list, nodes);
    // Remove the [start, 0] prefix and return the array of nodes.
    nodes.splice(0, 2);
    return nodes;
  }

  var parentLookup = {};
  var lookupRequests = {};

  /**
   * Creates a new list item for sites data. Note that these are created and
   * destroyed lazily as they scroll into and out of view, so they must be
   * stateless. We cache the expanded item in @{code CookiesList} though, so it
   * can keep state. (Mostly just which item is selected.)
   * @param {Object} origin Data used to create a cookie list item.
   * @param {CookiesList} list The list that will contain this item.
   * @constructor
   * @extends {DeletableItem}
   */
  function CookieListItem(origin, list) {
    var listItem = new DeletableItem(null);
    listItem.__proto__ = CookieListItem.prototype;

    listItem.origin = origin;
    listItem.list = list;
    listItem.decorate();

    // This hooks up updateOrigin() to the list item, makes the top-level
    // tree nodes (i.e., origins) register their IDs in parentLookup, and
    // causes them to request their children if they have none. Note that we
    // have special logic in the setter for the parent property to make sure
    // that we can still garbage collect list items when they scroll out of
    // view, even though it appears that we keep a direct reference.
    if (origin) {
      origin.parent = listItem;
      origin.updateOrigin();
    }

    return listItem;
  }

  CookieListItem.prototype = {
    __proto__: DeletableItem.prototype,

    /** @inheritDoc */
    decorate: function() {
      this.siteChild = this.ownerDocument.createElement('div');
      this.siteChild.className = 'cookie-site';
      this.dataChild = this.ownerDocument.createElement('div');
      this.dataChild.className = 'cookie-data';
      this.sizeChild = this.ownerDocument.createElement('div');
      this.sizeChild.className = 'cookie-size';
      this.itemsChild = this.ownerDocument.createElement('div');
      this.itemsChild.className = 'cookie-items';
      this.infoChild = this.ownerDocument.createElement('div');
      this.infoChild.className = 'cookie-details';
      this.infoChild.hidden = true;
      var remove = this.ownerDocument.createElement('button');
      remove.textContent = localStrings.getString('remove_cookie');
      remove.onclick = this.removeCookie_.bind(this);
      this.infoChild.appendChild(remove);
      var content = this.contentElement;
      content.appendChild(this.siteChild);
      content.appendChild(this.dataChild);
      content.appendChild(this.sizeChild);
      content.appendChild(this.itemsChild);
      this.itemsChild.appendChild(this.infoChild);
      if (this.origin && this.origin.data) {
        this.siteChild.textContent = this.origin.data.title;
        this.siteChild.setAttribute('title', this.origin.data.title);
      }
      this.itemList_ = [];
    },

    /** @type {boolean} */
    get expanded() {
      return this.expanded_;
    },
    set expanded(expanded) {
      if (this.expanded_ == expanded)
        return;
      this.expanded_ = expanded;
      if (expanded) {
        var oldExpanded = this.list.expandedItem;
        this.list.expandedItem = this;
        this.updateItems_();
        if (oldExpanded)
          oldExpanded.expanded = false;
        this.classList.add('show-items');
      } else {
        if (this.list.expandedItem == this) {
          this.list.leadItemHeight = 0;
          this.list.expandedItem = null;
        }
        this.style.height = '';
        this.itemsChild.style.height = '';
        this.classList.remove('show-items');
      }
    },

    /**
     * The callback for the "remove" button shown when an item is selected.
     * Requests that the currently selected cookie be removed.
     * @private
     */
    removeCookie_: function() {
      if (this.selectedIndex_ >= 0) {
        var item = this.itemList_[this.selectedIndex_];
        if (item && item.node)
          chrome.send('removeCookie', [item.node.pathId]);
      }
    },

    /**
     * Disable animation within this cookie list item, in preparation for making
     * changes that will need to be animated. Makes it possible to measure the
     * contents without displaying them, to set animation targets.
     * @private
     */
    disableAnimation_: function() {
      this.itemsHeight_ = getItemHeight(this.itemsChild);
      this.classList.add('measure-items');
    },

    /**
     * Enable animation after changing the contents of this cookie list item.
     * See @{code disableAnimation_}.
     * @private
     */
    enableAnimation_: function() {
      if (!this.classList.contains('measure-items'))
        this.disableAnimation_();
      this.itemsChild.style.height = '';
      // This will force relayout in order to calculate the new heights.
      var itemsHeight = getItemHeight(this.itemsChild);
      var fixedHeight = getItemHeight(this) + itemsHeight - this.itemsHeight_;
      this.itemsChild.style.height = this.itemsHeight_ + 'px';
      // Force relayout before enabling animation, so that if we have
      // changed things since the last layout, they will not be animated
      // during subsequent layouts.
      this.itemsChild.offsetHeight;
      this.classList.remove('measure-items');
      this.itemsChild.style.height = itemsHeight + 'px';
      this.style.height = fixedHeight + 'px';
      if (this.expanded)
        this.list.leadItemHeight = fixedHeight;
    },

    /**
     * Updates the origin summary to reflect changes in its items.
     * Both CookieListItem and CookieTreeNode implement this API.
     * This implementation scans the descendants to update the text.
     */
    updateOrigin: function() {
      var info = {
        cookies: 0,
        database: false,
        localStorage: false,
        appCache: false,
        indexedDb: false,
        fileSystem: false,
      };
      if (this.origin)
        this.origin.collectSummaryInfo(info);
      var list = [];
      if (info.cookies > 1)
        list.push(localStrings.getStringF('cookie_plural', info.cookies));
      else if (info.cookies > 0)
        list.push(localStrings.getString('cookie_singular'));
      if (info.database || info.indexedDb)
        list.push(localStrings.getString('cookie_database_storage'));
      if (info.localStorage)
        list.push(localStrings.getString('cookie_local_storage'));
      if (info.appCache)
        list.push(localStrings.getString('cookie_app_cache'));
      if (info.fileSystem)
        list.push(localStrings.getString('cookie_file_system'));
      var text = '';
      for (var i = 0; i < list.length; ++i)
        if (text.length > 0)
          text += ', ' + list[i];
        else
          text = list[i];
      this.dataChild.textContent = text;
      if (info.quota && info.quota.totalUsage) {
        this.sizeChild.textContent = info.quota.totalUsage;
      }

      if (this.expanded)
        this.updateItems_();
    },

    /**
     * Updates the items section to reflect changes, animating to the new state.
     * Removes existing contents and calls @{code CookieTreeNode.createItems}.
     * @private
     */
    updateItems_: function() {
      this.disableAnimation_();
      this.itemsChild.textContent = '';
      this.infoChild.hidden = true;
      this.selectedIndex_ = -1;
      this.itemList_ = [];
      if (this.origin)
        this.origin.createItems(this);
      this.itemsChild.appendChild(this.infoChild);
      this.enableAnimation_();
    },

    /**
     * Append a new cookie node "bubble" to this list item.
     * @param {CookieTreeNode} node The cookie node to add a bubble for.
     * @param {Element} div The DOM element for the bubble itself.
     * @return {number} The index the bubble was added at.
     */
    appendItem: function(node, div) {
      this.itemList_.push({node: node, div: div});
      this.itemsChild.appendChild(div);
      return this.itemList_.length - 1;
    },

    /**
     * The currently selected cookie node ("cookie bubble") index.
     * @type {number}
     * @private
     */
    selectedIndex_: -1,

    /**
     * Get the currently selected cookie node ("cookie bubble") index.
     * @type {number}
     */
    get selectedIndex() {
      return this.selectedIndex_;
    },

    /**
     * Set the currently selected cookie node ("cookie bubble") index to
     * @{code itemIndex}, unselecting any previously selected node first.
     * @param {number} itemIndex The index to set as the selected index.
     */
    set selectedIndex(itemIndex) {
      // Get the list index up front before we change anything.
      var index = this.list.getIndexOfListItem(this);
      // Unselect any previously selected item.
      if (this.selectedIndex_ >= 0) {
        var item = this.itemList_[this.selectedIndex_];
        if (item && item.div)
          item.div.removeAttribute('selected');
      }
      // Special case: decrementing -1 wraps around to the end of the list.
      if (itemIndex == -2)
        itemIndex = this.itemList_.length - 1;
      // Check if we're going out of bounds and hide the item details.
      if (itemIndex < 0 || itemIndex >= this.itemList_.length) {
        this.selectedIndex_ = -1;
        this.disableAnimation_();
        this.infoChild.hidden = true;
        this.enableAnimation_();
        return;
      }
      // Set the new selected item and show the item details for it.
      this.selectedIndex_ = itemIndex;
      this.itemList_[itemIndex].div.setAttribute('selected', '');
      this.disableAnimation_();
      this.itemList_[itemIndex].node.setDetailText(this.infoChild,
                                                   this.list.infoNodes);
      this.infoChild.hidden = false;
      this.enableAnimation_();
      // If we're near the bottom of the list this may cause the list item to go
      // beyond the end of the visible area. Fix it after the animation is done.
      var list = this.list;
      window.setTimeout(function() { list.scrollIndexIntoView(index); }, 150);
    },
  };

  /**
   * {@code CookieTreeNode}s mirror the structure of the cookie tree lazily, and
   * contain all the actual data used to generate the {@code CookieListItem}s.
   * @param {Object} data The data object for this node.
   * @constructor
   */
  function CookieTreeNode(data) {
    this.data = data;
    this.children = [];
  }

  CookieTreeNode.prototype = {
    /**
     * Insert the given list of cookie tree nodes at the given index.
     * Both CookiesList and CookieTreeNode implement this API.
     * @param {Array.<Object>} data The data objects for the nodes to add.
     * @param {number} start The index at which to start inserting the nodes.
     */
    insertAt: function(data, start) {
      var nodes = spliceTreeNodes(data, start, this.children);
      for (var i = 0; i < nodes.length; i++)
        nodes[i].parent = this;
      this.updateOrigin();
    },

    /**
     * Remove a cookie tree node from the given index.
     * Both CookiesList and CookieTreeNode implement this API.
     * @param {number} index The index of the tree node to remove.
     */
    remove: function(index) {
      if (index < this.children.length) {
        this.children.splice(index, 1);
        this.updateOrigin();
      }
    },

    /**
     * Clears all children.
     * Both CookiesList and CookieTreeNode implement this API.
     * It is used by CookiesList.loadChildren().
     */
    clear: function() {
      // We might leave some garbage in parentLookup for removed children.
      // But that should be OK because parentLookup is cleared when we
      // reload the tree.
      this.children = [];
      this.updateOrigin();
    },

    /**
     * The counter used by startBatchUpdates() and endBatchUpdates().
     * @type {number}
     */
    batchCount_: 0,

    /**
     * See lbm.ui.List.startBatchUpdates().
     * Both CookiesList (via List) and CookieTreeNode implement this API.
     */
    startBatchUpdates: function() {
      this.batchCount_++;
    },

    /**
     * See lbm.ui.List.endBatchUpdates().
     * Both CookiesList (via List) and CookieTreeNode implement this API.
     */
    endBatchUpdates: function() {
      if (!--this.batchCount_)
        this.updateOrigin();
    },

    /**
     * Requests updating the origin summary to reflect changes in this item.
     * Both CookieListItem and CookieTreeNode implement this API.
     */
    updateOrigin: function() {
      if (!this.batchCount_ && this.parent)
        this.parent.updateOrigin();
    },

    /**
     * Summarize the information in this node and update @{code info}.
     * This will recurse into child nodes to summarize all descendants.
     * @param {Object} info The info object from @{code updateOrigin}.
     */
    collectSummaryInfo: function(info) {
      if (this.children.length > 0) {
        for (var i = 0; i < this.children.length; ++i)
          this.children[i].collectSummaryInfo(info);
      } else if (this.data && !this.data.hasChildren) {
        if (this.data.type == 'cookie') {
          info.cookies++;
        } else if (this.data.type == 'database') {
          info.database = true;
        } else if (this.data.type == 'local_storage') {
          info.localStorage = true;
        } else if (this.data.type == 'app_cache') {
          info.appCache = true;
        } else if (this.data.type == 'indexed_db') {
          info.indexedDb = true;
        } else if (this.data.type == 'file_system') {
          info.fileSystem = true;
        } else if (this.data.type == 'quota') {
          info.quota = this.data;
        }
      }
    },

    /**
     * Create the cookie "bubbles" for this node, recursing into children
     * if there are any. Append the cookie bubbles to @{code item}.
     * @param {CookieListItem} item The cookie list item to create items in.
     */
    createItems: function(item) {
      if (this.children.length > 0) {
        for (var i = 0; i < this.children.length; ++i)
          this.children[i].createItems(item);
      } else if (this.data && !this.data.hasChildren) {
        var text = '';
        switch (this.data.type) {
          case 'cookie':
          case 'database':
            text = this.data.name;
            break;
          case 'local_storage':
            text = localStrings.getString('cookie_local_storage');
            break;
          case 'app_cache':
            text = localStrings.getString('cookie_app_cache');
            break;
          case 'indexed_db':
            text = localStrings.getString('cookie_indexed_db');
            break;
          case 'file_system':
            text = localStrings.getString('cookie_file_system');
            break;
        }
        if (!text)
          return;
        var div = item.ownerDocument.createElement('div');
        div.className = 'cookie-item';
        // Help out screen readers and such: this is a clickable thing.
        div.setAttribute('role', 'button');
        div.textContent = text;
        var index = item.appendItem(this, div);
        div.onclick = function() {
          if (item.selectedIndex == index)
            item.selectedIndex = -1;
          else
            item.selectedIndex = index;
        };
      }
    },

    /**
     * Set the detail text to be displayed to that of this cookie tree node.
     * Uses preallocated DOM elements for each cookie node type from @{code
     * infoNodes}, and inserts the appropriate elements to @{code element}.
     * @param {Element} element The DOM element to insert elements to.
     * @param {Object.<string, {table: Element, info: Object.<string,
     *     Element>}>} infoNodes The map from cookie node types to maps from
     *     cookie attribute names to DOM elements to display cookie attribute
     *     values, created by @{code CookiesList.decorate}.
     */
    setDetailText: function(element, infoNodes) {
      var table;
      if (this.data && !this.data.hasChildren) {
        if (cookieInfo[this.data.type]) {
          var info = cookieInfo[this.data.type];
          var nodes = infoNodes[this.data.type].info;
          for (var i = 0; i < info.length; ++i) {
            var name = info[i][0];
            if (name != 'id' && this.data[name])
              nodes[name].textContent = this.data[name];
          }
          table = infoNodes[this.data.type].table;
        }
      }
      while (element.childNodes.length > 1)
        element.removeChild(element.firstChild);
      if (table)
        element.insertBefore(table, element.firstChild);
    },

    /**
     * The parent of this cookie tree node.
     * @type {?CookieTreeNode|CookieListItem}
     */
    get parent(parent) {
      // See below for an explanation of this special case.
      if (typeof this.parent_ == 'number')
        return this.list_.getListItemByIndex(this.parent_);
      return this.parent_;
    },
    set parent(parent) {
      if (parent == this.parent)
        return;
      if (parent instanceof CookieListItem) {
        // If the parent is to be a CookieListItem, then we keep the reference
        // to it by its containing list and list index, rather than directly.
        // This allows the list items to be garbage collected when they scroll
        // out of view (except the expanded item, which we cache). This is
        // transparent except in the setter and getter, where we handle it.
        this.parent_ = parent.listIndex;
        this.list_ = parent.list;
        parent.addEventListener('listIndexChange',
                                this.parentIndexChanged_.bind(this));
      } else {
        this.parent_ = parent;
      }
      if (this.data && this.data.id) {
        if (parent)
          parentLookup[this.data.id] = this;
        else
          delete parentLookup[this.data.id];
      }
      if (this.data && this.data.hasChildren &&
          !this.children.length && !lookupRequests[this.data.id]) {
        lookupRequests[this.data.id] = true;
        chrome.send('loadCookie', [this.pathId]);
      }
    },

    /**
     * Called when the parent is a CookieListItem whose index has changed.
     * See the code above that avoids keeping a direct reference to
     * CookieListItem parents, to allow them to be garbage collected.
     * @private
     */
    parentIndexChanged_: function(event) {
      if (typeof this.parent_ == 'number') {
        this.parent_ = event.newValue;
        // We set a timeout to update the origin, rather than doing it right
        // away, because this callback may occur while the list items are
        // being repopulated following a scroll event. Calling updateOrigin()
        // immediately could trigger relayout that would reset the scroll
        // position within the list, among other things.
        window.setTimeout(this.updateOrigin.bind(this), 0);
      }
    },

    /**
     * The cookie tree path id.
     * @type {string}
     */
    get pathId() {
      var parent = this.parent;
      if (parent && parent instanceof CookieTreeNode)
        return parent.pathId + ',' + this.data.id;
      return this.data.id;
    },
  };

  /**
   * Creates a new cookies list.
   * @param {Object=} opt_propertyBag Optional properties.
   * @constructor
   * @extends {DeletableItemList}
   */
  var CookiesList = lbm.ui.define('list');

  CookiesList.prototype = {
    __proto__: DeletableItemList.prototype,

    /** @inheritDoc */
    decorate: function() {
      DeletableItemList.prototype.decorate.call(this);
      this.classList.add('cookie-list');
      this.data_ = [];
      this.dataModel = new ArrayDataModel(this.data_);
      this.addEventListener('keydown', this.handleKeyLeftRight_.bind(this));
      var sm = new ListSingleSelectionModel();
      sm.addEventListener('change', this.cookieSelectionChange_.bind(this));
      sm.addEventListener('leadIndexChange', this.cookieLeadChange_.bind(this));
      this.selectionModel = sm;
      this.infoNodes = {};
      var doc = this.ownerDocument;
      // Create a table for each type of site data (e.g. cookies, databases,
      // etc.) and save it so that we can reuse it for all origins.
      for (var type in cookieInfo) {
        var table = doc.createElement('table');
        table.className = 'cookie-details-table';
        var tbody = doc.createElement('tbody');
        table.appendChild(tbody);
        var info = {};
        for (var i = 0; i < cookieInfo[type].length; i++) {
          var tr = doc.createElement('tr');
          var name = doc.createElement('td');
          var data = doc.createElement('td');
          var pair = cookieInfo[type][i];
          name.className = 'cookie-details-label';
          name.textContent = localStrings.getString(pair[1]);
          data.className = 'cookie-details-value';
          data.textContent = '';
          tr.appendChild(name);
          tr.appendChild(data);
          tbody.appendChild(tr);
          info[pair[0]] = data;
        }
        this.infoNodes[type] = {table: table, info: info};
      }
    },

    /**
     * Handles key down events and looks for left and right arrows, then
     * dispatches to the currently expanded item, if any.
     * @param {Event} e The keydown event.
     * @private
     */
    handleKeyLeftRight_: function(e) {
      var id = e.keyIdentifier;
      if ((id == 'Left' || id == 'Right') && this.expandedItem) {
        var cs = this.ownerDocument.defaultView.getComputedStyle(this);
        var rtl = cs.direction == 'rtl';
        if ((!rtl && id == 'Left') || (rtl && id == 'Right'))
          this.expandedItem.selectedIndex--;
        else
          this.expandedItem.selectedIndex++;
        this.scrollIndexIntoView(this.expandedItem.listIndex);
        // Prevent the page itself from scrolling.
        e.preventDefault();
      }
    },

    /**
     * Called on selection model selection changes.
     * @param {Event} ce The selection change event.
     * @private
     */
    cookieSelectionChange_: function(ce) {
      ce.changes.forEach(function(change) {
          var listItem = this.getListItemByIndex(change.index);
          if (listItem) {
            if (!change.selected) {
              // We set a timeout here, rather than setting the item unexpanded
              // immediately, so that if another item gets set expanded right
              // away, it will be expanded before this item is unexpanded. It
              // will notice that, and unexpand this item in sync with its own
              // expansion. Later, this callback will end up having no effect.
              window.setTimeout(function() {
                if (!listItem.selected || !listItem.lead)
                  listItem.expanded = false;
              }, 0);
            } else if (listItem.lead) {
              listItem.expanded = true;
            }
          }
        }, this);
    },

    /**
     * Called on selection model lead changes.
     * @param {Event} pe The lead change event.
     * @private
     */
    cookieLeadChange_: function(pe) {
      if (pe.oldValue != -1) {
        var listItem = this.getListItemByIndex(pe.oldValue);
        if (listItem) {
          // See cookieSelectionChange_ above for why we use a timeout here.
          window.setTimeout(function() {
            if (!listItem.lead || !listItem.selected)
              listItem.expanded = false;
          }, 0);
        }
      }
      if (pe.newValue != -1) {
        var listItem = this.getListItemByIndex(pe.newValue);
        if (listItem && listItem.selected)
          listItem.expanded = true;
      }
    },

    /**
     * The currently expanded item. Used by CookieListItem above.
     * @type {?CookieListItem}
     */
    expandedItem: null,

    // from lbm.ui.List
    /** @inheritDoc */
    createItem: function(data) {
      // We use the cached expanded item in order to allow it to maintain some
      // state (like its fixed height, and which bubble is selected).
      if (this.expandedItem && this.expandedItem.origin == data)
        return this.expandedItem;
      return new CookieListItem(data, this);
    },

    // from options.DeletableItemList
    /** @inheritDoc */
    deleteItemAtIndex: function(index) {
      var item = this.data_[index];
      if (item) {
        var pathId = item.pathId;
        if (pathId)
          chrome.send('removeCookie', [pathId]);
      }
    },

    /**
     * Insert the given list of cookie tree nodes at the given index.
     * Both CookiesList and CookieTreeNode implement this API.
     * @param {Array.<Object>} data The data objects for the nodes to add.
     * @param {number} start The index at which to start inserting the nodes.
     */
    insertAt: function(data, start) {
      spliceTreeNodes(data, start, this.dataModel);
    },

    /**
     * Remove a cookie tree node from the given index.
     * Both CookiesList and CookieTreeNode implement this API.
     * @param {number} index The index of the tree node to remove.
     */
    remove: function(index) {
      if (index < this.data_.length)
        this.dataModel.splice(index, 1);
    },

    /**
     * Clears the list.
     * Both CookiesList and CookieTreeNode implement this API.
     * It is used by CookiesList.loadChildren().
     */
    clear: function() {
      parentLookup = {};
      this.data_ = [];
      this.dataModel = new ArrayDataModel(this.data_);
      this.redraw();
    },

    /**
     * Add tree nodes by given parent.
     * @param {Object} parent The parent node.
     * @param {number} start The index at which to start inserting the nodes.
     * @param {Array} nodesData Nodes data array.
     * @private
     */
    addByParent_: function(parent, start, nodesData) {
      if (!parent)
        return;

      parent.startBatchUpdates();
      parent.insertAt(nodesData, start);
      parent.endBatchUpdates();

      lbm.dispatchSimpleEvent(this, 'change');
    },

    /**
     * Add tree nodes by parent id.
     * This is used by cookies_view.js.
     * @param {string} parentId Id of the parent node.
     * @param {number} start The index at which to start inserting the nodes.
     * @param {Array} nodesData Nodes data array.
     */
    addByParentId: function(parentId, start, nodesData) {
      var parent = parentId ? parentLookup[parentId] : this;
      this.addByParent_(parent, start, nodesData);
    },

    /**
     * Removes tree nodes by parent id.
     * This is used by cookies_view.js.
     * @param {string} parentId Id of the parent node.
     * @param {number} start The index at which to start removing the nodes.
     * @param {number} count Number of nodes to remove.
     */
    removeByParentId: function(parentId, start, count) {
      var parent = parentId ? parentLookup[parentId] : this;
      if (!parent)
        return;

      parent.startBatchUpdates();
      while (count-- > 0)
        parent.remove(start);
      parent.endBatchUpdates();

      lbm.dispatchSimpleEvent(this, 'change');
    },

    /**
     * Loads the immediate children of given parent node.
     * This is used by cookies_view.js.
     * @param {string} parentId Id of the parent node.
     * @param {Array} children The immediate children of parent node.
     */
    loadChildren: function(parentId, children) {
      if (parentId)
        delete lookupRequests[parentId];
      var parent = parentId ? parentLookup[parentId] : this;
      if (!parent)
        return;

      parent.startBatchUpdates();
      parent.clear();
      this.addByParent_(parent, 0, children);
      parent.endBatchUpdates();
    },
  };

  return {
    CookiesList: CookiesList
  };
});

// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {

  var OptionsPage = options.OptionsPage;

  /////////////////////////////////////////////////////////////////////////////
  // CookiesView class:

  /**
   * Encapsulated handling of the cookies and other site data page.
   * @constructor
   */
  function CookiesView(model) {
    OptionsPage.call(this, 'cookies',
                     templateData.cookiesViewPageTabTitle,
                     'cookiesViewPage');
  }

  lbm.addSingletonGetter(CookiesView);

  CookiesView.prototype = {
    __proto__: OptionsPage.prototype,

    /**
     * The timer id of the timer set on search query change events.
     * @type {number}
     * @private
     */
    queryDelayTimerId_: 0,

    /**
     * The most recent search query, or null if the query is empty.
     * @type {?string}
     * @private
     */
    lastQuery_ : null,

    initializePage: function() {
      OptionsPage.prototype.initializePage.call(this);

      $('cookies-search-box').addEventListener('search',
          this.handleSearchQueryChange_.bind(this));

      $('remove-all-cookies-button').onclick = function(e) {
        chrome.send('removeAllCookies', []);
      };

      var cookiesList = $('cookies-list');
      options.CookiesList.decorate(cookiesList);
      window.addEventListener('resize', this.handleResize_.bind(this));

      this.addEventListener('visibleChange', this.handleVisibleChange_);
    },

    /**
     * Search cookie using text in |cookies-search-box|.
     */
    searchCookie: function() {
      this.queryDelayTimerId_ = 0;
      var filter = $('cookies-search-box').value;
      if (this.lastQuery_ != filter) {
        this.lastQuery_ = filter;
        chrome.send('updateCookieSearchResults', [filter]);
      }
    },

    /**
     * Handles search query changes.
     * @param {!Event} e The event object.
     * @private
     */
    handleSearchQueryChange_: function(e) {
      if (this.queryDelayTimerId_)
        window.clearTimeout(this.queryDelayTimerId_);

      this.queryDelayTimerId_ = window.setTimeout(
          this.searchCookie.bind(this), 500);
    },

    initialized_: false,

    /**
     * Handler for OptionsPage's visible property change event.
     * @param {Event} e Property change event.
     * @private
     */
    handleVisibleChange_: function(e) {
      if (!this.visible)
        return;

      // Resize the cookies list whenever the options page becomes visible.
      this.handleResize_(null);
      if (!this.initialized_) {
        this.initialized_ = true;
        this.searchCookie();
      } else {
        $('cookies-list').redraw();
      }

      $('cookies-search-box').focus();
    },

    /**
     * Handler for when the window changes size. Resizes the cookies list to
     * match the window height.
     * @param {?Event} e Window resize event, or null if called directly.
     * @private
     */
    handleResize_: function(e) {
      if (!this.visible)
        return;
      var cookiesList = $('cookies-list');
      // 25 pixels from the window bottom seems like a visually pleasing amount.
      var height = window.innerHeight - cookiesList.offsetTop - 25;
      cookiesList.style.height = height + 'px';
    },
  };

  // CookiesViewHandler callbacks.
  CookiesView.onTreeItemAdded = function(args) {
    $('cookies-list').addByParentId(args[0], args[1], args[2]);
  };

  CookiesView.onTreeItemRemoved = function(args) {
    $('cookies-list').removeByParentId(args[0], args[1], args[2]);
  };

  CookiesView.loadChildren = function(args) {
    $('cookies-list').loadChildren(args[0], args[1]);
  };

  // Export
  return {
    CookiesView: CookiesView
  };

});

// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {
  /**
   * Creates a new list of extensions.
   * @param {Object=} opt_propertyBag Optional properties.
   * @constructor
   * @extends {lbm.ui.div}
   */
  var ExtensionsList = lbm.ui.define('div');

  var handleInstalled = false;

  ExtensionsList.prototype = {
    __proto__: HTMLDivElement.prototype,

    /** @inheritDoc */
    decorate: function() {
      this.initControlsAndHandlers_();

      var showingDetails = [];
      var showingWarning = [];
      this.deleteExistingExtensionNodes_(showingDetails, showingWarning);

      this.showExtensionNodes_(showingDetails, showingWarning);
    },

    /**
     * Initializes the controls (toggle section and button) and installs
     * handlers.
     * @private
     */
    initControlsAndHandlers_: function() {
      // Make sure developer mode section is set correctly as per saved setting.
      var toggleButton = $('toggle-dev-on');
      var toggleSection = $('dev');
      if (this.data_.developerMode) {
        toggleSection.classList.add('dev-open');
        toggleSection.classList.remove('dev-closed');
        toggleButton.checked = true;
      } else {
        toggleSection.classList.remove('dev-open');
        toggleSection.classList.add('dev-closed');
      }

      // Install handler for key presses.
      if (!handleInstalled) {
        document.addEventListener('keyup', this.upEventHandler_.bind(this));
        document.addEventListener('mouseup', this.upEventHandler_.bind(this));
        handleInstalled = true;
      }
    },

    /**
     * Deletes the existing Extension nodes from the page to make room for new
     * ones. It also keeps track of who was showing details so when the
     * extension list gets recreated we can recreate that state.
     * @param {Array} showingDetails An array that will contain the list of id's
     *                of extension that had the details section expanded.
     * @param {Array} showingWarning An array that will contain the list of id's
     *                of extension that were showing a warning.
     * @private
     */
     deleteExistingExtensionNodes_: function(showingDetails, showingWarning) {
      // Delete all child nodes before adding them back and while we are at it
      // make a note of which ones were in expanded state (and which showing
      // the warning) so we can restore those to the same state afterwards.
      while (this.hasChildNodes()){
        var child = this.firstChild;

        // See if the item is expanded.
        if (child.classList.contains('extension-list-item-expanded'))
          showingDetails.push(child.id);

        // See if the butterbar is showing.
        var butterBar = document.getElementById(child.id + '_incognitoWarning');
        if (!(butterBar === null) && !butterBar.hidden)
          showingWarning.push(child.id);

        // Now we can delete it.
        this.removeChild(child);
      }
    },

    /**
     * Handles decorating the details section.
     * @param {Element} details The div that the details should be attached to.
     * @param {Object} extension The extension we are shoting the details for.
     * @param {boolean} expanded Whether to show the details expanded or not.
     * @param {boolean} showButterbar Whether to show the incognito warning or
     *                  not.
     * @private
     */
     showExtensionNodes_: function(showingDetails, showingWarning) {
      // Keeps track of differences in checkbox width.
      var minCheckboxWidth = 999999;
      var maxCheckboxWidth = 0;

      // Iterate over the extension data and add each item to the list.
      for (var i = 0; i < this.data_.extensions.length; ++i) {
        var extension = this.data_.extensions[i];
        var id = extension.id;

        var wrapper = this.ownerDocument.createElement('div');

        // Figure out if the item should open expanded or not based on the state
        // of things before we deleted the items.
        var iter = showingDetails.length;
        var expanded = false;
        while (iter--) {
          if (showingDetails[iter] == id) {
            expanded = true;
            break;
          }
        }
        // Figure out if the butterbar should be showing.
        iter = showingWarning.length;
        var butterbar = false;
        while (iter--) {
          if (showingWarning[iter] == id) {
            butterbar = true;
            break;
          }
        }

        wrapper.classList.add(expanded ? 'extension-list-item-expanded' :
                                         'extension-list-item-collaped');
        if (!extension.enabled)
          wrapper.classList.add('disabled');
        wrapper.id = id;
        this.appendChild(wrapper);

        var vbox_outer = this.ownerDocument.createElement('div');
        vbox_outer.classList.add('vbox');
        vbox_outer.classList.add('extension-list-item');
        wrapper.appendChild(vbox_outer);

        var hbox = this.ownerDocument.createElement('div');
        hbox.classList.add('hbox');
        vbox_outer.appendChild(hbox);

        // Add a container div for the zippy, so we can extend the hit area.
        var container = this.ownerDocument.createElement('div');
        // Clicking anywhere on the div expands/collapses the details.
        container.classList.add('extension-zippy-container');
        container.addEventListener('click', this.handleZippyClick_.bind(this));
        hbox.appendChild(container);

        // On the far left we have the zippy icon.
        div = this.ownerDocument.createElement('div');
        div.id = id + '_zippy';
        div.classList.add('extension-zippy-default');
        div.classList.add(expanded ? 'extension-zippy-expanded' :
                                     'extension-zippy-collapsed');
        container.appendChild(div);

        // Next to it, we have the extension icon.
        icon = this.ownerDocument.createElement('img');
        icon.classList.add('extension-icon');
        icon.src = extension.icon;
        hbox.appendChild(icon);

        // Start a vertical box for showing the details.
        var vbox = this.ownerDocument.createElement('div');
        vbox.classList.add('vbox');
        vbox.classList.add('stretch');
        vbox.classList.add('details-view');
        hbox.appendChild(vbox);

        div = this.ownerDocument.createElement('div');
        vbox.appendChild(div);

        // Title comes next.
        var title = this.ownerDocument.createElement('span');
        title.classList.add('extension-title');
        title.textContent = extension.name;
        vbox.appendChild(title);

        // Followed by version.
        var version = this.ownerDocument.createElement('span');
        version.classList.add('extension-version');
        version.textContent = extension.version;
        vbox.appendChild(version);

        // And the additional info label (unpacked/crashed).
        if (extension.terminated || extension.isUnpacked) {
          var version = this.ownerDocument.createElement('span');
          version.classList.add('extension-version');
          version.textContent = extension.terminated ?
              localStrings.getString('extensionSettingsCrashMessage') :
              localStrings.getString('extensionSettingsInDevelopment');
          vbox.appendChild(version);
        }

        div = this.ownerDocument.createElement('div');
        vbox.appendChild(div);

        // And below that we have description (if provided).
        if (extension.description.length > 0) {
          var description = this.ownerDocument.createElement('span');
          description.classList.add('extension-description');
          description.textContent = extension.description;
          vbox.appendChild(description);
        }

        // Immediately following the description, we have the
        // Options link (optional).
        if (extension.options_url) {
          var link = this.ownerDocument.createElement('a');
          link.classList.add('extension-links-trailing');
          link.textContent = localStrings.getString('extensionSettingsOptions');
          link.href = '#';
          link.addEventListener('click', this.handleOptions_.bind(this));
          vbox.appendChild(link);
        }

        // Then the optional Visit Website link.
        if (extension.homepageUrl) {
          var link = this.ownerDocument.createElement('a');
          link.classList.add('extension-links-trailing');
          link.textContent =
            localStrings.getString('extensionSettingsVisitWebsite');
          link.href = '#';
          link.addEventListener('click', this.handleVisitWebsite_.bind(this));
          vbox.appendChild(link);
        }

        // And now the details section that is normally hidden.
        var details = this.ownerDocument.createElement('div');
        details.classList.add('vbox');
        vbox.appendChild(details);

        this.decorateDetailsSection_(details, extension, expanded, butterbar);

        // And on the right of the details we have the Enable/Enabled checkbox.
        div = this.ownerDocument.createElement('div');
        hbox.appendChild(div);

        var section = this.ownerDocument.createElement('section');
        section.classList.add('extension-enabling');
        div.appendChild(section);

        if (!extension.terminated) {
          // The Enable checkbox.
          var input = this.ownerDocument.createElement('input');
          input.addEventListener('click', this.handleEnable_.bind(this));
          input.type = 'checkbox';
          input.name = 'toggle-' + id;
          if (!extension.mayDisable)
            input.disabled = true;
          if (extension.enabled)
            input.checked = true;
          input.id = 'toggle-' + id;
          section.appendChild(input);
          var label = this.ownerDocument.createElement('label');
          label.classList.add('extension-enabling-label');
          if (extension.enabled)
            label.classList.add('extension-enabling-label-bold');
          label.setAttribute('for', 'toggle-' + id);
          label.id = 'toggle-' + id + '-label';
          if (extension.enabled) {
            // Enabled (with a d).
            label.textContent =
                localStrings.getString('extensionSettingsEnabled');
          } else {
            // Enable (no d).
            label.textContent =
                localStrings.getString('extensionSettingsEnable');
          }
          section.appendChild(label);

          if (label.offsetWidth > maxCheckboxWidth)
            maxCheckboxWidth = label.offsetWidth;
          if (label.offsetWidth < minCheckboxWidth)
            minCheckboxWidth = label.offsetWidth;
        } else {
          // Extension has been terminated, show a Reload link.
          var link = this.ownerDocument.createElement('a');
          link.classList.add('extension-links-trailing');
          link.id = extension.id;
          link.textContent =
              localStrings.getString('extensionSettingsReload');
          link.href = '#';
          link.addEventListener('click', this.handleReload_.bind(this));
          section.appendChild(link);
        }

        // And, on the far right we have the uninstall button.
        var button = this.ownerDocument.createElement('button');
        button.classList.add('extension-delete');
        button.id = id;
        if (!extension.mayDisable)
          button.disabled = true;
        button.textContent = localStrings.getString('extensionSettingsRemove');
        button.addEventListener('click', this.handleUninstall_.bind(this));
        hbox.appendChild(button);
      }

      // Do another pass, making sure checkboxes line up.
      var difference = maxCheckboxWidth - minCheckboxWidth;
      for (var i = 0; i < this.data_.extensions.length; ++i) {
        var extension = this.data_.extensions[i];
        var id = extension.id;
        var label = $('toggle-' + id + '-label');
        if (label.offsetWidth < maxCheckboxWidth)
          label.style.marginRight = difference.toString() + 'px';
      }
    },

    /**
     * Handles decorating the details section.
     * @param {Element} details The div that the details should be attached to.
     * @param {Object} extension The extension we are shoting the details for.
     * @param {boolean} expanded Whether to show the details expanded or not.
     * @param {boolean} showButterbar Whether to show the incognito warning or
     *                  not.
     * @private
     */
    decorateDetailsSection_: function(details, extension,
                                      expanded, showButterbar) {
      // This container div is needed because vbox display
      // overrides display:hidden.
      var details_contents = this.ownerDocument.createElement('div');
      details_contents.classList.add(expanded ? 'extension-details-visible' :
                                                'extension-details-hidden');
      details_contents.id = extension.id + '_details';
      details.appendChild(details_contents);

      var div = this.ownerDocument.createElement('div');
      div.classList.add('informative-text');
      details_contents.appendChild(div);

      // Keep track of how many items we'll show in the details section.
      var itemsShown = 0;

      if (this.data_.developerMode) {
        // First we have the id.
        var content = this.ownerDocument.createElement('div');
        content.textContent =
          localStrings.getString('extensionSettingsExtensionId') +
                                 ' ' + extension.id;
        div.appendChild(content);
        itemsShown++;

        // Then, the path, if provided by unpacked extension.
        if (extension.isUnpacked) {
          content = this.ownerDocument.createElement('div');
          content.textContent =
              localStrings.getString('extensionSettingsExtensionPath') +
                                     ' ' + extension.path;
          div.appendChild(content);
          itemsShown++;
        }

        // Then, the 'managed, cannot uninstall/disable' message.
        if (!extension.mayDisable) {
          content = this.ownerDocument.createElement('div');
          content.textContent =
              localStrings.getString('extensionSettingsPolicyControlled');
          div.appendChild(content);
          itemsShown++;
        }

        // Then active views:
        if (extension.views.length > 0) {
          var table = this.ownerDocument.createElement('table');
          table.classList.add('extension-inspect-table');
          div.appendChild(table);
          var tr = this.ownerDocument.createElement('tr');
          table.appendChild(tr);
          var td = this.ownerDocument.createElement('td');
          td.classList.add('extension-inspect-left-column');
          tr.appendChild(td);
          var span = this.ownerDocument.createElement('span');
          td.appendChild(span);
          span.textContent =
              localStrings.getString('extensionSettingsInspectViews');

          td = this.ownerDocument.createElement('td');
          for (var i = 0; i < extension.views.length; ++i) {
            // Then active views:
            content = this.ownerDocument.createElement('div');
            var link = this.ownerDocument.createElement('a');
            link.classList.add('extension-links-view');
            link.textContent = extension.views[i].path;
            link.id = extension.id;
            link.href = '#';
            link.addEventListener('click', this.sendInspectMessage_.bind(this));
            content.appendChild(link);
            td.appendChild(content);
            tr.appendChild(td);

            itemsShown++;
          }
        }
      }

      var content = this.ownerDocument.createElement('div');
      details_contents.appendChild(content);

      // Then Reload:
      if (extension.enabled && extension.allow_reload) {
        var link = this.ownerDocument.createElement('a');
        link.classList.add('extension-links-trailing');
        link.textContent = localStrings.getString('extensionSettingsReload');
        link.id = extension.id;
        link.href = '#';
        link.addEventListener('click', this.handleReload_.bind(this));
        content.appendChild(link);
        itemsShown++;
      }

      // Then Show (Browser Action) Button:
      if (extension.enabled && extension.enable_show_button) {
        link = this.ownerDocument.createElement('a');
        link.classList.add('extension-links-trailing');
        link.textContent =
            localStrings.getString('extensionSettingsShowButton');
        link.id = extension.id;
        link.href = '#';
        link.addEventListener('click', this.handleShowButton_.bind(this));
        content.appendChild(link);
        itemsShown++;
      }

      if (extension.enabled) {
        // The 'allow in incognito' checkbox.
        var label = this.ownerDocument.createElement('label');
        label.classList.add('extension-checkbox-label');
        content.appendChild(label);
        var input = this.ownerDocument.createElement('input');
        input.addEventListener('click',
                               this.handleToggleEnableIncognito_.bind(this));
        input.id = extension.id;
        input.type = 'checkbox';
        if (extension.enabledIncognito)
          input.checked = true;
        label.appendChild(input);
        var span = this.ownerDocument.createElement('span');
        span.classList.add('extension-checkbox-span');
        span.textContent =
            localStrings.getString('extensionSettingsEnableIncognito');
        label.appendChild(span);
        itemsShown++;
      }

      if (extension.enabled && extension.wantsFileAccess) {
        // The 'allow access to file URLs' checkbox.
        label = this.ownerDocument.createElement('label');
        label.classList.add('extension-checkbox-label');
        content.appendChild(label);
        var input = this.ownerDocument.createElement('input');
        input.addEventListener('click',
                               this.handleToggleAllowFileUrls_.bind(this));
        input.id = extension.id;
        input.type = 'checkbox';
        if (extension.allowFileAccess)
          input.checked = true;
        label.appendChild(input);
        var span = this.ownerDocument.createElement('span');
        span.classList.add('extension-checkbox-span');
        span.textContent =
            localStrings.getString('extensionSettingsAllowFileAccess');
        label.appendChild(span);
        itemsShown++;
      }

      if (extension.enabled && !extension.is_hosted_app) {
        // And add a hidden warning message for allowInIncognito.
        content = this.ownerDocument.createElement('div');
        content.id = extension.id + '_incognitoWarning';
        content.classList.add('butter-bar');
        content.hidden = !showButterbar;
        details_contents.appendChild(content);

        var span = this.ownerDocument.createElement('span');
        span.innerHTML =
            localStrings.getString('extensionSettingsIncognitoWarning');
        content.appendChild(span);
        itemsShown++;
      }

      var zippy = extension.id + '_zippy';
      $(zippy).style.display = (itemsShown > 0) ? 'block' : 'none';
    },

    /**
     * A lookup helper function to find an extension based on an id.
     * @param {string} id The |id| of the extension to look up.
     * @private
     */
    getExtensionWithId_: function(id) {
      for (var i = 0; i < this.data_.extensions.length; ++i) {
        if (this.data_.extensions[i].id == id)
          return this.data_.extensions[i];
      }
      return null;
    },

    /**
     * A lookup helper function to find the first node that has an id (starting
     * at |node| and going up the parent chain.
     * @param {Element} node The node to start looking at.
     * @private
     */
    findIdNode_: function(node) {
      while (node.id.length == 0) {
        node = node.parentNode;
        if (!node)
          return null;
      }
      return node;
    },

    /**
     * Handles the mouseclick on the zippy icon (that expands and collapses the
     * details section).
     * @param {Event} e Change event.
     * @private
     */
    handleZippyClick_: function(e) {
      var node = this.findIdNode_(e.target.parentNode);
      var iter = this.firstChild;
      while (iter) {
        var zippy = $(iter.id + '_zippy');
        var details = $(iter.id + '_details');
        if (iter.id == node.id) {
          // Toggle visibility.
          if (iter.classList.contains('extension-list-item-expanded')) {
            // Hide yo kids! Hide yo wife!
            zippy.classList.remove('extension-zippy-expanded');
            zippy.classList.add('extension-zippy-collapsed');
            details.classList.remove('extension-details-visible');
            details.classList.add('extension-details-hidden');
            iter.classList.remove('extension-list-item-expanded');
            iter.classList.add('extension-list-item-collaped');

            // Hide yo incognito warning.
            var butterBar = this.ownerDocument.getElementById(
                iter.id + '_incognitoWarning');
            if (!(butterBar === null))
              butterBar.hidden = true;
          } else {
            // Show the contents.
            zippy.classList.remove('extension-zippy-collapsed');
            zippy.classList.add('extension-zippy-expanded');
            details.classList.remove('extension-details-hidden');
            details.classList.add('extension-details-visible');
            iter.classList.remove('extension-list-item-collaped');
            iter.classList.add('extension-list-item-expanded');
          }
        }
        iter = iter.nextSibling;
      }
    },

    /**
     * Handles the mouse-up and keyboard-up events. This is used to limit the
     * number of items to show in the list, when the user is searching for items
     * with the search box. Otherwise, if one match is found, the whole list of
     * extensions would be shown when we only want the matching items to be
     * found.
     * @param {Event} e Change event.
     * @private
     */
    upEventHandler_: function(e) {
      var searchString = $('search-field').value.toLowerCase();
      var child = this.firstChild;
      while (child){
        var extension = this.getExtensionWithId_(child.id);
        if (searchString.length == 0) {
          // Show all.
          child.classList.remove('search-suppress');
        } else {
          // If the search string does not appear within the text of the
          // extension, then hide it.
          if ((extension.name.toLowerCase().indexOf(searchString) < 0) &&
              (extension.version.toLowerCase().indexOf(searchString) < 0) &&
              (extension.description.toLowerCase().indexOf(searchString) < 0)) {
            // Hide yo extension!
            child.classList.add('search-suppress');
          } else {
            // Show yourself!
            child.classList.remove('search-suppress');
          }
        }
        child = child.nextSibling;
      }
    },

    /**
     * Handles the Reload Extension functionality.
     * @param {Event} e Change event.
     * @private
     */
    handleReload_: function(e) {
      var node = this.findIdNode_(e.target);
      chrome.send('extensionSettingsReload', [node.id]);
    },

    /**
     * Handles the Show (Browser Action) Button functionality.
     * @param {Event} e Change event.
     * @private
     */
    handleShowButton_: function(e) {
      var node = this.findIdNode_(e.target);
      chrome.send('extensionSettingsShowButton', [node.id]);
    },

    /**
     * Handles the Enable/Disable Extension functionality.
     * @param {Event} e Change event.
     * @private
     */
    handleEnable_: function(e) {
      var node = this.findIdNode_(e.target.parentNode);
      var extension = this.getExtensionWithId_(node.id);
      chrome.send('extensionSettingsEnable',
                  [node.id, extension.enabled ? 'false' : 'true']);
      chrome.send('extensionSettingsRequestExtensionsData');
    },

    /**
     * Handles the Uninstall Extension functionality.
     * @param {Event} e Change event.
     * @private
     */
    handleUninstall_: function(e) {
      var node = this.findIdNode_(e.target.parentNode);
      chrome.send('extensionSettingsUninstall', [node.id]);
      chrome.send('extensionSettingsRequestExtensionsData');
    },

    /**
     * Handles the View Options link.
     * @param {Event} e Change event.
     * @private
     */
    handleOptions_: function(e) {
      var node = this.findIdNode_(e.target.parentNode);
      var extension = this.getExtensionWithId_(node.id);
      chrome.send('extensionSettingsOptions', [extension.id]);
    },

    /**
     * Handles the Visit Extension Website link.
     * @param {Event} e Change event.
     * @private
     */
    handleVisitWebsite_: function(e) {
      var node = this.findIdNode_(e.target.parentNode);
      var extension = this.getExtensionWithId_(node.id);
      document.location = extension.homepageUrl;
    },

    /**
     * Handles the Enable Extension In Incognito functionality.
     * @param {Event} e Change event.
     * @private
     */
    handleToggleEnableIncognito_: function(e) {
      var node = this.findIdNode_(e.target);
      var butterBar = document.getElementById(node.id + '_incognitoWarning');
      butterBar.hidden = !e.target.checked;
      chrome.send('extensionSettingsEnableIncognito',
                  [node.id, String(e.target.checked)]);
    },

    /**
     * Handles the Allow On File URLs functionality.
     * @param {Event} e Change event.
     * @private
     */
    handleToggleAllowFileUrls_: function(e) {
      var node = this.findIdNode_(e.target);
      chrome.send('extensionSettingsAllowFileAccess',
                  [node.id, String(e.target.checked)]);
    },

    /**
     * Tell the C++ ExtensionDOMHandler to inspect the page detailed in
     * |viewData|.
     * @param {Event} e Change event.
     * @private
     */
    sendInspectMessage_: function(e) {
      var extension = this.getExtensionWithId_(e.srcElement.id);
      for (var i = 0; i < extension.views.length; ++i) {
        if (extension.views[i].path == e.srcElement.innerText) {
          // TODO(aa): This is ghetto, but WebUIBindings doesn't support sending
          // anything other than arrays of strings, and this is all going to get
          // replaced with V8 extensions soon anyway.
          chrome.send('extensionSettingsInspect', [
            String(extension.views[i].renderProcessId),
            String(extension.views[i].renderViewId)
          ]);
        }
      }
    },
  };

  return {
    ExtensionsList: ExtensionsList
  };
});
// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Used for observing function of the backend datasource for this page by
// tests.
var webui_responded_ = false;

lbm.define('options', function() {
  var OptionsPage = options.OptionsPage;
  var ExtensionsList = options.ExtensionsList;

  /**
   * ExtensionSettings class
   * Encapsulated handling of the 'Manage Extensions' page.
   * @class
   */
  function ExtensionSettings() {
    OptionsPage.call(this,
                     'extensionSettings',
                     templateData.extensionSettingsTitle,
                     'extension-settings');
  }

  lbm.addSingletonGetter(ExtensionSettings);

  ExtensionSettings.prototype = {
    __proto__: OptionsPage.prototype,

    /**
     * Initialize the page.
     */
    initializePage: function() {
      OptionsPage.prototype.initializePage.call(this);

      // This will request the data to show on the page and will get a response
      // back in returnExtensionsData.
      chrome.send('extensionSettingsRequestExtensionsData');

      // Set up the developer mode button.
      var toggleDevMode = $('toggle-dev-on');
      toggleDevMode.addEventListener('click',
          this.handleToggleDevMode_.bind(this));

      // Setup the gallery related links and text.
      $('suggest-gallery').innerHTML =
          localStrings.getString('extensionSettingsSuggestGallery');
      $('get-more-extensions').innerHTML =
          localStrings.getString('extensionSettingsGetMoreExtensions');

      // Set up the three dev mode buttons (load unpacked, pack and update).
      $('load-unpacked').addEventListener('click',
          this.handleLoadUnpackedExtension_.bind(this));
      $('pack-extension').addEventListener('click',
          this.handlePackExtension_.bind(this));
      $('update-extensions-now').addEventListener('click',
          this.handleUpdateExtensionNow_.bind(this));
    },

    /**
     * Utility function which asks the C++ to show a platform-specific file
     * select dialog, and fire |callback| with the |filePath| that resulted.
     * |selectType| can be either 'file' or 'folder'. |operation| can be 'load',
     * 'packRoot', or 'pem' which are signals to the C++ to do some
     * operation-specific configuration.
     * @private
     */
    showFileDialog_: function(selectType, operation, callback) {
      handleFilePathSelected = function(filePath) {
        callback(filePath);
        handleFilePathSelected = function() {};
      };

      chrome.send('extensionSettingsSelectFilePath', [selectType, operation]);
    },

    /**
     * Handles the Load Unpacked Extension button.
     * @param {Event} e Change event.
     * @private
     */
    handleLoadUnpackedExtension_: function(e) {
      this.showFileDialog_('folder', 'load', function(filePath) {
        chrome.send('extensionSettingsLoad', [String(filePath)]);
      });

      chrome.send('coreOptionsUserMetricsAction',
                  ['Options_LoadUnpackedExtension']);
    },

    /**
     * Handles the Pack Extension button.
     * @param {Event} e Change event.
     * @private
     */
    handlePackExtension_: function(e) {
      OptionsPage.navigateToPage('packExtensionOverlay');
      chrome.send('coreOptionsUserMetricsAction', ['Options_PackExtension']);
    },

    /**
     * Handles the Update Extension Now button.
     * @param {Event} e Change event.
     * @private
     */
    handleUpdateExtensionNow_: function(e) {
      chrome.send('extensionSettingsAutoupdate', []);
    },

    /**
     * Handles the Toggle Dev Mode button.
     * @param {Event} e Change event.
     * @private
     */
    handleToggleDevMode_: function(e) {
      var dev = $('dev');
      if (!dev.classList.contains('dev-open')) {
        // Make the Dev section visible.
        dev.classList.add('dev-open');
        dev.classList.remove('dev-closed');

        $('load-unpacked').classList.add('dev-button-visible');
        $('load-unpacked').classList.remove('dev-button-hidden');
        $('pack-extension').classList.add('dev-button-visible');
        $('pack-extension').classList.remove('dev-button-hidden');
        $('update-extensions-now').classList.add('dev-button-visible');
        $('update-extensions-now').classList.remove('dev-button-hidden');
      } else {
        // Hide the Dev section.
        dev.classList.add('dev-closed');
        dev.classList.remove('dev-open');

        $('load-unpacked').classList.add('dev-button-hidden');
        $('load-unpacked').classList.remove('dev-button-visible');
        $('pack-extension').classList.add('dev-button-hidden');
        $('pack-extension').classList.remove('dev-button-visible');
        $('update-extensions-now').classList.add('dev-button-hidden');
        $('update-extensions-now').classList.remove('dev-button-visible');
      }

      chrome.send('extensionSettingsToggleDeveloperMode', []);
    },
  };

  /**
   * Called by the dom_ui_ to re-populate the page with data representing
   * the current state of installed extensions.
   */
  ExtensionSettings.returnExtensionsData = function(extensionsData) {
    webui_responded_ = true;

    $('no-extensions').hidden = true;
    $('suggest-gallery').hidden = true;
    $('get-more-extensions-container').hidden = true;

    if (extensionsData.extensions.length > 0) {
      // Enforce order specified in the data or (if equal) then sort by
      // extension name (case-insensitive).
      extensionsData.extensions.sort(function(a, b) {
        if (a.order == b.order) {
          a = a.name.toLowerCase();
          b = b.name.toLowerCase();
          return a < b ? -1 : (a > b ? 1 : 0);
        } else {
          return a.order < b.order ? -1 : 1;
        }
      });

      $('get-more-extensions-container').hidden = false;
    } else {
      $('no-extensions').hidden = false;
      $('suggest-gallery').hidden = false;
    }

    ExtensionsList.prototype.data_ = extensionsData;

    var extensionList = $('extension-settings-list');
    ExtensionsList.decorate(extensionList);
  }

  // Export
  return {
    ExtensionSettings: ExtensionSettings
  };
});

// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {

  var OptionsPage = options.OptionsPage;

  /**
   * FontSettings class
   * Encapsulated handling of the 'Fonts and Encoding' page.
   * @class
   */
  function FontSettings() {
    OptionsPage.call(this,
                     'fonts',
                     templateData.fontSettingsPageTabTitle,
                     'font-settings');
  }

  lbm.addSingletonGetter(FontSettings);

  FontSettings.prototype = {
    __proto__: OptionsPage.prototype,

    /**
     * Initialize the page.
     */
    initializePage: function() {
      OptionsPage.prototype.initializePage.call(this);

      var standardFontRange = $('standard-font-size');
      standardFontRange.valueMap = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20,
          22, 24, 26, 28, 30, 32, 34, 36, 40, 44, 48, 56, 64, 72];
      standardFontRange.continuous = false;
      standardFontRange.notifyChange = this.standardRangeChanged_.bind(this);

      var minimumFontRange = $('minimum-font-size');
      minimumFontRange.valueMap = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
          18, 20, 22, 24];
      minimumFontRange.continuous = false;
      minimumFontRange.notifyChange = this.minimumRangeChanged_.bind(this);
      minimumFontRange.notifyPrefChange =
          this.minimumFontSizeChanged_.bind(this);

      var placeholder = localStrings.getString('fontSettingsPlaceholder');
      var elements = [$('standard-font-family'), $('serif-font-family'),
                      $('sans-serif-font-family'), $('fixed-font-family'),
                      $('font-encoding')];
      elements.forEach(function(el) {
        el.appendChild(new Option(placeholder));
        el.setDisabled('noFontsAvailable', true);
      });
    },

    /**
     * Called by the options page when this page has been shown.
     */
    didShowPage: function() {
      // The fonts list may be large so we only load it when this page is
      // loaded for the first time.  This makes opening the options window
      // faster and consume less memory if the user never opens the fonts
      // dialog.
      if (!this.hasShown) {
        chrome.send('fetchFontsData');
        this.hasShown = true;
      }
    },

    /**
     * Called as the user changes the standard font size.  This allows for
     * reflecting the change in the UI before the preference has been changed.
     * @param {Element} el The slider input element.
     * @param {number} value The mapped value currently set by the slider.
     * @private
     */
    standardRangeChanged_: function(el, value) {
      var fontSampleEl = $('standard-font-sample');
      this.setUpFontSample_(fontSampleEl, value, fontSampleEl.style.fontFamily,
                            true);

      fontSampleEl = $('serif-font-sample');
      this.setUpFontSample_(fontSampleEl, value, fontSampleEl.style.fontFamily,
                            true);

      fontSampleEl = $('sans-serif-font-sample');
      this.setUpFontSample_(fontSampleEl, value, fontSampleEl.style.fontFamily,
                            true);
    },

    /**
     * Called as the user changes the miniumum font size.  This allows for
     * reflecting the change in the UI before the preference has been changed.
     * @param {Element} el The slider input element.
     * @param {number} value The mapped value currently set by the slider.
     * @private
     */
    minimumRangeChanged_: function(el, value) {
      var fontSampleEl = $('minimum-font-sample');
      this.setUpFontSample_(fontSampleEl, value, fontSampleEl.style.fontFamily,
                            true);
    },

    /**
     * Sets the 'minimum_logical_font_size' preference when the minimum font
     * size has been changed by the user.
     * @param {Element} el The slider input element.
     * @param {number} value The mapped value that has been saved.
     * @private
     */
    minimumFontSizeChanged_: function(el, value) {
      Preferences.setIntegerPref('webkit.webprefs.minimum_logical_font_size',
          value, '');
    },

    /**
     * Sets the text, font size and font family of the sample text.
     * @param {Element} el The div containing the sample text.
     * @param {number} size The font size of the sample text.
     * @param {string} font The font family of the sample text.
     * @param {bool} showSize True if the font size should appear in the sample.
     * @private
     */
    setUpFontSample_: function(el, size, font, showSize) {
      var prefix = showSize ? (size + ': ') : '';
      el.textContent = prefix +
          localStrings.getString('fontSettingsLoremIpsum');
      el.style.fontSize = size + 'px';
      if (font)
        el.style.fontFamily = font;
    },

    /**
     * Populates a select list and selects the specified item.
     * @param {Element} element The select element to populate.
     * @param {Array} items The array of items from which to populate.
     * @param {string} selectedValue The selected item.
     * @private
     */
    populateSelect_: function(element, items, selectedValue) {
      // Remove any existing content.
      element.textContent = '';

      // Insert new child nodes into select element.
      var value, text, selected, option;
      for (var i = 0; i < items.length; i++) {
        value = items[i][0];
        text = items[i][1];
        if (text) {
          selected = value == selectedValue;
          element.appendChild(new Option(text, value, false, selected));
        } else {
          element.appendChild(document.createElement('hr'));
        }
      }

      element.setDisabled('noFontsAvailable', false);
    }
  };

  // Chrome callbacks
  FontSettings.setFontsData = function(fonts, encodings, selectedValues) {
    FontSettings.getInstance().populateSelect_($('standard-font-family'), fonts,
                                               selectedValues[0]);
    FontSettings.getInstance().populateSelect_($('serif-font-family'), fonts,
                                               selectedValues[1]);
    FontSettings.getInstance().populateSelect_($('sans-serif-font-family'),
                                               fonts, selectedValues[2]);
    FontSettings.getInstance().populateSelect_($('fixed-font-family'), fonts,
                                               selectedValues[3]);
    FontSettings.getInstance().populateSelect_($('font-encoding'), encodings,
                                               selectedValues[4]);
  };

  FontSettings.setUpStandardFontSample = function(font, size) {
    FontSettings.getInstance().setUpFontSample_($('standard-font-sample'), size,
                                                font, true);
  };

  FontSettings.setUpSerifFontSample = function(font, size) {
    FontSettings.getInstance().setUpFontSample_($('serif-font-sample'), size,
                                                font, true);
  };

  FontSettings.setUpSansSerifFontSample = function(font, size) {
    FontSettings.getInstance().setUpFontSample_($('sans-serif-font-sample'),
                                                size, font, true);
  };

  FontSettings.setUpFixedFontSample = function(font, size) {
    FontSettings.getInstance().setUpFontSample_($('fixed-font-sample'),
                                                size, font, false);
  };

  FontSettings.setUpMinimumFontSample = function(size) {
    // If size is less than 6, represent it as six in the sample to account
    // for the minimum logical font size.
    if (size < 6)
      size = 6;
    FontSettings.getInstance().setUpFontSample_($('minimum-font-sample'), size,
                                                null, true);
  };

  // Export
  return {
    FontSettings: FontSettings
  };
});


// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {
  const OptionsPage = options.OptionsPage;

  /////////////////////////////////////////////////////////////////////////////
  // HandlerOptions class:

  /**
   * Encapsulated handling of handler options page.
   * @constructor
   */
  function HandlerOptions() {
    this.activeNavTab = null;
    OptionsPage.call(this,
                     'handlers',
                     templateData.handlersPageTabTitle,
                     'handler-options');
  }

  lbm.addSingletonGetter(HandlerOptions);

  HandlerOptions.prototype = {
    __proto__: OptionsPage.prototype,

    /**
     * The handlers list.
     * @type {DeletableItemList}
     * @private
     */
    handlersList_: null,

    /** @inheritDoc */
    initializePage: function() {
      OptionsPage.prototype.initializePage.call(this);

      this.createHandlersList_();
    },

    /**
     * Creates, decorates and initializes the handlers list.
     * @private
     */
    createHandlersList_: function() {
      this.handlersList_ = $('handlers-list');
      options.HandlersList.decorate(this.handlersList_);
      this.handlersList_.autoExpands = true;

      this.ignoredHandlersList_ = $('ignored-handlers-list');
      options.IgnoredHandlersList.decorate(this.ignoredHandlersList_);
      this.ignoredHandlersList_.autoExpands = true;
    },
  };

  /**
   * Sets the list of handlers shown by the view.
   * @param handlers to be shown in the view.
   */
  HandlerOptions.setHandlers = function(handlers) {
    $('handlers-list').setHandlers(handlers);
  };

  /**
   * Sets the list of ignored handlers shown by the view.
   * @param handlers to be shown in the view.
   */
  HandlerOptions.setIgnoredHandlers = function(handlers) {
    $('ignored-handlers-section').hidden = handlers.length == 0;
    $('ignored-handlers-list').setHandlers(handlers);
  };

  return {
    HandlerOptions: HandlerOptions
  };
});

  // Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {
  const ArrayDataModel = lbm.ui.ArrayDataModel;
  const List = lbm.ui.List;
  const ListItem = lbm.ui.ListItem;
  const HandlerOptions = options.HandlerOptions;
  const DeletableItem = options.DeletableItem;
  const DeletableItemList = options.DeletableItemList;

  const localStrings = new LocalStrings();

  /**
   * Creates a new ignored protocol / content handler list item.
   *
   * Accepts values in the form
   *   ['mailto', 'http://www.thesite.com/%s', 'The title of the protocol'],
   * @param {Object} entry A dictionary describing the handlers for a given
   *     protocol.
   * @constructor
   * @extends {lbm.ui.DeletableItemList}
   */
  function IgnoredHandlersListItem(entry) {
    var el = lbm.doc.createElement('div');
    el.dataItem = entry;
    el.__proto__ = IgnoredHandlersListItem.prototype;
    el.decorate();
    return el;
  }

  IgnoredHandlersListItem.prototype = {
    __proto__: DeletableItem.prototype,

    /** @inheritDoc */
    decorate: function() {
      DeletableItem.prototype.decorate.call(this);

      // Protocol.
      var protocolElement = document.createElement('div');
      protocolElement.textContent = this.dataItem[0];
      protocolElement.className = 'handlers-type-column';
      this.contentElement_.appendChild(protocolElement);

      // Site title.
      var titleElement = document.createElement('div');
      titleElement.textContent = this.dataItem[2];
      titleElement.className = 'handlers-site-column';
      titleElement.title = this.dataItem[1];
      this.contentElement_.appendChild(titleElement);
    },
  };


  var IgnoredHandlersList = lbm.ui.define('list');

  IgnoredHandlersList.prototype = {
    __proto__: DeletableItemList.prototype,

    createItem: function(entry) {
      return new IgnoredHandlersListItem(entry);
    },

    deleteItemAtIndex: function(index) {
      chrome.send('removeIgnoredHandler', [this.dataModel.item(index)]);
    },

    /**
     * The length of the list.
     */
    get length() {
      return this.dataModel.length;
    },

    /**
     * Set the protocol handlers displayed by this list.  See
     * IgnoredHandlersListItem for an example of the format the list should
     * take.
     *
     * @param {Object} list A list of ignored protocol handlers.
     */
    setHandlers: function(list) {
      this.dataModel = new ArrayDataModel(list);
    },
  };



  /**
   * Creates a new protocol / content handler list item.
   *
   * Accepts values in the form
   * { protocol: 'mailto',
   *   handlers: [
   *     ['mailto', 'http://www.thesite.com/%s', 'The title of the protocol'],
   *     ...,
   *   ],
   * }
   * @param {Object} entry A dictionary describing the handlers for a given
   *     protocol.
   * @constructor
   * @extends {lbm.ui.ListItem}
   */
  function HandlerListItem(entry) {
    var el = lbm.doc.createElement('div');
    el.dataItem = entry;
    el.__proto__ = HandlerListItem.prototype;
    el.decorate();
    return el;
  }

  HandlerListItem.prototype = {
    __proto__: ListItem.prototype,

    buildWidget_: function(data, delegate) {
      // Protocol.
      var protocolElement = document.createElement('div');
      protocolElement.textContent = data.protocol;
      protocolElement.className = 'handlers-type-column';
      this.appendChild(protocolElement);

      // Handler selection.
      var handlerElement = document.createElement('div');
      var selectElement = document.createElement('select');
      var defaultOptionElement = document.createElement('option');
      defaultOptionElement.selected = data.default_handler == -1;
      defaultOptionElement.textContent =
          localStrings.getString('handlers_none_handler');
      defaultOptionElement.value = -1;
      selectElement.appendChild(defaultOptionElement);

      for (var i = 0; i < data.handlers.length; ++i) {
        var optionElement = document.createElement('option');
        optionElement.selected = i == data.default_handler;
        optionElement.textContent = data.handlers[i][2];
        optionElement.value = i;
        selectElement.appendChild(optionElement);
      }

      selectElement.addEventListener('change', function (e) {
        var index = e.target.value;
        if (index == -1) {
          this.classList.add('none');
          delegate.clearDefault(data.protocol);
        } else {
          handlerElement.classList.remove('none');
          delegate.setDefault(data.handlers[index]);
        }
      });
      handlerElement.appendChild(selectElement);
      handlerElement.className = 'handlers-site-column';
      if (data.default_handler == -1)
        this.classList.add('none');
      this.appendChild(handlerElement);

      // Remove link.
      var removeElement = document.createElement('div');
      removeElement.textContent =
          localStrings.getString('handlers_remove_link');
      removeElement.addEventListener('click', function (e) {
        var value = selectElement ? selectElement.value : 0;
        delegate.removeHandler(value, data.handlers[value]);
      });
      removeElement.className = 'handlers-remove-column handlers-remove-link';
      this.appendChild(removeElement);
    },

    /** @inheritDoc */
    decorate: function() {
      ListItem.prototype.decorate.call(this);

      var self = this;
      var delegate = {
        removeHandler: function(index, handler) {
          chrome.send('removeHandler', [handler]);
        },
        setDefault: function(handler) {
          chrome.send('setDefault', [handler]);
        },
        clearDefault: function(protocol) {
          chrome.send('clearDefault', [protocol]);
        },
      };

      this.buildWidget_(this.dataItem, delegate);
    },
  };

  /**
   * Create a new passwords list.
   * @constructor
   * @extends {lbm.ui.List}
   */
  var HandlersList = lbm.ui.define('list');

  HandlersList.prototype = {
    __proto__: List.prototype,

    /** @inheritDoc */
    createItem: function(entry) {
      return new HandlerListItem(entry);
    },

    /**
     * The length of the list.
     */
    get length() {
      return this.dataModel.length;
    },

    /**
     * Set the protocol handlers displayed by this list.
     * See HandlerListItem for an example of the format the list should take.
     *
     * @param {Object} list A list of protocols with their registered handlers.
     */
    setHandlers: function(list) {
      this.dataModel = new ArrayDataModel(list);
    },
  };

  return {
    IgnoredHandlersListItem: IgnoredHandlersListItem,
    IgnoredHandlersList: IgnoredHandlersList,
    HandlerListItem: HandlerListItem,
    HandlersList: HandlersList,
  };
});
// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {
  var OptionsPage = options.OptionsPage;

  /**
   * ImportDataOverlay class
   * Encapsulated handling of the 'Import Data' overlay page.
   * @class
   */
  function ImportDataOverlay() {
    OptionsPage.call(this,
                     'importData',
                     templateData.importDataOverlayTabTitle,
                     'import-data-overlay');
  }

  lbm.addSingletonGetter(ImportDataOverlay);

  ImportDataOverlay.prototype = {
    // Inherit from OptionsPage.
    __proto__: OptionsPage.prototype,

    /**
     * Initialize the page.
     */
    initializePage: function() {
      // Call base class implementation to start preference initialization.
      OptionsPage.prototype.initializePage.call(this);

      var self = this;
      var checkboxes =
          document.querySelectorAll('#import-checkboxes input[type=checkbox]');
      for (var i = 0; i < checkboxes.length; i++) {
        checkboxes[i].onchange = function() {
          self.validateCommitButton_();
        };
      }

      $('import-browsers').onchange = function() {
        self.updateCheckboxes_();
        self.validateCommitButton_();
      };

      $('import-data-commit').onclick = function() {
        chrome.send('importData', [
            String($('import-browsers').selectedIndex),
            String($('import-history').checked),
            String($('import-favorites').checked),
            String($('import-passwords').checked),
            String($('import-search').checked)]);
      };

      $('import-data-cancel').onclick = function() {
        ImportDataOverlay.dismiss();
      };

      $('import-data-show-bookmarks-bar').onchange = function() {
        // Note: The callback 'toggleShowBookmarksBar' is handled within the
        // browser options handler -- rather than the import data handler --
        // as the implementation is shared by several clients.
        chrome.send('toggleShowBookmarksBar');
      }

      $('import-data-confirm').onclick = function() {
        ImportDataOverlay.dismiss();
      };

      // Form controls are disabled until the profile list has been loaded.
      self.setControlsSensitive_(false);
    },

    /**
     * Set enabled and checked state of the commit button.
     * @private
     */
    validateCommitButton_: function() {
      var somethingToImport =
          $('import-history').checked || $('import-favorites').checked ||
          $('import-passwords').checked || $('import-search').checked;
      $('import-data-commit').disabled = !somethingToImport;
    },

    /**
     * Sets the sensitivity of all the checkboxes and the commit button.
     * @private
     */
    setControlsSensitive_: function(sensitive) {
      var checkboxes =
          document.querySelectorAll('#import-checkboxes input[type=checkbox]');
      for (var i = 0; i < checkboxes.length; i++)
        this.setUpCheckboxState_(checkboxes[i], sensitive);
      $('import-data-commit').disabled = !sensitive;
    },

    /**
     * Set enabled and checked states a checkbox element.
     * @param {Object} checkbox A checkbox element.
     * @param {boolean} enabled The enabled state of the chekbox.
     * @private
     */
    setUpCheckboxState_: function(checkbox, enabled) {
       checkbox.setDisabled("noProfileData", !enabled);
    },

    /**
     * Update the enabled and checked states of all checkboxes.
     * @private
     */
    updateCheckboxes_: function() {
      var index = $('import-browsers').selectedIndex;
      var browserProfile;
      if (this.browserProfiles.length > index)
        browserProfile = this.browserProfiles[index];
      var importOptions = ['history', 'favorites', 'passwords', 'search'];
      for (var i = 0; i < importOptions.length; i++) {
        var checkbox = $('import-' + importOptions[i]);
        var enable = browserProfile && browserProfile[importOptions[i]];
        this.setUpCheckboxState_(checkbox, enable);
      }
    },

    /**
     * Update the supported browsers popup with given entries.
     * @param {array} browsers List of supported browsers name.
     * @private
     */
    updateSupportedBrowsers_: function(browsers) {
      this.browserProfiles = browsers;
      var browserSelect = $('import-browsers');
      browserSelect.remove(0);  // Remove the 'Loading...' option.
      browserSelect.textContent = '';
      var browserCount = browsers.length;

      if (browserCount == 0) {
        var option = new Option(templateData.noProfileFound, 0);
        browserSelect.appendChild(option);

        this.setControlsSensitive_(false);
      } else {
        this.setControlsSensitive_(true);
        for (var i = 0; i < browserCount; i++) {
          var browser = browsers[i]
          var option = new Option(browser['name'], browser['index']);
          browserSelect.appendChild(option);
        }

        this.updateCheckboxes_();
        this.validateCommitButton_();
      }
    },

    /**
    * Clear import prefs set when user checks/unchecks a checkbox so that each
    * checkbox goes back to the default "checked" state (or alternatively, to
    * the state set by a recommended policy).
    * @private
    */
    clearUserPrefs_: function() {
      var importPrefs = ['import_history',
                         'import_bookmarks',
                         'import_saved_passwords',
                         'import_search_engine'];
      for (var i = 0; i < importPrefs.length; i++)
        Preferences.clearPref(importPrefs[i], undefined);
    },
  };

  ImportDataOverlay.clearUserPrefs = function() {
    ImportDataOverlay.getInstance().clearUserPrefs_();
  };

  /**
   * Update the supported browsers popup with given entries.
   * @param {array} list of supported browsers name.
   */
  ImportDataOverlay.updateSupportedBrowsers = function(browsers) {
    ImportDataOverlay.getInstance().updateSupportedBrowsers_(browsers);
  };

  /**
   * Update the UI to reflect whether an import operation is in progress.
   * @param {boolean} state True if an import operation is in progress.
   */
  ImportDataOverlay.setImportingState = function(state) {
    var checkboxes =
        document.querySelectorAll('#import-checkboxes input[type=checkbox]');
    for (var i = 0; i < checkboxes.length; i++)
        checkboxes[i].setDisabled("Importing", state);
    if (!state)
      ImportDataOverlay.getInstance().updateCheckboxes_();
    $('import-browsers').disabled = state;
    $('import-throbber').style.visibility = state ? "visible" : "hidden";
    ImportDataOverlay.getInstance().validateCommitButton_();
  };

  /**
   * Remove the import overlay from display.
   */
  ImportDataOverlay.dismiss = function() {
    ImportDataOverlay.clearUserPrefs();
    OptionsPage.closeOverlay();
  };

  /**
   * Show a message confirming the success of the import operation.
   */
  ImportDataOverlay.confirmSuccess = function() {
    var showBookmarksMessage = $('import-favorites').checked;
    ImportDataOverlay.setImportingState(false);
    $('import-data-configure').hidden = true;
    $('import-data-success').hidden = false;
    $('import-find-your-bookmarks').hidden = !showBookmarksMessage;
  };

  // Export
  return {
    ImportDataOverlay: ImportDataOverlay
  };
});

// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {
  var OptionsPage = options.OptionsPage;

  function InstantConfirmOverlay() {
    OptionsPage.call(this, 'instantConfirm',
                     templateData.instantConfirmTitle,
                     'instantConfirmOverlay');
  };

  lbm.addSingletonGetter(InstantConfirmOverlay);

  InstantConfirmOverlay.prototype = {
    // Inherit from OptionsPage.
    __proto__: OptionsPage.prototype,

    initializePage: function() {
      OptionsPage.prototype.initializePage.call(this);

      $('instantConfirmCancel').onclick = function() {
        OptionsPage.closeOverlay();
        $('instantEnabledCheckbox').checked = false;
      };

      $('instantConfirmOk').onclick = function() {
        OptionsPage.closeOverlay();
        chrome.send('enableInstant');
      };
    },
  };

  // Export
  return {
    InstantConfirmOverlay: InstantConfirmOverlay
  };
});


// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

///////////////////////////////////////////////////////////////////////////////
// AddLanguageOverlay class:

lbm.define('options', function() {
  const OptionsPage = options.OptionsPage;

  /**
   * Encapsulated handling of ChromeOS add language overlay page.
   * @constructor
   */
  function AddLanguageOverlay() {
    OptionsPage.call(this, 'addLanguage',
                     localStrings.getString('add_button'),
                     'add-language-overlay-page');
  }

  lbm.addSingletonGetter(AddLanguageOverlay);

  AddLanguageOverlay.prototype = {
    // Inherit AddLanguageOverlay from OptionsPage.
    __proto__: OptionsPage.prototype,

    /**
     * Initializes AddLanguageOverlay page.
     * Calls base class implementation to starts preference initialization.
     */
    initializePage: function() {
      // Call base class implementation to starts preference initialization.
      OptionsPage.prototype.initializePage.call(this);

      // Set up the cancel button.
      $('add-language-overlay-cancel-button').onclick = function(e) {
        OptionsPage.closeOverlay();
      };

      // Create the language list with which users can add a language.
      var addLanguageList = $('add-language-overlay-language-list');
      var languageListData = templateData.languageList;
      for (var i = 0; i < languageListData.length; i++) {
        var language = languageListData[i];
        var displayText = language.displayName;
        // If the native name is different, add it.
        if (language.displayName != language.nativeDisplayName) {
          displayText += ' - ' + language.nativeDisplayName;
        }
        if (lbm.isChromeOS) {
          var button = document.createElement('button');
          button.className = 'link-button';
          button.textContent = displayText;
          button.languageCode = language.code;
          var li = document.createElement('li');
          li.languageCode = language.code;
          li.appendChild(button);
          addLanguageList.appendChild(li);
        } else {
          var option = document.createElement('option');
          option.value = language.code;
          option.textContent = displayText;
          addLanguageList.appendChild(option);
        }
      }
    },
  };

  return {
    AddLanguageOverlay: AddLanguageOverlay
  };
});

// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {
  const ArrayDataModel = lbm.ui.ArrayDataModel;
  const DeletableItem = options.DeletableItem;
  const DeletableItemList = options.DeletableItemList;
  const List = lbm.ui.List;
  const ListItem = lbm.ui.ListItem;
  const ListSingleSelectionModel = lbm.ui.ListSingleSelectionModel;

  /**
   * Creates a new Language list item.
   * @param {String} languageCode the languageCode.
   * @constructor
   * @extends {DeletableItem.ListItem}
   */
  function LanguageListItem(languageCode) {
    var el = lbm.doc.createElement('li');
    el.__proto__ = LanguageListItem.prototype;
    el.languageCode_ = languageCode;
    el.decorate();
    return el;
  };

  LanguageListItem.prototype = {
    __proto__: DeletableItem.prototype,

    /**
     * The language code of this language.
     * @type {String}
     * @private
     */
    languageCode_: null,

    /** @inheritDoc */
    decorate: function() {
      DeletableItem.prototype.decorate.call(this);

      var languageCode = this.languageCode_;
      var languageOptions = options.LanguageOptions.getInstance();
      this.deletable = languageOptions.languageIsDeletable(languageCode);
      this.languageCode = languageCode;
      this.languageName = lbm.doc.createElement('div');
      this.languageName.className = 'language-name';
      this.languageName.textContent =
          LanguageList.getDisplayNameFromLanguageCode(languageCode);
      this.contentElement.appendChild(this.languageName);
      this.title =
          LanguageList.getNativeDisplayNameFromLanguageCode(languageCode);
      this.draggable = true;
    },
  };

  /**
   * Creates a new language list.
   * @param {Object=} opt_propertyBag Optional properties.
   * @constructor
   * @extends {lbm.ui.List}
   */
  var LanguageList = lbm.ui.define('list');

  /**
   * Gets display name from the given language code.
   * @param {string} languageCode Language code (ex. "fr").
   */
  LanguageList.getDisplayNameFromLanguageCode = function(languageCode) {
    // Build the language code to display name dictionary at first time.
    if (!this.languageCodeToDisplayName_) {
      this.languageCodeToDisplayName_ = {};
      var languageList = templateData.languageList;
      for (var i = 0; i < languageList.length; i++) {
        var language = languageList[i];
        this.languageCodeToDisplayName_[language.code] = language.displayName;
      }
    }

    return this.languageCodeToDisplayName_[languageCode];
  }

  /**
   * Gets native display name from the given language code.
   * @param {string} languageCode Language code (ex. "fr").
   */
  LanguageList.getNativeDisplayNameFromLanguageCode = function(languageCode) {
    // Build the language code to display name dictionary at first time.
    if (!this.languageCodeToNativeDisplayName_) {
      this.languageCodeToNativeDisplayName_ = {};
      var languageList = templateData.languageList;
      for (var i = 0; i < languageList.length; i++) {
        var language = languageList[i];
        this.languageCodeToNativeDisplayName_[language.code] =
            language.nativeDisplayName;
      }
    }

    return this.languageCodeToNativeDisplayName_[languageCode];
  }

  /**
   * Returns true if the given language code is valid.
   * @param {string} languageCode Language code (ex. "fr").
   */
  LanguageList.isValidLanguageCode = function(languageCode) {
    // Having the display name for the language code means that the
    // language code is valid.
    if (LanguageList.getDisplayNameFromLanguageCode(languageCode)) {
      return true;
    }
    return false;
  }

  LanguageList.prototype = {
    __proto__: DeletableItemList.prototype,

    // The list item being dragged.
    draggedItem: null,
    // The drop position information: "below" or "above".
    dropPos: null,
    // The preference is a CSV string that describes preferred languages
    // in Chrome OS. The language list is used for showing the language
    // list in "Language and Input" options page.
    preferredLanguagesPref: 'settings.language.preferred_languages',
    // The preference is a CSV string that describes accept languages used
    // for content negotiation. To be more precise, the list will be used
    // in "Accept-Language" header in HTTP requests.
    acceptLanguagesPref: 'intl.accept_languages',

    /** @inheritDoc */
    decorate: function() {
      DeletableItemList.prototype.decorate.call(this);
      this.selectionModel = new ListSingleSelectionModel;

      // HACK(arv): http://crbug.com/40902
      window.addEventListener('resize', this.redraw.bind(this));

      // Listen to pref change.
      if (lbm.isChromeOS) {
        Preferences.getInstance().addEventListener(this.preferredLanguagesPref,
            this.handlePreferredLanguagesPrefChange_.bind(this));
      } else {
        Preferences.getInstance().addEventListener(this.acceptLanguagesPref,
            this.handleAcceptLanguagesPrefChange_.bind(this));
      }

      // Listen to drag and drop events.
      this.addEventListener('dragstart', this.handleDragStart_.bind(this));
      this.addEventListener('dragenter', this.handleDragEnter_.bind(this));
      this.addEventListener('dragover', this.handleDragOver_.bind(this));
      this.addEventListener('drop', this.handleDrop_.bind(this));
      this.addEventListener('dragleave', this.handleDragLeave_.bind(this));
    },

    createItem: function(languageCode) {
      return new LanguageListItem(languageCode);
    },

    /*
     * For each item, determines whether it's deletable.
     */
    updateDeletable: function() {
      var items = this.items;
      for (var i = 0; i < items.length; ++i) {
        var item = items[i];
        var languageCode = item.languageCode;
        var languageOptions = options.LanguageOptions.getInstance();
        item.deletable = languageOptions.languageIsDeletable(languageCode);
      }
    },

    /*
     * Adds a language to the language list.
     * @param {string} languageCode language code (ex. "fr").
     */
    addLanguage: function(languageCode) {
      // It shouldn't happen but ignore the language code if it's
      // null/undefined, or already present.
      if (!languageCode || this.dataModel.indexOf(languageCode) >= 0) {
        return;
      }
      this.dataModel.push(languageCode);
      // Select the last item, which is the language added.
      this.selectionModel.selectedIndex = this.dataModel.length - 1;

      this.savePreference_();
    },

    /*
     * Gets the language codes of the currently listed languages.
     */
    getLanguageCodes: function() {
      return this.dataModel.slice();
    },

    /*
     * Gets the language code of the selected language.
     */
    getSelectedLanguageCode: function() {
      return this.selectedItem;
    },

    /*
     * Selects the language by the given language code.
     * @returns {boolean} True if the operation is successful.
     */
    selectLanguageByCode: function(languageCode) {
      var index = this.dataModel.indexOf(languageCode);
      if (index >= 0) {
        this.selectionModel.selectedIndex = index;
        return true;
      }
      return false;
    },

    /** @inheritDoc */
    deleteItemAtIndex: function(index) {
      if (index >= 0) {
        this.dataModel.splice(index, 1);
        // Once the selected item is removed, there will be no selected item.
        // Select the item pointed by the lead index.
        index = this.selectionModel.leadIndex;
        this.savePreference_();
      }
      return index;
    },

    /*
     * Computes the target item of drop event.
     * @param {Event} e The drop or dragover event.
     * @private
     */
    getTargetFromDropEvent_ : function(e) {
      var target = e.target;
      // e.target may be an inner element of the list item
      while (target != null && !(target instanceof ListItem)) {
        target = target.parentNode;
      }
      return target;
    },

    /*
     * Handles the dragstart event.
     * @param {Event} e The dragstart event.
     * @private
     */
    handleDragStart_: function(e) {
      var target = e.target;
      // ListItem should be the only draggable element type in the page,
      // but just in case.
      if (target instanceof ListItem) {
        this.draggedItem = target;
        e.dataTransfer.effectAllowed = 'move';
        // We need to put some kind of data in the drag or it will be
        // ignored.  Use the display name in case the user drags to a text
        // field or the desktop.
        e.dataTransfer.setData('text/plain', target.title);
      }
    },

    /*
     * Handles the dragenter event.
     * @param {Event} e The dragenter event.
     * @private
     */
    handleDragEnter_: function(e) {
      e.preventDefault();
    },

    /*
     * Handles the dragover event.
     * @param {Event} e The dragover event.
     * @private
     */
    handleDragOver_: function(e) {
      var dropTarget = this.getTargetFromDropEvent_(e);
      // Determines whether the drop target is to accept the drop.
      // The drop is only successful on another ListItem.
      if (!(dropTarget instanceof ListItem) ||
          dropTarget == this.draggedItem) {
        this.hideDropMarker_();
        return;
      }
      // Compute the drop postion. Should we move the dragged item to
      // below or above the drop target?
      var rect = dropTarget.getBoundingClientRect();
      var dy = e.clientY - rect.top;
      var yRatio = dy / rect.height;
      var dropPos = yRatio <= .5 ? 'above' : 'below';
      this.dropPos = dropPos;
      this.showDropMarker_(dropTarget, dropPos);
      e.preventDefault();
    },

    /*
     * Handles the drop event.
     * @param {Event} e The drop event.
     * @private
     */
    handleDrop_: function(e) {
      var dropTarget = this.getTargetFromDropEvent_(e);
      this.hideDropMarker_();

      // Delete the language from the original position.
      var languageCode = this.draggedItem.languageCode;
      var originalIndex = this.dataModel.indexOf(languageCode);
      this.dataModel.splice(originalIndex, 1);
      // Insert the language to the new position.
      var newIndex = this.dataModel.indexOf(dropTarget.languageCode);
      if (this.dropPos == 'below')
        newIndex += 1;
      this.dataModel.splice(newIndex, 0, languageCode);
      // The cursor should move to the moved item.
      this.selectionModel.selectedIndex = newIndex;
      // Save the preference.
      this.savePreference_();
    },

    /*
     * Handles the dragleave event.
     * @param {Event} e The dragleave event
     * @private
     */
    handleDragLeave_ : function(e) {
      this.hideDropMarker_();
    },

    /*
     * Shows and positions the marker to indicate the drop target.
     * @param {HTMLElement} target The current target list item of drop
     * @param {string} pos 'below' or 'above'
     * @private
     */
    showDropMarker_ : function(target, pos) {
      window.clearTimeout(this.hideDropMarkerTimer_);
      var marker = $('language-options-list-dropmarker');
      var rect = target.getBoundingClientRect();
      var markerHeight = 8;
      if (pos == 'above') {
        marker.style.top = (rect.top - markerHeight/2) + 'px';
      } else {
        marker.style.top = (rect.bottom - markerHeight/2) + 'px';
      }
      marker.style.width = rect.width + 'px';
      marker.style.left = rect.left + 'px';
      marker.style.display = 'block';
    },

    /*
     * Hides the drop marker.
     * @private
     */
    hideDropMarker_ : function() {
      // Hide the marker in a timeout to reduce flickering as we move between
      // valid drop targets.
      window.clearTimeout(this.hideDropMarkerTimer_);
      this.hideDropMarkerTimer_ = window.setTimeout(function() {
        $('language-options-list-dropmarker').style.display = '';
      }, 100);
    },

    /**
     * Handles preferred languages pref change.
     * @param {Event} e The change event object.
     * @private
     */
    handlePreferredLanguagesPrefChange_: function(e) {
      var languageCodesInCsv = e.value.value;
      var languageCodes = languageCodesInCsv.split(',');

      // Add the UI language to the initial list of languages.  This is to avoid
      // a bug where the UI language would be removed from the preferred
      // language list by sync on first login.
      // See: crosbug.com/14283
      languageCodes.push(navigator.language);
      languageCodes = this.filterBadLanguageCodes_(languageCodes);
      this.load_(languageCodes);
    },

    /**
     * Handles accept languages pref change.
     * @param {Event} e The change event object.
     * @private
     */
    handleAcceptLanguagesPrefChange_: function(e) {
      var languageCodesInCsv = e.value.value;
      var languageCodes = this.filterBadLanguageCodes_(
          languageCodesInCsv.split(','));
      this.load_(languageCodes);
    },

    /**
     * Loads given language list.
     * @param {Array} languageCodes List of language codes.
     * @private
     */
    load_: function(languageCodes) {
      // Preserve the original selected index. See comments below.
      var originalSelectedIndex = (this.selectionModel ?
                                   this.selectionModel.selectedIndex : -1);
      this.dataModel = new ArrayDataModel(languageCodes);
      if (originalSelectedIndex >= 0 &&
          originalSelectedIndex < this.dataModel.length) {
        // Restore the original selected index if the selected index is
        // valid after the data model is loaded. This is neeeded to keep
        // the selected language after the languge is added or removed.
        this.selectionModel.selectedIndex = originalSelectedIndex;
        // The lead index should be updated too.
        this.selectionModel.leadIndex = originalSelectedIndex;
      } else if (this.dataModel.length > 0){
        // Otherwise, select the first item if it's not empty.
        // Note that ListSingleSelectionModel won't select an item
        // automatically, hence we manually select the first item here.
        this.selectionModel.selectedIndex = 0;
      }
    },

    /**
     * Saves the preference.
     */
    savePreference_: function() {
      // Encode the language codes into a CSV string.
      if (lbm.isChromeOS)
        Preferences.setStringPref(this.preferredLanguagesPref,
                                  this.dataModel.slice().join(','));
      // Save the same language list as accept languages preference as
      // well, but we need to expand the language list, to make it more
      // acceptable. For instance, some web sites don't understand 'en-US'
      // but 'en'. See crosbug.com/9884.
      var acceptLanguages = this.expandLanguageCodes(this.dataModel.slice());
      Preferences.setStringPref(this.acceptLanguagesPref,
                                acceptLanguages.join(','));
      lbm.dispatchSimpleEvent(this, 'save');
    },

    /**
     * Expands language codes to make these more suitable for Accept-Language.
     * Example: ['en-US', 'ja', 'en-CA'] => ['en-US', 'en', 'ja', 'en-CA'].
     * 'en' won't appear twice as this function eliminates duplicates.
     * @param {Array} languageCodes List of language codes.
     * @private
     */
    expandLanguageCodes: function(languageCodes) {
      var expandedLanguageCodes = [];
      var seen = {};  // Used to eliminiate duplicates.
      for (var i = 0; i < languageCodes.length; i++) {
        var languageCode = languageCodes[i];
        if (!(languageCode in seen)) {
          expandedLanguageCodes.push(languageCode);
          seen[languageCode] = true;
        }
        var parts = languageCode.split('-');
        if (!(parts[0] in seen)) {
          expandedLanguageCodes.push(parts[0]);
          seen[parts[0]] = true;
        }
      }
      return expandedLanguageCodes;
    },

    /**
     * Filters bad language codes in case bad language codes are
     * stored in the preference. Removes duplicates as well.
     * @param {Array} languageCodes List of language codes.
     * @private
     */
    filterBadLanguageCodes_: function(languageCodes) {
      var filteredLanguageCodes = [];
      var seen = {};
      for (var i = 0; i < languageCodes.length; i++) {
        // Check if the the language code is valid, and not
        // duplicate. Otherwise, skip it.
        if (LanguageList.isValidLanguageCode(languageCodes[i]) &&
            !(languageCodes[i] in seen)) {
          filteredLanguageCodes.push(languageCodes[i]);
          seen[languageCodes[i]] = true;
        }
      }
      return filteredLanguageCodes;
    },
  };

  return {
    LanguageList: LanguageList,
    LanguageListItem: LanguageListItem
  };
});

// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// TODO(kochi): Generalize the notification as a component and put it
// in js/cr/ui/notification.js .

lbm.define('options', function() {
  const OptionsPage = options.OptionsPage;
  const LanguageList = options.LanguageList;

  // Some input methods like Chinese Pinyin have config pages.
  // This is the map of the input method names to their config page names.
  const INPUT_METHOD_ID_TO_CONFIG_PAGE_NAME = {
    'mozc': 'languageMozc',
    'mozc-chewing': 'languageChewing',
    'mozc-dv': 'languageMozc',
    'mozc-hangul': 'languageHangul',
    'mozc-jp': 'languageMozc',
    'pinyin': 'languagePinyin',
    'pinyin-dv': 'languagePinyin',
  };

  /////////////////////////////////////////////////////////////////////////////
  // LanguageOptions class:

  /**
   * Encapsulated handling of ChromeOS language options page.
   * @constructor
   */
  function LanguageOptions(model) {
    OptionsPage.call(this, 'languages', templateData.languagePageTabTitle,
                     'languagePage');
  }

  lbm.addSingletonGetter(LanguageOptions);

  // Inherit LanguageOptions from OptionsPage.
  LanguageOptions.prototype = {
    __proto__: OptionsPage.prototype,

    /**
     * Initializes LanguageOptions page.
     * Calls base class implementation to starts preference initialization.
     */
    initializePage: function() {
      OptionsPage.prototype.initializePage.call(this);

      var languageOptionsList = $('language-options-list');
      LanguageList.decorate(languageOptionsList);

      languageOptionsList.addEventListener('change',
          this.handleLanguageOptionsListChange_.bind(this));
      languageOptionsList.addEventListener('save',
          this.handleLanguageOptionsListSave_.bind(this));

      this.addEventListener('visibleChange',
                            this.handleVisibleChange_.bind(this));

      if (lbm.isChromeOS) {
        this.initializeInputMethodList_();
        this.initializeLanguageCodeToInputMethodIdsMap_();
      }
      Preferences.getInstance().addEventListener(this.spellCheckDictionaryPref,
          this.handleSpellCheckDictionaryPrefChange_.bind(this));

      // Set up add button.
      $('language-options-add-button').onclick = function(e) {
        // Add the language without showing the overlay if it's specified in
        // the URL hash (ex. lang_add=ja).  Used for automated testing.
        var match = document.location.hash.match(/\blang_add=([\w-]+)/);
        if (match) {
          var addLanguageCode = match[1];
          $('language-options-list').addLanguage(addLanguageCode);
        } else {
          OptionsPage.navigateToPage('addLanguage');
        }
      };

      if (lbm.isChromeOS) {
        // Listen to user clicks on the add language list.
        var addLanguageList = $('add-language-overlay-language-list');
        addLanguageList.addEventListener('click',
            this.handleAddLanguageListClick_.bind(this));
      } else {
        // Listen to add language dialog ok button.
        var addLanguageOkButton = $('add-language-overlay-ok-button');
        addLanguageOkButton.addEventListener('click',
            this.handleAddLanguageOkButtonClick_.bind(this));

        // Show experimental features if enabled.
        if (templateData.experimentalSpellCheckFeatures == 'true') {
          $('auto-spell-correction-option').hidden = false;
        }
      }

      if(!lbm.isChromeOS) {
        // Handle spell check enable/disable.
        Preferences.getInstance().addEventListener(this.enableSpellCheckPref,
            this.updateEnableSpellCheck_.bind(this));
      }
    },

    // The preference is a boolean that enables/disables spell checking.
    enableSpellCheckPref: 'browser.enable_spellchecking',
    // The preference is a CSV string that describes preload engines
    // (i.e. active input methods).
    preloadEnginesPref: 'settings.language.preload_engines',
    // The list of preload engines, like ['mozc', 'pinyin'].
    preloadEngines_: [],
    // The preference is a string that describes the spell check
    // dictionary language, like "en-US".
    spellCheckDictionaryPref: 'spellcheck.dictionary',
    spellCheckDictionary_: "",
    // The map of language code to input method IDs, like:
    // {'ja': ['mozc', 'mozc-jp'], 'zh-CN': ['pinyin'], ...}
    languageCodeToInputMethodIdsMap_: {},

    /**
     * Initializes the input method list.
     */
    initializeInputMethodList_: function() {
      var inputMethodList = $('language-options-input-method-list');
      var inputMethodListData = templateData.inputMethodList;

      // Add all input methods, but make all of them invisible here. We'll
      // change the visibility in handleLanguageOptionsListChange_() based
      // on the selected language. Note that we only have less than 100
      // input methods, so creating DOM nodes at once here should be ok.
      for (var i = 0; i < inputMethodListData.length; i++) {
        var inputMethod = inputMethodListData[i];
        var input = document.createElement('input');
        input.type = 'checkbox';
        input.inputMethodId = inputMethod.id;
        // Listen to user clicks.
        input.addEventListener('click',
                               this.handleCheckboxClick_.bind(this));
        var label = document.createElement('label');
        label.appendChild(input);
        // Adding a space between the checkbox and the text. This is a bit
        // dirty, but we rely on a space character for all other checkboxes.
        label.appendChild(document.createTextNode(
            ' ' + inputMethod.displayName));
        label.style.display = 'none';
        label.languageCodeSet = inputMethod.languageCodeSet;
        // Add the configure button if the config page is present for this
        // input method.
        if (inputMethod.id in INPUT_METHOD_ID_TO_CONFIG_PAGE_NAME) {
          var pageName = INPUT_METHOD_ID_TO_CONFIG_PAGE_NAME[inputMethod.id];
          var button = this.createConfigureInputMethodButton_(inputMethod.id,
                                                              pageName);
          label.appendChild(button);
        }

        inputMethodList.appendChild(label);
      }
      // Listen to pref change once the input method list is initialized.
      Preferences.getInstance().addEventListener(this.preloadEnginesPref,
          this.handlePreloadEnginesPrefChange_.bind(this));
    },

    /**
     * Creates a configure button for the given input method ID.
     * @param {string} inputMethodId Input method ID (ex. "pinyin").
     * @param {string} pageName Name of the config page (ex. "languagePinyin").
     * @private
     */
    createConfigureInputMethodButton_: function(inputMethodId, pageName) {
      var button = document.createElement('button');
      button.textContent = localStrings.getString('configure');
      button.onclick = function(e) {
        // Prevent the default action (i.e. changing the checked property
        // of the checkbox). The button click here should not be handled
        // as checkbox click.
        e.preventDefault();
        chrome.send('inputMethodOptionsOpen', [inputMethodId]);
        OptionsPage.navigateToPage(pageName);
      }
      return button;
    },

    /**
     * Handles OptionsPage's visible property change event.
     * @param {Event} e Property change event.
     * @private
     */
    handleVisibleChange_: function(e) {
      if (this.visible) {
        $('language-options-list').redraw();
        chrome.send('languageOptionsOpen');
      }
    },

    /**
     * Handles languageOptionsList's change event.
     * @param {Event} e Change event.
     * @private
     */
    handleLanguageOptionsListChange_: function(e) {
      var languageOptionsList = $('language-options-list');
      var languageCode = languageOptionsList.getSelectedLanguageCode();
      // Select the language if it's specified in the URL hash (ex. lang=ja).
      // Used for automated testing.
      var match = document.location.hash.match(/\blang=([\w-]+)/);
      if (match) {
        var specifiedLanguageCode = match[1];
        if (languageOptionsList.selectLanguageByCode(specifiedLanguageCode)) {
          languageCode = specifiedLanguageCode;
        }
      }
      this.updateSelectedLanguageName_(languageCode);
      if (lbm.isWindows || lbm.isChromeOS)
        this.updateUiLanguageButton_(languageCode);
      this.updateSpellCheckLanguageButton_(languageCode);
      if (lbm.isChromeOS)
        this.updateInputMethodList_(languageCode);
      this.updateLanguageListInAddLanguageOverlay_();
    },

    /**
     * Handles languageOptionsList's save event.
     * @param {Event} e Save event.
     * @private
     */
    handleLanguageOptionsListSave_: function(e) {
      if (lbm.isChromeOS) {
        // Sort the preload engines per the saved languages before save.
        this.preloadEngines_ = this.sortPreloadEngines_(this.preloadEngines_);
        this.savePreloadEnginesPref_();
      }
    },

    /**
     * Sorts preloadEngines_ by languageOptionsList's order.
     * @param {Array} preloadEngines List of preload engines.
     * @return {Array} Returns sorted preloadEngines.
     * @private
     */
    sortPreloadEngines_: function(preloadEngines) {
      // For instance, suppose we have two languages and associated input
      // methods:
      //
      // - Korean: hangul
      // - Chinese: pinyin
      //
      // The preloadEngines preference should look like "hangul,pinyin".
      // If the user reverse the order, the preference should be reorderd
      // to "pinyin,hangul".
      var languageOptionsList = $('language-options-list');
      var languageCodes = languageOptionsList.getLanguageCodes();

      // Convert the list into a dictonary for simpler lookup.
      var preloadEngineSet = {};
      for (var i = 0; i < preloadEngines.length; i++) {
        preloadEngineSet[preloadEngines[i]] = true;
      }

      // Create the new preload engine list per the language codes.
      var newPreloadEngines = [];
      for (var i = 0; i < languageCodes.length; i++) {
        var languageCode = languageCodes[i];
        var inputMethodIds = this.languageCodeToInputMethodIdsMap_[
            languageCode];
        // Check if we have active input methods associated with the language.
        for (var j = 0; j < inputMethodIds.length; j++) {
          var inputMethodId = inputMethodIds[j];
          if (inputMethodId in preloadEngineSet) {
            // If we have, add it to the new engine list.
            newPreloadEngines.push(inputMethodId);
            // And delete it from the set. This is necessary as one input
            // method can be associated with more than one language thus
            // we should avoid having duplicates in the new list.
            delete preloadEngineSet[inputMethodId];
          }
        }
      }

      return newPreloadEngines;
    },

    /**
     * Initializes the map of language code to input method IDs.
     * @private
     */
    initializeLanguageCodeToInputMethodIdsMap_: function() {
      var inputMethodList = templateData.inputMethodList;
      for (var i = 0; i < inputMethodList.length; i++) {
        var inputMethod = inputMethodList[i];
        for (var languageCode in inputMethod.languageCodeSet) {
          if (languageCode in this.languageCodeToInputMethodIdsMap_) {
            this.languageCodeToInputMethodIdsMap_[languageCode].push(
                inputMethod.id);
          } else {
            this.languageCodeToInputMethodIdsMap_[languageCode] =
                [inputMethod.id];
          }
        }
      }
    },

    /**
     * Updates the currently selected language name.
     * @param {string} languageCode Language code (ex. "fr").
     * @private
     */
    updateSelectedLanguageName_: function(languageCode) {
      var languageDisplayName = LanguageList.getDisplayNameFromLanguageCode(
          languageCode);
      var languageNativeDisplayName =
          LanguageList.getNativeDisplayNameFromLanguageCode(languageCode);
      // If the native name is different, add it.
      if (languageDisplayName != languageNativeDisplayName) {
        languageDisplayName += ' - ' + languageNativeDisplayName;
      }
      // Update the currently selected language name.
      var languageName = $('language-options-language-name');
      if (languageDisplayName) {
        languageName.hidden = false;
        languageName.textContent = languageDisplayName;
      } else {
        languageName.hidden = true;
      }
    },

    /**
     * Updates the UI language button.
     * @param {string} languageCode Language code (ex. "fr").
     * @private
     */
    updateUiLanguageButton_: function(languageCode) {
      var uiLanguageButton = $('language-options-ui-language-button');
      // Check if the language code matches the current UI language.
      if (languageCode == templateData.currentUiLanguageCode) {
        // If it matches, the button just says that the UI language is
        // currently in use.
        uiLanguageButton.textContent =
            localStrings.getString('is_displayed_in_this_language');
        // Make it look like a text label.
        uiLanguageButton.className = 'text-button';
        // Remove the event listner.
        uiLanguageButton.onclick = undefined;
      } else if (languageCode in templateData.uiLanguageCodeSet) {
        // If the language is supported as UI language, users can click on
        // the button to change the UI language.
        if (lbm.commandLine.options['--bwsi']) {
          // In the guest mode for ChromeOS, changing UI language does not make
          // sense because it does not take effect after browser restart.
          uiLanguageButton.hidden = true;
        } else {
          uiLanguageButton.textContent =
              localStrings.getString('display_in_this_language');
          uiLanguageButton.className = '';
          // Send the change request to Chrome.
          uiLanguageButton.onclick = function(e) {
            chrome.send('uiLanguageChange', [languageCode]);
          }
        }
        if (lbm.isChromeOS) {
          $('language-options-ui-restart-button').onclick = function(e) {
            chrome.send('uiLanguageRestart');
          }
        }
      } else {
        // If the language is not supported as UI language, the button
        // just says that Chromium OS cannot be displayed in this language.
        uiLanguageButton.textContent =
            localStrings.getString('cannot_be_displayed_in_this_language');
        uiLanguageButton.className = 'text-button';
        uiLanguageButton.onclick = undefined;
      }
      uiLanguageButton.style.display = 'block';
      $('language-options-ui-notification-bar').style.display = 'none';
    },

    /**
     * Updates the spell check language button.
     * @param {string} languageCode Language code (ex. "fr").
     * @private
     */
    updateSpellCheckLanguageButton_: function(languageCode) {
      var display = 'block';
      var spellCheckLanguageButton = $(
          'language-options-spell-check-language-button');
      // Check if the language code matches the current spell check language.
      if (languageCode == this.spellCheckDictionary_) {
        // If it matches, the button just says that the spell check language is
        // currently in use.
        spellCheckLanguageButton.textContent =
            localStrings.getString('is_used_for_spell_checking');
        // Make it look like a text label.
        spellCheckLanguageButton.className = 'text-button';
        // Remove the event listner.
        spellCheckLanguageButton.onclick = undefined;
      } else if (languageCode in templateData.spellCheckLanguageCodeSet) {
        // If the language is supported as spell check language, users can
        // click on the button to change the spell check language.
        spellCheckLanguageButton.textContent =
            localStrings.getString('use_this_for_spell_checking');
        spellCheckLanguageButton.className = '';
        spellCheckLanguageButton.languageCode = languageCode;
        // Add an event listner to the click event.
        spellCheckLanguageButton.addEventListener('click',
            this.handleSpellCheckLanguageButtonClick_.bind(this));
      } else if (!languageCode) {
        display = 'none';
      } else {
        // If the language is not supported as spell check language, the
        // button just says that this language cannot be used for spell
        // checking.
        spellCheckLanguageButton.textContent =
            localStrings.getString('cannot_be_used_for_spell_checking');
        spellCheckLanguageButton.className = 'text-button';
        spellCheckLanguageButton.onclick = undefined;
      }
      spellCheckLanguageButton.style.display = display;
      $('language-options-ui-notification-bar').style.display = 'none';
    },

    /**
     * Updates the input method list.
     * @param {string} languageCode Language code (ex. "fr").
     * @private
     */
    updateInputMethodList_: function(languageCode) {
      // Give one of the checkboxes or buttons focus, if it's specified in the
      // URL hash (ex. focus=mozc). Used for automated testing.
      var focusInputMethodId = -1;
      var match = document.location.hash.match(/\bfocus=([\w:-]+)\b/);
      if (match) {
        focusInputMethodId = match[1];
      }
      // Change the visibility of the input method list. Input methods that
      // matches |languageCode| will become visible.
      var inputMethodList = $('language-options-input-method-list');
      var labels = inputMethodList.querySelectorAll('label');
      for (var i = 0; i < labels.length; i++) {
        var label = labels[i];
        if (languageCode in label.languageCodeSet) {
          label.style.display = 'block';
          var input = label.childNodes[0];
          // Give it focus if the ID matches.
          if (input.inputMethodId == focusInputMethodId) {
            input.focus();
          }
        } else {
          label.style.display = 'none';
        }
      }

      if (focusInputMethodId == 'add') {
        $('language-options-add-button').focus();
      }
    },

    /**
     * Updates the language list in the add language overlay.
     * @param {string} languageCode Language code (ex. "fr").
     * @private
     */
    updateLanguageListInAddLanguageOverlay_: function(languageCode) {
      // Change the visibility of the language list in the add language
      // overlay. Languages that are already active will become invisible,
      // so that users don't add the same language twice.
      var languageOptionsList = $('language-options-list');
      var languageCodes = languageOptionsList.getLanguageCodes();
      var languageCodeSet = {};
      for (var i = 0; i < languageCodes.length; i++) {
        languageCodeSet[languageCodes[i]] = true;
      }
      var addLanguageList = $('add-language-overlay-language-list');
      var lis = addLanguageList.querySelectorAll('li');
      for (var i = 0; i < lis.length; i++) {
        // The first child button knows the language code.
        var button = lis[i].childNodes[0];
        if (button.languageCode in languageCodeSet) {
          lis[i].style.display = 'none';
        } else {
          lis[i].style.display = 'block';
        }
      }
    },

    /**
     * Handles preloadEnginesPref change.
     * @param {Event} e Change event.
     * @private
     */
    handlePreloadEnginesPrefChange_: function(e) {
      var value = e.value.value;
      this.preloadEngines_ = this.filterBadPreloadEngines_(value.split(','));
      this.updateCheckboxesFromPreloadEngines_();
      $('language-options-list').updateDeletable();
    },

    /**
     * Handles input method checkbox's click event.
     * @param {Event} e Click event.
     * @private
     */
    handleCheckboxClick_ : function(e) {
      var checkbox = e.target;
      if (this.preloadEngines_.length == 1 && !checkbox.checked) {
        // Don't allow disabling the last input method.
        this.showNotification_(
            localStrings.getString('please_add_another_input_method'),
            localStrings.getString('ok_button'));
        checkbox.checked = true;
        return;
      }
      if (checkbox.checked) {
        chrome.send('inputMethodEnable', [checkbox.inputMethodId]);
      } else {
        chrome.send('inputMethodDisable', [checkbox.inputMethodId]);
      }
      this.updatePreloadEnginesFromCheckboxes_();
      this.preloadEngines_ = this.sortPreloadEngines_(this.preloadEngines_);
      this.savePreloadEnginesPref_();
    },

    /**
     * Handles add language list's click event.
     * @param {Event} e Click event.
     */
    handleAddLanguageListClick_ : function(e) {
      var languageOptionsList = $('language-options-list');
      var languageCode = e.target.languageCode;
      // languageCode can be undefined, if click was made on some random
      // place in the overlay, rather than a button. Ignore it.
      if (!languageCode) {
        return;
      }
      languageOptionsList.addLanguage(languageCode);
      var inputMethodIds = this.languageCodeToInputMethodIdsMap_[languageCode];
      // Enable the first input method for the language added.
      if (inputMethodIds && inputMethodIds[0] &&
          // Don't add the input method it's already present. This can
          // happen if the same input method is shared among multiple
          // languages (ex. English US keyboard is used for English US and
          // Filipino).
          this.preloadEngines_.indexOf(inputMethodIds[0]) == -1) {
        this.preloadEngines_.push(inputMethodIds[0]);
        this.updateCheckboxesFromPreloadEngines_();
        this.savePreloadEnginesPref_();
      }
      OptionsPage.closeOverlay();
    },

    /**
     * Handles add language dialog ok button.
     */
    handleAddLanguageOkButtonClick_ : function() {
      var languagesSelect = $('add-language-overlay-language-list');
      var selectedIndex = languagesSelect.selectedIndex;
      if (selectedIndex >= 0) {
        var selection = languagesSelect.options[selectedIndex];
        $('language-options-list').addLanguage(String(selection.value));
        OptionsPage.closeOverlay();
      }
    },

    /**
     * Checks if languageCode is deletable or not.
     * @param {String} languageCode the languageCode to check for deletability.
     */
    languageIsDeletable: function(languageCode) {
      // Don't allow removing the language if it's as UI language.
      if (languageCode == templateData.currentUiLanguageCode)
        return false;
      return (!lbm.isChromeOS ||
              this.canDeleteLanguage_(languageCode));
    },

    /**
     * Handles browse.enable_spellchecking change.
     * @param {Event} e Change event.
     * @private
     */
     updateEnableSpellCheck_: function() {
       var value = !$('enable-spell-check').checked;

       $('language-options-spell-check-language-button').disabled = value;
       $('language-options-add-button').disabled = value;
     },

    /**
     * Handles spellCheckDictionaryPref change.
     * @param {Event} e Change event.
     * @private
     */
    handleSpellCheckDictionaryPrefChange_: function(e) {
      var languageCode = e.value.value
      this.spellCheckDictionary_ = languageCode;
      var languageOptionsList = $('language-options-list');
      var selectedLanguageCode = languageOptionsList.getSelectedLanguageCode();
      this.updateSpellCheckLanguageButton_(selectedLanguageCode);
    },

    /**
     * Handles spellCheckLanguageButton click.
     * @param {Event} e Click event.
     * @private
     */
    handleSpellCheckLanguageButtonClick_: function(e) {
      var languageCode = e.target.languageCode;
      // Save the preference.
      Preferences.setStringPref(this.spellCheckDictionaryPref,
                                languageCode);
      chrome.send('spellCheckLanguageChange', [languageCode]);
    },

    /**
     * Checks whether it's possible to remove the language specified by
     * languageCode and returns true if possible. This function returns false
     * if the removal causes the number of preload engines to be zero.
     *
     * @param {string} languageCode Language code (ex. "fr").
     * @return {boolean} Returns true on success.
     * @private
     */
    canDeleteLanguage_: function(languageCode) {
      // First create the set of engines to be removed from input methods
      // associated with the language code.
      var enginesToBeRemovedSet = {};
      var inputMethodIds = this.languageCodeToInputMethodIdsMap_[languageCode];
      for (var i = 0; i < inputMethodIds.length; i++) {
        enginesToBeRemovedSet[inputMethodIds[i]] = true;
      }

      // Then eliminate engines that are also used for other active languages.
      // For instance, if "xkb:us::eng" is used for both English and Filipino.
      var languageCodes = $('language-options-list').getLanguageCodes();
      for (var i = 0; i < languageCodes.length; i++) {
        // Skip the target language code.
        if (languageCodes[i] == languageCode) {
          continue;
        }
        // Check if input methods used in this language are included in
        // enginesToBeRemovedSet. If so, eliminate these from the set, so
        // we don't remove this time.
        var inputMethodIdsForAnotherLanguage =
            this.languageCodeToInputMethodIdsMap_[languageCodes[i]];
        for (var j = 0; j < inputMethodIdsForAnotherLanguage.length; j++) {
          var inputMethodId = inputMethodIdsForAnotherLanguage[j];
          if (inputMethodId in enginesToBeRemovedSet) {
            delete enginesToBeRemovedSet[inputMethodId];
          }
        }
      }

      // Update the preload engine list with the to-be-removed set.
      var newPreloadEngines = [];
      for (var i = 0; i < this.preloadEngines_.length; i++) {
        if (!(this.preloadEngines_[i] in enginesToBeRemovedSet)) {
          newPreloadEngines.push(this.preloadEngines_[i]);
        }
      }
      // Don't allow this operation if it causes the number of preload
      // engines to be zero.
      return (newPreloadEngines.length > 0);
    },

    /**
     * Saves the preload engines preference.
     * @private
     */
    savePreloadEnginesPref_: function() {
      Preferences.setStringPref(this.preloadEnginesPref,
                                this.preloadEngines_.join(','));
    },

    /**
     * Updates the checkboxes in the input method list from the preload
     * engines preference.
     * @private
     */
    updateCheckboxesFromPreloadEngines_: function() {
      // Convert the list into a dictonary for simpler lookup.
      var dictionary = {};
      for (var i = 0; i < this.preloadEngines_.length; i++) {
        dictionary[this.preloadEngines_[i]] = true;
      }

      var inputMethodList = $('language-options-input-method-list');
      var checkboxes = inputMethodList.querySelectorAll('input');
      for (var i = 0; i < checkboxes.length; i++) {
        checkboxes[i].checked = (checkboxes[i].inputMethodId in dictionary);
      }
    },

    /**
     * Updates the preload engines preference from the checkboxes in the
     * input method list.
     * @private
     */
    updatePreloadEnginesFromCheckboxes_: function() {
      this.preloadEngines_ = [];
      var inputMethodList = $('language-options-input-method-list');
      var checkboxes = inputMethodList.querySelectorAll('input');
      for (var i = 0; i < checkboxes.length; i++) {
        if (checkboxes[i].checked) {
          this.preloadEngines_.push(checkboxes[i].inputMethodId);
        }
      }
      var languageOptionsList = $('language-options-list');
      languageOptionsList.updateDeletable();
    },

    /**
     * Filters bad preload engines in case bad preload engines are
     * stored in the preference. Removes duplicates as well.
     * @param {Array} preloadEngines List of preload engines.
     * @private
     */
    filterBadPreloadEngines_: function(preloadEngines) {
      // Convert the list into a dictonary for simpler lookup.
      var dictionary = {};
      for (var i = 0; i < templateData.inputMethodList.length; i++) {
        dictionary[templateData.inputMethodList[i].id] = true;
      }

      var filteredPreloadEngines = [];
      var seen = {};
      for (var i = 0; i < preloadEngines.length; i++) {
        // Check if the preload engine is present in the
        // dictionary, and not duplicate. Otherwise, skip it.
        if (preloadEngines[i] in dictionary && !(preloadEngines[i] in seen)) {
          filteredPreloadEngines.push(preloadEngines[i]);
          seen[preloadEngines[i]] = true;
        }
      }
      return filteredPreloadEngines;
    },

    // TODO(kochi): This is an adapted copy from new_tab.js.
    // If this will go as final UI, refactor this to share the component with
    // new new tab page.
    /**
     * Shows notification
     * @private
     */
    notificationTimeout_: null,
    showNotification_ : function(text, actionText, opt_delay) {
      var notificationElement = $('notification');
      var actionLink = notificationElement.querySelector('.link-color');
      var delay = opt_delay || 10000;

      function show() {
        window.clearTimeout(this.notificationTimeout_);
        notificationElement.classList.add('show');
        document.body.classList.add('notification-shown');
      }

      function hide() {
        window.clearTimeout(this.notificationTimeout_);
        notificationElement.classList.remove('show');
        document.body.classList.remove('notification-shown');
        // Prevent tabbing to the hidden link.
        actionLink.tabIndex = -1;
        // Setting tabIndex to -1 only prevents future tabbing to it. If,
        // however, the user switches window or a tab and then moves back to
        // this tab the element may gain focus. We therefore make sure that we
        // blur the element so that the element focus is not restored when
        // coming back to this window.
        actionLink.blur();
      }

      function delayedHide() {
        this.notificationTimeout_ = window.setTimeout(hide, delay);
      }

      notificationElement.firstElementChild.textContent = text;
      actionLink.textContent = actionText;

      actionLink.onclick = hide;
      actionLink.onkeydown = function(e) {
        if (e.keyIdentifier == 'Enter') {
          hide();
        }
      };
      notificationElement.onmouseover = show;
      notificationElement.onmouseout = delayedHide;
      actionLink.onfocus = show;
      actionLink.onblur = delayedHide;
      // Enable tabbing to the link now that it is shown.
      actionLink.tabIndex = 0;

      show();
      delayedHide();
    }
  };

  /**
   * Chrome callback for when the UI language preference is saved.
   */
  LanguageOptions.uiLanguageSaved = function() {
    $('language-options-ui-language-button').style.display = 'none';
    $('language-options-ui-notification-bar').style.display = 'block';
  };

  // Export
  return {
    LanguageOptions: LanguageOptions
  };
});

// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {
  var OptionsPage = options.OptionsPage;
  var ArrayDataModel = lbm.ui.ArrayDataModel;

  const localStrings = new LocalStrings();

  /**
   * ManageProfileOverlay class
   * Encapsulated handling of the 'Manage profile...' overlay page.
   * @constructor
   * @class
   */
  function ManageProfileOverlay() {
    OptionsPage.call(this,
                     'manageProfile',
                     templateData.manageProfileOverlayTabTitle,
                     'manage-profile-overlay');
  };

  lbm.addSingletonGetter(ManageProfileOverlay);

  ManageProfileOverlay.prototype = {
    // Inherit from OptionsPage.
    __proto__: OptionsPage.prototype,

    // Info about the currently managed/deleted profile.
    profileInfo_: null,

    // An object containing all known profile names.
    profileNames_: {},

    /**
     * Initialize the page.
     */
    initializePage: function() {
      // Call base class implementation to start preference initialization.
      OptionsPage.prototype.initializePage.call(this);

      var self = this;
      var iconGrid = $('manage-profile-icon-grid');
      options.ProfilesIconGrid.decorate(iconGrid);

      $('manage-profile-name').oninput = this.onNameChanged_.bind(this);
      $('manage-profile-cancel').onclick =
          $('delete-profile-cancel').onclick = function(event) {
        OptionsPage.closeOverlay();
      };
      $('manage-profile-ok').onclick = function(event) {
        OptionsPage.closeOverlay();
        self.submitManageChanges_();
      };
      $('delete-profile-ok').onclick = function(event) {
        OptionsPage.closeOverlay();
        chrome.send('deleteProfile', [self.profileInfo_.filePath]);
      };
    },

    /** @inheritDoc */
    didShowPage: function() {
      var grid = $('manage-profile-icon-grid');
      // Recalculate the measured item size.
      grid.measured_ = null;
      grid.columns = 0;
      grid.redraw();

      $('manage-profile-name').focus();
    },

    /**
     * Set the profile info used in the dialog.
     * @param {Object} profileInfo An object of the form:
     *     profileInfo = {
     *       name: "Profile Name",
     *       iconURL: "chrome://path/to/icon/image",
     *       filePath: "/path/to/profile/data/on/disk"
     *       isCurrentProfile: false,
     *     };
     * @private
     */
    setProfileInfo_: function(profileInfo) {
      this.profileInfo_ = profileInfo;
      $('manage-profile-name').value = profileInfo.name;
      $('manage-profile-icon-grid').selectedItem = profileInfo.iconURL;
    },

    /**
     * Set an array of default icon URLs. These will be added to the grid that
     * the user will use to choose their profile icon.
     * @param {Array.<string>} iconURLs An array of icon URLs.
     * @private
     */
    receiveDefaultProfileIcons_: function(iconURLs) {
      $('manage-profile-icon-grid').dataModel = new ArrayDataModel(iconURLs);
    },

    /**
     * Set a dictionary of all profile names. These are used to prevent the
     * user from naming two profiles the same.
     * @param {Object} profileNames A dictionary of profile names.
     * @private
     */
    receiveProfileNames_: function(profileNames) {
      this.profileNames_ = profileNames;
    },

    /**
     * Determine whether |name| is valid; i.e. not equal to any other profile
     * name.
     * @param {string} name The profile name to validate.
     * @return true if the name is not equal to any other profile name.
     * @private
     */
    isNameValid_: function(name) {
      // if the name hasn't changed, assume it is valid.
      if (name == this.profileInfo_.name)
        return true;

      return this.profileNames_[name] == undefined;
    },

    /**
     * Update the UI elements accordingly if the profile name is valid/invalid.
     * @param {boolean} isValid True if the UI should be updated as if the name
     *     were valid.
     * @private
     */
    setNameIsValid_: function(isValid) {
      var dupeNameErrorEl = $('manage-profile-duplicate-name-error');
      if (isValid)
        dupeNameErrorEl.classList.add('hiding');
      else
        dupeNameErrorEl.classList.remove('hiding');

      $('manage-profile-ok').disabled = !isValid;
    },

    /**
     * oninput callback for <input> field.
     * @param event The event object
     * @private
     */
    onNameChanged_: function(event) {
      this.setNameIsValid_(this.isNameValid_(event.target.value));
    },

    /**
     * Called when the user clicks "OK". Saves the newly changed profile info.
     * @private
     */
    submitManageChanges_: function() {
      var name = $('manage-profile-name').value;
      var iconURL = $('manage-profile-icon-grid').selectedItem;
      chrome.send('setProfileNameAndIcon',
                  [this.profileInfo_.filePath, name, iconURL]);
    },

    /**
     * Display the "Manage Profile" dialog.
     * @param {Object} profileInfo The profile object of the profile to manage.
     * @private
     */
    showManageDialog_: function(profileInfo) {
      ManageProfileOverlay.setProfileInfo(profileInfo);
      $('manage-profile-overlay-manage').hidden = false;
      $('manage-profile-overlay-delete').hidden = true;
      ManageProfileOverlay.getInstance().setNameIsValid_(true);

      // Intentionally don't show the URL in the location bar as we don't want
      // people trying to navigate here by hand.
      OptionsPage.showPageByName('manageProfile', false);
    },

    /**
     * Display the "Delete Profile" dialog.
     * @param {Object} profileInfo The profile object of the profile to delete.
     * @private
     */
    showDeleteDialog_: function(profileInfo) {
      ManageProfileOverlay.setProfileInfo(profileInfo);
      $('manage-profile-overlay-manage').hidden = true;
      $('manage-profile-overlay-delete').hidden = false;
      $('delete-profile-message').textContent =
          localStrings.getStringF('deleteProfileMessage', profileInfo.name);

      // Intentionally don't show the URL in the location bar as we don't want
      // people trying to navigate here by hand.
      OptionsPage.showPageByName('manageProfile', false);
    },
  };

  // Forward public APIs to private implementations.
  [
    'receiveDefaultProfileIcons',
    'receiveProfileNames',
    'setProfileInfo',
    'showManageDialog',
    'showDeleteDialog',
  ].forEach(function(name) {
    ManageProfileOverlay[name] = function(value) {
      ManageProfileOverlay.getInstance()[name + '_'](value);
    };
  });

  // Export
  return {
    ManageProfileOverlay: ManageProfileOverlay
  };
});

// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {
  const OptionsPage = options.OptionsPage;

  /**
   * PackExtensionOverlay class
   * Encapsulated handling of the 'Pack Extension' overlay page.
   * @class
   */
  function PackExtensionOverlay() {
    OptionsPage.call(this, 'packExtensionOverlay',
                     templateData.packExtensionOverlayTabTitle,
                     'packExtensionOverlay');
  }

  lbm.addSingletonGetter(PackExtensionOverlay);

  PackExtensionOverlay.prototype = {
    // Inherit PackExtensionOverlay from OptionsPage.
    __proto__: OptionsPage.prototype,

    /**
     * Initialize the page.
     */
    initializePage: function() {
      // Call base class implementation to starts preference initialization.
      OptionsPage.prototype.initializePage.call(this);

      $('packExtensionDismiss').onclick = function(event) {
        OptionsPage.closeOverlay();
      };
      $('packExtensionCommit').onclick = function(event) {
        var extensionPath = $('extensionRootDir').value;
        var privateKeyPath = $('extensionPrivateKey').value;
        chrome.send('pack', [extensionPath, privateKeyPath]);
      };
      $('browseExtensionDir').addEventListener('click',
          this.handleBrowseExtensionDir_.bind(this));
      $('browsePrivateKey').addEventListener('click',
          this.handleBrowsePrivateKey_.bind(this));
    },

    /**
    * Utility function which asks the C++ to show a platform-specific file
    * select dialog, and fire |callback| with the |filePath| that resulted.
    * |selectType| can be either 'file' or 'folder'. |operation| can be 'load',
    * 'packRoot', or 'pem' which are signals to the C++ to do some
    * operation-specific configuration.
    @private
    */
    showFileDialog_: function(selectType, operation, callback) {
      handleFilePathSelected = function(filePath) {
        callback(filePath);
        handleFilePathSelected = function() {};
      };

      chrome.send('extensionSettingsSelectFilePath', [selectType, operation]);
    },

    /**
     * Handles the showing of the extension directory browser.
     * @param {Event} e Change event.
     * @private
     */
    handleBrowseExtensionDir_: function(e) {
      this.showFileDialog_('folder', 'load', function(filePath) {
        $('extensionRootDir').value = filePath;
      });
    },

    /**
     * Handles the showing of the extension private key file.
     * @param {Event} e Change event.
     * @private
     */
    handleBrowsePrivateKey_: function(e) {
      this.showFileDialog_('file', 'load', function(filePath) {
        $('extensionPrivateKey').value = filePath;
      });
    },
  };

  // Export
  return {
    PackExtensionOverlay: PackExtensionOverlay
  };
});

// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {
  const OptionsPage = options.OptionsPage;
  const ArrayDataModel = lbm.ui.ArrayDataModel;

  /////////////////////////////////////////////////////////////////////////////
  // PasswordManager class:

  /**
   * Encapsulated handling of password and exceptions page.
   * @constructor
   */
  function PasswordManager() {
    this.activeNavTab = null;
    OptionsPage.call(this,
                     'passwords',
                     templateData.passwordsPageTabTitle,
                     'password-manager');
  }

  lbm.addSingletonGetter(PasswordManager);

  PasswordManager.prototype = {
    __proto__: OptionsPage.prototype,

    /**
     * The saved passwords list.
     * @type {DeletableItemList}
     * @private
     */
    savedPasswordsList_: null,

    /**
     * The password exceptions list.
     * @type {DeletableItemList}
     * @private
     */
    passwordExceptionsList_: null,

    /**
     * The timer id of the timer set on search query change events.
     * @type {number}
     * @private
     */
    queryDelayTimerId_: 0,

    /**
     * The most recent search query, or null if the query is empty.
     * @type {?string}
     * @private
     */
    lastQuery_: null,

    /** @inheritDoc */
    initializePage: function() {
      OptionsPage.prototype.initializePage.call(this);

      $('password-search-box').addEventListener('search',
          this.handleSearchQueryChange_.bind(this));

      this.createSavedPasswordsList_();
      this.createPasswordExceptionsList_();
    },

    /** @inheritDoc */
    canShowPage: function() {
      return !PersonalOptions.disablePasswordManagement();
    },

    /** @inheritDoc */
    didShowPage: function() {
      // Updating the password lists may cause a blocking platform dialog pop up
      // (Mac, Linux), so we delay this operation until the page is shown.
      chrome.send('updatePasswordLists');
      $('password-search-box').focus();
    },

    /**
     * Creates, decorates and initializes the saved passwords list.
     * @private
     */
    createSavedPasswordsList_: function() {
      this.savedPasswordsList_ = $('saved-passwords-list');
      options.passwordManager.PasswordsList.decorate(this.savedPasswordsList_);
      this.savedPasswordsList_.autoExpands = true;
    },

    /**
     * Creates, decorates and initializes the password exceptions list.
     * @private
     */
    createPasswordExceptionsList_: function() {
      this.passwordExceptionsList_ = $('password-exceptions-list');
      options.passwordManager.PasswordExceptionsList.decorate(
          this.passwordExceptionsList_);
      this.passwordExceptionsList_.autoExpands = true;
    },

    /**
     * Handles search query changes.
     * @param {!Event} e The event object.
     * @private
     */
    handleSearchQueryChange_: function(e) {
      if (this.queryDelayTimerId_)
        window.clearTimeout(this.queryDelayTimerId_);

      // Searching cookies uses a timeout of 500ms. We use a shorter timeout
      // because there are probably fewer passwords and we want the UI to be
      // snappier since users will expect that it's "less work."
      this.queryDelayTimerId_ = window.setTimeout(
          this.searchPasswords_.bind(this), 250);
    },

    /**
     * Search passwords using text in |password-search-box|.
     * @private
     */
    searchPasswords_: function() {
      this.queryDelayTimerId_ = 0;
      var filter = $('password-search-box').value;
      filter = (filter == '') ? null : filter;
      if (this.lastQuery_ != filter) {
        this.lastQuery_ = filter;
        // Searching for passwords has the side effect of requerying the
        // underlying password store. This is done intentionally, as on OS X and
        // Linux they can change from outside and we won't be notified of it.
        chrome.send('updatePasswordLists');
      }
    },

    /**
     * Updates the visibility of the list and empty list placeholder.
     * @param {!List} list The list to toggle visilibility for.
     */
    updateListVisibility_: function(list) {
      var empty = list.dataModel.length == 0;
      var listPlaceHolderID = list.id + '-empty-placeholder';
      list.hidden = empty;
      $(listPlaceHolderID).hidden = !empty;
    },

    /**
     * Updates the data model for the saved passwords list with the values from
     * |entries|.
     * @param {Array} entries The list of saved password data.
     */
    setSavedPasswordsList_: function(entries) {
      if (this.lastQuery_) {
        // Implement password searching here in javascript, rather than in C++.
        // The number of saved passwords shouldn't be too big for us to handle.
        var query = this.lastQuery_;
        var filter = function(entry, index, list) {
          // Search both URL and username.
          if (entry[0].indexOf(query) >= 0 || entry[1].indexOf(query) >= 0) {
            // Keep the original index so we can delete correctly. See also
            // deleteItemAtIndex() in password_manager_list.js that uses this.
            entry[3] = index;
            return true;
          }
          return false;
        };
        entries = entries.filter(filter);
      }
      this.savedPasswordsList_.dataModel = new ArrayDataModel(entries);
      this.updateListVisibility_(this.savedPasswordsList_);
    },

    /**
     * Updates the data model for the password exceptions list with the values
     * from |entries|.
     * @param {Array} entries The list of password exception data.
     */
    setPasswordExceptionsList_: function(entries) {
      this.passwordExceptionsList_.dataModel = new ArrayDataModel(entries);
      this.updateListVisibility_(this.passwordExceptionsList_);
    },
  };

  /**
   * Call to remove a saved password.
   * @param rowIndex indicating the row to remove.
   */
  PasswordManager.removeSavedPassword = function(rowIndex) {
      chrome.send('removeSavedPassword', [String(rowIndex)]);
  };

  /**
   * Call to remove a password exception.
   * @param rowIndex indicating the row to remove.
   */
  PasswordManager.removePasswordException = function(rowIndex) {
      chrome.send('removePasswordException', [String(rowIndex)]);
  };

  /**
   * Call to remove all saved passwords.
   * @param tab contentType of the tab currently on.
   */
  PasswordManager.removeAllPasswords = function() {
    chrome.send('removeAllSavedPasswords');
  };

  /**
   * Call to remove all saved passwords.
   * @param tab contentType of the tab currently on.
   */
  PasswordManager.removeAllPasswordExceptions = function() {
    chrome.send('removeAllPasswordExceptions');
  };

  PasswordManager.setSavedPasswordsList = function(entries) {
    PasswordManager.getInstance().setSavedPasswordsList_(entries);
  };

  PasswordManager.setPasswordExceptionsList = function(entries) {
    PasswordManager.getInstance().setPasswordExceptionsList_(entries);
  };

  // Export
  return {
    PasswordManager: PasswordManager
  };

});

// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options.passwordManager', function() {
  const ArrayDataModel = lbm.ui.ArrayDataModel;
  const DeletableItemList = options.DeletableItemList;
  const DeletableItem = options.DeletableItem;
  const List = lbm.ui.List;

  /**
   * Creates a new passwords list item.
   * @param {Array} entry An array of the form [url, username, password]. When
   *     the list has been filtered, a fourth element [index] may be present.
   * @constructor
   * @extends {lbm.ui.ListItem}
   */
  function PasswordListItem(entry, showPasswords) {
    var el = lbm.doc.createElement('div');
    el.dataItem = entry;
    el.__proto__ = PasswordListItem.prototype;
    el.decorate(showPasswords);

    return el;
  }

  PasswordListItem.prototype = {
    __proto__: DeletableItem.prototype,

    /** @inheritDoc */
    decorate: function(showPasswords) {
      DeletableItem.prototype.decorate.call(this);

      // The URL of the site.
      var urlLabel = this.ownerDocument.createElement('div');
      urlLabel.classList.add('favicon-cell');
      urlLabel.classList.add('weakrtl');
      urlLabel.classList.add('url');
      urlLabel.setAttribute('title', this.url);
      urlLabel.textContent = this.url;
      urlLabel.style.backgroundImage = url('chrome://favicon/' + this.url);
      this.contentElement.appendChild(urlLabel);

      // The stored username.
      var usernameLabel = this.ownerDocument.createElement('div');
      usernameLabel.className = 'name';
      usernameLabel.textContent = this.username;
      this.contentElement.appendChild(usernameLabel);

      // The stored password.
      var passwordInputDiv = this.ownerDocument.createElement('div');
      passwordInputDiv.className = 'password';

      // The password input field.
      var passwordInput = this.ownerDocument.createElement('input');
      passwordInput.type = 'password';
      passwordInput.className = 'inactive-password';
      passwordInput.readOnly = true;
      passwordInput.value = showPasswords ? this.password : '********';
      passwordInputDiv.appendChild(passwordInput);

      // The show/hide button.
      if (showPasswords) {
        var button = this.ownerDocument.createElement('button');
        button.hidden = true;
        button.classList.add('password-button');
        button.textContent = localStrings.getString('passwordShowButton');
        button.addEventListener('click', this.onClick_, true);
        passwordInputDiv.appendChild(button);
      }

      this.contentElement.appendChild(passwordInputDiv);
    },

    /** @inheritDoc */
    selectionChanged: function() {
      var passwordInput = this.querySelector('input[type=password]');
      var textInput = this.querySelector('input[type=text]');
      var input = passwordInput || textInput;
      var button = input.nextSibling;
      // |button| doesn't exist when passwords can't be shown.
      if (!button)
        return;
      if (this.selected) {
        input.classList.remove('inactive-password');
        button.hidden = false;
      } else {
        input.classList.add('inactive-password');
        button.hidden = true;
      }
    },

    /**
     * On-click event handler. Swaps the type of the input field from password
     * to text and back.
     * @private
     */
    onClick_: function(event) {
      // The password is the input element previous to the button.
      var button = event.currentTarget;
      var passwordInput = button.previousSibling;
      if (passwordInput.type == 'password') {
        passwordInput.type = 'text';
        button.textContent = localStrings.getString('passwordHideButton');
      } else {
        passwordInput.type = 'password';
        button.textContent = localStrings.getString('passwordShowButton');
      }
    },

    /**
     * Get and set the URL for the entry.
     * @type {string}
     */
    get url() {
      return this.dataItem[0];
    },
    set url(url) {
      this.dataItem[0] = url;
    },

    /**
     * Get and set the username for the entry.
     * @type {string}
     */
    get username() {
      return this.dataItem[1];
    },
    set username(username) {
      this.dataItem[1] = username;
    },

    /**
     * Get and set the password for the entry.
     * @type {string}
     */
    get password() {
      return this.dataItem[2];
    },
    set password(password) {
      this.dataItem[2] = password;
    },
  };

  /**
   * Creates a new PasswordExceptions list item.
   * @param {Array} entry A pair of the form [url, username].
   * @constructor
   * @extends {Deletable.ListItem}
   */
  function PasswordExceptionsListItem(entry) {
    var el = lbm.doc.createElement('div');
    el.dataItem = entry;
    el.__proto__ = PasswordExceptionsListItem.prototype;
    el.decorate();

    return el;
  }

  PasswordExceptionsListItem.prototype = {
    __proto__: DeletableItem.prototype,

    /**
     * Call when an element is decorated as a list item.
     */
    decorate: function() {
      DeletableItem.prototype.decorate.call(this);

      // The URL of the site.
      var urlLabel = this.ownerDocument.createElement('div');
      urlLabel.className = 'url';
      urlLabel.classList.add('favicon-cell');
      urlLabel.classList.add('weakrtl');
      urlLabel.textContent = this.url;
      urlLabel.style.backgroundImage = url('chrome://favicon/' + this.url);
      this.contentElement.appendChild(urlLabel);
    },

    /**
     * Get the url for the entry.
     * @type {string}
     */
    get url() {
      return this.dataItem;
    },
    set url(url) {
      this.dataItem = url;
    },
  };

  /**
   * Create a new passwords list.
   * @constructor
   * @extends {lbm.ui.List}
   */
  var PasswordsList = lbm.ui.define('list');

  PasswordsList.prototype = {
    __proto__: DeletableItemList.prototype,

    /**
     * Whether passwords can be revealed or not.
     * @type {boolean}
     * @private
     */
    showPasswords_: true,

    /** @inheritDoc */
    decorate: function() {
      DeletableItemList.prototype.decorate.call(this);
      Preferences.getInstance().addEventListener(
          "profile.password_manager_allow_show_passwords",
          this.onPreferenceChanged_.bind(this));
    },

    /**
     * Listener for changes on the preference.
     * @param {Event} event The preference update event.
     * @private
     */
    onPreferenceChanged_: function(event) {
      this.showPasswords_ = event.value.value;
      this.redraw();
    },

    /** @inheritDoc */
    createItem: function(entry) {
      return new PasswordListItem(entry, this.showPasswords_);
    },

    /** @inheritDoc */
    deleteItemAtIndex: function(index) {
      var item = this.dataModel.item(index);
      if (item && item.length > 3) {
        // The fourth element, if present, is the original index to delete.
        index = item[3];
      }
      PasswordManager.removeSavedPassword(index);
    },

    /**
     * The length of the list.
     */
    get length() {
      return this.dataModel.length;
    },
  };

  /**
   * Create a new passwords list.
   * @constructor
   * @extends {lbm.ui.List}
   */
  var PasswordExceptionsList = lbm.ui.define('list');

  PasswordExceptionsList.prototype = {
    __proto__: DeletableItemList.prototype,

    /** @inheritDoc */
    createItem: function(entry) {
      return new PasswordExceptionsListItem(entry);
    },

    /** @inheritDoc */
    deleteItemAtIndex: function(index) {
      PasswordManager.removePasswordException(index);
    },

    /**
     * The length of the list.
     */
    get length() {
      return this.dataModel.length;
    },
  };

  return {
    PasswordListItem: PasswordListItem,
    PasswordExceptionsListItem: PasswordExceptionsListItem,
    PasswordsList: PasswordsList,
    PasswordExceptionsList: PasswordExceptionsList,
  };
});

// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {

  var OptionsPage = options.OptionsPage;
  var ArrayDataModel = lbm.ui.ArrayDataModel;

  // State variables.
  var syncEnabled = false;
  var syncSetupCompleted = false;

  /**
   * Encapsulated handling of personal options page.
   * @constructor
   */
  function PersonalOptions() {
    OptionsPage.call(this, 'personal',
                     templateData.personalPageTabTitle,
                     'personal-page');
    if (lbm.isChromeOS) {
      // Email of the currently logged in user (or |kGuestUser|).
      this.userEmail_ = localStrings.getString('userEmail');
    }
  }

  lbm.addSingletonGetter(PersonalOptions);

  PersonalOptions.prototype = {
    // Inherit PersonalOptions from OptionsPage.
    __proto__: options.OptionsPage.prototype,

    // Initialize PersonalOptions page.
    initializePage: function() {
      // Call base class implementation to start preference initialization.
      OptionsPage.prototype.initializePage.call(this);

      var self = this;

      // Sync.
      $('sync-action-link').onclick = function(event) {
        SyncSetupOverlay.showErrorUI();
      };
      $('start-stop-sync').onclick = function(event) {
        if (self.syncSetupCompleted)
          SyncSetupOverlay.showStopSyncingUI();
        else
          SyncSetupOverlay.showSetupUI();
      };
      $('customize-sync').onclick = function(event) {
        SyncSetupOverlay.showSetupUI();
      };

      // Profiles.
      var profilesList = $('profiles-list');
      options.personal_options.ProfileList.decorate(profilesList);
      profilesList.autoExpands = true;

      profilesList.onchange = function(event) {
        var selectedProfile = profilesList.selectedItem;
        var hasSelection = selectedProfile != null;
        $('profiles-manage').disabled = !hasSelection;
        $('profiles-delete').disabled = !hasSelection;
      };
      $('profiles-create').onclick = function(event) {
        chrome.send('createProfile');
      };
      $('profiles-manage').onclick = function(event) {
        var selectedProfile = self.getSelectedProfileItem_();
        if (selectedProfile)
          ManageProfileOverlay.showManageDialog(selectedProfile);
      };
      $('profiles-delete').onclick = function(event) {
        var selectedProfile = self.getSelectedProfileItem_();
        if (selectedProfile)
          ManageProfileOverlay.showDeleteDialog(selectedProfile);
      };

      // Passwords.
      $('manage-passwords').onclick = function(event) {
        OptionsPage.navigateToPage('passwords');
        OptionsPage.showTab($('passwords-nav-tab'));
        chrome.send('coreOptionsUserMetricsAction',
            ['Options_ShowPasswordManager']);
      };

      // Autofill.
      $('autofill-settings').onclick = function(event) {
        OptionsPage.navigateToPage('autofill');
        chrome.send('coreOptionsUserMetricsAction',
            ['Options_ShowAutofillSettings']);
      };

      // Appearance.
      $('themes-reset').onclick = function(event) {
        chrome.send('themesReset');
      };

      if (!lbm.isChromeOS) {
        $('import-data').onclick = function(event) {
          // Make sure that any previous import success message is hidden, and
          // we're showing the UI to import further data.
          $('import-data-configure').hidden = false;
          $('import-data-success').hidden = true;
          OptionsPage.navigateToPage('importData');
          chrome.send('coreOptionsUserMetricsAction', ['Import_ShowDlg']);
        };

        if ($('themes-GTK-button')) {
          $('themes-GTK-button').onclick = function(event) {
            chrome.send('themesSetGTK');
          };
        }
      } else {
        $('change-picture-button').onclick = function(event) {
          OptionsPage.navigateToPage('changePicture');
        };
        this.updateAccountPicture_();

        if (lbm.commandLine.options['--bwsi']) {
          // Disable the screen lock checkbox and change-picture-button in
          // guest mode.
          $('enable-screen-lock').disabled = true;
          $('change-picture-button').disabled = true;
        }
      }

      if (PersonalOptions.disablePasswordManagement()) {
        // Disable the Password Manager in guest mode.
        $('passwords-offersave').disabled = true;
        $('passwords-neversave').disabled = true;
        $('passwords-offersave').value = false;
        $('passwords-neversave').value = true;
        $('manage-passwords').disabled = true;
      }

      if (PersonalOptions.disableAutofillManagement()) {
        $('autofill-settings').disabled = true;

        // Disable and turn off autofill.
        var autofillEnabled = $('autofill-enabled');
        autofillEnabled.disabled = true;
        autofillEnabled.checked = false;
        lbm.dispatchSimpleEvent(autofillEnabled, 'change');
      }
    },

    setSyncEnabled_: function(enabled) {
      this.syncEnabled = enabled;
    },

    setAutoLoginVisible_ : function(visible) {
      $('enable-auto-login-checkbox').hidden = !visible;
    },

    setSyncSetupCompleted_: function(completed) {
      this.syncSetupCompleted = completed;
      $('customize-sync').hidden = !completed;
    },

    setSyncStatus_: function(status) {
      var statusSet = status != '';
      $('sync-overview').hidden = statusSet;
      $('sync-status').hidden = !statusSet;
      $('sync-status-text').innerHTML = status;
    },

    setSyncStatusErrorVisible_: function(visible) {
      visible ? $('sync-status').classList.add('sync-error') :
                $('sync-status').classList.remove('sync-error');
    },

    setSyncActionLinkEnabled_: function(enabled) {
      $('sync-action-link').disabled = !enabled;
    },

    setSyncActionLinkLabel_: function(status) {
      $('sync-action-link').textContent = status;

      // link-button does is not zero-area when the contents of the button are
      // empty, so explicitly hide the element.
      $('sync-action-link').hidden = !status.length;
    },

    /**
     * Display or hide the profiles section of the page. This is used for
     * multi-profile settings.
     * @param {boolean} visible True to show the section.
     * @private
     */
    setProfilesSectionVisible_: function(visible) {
      $('profiles-section').hidden = !visible;
    },

    /**
     * Get the selected profile item from the profile list. This also works
     * correctly if the list is not displayed.
     * @return {Object} the profile item object, or null if nothing is selected.
     * @private
     */
    getSelectedProfileItem_: function() {
      var profilesList = $('profiles-list');
      if (profilesList.hidden) {
        if (profilesList.dataModel.length > 0)
          return profilesList.dataModel.item(0);
      } else {
        return profilesList.selectedItem;
      }
      return null;
    },

    /**
     * Display the correct dialog layout, depending on how many profiles are
     * available.
     * @param {number} numProfiles The number of profiles to display.
     */
    setProfileViewSingle_: function(numProfiles) {
      $('profiles-list').hidden = numProfiles <= 1;
      $('profiles-manage').hidden = numProfiles <= 1;
      $('profiles-delete').hidden = numProfiles <= 1;
    },

    /**
     * Adds all |profiles| to the list.
     * @param {Array.<Object>} An array of profile info objects.
     *     each object is of the form:
     *       profileInfo = {
     *         name: "Profile Name",
     *         iconURL: "chrome://path/to/icon/image",
     *         filePath: "/path/to/profile/data/on/disk",
     *         isCurrentProfile: false
     *       };
     */
    setProfilesInfo_: function(profiles) {
      this.setProfileViewSingle_(profiles.length);
      // add it to the list, even if the list is hidden so we can access it
      // later.
      $('profiles-list').dataModel = new ArrayDataModel(profiles);
    },

    setStartStopButtonVisible_: function(visible) {
      $('start-stop-sync').hidden = !visible;
    },

    setStartStopButtonEnabled_: function(enabled) {
      $('start-stop-sync').disabled = !enabled;
    },

    setStartStopButtonLabel_: function(label) {
      $('start-stop-sync').textContent = label;
    },

    setGtkThemeButtonEnabled_: function(enabled) {
      if (!lbm.isChromeOS && navigator.platform.match(/linux|BSD/i)) {
        $('themes-GTK-button').disabled = !enabled;
      }
    },

    setThemesResetButtonEnabled_: function(enabled) {
      $('themes-reset').disabled = !enabled;
    },

    hideSyncSection_: function() {
      $('sync-section').hidden = true;
    },

    /**
     * (Re)loads IMG element with current user account picture.
     */
    updateAccountPicture_: function() {
      $('account-picture').src =
          'chrome://userimage/' + this.userEmail_ +
          '?id=' + (new Date()).getTime();
    },
  };

  /**
   * Returns whether the user should be able to manage (view and edit) their
   * stored passwords. Password management is disabled in guest mode.
   * @return {boolean} True if password management should be disabled.
   */
  PersonalOptions.disablePasswordManagement = function() {
    return lbm.commandLine.options['--bwsi'];
  };

  /**
   * Returns whether the user should be able to manage autofill settings.
   * @return {boolean} True if password management should be disabled.
   */
  PersonalOptions.disableAutofillManagement = function() {
    return lbm.commandLine.options['--bwsi'];
  };

  if (lbm.isChromeOS) {
    /**
     * Returns email of the user logged in (ChromeOS only).
     * @return {string} user email.
     */
    PersonalOptions.getLoggedInUserEmail = function() {
      return PersonalOptions.getInstance().userEmail_;
    };
  }

  // Forward public APIs to private implementations.
  [
    'hideSyncSection',
    'setAutoLoginVisible',
    'setGtkThemeButtonEnabled',
    'setProfilesInfo',
    'setProfilesSectionVisible',
    'setStartStopButtonEnabled',
    'setStartStopButtonLabel',
    'setStartStopButtonVisible',
    'setSyncActionLinkEnabled',
    'setSyncActionLinkLabel',
    'setSyncEnabled',
    'setSyncSetupCompleted',
    'setSyncStatus',
    'setSyncStatusErrorVisible',
    'setThemesResetButtonEnabled',
    'updateAccountPicture',
  ].forEach(function(name) {
    PersonalOptions[name] = function(value) {
      PersonalOptions.getInstance()[name + '_'](value);
    };
  });

  // Export
  return {
    PersonalOptions: PersonalOptions
  };

});

// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options.personal_options', function() {
  const DeletableItem = options.DeletableItem;
  const DeletableItemList = options.DeletableItemList;
  const ListSingleSelectionModel = lbm.ui.ListSingleSelectionModel;

  var localStrings = new LocalStrings();

  /**
   * Creates a new profile list item.
   * @param {Object} profileInfo The profile this item respresents.
   * @constructor
   * @extends {lbm.ui.DeletableItem}
   */
  function ProfileListItem(profileInfo) {
    var el = lbm.doc.createElement('div');
    el.profileInfo_ = profileInfo;
    ProfileListItem.decorate(el);
    return el;
  }

  /**
   * Decorates an element as a profile list item.
   * @param {!HTMLElement} el The element to decorate.
   */
  ProfileListItem.decorate = function(el) {
    el.__proto__ = ProfileListItem.prototype;
    el.decorate();
  };

  ProfileListItem.prototype = {
    __proto__: DeletableItem.prototype,

    /**
      * Get the filepath for this profile list item.
      * @return the file path of this item.
      */
    get profilePath() {
      return this.profileInfo_.filePath;
    },

    /** @inheritDoc */
    decorate: function() {
      DeletableItem.prototype.decorate.call(this);

      var profileInfo = this.profileInfo_;

      var nameEl = this.contentElement;
      nameEl.className = 'profile-item';
      if (profileInfo.isCurrentProfile)
        nameEl.classList.add('profile-item-current');

      var displayName = profileInfo.name;
      if (profileInfo.isCurrentProfile)
        displayName = localStrings.getStringF(
            'profilesListItemCurrent',
            profileInfo.name)
      nameEl.textContent = displayName;
    },
  };

  var ProfileList = lbm.ui.define('list');

  ProfileList.prototype = {
    __proto__: DeletableItemList.prototype,

    /** @inheritDoc */
    decorate: function() {
      DeletableItemList.prototype.decorate.call(this);
      this.selectionModel = new ListSingleSelectionModel();
    },

    /** @inheritDoc */
    createItem: function(pageInfo) {
      var item = new ProfileListItem(pageInfo);
      return item;
    },

    /** @inheritDoc */
    deleteItemAtIndex: function(index) {
      ManageProfileOverlay.showDeleteDialog(this.dataModel.item(index));
    },
  };

  return {
    ProfileList: ProfileList
  };
});


// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {
  const ListItem = lbm.ui.ListItem;
  const Grid = lbm.ui.Grid;
  const ListSingleSelectionModel = lbm.ui.ListSingleSelectionModel;

  /**
   * Creates a new profile icon grid item.
   * @param {Object} iconURL The profile icon URL.
   * @constructor
   * @extends {lbm.ui.GridItem}
   */
  function ProfilesIconGridItem(iconURL) {
    var el = lbm.doc.createElement('span');
    el.iconURL_ = iconURL;
    ProfilesIconGridItem.decorate(el);
    return el;
  }

  /**
   * Decorates an element as a profile grid item.
   * @param {!HTMLElement} el The element to decorate.
   */
  ProfilesIconGridItem.decorate = function(el) {
    el.__proto__ = ProfilesIconGridItem.prototype;
    el.decorate();
  };

  ProfilesIconGridItem.prototype = {
    __proto__: ListItem.prototype,

    /** @inheritDoc */
    decorate: function() {
      ListItem.prototype.decorate.call(this);
      var imageEl = lbm.doc.createElement('img');
      imageEl.className = 'profile-icon';
      imageEl.src = this.iconURL_;
      this.appendChild(imageEl);

      this.className = 'profile-icon-grid-item';
    },
  };

  var ProfilesIconGrid = lbm.ui.define('grid');

  ProfilesIconGrid.prototype = {
    __proto__: Grid.prototype,

    /** @inheritDoc */
    decorate: function() {
      Grid.prototype.decorate.call(this);
      this.selectionModel = new ListSingleSelectionModel();
    },

    /** @inheritDoc */
    createItem: function(iconURL) {
      return new ProfilesIconGridItem(iconURL);
    },
  };

  return {
    ProfilesIconGrid: ProfilesIconGrid
  };
});


// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {
  const OptionsPage = options.OptionsPage;
  const ArrayDataModel = lbm.ui.ArrayDataModel;

  /**
   * Encapsulated handling of search engine management page.
   * @constructor
   */
  function SearchEngineManager() {
    this.activeNavTab = null;
    OptionsPage.call(this, 'searchEngines',
                     templateData.searchEngineManagerPageTabTitle,
                     'search-engine-manager-page');
  }

  lbm.addSingletonGetter(SearchEngineManager);

  SearchEngineManager.prototype = {
    __proto__: OptionsPage.prototype,

    /**
     * List for default search engine options.
     * @private
     */
    defaultsList_: null,

    /**
     * List for other search engine options.
     * @private
     */
    othersList_: null,

    /**
     * List for extension keywords.
     * @private
    extensionList_ : null,

    /** inheritDoc */
    initializePage: function() {
      OptionsPage.prototype.initializePage.call(this);

      this.defaultsList_ = $('default-search-engine-list');
      this.setUpList_(this.defaultsList_);

      this.othersList_ = $('other-search-engine-list');
      this.setUpList_(this.othersList_);

      this.extensionList_ = $('extension-keyword-list');
      this.setUpList_(this.extensionList_);
    },

    /**
     * Sets up the given list as a search engine list
     * @param {List} list The list to set up.
     * @private
     */
    setUpList_: function(list) {
      options.search_engines.SearchEngineList.decorate(list);
      list.autoExpands = true;
    },

    /**
     * Updates the search engine list with the given entries.
     * @private
     * @param {Array} defaultEngines List of possible default search engines.
     * @param {Array} otherEngines List of other search engines.
     * @param {Array} keywords List of keywords from extensions.
     */
    updateSearchEngineList_: function(defaultEngines, otherEngines, keywords) {
      this.defaultsList_.dataModel = new ArrayDataModel(defaultEngines);

      otherEngines = otherEngines.map(function(x) {
        return [x, x['name'].toLocaleLowerCase()];
      }).sort(function(a,b){
        return a[1].localeCompare(b[1]);
      }).map(function(x){
        return x[0];
      });

      var othersModel = new ArrayDataModel(otherEngines);
      // Add a "new engine" row.
      othersModel.push({
        'modelIndex': '-1',
        'canBeEdited': true
      });
      this.othersList_.dataModel = othersModel;

      if (keywords.length > 0) {
        $('extension-keyword-div').hidden = false;
        var extensionsModel = new ArrayDataModel(keywords);
        this.extensionList_.dataModel = extensionsModel;
      } else {
        $('extension-keyword-div').hidden = true;
      }
    },
  };

  SearchEngineManager.updateSearchEngineList = function(defaultEngines,
                                                        otherEngines,
                                                        keywords) {
    SearchEngineManager.getInstance().updateSearchEngineList_(defaultEngines,
                                                              otherEngines,
                                                              keywords);
  };

  SearchEngineManager.validityCheckCallback = function(validity, modelIndex) {
    // Forward to both lists; the one without a matching modelIndex will ignore
    // it.
    SearchEngineManager.getInstance().defaultsList_.validationComplete(
        validity, modelIndex);
    SearchEngineManager.getInstance().othersList_.validationComplete(
        validity, modelIndex);
  };

  // Export
  return {
    SearchEngineManager: SearchEngineManager
  };

});


// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options.search_engines', function() {
  const InlineEditableItemList = options.InlineEditableItemList;
  const InlineEditableItem = options.InlineEditableItem;
  const ListSelectionController = lbm.ui.ListSelectionController;

  /**
   * Creates a new search engine list item.
   * @param {Object} searchEnigne The search engine this represents.
   * @constructor
   * @extends {lbm.ui.ListItem}
   */
  function SearchEngineListItem(searchEngine) {
    var el = lbm.doc.createElement('div');
    el.searchEngine_ = searchEngine;
    SearchEngineListItem.decorate(el);
    return el;
  }

  /**
   * Decorates an element as a search engine list item.
   * @param {!HTMLElement} el The element to decorate.
   */
  SearchEngineListItem.decorate = function(el) {
    el.__proto__ = SearchEngineListItem.prototype;
    el.decorate();
  };

  SearchEngineListItem.prototype = {
    __proto__: InlineEditableItem.prototype,

    /**
     * Input field for editing the engine name.
     * @type {HTMLElement}
     * @private
     */
    nameField_: null,

    /**
     * Input field for editing the engine keyword.
     * @type {HTMLElement}
     * @private
     */
    keywordField_: null,

    /**
     * Input field for editing the engine url.
     * @type {HTMLElement}
     * @private
     */
    urlField_: null,

    /**
     * Whether or not an input validation request is currently outstanding.
     * @type {boolean}
     * @private
     */
    waitingForValidation_: false,

    /**
     * Whether or not the current set of input is known to be valid.
     * @type {boolean}
     * @private
     */
    currentlyValid_: false,

    /** @inheritDoc */
    decorate: function() {
      InlineEditableItem.prototype.decorate.call(this);

      var engine = this.searchEngine_;

      if (engine['modelIndex'] == '-1') {
        this.isPlaceholder = true;
        engine['name'] = '';
        engine['keyword'] = '';
        engine['url'] = '';
      }

      this.currentlyValid_ = !this.isPlaceholder;

      if (engine['default'])
        this.classList.add('default');

      this.deletable = engine['canBeRemoved'];

      // Construct the name column.
      var nameColEl = this.ownerDocument.createElement('div');
      nameColEl.className = 'name-column';
      nameColEl.classList.add('weakrtl');
      this.contentElement.appendChild(nameColEl);

      // Add the favicon.
      var faviconDivEl = this.ownerDocument.createElement('div');
      faviconDivEl.className = 'favicon';
      var imgEl = this.ownerDocument.createElement('img');
      imgEl.src = 'chrome://favicon/iconurl/' + engine['iconURL'];
      faviconDivEl.appendChild(imgEl);
      nameColEl.appendChild(faviconDivEl);

      var nameEl = this.createEditableTextCell(engine['displayName']);
      nameEl.classList.add('weakrtl');
      nameColEl.appendChild(nameEl);

      // Then the keyword column.
      var keywordEl = this.createEditableTextCell(engine['keyword']);
      keywordEl.className = 'keyword-column';
      keywordEl.classList.add('weakrtl');
      this.contentElement.appendChild(keywordEl);

      // And the URL column.
      var urlEl = this.createEditableTextCell(engine['url']);
      var urlWithButtonEl = this.ownerDocument.createElement('div');
      urlWithButtonEl.appendChild(urlEl);
      urlWithButtonEl.className = 'url-column';
      urlWithButtonEl.classList.add('weakrtl');
      this.contentElement.appendChild(urlWithButtonEl);
      // Add the Make Default button. Temporary until drag-and-drop re-ordering
      // is implemented. When this is removed, remove the extra div above.
      if (engine['canBeDefault']) {
        var makeDefaultButtonEl = this.ownerDocument.createElement('button');
        makeDefaultButtonEl.className = "raw-button";
        makeDefaultButtonEl.textContent =
            templateData.makeDefaultSearchEngineButton;
        makeDefaultButtonEl.onclick = function(e) {
          chrome.send('managerSetDefaultSearchEngine', [engine['modelIndex']]);
        };
        // Don't select the row when clicking the button.
        makeDefaultButtonEl.onmousedown = function(e) {
          e.stopPropagation();
        };
        urlWithButtonEl.appendChild(makeDefaultButtonEl);
      }

      // Do final adjustment to the input fields.
      this.nameField_ = nameEl.querySelector('input');
      // The editable field uses the raw name, not the display name.
      this.nameField_.value = engine['name'];
      this.keywordField_ = keywordEl.querySelector('input');
      this.urlField_ = urlEl.querySelector('input');

      if (engine['urlLocked'])
        this.urlField_.disabled = true;

      if (this.isPlaceholder) {
        this.nameField_.placeholder =
            localStrings.getString('searchEngineTableNamePlaceholder');
        this.keywordField_.placeholder =
            localStrings.getString('searchEngineTableKeywordPlaceholder');
        this.urlField_.placeholder =
            localStrings.getString('searchEngineTableURLPlaceholder');
      }

      var fields = [ this.nameField_, this.keywordField_, this.urlField_ ];
        for (var i = 0; i < fields.length; i++) {
        fields[i].oninput = this.startFieldValidation_.bind(this);
      }

      // Listen for edit events.
      if (engine['canBeEdited']) {
        this.addEventListener('edit', this.onEditStarted_.bind(this));
        this.addEventListener('canceledit', this.onEditCancelled_.bind(this));
        this.addEventListener('commitedit', this.onEditCommitted_.bind(this));
      } else {
        this.editable = false;
      }
    },

    /** @inheritDoc */
    get currentInputIsValid() {
      return !this.waitingForValidation_ && this.currentlyValid_;
    },

    /** @inheritDoc */
    get hasBeenEdited() {
      var engine = this.searchEngine_;
      return this.nameField_.value != engine['name'] ||
             this.keywordField_.value != engine['keyword'] ||
             this.urlField_.value != engine['url'];
    },

    /**
     * Called when entering edit mode; starts an edit session in the model.
     * @param {Event} e The edit event.
     * @private
     */
    onEditStarted_: function(e) {
      var editIndex = this.searchEngine_['modelIndex'];
      chrome.send('editSearchEngine', [String(editIndex)]);
      this.startFieldValidation_();
    },

    /**
     * Called when committing an edit; updates the model.
     * @param {Event} e The end event.
     * @private
     */
    onEditCommitted_: function(e) {
      chrome.send('searchEngineEditCompleted', this.getInputFieldValues_());
    },

    /**
     * Called when cancelling an edit; informs the model and resets the control
     * states.
     * @param {Event} e The cancel event.
     * @private
     */
    onEditCancelled_: function() {
      chrome.send('searchEngineEditCancelled');

      // The name field has been automatically set to match the display name,
      // but it should use the raw name instead.
      this.nameField_.value = this.searchEngine_['name'];
      this.currentlyValid_ = !this.isPlaceholder;
    },

    /**
     * Returns the input field values as an array suitable for passing to
     * chrome.send. The order of the array is important.
     * @private
     * @return {array} The current input field values.
     */
    getInputFieldValues_: function() {
      return [ this.nameField_.value,
               this.keywordField_.value,
               this.urlField_.value ];
    },

    /**
     * Begins the process of asynchronously validing the input fields.
     * @private
     */
    startFieldValidation_: function() {
      this.waitingForValidation_ = true;
      var args = this.getInputFieldValues_();
      args.push(this.searchEngine_['modelIndex']);
      chrome.send('checkSearchEngineInfoValidity', args);
    },

    /**
     * Callback for the completion of an input validition check.
     * @param {Object} validity A dictionary of validitation results.
     */
    validationComplete: function(validity) {
      this.waitingForValidation_ = false;
      // TODO(stuartmorgan): Implement the full validation UI with
      // checkmark/exclamation mark icons and tooltips showing the errors.
      if (validity['name']) {
        this.nameField_.setCustomValidity('');
      } else {
        this.nameField_.setCustomValidity(
            templateData.editSearchEngineInvalidTitleToolTip);
      }

      if (validity['keyword']) {
        this.keywordField_.setCustomValidity('');
      } else {
        this.keywordField_.setCustomValidity(
            templateData.editSearchEngineInvalidKeywordToolTip);
      }

      if (validity['url']) {
        this.urlField_.setCustomValidity('');
      } else {
        this.urlField_.setCustomValidity(
            templateData.editSearchEngineInvalidURLToolTip);
      }

      this.currentlyValid_ = validity['name'] && validity['keyword'] &&
          validity['url'];
    },
  };

  var SearchEngineList = lbm.ui.define('list');

  SearchEngineList.prototype = {
    __proto__: InlineEditableItemList.prototype,

    /** @inheritDoc */
    createItem: function(searchEngine) {
      return new SearchEngineListItem(searchEngine);
    },

    /** @inheritDoc */
    deleteItemAtIndex: function(index) {
      var modelIndex = this.dataModel.item(index)['modelIndex']
      chrome.send('removeSearchEngine', [String(modelIndex)]);
    },

    /**
     * Passes the results of an input validation check to the requesting row
     * if it's still being edited.
     * @param {number} modelIndex The model index of the item that was checked.
     * @param {Object} validity A dictionary of validitation results.
     */
    validationComplete: function(validity, modelIndex) {
      // If it's not still being edited, it no longer matters.
      var currentSelection = this.selectedItem;
      if (!currentSelection)
        return;
      var listItem = this.getListItem(currentSelection);
      if (listItem.editing && currentSelection['modelIndex'] == modelIndex)
        listItem.validationComplete(validity);
    },
  };

  // Export
  return {
    SearchEngineList: SearchEngineList
  };

});


// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {
  const OptionsPage = options.OptionsPage;

  /**
   * Encapsulated handling of a search bubble.
   * @constructor
   */
  function SearchBubble(text) {
    var el = lbm.doc.createElement('div');
    SearchBubble.decorate(el);
    el.textContent = text;
    return el;
  }

  SearchBubble.decorate = function(el) {
    el.__proto__ = SearchBubble.prototype;
    el.decorate();
  };

  SearchBubble.prototype = {
    __proto__: HTMLDivElement.prototype,

    decorate: function() {
      this.className = 'search-bubble';

      // We create a timer to periodically update the position of the bubbles.
      // While this isn't all that desirable, it's the only sure-fire way of
      // making sure the bubbles stay in the correct location as sections
      // may dynamically change size at any time.
      var self = this;
      this.intervalId = setInterval(this.updatePosition.bind(this), 250);
    },

  /**
   * Attach the bubble to the element.
   */
    attachTo: function(element) {
      var parent = element.parentElement;
      if (!parent)
        return;
      if (parent.tagName == 'TD') {
        // To make absolute positioning work inside a table cell we need
        // to wrap the bubble div into another div with position:relative.
        // This only works properly if the element is the first child of the
        // table cell which is true for all options pages.
        this.wrapper = lbm.doc.createElement('div');
        this.wrapper.className = 'search-bubble-wrapper';
        this.wrapper.appendChild(this);
        parent.insertBefore(this.wrapper, element);
      } else {
        parent.insertBefore(this, element);
      }
    },

    /**
     * Clear the interval timer and remove the element from the page.
     */
    dispose: function() {
      clearInterval(this.intervalId);

      var child = this.wrapper || this;
      var parent = child.parentNode;
      if (parent)
        parent.removeChild(child);
    },

    /**
     * Update the position of the bubble.  Called at creation time and then
     * periodically while the bubble remains visible.
     */
    updatePosition: function() {
      // This bubble is 'owned' by the next sibling.
      var owner = (this.wrapper || this).nextSibling;

      // If there isn't an offset parent, we have nothing to do.
      if (!owner.offsetParent)
        return;

      // Position the bubble below the location of the owner.
      var left = owner.offsetLeft + owner.offsetWidth / 2 -
          this.offsetWidth / 2;
      var top = owner.offsetTop + owner.offsetHeight;

      // Update the position in the CSS.  Cache the last values for
      // best performance.
      if (left != this.lastLeft) {
        this.style.left = left + 'px';
        this.lastLeft = left;
      }
      if (top != this.lastTop) {
        this.style.top = top + 'px';
        this.lastTop = top;
      }
    }
  }

  /**
   * Encapsulated handling of the search page.
   * @constructor
   */
  function SearchPage() {
    OptionsPage.call(this, 'search', templateData.searchPageTabTitle,
        'searchPage');
    this.searchActive = false;
  }

  lbm.addSingletonGetter(SearchPage);

  SearchPage.prototype = {
    // Inherit SearchPage from OptionsPage.
    __proto__: OptionsPage.prototype,

    /**
     * Initialize the page.
     */
    initializePage: function() {
      // Call base class implementation to start preference initialization.
      OptionsPage.prototype.initializePage.call(this);

      var self = this;

      // Create a search field element.
      var searchField = document.createElement('input');
      searchField.id = 'search-field';
      searchField.type = 'search';
      searchField.incremental = true;
      searchField.placeholder = localStrings.getString('searchPlaceholder');
      searchField.setAttribute('aria-label', searchField.placeholder);
      this.searchField = searchField;

      // Replace the contents of the navigation tab with the search field.
      self.tab.textContent = '';
      self.tab.appendChild(searchField);
      self.tab.onclick = self.tab.onkeydown = self.tab.onkeypress = undefined;
      self.tab.tabIndex = -1;
      self.tab.setAttribute('role', '');

      // Don't allow the focus on the search navbar. http://crbug.com/77989
      self.tab.onfocus = self.tab.blur;

      // Handle search events. (No need to throttle, WebKit's search field
      // will do that automatically.)
      searchField.onsearch = function(e) {
        self.setSearchText_(SearchPage.canonicalizeQuery(this.value));
      };

      // We update the history stack every time the search field blurs. This way
      // we get a history entry for each search, roughly, but not each letter
      // typed.
      searchField.onblur = function(e) {
        var query = SearchPage.canonicalizeQuery(searchField.value);
        if (!query)
          return;

        // Don't push the same page onto the history stack more than once (if
        // the user clicks in the search field and away several times).
        var currentHash = location.hash;
        var newHash = '#' + escape(query);
        if (currentHash == newHash)
          return;

        // If there is no hash on the current URL, the history entry has no
        // search query. Replace the history entry with no search with an entry
        // that does have a search. Otherwise, add it onto the history stack.
        var historyFunction = currentHash ? window.history.pushState :
                                            window.history.replaceState;
        historyFunction.call(
            window.history,
            {pageName: self.name},
            self.title,
            '/' + self.name + newHash);
      };

      // Install handler for key presses.
      document.addEventListener('keydown',
                                this.keyDownEventHandler_.bind(this));

      // Focus the search field by default.
      searchField.focus();
    },

    /**
     * @inheritDoc
     */
    get sticky() {
      return true;
    },

    /**
     * Called after this page has shown.
     */
    didShowPage: function() {
      // This method is called by the Options page after all pages have
      // had their visibilty attribute set.  At this point we can perform the
      // search specific DOM manipulation.
      this.setSearchActive_(true);
    },

    /**
     * Called before this page will be hidden.
     */
    willHidePage: function() {
      // This method is called by the Options page before all pages have
      // their visibilty attribute set.  Before that happens, we need to
      // undo the search specific DOM manipulation that was performed in
      // didShowPage.
      this.setSearchActive_(false);
    },

    /**
     * Update the UI to reflect whether we are in a search state.
     * @param {boolean} active True if we are on the search page.
     * @private
     */
    setSearchActive_: function(active) {
      // It's fine to exit if search wasn't active and we're not going to
      // activate it now.
      if (!this.searchActive_ && !active)
        return;

      this.searchActive_ = active;

      if (active) {
        var hash = location.hash;
        if (hash)
          this.searchField.value = unescape(hash.slice(1));
      } else {
        // Just wipe out any active search text since it's no longer relevant.
        this.searchField.value = '';
      }

      var pagesToSearch = this.getSearchablePages_();
      for (var key in pagesToSearch) {
        var page = pagesToSearch[key];

        if (!active)
          page.visible = false;

        // Update the visible state of all top-level elements that are not
        // sections (ie titles, button strips).  We do this before changing
        // the page visibility to avoid excessive re-draw.
        for (var i = 0, childDiv; childDiv = page.pageDiv.children[i]; i++) {
          if (childDiv.classList.contains('displaytable')) {
            childDiv.setAttribute('searching', active ? 'true' : 'false');
            for (var j = 0, subDiv; subDiv = childDiv.children[j]; j++) {
              if (active) {
                if (subDiv.tagName != 'SECTION')
                  subDiv.classList.add('search-hidden');
              } else {
                subDiv.classList.remove('search-hidden');
              }
            }
          } else {
            if (active)
              childDiv.classList.add('search-hidden');
            else
              childDiv.classList.remove('search-hidden');
          }
        }

        if (active) {
          // When search is active, remove the 'hidden' tag.  This tag may have
          // been added by the OptionsPage.
          page.pageDiv.hidden = false;
        }
      }

      if (active) {
        this.setSearchText_(this.searchField.value);
      } else {
        // After hiding all page content, remove any search results.
        this.unhighlightMatches_();
        this.removeSearchBubbles_();
      }
    },

    /**
     * Set the current search criteria.
     * @param {string} text Search text.
     * @private
     */
    setSearchText_: function(text) {
      // Toggle the search page if necessary.
      if (text.length) {
        if (!this.searchActive_)
          OptionsPage.navigateToPage(this.name);
      } else {
        if (this.searchActive_)
          OptionsPage.showDefaultPage();
        return;
      }

      var foundMatches = false;
      var bubbleControls = [];

      // Remove any prior search results.
      this.unhighlightMatches_();
      this.removeSearchBubbles_();

      // Generate search text by applying lowercase and escaping any characters
      // that would be problematic for regular expressions.
      var searchText =
          text.toLowerCase().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

      // Generate a regular expression and replace string for hilighting
      // search terms.
      var regEx = new RegExp('(' + searchText + ')', 'ig');
      var replaceString = '<span class="search-highlighted">$1</span>';

      // Initialize all sections.  If the search string matches a title page,
      // show sections for that page.
      var page, pageMatch, childDiv, length;
      var pagesToSearch = this.getSearchablePages_();
      for (var key in pagesToSearch) {
        page = pagesToSearch[key];
        pageMatch = false;
        if (searchText.length) {
          pageMatch = this.performReplace_(regEx, replaceString, page.tab);
        }
        if (pageMatch)
          foundMatches = true;
        var elements = page.pageDiv.querySelectorAll('.displaytable > section');
        for (var i = 0, node; node = elements[i]; i++) {
          if (pageMatch)
            node.classList.remove('search-hidden');
          else
            node.classList.add('search-hidden');
        }
      }

      if (searchText.length) {
        // Search all top-level sections for anchored string matches.
        for (var key in pagesToSearch) {
          page = pagesToSearch[key];
          var elements =
              page.pageDiv.querySelectorAll('.displaytable > section');
          for (var i = 0, node; node = elements[i]; i++) {
            if (this.performReplace_(regEx, replaceString, node)) {
              node.classList.remove('search-hidden');
              foundMatches = true;
            }
          }
        }

        // Search all sub-pages, generating an array of top-level sections that
        // we need to make visible.
        var subPagesToSearch = this.getSearchableSubPages_();
        var control, node;
        for (var key in subPagesToSearch) {
          page = subPagesToSearch[key];
          if (this.performReplace_(regEx, replaceString, page.pageDiv)) {
            // Reveal the section for this search result.
            section = page.associatedSection;
            if (section)
              section.classList.remove('search-hidden');

            // Identify any controls that should have bubbles.
            var controls = page.associatedControls;
            if (controls) {
              length = controls.length;
              for (var i = 0; i < length; i++)
                bubbleControls.push(controls[i]);
            }

            foundMatches = true;
          }
        }
      }

      // Configure elements on the search results page based on search results.
      if (foundMatches)
        $('searchPageNoMatches').classList.add('search-hidden');
      else
        $('searchPageNoMatches').classList.remove('search-hidden');

      // Create search balloons for sub-page results.
      length = bubbleControls.length;
      for (var i = 0; i < length; i++)
        this.createSearchBubble_(bubbleControls[i], text);
    },

    /**
     * Performs a string replacement based on a regex and replace string.
     * @param {RegEx} regex A regular expression for finding search matches.
     * @param {String} replace A string to apply the replace operation.
     * @param {Element} element An HTML container element.
     * @returns {Boolean} true if the element was changed.
     * @private
     */
    performReplace_: function(regex, replace, element) {
      var found = false;
      var div, child, tmp;

      // Walk the tree, searching each TEXT node.
      var walker = document.createTreeWalker(element,
                                             NodeFilter.SHOW_TEXT,
                                             null,
                                             false);
      var node = walker.nextNode();
      while (node) {
        // Perform a search and replace on the text node value.
        var newValue = node.nodeValue.replace(regex, replace);
        if (newValue != node.nodeValue) {
          // The text node has changed so that means we found at least one
          // match.
          found = true;

          // Create a temporary div element and set the innerHTML to the new
          // value.
          div = document.createElement('div');
          div.innerHTML = newValue;

          // Insert all the child nodes of the temporary div element into the
          // document, before the original node.
          child = div.firstChild;
          while (child = div.firstChild) {
            node.parentNode.insertBefore(child, node);
          };

          // Delete the old text node and advance the walker to the next
          // node.
          tmp = node;
          node = walker.nextNode();
          tmp.parentNode.removeChild(tmp);
        } else {
          node = walker.nextNode();
        }
      }

      return found;
    },

    /**
     * Removes all search highlight tags from the document.
     * @private
     */
    unhighlightMatches_: function() {
      // Find all search highlight elements.
      var elements = document.querySelectorAll('.search-highlighted');

      // For each element, remove the highlighting.
      var parent, i;
      for (var i = 0, node; node = elements[i]; i++) {
        parent = node.parentNode;

        // Replace the highlight element with the first child (the text node).
        parent.replaceChild(node.firstChild, node);

        // Normalize the parent so that multiple text nodes will be combined.
        parent.normalize();
      }
    },

    /**
     * Creates a search result bubble attached to an element.
     * @param {Element} element An HTML element, usually a button.
     * @param {string} text A string to show in the bubble.
     * @private
     */
    createSearchBubble_: function(element, text) {
      // avoid appending multiple bubbles to a button.
      var sibling = element.previousElementSibling;
      if (sibling && (sibling.classList.contains('search-bubble') ||
                      sibling.classList.contains('search-bubble-wrapper')))
        return;

      var parent = element.parentElement;
      if (parent) {
        var bubble = new SearchBubble(text);
        bubble.attachTo(element);
        bubble.updatePosition();
      }
    },

    /**
     * Removes all search match bubbles.
     * @private
     */
    removeSearchBubbles_: function() {
      var elements = document.querySelectorAll('.search-bubble');
      var length = elements.length;
      for (var i = 0; i < length; i++)
        elements[i].dispose();
    },

    /**
     * Builds a list of top-level pages to search.  Omits the search page and
     * all sub-pages.
     * @returns {Array} An array of pages to search.
     * @private
     */
    getSearchablePages_: function() {
      var name, page, pages = [];
      for (name in OptionsPage.registeredPages) {
        if (name != this.name) {
          page = OptionsPage.registeredPages[name];
          if (!page.parentPage)
            pages.push(page);
        }
      }
      return pages;
    },

    /**
     * Builds a list of sub-pages (and overlay pages) to search.  Ignore pages
     * that have no associated controls.
     * @returns {Array} An array of pages to search.
     * @private
     */
    getSearchableSubPages_: function() {
      var name, pageInfo, page, pages = [];
      for (name in OptionsPage.registeredPages) {
        page = OptionsPage.registeredPages[name];
        if (page.parentPage && page.associatedSection)
          pages.push(page);
      }
      for (name in OptionsPage.registeredOverlayPages) {
        page = OptionsPage.registeredOverlayPages[name];
        if (page.associatedSection && page.pageDiv != undefined)
          pages.push(page);
      }
      return pages;
    },

    /**
     * A function to handle key press events.
     * @return {Event} a keydown event.
     * @private
     */
    keyDownEventHandler_: function(event) {
      const ESCAPE_KEY_CODE = 27;
      const FORWARD_SLASH_KEY_CODE = 191;

      switch(event.keyCode) {
        case ESCAPE_KEY_CODE:
          if (event.target == this.searchField) {
            this.setSearchText_('');
            this.searchField.blur();
            event.stopPropagation();
            event.preventDefault();
          }
          break;
        case FORWARD_SLASH_KEY_CODE:
          if (!/INPUT|SELECT|BUTTON|TEXTAREA/.test(event.target.tagName) &&
              !event.ctrlKey && !event.altKey) {
            this.searchField.focus();
            event.stopPropagation();
            event.preventDefault();
          }
          break;
      }
    },
  };


   // * Standardizes a user-entered text query by removing extra whitespace.
   // * @param {string} The user-entered text.
   // * @return {string} The trimmed query.
  SearchPage.canonicalizeQuery = function(text) {
    // Trim beginning and ending whitespace.
    return text.replace(/^\s+|\s+$/g, '');
  };

  // Export
  return {
    SearchPage: SearchPage
  };

});

// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

lbm.define('options', function() {
  const OptionsPage = options.OptionsPage;

  // Variable to track if a captcha challenge was issued. If this gets set to
  // true, it stays that way until we are told about successful login from
  // the browser.  This means subsequent errors (like invalid password) are
  // rendered in the captcha state, which is basically identical except we
  // don't show the top error blurb "Error Signing in" or the "Create
  // account" link.
  var captchaChallengeActive_ = false;

  // True if the synced account uses a custom passphrase.
  var usePassphrase_ = false;

  /**
   * SyncSetupOverlay class
   * Encapsulated handling of the 'Sync Setup' overlay page.
   * @class
   */
  function SyncSetupOverlay() {
    OptionsPage.call(this, 'syncSetup',
                     templateData.syncSetupOverlayTitle,
                     'sync-setup-overlay');
  }

  lbm.addSingletonGetter(SyncSetupOverlay);

  SyncSetupOverlay.prototype = {
    __proto__: OptionsPage.prototype,

    /**
     * Initializes the page.
     */
    initializePage: function() {
      OptionsPage.prototype.initializePage.call(this);

      var acct_text = $('gaia-account-text');
      var translated_text = acct_text.textContent;
      var posGoogle = translated_text.indexOf('Google');
      if (posGoogle != -1) {
        var googleIsAtEndOfSentence = posGoogle != 0;

        if (googleIsAtEndOfSentence) {
          var logo_td = $('gaia-logo');
          logo_td.parentNode.appendChild(logo_td);
        }
        acct_text.textContent = translated_text.replace('Google','');
      }

      var self = this;
      $('gaia-login-form').onsubmit = function() {
        self.sendCredentialsAndClose_();
        return false;
      };
      $('google-option').onchange = $('explicit-option').onchange = function() {
        self.onPassphraseRadioChanged_();
      };
      $('choose-datatypes-cancel').onclick =
          $('sync-setup-cancel').onclick =
          $('confirm-everything-cancel').onclick =
          $('stop-syncing-cancel').onclick =  function() {
        self.closeOverlay_();
      };
      $('confirm-everything-ok').onclick = function() {
        self.sendConfiguration_();
      };
      $('stop-syncing-ok').onclick = function() {
        chrome.send('stopSyncing');
        self.closeOverlay_();
      };
    },

    showOverlay_: function() {
      OptionsPage.navigateToPage('syncSetup');
    },

    closeOverlay_: function() {
      OptionsPage.closeOverlay();
    },

    /** @inheritDoc */
    didShowPage: function() {
      chrome.send('SyncSetupAttachHandler');
    },

    /** @inheritDoc */
    didClosePage: function() {
      chrome.send('SyncSetupDidClosePage');
    },

    getEncryptionRadioCheckedValue_: function() {
      var f = $('choose-data-types-form');
      for (var i = 0; i < f.encrypt.length; ++i) {
        if (f.encrypt[i].checked) {
          return f.encrypt[i].value;
        }
      }

      return undefined;
    },

    getPassphraseRadioCheckedValue_: function() {
      var f = $('choose-data-types-form');
      for (var i = 0; i < f.option.length; ++i) {
        if (f.option[i].checked) {
          return f.option[i].value;
        }
      }

      return undefined;
    },

    disableEncryptionRadioGroup_: function() {
      var f = $('choose-data-types-form');
      for (var i = 0; i < f.encrypt.length; ++i)
        f.encrypt[i].disabled = true;
    },

    onPassphraseRadioChanged_: function() {
      var visible = this.getPassphraseRadioCheckedValue_() == "explicit";
      $('sync-custom-passphrase').hidden = !visible;
    },

    checkAllDataTypeCheckboxes_: function() {
      var checkboxes = document.getElementsByName("dataTypeCheckbox");
      for (var i = 0; i < checkboxes.length; i++) {
        // Only check the visible ones (since there's no way to uncheck
        // the invisible ones).
        if (checkboxes[i].parentElement.className == "sync-item-show") {
          checkboxes[i].checked = true;
        }
      }
    },

    setDataTypeCheckboxesEnabled_: function(enabled) {
      var checkboxes = document.getElementsByName("dataTypeCheckbox");
      var labels = document.getElementsByName("dataTypeLabel");
      for (var i = 0; i < checkboxes.length; i++) {
        checkboxes[i].disabled = !enabled;
        if (checkboxes[i].disabled) {
          labels[i].className = "sync-label-inactive";
        } else {
          labels[i].className = "sync-label-active";
        }
      }
    },

    setCheckboxesToKeepEverythingSynced_: function(value) {
      this.setDataTypeCheckboxesEnabled_(!value);
      if (value)
        this.checkAllDataTypeCheckboxes_();
    },

    // Returns true if at least one data type is enabled and no data types are
    // checked. (If all data type checkboxes are disabled, it's because "keep
    // everything synced" is checked.)
    noDataTypesChecked_: function() {
      var checkboxes = document.getElementsByName("dataTypeCheckbox");
      var atLeastOneChecked = false;
      var atLeastOneEnabled = false;
      for (var i = 0; i < checkboxes.length; i++) {
        if (!checkboxes[i].disabled &&
            checkboxes[i].parentElement.className == "sync-item-show") {
          atLeastOneEnabled = true;
          if (checkboxes[i].checked) {
            atLeastOneChecked = true;
          }
        }
      }

      return atLeastOneEnabled && !atLeastOneChecked;
    },

    checkPassphraseMatch_: function() {
      var emptyError = $('empty-error');
      var mismatchError = $('mismatch-error');
      emptyError.hidden = true;
      mismatchError.hidden = true;

      var f = $('choose-data-types-form');
      if (this.getPassphraseRadioCheckedValue_() != "explicit" ||
          $('google-option').disabled)
        return true;

      var customPassphrase = $('custom-passphrase');
      if (customPassphrase.value.length == 0) {
        emptyError.hidden = false;
        return false;
      }

      var confirmPassphrase = $('confirm-passphrase');
      if (confirmPassphrase.value != customPassphrase.value) {
        mismatchError.hidden = false;
        return false;
      }

      return true;
    },

    sendConfiguration_: function() {
      // Trying to submit, so hide previous errors.
      $('aborted-text').hidden = true;
      $('error-text').hidden = true;

      if (this.noDataTypesChecked_()) {
        $('error-text').hidden = false;
        return;
      }

      var f = $('choose-data-types-form');

      var syncAll = $('sync-select-datatypes').selectedIndex == 0;
      var encryptAllData = this.getEncryptionRadioCheckedValue_() == 'all';

      var usePassphrase;
      var customPassphrase;
      var googlePassphrase = false;
      if (!$('sync-existing-passphrase-container').hidden) {
        // If we were prompted for an existing passphrase, use it.
        customPassphrase = f.passphrase.value;
        usePassphrase = true;
        // If we were displaying the "enter your old google password" prompt,
        // then that means this is the user's google password.
        googlePassphrase = !$('google-passphrase-needed-body').hidden;
        // We allow an empty passphrase, in case the user has disabled
        // all their encrypted datatypes. In that case, the PSS will accept
        // the passphrase and finish configuration. If the user has enabled
        // encrypted datatypes, the PSS will prompt again specifying that the
        // passphrase failed.
      } else if (!$('google-option').disabled &&
                 this.getPassphraseRadioCheckedValue_() == 'explicit') {
        // The user is setting a custom passphrase for the first time.
        if (!this.checkPassphraseMatch_())
          return;
        customPassphrase = $('custom-passphrase').value;
        usePassphrase = true;
      } else {
        // The user is not setting a custom passphrase.
        usePassphrase = false;
      }

      // Don't allow the user to tweak the settings once we send the
      // configuration to the backend.
      this.setInputElementsDisabledState_(true);
      this.animateDisableLink_($('use-default-link'), true, null);

      // These values need to be kept in sync with where they are read in
      // SyncSetupFlow::GetDataTypeChoiceData().
      var result = JSON.stringify({
          "keepEverythingSynced": syncAll,
          "syncBookmarks": syncAll || $('bookmarks-checkbox').checked,
          "syncPreferences": syncAll || $('preferences-checkbox').checked,
          "syncThemes": syncAll || $('themes-checkbox').checked,
          "syncPasswords": syncAll || $('passwords-checkbox').checked,
          "syncAutofill": syncAll || $('autofill-checkbox').checked,
          "syncExtensions": syncAll || $('extensions-checkbox').checked,
          "syncTypedUrls": syncAll || $('typed-urls-checkbox').checked,
          "syncApps": syncAll || $('apps-checkbox').checked,
          "syncSearchEngines": syncAll || $('search-engines-checkbox').checked,
          "syncSessions": syncAll || $('sessions-checkbox').checked,
          "encryptAllData": encryptAllData,
          "usePassphrase": usePassphrase,
          "isGooglePassphrase": googlePassphrase,
          "passphrase": customPassphrase
      });
      chrome.send('SyncSetupConfigure', [result]);
    },

    /**
     * Sets the disabled property of all input elements within the 'Customize
     * Sync Preferences' screen. This is used to prohibit the user from changing
     * the inputs after confirming the customized sync preferences, or resetting
     * the state when re-showing the dialog.
     * @param disabled True if controls should be set to disabled.
     * @private
     */
    setInputElementsDisabledState_: function(disabled) {
      var configureElements =
          $('customize-sync-preferences').querySelectorAll('input');
      for (var i = 0; i < configureElements.length; i++)
        configureElements[i].disabled = disabled;
      $('sync-select-datatypes').disabled = disabled;

      var self = this;
      this.animateDisableLink_($('customize-link'), disabled, function() {
        self.showCustomizePage_(null, true);
      });
    },

    /**
     * Animate a link being enabled/disabled. The link is hidden by animating
     * its opacity, but to ensure the user doesn't click it during that time,
     * its onclick handler is changed to null as well.
     * @param elt The anchor element to enable/disable.
     * @param disabled True if the link should be disabled.
     * @param enabledFunction The onclick handler when the link is enabled.
     * @private
     */
    animateDisableLink_: function(elt, disabled, enabledFunction) {
      if (disabled) {
        elt.classList.add('transparent');
        elt.onclick = null;
        elt.addEventListener('webkitTransitionEnd', function f(e) {
          if (e.propertyName != 'opacity')
            return;
          elt.removeEventListener('webkitTransitionEnd', f);
          elt.classList.remove('transparent');
          elt.hidden = true;
        });
      } else {
        elt.hidden = false;
        elt.onclick = enabledFunction;
      }
    },

    setChooseDataTypesCheckboxes_: function(args) {
      var datatypeSelect = document.getElementById('sync-select-datatypes');
      datatypeSelect.selectedIndex = args.keepEverythingSynced ? 0 : 1;

      $('bookmarks-checkbox').checked = args.syncBookmarks;
      $('preferences-checkbox').checked = args.syncPreferences;
      $('themes-checkbox').checked = args.syncThemes;

      if (args.passwordsRegistered) {
        $('passwords-checkbox').checked = args.syncPasswords;
        $('passwords-item').className = "sync-item-show";
      } else {
        $('passwords-item').className = "sync-item-hide";
      }
      if (args.autofillRegistered) {
        $('autofill-checkbox').checked = args.syncAutofill;
        $('autofill-item').className = "sync-item-show";
      } else {
        $('autofill-item').className = "sync-item-hide";
      }
      if (args.extensionsRegistered) {
        $('extensions-checkbox').checked = args.syncExtensions;
        $('extensions-item').className = "sync-item-show";
      } else {
        $('extensions-item').className = "sync-item-hide";
      }
      if (args.typedUrlsRegistered) {
        $('typed-urls-checkbox').checked = args.syncTypedUrls;
        $('omnibox-item').className = "sync-item-show";
      } else {
        $('omnibox-item').className = "sync-item-hide";
      }
      if (args.appsRegistered) {
        $('apps-checkbox').checked = args.syncApps;
        $('apps-item').className = "sync-item-show";
      } else {
        $('apps-item').className = "sync-item-hide";
      }
      if (args.searchEnginesRegistered) {
        $('search-engines-checkbox').checked = args.syncSearchEngines;
        $('search-engines-item').className = "sync-item-show";
      } else {
        $('search-engines-item').className = "sync-item-hide";
      }
      if (args.sessionsRegistered) {
        $('sessions-checkbox').checked = args.syncSessions;
        $('sessions-item').className = "sync-item-show";
      } else {
        $('sessions-item').className = "sync-item-hide";
      }

      this.setCheckboxesToKeepEverythingSynced_(args.keepEverythingSynced);
    },

    setEncryptionRadios_: function(args) {
      if (args['encryptAllData']) {
        $('encrypt-all-option').checked = true;
        this.disableEncryptionRadioGroup_();
      } else {
        $('encrypt-sensitive-option').checked = true;
      }
    },

    setPassphraseRadios_: function(args) {
      if (args['usePassphrase']) {
        $('explicit-option').checked = true;

        // The passphrase, once set, cannot be unset, but we show a reset link.
        $('explicit-option').disabled = true;
        $('google-option').disabled = true;
        $('sync-custom-passphrase').hidden = true;
      } else {
        $('google-option').checked = true;
      }
    },

    setErrorState_: function(args) {
      if (!args.was_aborted)
        return;

      $('aborted-text').hidden = false;
      $('choose-datatypes-ok').disabled = true;
    },

    setCheckboxesAndErrors_: function(args) {
      this.setChooseDataTypesCheckboxes_(args);
      this.setEncryptionRadios_(args);
      this.setPassphraseRadios_(args);
      this.setErrorState_(args);
    },

    showConfigure_: function(args) {
      var datatypeSelect = document.getElementById('sync-select-datatypes');
      var self = this;
      datatypeSelect.onchange = function() {
        var syncAll = this.selectedIndex == 0;
        self.setCheckboxesToKeepEverythingSynced_(syncAll);
      };

      this.resetPage_('sync-setup-configure');
      $('sync-setup-configure').hidden = false;

      // onsubmit is changed when submitting a passphrase. Reset it to its
      // default.
      $('choose-data-types-form').onsubmit = function() {
        self.sendConfiguration_();
        return false;
      };

      if (args) {
        if (!args['encryptionEnabled'])
          $('customize-sync-encryption').hidden = true;
        this.setCheckboxesAndErrors_(args);

        // Whether to display the 'Sync everything' confirmation page or the
        // customize data types page.
        var keepEverythingSynced = args['keepEverythingSynced'];
        this.usePassphrase_ = args['usePassphrase'];
        if (args['showSyncEverythingPage'] == false || this.usePassphrase_ ||
            keepEverythingSynced == false || args['show_passphrase']) {
          this.showCustomizePage_(args, keepEverythingSynced);
        } else {
          this.showSyncEverythingPage_();
        }
      }
    },

    showSyncEverythingPage_: function() {
      $('confirm-sync-preferences').hidden = false;
      $('customize-sync-preferences').hidden = true;

      // Reset the selection to 'Sync everything'.
      $('sync-select-datatypes').selectedIndex = 0;

      // The default state is to sync everything.
      this.setCheckboxesToKeepEverythingSynced_(true);

      // If the account is not synced with a custom passphrase, reset the
      // passphrase radio when switching to the 'Sync everything' page.
      if (!this.usePassphrase_) {
        $('google-option').checked = true;
        $('sync-custom-passphrase').hidden = true;
      }

      $('confirm-everything-ok').focus();
    },

    /**
     * Reveals the UI for entering a custom passphrase during initial setup.
     * This happens if the user has previously enabled a custom passphrase on a
     * different machine.
     * @param {Array} args The args that contain the passphrase UI
     *     configuration.
     * @private
     */
    showPassphraseContainer_: function(args) {
      // Once we require a passphrase, we prevent the user from returning to
      // the Sync Everything pane.
      $('use-default-link').hidden = true;
      $('sync-custom-passphrase-container').hidden = true;
      $('sync-existing-passphrase-container').hidden = false;

      $('passphrase-rejected-body').hidden = true;
      $('normal-body').hidden = true;
      $('google-passphrase-needed-body').hidden = true;
      // Display the correct prompt to the user depending on what type of
      // passphrase is needed.
      if (args["need_google_passphrase"])
        $('google-passphrase-needed-body').hidden = false;
      else if (args["passphrase_creation_rejected"])
        $('passphrase-rejected-body').hidden = false;
      else
        $('normal-body').hidden = false;

      $('incorrect-passphrase').hidden = !args["passphrase_setting_rejected"];

      $('sync-passphrase-warning').hidden = false;

      $('passphrase').focus();
    },

    showCustomizePage_: function(args, syncEverything) {
      $('confirm-sync-preferences').hidden = true;
      $('customize-sync-preferences').hidden = false;

      $('sync-custom-passphrase-container').hidden = false;
      $('sync-existing-passphrase-container').hidden = true;

      // If the user has selected the 'Customize' page on initial set up, it's
      // likely he intends to change the data types. Select the
      // 'Choose data types' option in this case.
      var index = syncEverything ? 0 : 1;
      document.getElementById('sync-select-datatypes').selectedIndex = index;
      this.setDataTypeCheckboxesEnabled_(!syncEverything);

      // The passphrase input may need to take over focus from the OK button, so
      // set focus before that logic.
      $('choose-datatypes-ok').focus();

      if (args && args['show_passphrase']) {
        this.showPassphraseContainer_(args);
      } else {
        // We only show the "Use Default" link if we're not prompting for an
        // existing passphrase.
        var self = this;
        this.animateDisableLink_($('use-default-link'), false, function() {
          self.showSyncEverythingPage_();
        });
      }
    },

    attach_: function() {
      chrome.send('SyncSetupAttachHandler');
    },

    showSyncSetupPage_: function(page, args) {
      if (page == 'settingUp') {
        this.setThrobbersVisible_(true);
        return;
      } else {
        this.setThrobbersVisible_(false);
      }

      // Hide an existing visible overlay.
      var overlay = $('sync-setup-overlay');
      for (var i = 0; i < overlay.children.length; i++)
        overlay.children[i].hidden = true;

      this.setInputElementsDisabledState_(false);

      if (page == 'login')
        this.showGaiaLogin_(args);
      else if (page == 'configure' || page == 'passphrase')
        this.showConfigure_(args);

      if (page == 'done')
        this.closeOverlay_();
      else
        this.showOverlay_();
    },

    setThrobbersVisible_: function(visible) {
      var throbbers = document.getElementsByClassName("throbber");
        for (var i = 0; i < throbbers.length; i++)
          throbbers[i].style.visibility = visible ? "visible" : "hidden";
    },

    loginSetFocus_: function() {
      var email = $('gaia-email');
      var passwd = $('gaia-passwd');
      if (email && (email.value == null || email.value == "")) {
        email.focus();
      } else if (passwd) {
        passwd.focus();
      }
    },

    showAccessCodeRequired_: function() {
      $('password-row').hidden = true;
      $('email-row').hidden = true;
      $('create-account-cell').style.visibility = "hidden";

      $('access-code-label-row').hidden = false;
      $('access-code-input-row').hidden = false;
      $('access-code-help-row').hidden = false;
      $('access-code').disabled = false;
    },

    showCaptcha_: function(args) {
      this.captchaChallengeActive_ = true;

      // The captcha takes up lots of space, so make room.
      $('top-blurb-error').hidden = true;
      $('create-account-div').hidden = true;
      $('create-account-cell').hidden = true;

      // It's showtime for the captcha now.
      $('captcha-div').hidden = false;
      $('gaia-email').disabled = true;
      $('gaia-passwd').disabled = false;
      $('captcha-value').disabled = false;
      $('captcha-wrapper').style.backgroundImage = url(args.captchaUrl);
    },

    /**
     * Reset the state of all descendant elements of a root element to their
     * initial state.
     * The initial state is specified by adding a class to the descendant
     * element in sync_setup_overlay.html.
     * @param pageElementId The root page element id.
     * @private
     */
    resetPage_: function(pageElementId) {
      var page = $(pageElementId);
      var forEach = function(arr, fn) {
        var length = arr.length;
        for (var i = 0; i < length; i++) {
          fn(arr[i]);
        }
      };

      forEach(page.getElementsByClassName('reset-hidden'),
          function(elt) { elt.hidden = true; });
      forEach(page.getElementsByClassName('reset-shown'),
          function(elt) { elt.hidden = false; });
      forEach(page.getElementsByClassName('reset-disabled'),
          function(elt) { elt.disabled = true; });
      forEach(page.getElementsByClassName('reset-enabled'),
          function(elt) { elt.disabled = false; });
      forEach(page.getElementsByClassName('reset-visibility-hidden'),
          function(elt) { elt.style.visibility = 'hidden'; });
      forEach(page.getElementsByClassName('reset-value'),
          function(elt) { elt.value = ''; });
      forEach(page.getElementsByClassName('reset-opaque'),
          function(elt) { elt.classList.remove('transparent'); });
    },

    showGaiaLogin_: function(args) {
      this.resetPage_('sync-setup-login');
      $('sync-setup-login').hidden = false;

      var f = $('gaia-login-form');
      var email = $('gaia-email');
      var passwd = $('gaia-passwd');
      if (f) {
        if (args.user != undefined) {
          if (email.value != args.user)
            passwd.value = ""; // Reset the password field
          email.value = args.user;
        }

        if (!args.editable_user) {
          email.hidden = true;
          var span = $('email-readonly');
          span.textContent = email.value;
          span.hidden = false;
          $('create-account-div').hidden = true;
        }

        f.accessCode.disabled = true;
      }

      if (1 == args.error) {
        var access_code = document.getElementById('access-code');
        if (access_code.value && access_code.value != "") {
          $('errormsg-0-access-code').hidden = false;
          this.showAccessCodeRequired_();
        } else {
          $('errormsg-1-password').hidden = false;
        }
        this.setBlurbError_(args.error_message);
      } else if (3 == args.error) {
        $('errormsg-0-connection').hidden = false;
        this.setBlurbError_(args.error_message);
      } else if (4 == args.error) {
        this.showCaptcha_(args);
      } else if (8 == args.error) {
        this.showAccessCodeRequired_();
      } else if (args.error_message) {
        this.setBlurbError_(args.error_message);
      }

      $('sign-in').disabled = false;
      $('sign-in').value = templateData['signin'];
      this.loginSetFocus_();
    },

    resetErrorVisibility_: function() {
      $("errormsg-0-email").hidden = true;
      $("errormsg-0-password").hidden = true;
      $("errormsg-1-password").hidden = true;
      $("errormsg-0-connection").hidden = true;
      $("errormsg-0-access-code").hidden = true;
    },

    setBlurbError_: function(error_message) {
      if (this.captchaChallengeActive_)
        return;  // No blurb in captcha challenge mode.

      if (error_message) {
        $('error-signing-in').hidden = true;
        $('error-custom').hidden = false;
        $('error-custom').textContent = error_message;
      } else {
        $('error-signing-in').hidden = false;
        $('error-custom').hidden = true;
      }

      $('top-blurb-error').style.visibility = "visible";
      $('gaia-email').disabled = false;
      $('gaia-passwd').disabled = false;
    },

    setErrorVisibility_: function() {
      this.resetErrorVisibility_();
      var f = $('gaia-login-form');
      var email = $('gaia-email');
      var passwd = $('gaia-passwd');
      if (null == email.value || "" == email.value) {
        $('errormsg-0-email').hidden = false;
        this.setBlurbError_();
        return false;
      }
      // Don't enforce password being non-blank when checking access code (it
      // will have been cleared when the page was displayed).
      if (f.accessCode.disabled && (null == passwd.value ||
          "" == passwd.value)) {
        $('errormsg-0-password').hidden = false;
        this.setBlurbError_();
        return false;
      }
      if (!f.accessCode.disabled && (null == f.accessCode.value ||
          "" == f.accessCode.value)) {
        $('errormsg-0-password').hidden = false;
        return false;
      }
      return true;
    },

    sendCredentialsAndClose_: function() {
      if (!this.setErrorVisibility_()) {
        return false;
      }

      $('gaia-email').disabled = true;
      $('gaia-passwd').disabled = true;
      $('captcha-value').disabled = true;
      $('access-code').disabled = true;

      $('logging-in-throbber').style.visibility = "visible";

      var f = $('gaia-login-form');
      var email = $('gaia-email');
      var passwd = $('gaia-passwd');
      var result = JSON.stringify({"user" : email.value,
                                   "pass" : passwd.value,
                                   "captcha" : f.captchaValue.value,
                                   "access_code" : f.accessCode.value});
      $('sign-in').disabled = true;
      chrome.send('SyncSetupSubmitAuth', [result]);
    },

    showSuccessAndClose_: function() {
      $('sign-in').value = localStrings.getString('loginSuccess');
      setTimeout(this.closeOverlay_, 1600);
    },

    showSuccessAndSettingUp_: function() {
      $('sign-in').value = localStrings.getString('settingUp');
    },

    /**
      * Displays the stop syncing dialog.
      * @private
      */
    showStopSyncingUI_: function() {
      // Hide any visible children of the overlay.
      var overlay = $('sync-setup-overlay');
      for (var i = 0; i < overlay.children.length; i++)
        overlay.children[i].hidden = true;

      // Bypass OptionsPage.navigateToPage because it will call didShowPage
      // which will set its own visible page, based on the flow state.
      this.visible = true;

      $('sync-setup-stop-syncing').hidden = false;
      $('stop-syncing-cancel').focus();
    },

    /**
     * Steps into the appropriate Sync Setup error UI.
     * @private
     */
    showErrorUI_: function() {
      chrome.send('SyncSetupShowErrorUI');
    },

    /**
     * Determines the appropriate page to show in the Sync Setup UI based on
     * the state of the Sync backend.
     * @private
     */
    showSetupUI_: function() {
      chrome.send('SyncSetupShowSetupUI');
    },
  };

  SyncSetupOverlay.showErrorUI = function() {
    SyncSetupOverlay.getInstance().showErrorUI_();
  };

  SyncSetupOverlay.showSetupUI = function() {
    SyncSetupOverlay.getInstance().showSetupUI_();
  };

  SyncSetupOverlay.showSyncSetupPage = function(page, args) {
    SyncSetupOverlay.getInstance().showSyncSetupPage_(page, args);
  };

  SyncSetupOverlay.showSuccessAndClose = function() {
    SyncSetupOverlay.getInstance().showSuccessAndClose_();
  };

  SyncSetupOverlay.showSuccessAndSettingUp = function() {
    SyncSetupOverlay.getInstance().showSuccessAndSettingUp_();
  };

  SyncSetupOverlay.showStopSyncingUI = function() {
    SyncSetupOverlay.getInstance().showStopSyncingUI_();
  };

  // Export
  return {
    SyncSetupOverlay: SyncSetupOverlay
  };
});

// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var AddLanguageOverlay = options.AddLanguageOverlay;
var AdvancedOptions = options.AdvancedOptions;
var AlertOverlay = options.AlertOverlay;
var AutofillEditAddressOverlay = options.AutofillEditAddressOverlay;
var AutofillEditCreditCardOverlay = options.AutofillEditCreditCardOverlay;
var AutofillOptions = options.AutofillOptions;
var BrowserOptions = options.BrowserOptions;
var ClearBrowserDataOverlay = options.ClearBrowserDataOverlay;
var ContentSettings = options.ContentSettings;
var ContentSettingsExceptionsArea =
    options.contentSettings.ContentSettingsExceptionsArea;
var CookiesView = options.CookiesView;
var ExtensionSettings = options.ExtensionSettings;
var FontSettings = options.FontSettings;
var HandlerOptions = options.HandlerOptions;
var ImportDataOverlay = options.ImportDataOverlay;
var IntentsView = options.IntentsView;
var InstantConfirmOverlay = options.InstantConfirmOverlay;
var LanguageOptions = options.LanguageOptions;
var OptionsPage = options.OptionsPage;
var PackExtensionOverlay = options.PackExtensionOverlay;
var PasswordManager = options.PasswordManager;
var PersonalOptions = options.PersonalOptions;
var Preferences = options.Preferences;
var ManageProfileOverlay = options.ManageProfileOverlay;
var ProxyOptions = options.ProxyOptions;
var SearchEngineManager = options.SearchEngineManager;
var SearchPage = options.SearchPage;
var SyncSetupOverlay = options.SyncSetupOverlay;
var VirtualKeyboardManager = options.VirtualKeyboardManager;

/**
 * DOMContentLoaded handler, sets up the page.
 */
function load() {
  // Decorate the existing elements in the document.
  lbm.ui.decorate('input[pref][type=checkbox]', options.PrefCheckbox);
  lbm.ui.decorate('input[pref][type=number]', options.PrefNumber);
  lbm.ui.decorate('input[pref][type=radio]', options.PrefRadio);
  lbm.ui.decorate('input[pref][type=range]', options.PrefRange);
  lbm.ui.decorate('select[pref]', options.PrefSelect);
  lbm.ui.decorate('input[pref][type=text]', options.PrefTextField);
  lbm.ui.decorate('input[pref][type=url]', options.PrefTextField);
  lbm.ui.decorate('button[pref]', options.PrefButton);
  lbm.ui.decorate('#content-settings-page input[type=radio]:not(.handler-radio)',
      options.ContentSettingsRadio);
  lbm.ui.decorate('#content-settings-page input[type=radio].handler-radio',
      options.HandlersEnabledRadio);

  var menuOffPattern = /(^\?|&)menu=off($|&)/;
  var menuDisabled = menuOffPattern.test(window.location.search);
  // document.documentElement.setAttribute('hide-menu', menuDisabled);
  // We can't use an attribute on the html element because of webkit bug
  // 12519. Instead, we add a class.
  if (menuDisabled)
    document.documentElement.classList.add('hide-menu');

  localStrings = new LocalStrings();

  OptionsPage.register(SearchPage.getInstance());

  OptionsPage.register(BrowserOptions.getInstance());
  OptionsPage.registerSubPage(SearchEngineManager.getInstance(),
                              BrowserOptions.getInstance(),
                              [$('defaultSearchManageEnginesButton')]);
  OptionsPage.register(PersonalOptions.getInstance());
  OptionsPage.registerSubPage(AutofillOptions.getInstance(),
                              PersonalOptions.getInstance(),
                              [$('autofill-settings')]);
  OptionsPage.registerSubPage(PasswordManager.getInstance(),
                              PersonalOptions.getInstance(),
                              [$('manage-passwords')]);

  OptionsPage.register(AdvancedOptions.getInstance());
  OptionsPage.registerSubPage(ContentSettings.getInstance(),
                              AdvancedOptions.getInstance(),
                              [$('privacyContentSettingsButton')]);
  OptionsPage.registerSubPage(ContentSettingsExceptionsArea.getInstance(),
                              ContentSettings.getInstance());
  OptionsPage.registerSubPage(CookiesView.getInstance(),
                              ContentSettings.getInstance(),
                              [$('privacyContentSettingsButton'),
                               $('show-cookies-button')]);
  // If HandlerOptions is null it means it got compiled out.
  if (HandlerOptions) {
    OptionsPage.registerSubPage(HandlerOptions.getInstance(),
                                ContentSettings.getInstance(),
                                [$('manage-handlers-button')]);
  }
  if (IntentsView && $('manage-intents-button')) {
    OptionsPage.registerSubPage(IntentsView.getInstance(),
                                ContentSettings.getInstance(),
                                [$('manage-intents-button')]);
  }
  OptionsPage.registerSubPage(FontSettings.getInstance(),
                              AdvancedOptions.getInstance(),
                              [$('fontSettingsCustomizeFontsButton')]);
  if (!lbm.isChromeOS) {
    OptionsPage.registerSubPage(LanguageOptions.getInstance(),
                                AdvancedOptions.getInstance(),
                                [$('language-button')]);
  }
  if (!lbm.isWindows && !lbm.isMac) {
    OptionsPage.registerSubPage(CertificateManager.getInstance(),
                                AdvancedOptions.getInstance(),
                                [$('certificatesManageButton')]);
    OptionsPage.registerOverlay(CertificateRestoreOverlay.getInstance(),
                                CertificateManager.getInstance());
    OptionsPage.registerOverlay(CertificateBackupOverlay.getInstance(),
                                CertificateManager.getInstance());
    OptionsPage.registerOverlay(CertificateEditCaTrustOverlay.getInstance(),
                                CertificateManager.getInstance());
    OptionsPage.registerOverlay(CertificateImportErrorOverlay.getInstance(),
                                CertificateManager.getInstance());
  }
  OptionsPage.registerOverlay(AddLanguageOverlay.getInstance(),
                              LanguageOptions.getInstance());
  OptionsPage.registerOverlay(AlertOverlay.getInstance());
  OptionsPage.registerOverlay(AutofillEditAddressOverlay.getInstance(),
                              AutofillOptions.getInstance());
  OptionsPage.registerOverlay(AutofillEditCreditCardOverlay.getInstance(),
                              AutofillOptions.getInstance());
  OptionsPage.registerOverlay(ClearBrowserDataOverlay.getInstance(),
                              AdvancedOptions.getInstance(),
                              [$('privacyClearDataButton')]);
  OptionsPage.registerOverlay(ImportDataOverlay.getInstance(),
                              PersonalOptions.getInstance());
  OptionsPage.registerOverlay(InstantConfirmOverlay.getInstance(),
                              BrowserOptions.getInstance());
  OptionsPage.registerOverlay(SyncSetupOverlay.getInstance(),
                              PersonalOptions.getInstance());
  OptionsPage.registerOverlay(ManageProfileOverlay.getInstance(),
                              PersonalOptions.getInstance());

  OptionsPage.register(ExtensionSettings.getInstance());
  OptionsPage.registerOverlay(PackExtensionOverlay.getInstance(),
                              ExtensionSettings.getInstance());

  if (lbm.isChromeOS) {
    OptionsPage.register(AccountsOptions.getInstance());
    OptionsPage.registerSubPage(ProxyOptions.getInstance(),
                                InternetOptions.getInstance());
    OptionsPage.registerSubPage(ChangePictureOptions.getInstance(),
                                PersonalOptions.getInstance(),
                                [$('change-picture-button')]);
    OptionsPage.registerOverlay(DetailsInternetPage.getInstance(),
                                InternetOptions.getInstance());

    var languageModifierKeysOverlay = new OptionsPage(
        'languageCustomizeModifierKeysOverlay',
        localStrings.getString('languageCustomizeModifierKeysOverlay'),
        'languageCustomizeModifierKeysOverlay')
    $('languageCustomizeModifierKeysOverleyDismissButton').onclick =
        function() {
      OptionsPage.closeOverlay();
    };
    OptionsPage.registerOverlay(languageModifierKeysOverlay,
                                SystemOptions.getInstance(),
                                [$('modifier-keys-button')]);
  }

  Preferences.getInstance().initialize();
  OptionsPage.initialize();

  var path = document.location.pathname;

  if (path.length > 1) {
    // Skip starting slash and remove trailing slash (if any).
    var pageName = path.slice(1).replace(/\/$/, '');
    // Proxy page is now per network and only reachable from internet details.
    if (pageName != 'proxy') {
      // Show page, but don't update history (there's already an entry for it).
      OptionsPage.showPageByName(pageName, false);
    }
  } else {
    OptionsPage.showDefaultPage();
  }

  var subpagesNavTabs = document.querySelectorAll('.subpages-nav-tabs');
  for(var i = 0; i < subpagesNavTabs.length; i++) {
    subpagesNavTabs[i].onclick = function(event) {
      OptionsPage.showTab(event.srcElement);
    }
  }

  // Allow platform specific CSS rules.
  lbm.enablePlatformSpecificCSSRules();

  if (navigator.plugins['Shockwave Flash'])
    document.documentElement.setAttribute('hasFlashPlugin', '');

  // Clicking on the Settings title brings up the 'Basics' page.
  $('navbar-content-title').onclick = function() {
    OptionsPage.navigateToPage(BrowserOptions.getInstance().name);
  };
}

document.addEventListener('DOMContentLoaded', load);

window.onpopstate = function(e) {
  options.OptionsPage.setState(e.state);
};

window.onbeforeunload = function() {
  options.OptionsPage.willClose();
};

