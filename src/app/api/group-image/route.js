"use server";

import { NextResponse } from "next/server";

const UNSPLASH_ENDPOINT = "https://api.unsplash.com/photos/random";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");

  if (!query) {
    return NextResponse.json(
      { error: "Missing query parameter" },
      { status: 400 }
    );
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!accessKey) {
    return NextResponse.json(
      { error: "Unsplash access key is not configured" },
      { status: 500 }
    );
  }

  const requestUrl = new URL(UNSPLASH_ENDPOINT);
  requestUrl.searchParams.set("query", query);
  requestUrl.searchParams.set("orientation", "landscape");
  requestUrl.searchParams.set("content_filter", "high");

  try {
    const response = await fetch(requestUrl.toString(), {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const message = await safeParseError(response);
      return NextResponse.json(
        { error: message || "Failed to fetch from Unsplash" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      imageUrl: data?.urls?.small || data?.urls?.regular || null,
      photographer: data?.user?.name || null,
      profileUrl: data?.user?.links?.html || null,
    });
  } catch (error) {
    console.error("Unsplash request failed", error);
    return NextResponse.json(
      { error: "Unable to reach Unsplash" },
      { status: 502 }
    );
  }
}

async function safeParseError(response) {
  try {
    const data = await response.json();
    return data?.errors?.join(", ") || data?.error || null;
  } catch {
    return null;
  }
}

