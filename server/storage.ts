import {
  users,
  properties,
  inquiries,
  type User,
  type UpsertUser,
  type Property,
  type InsertProperty,
  type Inquiry,
  type InsertInquiry,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, ilike, or } from "drizzle-orm";

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
    
    query = query.orderBy(desc(properties.createdAt));
    
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
}

export const storage = new DatabaseStorage();
