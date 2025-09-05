# Overview

Premier Properties is a full-stack real estate web application built with React and Express. The application provides a comprehensive platform for property listings, agent management, and customer inquiries. Users can browse properties with advanced filtering capabilities, while authenticated agents can manage their property listings and track customer inquiries through a dedicated dashboard.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript and Vite for build tooling
- **UI Framework**: Tailwind CSS with shadcn/ui component library for consistent design system
- **Routing**: Wouter for client-side routing with conditional rendering based on authentication state
- **State Management**: TanStack Query for server state management and caching
- **Forms**: React Hook Form with Zod validation for type-safe form handling

## Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js
- **API Pattern**: RESTful API with standardized JSON responses
- **Authentication**: Replit Auth integration with OpenID Connect for secure user authentication
- **Session Management**: Express sessions with PostgreSQL session store
- **Request Logging**: Custom middleware for API request logging and performance monitoring

## Database Design
- **ORM**: Drizzle ORM with PostgreSQL for type-safe database operations
- **Schema Management**: Centralized schema definitions in shared directory with Zod validation
- **Key Entities**:
  - Users (authentication and profile data)
  - Properties (listings with comprehensive metadata)
  - Inquiries (customer-agent communication)
  - Sessions (authentication session storage)

## Authentication & Authorization
- **Provider**: Replit Auth with OIDC for secure authentication flow
- **Session Storage**: PostgreSQL-backed sessions with configurable TTL
- **Route Protection**: Middleware-based authentication checks for protected endpoints
- **User Context**: React hooks for authentication state management across components

## File Structure
- **Monorepo Structure**: Client, server, and shared code in separate directories
- **Shared Types**: Common TypeScript interfaces and Zod schemas in shared directory
- **Component Organization**: UI components with shadcn/ui system and custom business components
- **Route Handlers**: Organized API routes with centralized error handling

# External Dependencies

## Database Services
- **PostgreSQL**: Primary database via Neon serverless PostgreSQL
- **Connection Pool**: @neondatabase/serverless for optimized database connections

## Authentication
- **Replit Auth**: Built-in Replit authentication service with OpenID Connect
- **Session Store**: connect-pg-simple for PostgreSQL session persistence

## UI & Styling
- **Radix UI**: Accessible component primitives for complex UI elements
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens
- **Lucide Icons**: Consistent icon library throughout the application

## Development Tools
- **TypeScript**: Full type safety across frontend, backend, and shared code
- **Vite**: Fast build tool with hot module replacement for development
- **ESBuild**: Production bundling for server-side code
- **Drizzle Kit**: Database migration and schema management tools