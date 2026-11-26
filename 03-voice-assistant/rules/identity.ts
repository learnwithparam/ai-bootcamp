// Who may hear or cancel an appointment on the phone. A phone number alone is not enough: anyone who knows
// a patient's number could hear when they are coming and cancel it. The caller gives the name the appointment
// was booked under as well, as a receptionist would ask. Speech to text may drop or add a first name, so the
// family name decides, and it must match in full.

function words(name: string): string[] {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z\s'-]/g, "")
    .split(/[\s-]+/)
    .filter(Boolean);
}

// True when the name said on the call is the name the appointment was booked under.
export function sameCaller(bookedName: string, saidName: string): boolean {
  const booked = words(bookedName);
  const said = words(saidName);
  if (booked.length === 0 || said.length === 0) return false;
  return booked.at(-1) === said.at(-1);
}
