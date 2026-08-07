/** @odoo-module **/

export function useGridCell() {
    const updatePosition = (el, state) => {
        if (!el) return;
        state.top = el.offsetTop;
        state.left = el.offsetLeft;
        state.width = el.offsetWidth;
        state.height = el.offsetHeight;
    };

    return {updatePosition};
}
