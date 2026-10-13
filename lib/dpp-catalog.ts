import catalogData from "./dpp-catalog-data.json";
import type { DPPSnapshot } from "./dpp-progress";
export { DPP_BATCH_ID } from "./dpp-progress";

// This is Ansh's captured course inventory, not a current live PW response.
// Its completion counters must be labelled as a captured snapshot in the UI.
export const dppCatalog = catalogData.snapshot as DPPSnapshot;
export const dppCatalogSubjects: string[] = catalogData.subjects;
export const DPP_CATALOG_SOURCE_NOTE = "Captured from Ansh's signed-in PW course on 13 October 2026. New DPPs may be released as units finish.";
