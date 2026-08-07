/** @odoo-module **/

import {onMounted, useRef} from "@odoo/owl";

export function useInputHook(params) {
    const inputRef = useRef("input");
    let isDirty = false;

    const parse = params.parse || ((v) => parseFloat(v) || 0);
    const format = params.format || ((v) => String(v));
    const onCommit = params.onCommit || (() => undefined);
    const onDiscard = params.onDiscard || (() => undefined);

    const commit = () => {
        if (!isDirty) return;
        const raw = inputRef.el ? inputRef.el.value : "";
        const parsed = parse(raw);
        onCommit(parsed);
        isDirty = false;
    };

    const discard = () => {
        if (inputRef.el) inputRef.el.value = format(params.value);
        isDirty = false;
        onDiscard();
    };

    const onInput = () => {
        isDirty = true;
    };
    const onKeydown = (ev) => {
        if (ev.key === "Enter" || ev.key === "Tab") {
            ev.preventDefault();
            ev.stopPropagation();
            commit();
            if (params.onNavigate) params.onNavigate(ev.key, ev.shiftKey);
        } else if (ev.key === "Escape") {
            ev.preventDefault();
            discard();
        }
    };

    onMounted(() => {
        if (inputRef.el) {
            inputRef.el.value = format(params.value);
            inputRef.el.focus();
            inputRef.el.select();
        }
    });

    return {inputRef, onInput, onKeydown, commit, discard};
}
