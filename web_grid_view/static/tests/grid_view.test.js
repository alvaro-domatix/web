import {beforeEach, expect, test} from "@odoo/hoot";
import {queryAllTexts} from "@odoo/hoot-dom";
import {mockDate} from "@odoo/hoot-mock";
import {
    contains,
    defineModels,
    fields,
    models,
    mountView,
    onRpc,
} from "@web/../tests/web_test_helpers";
import {registry} from "@web/core/registry";

class GridDemoEntry extends models.Model {
    _name = "grid.demo.entry";

    name = fields.Char();
    date = fields.Date();
    category = fields.Selection({
        selection: [
            ["a", "Category A"],
            ["b", "Category B"],
        ],
    });
    value = fields.Float();
    locked = fields.Boolean();

    _records = [
        {
            id: 1,
            name: "Mon A",
            date: "2026-08-10",
            category: "a",
            value: 2,
            locked: true,
        },
        {id: 2, name: "Tue A", date: "2026-08-11", category: "a", value: 3},
        {
            id: 3,
            name: "Mon B",
            date: "2026-08-10",
            category: "b",
            value: 5,
            locked: true,
        },
    ];
}

defineModels([GridDemoEntry]);

const ARCH = `
    <grid string="Demo" editable="1">
        <field name="category" type="row"/>
        <field name="date" type="col">
            <range name="week" string="Week" span="week" step="day" default="1"/>
            <range name="month" string="Month" span="month" step="day"/>
        </field>
        <field name="value" type="measure"/>
    </grid>`;

beforeEach(() => {
    // The grid anchors its columns on the current date.
    mockDate("2026-08-12T12:00:00");
});

test("the view type and the cell widgets are registered", () => {
    expect(registry.category("views").contains("grid")).toBe(true);
    const cells = registry.category("grid_components");
    expect(cells.contains("float")).toBe(true);
    expect(cells.contains("integer")).toBe(true);
    expect(cells.contains("float_time")).toBe(true);
    expect(cells.contains("float_toggle")).toBe(true);
    const rows = registry.category("grid_row_components");
    expect(rows.contains("many2one")).toBe(true);
    expect(rows.contains("selection")).toBe(true);
    expect(rows.contains("char")).toBe(true);
});

test("renders one column per day of the range and one row per group", async () => {
    await mountView({type: "grid", resModel: "grid.demo.entry", arch: ARCH});

    expect(".o_grid_renderer").toHaveCount(1);
    expect(".o_grid_col_header").toHaveCount(7);
    expect(".o_grid_row_label").toHaveCount(2);
    expect(queryAllTexts(".o_grid_row_label")).toEqual(["Category A", "Category B"]);
});

test("column and row totals add up the measure", async () => {
    await mountView({type: "grid", resModel: "grid.demo.entry", arch: ARCH});

    // Category A holds 2 + 3, category B holds 5.
    expect(queryAllTexts(".o_grid_row_total")).toEqual(["5.0", "5.0"]);
    // Monday holds 2 + 5, Tuesday holds 3, the rest of the week is empty.
    expect(queryAllTexts(".o_grid_footer_cell")).toEqual([
        "7.0",
        "3.0",
        "0.0",
        "0.0",
        "0.0",
        "0.0",
        "0.0",
    ]);
});

test("the toolbar moves the period and comes back", async () => {
    await mountView({type: "grid", resModel: "grid.demo.entry", arch: ARCH});

    const period = () =>
        document.querySelector(".o_grid_period_label").textContent.trim();
    const initial = period();
    expect(initial).toBe("Aug 10 - Aug 16, 2026");

    await contains(".o_grid_button_next").click();
    expect(period()).toBe("Aug 17 - Aug 23, 2026");

    await contains(".o_grid_button_prev").click();
    expect(period()).toBe(initial);
});

test("switching the range changes the number of columns", async () => {
    await mountView({type: "grid", resModel: "grid.demo.entry", arch: ARCH});

    expect(".o_grid_col_header").toHaveCount(7);
    await contains(".o_view_scale_selector .scale_button_selection").click();
    await contains(".o_scale_button_month").click();
    expect(".o_grid_col_header").toHaveCount(31);
});

test("editing a cell calls grid_update_cell with the delta", async () => {
    onRpc("grid.demo.entry", "grid_update_cell", ({args}) => {
        // Args[0] are the recordset ids, then the cell domain, the measure and
        // the delta.
        expect(args[0]).toEqual([]);
        expect(args[2]).toBe("value");
        expect(args[3]).toBe(8);
        expect.step("grid_update_cell");
        return true;
    });
    await mountView({type: "grid", resModel: "grid.demo.entry", arch: ARCH});

    await contains(".o_grid_cell").click();
    expect(".o_grid_cell_input").toHaveCount(1);
    await contains(".o_grid_cell_input").edit("10", {confirm: "enter"});
    expect.verifySteps(["grid_update_cell"]);
});

test("display_empty keeps the grid when the period holds no record", async () => {
    const emptyArch = ARCH.replace('editable="1"', 'editable="1" display_empty="1"');
    await mountView({type: "grid", resModel: "grid.demo.entry", arch: emptyArch});

    await contains(".o_grid_button_next").click();
    expect(".o_grid_col_header").toHaveCount(7);
    expect(".o_grid_row_label").toHaveCount(0);
    expect(".o_grid_renderer").not.toHaveText(/No data for this period/);
});

test("without display_empty an empty period shows the placeholder", async () => {
    await mountView({type: "grid", resModel: "grid.demo.entry", arch: ARCH});

    await contains(".o_grid_button_next").click();
    expect(".o_grid_col_header").toHaveCount(0);
    expect(".o_grid_renderer").toHaveText(/No data for this period/);
});

test("create_inline adds a button that opens the form dialog", async () => {
    const inlineArch = ARCH.replace('editable="1"', 'editable="1" create_inline="1"');
    await mountView({type: "grid", resModel: "grid.demo.entry", arch: inlineArch});

    expect(".o_grid_button_add_line").toHaveCount(1);
    await contains(".o_grid_button_add_line").click();
    expect(".modal .o_form_view").toHaveCount(1);
});

test("barchart_total renders one bar per visible column", async () => {
    const barArch = ARCH.replace('editable="1"', 'editable="1" barchart_total="1"');
    await mountView({type: "grid", resModel: "grid.demo.entry", arch: barArch});

    expect(".o_grid_barchart_bar").toHaveCount(7);
    // The tallest bar is the highest column total.
    expect(document.querySelector(".o_grid_barchart_bar").style.height).toBe("100%");
});

test("hide_line_total drops the total column", async () => {
    const arch = ARCH.replace('editable="1"', 'editable="1" hide_line_total="1"');
    await mountView({type: "grid", resModel: "grid.demo.entry", arch});

    expect(".o_grid_row_total").toHaveCount(0);
    expect(".o_grid_total_header").toHaveCount(0);
    // The column totals are still there.
    expect(".o_grid_footer_cell").toHaveCount(7);
});

test("hide_column_total drops the totals row", async () => {
    const arch = ARCH.replace('editable="1"', 'editable="1" hide_column_total="1"');
    await mountView({type: "grid", resModel: "grid.demo.entry", arch});

    expect(".o_grid_footer_cell").toHaveCount(0);
    // The line totals are still there.
    expect(".o_grid_row_total").toHaveCount(2);
});

test("a readonly cell cannot be edited", async () => {
    const arch = `
        <grid string="Demo" editable="1">
            <field name="category" type="row"/>
            <field name="date" type="col">
                <range name="week" string="Week" span="week" step="day" default="1"/>
            </field>
            <field name="value" type="measure"/>
            <field name="locked" type="readonly"/>
        </grid>`;
    await mountView({type: "grid", resModel: "grid.demo.entry", arch});

    expect(".o_grid_cell.o_grid_readonly").toHaveCount(2);
    await contains(".o_grid_cell.o_grid_readonly").click();
    expect(".o_grid_cell_input").toHaveCount(0);

    // A cell that is not locked still opens the editor.
    await contains(".o_grid_cell:not(.o_grid_readonly)").click();
    expect(".o_grid_cell_input").toHaveCount(1);
});
