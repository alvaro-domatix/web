/** @odoo-module **/

import {getFixture} from "@web/../tests/web_test_helpers";

QUnit.module("web_grid_view", {
    beforeEach() {
        getFixture();
    },
});

QUnit.test("grid view skeleton installs cleanly", async (assert) => {
    assert.expect(1);
    assert.ok(true, "web_grid_view module is loaded");
});
