# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a SvelteKit application with PostgreSQL database integration, authentication, and internationalization. The stack includes:

- **Frontend**: SvelteKit with Svelte 5, TailwindCSS v4
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Custom session-based auth with Argon2 password hashing
- **Internationalization**: Paraglide JS for i18n
- **Development**: TypeScript, ESLint, Prettier

## Key Architecture

### Database Layer (`src/lib/server/db/`)

- **schema.ts**: Defines user and session tables using Drizzle ORM
- **index.ts**: Database connection and configuration
- Uses PostgreSQL with session-based authentication

### Authentication (`src/lib/server/auth.ts`)

- Custom session management with 30-day sessions
- SHA-256 hashed session tokens
- Automatic session renewal (15-day threshold)
- Cookie-based session storage

### Request Handling (`src/hooks.server.ts`)

- Combines Paraglide i18n middleware with authentication
- Sets `event.locals.user` and `event.locals.session` on all requests
- Handles session validation and renewal

### Internationalization

- Paraglide JS generates files in `src/lib/paraglide/`
- Configuration in `project.inlang/`
- Language replacement via `%paraglide.lang%` in HTML

## Common Commands

### Development

```bash
npm run dev                 # Start development server
npm run dev -- --open     # Start dev server and open browser
```

### Code Quality

```bash
npm run check              # Type checking with svelte-check
npm run check:watch        # Type checking in watch mode
npm run lint               # Run ESLint and Prettier checks
npm run format             # Format code with Prettier
```

### Database

```bash
npm run db:start           # Start PostgreSQL via Docker Compose
npm run db:push            # Push schema changes to database
npm run db:generate        # Generate Drizzle migrations
npm run db:migrate         # Run database migrations
npm run db:studio          # Open Drizzle Studio
```

### Build & Deploy

```bash
npm run build              # Build for production
npm run preview            # Preview production build
```

## Database Setup

The project expects a `DATABASE_URL` environment variable. For local development:

1. Run `npm run db:start` to start PostgreSQL container
2. Set `DATABASE_URL=postgresql://root:mysecretpassword@localhost:5432/local`
3. Run `npm run db:push` to sync schema

## Important Files

- `drizzle.config.ts`: Database configuration
- `vite.config.ts`: Build configuration with Paraglide and TailwindCSS
- `src/hooks.server.ts`: Request middleware for auth and i18n
- `src/lib/server/db/schema.ts`: Database schema definitions
- `src/lib/server/auth.ts`: Authentication utilities
