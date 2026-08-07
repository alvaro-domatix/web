/** @odoo-module **/

import {Component, onMounted, useRef, useState} from "@odoo/owl";

export class GridRenderer extends Component {
    static template = "web_grid_view.GridRenderer";
    static props = {
        model: {type: Object},
        onCellEdit: {type: Function, optional: true},
        onCellCommit: {type: Function, optional: true},
        onCellNavigate: {type: Function, optional: true},
    };

    setup() {
        this.model = this.props.model;
        this.state = useState({
            hoveredRow: null,
            hoveredCol: null,
            editingRow: null,
            editingCol: null,
        });
        this.gridRef = useRef("grid");
        onMounted(() => this._focusOnToday());
    }

    get hasData() {
        const m = this.model;
        return m.hasSections ? m.sections.length > 0 : m.rows.length > 0;
    }

    get visibleColumns() {
        const cols = this.model.columns || [];
        return cols.filter((c) => !c.isWeekend || this.model.showWeekends);
    }

    get allRows() {
        return this.model.hasSections ? this.model.sections : this.model.rows;
    }

    get gridTemplateColumns() {
        const n = this.visibleColumns.length;
        const colWidth = this.model.activeRange?.span === "day" ? "10ch" : "8ch";
        return `minmax(120px, auto) repeat(${n}, minmax(${colWidth}, 1fr)) minmax(8ch, 12em)`;
    }

    get maxColumnTotal() {
        return Math.max(1, ...this.visibleColumns.map((c) => c.grandTotal));
    }

    formatValue(value) {
        if (value === undefined || value === null) return "";
        return Number(value).toFixed(1);
    }

    getBarHeight(col) {
        return `${(col.grandTotal / this.maxColumnTotal) * 100}%`;
    }

    _focusOnToday() {
        if (!this.gridRef.el) return;
        const todayCol = this.visibleColumns.find((c) => c.isToday);
        if (todayCol) {
            const cell = this.gridRef.el.querySelector(
                `[data-col-id="${todayCol.id}"]`
            );
            if (cell) cell.scrollIntoView({block: "nearest", inline: "center"});
        }
    }

    onCellMouseOver(rowId, colId) {
        this.state.hoveredRow = rowId;
        this.state.hoveredCol = colId;
    }

    onCellMouseOut() {
        this.state.hoveredRow = null;
        this.state.hoveredCol = null;
    }

    onCellClick(rowId, colId) {
        if (!this.model.archInfo?.editable) return;
        if (!this.model.archInfo?.measureField) return;
        this.state.editingRow = rowId;
        this.state.editingCol = colId;
    }

    onCellCommit(value) {
        if (this.state.editingRow && this.state.editingCol) {
            this.props.onCellCommit?.(
                this.state.editingRow,
                this.state.editingCol,
                value
            );
        }
        this.state.editingRow = null;
        this.state.editingCol = null;
    }

    onCellNavigate(key, shift) {
        if (!this.state.editingRow || !this.state.editingCol) return;
        const cols = this.visibleColumns;
        const colIdx = cols.findIndex((c) => c.id === this.state.editingCol);
        let nextCol = colIdx;
        const nextRow = this.state.editingRow;

        if (key === "Tab" && !shift) {
            nextCol = Math.min(colIdx + 1, cols.length - 1);
        } else if (key === "Tab" && shift) {
            nextCol = Math.max(colIdx - 1, 0);
        } else if (key === "Enter") {
            nextCol = colIdx;
        }

        if (nextCol !== colIdx || key === "Enter") {
            this.state.editingCol = cols[nextCol].id;
            this.props.onCellNavigate?.(nextRow, cols[nextCol].id);
        }
    }

    isHovered(rowId, colId) {
        return this.state.hoveredRow === rowId || this.state.hoveredCol === colId;
    }

    isEditing(rowId, colId) {
        return this.state.editingRow === rowId && this.state.editingCol === colId;
    }

    getCell(row, colId) {
        return row.cells?.[colId] || null;
    }

    getFieldType() {
        return this.model.fields?.[this.model.measureFieldName]?.type || "float";
    }

    getWidget() {
        return this.model.archInfo?.measureField?.widget || null;
    }
}
