"use client";
import type { ChangeEvent } from "react";

/** The checkbox submits the existing same-origin, CSRF-guarded server action.
 * No second "Save" click is required. Form works without JS via fallback buttons. */
export default function CookieAutoSaveToggle({
  name, value, defaultChecked, className, "aria-label": ariaLabel,
}: {
  name: string;
  value: string;
  defaultChecked: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const form = event.currentTarget.form;
    const submit = form?.querySelector<HTMLButtonElement>('button[name="choice"][value="custom"]');
    if (!form || !submit) return;
    form.requestSubmit(submit);
  }
  return <input name={name} value={value} type="checkbox" defaultChecked={defaultChecked}
    onChange={onChange} aria-label={ariaLabel} className={className} />;
}
