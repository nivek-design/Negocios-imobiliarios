import { sql, relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  pgEnum,
  boolean,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - using Supabase Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  profileImageUrl: varchar("profile_image_url", { length: 500 }),
  role: varchar("role", { length: 20 }).default("client").notNull(), // client, agent, admin
  isActive: boolean("is_active").default(true).notNull(),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  // Performance indexes
  index("idx_users_email").on(table.email),
  index("idx_users_role").on(table.role),
  index("idx_users_active").on(table.isActive),
  index("idx_users_created_at").on(table.createdAt),
  index("idx_users_deleted_at").on(table.deletedAt),
  // Email uniqueness enforced at application level with soft delete awareness
  // Data validation
  check("check_users_email_valid", sql`email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'`),
  check("check_users_role_valid", sql`role IN ('client', 'agent', 'admin')`),
]);

export const propertyTypeEnum = pgEnum("property_type", [
  "house",
  "condo",
  "townhouse",
  "apartment",
]);

export const propertyStatusEnum = pgEnum("property_status", [
  "for_sale",
  "for_rent",
  "sold",
  "rented",
]);

export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  propertyType: propertyTypeEnum("property_type").notNull(),
  status: propertyStatusEnum("status").notNull(),
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: integer("bathrooms").notNull(),
  squareFeet: integer("square_feet").notNull(),
  address: varchar("address", { length: 255 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 50 }).notNull(),
  zipCode: varchar("zip_code", { length: 10 }).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  images: text("images").array().default([]),
  featured: boolean("featured").default(false).notNull(),
  // Property features
  hasGarage: boolean("has_garage").default(false).notNull(),
  garageSpaces: integer("garage_spaces").default(0).notNull(),
  hasPool: boolean("has_pool").default(false).notNull(),
  hasBalcony: boolean("has_balcony").default(false).notNull(),
  hasGarden: boolean("has_garden").default(false).notNull(),
  hasAirConditioning: boolean("has_air_conditioning").default(false).notNull(),
  hasFireplace: boolean("has_fireplace").default(false).notNull(),
  hasPetsAllowed: boolean("has_pets_allowed").default(false).notNull(),
  furnished: boolean("furnished").default(false).notNull(),
  hasElevator: boolean("has_elevator").default(false).notNull(),
  hasSecurity: boolean("has_security").default(false).notNull(),
  hasGym: boolean("has_gym").default(false).notNull(),
  hasPlayground: boolean("has_playground").default(false).notNull(),
  yearBuilt: integer("year_built"),
  lotArea: decimal("lot_area", { precision: 8, scale: 2 }),
  // Analytics and metadata
  viewsCount: integer("views_count").default(0).notNull(),
  favoritesCount: integer("favorites_count").default(0).notNull(),
  searchVector: text("search_vector"), // For full-text search
  // Audit fields
  agentId: varchar("agent_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  // Performance indexes - Most frequently queried fields
  index("idx_properties_status").on(table.status),
  index("idx_properties_property_type").on(table.propertyType),
  index("idx_properties_city").on(table.city),
  index("idx_properties_state").on(table.state),
  index("idx_properties_price").on(table.price),
  index("idx_properties_bedrooms").on(table.bedrooms),
  index("idx_properties_bathrooms").on(table.bathrooms),
  index("idx_properties_square_feet").on(table.squareFeet),
  index("idx_properties_featured").on(table.featured),
  index("idx_properties_agent_id").on(table.agentId),
  index("idx_properties_created_at").on(table.createdAt),
  index("idx_properties_deleted_at").on(table.deletedAt),
  // Geospatial index for location-based searches
  index("idx_properties_location").on(table.latitude, table.longitude),
  // Composite indexes for common query patterns
  index("idx_properties_city_status").on(table.city, table.status),
  index("idx_properties_type_status").on(table.propertyType, table.status),
  index("idx_properties_price_range").on(table.price, table.status),
  index("idx_properties_bedrooms_bathrooms").on(table.bedrooms, table.bathrooms),
  index("idx_properties_agent_status").on(table.agentId, table.status),
  index("idx_properties_featured_created").on(table.featured, table.createdAt),
  // Full-text search will be implemented using ILIKE for now (GIN requires tsvector type)
  // Data validation constraints
  check("check_properties_price_positive", sql`price > 0`),
  check("check_properties_bedrooms_valid", sql`bedrooms >= 0 AND bedrooms <= 20`),
  check("check_properties_bathrooms_valid", sql`bathrooms >= 0 AND bathrooms <= 20`),
  check("check_properties_square_feet_positive", sql`square_feet > 0`),
  check("check_properties_garage_spaces_valid", sql`garage_spaces >= 0 AND garage_spaces <= 10`),
  check("check_properties_year_built_valid", sql`year_built IS NULL OR (year_built >= 1800 AND year_built <= EXTRACT(YEAR FROM CURRENT_DATE) + 5)`),
  check("check_properties_latitude_valid", sql`latitude IS NULL OR (latitude >= -90 AND latitude <= 90)`),
  check("check_properties_longitude_valid", sql`longitude IS NULL OR (longitude >= -180 AND longitude <= 180)`),
]);

export const inquiryStatusEnum = pgEnum("inquiry_status", [
  "pending",
  "contacted",
  "qualified",
  "closed",
  "spam",
]);

export const inquiries = pgTable("inquiries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  message: text("message"),
  status: inquiryStatusEnum("status").default("pending").notNull(),
  priority: integer("priority").default(1).notNull(), // 1=low, 2=medium, 3=high
  source: varchar("source", { length: 50 }).default("website").notNull(), // website, phone, referral, etc
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  // Performance indexes
  index("idx_inquiries_property_id").on(table.propertyId),
  index("idx_inquiries_email").on(table.email),
  index("idx_inquiries_status").on(table.status),
  index("idx_inquiries_created_at").on(table.createdAt),
  index("idx_inquiries_priority").on(table.priority),
  index("idx_inquiries_deleted_at").on(table.deletedAt),
  // Composite indexes
  index("idx_inquiries_property_status").on(table.propertyId, table.status),
  index("idx_inquiries_status_priority").on(table.status, table.priority),
  // Data validation
  check("check_inquiries_email_valid", sql`email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'`),
  check("check_inquiries_priority_valid", sql`priority >= 1 AND priority <= 3`),
]);

export const propertyViews = pgTable("property_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  userId: varchar("user_id").references(() => users.id),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: varchar("user_agent", { length: 500 }),
  referrer: varchar("referrer", { length: 500 }),
  sessionId: varchar("session_id", { length: 100 }),
  viewDuration: integer("view_duration"), // seconds spent viewing
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  // Performance indexes
  index("idx_property_views_property_id").on(table.propertyId),
  index("idx_property_views_user_id").on(table.userId),
  index("idx_property_views_created_at").on(table.createdAt),
  index("idx_property_views_ip_address").on(table.ipAddress),
  index("idx_property_views_session_id").on(table.sessionId),
  index("idx_property_views_deleted_at").on(table.deletedAt),
  // Composite indexes for analytics
  index("idx_property_views_property_date").on(table.propertyId, table.createdAt),
  index("idx_property_views_user_date").on(table.userId, table.createdAt),
  // Data validation
  check("check_property_views_duration_valid", sql`view_duration IS NULL OR view_duration >= 0`),
]);

export const propertyFavorites = pgTable("property_favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  notes: text("notes"), // User personal notes about the property
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  // Performance indexes
  index("idx_property_favorites_property_id").on(table.propertyId),
  index("idx_property_favorites_user_id").on(table.userId),
  index("idx_property_favorites_created_at").on(table.createdAt),
  index("idx_property_favorites_deleted_at").on(table.deletedAt),
  // Composite indexes
  index("idx_property_favorites_property_user").on(table.propertyId, table.userId),
  index("idx_property_favorites_user_created").on(table.userId, table.createdAt),
  // Favorite uniqueness enforced at application level with soft delete awareness
]);

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "scheduled",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
]);

export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  clientName: varchar("client_name", { length: 200 }).notNull(),
  clientEmail: varchar("client_email", { length: 255 }).notNull(),
  clientPhone: varchar("client_phone", { length: 20 }),
  appointmentDate: timestamp("appointment_date").notNull(),
  duration: integer("duration").notNull().default(60), // duration in minutes
  status: appointmentStatusEnum("status").notNull().default("scheduled"),
  notes: text("notes"),
  privateNotes: text("private_notes"), // Agent-only notes
  reminderSent: boolean("reminder_sent").default(false).notNull(),
  confirmationSent: boolean("confirmation_sent").default(false).notNull(),
  attendeeCount: integer("attendee_count").default(1).notNull(),
  appointmentType: varchar("appointment_type", { length: 50 }).default("viewing").notNull(), // viewing, consultation, signing
  rescheduleCount: integer("reschedule_count").default(0).notNull(),
  cancelledAt: timestamp("cancelled_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  // Performance indexes
  index("idx_appointments_agent_id").on(table.agentId),
  index("idx_appointments_property_id").on(table.propertyId),
  index("idx_appointments_status").on(table.status),
  index("idx_appointments_date").on(table.appointmentDate),
  index("idx_appointments_email").on(table.clientEmail),
  index("idx_appointments_created_at").on(table.createdAt),
  index("idx_appointments_deleted_at").on(table.deletedAt),
  // Composite indexes for calendar queries
  index("idx_appointments_agent_date").on(table.agentId, table.appointmentDate),
  index("idx_appointments_property_date").on(table.propertyId, table.appointmentDate),
  index("idx_appointments_status_date").on(table.status, table.appointmentDate),
  index("idx_appointments_agent_status").on(table.agentId, table.status),
  // Data validation
  check("check_appointments_duration_valid", sql`duration > 0 AND duration <= 480`), // Max 8 hours
  check("check_appointments_attendee_count_valid", sql`attendee_count > 0 AND attendee_count <= 20`),
  check("check_appointments_reschedule_count_valid", sql`reschedule_count >= 0 AND reschedule_count <= 10`),
  check("check_appointments_email_valid", sql`client_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'`),
  check("check_appointments_date_future", sql`appointment_date >= created_at`),
]);

// Relations
export const propertiesRelations = relations(properties, ({ one, many }) => ({
  agent: one(users, {
    fields: [properties.agentId],
    references: [users.id],
  }),
  inquiries: many(inquiries),
  views: many(propertyViews),
  favorites: many(propertyFavorites),
  appointments: many(appointments),
}));

export const usersRelations = relations(users, ({ many }) => ({
  properties: many(properties),
  propertyViews: many(propertyViews),
  propertyFavorites: many(propertyFavorites),
  appointments: many(appointments),
}));

export const inquiriesRelations = relations(inquiries, ({ one }) => ({
  property: one(properties, {
    fields: [inquiries.propertyId],
    references: [properties.id],
  }),
}));

export const propertyViewsRelations = relations(propertyViews, ({ one }) => ({
  property: one(properties, {
    fields: [propertyViews.propertyId],
    references: [properties.id],
  }),
  user: one(users, {
    fields: [propertyViews.userId],
    references: [users.id],
  }),
}));

export const propertyFavoritesRelations = relations(propertyFavorites, ({ one }) => ({
  property: one(properties, {
    fields: [propertyFavorites.propertyId],
    references: [properties.id],
  }),
  user: one(users, {
    fields: [propertyFavorites.userId],
    references: [users.id],
  }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  property: one(properties, {
    fields: [appointments.propertyId],
    references: [properties.id],
  }),
  agent: one(users, {
    fields: [appointments.agentId],
    references: [users.id],
  }),
}));

// Zod schemas
export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  viewsCount: true,
  favoritesCount: true,
  searchVector: true,
});

export const insertInquirySchema = createInsertSchema(inquiries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export const insertPropertyViewSchema = createInsertSchema(propertyViews).omit({
  id: true,
  createdAt: true,
  deletedAt: true,
});

export const insertPropertyFavoriteSchema = createInsertSchema(propertyFavorites).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

// Pagination interfaces
export interface PaginationOptions {
  limit?: number;
  offset?: number;
  cursor?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface CursorPaginationOptions {
  limit?: number;
  cursor?: string;
  sort: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total?: number;
    hasMore: boolean;
    nextCursor?: string;
    prevCursor?: string;
    page?: number;
    totalPages?: number;
    limit: number;
  };
}

// Soft delete helper interface
export interface SoftDeleteOptions {
  includeSoftDeleted?: boolean;
  onlySoftDeleted?: boolean;
}

// Query optimization interfaces
export interface SelectOptions {
  fields?: string[];
  include?: Record<string, boolean | SelectOptions>;
}

// Analytics interfaces
export interface QueryMetrics {
  queryTime: number;
  resultCount: number;
  cacheHit: boolean;
  indexesUsed?: string[];
}

export const insertAppointmentSchema = createInsertSchema(appointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  rescheduleCount: true,
}).extend({
  appointmentDate: z.union([
    z.string().transform((val) => new Date(val)),
    z.date()
  ]).transform((val) => val instanceof Date ? val : new Date(val)),
});

export const upsertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
});

// Types
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Inquiry = typeof inquiries.$inferSelect;
export type InsertInquiry = z.infer<typeof insertInquirySchema>;
export type PropertyView = typeof propertyViews.$inferSelect;
export type InsertPropertyView = z.infer<typeof insertPropertyViewSchema>;
export type PropertyFavorite = typeof propertyFavorites.$inferSelect;
export type InsertPropertyFavorite = z.infer<typeof insertPropertyFavoriteSchema>;
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
