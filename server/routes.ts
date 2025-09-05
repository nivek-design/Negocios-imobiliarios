import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertPropertySchema, insertInquirySchema } from "@shared/schema";
import { ZodError } from "zod";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Object storage service routes
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  app.put("/api/property-images", isAuthenticated, async (req: any, res) => {
    if (!req.body.imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }

    const userId = req.user?.claims?.sub;

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.imageURL,
        {
          owner: userId,
          visibility: "public",
        },
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting property image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Config routes
  app.get('/api/config/maps', async (req, res) => {
    res.json({ apiKey: process.env.GOOGLE_MAPS_API_KEY || '' });
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Property routes
  app.get("/api/properties", async (req, res) => {
    try {
      const filters = {
        search: req.query.search as string,
        keyword: req.query.keyword as string,
        propertyType: req.query.propertyType as string,
        status: req.query.status as string,
        city: req.query.city as string,
        minPrice: req.query.minPrice ? parseInt(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseInt(req.query.maxPrice as string) : undefined,
        bedrooms: req.query.bedrooms ? parseInt(req.query.bedrooms as string) : undefined,
        bathrooms: req.query.bathrooms ? parseInt(req.query.bathrooms as string) : undefined,
        // Property features
        hasGarage: req.query.hasGarage === 'true' ? true : req.query.hasGarage === 'false' ? false : undefined,
        hasPool: req.query.hasPool === 'true' ? true : req.query.hasPool === 'false' ? false : undefined,
        hasBalcony: req.query.hasBalcony === 'true' ? true : req.query.hasBalcony === 'false' ? false : undefined,
        hasGarden: req.query.hasGarden === 'true' ? true : req.query.hasGarden === 'false' ? false : undefined,
        hasAirConditioning: req.query.hasAirConditioning === 'true' ? true : req.query.hasAirConditioning === 'false' ? false : undefined,
        hasFireplace: req.query.hasFireplace === 'true' ? true : req.query.hasFireplace === 'false' ? false : undefined,
        hasPetsAllowed: req.query.hasPetsAllowed === 'true' ? true : req.query.hasPetsAllowed === 'false' ? false : undefined,
        sortBy: req.query.sortBy as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
      };
      
      const properties = await storage.getProperties(filters);
      res.json(properties);
    } catch (error) {
      console.error("Error fetching properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  app.get("/api/properties/featured", async (req, res) => {
    try {
      const properties = await storage.getFeaturedProperties();
      res.json(properties);
    } catch (error) {
      console.error("Error fetching featured properties:", error);
      res.status(500).json({ message: "Failed to fetch featured properties" });
    }
  });

  app.get("/api/properties/:id", async (req, res) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.json(property);
    } catch (error) {
      console.error("Error fetching property:", error);
      res.status(500).json({ message: "Failed to fetch property" });
    }
  });

  // Record property view
  app.post("/api/properties/:id/view", async (req: any, res) => {
    try {
      const propertyId = req.params.id;
      const userId = req.user?.claims?.sub || null;
      const ipAddress = req.ip || req.connection.remoteAddress || null;
      
      await storage.createPropertyView({
        propertyId,
        userId,
        ipAddress
      });
      
      res.status(201).json({ message: "View recorded" });
    } catch (error) {
      console.error("Error recording property view:", error);
      res.status(500).json({ message: "Failed to record view" });
    }
  });

  // Add property to favorites
  app.post("/api/properties/:id/favorite", isAuthenticated, async (req: any, res) => {
    try {
      const propertyId = req.params.id;
      const userId = req.user.claims.sub;
      
      await storage.createPropertyFavorite({
        propertyId,
        userId,
        createdAt: new Date(),
      });
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error adding property to favorites:", error);
      res.status(500).json({ message: "Failed to add to favorites" });
    }
  });

  // Remove property from favorites
  app.delete("/api/properties/:id/favorite", isAuthenticated, async (req: any, res) => {
    try {
      const propertyId = req.params.id;
      const userId = req.user.claims.sub;
      
      await storage.removePropertyFavorite(propertyId, userId);
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error removing property from favorites:", error);
      res.status(500).json({ message: "Failed to remove from favorites" });
    }
  });

  // Check if property is favorited by user
  app.get("/api/properties/:id/is-favorited", isAuthenticated, async (req: any, res) => {
    try {
      const propertyId = req.params.id;
      const userId = req.user.claims.sub;
      
      const isFavorited = await storage.isPropertyFavorited(propertyId, userId);
      
      res.json({ isFavorited });
    } catch (error) {
      console.error("Error checking if property is favorited:", error);
      res.status(500).json({ message: "Failed to check favorite status" });
    }
  });

  // Get user favorites
  app.get("/api/user/favorites", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favorites = await storage.getUserFavorites(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching user favorites:", error);
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  app.post("/api/properties", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const propertyData = insertPropertySchema.parse({
        ...req.body,
        agentId: userId,
      });
      
      const property = await storage.createProperty(propertyData);
      res.status(201).json(property);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating property:", error);
      res.status(500).json({ message: "Failed to create property" });
    }
  });

  app.put("/api/properties/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const property = await storage.getProperty(req.params.id);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      if (property.agentId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this property" });
      }
      
      const updateData = insertPropertySchema.partial().parse(req.body);
      const updatedProperty = await storage.updateProperty(req.params.id, updateData);
      res.json(updatedProperty);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error updating property:", error);
      res.status(500).json({ message: "Failed to update property" });
    }
  });

  app.delete("/api/properties/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const property = await storage.getProperty(req.params.id);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      if (property.agentId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this property" });
      }
      
      await storage.deleteProperty(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting property:", error);
      res.status(500).json({ message: "Failed to delete property" });
    }
  });

  app.get("/api/agent/properties", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const properties = await storage.getPropertiesByAgent(userId);
      res.json(properties);
    } catch (error) {
      console.error("Error fetching agent properties:", error);
      res.status(500).json({ message: "Failed to fetch properties" });
    }
  });

  // Inquiry routes
  app.post("/api/inquiries", async (req, res) => {
    try {
      const inquiryData = insertInquirySchema.parse(req.body);
      const inquiry = await storage.createInquiry(inquiryData);
      res.status(201).json(inquiry);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating inquiry:", error);
      res.status(500).json({ message: "Failed to create inquiry" });
    }
  });

  app.get("/api/agent/inquiries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const inquiries = await storage.getInquiriesByAgent(userId);
      res.json(inquiries);
    } catch (error) {
      console.error("Error fetching inquiries:", error);
      res.status(500).json({ message: "Failed to fetch inquiries" });
    }
  });

  // Get agent metrics
  app.get("/api/agent/metrics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const metrics = await storage.getAgentMetrics(userId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching agent metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  app.get("/api/properties/:id/inquiries", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const property = await storage.getProperty(req.params.id);
      
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      
      if (property.agentId !== userId) {
        return res.status(403).json({ message: "Not authorized to view inquiries for this property" });
      }
      
      const inquiries = await storage.getInquiriesForProperty(req.params.id);
      res.json(inquiries);
    } catch (error) {
      console.error("Error fetching property inquiries:", error);
      res.status(500).json({ message: "Failed to fetch inquiries" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
