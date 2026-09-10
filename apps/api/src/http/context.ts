import type { Database } from '../infrastructure/database.js';
import type { Auth } from '../modules/auth/service.js';
import type { CampaignStore } from '../modules/campaigns/store.js';
import type { ProfileStore } from '../modules/profiles/store.js';

export interface AppOptions {
  database: Database;
  origins: string[];
  logger?: boolean;
  auth?: Auth;
  profiles?: ProfileStore;
  campaigns?: CampaignStore;
  authBaseUrl?: string;
  beforeClose?: () => Promise<void>;
}
export type AuthOptions = AppOptions & { auth: Auth; profiles: ProfileStore };
