/** @odoo-module **/

import {Component} from "@odoo/owl";
import {registry} from "@web/core/registry";

export class FloatToggleGridCell extends Component {
    static template = "web_grid_view.FloatToggleGridCell";
    static props = {
        cell: {type: Object, optional: true},
        range: {type: Object, optional: true},
        onCommit: {type: Function, optional: true},
    };

    setup() {
        this.rangeValues = this.props.range?.range || [0, 1];
    }

    get currentIdx() {
        const val = this.props.cell?.value || 0;
        const idx = this.rangeValues.indexOf(val);
        return idx >= 0 ? idx : 0;
    }

    onClick() {
        const nextIdx = (this.currentIdx + 1) % this.rangeValues.length;
        this.props.onCommit?.(this.rangeValues[nextIdx]);
    }
}

registry
    .category("grid_components")
    .add("float_toggle", {component: FloatToggleGridCell});
