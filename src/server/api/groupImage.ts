import { ApiError, okJson, withApiHandler } from "./helpers";

const UNSPLASH_ENDPOINT = "https://api.unsplash.com/photos/random";

const safeParseError = async (response: Response) => {
  try {
    const data = await response.json();
    if (Array.isArray(data?.errors)) {
      return data.errors.join(", ");
    }
    return data?.error ?? null;
  } catch {
    return null;
  }
};

export const fetchGroupImage = withApiHandler(async ({ req }) => {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query");

  if (!query) {
    throw new ApiError(400, "bad_request", "Missing query parameter.");
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    throw new ApiError(500, "internal_error", "Unsplash access key is not configured.");
  }

  const requestUrl = new URL(UNSPLASH_ENDPOINT);
  requestUrl.searchParams.set("query", query);
  requestUrl.searchParams.set("orientation", "landscape");
  requestUrl.searchParams.set("content_filter", "high");

  const response = await fetch(requestUrl.toString(), {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await safeParseError(response);
    throw new ApiError(response.status, "upstream_error", message ?? "Failed to fetch from Unsplash.");
  }

  const data = await response.json();
  return okJson({
    imageUrl: data?.urls?.small || data?.urls?.regular || null,
    photographer: data?.user?.name || null,
    profileUrl: data?.user?.links?.html || null,
  });
});
