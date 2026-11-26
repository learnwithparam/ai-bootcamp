"use client";

import { ALLERGEN_WORDS, ALLERGENS, type Allergen } from "../rules/catalog";
import { chips, type Profile, withAllergen, withoutChip } from "../rules/profile";

// Only the allergies the shopper has not told us about yet.
function AddAllergy({ profile, onChange }: { profile: Profile; onChange: (profile: Profile) => void }) {
  return (
    <select
      aria-label="Add an allergy"
      value=""
      onChange={(event) => onChange(withAllergen(profile, event.target.value as Allergen))}
    >
      <option value="">Add an allergy</option>
      {ALLERGENS.filter((one) => !profile.avoid.includes(one)).map((one) => (
        <option key={one} value={one}>
          {ALLERGEN_WORDS[one]}
        </option>
      ))}
    </select>
  );
}

// What the shop believes about the shopper, as chips they can take away or add to.
// A change here hides products at once; "Lay out my page again" asks the agent to rearrange for it.
export function ProfileChips(props: {
  profile: Profile;
  edited: boolean;
  running: boolean;
  onChange: (profile: Profile) => void;
  onRebuild: () => void;
}) {
  const { profile, edited, running, onChange, onRebuild } = props;
  const shown = chips(profile);
  return (
    <section className="chips" aria-label="What we know about you">
      <p className="chips-title">What we know about you</p>
      {shown.length === 0 && (
        <p className="chips-empty">Nothing yet. Tell us above, or add an allergy here.</p>
      )}
      <ul>
        {shown.map((chip) => (
          <li key={chip.key} className="belief">
            {chip.label}
            <button
              type="button"
              aria-label={`Remove ${chip.label}`}
              onClick={() => onChange(withoutChip(profile, chip.key))}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <AddAllergy profile={profile} onChange={onChange} />
      {edited && (
        <button type="button" className="button button-quiet" disabled={running} onClick={onRebuild}>
          Lay out my page again
        </button>
      )}
    </section>
  );
}
