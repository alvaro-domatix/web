/** @odoo-module **/

import {KeepLast} from "@web/core/utils/concurrency";
import {Model} from "@web/model/model";
import {Domain} from "@web/core/domain";

const {DateTime} = luxon;

export class GridModel extends Model {
    setup(params, services) {
        super.setup(...arguments);
        this.orm = services.orm;
        this.keepLast = new KeepLast();
        this.sections = [];
        this.rows = [];
        this.columns = [];
        this.hasSections = false;
        this.anchor = DateTime.now();
        this.activeRange = null;
        this.ranges = [];
        this.showWeekends = true;

        // ModelParams comes from setup, not from load()
        const {archInfo, resModel, fields} = params;
        this.resModel = resModel;
        this.fields = fields;
        this.archInfo = archInfo;

        this.sectionFieldName = archInfo?.sectionField?.name || null;
        this.rowFieldNames = (archInfo?.rowFields || []).map((f) => f.name);
        this.columnFieldName = archInfo?.columnField?.name;
        this.measureFieldName = archInfo?.measureField?.name;
        this.measureOperator = archInfo?.measureField?.operator || "sum";
        this.readonlyFieldName = archInfo?.readonlyField?.name;

        const ranges = archInfo?.ranges || [];
        if (ranges.length) {
            this.ranges = ranges;
            this.activeRange = ranges.find((r) => r.isDefault) || ranges[0];
        }
    }

    async load(searchParams) {
        this._searchParams = searchParams;

        if (searchParams.context?.grid_anchor) {
            this.anchor = DateTime.fromISO(searchParams.context.grid_anchor);
        }

        await this.loadData();
    }

    _getSavedScale(params) {
        if (typeof localStorage !== "undefined" && params.viewId) {
            return localStorage.getItem(`scaleOf-viewId-${params.viewId}`);
        }
        return null;
    }

    _saveScale() {
        if (
            this._searchParams?.viewId &&
            this.activeRange &&
            typeof localStorage !== "undefined"
        ) {
            localStorage.setItem(
                `scaleOf-viewId-${this._searchParams.viewId}`,
                this.activeRange.name
            );
        }
    }

    setRange(rangeName) {
        const range = this.ranges.find((r) => r.name === rangeName);
        if (!range) return;
        this.activeRange = range;
        this._saveScale();
        return this.loadData();
    }

    moveAnchor(direction) {
        const step = this.activeRange.span;
        if (direction === "forward") {
            this.anchor = this.anchor.plus({[step]: 1});
        } else {
            this.anchor = this.anchor.minus({[step]: 1});
        }
        return this.loadData();
    }

    toggleWeekendVisibility() {
        this.showWeekends = !this.showWeekends;
        this.notify();
    }

    setTodayAnchor() {
        this.anchor = DateTime.now();
        return this.loadData();
    }

    get periodStart() {
        if (!this.activeRange) return this.anchor.startOf("day");
        const span = this.activeRange.span;
        if (span === "week") return this.anchor.startOf("week");
        return this.anchor.startOf(span);
    }

    get periodEnd() {
        if (!this.activeRange) return this.anchor.endOf("day");
        const span = this.activeRange.span;
        if (span === "week") return this.anchor.endOf("week");
        return this.anchor.endOf(span);
    }

    _generateDateColumns() {
        const columns = [];
        const step = this.activeRange.step;
        const span = this.activeRange.span;
        let current = this.periodStart;
        const end = this.periodEnd;
        const today = DateTime.now().toISODate();

        while (current <= end) {
            let colEnd = null;
            if (step === "month") {
                colEnd = current.endOf("month");
            } else {
                colEnd = current.endOf("day");
            }
            if (colEnd > end) colEnd = end;

            const startDate = current.toISODate();
            const endDate = colEnd.toISODate();
            const domain = [
                [this.columnFieldName, ">=", startDate],
                [this.columnFieldName, "<=", endDate],
            ];

            let label = "";
            if (span === "week" || span === "day") {
                label = current.toFormat("ccc dd", {locale: this._getLocale()});
            } else if (span === "month") {
                label = current.toFormat("dd", {locale: this._getLocale()});
            } else {
                label = current.toFormat("MMM", {locale: this._getLocale()});
            }

            columns.push({
                id: startDate,
                label,
                startDate,
                endDate,
                domain,
                isToday: today >= startDate && today <= endDate,
                grandTotal: 0,
                isWeekend: current.weekday > 5,
            });

            if (step === "month") {
                current = current.plus({months: 1});
            } else {
                current = current.plus({days: 1});
            }
        }
        return columns;
    }

    _getLocale() {
        return this._searchParams?.context?.lang?.replace("_", "-") || "en";
    }

    async loadData() {
        if (!this.activeRange) {
            this.notify();
            return;
        }
        await this.keepLast.add(this._fetchAndBuild());
        this.notify();
    }

    async _fetchAndBuild() {
        this.columns = this._generateDateColumns();

        const domain = [...this._searchParams.domain];
        const periodDomain = [
            [this.columnFieldName, ">=", this.periodStart.toISODate()],
            [this.columnFieldName, "<=", this.periodEnd.toISODate()],
        ];
        domain.push(...periodDomain);

        const groupby = [];
        const {step} = this.activeRange;
        const dateGroupby =
            step === "month"
                ? `${this.columnFieldName}:month`
                : `${this.columnFieldName}:day`;
        groupby.push(dateGroupby);
        this._dateGroupbyKey = dateGroupby;

        if (this.sectionFieldName) {
            groupby.push(this.sectionFieldName);
        }
        for (const rowField of this.rowFieldNames) {
            groupby.push(rowField);
        }

        const aggregates = [`${this.measureFieldName}:${this.measureOperator}`];
        if (this.readonlyFieldName) {
            aggregates.push(`${this.readonlyFieldName}:max`);
        }

        const result = await this.orm.formattedReadGroup(
            this.resModel,
            domain,
            groupby,
            aggregates,
            {}
        );

        this._buildGrid(result);
    }

    _buildGrid(readGroupResult) {
        const measureKey = `${this.measureFieldName}:${this.measureOperator}`;
        const columnMap = {};
        for (const col of this.columns) {
            columnMap[col.id] = col;
            col.grandTotal = 0;
        }

        const sectionMap = {};
        const rowMap = {};
        this.hasSections = Boolean(this.sectionFieldName);

        for (const group of readGroupResult) {
            const dateValue = group[this._dateGroupbyKey];
            const colId = this._extractDateId(dateValue);
            const column = columnMap[colId];
            if (!column) continue;

            const value = group[measureKey] || 0;
            column.grandTotal += value;

            let sectionKey = null;
            let sectionLabel = "";

            if (this.hasSections) {
                const sectionVal = group[this.sectionFieldName];
                if (sectionVal instanceof Array) {
                    sectionKey = sectionVal[0];
                    sectionLabel = sectionVal[1];
                } else {
                    sectionKey = sectionVal || 0;
                    sectionLabel = String(sectionVal);
                }
            }

            const rowParts = [];
            for (const rfName of this.rowFieldNames) {
                const rfVal = group[rfName];
                let partKey = "";
                let partLabel = "";
                if (rfVal instanceof Array) {
                    partKey = String(rfVal[0]);
                    partLabel = rfVal[1];
                } else {
                    partKey = String(rfVal || "");
                    partLabel = String(rfVal || "");
                }
                rowParts.push({name: rfName, key: partKey, label: partLabel});
            }
            const rowKey = rowParts.map((p) => p.key).join("||");
            const rowLabel = rowParts.map((p) => p.label).join(" · ");

            let section = null;
            if (this.hasSections) {
                if (!sectionMap[sectionKey]) {
                    sectionMap[sectionKey] = {
                        id: sectionKey,
                        label: sectionLabel,
                        rows: {},
                        grandTotal: 0,
                        cells: {},
                    };
                }
                section = sectionMap[sectionKey];
                section.grandTotal += value;
            }

            const targetRows = this.hasSections ? section.rows : rowMap;
            if (!targetRows[rowKey]) {
                targetRows[rowKey] = {
                    id: rowKey,
                    label: rowLabel,
                    parts: rowParts,
                    cells: {},
                    grandTotal: 0,
                    sectionId: this.hasSections ? sectionKey : null,
                };
            }
            const row = targetRows[rowKey];
            row.grandTotal += value;

            const cellDomain = Domain.and([
                this._searchParams.domain,
                column.domain,
                group.__domain || [],
            ]).toList();

            row.cells[colId] = {
                column,
                value,
                domain: cellDomain,
                readonly: false,
            };
        }

        if (this.hasSections) {
            this.sections = Object.values(sectionMap).sort((a, b) =>
                String(a.label).localeCompare(String(b.label))
            );
            for (const section of this.sections) {
                section.rows = Object.values(section.rows).sort((a, b) =>
                    String(a.label).localeCompare(String(b.label))
                );
            }
            this.rows = [];
        } else {
            this.rows = Object.values(rowMap).sort((a, b) =>
                String(a.label).localeCompare(String(b.label))
            );
            this.sections = [];
        }
    }

    _extractDateId(dateValue) {
        if (!dateValue) return null;
        if (typeof dateValue === "string") {
            return dateValue.split(" ")[0].split("T")[0];
        }
        if (dateValue instanceof Array) {
            const raw = String(dateValue[0] || "");
            return raw.split(" ")[0].split("T")[0];
        }
        return String(dateValue).split(" ")[0].split("T")[0];
    }

    async updateCell(rowId, columnId, value) {
        const row = this._findRow(rowId);
        if (!row) return;
        const cell = row.cells[columnId];
        if (!cell) return;

        const oldValue = cell.value;
        const delta = value - oldValue;
        if (delta === 0) return;

        const result = await this.orm.call(
            this.resModel,
            "grid_update_cell",
            [cell.domain, this.measureFieldName, delta],
            {context: this._searchParams.context}
        );

        cell.value = value;
        row.grandTotal += delta;
        const col = this.columns.find((c) => c.id === columnId);
        if (col) col.grandTotal += delta;

        return result;
    }

    _findRow(rowId) {
        if (this.hasSections) {
            for (const section of this.sections) {
                const row = section.rows.find((r) => r.id === rowId);
                if (row) return row;
            }
        } else {
            return this.rows.find((r) => r.id === rowId);
        }
        return null;
    }
}
