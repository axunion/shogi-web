import { createRoot, createSignal } from "solid-js";
import { afterEach, describe, expect, it } from "vitest";
import { createFocusReturn } from "./focusReturn";

function button(label: string): HTMLButtonElement {
  const element = document.createElement("button");
  element.textContent = label;
  document.body.append(element);
  return element;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("createFocusReturn", () => {
  it("refocuses the element that had focus when the dialog opened", () => {
    const opener = button("opener");
    const inside = button("inside");
    opener.focus();

    createRoot((dispose) => {
      const [open, setOpen] = createSignal(false);
      const onCloseAutoFocus = createFocusReturn(open);

      setOpen(true);
      inside.focus();
      setOpen(false);
      const event = new Event("close", { cancelable: true });
      onCloseAutoFocus(event);

      expect(document.activeElement).toBe(opener);
      expect(event.defaultPrevented).toBe(true);
      dispose();
    });
  });

  it("leaves focus to the default when the opener is gone", () => {
    const opener = button("opener");
    opener.focus();

    createRoot((dispose) => {
      const [open, setOpen] = createSignal(false);
      const onCloseAutoFocus = createFocusReturn(open);

      setOpen(true);
      opener.remove();
      const event = new Event("close", { cancelable: true });
      onCloseAutoFocus(event);

      expect(event.defaultPrevented).toBe(false);
      dispose();
    });
  });

  it("refocuses the opener when unmounted while still open", async () => {
    const opener = button("opener");
    const inside = button("inside");
    opener.focus();

    createRoot((dispose) => {
      createFocusReturn(() => true);
      inside.focus();
      dispose();
    });
    await Promise.resolve();

    expect(document.activeElement).toBe(opener);
  });
});
