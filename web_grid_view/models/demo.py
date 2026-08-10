# Copyright 2026 Domatix
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl).

from odoo import fields, models


class GridDemoEntry(models.Model):
    _name = "grid.demo.entry"
    _description = "Demo Entry for Grid View"

    name = fields.Char(required=True)
    date = fields.Date()
    user_id = fields.Many2one("res.users")
    category = fields.Selection(
        selection=[
            ("a", "Category A"),
            ("b", "Category B"),
            ("c", "Category C"),
        ],
        default="a",
    )
    value = fields.Float(default=0.0)

    def grid_update_cell(self, domain, measure_field_name, value):
        records = self.search(domain)
        if records:
            record = records[0]
            record.write({measure_field_name: record[measure_field_name] + value})
            return True
        values = self._grid_values_from_domain(domain)
        values[measure_field_name] = value
        values.setdefault("name", "Grid entry")
        self.create(values)
        return True

    def _grid_values_from_domain(self, domain):
        """Derive creation values from the domain of an empty cell.

        Equality leaves give the value directly. Date columns are expressed as
        a range, so the lower bound is taken as the date of the new record.
        """
        values = {}
        for leaf in domain:
            if not isinstance(leaf, (list, tuple)) or len(leaf) != 3:
                continue
            field_name, operator, leaf_value = leaf
            field = self._fields.get(field_name)
            if not field:
                continue
            if operator == "=":
                values[field_name] = leaf_value
            elif operator == ">=" and field.type in ("date", "datetime"):
                values[field_name] = leaf_value
        return values
