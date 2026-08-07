/** @odoo-module **/

import {Component} from "@odoo/owl";
import {registry} from "@web/core/registry";

export class GridRow extends Component {
    static template = "web_grid_view.GridRow";
    static props = {
        row: {type: Object},
    };
}

registry.category("grid_components").add("selection", {component: GridRow});
registry.category("grid_components").add("char", {component: GridRow});
