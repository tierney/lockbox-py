// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview This is a table column representation
 */

lbm.define('lbm.ui.table', function() {
  const EventTarget = lbm.EventTarget;
  const Event = lbm.Event;

  /**
   * A table column that wraps column ids and settings.
   * @param {!Array} columnIds Array of column ids.
   * @constructor
   * @extends {EventTarget}
   */
  function TableColumn(id, name, width) {
    this.id_ = id;
    this.name_ = name;
    this.width_ = width;
  }

  TableColumn.prototype = {
    __proto__: EventTarget.prototype,

    id_: null,

    name_: null,

    width_: null,

    renderFunction_: null,

    /**
     * Clones column.
     * @return {lbm.ui.table.TableColumn} Clone of the given column.
     */
    clone: function() {
      var tableColumn = new TableColumn(this.id_, this.name_, this.width_);
      tableColumn.renderFunction = this.renderFunction_;
      return tableColumn;
    },

    /**
     * Renders table cell. This is the default render function.
     * @param {*} dataItem The data item to be rendered.
     * @param {string} columnId The column id.
     * @param {lbm.ui.Table} table The table.
     * @return {HTMLElement} Rendered element.
     */
    renderFunction_: function(dataItem, columnId, table) {
      var div = table.ownerDocument.createElement('div');
      div.textContent = dataItem[columnId];
      return div;
    },
  };

  /**
   * The column id.
   * @type {string}
   */
  lbm.defineProperty(TableColumn, 'id');

  /**
   * The column name
   * @type {string}
   */
  lbm.defineProperty(TableColumn, 'name');

  /**
   * The column width.
   * @type {number}
   */
  lbm.defineProperty(TableColumn, 'width');

  /**
   * The column render function.
   * @type {Function(*, string, lbm.ui.Table): HTMLElement}
   */
  lbm.defineProperty(TableColumn, 'renderFunction');

  return {
    TableColumn: TableColumn
  };
});
