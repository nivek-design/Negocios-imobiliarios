import {
  users,
  properties,
  inquiries,
  propertyViews,
  propertyFavorites,
  appointments,
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
  type Appointment,
  type InsertAppointment,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, gte, lte, lt, ilike, or, sql, inArray } from "drizzle-orm";

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
}

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
  
  // Appointment operations
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  getAppointmentsByAgent(agentId: string): Promise<Appointment[]>;
  getAppointmentsByProperty(propertyId: string): Promise<Appointment[]>;
  getAppointment(id: string): Promise<Appointment | undefined>;
  updateAppointment(id: string, updates: Partial<InsertAppointment>): Promise<Appointment>;
  deleteAppointment(id: string): Promise<void>;
  getAgentAvailableSlots(agentId: string, date: string): Promise<string[]>;
}

export interface PropertyFilters {
  search?: string;
  keyword?: string; // Search in title and description
  propertyType?: string;
  status?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  // Location filters
  latitude?: number;
  longitude?: number;
  radius?: number; // Distance in kilometers
  // Property features
  hasGarage?: boolean;
  hasPool?: boolean;
  hasBalcony?: boolean;
  hasGarden?: boolean;
  hasAirConditioning?: boolean;
  hasFireplace?: boolean;
  hasPetsAllowed?: boolean;
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
    
    if (filters?.keyword) {
      conditions.push(
        or(
          ilike(properties.title, `%${filters.keyword}%`),
          ilike(properties.description, `%${filters.keyword}%`)
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
    
    // Property features filters
    if (filters?.hasGarage !== undefined) {
      conditions.push(eq(properties.hasGarage, filters.hasGarage));
    }
    
    if (filters?.hasPool !== undefined) {
      conditions.push(eq(properties.hasPool, filters.hasPool));
    }
    
    if (filters?.hasBalcony !== undefined) {
      conditions.push(eq(properties.hasBalcony, filters.hasBalcony));
    }
    
    if (filters?.hasGarden !== undefined) {
      conditions.push(eq(properties.hasGarden, filters.hasGarden));
    }
    
    if (filters?.hasAirConditioning !== undefined) {
      conditions.push(eq(properties.hasAirConditioning, filters.hasAirConditioning));
    }
    
    if (filters?.hasFireplace !== undefined) {
      conditions.push(eq(properties.hasFireplace, filters.hasFireplace));
    }
    
    if (filters?.hasPetsAllowed !== undefined) {
      conditions.push(eq(properties.hasPetsAllowed, filters.hasPetsAllowed));
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
    
    let result = await query;
    
    // Apply distance filter if location and radius are provided
    if (filters?.latitude && filters?.longitude && filters?.radius) {
      result = result.filter(property => {
        if (!property.latitude || !property.longitude) return false;
        
        const distance = calculateDistance(
          filters.latitude!,
          filters.longitude!,
          parseFloat(property.latitude),
          parseFloat(property.longitude)
        );
        
        return distance <= filters.radius!;
      });
    }
    
    return result;
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

  // Appointment operations
  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [newAppointment] = await db
      .insert(appointments)
      .values(appointment)
      .returning();
    return newAppointment;
  }

  async getAppointmentsByAgent(agentId: string): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .where(eq(appointments.agentId, agentId))
      .orderBy(asc(appointments.appointmentDate));
  }

  async getAppointmentsByProperty(propertyId: string): Promise<Appointment[]> {
    return await db
      .select()
      .from(appointments)
      .where(eq(appointments.propertyId, propertyId))
      .orderBy(asc(appointments.appointmentDate));
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(eq(appointments.id, id));
    return appointment;
  }

  async updateAppointment(id: string, updates: Partial<InsertAppointment>): Promise<Appointment> {
    // Convert appointmentDate string to Date object if needed
    const processedUpdates = { ...updates };
    if (processedUpdates.appointmentDate && typeof processedUpdates.appointmentDate === 'string') {
      processedUpdates.appointmentDate = new Date(processedUpdates.appointmentDate);
    }
    
    const [updatedAppointment] = await db
      .update(appointments)
      .set({
        ...processedUpdates,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, id))
      .returning();
    return updatedAppointment;
  }

  async deleteAppointment(id: string): Promise<void> {
    await db
      .delete(appointments)
      .where(eq(appointments.id, id));
  }

  async getAgentAvailableSlots(agentId: string, date: string): Promise<string[]> {
    // Get all appointments for the agent on the given date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.agentId, agentId),
          gte(appointments.appointmentDate, startOfDay),
          lte(appointments.appointmentDate, endOfDay)
        )
      );

    // Generate available time slots (9 AM to 6 PM, 1-hour intervals)
    const allSlots = [];
    for (let hour = 9; hour < 18; hour++) {
      const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
      allSlots.push(timeSlot);
    }

    // Filter out occupied slots
    const occupiedSlots = existingAppointments.map(apt => {
      const date = new Date(apt.appointmentDate);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    });

    return allSlots.filter(slot => !occupiedSlots.includes(slot));
  }

  async getAppointmentsByDateRange(startDate: string, endDate: string): Promise<Appointment[]> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return await db
      .select()
      .from(appointments)
      .where(
        and(
          gte(appointments.appointmentDate, start),
          lt(appointments.appointmentDate, end)
        )
      );
  }
}

export const storage = new DatabaseStorage();
