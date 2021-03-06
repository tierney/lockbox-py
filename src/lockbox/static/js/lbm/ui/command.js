// Copyright (c) 2010 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview A command is an abstraction of an action a user can do in the
 * UI.
 *
 * When the focus changes in the document for each command a canExecute event
 * is dispatched on the active element. By listening to this event you can
 * enable and disable the command by setting the event.canExecute property.
 *
 * When a command is executed a command event is dispatched on the active
 * element. Note that you should stop the propagation after you have handled the
 * command if there might be other command listeners higher up in the DOM tree.
 */

lbm.define('lbm.ui', function() {

  /**
   * This is used to identify keyboard shortcuts.
   * @param {string} shortcut The text used to describe the keys for this
   *     keyboard shortcut.
   * @constructor
   */
  function KeyboardShortcut(shortcut) {
    var mods = {};
    var ident = '';
    shortcut.split('-').forEach(function(part) {
      var partLc = part.toLowerCase();
      switch (partLc) {
        case 'alt':
        case 'ctrl':
        case 'meta':
        case 'shift':
          mods[partLc + 'Key'] = true;
          break;
        default:
          if (ident)
            throw Error('Invalid shortcut');
          ident = part;
      }
    });

    this.ident_ = ident;
    this.mods_ = mods;
  }

  KeyboardShortcut.prototype = {
    /**
     * Wether the keyboard shortcut object mathes a keyboard event.
     * @param {!Event} e The keyboard event object.
     * @return {boolean} Whether we found a match or not.
     */
    matchesEvent: function(e) {
      if (e.keyIdentifier == this.ident_) {
        // All keyboard modifiers needs to match.
        var mods = this.mods_;
        return ['altKey', 'ctrlKey', 'metaKey', 'shiftKey'].every(function(k) {
          return e[k] == !!mods[k];
        });
      }
      return false;
    }
  };

  /**
   * Creates a new command element.
   * @constructor
   * @extends {HTMLElement}
   */
  var Command = lbm.ui.define('command');

  Command.prototype = {
    __proto__: HTMLElement.prototype,

    /**
     * Initializes the command.
     */
    decorate: function() {
      CommandManager.init(this.ownerDocument);
    },

    /**
     * Executes the command. This dispatches a command event on the active
     * element. If the command is {@code disabled} this does nothing.
     */
    execute: function() {
      if (this.disabled)
        return;
      var doc = this.ownerDocument;
      if (doc.activeElement) {
        var e = new lbm.Event('command', true, false);
        e.command = this;
        doc.activeElement.dispatchEvent(e);
      }
    },

    /**
     * Call this when there have been changes that might change whether the
     * command can be executed or not.
     */
    canExecuteChange: function() {
      dispatchCanExecuteEvent(this, this.ownerDocument.activeElement);
    },

    /**
     * The keyboard shortcut that triggers the command. This is a string
     * consisting of a keyIdentifier (as reported by WebKit in keydown) as
     * well as optional key modifiers joinded with a '-'.
     *
     * Multiple keyboard shortcuts can be provided by separating them by
     * whitespace.
     *
     * For example:
     *   "F1"
     *   "U+0008-Meta" for Apple command backspace.
     *   "U+0041-Ctrl" for Control A
     *   "U+007F U+0008-Meta" for Delete and Command Backspace
     *
     * @type {string}
     */
    shortcut_: '',
    get shortcut() {
      return this.shortcut_;
    },
    set shortcut(shortcut) {
      var oldShortcut = this.shortcut_;
      if (shortcut !== oldShortcut) {
        this.keyboardShortcuts_ = shortcut.split(/\s+/).map(function(shortcut) {
          return new KeyboardShortcut(shortcut);
        });

        // Set this after the keyboardShortcuts_ since that might throw.
        this.shortcut_ = shortcut;
        lbm.dispatchPropertyChange(this, 'shortcut', this.shortcut_,
                                  oldShortcut);
      }
    },

    /**
     * Whether the event object matches the shortcut for this command.
     * @param {!Event} e The key event object.
     * @return {boolean} Whether it matched or not.
     */
    matchesEvent: function(e) {
      if (!this.keyboardShortcuts_)
        return false;

      return this.keyboardShortcuts_.some(function(keyboardShortcut) {
        return keyboardShortcut.matchesEvent(e);
        });
      }
  };

  /**
   * The label of the command.
   * @type {string}
   */
  lbm.defineProperty(Command, 'label', lbm.PropertyKind.ATTR);

  /**
   * Whether the command is disabled or not.
   * @type {boolean}
   */
  lbm.defineProperty(Command, 'disabled', lbm.PropertyKind.BOOL_ATTR);

  /**
   * Whether the command is hidden or not.
   * @type {boolean}
   */
  lbm.defineProperty(Command, 'hidden', lbm.PropertyKind.BOOL_ATTR);

  /**
   * Whether the command is checked or not.
   * @type {boolean}
   */
  lbm.defineProperty(Command, 'checked', lbm.PropertyKind.BOOL_ATTR);

  /**
   * Dispatches a canExecute event on the target.
   * @param {lbm.ui.Command} command The command that we are testing for.
   * @param {Element} target The target element to dispatch the event on.
   */
  function dispatchCanExecuteEvent(command, target) {
    var e = new CanExecuteEvent(command, true)
    target.dispatchEvent(e);
    command.disabled = !e.canExecute;
  }

  /**
   * The command managers for different documents.
   */
  var commandManagers = {};

  /**
   * Keeps track of the focused element and updates the commands when the focus
   * changes.
   * @param {!Document} doc The document that we are managing the commands for.
   * @constructor
   */
  function CommandManager(doc) {
    doc.addEventListener('focus', this.handleFocus_.bind(this), true);
    // Make sure we add the listener to the bubbling phase so that elements can
    // prevent the command.
    doc.addEventListener('keydown', this.handleKeyDown_.bind(this), false);
  }

  /**
   * Initializes a command manager for the document as needed.
   * @param {!Document} doc The document to manage the commands for.
   */
  CommandManager.init = function(doc) {
    var uid = lbm.getUid(doc);
    if (!(uid in commandManagers)) {
      commandManagers[uid] = new CommandManager(doc);
    }
  },

  CommandManager.prototype = {

    /**
     * Handles focus changes on the document.
     * @param {Event} e The focus event object.
     * @private
     */
    handleFocus_: function(e) {
      var target = e.target;
      var commands = Array.prototype.slice.call(
          target.ownerDocument.querySelectorAll('command'));

      commands.forEach(function(command) {
        dispatchCanExecuteEvent(command, target);
      });
    },

    /**
     * Handles the keydown event and routes it to the right command.
     * @param {!Event} e The keydown event.
     */
    handleKeyDown_: function(e) {
      var target = e.target;
      var commands = Array.prototype.slice.call(
          target.ownerDocument.querySelectorAll('command'));

      for (var i = 0, command; command = commands[i]; i++) {
        if (!command.disabled && command.matchesEvent(e)) {
          e.preventDefault();
          // We do not want any other element to handle this.
          e.stopPropagation();

          command.execute();
          return;
        }
      }
    }
  };

  /**
   * The event type used for canExecute events.
   * @param {!lbm.ui.Command} command The command that we are evaluating.
   * @extends {Event}
   */
  function CanExecuteEvent(command) {
    var e = command.ownerDocument.createEvent('Event');
    e.initEvent('canExecute', true, false);
    e.__proto__ = CanExecuteEvent.prototype;
    e.command = command;
    return e;
  }

  CanExecuteEvent.prototype = {
    __proto__: Event.prototype,

    /**
     * The current command
     * @type {lbm.ui.Command}
     */
    command: null,

    /**
     * Whether the target can execute the command. Setting this also stops the
     * propagation.
     * @type {boolean}
     */
    canExecute_: false,
    get canExecute() {
      return this.canExecute_;
    },
    set canExecute(canExecute) {
      this.canExecute_ = !!canExecute;
      this.stopPropagation();
    }
  };

  // Export
  return {
    Command: Command,
    CanExecuteEvent: CanExecuteEvent
  };
});
