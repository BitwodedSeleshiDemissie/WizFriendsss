import type { GeoPoint, Timestamp } from "firebase-admin/firestore";

export type AppRole = "user" | "moderator" | "customer_service" | "admin";

export interface UserDoc {
  email: string;
  name: string;
  avatarUrl?: string;
  homeCity?: string;
  currentCity?: string;
  interests: string[];
  role: AppRole;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface GroupDoc {
  name: string;
  description: string;
  city: string;
  isPublic: boolean;
  bannerUrl?: string;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type GroupMemberRole = "member" | "moderator" | "owner";

export interface GroupMemberDoc {
  groupId: string;
  userId: string;
  role: GroupMemberRole;
  joinedAt: Timestamp;
}

export type ActivityVisibility = "public" | "group_only" | "private";

export interface ActivityDoc {
  title: string;
  description: string;
  category?: string;
  startTime: Timestamp;
  endTime: Timestamp;
  city: string;
  point: GeoPoint;
  geohash: string;
  locationName?: string;
  address?: string;
  hostUserId?: string;
  hostGroupId?: string;
  visibility: ActivityVisibility;
  maxAttendees?: number;
  isFeatured: boolean;
  featuredAdId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type ActivityJoinStatus = "joined" | "waitlist" | "canceled";

export interface UserActivityJoinDoc {
  activityId: string;
  userId: string;
  status: ActivityJoinStatus;
  joinedAt: Timestamp;
}

export interface UserActivitySaveDoc {
  activityId: string;
  userId: string;
  savedAt: Timestamp;
}

export interface PostDoc {
  activityId: string;
  authorUserId: string;
  content: string;
  mediaUrls: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type IdeaStatus = "open" | "converted" | "archived";

export interface IdeaDoc {
  promptText: string;
  aiSuggestion?: string;
  city: string;
  proposedPoint?: GeoPoint;
  proposedGeohash?: string;
  proposedTimeWindow?: {
    start?: Timestamp;
    end?: Timestamp;
  };
  createdBy: string;
  endorsementCount: number;
  endorsementThreshold: number;
  status: IdeaStatus;
  convertedActivityId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface IdeaEndorseDoc {
  ideaId: string;
  userId: string;
  endorsedAt: Timestamp;
}

export type SponsorType = "advertiser" | "student_club";

export type FeaturedAdStatus = "draft" | "pending_review" | "active" | "rejected" | "expired";

export interface FeaturedAdDoc {
  activityId: string;
  sponsorType: SponsorType;
  sponsorId: string;
  status: FeaturedAdStatus;
  startsAt: Timestamp;
  endsAt: Timestamp;
  paymentRef?: string;
  createdBy: string;
  approvedByCsUserId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AdvertiserDoc {
  name: string;
  billingEmail: string;
  stripeCustomerId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface StudentClubDoc {
  name: string;
  institution: string;
  contactEmail: string;
  createdAt: Timestamp;
}

export interface AdAppearsDoc {
  adId: string;
  groupId: string;
}

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

export interface TicketDoc {
  userId: string;
  subject: string;
  message: string;
  status: TicketStatus;
  assignedCsUserId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface UserDeviceDoc {
  userId: string;
  deviceId: string;
  fcmToken: string;
  updatedAt: Timestamp;
}
