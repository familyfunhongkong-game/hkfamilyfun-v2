# HK Family Fun V2 - Complete Rebuild

A comprehensive family activity discovery platform for Hong Kong with advanced admin features.

## Features

### Public Platform
- Event discovery (grid, calendar, timeline views)
- Advanced filtering (category, district, age, price)
- Community posts & discussions
- Favorites/wishlist
- Event recommendations

### Merchant Portal
- Self-service event submission
- Event management & analytics
- Merchant dashboard

### Admin Portal (Enhanced)
- AI-powered event scraping from URLs
- Auto-suggestion for headlines & descriptions
- Batch image upload & optimization
- Event approval workflow
- Community moderation
- Advanced analytics & reporting

## Tech Stack

- **Frontend**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **State**: TanStack Query + Zustand
- **Forms**: React Hook Form + Zod
- **Hosting**: Vercel

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm (recommended)
- Supabase account
- Vercel account (for deployment)

### Installation

```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Database Setup

```bash
# Create tables and schema
pnpm db:push

# Seed initial data
pnpm db:seed
```

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── (public)/       # Public pages
│   ├── (auth)/         # Auth pages
│   ├── (merchant)/     # Merchant portal
│   └── (admin)/        # Admin portal
├── components/         # Reusable components
├── lib/               # Utilities & helpers
├── types/             # TypeScript types
└── styles/            # Global styles
```

## Development

```bash
# Type checking
pnpm type-check

# Linting
pnpm lint

# Format code
pnpm format
```

## Deployment

Deployed on Vercel. Push to `main` branch to trigger automatic deployment.

```bash
pnpm build
pnpm start
```

## License

MIT
