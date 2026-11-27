import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { $ } from "bun";
import { DATASET_URL } from "../rules/dataset";

// Fetches the dataset zip and unpacks it into a new, empty folder. Kaggle serves this dataset without
// an account today. If it asks for one, set KAGGLE_USERNAME and KAGGLE_KEY and the request signs in.

function signIn(): Record<string, string> {
  const { KAGGLE_USERNAME: user, KAGGLE_KEY: key } = process.env;
  return user && key ? { Authorization: `Basic ${btoa(`${user}:${key}`)}` } : {};
}

export async function downloadDataset(): Promise<string> {
  const response = await fetch(DATASET_URL, { headers: signIn(), signal: AbortSignal.timeout(300_000) });
  if (!response.ok) {
    throw new Error(
      `Kaggle answered ${response.status}. Create a free API token at kaggle.com/settings, ` +
        "add KAGGLE_USERNAME and KAGGLE_KEY to .env, then run setup again.",
    );
  }
  const folder = await mkdtemp(join(tmpdir(), "marketplace-"));
  const zip = join(folder, "dataset.zip");
  await Bun.write(zip, response);
  await $`unzip -q ${zip} -d ${join(folder, "files")}`;
  return folder;
}
