/** @odoo-module **/

import {Component} from "@odoo/owl";
import {formatFloat, formatInteger} from "@web/views/fields/formatters";
import {parseFloat as parseFloatFn} from "@web/views/fields/parsers";
import {registry} from "@web/core/registry";
import {useInputHook} from "../hooks/input_hook.esm";

export class GridCell extends Component {
    static template = "web_grid_view.GridCell";
    static props = {
        cell: {type: Object, optional: true},
        type: {type: String, optional: true},
        isEditing: {type: Boolean, optional: true},
        onCommit: {type: Function, optional: true},
        onNavigate: {type: Function, optional: true},
    };

    setup() {
        this.formatValue = this.props.type === "integer" ? formatInteger : formatFloat;
        if (this.props.isEditing) {
            this.input = useInputHook({
                value: this.props.cell?.value || 0,
                parse: parseFloatFn,
                format: (v) => String(v || ""),
                onCommit: (val) => this.props.onCommit?.(val),
                onNavigate: (key, shift) => this.props.onNavigate?.(key, shift),
            });
        }
    }

    get displayValue() {
        if (!this.props.cell) return "";
        return this.formatValue(this.props.cell.value);
    }
}

registry.category("grid_components").add("integer", {
    component: GridCell,
});
registry.category("grid_components").add("float", {
    component: GridCell,
});
