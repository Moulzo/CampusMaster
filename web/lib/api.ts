// Alias vers les fonctions existantes dans lib/auth pour éviter les duplications
import { apiFetchJson } from "./auth";

export const apiGet = apiFetchJson;
