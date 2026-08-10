To add a grid view to a model, define a \<grid\> view in XML and add
grid to the action's view_mode.

``` xml
<record id="my_grid_view" model="ir.ui.view">
    <field name="name">my.model.grid</field>
    <field name="model">my.model</field>
    <field name="arch" type="xml">
        <grid string="My Grid" editable="1">
            <field name="my_row_field" type="row" section="1"/>
            <field name="my_date_field" type="col">
                <range name="day" string="Day" span="day" step="day"/>
                <range name="week" string="Week" span="week" step="day" default="1"/>
                <range name="month" string="Month" span="month" step="day"/>
            </field>
            <field name="my_measure_field" type="measure" widget="float"/>
        </grid>
    </field>
</record>
```

## Field types

| Type | Meaning |
|---|---|
| `row` | Groups records into rows. Several are allowed, and they are combined in the row label. Add `section="1"` to one of them to group the rows under section headers. |
| `col` | Date field that builds the columns. It holds one `<range>` per available scale. |
| `measure` | Aggregated field shown in the cells. Exactly one is required. |
| `readonly` | Optional field whose value marks cells as read only. |

Each `<range>` takes `name`, `string`, `span` (the period covered: `day`,
`week`, `month`, `year`), `step` (the width of a column: `day` or `month`),
an optional `default="1"` and an optional `hotkey`. The scale chosen by the
user is remembered per view in the browser local storage.

## View attributes

| Attribute | Effect |
|---|---|
| `editable="1"` | Allows editing the cells inline. Only applies when the measure operator is `sum`. |
| `create_inline="1"` | Adds an "Add a line" button below the grid that opens the form view in a dialog, with the column field defaulted to the start of the displayed period. |
| `display_empty="1"` | Keeps the columns and the totals on screen when the period holds no record, instead of showing a placeholder. |
| `barchart_total="1"` | Adds a row of bars under the totals, scaled to the largest column total. |
| `hide_column_total="1"` / `hide_line_total="1"` | Hide the corresponding totals. |
| `form_view_id` | Form view used by the creation dialog. |
| `create` / `edit` / `delete` | Standard `false` switches to disable the actions. |

## Editing cells

Inline editing is off by default because the module cannot know how a change
in an aggregated cell should be spread over the underlying records. To enable
it, set `editable="1"` and override `grid_update_cell` on your model:

``` python
def grid_update_cell(self, domain, measure_field_name, value):
    """value is the delta: the new cell value minus the old one."""
    records = self.search(domain)
    if records:
        record = records[0]
        record.write({measure_field_name: record[measure_field_name] + value})
        return True
    self.create(self._values_for_new_cell(domain, measure_field_name, value))
    return True
```

Without that override the default implementation raises `NotImplementedError`.

`grid_unavailability(start_date, end_date, groupby, res_ids)` can also be
overridden to report the days that should be greyed out per record.
