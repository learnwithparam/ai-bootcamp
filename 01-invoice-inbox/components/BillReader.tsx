"use client";

import { CircleAlert, ScanSearch } from "lucide-react";
import { type ReactNode, useState } from "react";
import type { Box, FieldCheck } from "../rules/locate";
import { PdfPage } from "./PdfPage";

type Props = {
  pdfUrl: string;
  fields: FieldCheck[];
  summary: string | null;
  before: ReactNode;
  children: ReactNode;
};

function FieldButton({ field, active, onPick }: { field: FieldCheck; active: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      className="read-field"
      aria-pressed={active}
      data-missing={field.box ? undefined : ""}
      onClick={onPick}
      onFocus={onPick}
    >
      <span className="read-label">{field.label}</span>
      <span className="read-value">{field.value}</span>
      {field.box ? null : (
        <span className="read-missing">
          <CircleAlert aria-hidden="true" /> Not found on the page
        </span>
      )}
    </button>
  );
}

// Groups the line fields by line, so the four values of one product sit together.
function groups(fields: FieldCheck[]) {
  const header = fields.filter((field) => !field.key.startsWith("line-"));
  const lines = new Map<string, FieldCheck[]>();
  for (const field of fields.filter((each) => each.key.startsWith("line-"))) {
    const line = field.key.split("-")[1] ?? "";
    lines.set(line, [...(lines.get(line) ?? []), field]);
  }
  return { header, lines: [...lines.values()] };
}

type ReadProps = {
  fields: FieldCheck[];
  summary: string | null;
  active: string | null;
  onPick: (key: string) => void;
};

function ReadPanel({ fields, summary, active, onPick }: ReadProps) {
  const { header, lines } = groups(fields);
  const field = (each: FieldCheck) => (
    <FieldButton key={each.key} field={each} active={active === each.key} onPick={() => onPick(each.key)} />
  );
  return (
    <section className="panel read-panel" aria-label="What the assistant read">
      <div className="panel-head">
        <h2>
          <ScanSearch aria-hidden="true" /> What the assistant read
        </h2>
        {summary ? <p className="cell-sub">{summary} Pick a field to see it on the bill.</p> : null}
      </div>
      <div className="panel-body read-fields">
        <div className="read-head">{header.map(field)}</div>
        {lines.map((line) => (
          <div key={line[0]?.key} className="read-line">
            {line.map(field)}
          </div>
        ))}
      </div>
    </section>
  );
}

// The bill as the supplier sent it, beside everything the assistant read from it.
// Pick a field and its spot on the page lights up, so a person checks the reading in a glance.
export function BillReader({ pdfUrl, fields, summary, before, children }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const marks = fields.flatMap((field) => (field.box ? [{ key: field.key, box: field.box as Box }] : []));
  return (
    <div className="bill-layout">
      <section className="bill-document" aria-label="The bill">
        <PdfPage url={pdfUrl} marks={marks} active={active} onPick={setActive} />
      </section>
      <div className="bill-side">
        {before}
        {fields.length ? (
          <ReadPanel fields={fields} summary={summary} active={active} onPick={setActive} />
        ) : null}
        {children}
      </div>
    </div>
  );
}
