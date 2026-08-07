/** @odoo-module **/

import {GridCell} from "./grid_cell.esm";
import {formatFloatTime} from "@web/views/fields/formatters";
import {registry} from "@web/core/registry";

export class FloatTimeGridCell extends GridCell {
    formatValue = formatFloatTime;
}

registry.category("grid_components").add("float_time", {component: FloatTimeGridCell});
