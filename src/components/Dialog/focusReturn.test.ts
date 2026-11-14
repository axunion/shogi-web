import { createRoot, createSignal } from "solid-js";
import { afterEach, describe, expect, it } from "vitest";
import { createFocusReturn } from "./focusReturn";

function button(label: string): HTMLButtonElement {
  const element = document.createElement("button");
  element.textContent = label;
  document.body.append(element);
  return element;
}

function closeEvent(): Event {
  return new Event("close", { cancelable: true });
}

// Runs `fn` in a reactive root that is disposed even if an assertion throws.
function inRoot(fn: () => void) {
  createRoot((dispose) => {
    try {
      fn();
    } finally {
      dispose();
    }
  });
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("createFocusReturn", () => {
  it("refocuses the element that had focus when the dialog opened", () => {
    const opener = button("opener");
    const inside = button("inside");
    opener.focus();

    inRoot(() => {
      const [open, setOpen] = createSignal(false);
      const onCloseAutoFocus = createFocusReturn(open);

      setOpen(true);
      inside.focus();
      setOpen(false);
      const event = closeEvent();
      onCloseAutoFocus(event);

      expect(document.activeElement).toBe(opener);
      expect(event.defaultPrevented).toBe(true);
    });
  });

  it("returns to the latest opener when reopened from another element", () => {
    const first = button("first");
    const second = button("second");
    const inside = button("inside");

    inRoot(() => {
      const [open, setOpen] = createSignal(false);
      const onCloseAutoFocus = createFocusReturn(open);

      first.focus();
      setOpen(true);
      inside.focus();
      setOpen(false);
      onCloseAutoFocus(closeEvent());

      second.focus();
      setOpen(true);
      inside.focus();
      setOpen(false);
      onCloseAutoFocus(closeEvent());

      expect(document.activeElement).toBe(second);
    });
  });

  it("leaves focus to the default when the opener is gone", () => {
    const opener = button("opener");
    opener.focus();

    inRoot(() => {
      const [open, setOpen] = createSignal(false);
      const onCloseAutoFocus = createFocusReturn(open);

      setOpen(true);
      opener.remove();
      const event = closeEvent();
      onCloseAutoFocus(event);

      expect(event.defaultPrevented).toBe(false);
      expect(document.activeElement).not.toBe(opener);
    });
  });

  it("uses the fallback when the opener is gone", () => {
    const opener = button("opener");
    const fallback = button("fallback");
    opener.focus();

    inRoot(() => {
      const [open, setOpen] = createSignal(false);
      const onCloseAutoFocus = createFocusReturn(open, () => fallback);

      setOpen(true);
      opener.remove();
      const event = closeEvent();
      onCloseAutoFocus(event);

      expect(document.activeElement).toBe(fallback);
      expect(event.defaultPrevented).toBe(true);
    });
  });

  it("uses the fallback when nothing had focus at open", () => {
    const fallback = button("fallback");

    inRoot(() => {
      const [open, setOpen] = createSignal(false);
      const onCloseAutoFocus = createFocusReturn(open, () => fallback);

      setOpen(true);
      onCloseAutoFocus(closeEvent());

      expect(document.activeElement).toBe(fallback);
    });
  });
});
