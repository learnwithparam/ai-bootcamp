"use client";

import { CheckCheck, CircleDollarSign } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import type { FormState } from "../app/actions";
import { approveBills, recordPayment } from "../app/approve-actions";
import { BillPill } from "./BillPill";
import type { BillRow } from "./rows";

type Bulk = "approve" | "pay" | null;

const BULK = {
  approve: { action: approveBills, label: "Approve", Icon: CheckCheck },
  pay: { action: recordPayment, label: "Record as paid", Icon: CircleDollarSign },
} as const;

type RowProps = { row: BillRow; selectable: boolean; checked: boolean; onToggle: () => void };

function Row({ row, selectable, checked, onToggle }: RowProps) {
  return (
    <tr aria-selected={selectable ? checked : undefined}>
      {selectable ? (
        <td className="select-cell">
          <input
            type="checkbox"
            name="ids"
            value={row.id}
            checked={checked}
            onChange={onToggle}
            aria-label={`Select bill ${row.number}`}
          />
        </td>
      ) : null}
      <td>
        <Link href={`/bills/${row.id}`} className="row-link">
          {row.number}
        </Link>
        {row.note ? <span className="cell-sub bill-note">{row.note}</span> : null}
      </td>
      <td>{row.billedTo}</td>
      <td className="num">
        {row.amount}
        {row.paying ? <span className="cell-sub">Paying {row.paying}</span> : null}
      </td>
      <td>{row.received}</td>
      <td className={row.due?.overdue ? "due-overdue" : undefined}>{row.due?.text ?? ""}</td>
      <td>
        <BillPill status={row.status} />
      </td>
    </tr>
  );
}

type BarProps = { run: (typeof BULK)[keyof typeof BULK]; picked: number; pending: boolean; state: FormState };

function BulkBar({ run, picked, pending, state }: BarProps) {
  return (
    <div className="bulk-bar" aria-live="polite">
      <span>{picked ? `${picked} selected` : "Select bills to move them on together."}</span>
      <button type="submit" className="button" disabled={pending || picked === 0}>
        <run.Icon aria-hidden="true" /> {run.label}
      </button>
      {state.error ? <span className="form-error">{state.error}</span> : null}
      {state.done ? <span className="form-done">{state.done}</span> : null}
    </div>
  );
}

function HeadRow({
  selectable,
  all,
  onToggleAll,
}: {
  selectable: boolean;
  all: boolean;
  onToggleAll: () => void;
}) {
  return (
    <tr>
      {selectable ? (
        <th className="select-cell">
          <input type="checkbox" checked={all} onChange={onToggleAll} aria-label="Select every bill" />
        </th>
      ) : null}
      <th>Bill</th>
      <th>Billed to</th>
      <th className="num">Amount</th>
      <th>Received</th>
      <th>Due</th>
      <th>Status</th>
    </tr>
  );
}

// The worklist. On the approval and payment queues an approver ticks bills and moves them on together.
export function BillTable({ rows, bulk }: { rows: BillRow[]; bulk: Bulk }) {
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const run = bulk ? BULK[bulk] : null;
  const [state, action, pending] = useActionState(run?.action ?? (async (): Promise<FormState> => ({})), {});
  const toggle = (id: string) =>
    setPicked((now) => {
      const next = new Set(now);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const all = rows.length > 0 && rows.every((row) => picked.has(row.id));
  return (
    <form action={action} className="bills-form">
      {run ? <BulkBar run={run} picked={picked.size} pending={pending} state={state} /> : null}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <HeadRow
              selectable={Boolean(run)}
              all={all}
              onToggleAll={() => setPicked(all ? new Set() : new Set(rows.map((row) => row.id)))}
            />
          </thead>
          <tbody>
            {rows.map((row) => (
              <Row
                key={row.id}
                row={row}
                selectable={Boolean(run)}
                checked={picked.has(row.id)}
                onToggle={() => toggle(row.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </form>
  );
}
