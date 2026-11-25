"use client";

import { Upload } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { type FormState, uploadBills } from "../app/actions";

// Dropped files go into the file input and the form sends itself, the same as choosing them.
function useDrop(
  form: React.RefObject<HTMLFormElement | null>,
  input: React.RefObject<HTMLInputElement | null>,
) {
  const [over, setOver] = useState(false);
  return {
    over,
    onDragOver: (event: React.DragEvent) => {
      event.preventDefault();
      setOver(true);
    },
    onDragLeave: () => setOver(false),
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
      setOver(false);
      if (!input.current || event.dataTransfer.files.length === 0) return;
      input.current.files = event.dataTransfer.files;
      form.current?.requestSubmit();
    },
  };
}

// Drop supplier PDFs here, or choose them. They upload as soon as they are dropped or chosen,
// and the assistant reads them in the background.
export function UploadBills() {
  const [state, action, pending] = useActionState<FormState, FormData>(uploadBills, {});
  const form = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const { over, ...dropHandlers } = useDrop(form, input);
  return (
    <form ref={form} action={action} className="upload">
      <label className="upload-drop" data-over={over || undefined} {...dropHandlers}>
        <Upload aria-hidden="true" />
        <span>
          <strong>{pending ? "Uploading..." : "Upload bills"}</strong>
          <span className="cell-sub">Drop PDFs here, or choose files</span>
        </span>
        <input
          ref={input}
          type="file"
          name="bills"
          accept="application/pdf"
          multiple
          className="sr-only"
          disabled={pending}
          onChange={() => form.current?.requestSubmit()}
        />
      </label>
      <p className="upload-status" aria-live="polite">
        {state.error ? <span className="form-error">{state.error}</span> : null}
        {state.done ? <span className="form-done">{state.done}</span> : null}
      </p>
    </form>
  );
}
