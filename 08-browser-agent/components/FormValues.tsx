import { FIELDS, type Field, type Form } from "../rules/email";
import { CopyButton } from "./CopyButton";

// The portal's own labels, so a person checks the agent's answers against the page beside them.
const LABEL: Record<Field, string> = {
  clientName: "Your name",
  clientEmail: "Email for our reply",
  otherSide: "The other side",
  goal: "What you want to happen",
  story: "Your message",
};

// Every answer the agent means to send. With copy buttons, a person sending by hand never retypes one.
export function FormValues({ form, copy = false }: { form: Form; copy?: boolean }) {
  return (
    <dl className="values">
      {FIELDS.map((field) => (
        <div key={field} className={field === "story" ? "value value-long" : "value"}>
          <dt>
            {LABEL[field]}
            {copy && form[field] ? <CopyButton text={form[field]} label={LABEL[field]} /> : null}
          </dt>
          <dd>{form[field] || <span className="value-empty">Not in the email</span>}</dd>
        </div>
      ))}
    </dl>
  );
}
