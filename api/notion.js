import { Client } from "@notionhq/client";

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const PORTAL_TOKEN = process.env.PORTAL_TOKEN;

// Database IDs
const DATABASES = {
  clients: "2d90e47d803381ebaefef4d989844848",
  invoices: "2d90e47d8033806cb6daf117fbdf92de",
  invoice_lines: "2d90e47d8033801a9cb9c07e9bb6d3a3",
  products: "2dd0e47d80338091af0bc193f4a7c43c",
  pricebook: "2dd0e47d8033805c8d45ed35337b34d6",
  payments: "2ef0e47d803380479270ee1b1d807815",
};

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    // Check auth token
    const token = req.query.token || req.body.token;
    if (!token || token !== PORTAL_TOKEN) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { db, limit = 100, filter = null } = req.query;

    if (!db || !DATABASES[db]) {
      return res
        .status(400)
        .json({ error: `Invalid database. Available: ${Object.keys(DATABASES).join(", ")}` });
    }

    // Fetch from Notion
    const response = await notion.databases.query({
      database_id: DATABASES[db],
      page_size: Math.min(parseInt(limit), 100),
      filter: filter ? JSON.parse(filter) : undefined,
    });

    // Format response
    const records = response.results.map((page) => ({
      id: page.id,
      properties: page.properties,
      url: page.url,
    }));

    res.status(200).json({
      success: true,
      count: records.length,
      records,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
