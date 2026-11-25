"use client";

import type { Person } from "../rules/team";

type Props = { id: string; ownerId: string | null; people: Pick<Person, "id" | "name">[]; label: string };

// The lead's owner menu. Picking a name saves it at once; the hidden button does the same without a mouse.
export function AssignSelect({ id, ownerId, people, label }: Props) {
  return (
    <>
      <input type="hidden" name="id" value={id} />
      <label htmlFor={`owner-${id}`} className="sr-only">
        Owner of {label}
      </label>
      <select
        id={`owner-${id}`}
        name="ownerId"
        className="field owner-select"
        defaultValue={ownerId ?? ""}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        <option value="">Unassigned</option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.name}
          </option>
        ))}
      </select>
      <button type="submit" className="sr-only">
        Save owner
      </button>
    </>
  );
}
