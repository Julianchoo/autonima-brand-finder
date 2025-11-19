/**
 * Smart web crawler for discovering and extracting brands from websites
 */

interface CrawlPage {
  url: string;
  priority: number; // Higher priority = crawl sooner
  depth: number;
}

interface CrawlResult {
  url: string;
  brands: string[];
  linksFound: number;
}

interface CrawlerOptions {
  maxPages?: number; // Maximum pages to crawl (default: 10)
  maxDepth?: number; // Maximum depth to crawl (default: 2)
  delayMs?: number; // Delay between requests in ms (default: 1000)
  timeout?: number; // Timeout for each request in ms (default: 10000)
}

/**
 * Prioritize URLs that are more likely to contain brand information
 */
function calculateUrlPriority(url: string, depth: number): number {
  const path = url.toLowerCase();

  // High priority keywords
  if (
    path.includes("/brand") ||
    path.includes("/manufacturer") ||
    path.includes("/partner")
  ) {
    return 100 - depth;
  }

  // Medium-high priority
  if (
    path.includes("/product") ||
    path.includes("/shop") ||
    path.includes("/store") ||
    path.includes("/catalog")
  ) {
    return 80 - depth;
  }

  // Medium priority
  if (
    path.includes("/about") ||
    path.includes("/category") ||
    path.includes("/collection")
  ) {
    return 60 - depth;
  }

  // Lower priority for general pages
  return 40 - depth;
}

/**
 * Extract and normalize links from HTML
 */
function extractLinks(html: string, baseUrl: string): string[] {
  const links: string[] = [];
  const base = new URL(baseUrl);

  // Extract href attributes from anchor tags
  const hrefRegex = /<a[^>]+href=["']([^"']+)["']/gi;
  let match;

  while ((match = hrefRegex.exec(html)) !== null) {
    try {
      const href = match[1];

      // Skip anchors, mailto, tel, javascript, etc.
      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:")
      ) {
        continue;
      }

      // Resolve relative URLs
      const absoluteUrl = new URL(href, base);

      // Only include links from the same domain
      if (absoluteUrl.hostname === base.hostname) {
        // Remove hash and normalize
        absoluteUrl.hash = "";
        const normalizedUrl = absoluteUrl.toString();

        // Skip common non-content pages
        const path = absoluteUrl.pathname.toLowerCase();
        if (
          !path.endsWith(".pdf") &&
          !path.endsWith(".jpg") &&
          !path.endsWith(".jpeg") &&
          !path.endsWith(".png") &&
          !path.endsWith(".gif") &&
          !path.endsWith(".zip") &&
          !path.endsWith(".xml") &&
          !path.includes("/cart") &&
          !path.includes("/checkout") &&
          !path.includes("/login") &&
          !path.includes("/register") &&
          !path.includes("/account")
        ) {
          links.push(normalizedUrl);
        }
      }
    } catch (error) {
      // Invalid URL, skip it
      continue;
    }
  }

  return [...new Set(links)]; // Remove duplicates
}

/**
 * Extract text from HTML (same as before)
 */
function extractTextFromHTML(html: string): string {
  let text = html;

  // Extract alt attributes from images
  const altMatches = html.matchAll(/alt=["']([^"']+)["']/gi);
  for (const match of altMatches) {
    text += ` ${match[1]}`;
  }

  // Extract title attributes
  const titleMatches = html.matchAll(/title=["']([^"']+)["']/gi);
  for (const match of titleMatches) {
    text += ` ${match[1]}`;
  }

  // Extract meta content
  const metaMatches = html.matchAll(/content=["']([^"']+)["']/gi);
  for (const match of metaMatches) {
    text += ` ${match[1]}`;
  }

  // Remove script and style tags
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ");
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ");

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Remove extra whitespace
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

/**
 * Extract brands from a page using AI
 */
async function extractBrandsFromPage(url: string, timeout: number): Promise<string[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Failed to fetch ${url}: ${response.statusText}`);
      return [];
    }

    const html = await response.text();
    const cleanedText = extractTextFromHTML(html);

    // Use OpenAI to extract brand names
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const openAIResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a brand extraction specialist for electronics traders. Your job is to analyze website content and extract ALL electronics brand names mentioned anywhere on the page. Look for: camera brands (Canon, Nikon, Sony, Fujifilm, Panasonic, Olympus, Leica), phone brands (Samsung, Apple, iPhone, Xiaomi, OnePlus, Google, Motorola, Nokia, Huawei), computer brands (Dell, HP, Lenovo, Asus, Acer, MSI, Apple, MacBook), TV brands (LG, Samsung, Sony, TCL, Hisense, Vizio), audio brands (Bose, JBL, Sennheiser, Audio-Technica, Sony, Beats), storage brands (SanDisk, Kingston, Samsung, Western Digital, Seagate, Crucial), smartwatch brands (Apple Watch, Garmin, Fitbit, Samsung Galaxy Watch), accessory brands (Otterbox, Spigen, Anker), camera accessory brands (GoPro, DJI, Manfrotto), and ANY other electronics brands you can find. Be thorough and include all brands, even if mentioned only once. Return ONLY a JSON array of brand names, nothing else.",
            },
            {
              role: "user",
              content: `Extract ALL electronics brand names from this website content. Be very thorough - include every brand you can find in product names, descriptions, links, navigation menus, footers, and anywhere else. Return only a JSON array of unique brand names in proper capitalization, for example: ["Canon", "Nikon", "Sony", "SanDisk", "Apple", "Samsung"]. If no brands are found, return an empty array [].\n\nWebsite content (first 40000 chars):\n${cleanedText.slice(0, 40000)}`,
            },
          ],
          temperature: 0.1,
          max_tokens: 4000,
        }),
      }
    );

    if (!openAIResponse.ok) {
      console.warn(`OpenAI API error for ${url}`);
      return [];
    }

    const aiResult = await openAIResponse.json();
    const content = aiResult.choices?.[0]?.message?.content || "[]";

    // Parse the JSON array from the AI response
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const brands = JSON.parse(jsonMatch[0]) as string[];
        return [...new Set(brands.map((b) => b.trim()).filter((b) => b.length > 0))];
      }
      return [];
    } catch (error) {
      console.error("Failed to parse AI response for", url);
      return [];
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      console.warn(`Request timeout for ${url}`);
    } else {
      console.warn(`Error fetching ${url}:`, error);
    }
    return [];
  }
}

/**
 * Crawl a website and extract brands from multiple pages
 */
export async function crawlWebsite(
  startUrl: string,
  options: CrawlerOptions = {}
): Promise<{
  brands: string[];
  pagesScanned: CrawlResult[];
  totalPages: number;
}> {
  const {
    maxPages = 10,
    maxDepth = 2,
    delayMs = 1000,
    timeout = 10000,
  } = options;

  const queue: CrawlPage[] = [];
  const visited = new Set<string>();
  const allBrands = new Set<string>();
  const results: CrawlResult[] = [];

  // Normalize start URL
  const normalizedStartUrl = new URL(startUrl).toString();
  queue.push({
    url: normalizedStartUrl,
    priority: 100,
    depth: 0,
  });

  console.log(`Starting crawl of ${normalizedStartUrl}`);
  console.log(`Settings: maxPages=${maxPages}, maxDepth=${maxDepth}, delay=${delayMs}ms`);

  while (queue.length > 0 && visited.size < maxPages) {
    // Sort by priority (highest first)
    queue.sort((a, b) => b.priority - a.priority);
    const current = queue.shift()!;

    // Skip if already visited
    if (visited.has(current.url)) {
      continue;
    }

    visited.add(current.url);
    console.log(`[${visited.size}/${maxPages}] Crawling: ${current.url} (depth: ${current.depth}, priority: ${current.priority})`);

    try {
      // Fetch and extract brands
      const brands = await extractBrandsFromPage(current.url, timeout);
      brands.forEach((brand) => allBrands.add(brand));

      // Fetch HTML again to extract links (could be optimized by caching)
      const response = await fetch(current.url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      let links: string[] = [];
      if (response.ok && current.depth < maxDepth) {
        const html = await response.text();
        links = extractLinks(html, current.url);

        // Add new links to queue
        for (const link of links) {
          if (!visited.has(link) && !queue.some((p) => p.url === link)) {
            const priority = calculateUrlPriority(link, current.depth + 1);
            queue.push({
              url: link,
              priority,
              depth: current.depth + 1,
            });
          }
        }
      }

      results.push({
        url: current.url,
        brands,
        linksFound: links.length,
      });

      console.log(`  → Found ${brands.length} brands, ${links.length} new links`);

      // Rate limiting - wait before next request
      if (queue.length > 0 && visited.size < maxPages) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`Error crawling ${current.url}:`, error);
      results.push({
        url: current.url,
        brands: [],
        linksFound: 0,
      });
    }
  }

  const uniqueBrands = Array.from(allBrands).sort();
  console.log(`Crawl complete! Scanned ${visited.size} pages, found ${uniqueBrands.length} unique brands`);

  return {
    brands: uniqueBrands,
    pagesScanned: results,
    totalPages: visited.size,
  };
}
