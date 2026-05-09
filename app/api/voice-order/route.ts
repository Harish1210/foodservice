import { NextRequest, NextResponse } from "next/server";

interface MenuItem {
  id: string;
  name: string;
  price: number;
}

function parseVoiceOrderLocally(text: string, menuItems: MenuItem[]) {
  const lower = text.toLowerCase();
  const matched: { id: string; quantity: number }[] = [];

  // Number words mapping
  const numberWords: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  };

  for (const item of menuItems) {
    const nameLower = item.name.toLowerCase();
    const words = nameLower.split(" ");
    const firstWord = words[0];

    if (lower.includes(nameLower) || lower.includes(firstWord)) {
      // Try to find quantity before the item name
      let quantity = 1;
      const pattern = new RegExp(`(\\d+|one|two|three|four|five|six|seven|eight|nine|ten)\\s+${firstWord}`, "i");
      const match = lower.match(pattern);
      if (match) {
        const q = parseInt(match[1]) || numberWords[match[1].toLowerCase()];
        if (q) quantity = q;
      }
      matched.push({ id: item.id, quantity });
    }
  }

  return matched;
}

export async function POST(req: NextRequest) {
  try {
    const { text, menuItems } = await req.json() as { text: string; menuItems: MenuItem[] };

    // Try Claude API if key is available
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey && apiKey !== "your_anthropic_api_key") {
      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 512,
            messages: [{
              role: "user",
              content: `You are a restaurant ordering assistant. Parse this voice order and return matching menu items.

Voice order: "${text}"

Available menu items:
${menuItems.map((i) => `- ID: ${i.id} | Name: ${i.name} | Price: $${i.price}`).join("\n")}

Return ONLY a JSON array like: [{"id": "item-id", "quantity": 1}]
If no items match, return: []
Do not include any explanation, just the JSON array.`,
            }],
          }),
        });

        const data = await response.json();
        const content = data.content?.[0]?.text ?? "[]";
        const jsonMatch = content.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          const items = JSON.parse(jsonMatch[0]);
          return NextResponse.json({ items, source: "ai" });
        }
      } catch {
        // Fall through to local parsing
      }
    }

    // Local fallback parsing
    const items = parseVoiceOrderLocally(text, menuItems);
    return NextResponse.json({ items, source: "local" });
  } catch {
    return NextResponse.json({ items: [], error: "Failed to process voice order" });
  }
}
