/** @odoo-module **/

import {Component} from "@odoo/owl";
import {registry} from "@web/core/registry";

export class GridComponent extends Component {
    static template = "web_grid_view.GridComponent";
    static props = {
        type: {type: String},
        widget: {type: String, optional: true},
        cell: {type: Object, optional: true},
        row: {type: Object, optional: true},
        isEditing: {type: Boolean, optional: true},
        onCommit: {type: Function, optional: true},
        onNavigate: {type: Function, optional: true},
    };

    get componentKey() {
        return this.props.widget || this.props.type;
    }

    get componentInfo() {
        return registry.category("grid_components").get(this.componentKey, null);
    }

    get componentClass() {
        return this.componentInfo?.component || null;
    }
}
