import type { ChatStore } from '../modules/chat/store.js';
import type { Database } from '../infrastructure/database.js';
import type { Auth } from '../modules/auth/service.js';
import type { CampaignStore } from '../modules/campaigns/store.js';
import type { ProfileStore } from '../modules/profiles/store.js';

import type { ApplicationStore } from '../modules/applications/store.js';

export interface AppOptions {
  chat?: ChatStore;
  applications?: ApplicationStore;
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
