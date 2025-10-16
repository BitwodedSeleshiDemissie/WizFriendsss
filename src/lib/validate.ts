import { z } from "zod";

export const createActivitySchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  category: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  city: z.string().min(2),
  lat: z.number(),
  lng: z.number(),
  locationName: z.string().optional(),
  address: z.string().optional(),
  visibility: z.enum(["public", "group_only", "private"]),
  hostGroupId: z.string().optional(),
  maxAttendees: z.number().int().positive().optional(),
});

export const updateActivitySchema = createActivitySchema
  .extend({
    title: z.string().min(3).optional(),
    description: z.string().min(10).optional(),
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    visibility: z.enum(["public", "group_only", "private"]).optional(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided.",
  });

export const joinActivitySchema = z
  .object({
    status: z.enum(["joined", "waitlist", "canceled"]).optional(),
  })
  .default({});

export const saveActivitySchema = z
  .object({
    saved: z.boolean().optional(),
  })
  .default({});

export const createPostSchema = z.object({
  activityId: z.string().optional(),
  content: z.string().min(1),
  mediaUrls: z.array(z.string().url()).max(6).default([]),
});

export const updatePostSchema = z
  .object({
    content: z.string().min(1).optional(),
    mediaUrls: z.array(z.string().url()).max(6).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided.",
  });

export const createGroupSchema = z.object({
  name: z.string().min(3),
  description: z.string().min(10),
  city: z.string().min(2),
  isPublic: z.boolean(),
  bannerUrl: z.string().url().optional(),
});

export const updateGroupSchema = z
  .object({
    name: z.string().min(3).optional(),
    description: z.string().min(10).optional(),
    city: z.string().min(2).optional(),
    isPublic: z.boolean().optional(),
    bannerUrl: z.string().url().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided.",
  });

export const createIdeaSchema = z.object({
  promptText: z.string().min(5),
  city: z.string(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  aiSuggestion: z.string().optional(),
  proposedStart: z.string().datetime().optional(),
  proposedEnd: z.string().datetime().optional(),
});

export const updateIdeaSchema = z
  .object({
    promptText: z.string().min(5).optional(),
    city: z.string().optional(),
    aiSuggestion: z.string().optional(),
    status: z.enum(["open", "converted", "archived"]).optional(),
    endorsementThreshold: z.number().int().min(1).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided.",
  });

export const endorseIdeaSchema = z.object({
  endorse: z.boolean().default(true),
});

export const createFeaturedAdSchema = z.object({
  activityId: z.string(),
  sponsorType: z.enum(["advertiser", "student_club"]),
  sponsorId: z.string(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  paymentRef: z.string().optional(),
});

export const submitFeaturedAdSchema = z.object({
  message: z.string().max(500).optional(),
});

export const reviewFeaturedAdSchema = z.object({
  action: z.enum(["approve", "reject"]),
  notes: z.string().max(500).optional(),
});

export const linkFeaturedAdGroupsSchema = z.object({
  groupIds: z.array(z.string()).min(1),
});

export const createTicketSchema = z.object({
  subject: z.string().min(3),
  message: z.string().min(5),
});

export const updateTicketSchema = z
  .object({
    status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
    assignedCsUserId: z.string().optional(),
    message: z.string().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided.",
  });

export const notificationTokenSchema = z.object({
  deviceId: z.string().min(3),
  fcmToken: z.string().min(20),
});

export const joinGroupSchema = z.object({
  userId: z.string().optional(),
  role: z.enum(["member", "moderator"]).optional(),
});

export const updateGroupMemberSchema = z.object({
  userId: z.string(),
  role: z.enum(["member", "moderator", "owner"]),
});
