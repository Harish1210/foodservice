import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  isVeg: boolean;
}

// Local assistant when no API key is set
function localAssistant(
  userMessage: string,
  menuItems: Array<{ id: string; name: string; price: number; isVeg: boolean; isSpicy: boolean; description: string | null; allergens: string | null }>,
  cartItems: CartItem[]
): { reply: string; actions: Action[] } {
  const lower = userMessage.toLowerCase();
  const actions: Action[] = [];
  let reply = "";

  const cartTotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  // Greetings
  if (/^(hi|hello|hey|g'day|howdy)/i.test(lower)) {
    reply = `G'day! Welcome to Home Food Service 🍛 I'm Priya, your personal food assistant. I can help you:\n• Browse our menu\n• Add items to your cart\n• Answer questions about dishes\n• Help you place your order\n\nWhat are you in the mood for today?`;
    return { reply, actions };
  }

  // Cart status
  if (/cart|order so far|what.*(i|me).*ordered|total/i.test(lower)) {
    if (cartItems.length === 0) {
      reply = "Your cart is empty! Would you like me to suggest something? We have amazing Butter Chicken, Lamb Biryani, and our chef's specials today 🌟";
    } else {
      const list = cartItems.map((i) => `• ${i.quantity}× ${i.name} — $${(i.price * i.quantity).toFixed(2)}`).join("\n");
      reply = `Here's what's in your cart (${cartCount} item${cartCount !== 1 ? "s" : ""}):\n\n${list}\n\nSubtotal: $${cartTotal.toFixed(2)} AUD\n\nShall I add anything else, or are you ready to checkout?`;
    }
    return { reply, actions };
  }

  // Recommendations
  if (/recommend|suggest|popular|best|favourite|what.*good|help.*choose|can.*(t|not).*decide/i.test(lower)) {
    const featured = menuItems.filter((m) => m.name.toLowerCase().includes("butter") || m.name.toLowerCase().includes("biryani") || m.name.toLowerCase().includes("tikka")).slice(0, 3);
    const list = featured.map((m) => `• **${m.name}** — $${m.price.toFixed(2)}`).join("\n");
    reply = `Great question! Here are our most loved dishes:\n\n${list}\n\nThe Butter Chicken is our all-time signature dish — rich, creamy and perfect! The Chicken Biryani is incredibly fragrant. And Lamb Rogan Josh is a must-try for meat lovers.\n\nWould you like to add any of these to your cart?`;
    return { reply, actions };
  }

  // Vegetarian
  if (/veg(etarian)?|no meat|plant.based|meatless/i.test(lower)) {
    const vegItems = menuItems.filter((m) => m.isVeg).slice(0, 5);
    const list = vegItems.map((m) => `• **${m.name}** — $${m.price.toFixed(2)}`).join("\n");
    reply = `We have ${menuItems.filter((m) => m.isVeg).length} vegetarian dishes! Here are some highlights:\n\n${list}\n\nAll marked with a green dot on the menu. My personal favourite is Paneer Tikka Masala — the cottage cheese is divine! 🥘\n\nWould you like to add any to your cart?`;
    return { reply, actions };
  }

  // Spicy
  if (/spic(y|e)|hot|chilli|mild|not.*spic/i.test(lower)) {
    const spicyItems = menuItems.filter((m) => m.isSpicy).slice(0, 4);
    if (/mild|not.*spic|without.*spic/i.test(lower)) {
      reply = "No worries! Our mildest dishes include Butter Chicken, Korma, Palak Paneer and Dal Makhani — all creamy and gentle on the palate 😊 Would you like to add any?";
    } else {
      const list = spicyItems.map((m) => `• **${m.name}** — $${m.price.toFixed(2)}`).join("\n");
      reply = `Love the heat! 🌶️ Here are our spiciest dishes:\n\n${list}\n\nVindaloo is the fiercest — not for the faint-hearted! Rogan Josh has a beautiful warming heat. Which one tempts you?`;
    }
    return { reply, actions };
  }

  // Allergy
  if (/allerg|nut|gluten|dairy|lactose|shellfish/i.test(lower)) {
    const allergen = lower.includes("nut") ? "nuts" : lower.includes("gluten") ? "gluten" : lower.includes("dairy") ? "dairy" : lower.includes("shellfish") ? "shellfish" : "allergens";
    const safeItems = menuItems.filter((m) => !m.allergens?.includes(allergen.replace(/s$/, ""))).slice(0, 5);
    reply = `For ${allergen} concerns, here are some safe options:\n\n${safeItems.slice(0, 4).map((m) => `• **${m.name}** — $${m.price.toFixed(2)}`).join("\n")}\n\nPlease always mention your allergy in the special instructions at checkout, and our kitchen will take extra care 🙏`;
    return { reply, actions };
  }

  // Checkout / ready to order
  if (/checkout|pay|order|ready|place.*order|confirm/i.test(lower)) {
    if (cartItems.length === 0) {
      reply = "Your cart is empty! Let me help you pick some dishes first. What are you in the mood for — curry, biryani, or something lighter?";
    } else {
      reply = `Perfect! You have ${cartCount} item${cartCount !== 1 ? "s" : ""} totalling $${cartTotal.toFixed(2)}. \n\nHead to your cart to choose delivery, pickup or dine-in, then proceed to checkout. Your food will be ready in about 20-40 minutes! 🍛\n\nIs there anything else you'd like to add before you go?`;
      actions.push({ type: "navigate", url: "/cart" });
    }
    return { reply, actions };
  }

  // Try to match a specific menu item to add
  const numberWords: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 };
  for (const item of menuItems) {
    const nameLower = item.name.toLowerCase();
    if (lower.includes(nameLower) || lower.includes(nameLower.split(" ")[0])) {
      let quantity = 1;
      const qMatch = lower.match(/(\d+|one|two|three|four|five)\s+(of\s+)?/i);
      if (qMatch) quantity = parseInt(qMatch[1]) || numberWords[qMatch[1].toLowerCase()] || 1;
      actions.push({ type: "addToCart", item: { menuItemId: item.id, name: item.name, price: item.price, quantity, isVeg: item.isVeg } });
      reply = `Great choice! I've added ${quantity}× **${item.name}** ($${(item.price * quantity).toFixed(2)}) to your cart 🛒\n\n${item.description ?? ""}\n\nWould you like anything else? Maybe some ${item.isVeg ? "Garlic Naan or a Mango Lassi" : "Butter Naan to go with that"}?`;
      return { reply, actions };
    }
  }

  // Default
  reply = `I'm not quite sure about that, but I'm here to help! You can ask me:\n• "What do you recommend?"\n• "Show me vegetarian options"\n• "Add a Butter Chicken"\n• "What's in my cart?"\n• "I'm ready to checkout"\n\nWhat would you like? 😊`;
  return { reply, actions };
}

type Action =
  | { type: "addToCart"; item: CartItem }
  | { type: "removeFromCart"; menuItemId: string }
  | { type: "navigate"; url: string }
  | { type: "clearCart" };

export async function POST(req: NextRequest) {
  try {
    const { messages, cartItems } = await req.json() as {
      messages: Message[];
      cartItems: CartItem[];
    };

    const userMessage = messages[messages.length - 1]?.content ?? "";

    // Fetch menu for context
    const menuItems = await prisma.menuItem.findMany({
      where: { isAvailable: true },
      select: { id: true, name: true, price: true, isVeg: true, isSpicy: true, description: true, allergens: true },
    });

    const apiKey = process.env.ANTHROPIC_API_KEY;

    // Use Claude API if key is available
    if (apiKey && apiKey !== "your_anthropic_api_key") {
      const menuContext = menuItems.map((m) =>
        `ID:${m.id} | ${m.name} | $${m.price} | ${m.isVeg ? "VEG" : "NON-VEG"} | ${m.isSpicy ? "SPICY" : ""}`
      ).join("\n");

      const cartContext = cartItems.length > 0
        ? cartItems.map((i) => `${i.quantity}× ${i.name} ($${i.price})`).join(", ")
        : "Empty";

      const systemPrompt = `You are Priya, a warm and helpful AI food assistant for "Home Food Service" — an authentic Indian restaurant in Sydney, Australia. You speak in a friendly, conversational way with occasional Australian expressions.

MENU (${menuItems.length} items):
${menuContext}

CUSTOMER'S CART: ${cartContext}

Your capabilities:
1. Recommend dishes based on preferences
2. Answer questions about ingredients, allergens, spice levels
3. Add items to cart by responding with JSON action blocks
4. Help customer navigate to checkout

When adding items to cart, include this EXACTLY at the end of your response:
ACTION:{"type":"addToCart","item":{"menuItemId":"ITEM_ID","name":"ITEM_NAME","price":PRICE,"quantity":1,"isVeg":true/false}}

When navigating, include:
ACTION:{"type":"navigate","url":"/cart"}

Keep responses warm, concise (2-4 sentences usually), and helpful. Always suggest complementary items. Currency is AUD.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 600,
          system: systemPrompt,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();
      const fullText: string = data.content?.[0]?.text ?? "";

      // Parse action from response
      const actions: Action[] = [];
      const actionMatches = fullText.matchAll(/ACTION:(\{[^}]+\})/g);
      for (const match of actionMatches) {
        try {
          actions.push(JSON.parse(match[1]));
        } catch { /* ignore */ }
      }

      const reply = fullText.replace(/ACTION:\{[^}]+\}/g, "").trim();
      return NextResponse.json({ reply, actions });
    }

    // Fallback to local assistant
    const { reply, actions } = localAssistant(userMessage, menuItems, cartItems);
    return NextResponse.json({ reply, actions });

  } catch (err) {
    console.error("Assistant error:", err);
    return NextResponse.json({
      reply: "Sorry, I had a little trouble there. Please try again! 🙏",
      actions: [],
    });
  }
}
