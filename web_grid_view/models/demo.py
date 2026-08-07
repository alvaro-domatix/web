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
        if len(records) == 1:
            current = records[measure_field_name]
            records.write({measure_field_name: current + value})
            return True
        if len(records) > 1:
            first = records[0]
            first.copy({measure_field_name: first[measure_field_name] + value})
            return True
        self.create({measure_field_name: value})
        return True
