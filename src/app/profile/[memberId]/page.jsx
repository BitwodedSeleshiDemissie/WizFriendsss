"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "../../../components/ProtectedRoute";
import { AppDataProvider, useAppData } from "../../../context/AppDataContext";

function GroupSection({ title, groups, emptyMessage, badge }) {
  if (!groups || groups.length === 0) {
    return (
      <section className="space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">{title}</h3>
        <p className="text-sm text-gray-500">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">{title}</h3>
      <div className="space-y-3">
        {groups.map((group) => {
          const info = [group.baseLocation || "", group.cadence || ""].filter(Boolean).join(" - ");
          return (
            <div key={group.id} className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{group.name}</p>
                  {info && <p className="text-xs text-gray-500">{info}</p>}
                </div>
                {badge && (
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">{badge}</span>
                )}
              </div>
              {group.description && (
                <p className="mt-2 text-xs text-gray-500">{group.description}</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MemberProfileInner({ memberId }) {
  const router = useRouter();
  const { fetchGroupProfiles, groups, currentUserId } = useAppData();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!memberId) {
      setProfile(null);
      setError("Profile not found.");
      setLoading(false);
      return;
    }
    if (currentUserId && memberId === currentUserId) {
      router.replace("/app?tab=profile");
      return;
    }
    if (typeof fetchGroupProfiles !== "function") {
      setProfile(null);
      setError("Member directory is unavailable right now.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    fetchGroupProfiles([memberId])
      .then((profiles) => {
        if (cancelled) return;
        const data = profiles?.[memberId] ?? null;
        if (!data) {
          setProfile(null);
          setError("We couldn't find this profile.");
          return;
        }
        setProfile(data);
      })
      .catch(() => {
        if (cancelled) return;
        setProfile(null);
        setError("We couldn't load this profile. Please try again.");
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [memberId, fetchGroupProfiles, currentUserId, router]);

  const memberGroups = useMemo(() => {
    if (!memberId) return [];
    return groups.filter(
      (group) => Array.isArray(group.memberIds) && group.memberIds.includes(memberId)
    );
  }, [groups, memberId]);

  const sharedGroups = useMemo(() => {
    if (!currentUserId) return [];
    return memberGroups.filter(
      (group) => Array.isArray(group.memberIds) && group.memberIds.includes(currentUserId)
    );
  }, [memberGroups, currentUserId]);

  const sharedIds = useMemo(() => new Set(sharedGroups.map((group) => group.id)), [sharedGroups]);

  const otherGroups = useMemo(
    () => memberGroups.filter((group) => !sharedIds.has(group.id)),
    [memberGroups, sharedIds]
  );

  const avatarSrc = profile?.photoURL && profile.photoURL.length > 0 ? profile.photoURL : "/pics/1.jpg";
  const interests = Array.isArray(profile?.interests) ? profile.interests.filter(Boolean) : [];

  return (
    <main className="mx-auto w-full max-w-4xl space-y-8 px-6 pb-16 pt-24">
      <button
        type="button"
        onClick={() => router.back()}
        className="text-sm font-semibold text-indigo-600 transition hover:text-pink-500"
      >
        &larr; Back
      </button>
      <div className="rounded-3xl border border-white/70 bg-white/90 p-8 shadow-xl space-y-8">
        {loading ? (
          <p className="text-sm text-gray-500">Loading profile...</p>
        ) : error ? (
          <div className="space-y-4">
            <p className="text-sm text-red-500">{error}</p>
            <button
              type="button"
              onClick={() => router.push("/app?tab=messages")}
              className="rounded-full border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50"
            >
              Return to inbox
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-5">
                <div className="relative h-20 w-20 overflow-hidden rounded-3xl bg-indigo-100">
                  <Image src={avatarSrc} alt={profile?.name || "Community member"} fill className="object-cover" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{profile?.name || "Community member"}</h1>
                  {profile?.tagline && (
                    <p className="mt-1 text-sm text-gray-600">{profile.tagline}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                    {profile?.currentCity && (
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-500">
                        Based in {profile.currentCity}
                      </span>
                    )}
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-500">
                      {memberGroups.length} group{memberGroups.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => router.push("/app?tab=messages")}
                className="self-start rounded-full border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50"
              >
                Open inbox
              </button>
            </div>
            {interests.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {interests.slice(0, 12).map((interest) => (
                  <span key={interest} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                    #{interest}
                  </span>
                ))}
              </div>
            )}
            <GroupSection
              title="Shared spaces"
              groups={sharedGroups}
              emptyMessage="You do not share any groups yet."
              badge="Shared"
            />
            <GroupSection
              title="Their spaces"
              groups={otherGroups}
              emptyMessage="No additional groups listed yet."
            />
          </>
        )}
      </div>
    </main>
  );
}

export default function MemberProfilePage() {
  const params = useParams();
  const rawId = params?.memberId;
  const memberId = Array.isArray(rawId) ? rawId[0] : rawId;

  return (
    <ProtectedRoute>
      <AppDataProvider>
        <MemberProfileInner memberId={memberId ?? ""} />
      </AppDataProvider>
    </ProtectedRoute>
  );
}








