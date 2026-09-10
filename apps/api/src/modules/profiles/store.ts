import {
  ownProfileSchema,
  ROLE,
  type OwnProfile,
  type ProfileInput,
} from "@create-for-christ/contracts";
import type pg from "pg";
import { transaction } from "../../infrastructure/transaction.js";

export class ProfileConflict extends Error {}
export interface ProfileStore {
  get(userId: string): Promise<OwnProfile | null>;
  save(userId: string, input: ProfileInput): Promise<OwnProfile>;
}
export function createProfileStore(pool: pg.Pool): ProfileStore {
  async function get(userId: string): Promise<OwnProfile | null> {
    const {
      rows: [row],
    } = await pool.query(
      `
      SELECT p.id, p.role, p.display_name, c.bio, c.instagram_handle, c.location AS creator_location,
        c.languages, c.topics, c.deal_preferences, c.portfolio_urls,
        b.name AS brand_name, b.description, b.website, b.industry, b.location AS brand_location
      FROM auth_identities a JOIN profiles p ON p.id = a.profile_id
      LEFT JOIN creator_profiles c ON c.profile_id = p.id
      LEFT JOIN brand_members bm ON bm.profile_id = p.id AND bm.role = 'owner'
      LEFT JOIN brands b ON b.id = bm.brand_id
      WHERE a.provider = 'better-auth' AND a.subject = $1`,
      [userId],
    );
    if (!row) return null;
    return ownProfileSchema.parse({
      id: row.id,
      details:
        row.role === ROLE.creator
          ? {
              role: ROLE.creator,
              displayName: row.display_name,
              bio: row.bio,
              instagramHandle: row.instagram_handle,
              location: row.creator_location,
              languages: row.languages,
              topics: row.topics,
              dealPreferences: row.deal_preferences,
              portfolioUrls: row.portfolio_urls,
            }
          : {
              role: ROLE.brand,
              displayName: row.display_name,
              brandName: row.brand_name,
              description: row.description,
              website: row.website,
              industry: row.industry,
              location: row.brand_location,
            },
    });
  }
  return {
    get,
    async save(userId, input) {
      return transaction(pool, async (client) => {
        // Serialize onboarding for this authenticated account, including first creation.
        const { rowCount } = await client.query(
          "SELECT id FROM auth_users WHERE id=$1 FOR UPDATE",
          [userId],
        );
        if (!rowCount) throw new ProfileConflict("Account no longer exists");
        const {
          rows: [existing],
        } = await client.query(
          `SELECT p.id,p.role FROM profiles p
          JOIN auth_identities a ON a.profile_id=p.id WHERE a.provider='better-auth' AND a.subject=$1`,
          [userId],
        );
        if (existing && existing.role !== input.role)
          throw new ProfileConflict(
            "Die Rolle kann nach dem Onboarding nicht geändert werden.",
          );
        let id: string = existing?.id;
        if (!id) {
          const {
            rows: [created],
          } = await client.query(
            "INSERT INTO profiles(display_name,role) VALUES ($1,$2) RETURNING id",
            [input.displayName, input.role],
          );
          id = created.id;
          await client.query(
            "INSERT INTO auth_identities(provider,subject,profile_id) VALUES ('better-auth',$1,$2)",
            [userId, id],
          );
        } else {
          await client.query(
            "UPDATE profiles SET display_name=$1,updated_at=now() WHERE id=$2",
            [input.displayName, id],
          );
        }
        if (input.role === ROLE.creator) {
          await client.query(
            `INSERT INTO creator_profiles(profile_id,bio,instagram_handle,location,languages,topics,deal_preferences,portfolio_urls)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (profile_id) DO UPDATE SET
              bio=EXCLUDED.bio,instagram_handle=EXCLUDED.instagram_handle,location=EXCLUDED.location,
              languages=EXCLUDED.languages,topics=EXCLUDED.topics,deal_preferences=EXCLUDED.deal_preferences,portfolio_urls=EXCLUDED.portfolio_urls`,
            [
              id,
              input.bio,
              input.instagramHandle,
              input.location,
              input.languages,
              input.topics,
              input.dealPreferences,
              input.portfolioUrls,
            ],
          );
        } else {
          const {
            rows: [membership],
          } = await client.query(
            "SELECT brand_id FROM brand_members WHERE profile_id=$1 AND role='owner'",
            [id],
          );
          if (membership) {
            await client.query(
              "UPDATE brands SET name=$1,description=$2,website=$3,industry=$4,location=$5 WHERE id=$6",
              [
                input.brandName,
                input.description,
                input.website,
                input.industry,
                input.location,
                membership.brand_id,
              ],
            );
          } else {
            const {
              rows: [brand],
            } = await client.query(
              "INSERT INTO brands(name,description,website,industry,location) VALUES ($1,$2,$3,$4,$5) RETURNING id",
              [
                input.brandName,
                input.description,
                input.website,
                input.industry,
                input.location,
              ],
            );
            await client.query(
              "INSERT INTO brand_members(brand_id,profile_id,role) VALUES ($1,$2,'owner')",
              [brand.id, id],
            );
          }
        }
        return { id, details: input };
      });
    },
  };
}
