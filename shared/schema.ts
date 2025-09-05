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

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
  featured: boolean("featured").default(false),
  // Property features
  hasGarage: boolean("has_garage").default(false),
  hasPool: boolean("has_pool").default(false),
  hasBalcony: boolean("has_balcony").default(false),
  hasGarden: boolean("has_garden").default(false),
  hasAirConditioning: boolean("has_air_conditioning").default(false),
  hasFireplace: boolean("has_fireplace").default(false),
  hasPetsAllowed: boolean("has_pets_allowed").default(false),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const inquiries = pgTable("inquiries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const propertyViews = pgTable("property_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  userId: varchar("user_id").references(() => users.id),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const propertyFavorites = pgTable("property_favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("property_favorites_property_user_idx").on(table.propertyId, table.userId),
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
}));

export const usersRelations = relations(users, ({ many }) => ({
  properties: many(properties),
  propertyViews: many(propertyViews),
  propertyFavorites: many(propertyFavorites),
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

// Zod schemas
export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInquirySchema = createInsertSchema(inquiries).omit({
  id: true,
  createdAt: true,
});

export const insertPropertyViewSchema = createInsertSchema(propertyViews).omit({
  id: true,
  createdAt: true,
});

export const insertPropertyFavoriteSchema = createInsertSchema(propertyFavorites).omit({
  id: true,
  createdAt: true,
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
