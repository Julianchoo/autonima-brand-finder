# Brand Finder Feature Documentation

## Overview

Brand Finder is an AI-powered application that automatically scans electronics trader websites to extract and catalog brand names. It helps users build a comprehensive database of electronics brands across multiple traders.

## Key Features

### 1. Trader Management

**File:** `src/app/traders/page.tsx`

Users can:
- Add new trader websites with name and URL
- View all their traders in a card-based grid layout
- Track the scanning status of each trader (pending, processing, completed, failed)
- Initiate scans or rescans of trader websites
- See last scanned timestamps and error messages

**API Endpoints:**
- `GET /api/traders` - List all traders for the current user
- `POST /api/traders` - Create a new trader
- `POST /api/traders/[id]/scan` - Scan a trader website for brands

### 2. AI-Powered Brand Extraction

**File:** `src/app/api/traders/[id]/scan/route.ts`

The scanning process:
1. Fetches the trader's website HTML
2. Sends the HTML content to OpenAI (GPT-4o-mini or configured model)
3. AI extracts all electronics brand names from the content
4. Stores brands in the database with normalized names
5. Creates relationships between traders and brands
6. Updates trader counts for each brand

**Key Technologies:**
- OpenAI API for brand extraction
- Structured prompts for electronics brand identification
- Error handling with status tracking

### 3. Brand Catalog

**File:** `src/app/brands/page.tsx`

Displays:
- All unique brands discovered across all traders
- Number of traders carrying each brand
- Statistics: total brands, total relationships, average traders per brand
- Card-based grid layout for easy browsing

**API Endpoint:**
- `GET /api/brands` - List all brands with trader counts

### 4. Database Schema

**File:** `src/lib/schema.ts`

**Tables:**

1. **trader**
   - id, name, url (unique)
   - status: pending | processing | completed | failed
   - lastScannedAt, errorMessage
   - userId (foreign key to user table)

2. **brand**
   - id, name (unique), normalizedName
   - traderCount (denormalized for performance)

3. **traderBrand** (junction table)
   - id, traderId, brandId
   - Relationships between traders and brands

### 5. Navigation

**File:** `src/components/site-header.tsx`

- Brand Finder logo and branding
- Navigation links to Traders and Brands pages
- User authentication status and profile
- Dark/light mode toggle

## User Flow

### First Time User

1. User lands on home page
2. Signs in with Google OAuth
3. Navigated to Traders page
4. Adds first trader with URL
5. Clicks "Start Scan" to analyze the website
6. AI extracts brands (takes 10-60 seconds)
7. Views results in Brands catalog

### Returning User

1. Views traders and their scan status
2. Rescans traders to find new brands
3. Browses brand catalog to see which brands appear on multiple traders
4. Adds more traders to expand catalog

## Configuration

### Required Environment Variables

```env
# Database
POSTGRES_URL=postgresql://...

# Authentication
BETTER_AUTH_SECRET=32-char-random-string
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# AI (Required for brand extraction)
OPENAI_API_KEY=sk-proj-your-key-here
OPENAI_MODEL=gpt-4o-mini  # or gpt-4o, gpt-4-turbo

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### AI Model Configuration

The default model is `gpt-4o-mini` for cost-effectiveness. You can use any OpenAI model:
- `gpt-4o-mini` - Fast and cost-effective (default)
- `gpt-4o` - More accurate but more expensive
- `gpt-4-turbo` - Balanced performance and cost

Update `OPENAI_MODEL` in `.env` to change the model.

## Technical Details

### Brand Deduplication

Brands are deduplicated using:
- Normalized names (lowercase, trimmed)
- Unique constraint on brand name
- SQL upsert operations with conflict handling

### Performance Considerations

- Trader scanning has a 5-minute timeout (`maxDuration = 300`)
- Only first 50,000 characters of HTML are analyzed
- Brand-trader relationships use junction table
- Denormalized trader count on brands for fast queries

### Error Handling

- URL validation before adding traders
- HTTP errors during website fetch are caught and stored
- AI API errors are logged and reported to user
- Failed scans can be retried

### Security

- All routes require authentication
- Traders are scoped to user (userId foreign key)
- SQL injection prevented by Drizzle ORM parameterization
- CORS and rate limiting via Next.js defaults

## Future Enhancements

Potential improvements:
1. **Background Jobs**: Move scanning to queue system for better UX
2. **Brand Details**: Add brand logos, descriptions, categories
3. **Export**: CSV/Excel export of brand catalog
4. **Filtering**: Filter brands by trader count, date added, etc.
5. **Search**: Full-text search across brands
6. **Analytics**: Track brand trends, new brands over time
7. **Web Scraping**: Use Playwright for JavaScript-heavy sites
8. **Bulk Import**: Upload CSV of trader URLs

## Troubleshooting

### "No brands found" message

Possible causes:
- Website has no brand names in HTML
- AI couldn't identify brands (unusual format)
- OPENAI_API_KEY not configured
- Website blocks automated requests

**Solution**: Try rescanning, check AI model configuration, or manually verify website content.

### Scan fails with timeout

Possible causes:
- Website is very slow to load
- Large HTML content (>50KB)
- AI API is slow to respond

**Solution**: Increase timeout in route handler, optimize HTML parsing, or use faster AI model.

### Duplicate brands with different names

Possible causes:
- Brand names vary across websites (e.g., "LG" vs "LG Electronics")
- AI extraction inconsistency

**Solution**: Add brand normalization logic, manual merge feature, or improve AI prompt.

## Example Traders

Test the application with these electronics traders:
- https://boolchand.com/
- https://www.electronicsmexico.com/
- https://atacadoconnect.com/
- https://www.b2bmayoristas.com/
