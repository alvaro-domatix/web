# Copyright 2026 Domatix
# License AGPL-3.0 or later (https://www.gnu.org/licenses/agpl).

from odoo import models


class Base(models.AbstractModel):
    _inherit = "base"

    def grid_update_cell(self, domain, measure_field_name, value):
        """Override to enable inline cell editing in grid views.

        Called when a cell value is modified in the grid. The default
        implementation raises NotImplementedError; override in your model
        to implement the actual update logic.

        :param list domain: domain of the cell to update
        :param str measure_field_name: name of the measure field
        :param float value: delta value (new value minus old value)
        :returns: truthy value triggers a client-side action on the cell
        """
        raise NotImplementedError(
            "grid_update_cell must be overridden to enable cell editing"
        )

    def grid_unavailability(self, start_date, end_date, groupby="", res_ids=()):
        """Return days to mark as unavailable in the grid.

        Override in your model to grey out certain days per record.

        :param str start_date: start of the period (date string)
        :param str end_date: end of the period (date string)
        :param str groupby: grouping field name
        :param tuple res_ids: record ids to filter
        :returns: dict mapping res_id to list of unavailable date strings
        """
        return {}
