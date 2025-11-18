# Brand Finder

An AI-powered application that automatically scans electronics trader websites to extract and catalog brand names. Built with Next.js 15, TypeScript, and OpenRouter AI.

## 🚀 Features

- **🔐 Authentication**: Better Auth with Google OAuth integration
- **🗃️ Database**: Drizzle ORM with PostgreSQL
- **🤖 AI-Powered Scanning**: Automatic brand extraction using OpenAI
- **📊 Brand Catalog**: Track brands across multiple traders
- **🎨 Modern UI**: shadcn/ui components with Tailwind CSS
- **⚡ Modern Stack**: Next.js 15, React 19, TypeScript

## 🎯 What Does It Do?

Brand Finder helps you build a comprehensive database of electronics brands across multiple trader websites:

1. **Add Traders** - Input URLs of electronics trader websites
2. **AI Scanning** - Automatically extract brand names using AI
3. **View Catalog** - See all brands and which traders carry them
4. **Track Relationships** - Discover which brands appear on multiple traders

### Example Use Cases

- Market research for electronics brands
- Competitor analysis
- Brand availability tracking
- Distributor database building

## 📋 Prerequisites

- **Node.js**: Version 18.0 or higher
- **PostgreSQL**: Database (local or hosted like Neon, Vercel Postgres)
- **OpenAI API Key**: For AI brand extraction

## 🛠️ Quick Setup

### 1. Clone or Create

```bash
npx create-agentic-app@latest brand-finder
cd brand-finder
```

Or clone this repository:

```bash
git clone <repository-url>
cd brand-finder
```

### 2. Install Dependencies

```bash
pnpm install
# or npm install
```

### 3. Environment Setup

Copy `.env.example` to `.env` and configure:

```env
# Database (Required)
POSTGRES_URL="postgresql://username:password@host:5432/database"

# Authentication (Required)
BETTER_AUTH_SECRET="your-random-32-character-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# AI (Required for scanning)
OPENAI_API_KEY="sk-proj-your-key-here"
OPENAI_MODEL="gpt-4o-mini"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Database Setup

```bash
pnpm run db:migrate
```

### 5. Start Development Server

```bash
pnpm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## ⚙️ Configuration Guide

### PostgreSQL Database

**Option 1: Neon (Cloud, Recommended)**
1. Go to [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string to `POSTGRES_URL`

**Option 2: Vercel Postgres**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Storage → Create → Postgres
3. Copy connection string

**Option 3: Local PostgreSQL**
```bash
# Install PostgreSQL locally
# Set POSTGRES_URL=postgresql://user:pass@localhost:5432/brandfinder
```

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project → Credentials → OAuth 2.0 Client ID
3. Add redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Copy Client ID and Secret to `.env`

### OpenAI API Key (Required)

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign up or log in to your account
3. Click "Create new secret key"
4. Copy the key and add to `.env` as `OPENAI_API_KEY`

**Recommended Models:**
- `gpt-4o-mini` - Fast and cost-effective (default)
- `gpt-4o` - More accurate, higher cost
- `gpt-4-turbo` - Balanced performance and cost

## 🗂️ Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...all]/     # Better Auth endpoint
│   │   ├── traders/           # Trader CRUD operations
│   │   │   └── [id]/scan/     # AI brand scanning
│   │   └── brands/            # Brand catalog endpoint
│   ├── traders/page.tsx       # Trader management UI
│   ├── brands/page.tsx        # Brand catalog UI
│   └── page.tsx               # Landing page
├── components/
│   ├── auth/                  # Auth components
│   ├── ui/                    # shadcn/ui components
│   └── site-header.tsx        # Navigation
└── lib/
    ├── auth.ts                # Better Auth config
    ├── db.ts                  # Database connection
    └── schema.ts              # Database schema
```

## 🔧 Available Scripts

```bash
pnpm run dev          # Start dev server
pnpm run build        # Production build
pnpm run start        # Start production server
pnpm run lint         # ESLint
pnpm run typecheck    # TypeScript checking
pnpm run db:generate  # Generate migrations
pnpm run db:migrate   # Run migrations
pnpm run db:studio    # Database GUI
pnpm run db:reset     # Reset database
```

## 📖 How to Use

### Adding a Trader

1. Sign in with Google
2. Navigate to "Traders" page
3. Click "Add Trader"
4. Enter trader name and URL
5. Click "Add Trader"

### Scanning for Brands

1. On the Traders page, find your trader
2. Click "Start Scan" (or "Rescan" for existing traders)
3. Wait for AI to analyze the website (10-60 seconds)
4. View discovered brands in the Brands catalog

### Viewing Brand Catalog

1. Navigate to "Brands" page
2. See all unique brands across all traders
3. Each brand shows how many traders carry it
4. View statistics at the bottom

## 🧪 Example Traders to Try

Test the application with these electronics traders:

- [Boolchand](https://boolchand.com/)
- [Electronics Mexico](https://www.electronicsmexico.com/)
- [Atacado Connect](https://atacadoconnect.com/)
- [B2B Mayoristas](https://www.b2bmayoristas.com/)

## 🚀 Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy

### Environment Variables for Production

Set these in Vercel dashboard:

- `POSTGRES_URL`
- `BETTER_AUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_APP_URL` (your production domain)

## 📚 Documentation

- [Feature Documentation](docs/features/brand-finder.md) - Detailed feature guide
- [Database Schema](src/lib/schema.ts) - Database structure
- [API Routes](src/app/api/) - API endpoint documentation

## 🔍 How It Works

### AI Brand Extraction Process

1. **Fetch Website** - Download HTML content from trader URL
2. **Send to AI** - Send first 50KB of HTML to OpenAI
3. **Extract Brands** - AI identifies electronics brand names
4. **Deduplicate** - Normalize and deduplicate brand names
5. **Store** - Save brands and relationships in database
6. **Update Counts** - Update trader counts for each brand

### Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4, shadcn/ui
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: Better Auth (Google OAuth)
- **AI**: OpenAI (GPT-4o, GPT-4o-mini, etc.)
- **Deployment**: Vercel-ready

## 🛠️ Troubleshooting

### "No brands found" error

- Website may not list brands clearly
- Try a different AI model (gpt-4o instead of gpt-4o-mini)
- Check OPENAI_API_KEY is set correctly

### Scan timeout

- Website is too slow
- Try again or use a different trader
- Consider implementing background jobs

### Database errors

- Verify POSTGRES_URL is correct
- Run migrations: `pnpm run db:migrate`
- Check database is accessible

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Support

- [Create an Issue](https://github.com/yourusername/brand-finder/issues)
- Check [Feature Documentation](docs/features/brand-finder.md)
- Review existing issues for solutions

---

**Built with ❤️ using Next.js and AI**
