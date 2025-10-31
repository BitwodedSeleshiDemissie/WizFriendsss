"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "../../../components/ProtectedRoute";
import { AppDataProvider, useAppData } from "../../../context/AppDataContext";

function GroupSection({ title, groups, emptyMessage, badge }) {
  const hasGroups = Array.isArray(groups) && groups.length > 0;

  return (
    <section className="rounded-3xl border border-gray-100 bg-white/80 p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500">{title}</h3>
        {badge ? (
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">{badge}</span>
        ) : null}
      </div>
      {hasGroups ? (
        <div className="mt-4 space-y-4">
          {groups.map((group) => {
            const info = [group.baseLocation || "", group.cadence || ""].filter(Boolean).join(" - ");
            return (
              <article
                key={group.id}
                className="rounded-2xl border border-indigo-100/70 bg-white/70 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{group.name}</p>
                    {info && <p className="mt-1 text-xs text-gray-500">{info}</p>}
                  </div>
                  {typeof group.membersCount === "number" && (
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-500">
                      {group.membersCount}+ members
                    </span>
                  )}
                </div>
                {group.description && (
                  <p className="mt-3 text-xs leading-relaxed text-gray-500">{group.description}</p>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-6 text-sm text-gray-500">{emptyMessage}</p>
      )}
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

  const completionPercent = useMemo(() => {
    const raw = Number(profile?.profileCompletion ?? 0);
    if (!Number.isFinite(raw)) return 0;
    return Math.min(100, Math.max(0, Math.round(raw)));
  }, [profile?.profileCompletion]);

  const memberSinceLabel = useMemo(() => {
    if (!profile?.createdAt) return "";
    const date = new Date(profile.createdAt);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(date);
  }, [profile?.createdAt]);

  const websiteHref = useMemo(() => {
    if (!profile?.website) return "";
    if (/^https?:\/\//i.test(profile.website)) {
      return profile.website;
    }
    return `https://${profile.website}`;
  }, [profile?.website]);

  const detailItems = useMemo(() => {
    const items = [
      { label: "Current City", value: profile?.currentCity },
      { label: "From", value: profile?.homeCity },
      { label: "Member Since", value: memberSinceLabel },
      profile?.email
        ? { label: "Email", value: profile.email, type: "link", href: `mailto:${profile.email}` }
        : null,
      profile?.phone ? { label: "Phone", value: profile.phone } : null,
      profile?.pronouns ? { label: "Pronouns", value: profile.pronouns } : null,
      profile?.role ? { label: "Role", value: profile.role } : null,
      profile?.website
        ? { label: "Website", value: profile.website, type: "link", href: websiteHref }
        : null,
    ].filter(Boolean);
    return items;
  }, [profile, memberSinceLabel, websiteHref]);

  const stats = useMemo(
    () => [
      { label: "Shared Groups", value: sharedGroups.length },
      { label: "Their Groups", value: otherGroups.length },
      { label: "Interests", value: interests.length },
      { label: "Profile Complete", value: `${completionPercent}%` },
    ],
    [sharedGroups.length, otherGroups.length, interests.length, completionPercent]
  );

  const aboutText =
    profile?.bio?.trim() ||
    profile?.about?.trim() ||
    profile?.tagline?.trim() ||
    "This member hasn't added a bio yet.";

  const primaryLocation = profile?.currentCity || profile?.homeCity || "";
  const firstName = useMemo(() => {
    if (!profile?.name) return "member";
    return profile.name.trim().split(/\s+/)[0] || "member";
  }, [profile?.name]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-24 lg:px-0">
      <button
        type="button"
        onClick={() => router.back()}
        className="text-sm font-semibold text-indigo-600 transition hover:text-pink-500"
      >
        &larr; Back to directory
      </button>
      <div className="mt-6 overflow-hidden rounded-3xl border border-white/70 bg-white/90 shadow-2xl backdrop-blur">
        {loading ? (
          <div className="px-8 py-12">
            <p className="text-sm text-gray-500">Loading profile...</p>
          </div>
        ) : error ? (
          <div className="space-y-4 px-8 py-12">
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
            <div className="relative bg-gradient-to-r from-indigo-700 via-purple-600 to-pink-500 px-8 py-10 text-white">
              <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_top,_rgba(255,255,255,0.25),_transparent_65%)]" />
              <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-6">
                  <div className="relative h-28 w-28 overflow-hidden rounded-3xl border-4 border-white/40 bg-white/20 md:h-32 md:w-32">
                    <Image
                      src={avatarSrc}
                      alt={profile?.name || "Community member"}
                      fill
                      sizes="128px"
                      className="object-cover"
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.35em] text-white/70">
                      <span>Community Member</span>
                      {profile?.role && <span>{profile.role}</span>}
                    </div>
                    <h1 className="text-3xl font-bold md:text-4xl">{profile?.name || "Community member"}</h1>
                    {profile?.tagline && (
                      <p className="max-w-xl text-sm text-white/85 md:text-base">{profile.tagline}</p>
                    )}
                    <div className="flex flex-wrap gap-2 text-xs font-semibold text-white/90">
                      {primaryLocation && (
                        <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">
                          {profile?.currentCity ? `Based in ${profile.currentCity}` : `From ${profile?.homeCity}`}
                        </span>
                      )}
                      <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">
                        {memberGroups.length} group{memberGroups.length === 1 ? "" : "s"}
                      </span>
                      {sharedGroups.length > 0 && (
                        <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur">
                          {sharedGroups.length} shared
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-10 px-8 pb-10 pt-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <section className="space-y-6">
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.35em] text-gray-500">About</h2>
                  <p className="text-base leading-relaxed text-gray-600">{aboutText}</p>
                </div>

                {detailItems.length > 0 && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {detailItems.map((item) => (
                      <div key={item.label} className="rounded-2xl border border-gray-100 bg-white/80 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-indigo-500">
                          {item.label}
                        </p>
                        {item.type === "link" ? (
                          <a
                            href={item.href}
                            target={item.label === "Website" ? "_blank" : "_self"}
                            rel={item.label === "Website" ? "noreferrer" : undefined}
                            className="mt-2 block text-sm font-medium text-gray-800 underline-offset-4 hover:underline"
                          >
                            {item.value}
                          </a>
                        ) : (
                          <p className="mt-2 text-sm font-medium text-gray-800">{item.value}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {interests.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.35em] text-gray-500">Interests</h3>
                    <div className="flex flex-wrap gap-2">
                      {interests.slice(0, 18).map((interest) => (
                        <span
                          key={interest}
                          className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600"
                        >
                          #{interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <aside className="space-y-6 rounded-3xl border border-indigo-100 bg-white/90 p-6 shadow-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500">
                    Profile completion
                  </p>
                  <div className="mt-3 flex items-center justify-between text-sm font-semibold text-gray-600">
                    <span>Progress</span>
                    <span>{completionPercent}%</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-pink-500"
                      style={{ width: `${completionPercent}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-pink-50/80 p-4 text-center shadow-inner"
                    >
                      <p className="text-2xl font-bold text-indigo-600">{stat.value}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.35em] text-indigo-500">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 rounded-2xl border border-gray-100 bg-white/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gray-500">Stay in touch</p>
                  <p className="text-sm text-gray-600">
                    Continue the conversation or invite {firstName} to join one of your spaces.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push("/app?tab=messages")}
                    className="w-full rounded-full bg-gradient-to-r from-indigo-600 to-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
                  >
                    Open inbox
                  </button>
                </div>
              </aside>
            </div>

            <div className="border-t border-gray-100 bg-white/70 px-8 py-10">
              <div className="grid gap-6 lg:grid-cols-2">
                <GroupSection
                  title="Shared spaces"
                  groups={sharedGroups}
                  emptyMessage="You do not share any groups yet."
                  badge={sharedGroups.length > 0 ? "Shared" : undefined}
                />
                <GroupSection
                  title="Their spaces"
                  groups={otherGroups}
                  emptyMessage="No additional groups listed yet."
                />
              </div>
            </div>
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
