import {
  users,
  properties,
  inquiries,
  propertyViews,
  propertyFavorites,
  type User,
  type UpsertUser,
  type Property,
  type InsertProperty,
  type Inquiry,
  type InsertInquiry,
  type PropertyView,
  type InsertPropertyView,
  type PropertyFavorite,
  type InsertPropertyFavorite,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, gte, lte, ilike, or, sql, inArray } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Property operations
  getProperties(filters?: PropertyFilters): Promise<Property[]>;
  getProperty(id: string): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: string, property: Partial<InsertProperty>): Promise<Property>;
  deleteProperty(id: string): Promise<void>;
  getFeaturedProperties(): Promise<Property[]>;
  getPropertiesByAgent(agentId: string): Promise<Property[]>;
  
  // Inquiry operations
  createInquiry(inquiry: InsertInquiry): Promise<Inquiry>;
  getInquiriesByAgent(agentId: string): Promise<Inquiry[]>;
  getInquiriesForProperty(propertyId: string): Promise<Inquiry[]>;
  
  // Property metrics operations
  createPropertyView(view: InsertPropertyView): Promise<PropertyView>;
  getPropertyViewsCount(propertyId: string): Promise<number>;
  createPropertyFavorite(favorite: InsertPropertyFavorite): Promise<PropertyFavorite>;
  removePropertyFavorite(propertyId: string, userId: string): Promise<void>;
  getPropertyFavoritesCount(propertyId: string): Promise<number>;
  isPropertyFavorited(propertyId: string, userId: string): Promise<boolean>;
  getAgentMetrics(agentId: string): Promise<{ totalViews: number; totalFavorites: number }>;
}

export interface PropertyFilters {
  search?: string;
  propertyType?: string;
  status?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  sortBy?: string;
  limit?: number;
  offset?: number;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Property operations
  async getProperties(filters?: PropertyFilters): Promise<Property[]> {
    let query = db.select().from(properties);
    
    const conditions = [];
    
    if (filters?.search) {
      conditions.push(
        or(
          ilike(properties.title, `%${filters.search}%`),
          ilike(properties.address, `%${filters.search}%`),
          ilike(properties.city, `%${filters.search}%`)
        )
      );
    }
    
    if (filters?.propertyType) {
      conditions.push(eq(properties.propertyType, filters.propertyType as any));
    }
    
    if (filters?.status) {
      conditions.push(eq(properties.status, filters.status as any));
    }
    
    if (filters?.city) {
      conditions.push(ilike(properties.city, `%${filters.city}%`));
    }
    
    if (filters?.minPrice) {
      conditions.push(gte(properties.price, filters.minPrice.toString()));
    }
    
    if (filters?.maxPrice) {
      conditions.push(lte(properties.price, filters.maxPrice.toString()));
    }
    
    if (filters?.bedrooms) {
      conditions.push(gte(properties.bedrooms, filters.bedrooms));
    }
    
    if (filters?.bathrooms) {
      conditions.push(gte(properties.bathrooms, filters.bathrooms));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    // Add sorting logic
    if (filters?.sortBy) {
      switch (filters.sortBy) {
        case 'price-low':
          query = query.orderBy(asc(properties.price));
          break;
        case 'price-high':
          query = query.orderBy(desc(properties.price));
          break;
        case 'newest':
          query = query.orderBy(desc(properties.createdAt));
          break;
        case 'oldest':
          query = query.orderBy(asc(properties.createdAt));
          break;
        case 'bedrooms-high':
          query = query.orderBy(desc(properties.bedrooms));
          break;
        case 'bedrooms-low':
          query = query.orderBy(asc(properties.bedrooms));
          break;
        case 'size-high':
          query = query.orderBy(desc(properties.squareFeet));
          break;
        case 'size-low':
          query = query.orderBy(asc(properties.squareFeet));
          break;
        default:
          query = query.orderBy(desc(properties.createdAt));
      }
    } else {
      query = query.orderBy(desc(properties.createdAt));
    }
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    if (filters?.offset) {
      query = query.offset(filters.offset);
    }
    
    return await query;
  }

  async getProperty(id: string): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    return property;
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const [created] = await db
      .insert(properties)
      .values(property)
      .returning();
    return created;
  }

  async updateProperty(id: string, property: Partial<InsertProperty>): Promise<Property> {
    const [updated] = await db
      .update(properties)
      .set({ ...property, updatedAt: new Date() })
      .where(eq(properties.id, id))
      .returning();
    return updated;
  }

  async deleteProperty(id: string): Promise<void> {
    await db.delete(properties).where(eq(properties.id, id));
  }

  async getFeaturedProperties(): Promise<Property[]> {
    return await db
      .select()
      .from(properties)
      .where(eq(properties.featured, true))
      .orderBy(desc(properties.createdAt))
      .limit(6);
  }

  async getPropertiesByAgent(agentId: string): Promise<Property[]> {
    return await db
      .select()
      .from(properties)
      .where(eq(properties.agentId, agentId))
      .orderBy(desc(properties.createdAt));
  }

  // Inquiry operations
  async createInquiry(inquiry: InsertInquiry): Promise<Inquiry> {
    const [created] = await db
      .insert(inquiries)
      .values(inquiry)
      .returning();
    return created;
  }

  async getInquiriesByAgent(agentId: string): Promise<Inquiry[]> {
    return await db
      .select({
        id: inquiries.id,
        propertyId: inquiries.propertyId,
        firstName: inquiries.firstName,
        lastName: inquiries.lastName,
        email: inquiries.email,
        phone: inquiries.phone,
        message: inquiries.message,
        createdAt: inquiries.createdAt,
        propertyTitle: properties.title,
      })
      .from(inquiries)
      .innerJoin(properties, eq(inquiries.propertyId, properties.id))
      .where(eq(properties.agentId, agentId))
      .orderBy(desc(inquiries.createdAt));
  }

  async getInquiriesForProperty(propertyId: string): Promise<Inquiry[]> {
    return await db
      .select()
      .from(inquiries)
      .where(eq(inquiries.propertyId, propertyId))
      .orderBy(desc(inquiries.createdAt));
  }

  // Property metrics operations
  async createPropertyView(view: InsertPropertyView): Promise<PropertyView> {
    const [created] = await db
      .insert(propertyViews)
      .values(view)
      .returning();
    return created;
  }

  async getPropertyViewsCount(propertyId: string): Promise<number> {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(propertyViews)
      .where(eq(propertyViews.propertyId, propertyId));
    return Number(result[0]?.count || 0);
  }

  async createPropertyFavorite(favorite: InsertPropertyFavorite): Promise<PropertyFavorite> {
    const [created] = await db
      .insert(propertyFavorites)
      .values(favorite)
      .returning();
    return created;
  }

  async removePropertyFavorite(propertyId: string, userId: string): Promise<void> {
    await db
      .delete(propertyFavorites)
      .where(
        and(
          eq(propertyFavorites.propertyId, propertyId),
          eq(propertyFavorites.userId, userId)
        )
      );
  }

  async getPropertyFavoritesCount(propertyId: string): Promise<number> {
    const result = await db
      .select({ count: sql`count(*)` })
      .from(propertyFavorites)
      .where(eq(propertyFavorites.propertyId, propertyId));
    return Number(result[0]?.count || 0);
  }

  async isPropertyFavorited(propertyId: string, userId: string): Promise<boolean> {
    const result = await db
      .select({ id: propertyFavorites.id })
      .from(propertyFavorites)
      .where(
        and(
          eq(propertyFavorites.propertyId, propertyId),
          eq(propertyFavorites.userId, userId)
        )
      )
      .limit(1);
    return result.length > 0;
  }

  async getAgentMetrics(agentId: string): Promise<{ totalViews: number; totalFavorites: number }> {
    // Get all properties for this agent
    const agentProperties = await db
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.agentId, agentId));
    
    if (agentProperties.length === 0) {
      return { totalViews: 0, totalFavorites: 0 };
    }
    
    const propertyIds = agentProperties.map(p => p.id);
    
    // Count total views for agent's properties
    const viewsResult = await db
      .select({ count: sql`count(*)` })
      .from(propertyViews)
      .where(inArray(propertyViews.propertyId, propertyIds));
    
    // Count total favorites for agent's properties
    const favoritesResult = await db
      .select({ count: sql`count(*)` })
      .from(propertyFavorites)
      .where(inArray(propertyFavorites.propertyId, propertyIds));
    
    return {
      totalViews: Number(viewsResult[0]?.count || 0),
      totalFavorites: Number(favoritesResult[0]?.count || 0)
    };
  }

  async getUserFavorites(userId: string): Promise<Property[]> {
    const favoriteProperties = await db
      .select({
        property: properties,
      })
      .from(propertyFavorites)
      .innerJoin(properties, eq(propertyFavorites.propertyId, properties.id))
      .where(eq(propertyFavorites.userId, userId))
      .orderBy(desc(propertyFavorites.createdAt));

    return favoriteProperties.map(fp => fp.property);
  }
}

export const storage = new DatabaseStorage();
