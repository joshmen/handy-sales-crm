# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HandyCRM - A modern Customer Relationship Management system built with Next.js 15, React 19, and TypeScript for sales and route management.

## Development Commands

```bash
# Development
npm run dev              # Start development server with Turbopack
npm run build            # Build for production
npm run start            # Start production server
npm run preview          # Build and start production server

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues automatically
npm run type-check       # TypeScript type checking

# Testing
npm run test             # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report

# Maintenance
npm run clean            # Clean build cache
npm run clean:all        # Clean everything including node_modules
npm run fresh            # Clean install from scratch
npm run setup            # Install dependencies

# Pre-deployment
npm run pre-commit       # Run lint and type-check
npm run pre-deploy       # Full validation (lint, type-check, test)
npm run verify           # Verify deployment configuration

# Deployment
npm run deploy:preview   # Deploy to Vercel preview
npm run deploy:prod      # Deploy to Vercel production
```

## Architecture

### Tech Stack
- **Framework**: Next.js 15.4.6 with App Router
- **UI Library**: React 19.1.0
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS 3.4 with Tailwind Animate
- **UI Components**: Radix UI primitives
- **Forms**: React Hook Form with Zod validation
- **State Management**: Zustand
- **Authentication**: NextAuth.js
- **HTTP Client**: Axios
- **Charts**: Recharts
- **Media**: Cloudinary integration
- **Icons**: Lucide React
- **Build**: Turbopack (development)

### Project Structure
- `/src/app/` - Next.js App Router pages and layouts
  - `layout.tsx` - Root layout with theme support
  - `page.tsx` - Application pages
- `/src/components/` - React components
  - `providers/` - Context providers (ClientProviders)
  - UI components (Sidebar, Topbar, etc.)
- `/public/` - Static assets
- `/.github/workflows/` - CI/CD pipelines (planned)

### Key Patterns
- Dark/light theme support with localStorage persistence
- Client-side providers wrapped in ClientProviders component
- Spanish language interface (lang="es")
- Component library based on Radix UI with class-variance-authority
- Form validation using React Hook Form + Zod schemas
- Responsive design with Tailwind CSS
- Deployment-ready with Vercel configuration

### Environment Variables
Required environment variables (see .env.example):
- NextAuth configuration
- API endpoints
- Cloudinary configuration
- Other service integrations