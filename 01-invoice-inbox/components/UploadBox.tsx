"use client";

import { useActionState } from "react";

export type UploadState = { read: number; failed: string[] };
type Upload = (previous: UploadState, form: FormData) => Promise<UploadState>;

// Drop in one or more invoice PDFs. Each one is read by the model, then checked against its order.
export function UploadBox({ action }: { action: Upload }) {
  const [state, upload, reading] = useActionState(action, { read: 0, failed: [] });
  return (
    <form action={upload} className="upload">
      <label htmlFor="invoices" className="upload-label">
        Add supplier invoices
        <span>PDF files. The 20 samples are in 01-invoice-inbox/sample-invoices.</span>
      </label>
      <input id="invoices" name="invoices" type="file" accept="application/pdf" multiple required />
      <button type="submit" className="button button-primary" disabled={reading}>
        {reading ? "Reading..." : "Read and check"}
      </button>
      {state.read > 0 ? <p className="upload-done">Read {state.read} invoices.</p> : null}
      {state.failed.map((message) => (
        <p key={message} className="upload-failed" role="alert">
          {message}
        </p>
      ))}
    </form>
  );
}
