"use client";

import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { StatusChip } from "@bootcamp/ui/parts";
import type { ListCouponsOutput } from "../agent/tools/list-coupons";
import type { LoadSkillOutput } from "../agent/tools/load-skill";
import type { RecentAccountsOutput } from "../agent/tools/recent-accounts";
import type { SaveDraftOutput } from "../agent/tools/save-newsletter-draft";
import type { SignupsOutput } from "../agent/tools/signups-by-day";
import { SignupsChart } from "./SignupsChart";

// The cards the assistant draws. Each tool's output is shown as a screen, not pasted into the reply.

export const SkillCard: ToolCallMessagePartComponent = ({ args, result }) => {
  const output = result as LoadSkillOutput | undefined;
  return (
    <div className="skill-chip">
      Loaded the <strong>{String(args?.name ?? "")}</strong> skill
      {output && "tools" in output ? <span className="hint"> ({output.tools.join(", ")})</span> : null}
    </div>
  );
};

export const SignupsCard: ToolCallMessagePartComponent = ({ args, result, status }) => {
  const output = result as SignupsOutput | undefined;
  return (
    <div className="card">
      <div className="card-head">
        <span className="label">Signups, last {String(args?.days ?? "")} days</span>
        {output ? <span className="total">{output.total} in total</span> : null}
        <StatusChip running={status.type === "running"} />
      </div>
      <div className="card-body">{output ? <SignupsChart days={output.days} /> : null}</div>
    </div>
  );
};

export const AccountsCard: ToolCallMessagePartComponent = ({ result, status }) => {
  const output = result as RecentAccountsOutput | undefined;
  return (
    <div className="card">
      <div className="card-head">
        <span className="label">Newest accounts</span>
        <StatusChip running={status.type === "running"} />
      </div>
      <table className="card-body rows">
        <tbody>
          {output?.accounts.map((account) => (
            <tr key={account.email}>
              <td>{account.name}</td>
              <td>{account.email}</td>
              <td className="hint">{account.signedUpAt.slice(0, 16).replace("T", " ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const DraftCard: ToolCallMessagePartComponent = ({ result, status }) => {
  const output = result as SaveDraftOutput | undefined;
  return (
    <div className="card">
      <div className="card-head">
        <span className="label">Draft saved</span>
        <StatusChip running={status.type === "running"} />
      </div>
      {output ? (
        <div className="card-body">
          <p>
            <strong>{output.subject}</strong>
          </p>
          <a href="/log">Read it under Drafts and changes</a>
        </div>
      ) : null}
    </div>
  );
};

export const CodesCard: ToolCallMessagePartComponent = ({ result, status }) => {
  const output = result as ListCouponsOutput | undefined;
  return (
    <details className="card thinking">
      <summary className="card-head">
        <span className="label">Discount codes in Stripe</span>
        <span>{output ? `${output.codes.length} found` : ""}</span>
        <StatusChip running={status.type === "running"} />
      </summary>
      <table className="card-body rows">
        <tbody>
          {output?.codes.map((code) => (
            <tr key={code.code}>
              <td>
                <code>{code.code}</code>
              </td>
              <td>{code.percentOff === null ? "" : `${code.percentOff}% off`}</td>
              <td>{code.duration === "repeating" ? `${code.months} months` : code.duration}</td>
              <td className="hint">{code.active ? `used ${code.timesUsed} times` : "switched off"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
};
