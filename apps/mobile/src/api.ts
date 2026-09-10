import {
  campaignListSchema,
  type Campaign,
  type DealType,
} from "@create-for-christ/contracts";

import { Platform } from "react-native";
import { authClient, apiUrl } from "./auth-client";
import {
  meSchema,
  ownProfileSchema,
  campaignInputSchema,
  campaignDetailSchema,
  campaignDetailListSchema,
  campaignImageInputSchema,
  type ProfileInput,
  type CampaignInput,
  type CampaignDetail,
} from "@create-for-christ/contracts";
export async function getCampaigns(
  deal: DealType | "all",
  signal: AbortSignal,
): Promise<Campaign[]> {
  const query = deal === "all" ? "" : `?dealType=${deal}`;
  const response = await fetch(`${apiUrl}/v1/campaigns${query}`, { signal });
  if (!response.ok)
    throw new Error("Die Kampagnen konnten gerade nicht geladen werden.");
  return campaignListSchema.parse(await response.json()).campaigns;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (Platform.OS !== "web") {
    headers.Cookie = (await authClient.getCookie()) ?? "";
    headers.Origin = "create-for-christ://";
  }
  return headers;
}
async function authenticatedRequest(
  path: string,
  method: "GET" | "POST" | "PUT",
  body?: unknown,
  signal?: AbortSignal,
) {
  const headers: Record<string, string> = {
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(await authHeaders()),
  };
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers,
    signal,
    credentials: Platform.OS === "web" ? "include" : "omit",
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok)
    throw new ApiError(
      response.status,
      typeof result.error === "string"
        ? result.error
        : "Die Anfrage ist fehlgeschlagen.",
    );
  return result;
}
export async function getMe(signal?: AbortSignal) {
  return meSchema.parse(
    await authenticatedRequest("/v1/me", "GET", undefined, signal),
  );
}
export async function saveProfile(input: ProfileInput) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    return ownProfileSchema.parse(
      await authenticatedRequest(
        "/v1/me/profile",
        "PUT",
        input,
        controller.signal,
      ),
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function getBrandCampaigns(signal?: AbortSignal) {
  return campaignDetailListSchema.parse(
    await authenticatedRequest("/v1/brand/campaigns", "GET", undefined, signal),
  ).campaigns;
}
export async function createCampaign(
  input: CampaignInput,
): Promise<CampaignDetail> {
  return campaignDetailSchema.parse(
    await authenticatedRequest(
      "/v1/brand/campaigns",
      "POST",
      campaignInputSchema.parse(input),
    ),
  );
}
export async function updateCampaign(
  id: string,
  input: CampaignInput,
): Promise<CampaignDetail> {
  return campaignDetailSchema.parse(
    await authenticatedRequest(
      `/v1/brand/campaigns/${id}`,
      "PUT",
      campaignInputSchema.parse(input),
    ),
  );
}
export async function publishCampaign(id: string): Promise<CampaignDetail> {
  return campaignDetailSchema.parse(
    await authenticatedRequest(`/v1/brand/campaigns/${id}/publish`, "POST"),
  );
}
export async function closeCampaign(id: string): Promise<CampaignDetail> {
  return campaignDetailSchema.parse(
    await authenticatedRequest(`/v1/brand/campaigns/${id}/close`, "POST"),
  );
}
export async function uploadCampaignImage(
  id: string,
  image: { mimeType: string; base64: string },
): Promise<CampaignDetail> {
  const parsed = campaignImageInputSchema.parse({
    mimeType: image.mimeType,
    data: image.base64,
  });
  return campaignDetailSchema.parse(
    await authenticatedRequest(
      `/v1/brand/campaigns/${id}/image`,
      "POST",
      parsed,
    ),
  );
}
