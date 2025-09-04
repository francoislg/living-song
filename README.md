# living-song

A collaborative music creation project where people work together to create a song based on multiple tracks. Each day, one track changes to another based on user votes.

## Database Setup

This project uses PostgreSQL with Drizzle ORM. To set up the database:

1. Start the PostgreSQL container:

```sh
npm run db:start
```

2. Set the DATABASE_URL environment variable:

```sh
# For local development
DATABASE_URL=postgresql://root:mysecretpassword@localhost:5432/local
```

3. Push the schema to the database:

```sh
npm run db:push
```

### Database Commands

```sh
npm run db:generate    # Generate migration files from schema changes
npm run db:migrate     # Run pending migrations
npm run db:studio      # Open Drizzle Studio for database management
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
