import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const SUPABASE_URL = "https://coblvntmcbnyardnsrcs.supabase.co";
const SUPABASE_KEY = "sb_publishable_d4k0H3i6T0UGSKQsJHZyxQ_THoAl6fN";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SITE_CONTENT = {
  contact: {
    email: "hello@redycakes.co.uk",
    whatsapp: "447123456789",
    serviceArea: "Greater London, Surrey & Kent (delivery available across South East)",
    replyPromise: "within 24 hours, Monday to Saturday",
  },
  hero: {
    eyebrow: "Bespoke cake studio · London & South East",
    titleLead: "Beautiful bespoke cakes,",
    titleHighlight: "ordered the easy way.",
    intro: "Clear answers, honest timelines and flavours people actually rave about. No chasing, no confusion — just showstopping cakes made for your moment.",
    badgeValue: "500+",
    badgeText: "Celebrations baked to perfection",
  },
  trust: [
    {
      title: "Clear, upfront quotes",
      text: "No hidden extras, delivery surprises, or guessing. We tell you exactly what your design costs within 24 hours.",
    },
    {
      title: "Dietary-inclusive recipes",
      text: "Vegan, gluten-free, dairy-free and egg-free cakes that taste every bit as luxurious as traditional bakes.",
    },
    {
      title: "Stress-free delivery & setup",
      text: "Hand-delivered directly to your venue with on-site styling, chilled transport, and direct coordination with venue staff.",
    },
  ],
  gallery: [
    {
      title: "Highfield Pressed-Flower Tier",
      occasion: "Wedding",
      style: "Buttercream",
      brief: "Natural botanical wedding at Highfield Manor with edible British pressed florals matching the bride's meadow bouquet.",
      solution: "Three tiers of Madagascan vanilla bean and elderflower curd, finished in textured Swiss meringue buttercream and hand-applied pressed viola and cornflower petals.",
      src: "/hero_cake.png",
    },
    {
      title: "Rich Dark Chocolate & Raspberry",
      occasion: "Birthday",
      style: "Dietary-Friendly",
      brief: "A decadent 40th birthday centerpiece that must be 100% vegan without sacrificing rich cocoa depth.",
      solution: "70% Valrhona dark chocolate sponge layered with housemade raspberry compote and silky whipped vegan ganache, garnished with fresh berries and gold leaf.",
      src: "/vegan_cake.png",
    },
    {
      title: "Minimalist Stone & Orchid Tier",
      occasion: "Wedding",
      style: "Sculpted",
      brief: "Modern architectural silhouette for a contemporary gallery reception in Central London.",
      solution: "Sharp stone-textured edible fondant facade, delicate sugar wafer orchids, and interior layers of salted caramel and espresso.",
      src: "/minimalist_cake.png",
    },
    {
      title: "Enchanted Meadow Birthday",
      occasion: "Birthday",
      style: "Buttercream",
      brief: "Whimsical pastel spring birthday celebration for 35 guests with delicate butterfly accents.",
      solution: "Vanilla bean sponge with strawberry preserves, ombre lilac-to-sage piped buttercream ruffles, and edible wafer paper butterflies.",
      src: "/cupcakes_box.png",
    },
    {
      title: "Corporate Milestone Centrepiece",
      occasion: "Corporate",
      style: "Fondant",
      brief: "10-year tech anniversary cake incorporating brand color geometry and serving 100 guests cleanly.",
      solution: "Clean geometric hex tiers finished in smooth fondant, metallic bronze foil detailing, and alternating layers of red velvet and lemon zest.",
      src: "/hero_cake.png",
    },
    {
      title: "Signature Tasting Flight",
      occasion: "Celebration",
      style: "Dietary-Friendly",
      brief: "Sampling experience for a couple undecided between citrus, chocolate, and caramel flavour profiles.",
      solution: "Six individually portioned signature sponges with custom pairings delivered chilled in our signature luxury presentation box.",
      src: "/tasting_box.png",
    },
  ],
  quotes: [
    {
      q: "Not only was the cake stunning, but our guests haven't stopped talking about the lemon & elderflower flavour. Ordering was completely effortless.",
      who: "Camilla & James · Highfield Manor Wedding",
    },
    {
      q: "Finding a vegan cake that tastes this rich and moist felt impossible until we found Redycakes. It stole the show at my 30th.",
      who: "Marcus T. · Surrey Birthday",
    },
    {
      q: "Delivered right on time to our venue, set up seamlessly, and the communication throughout was refreshing. 10/10 service.",
      who: "Sophie L. · Corporate Gala Event",
    },
  ],
  dietary: {
    categories: [
      {
        name: "Vegan",
        how: "Rich plant-based butter, flax and aquafaba emulsions, and organic oat creams produce moist crumb structures indistinguishable from traditional bakes.",
      },
      {
        name: "Gluten-Free",
        how: "A proprietary blend of fine rice flour, tapioca starch, and almond meal retains delicate structure without grittiness or dryness.",
      },
      {
        name: "Dairy-Free",
        how: "Belgian dairy-free chocolate, organic cold-pressed coconut fats, and silky cocoa butter cremes deliver deep, velvety luxury.",
      },
      {
        name: "Egg-Free",
        how: "Specially balanced rising agents and fruit purées create light, airy sponges with natural moisture and clean flavor expression.",
      },
      {
        name: "Nut-Free Options",
        how: "Crafted in our sanitized dedicated prep cycle with seed-based flours and certified nut-free ingredients on request.",
      },
    ],
    flavours: [
      "Madagascan Vanilla Bean",
      "70% Dark Chocolate & Raspberry",
      "Lemon & Wild Elderflower",
      "Salted Caramel Ganache",
      "Pistachio & Rosewater",
      "Classic Red Velvet",
      "Coconut & Tangy Lime Curd",
      "Espresso & Toasted Hazelnut",
    ],
    allergenNotice: "Please note: while we operate strict sanitization and separation procedures, our studio handles flour, nuts, dairy, and eggs. We are completely transparent about all ingredients and take every allergy briefing seriously.",
  },
  tasting: {
    eyebrow: "Wedding & Celebration Tasting",
    title: "Taste the flavours in the comfort of your home.",
    intro: "Choosing your wedding cake should be joyful, relaxed, and delicious. Our luxury tasting boxes are delivered straight to your door with six of our most-requested seasonal flavours.",
    inside: [
      "Six generous signature cake slices individually sealed for peak freshness",
      "Detailed flavour pairing guide with notes from our head pastry chef",
      "Consultation questionnaire to capture your preferred fillings and finish",
      "£25 credit deducted directly from your final bespoke cake order",
    ],
    note: "Tasting boxes are dispatched bi-weekly via chilled courier. Perfect for couples planning 3–12 months in advance of their big day.",
  },
  howItWorks: {
    eyebrow: "Our Simple 5-Step Process",
    title: "From initial thought to your first slice.",
    intro: "We stripped away the endless back-and-forth emails. Here is how ordering your dream cake works:",
    steps: [
      {
        t: "1. Tell Us Your Vision",
        d: "Use our 2-minute order builder to share your event date, approximate guest count, flavours you love, and any inspiration photos.",
      },
      {
        t: "2. Transparent Quote within 24 Hours",
        d: "We send a transparent quote and visual design breakdown with clear pricing and flavour suggestions. No hidden fees ever.",
      },
      {
        t: "3. Secure Your Date",
        d: "Pay a simple 25% deposit to lock in your date in our studio calendar. We only take a limited number of commissions per week.",
      },
      {
        t: "4. Handcrafted in Our Studio",
        d: "We bake fresh the day before your event, crafting every tier, sugar bloom, and textured layer with precision.",
      },
      {
        t: "5. Delivery & On-Site Setup",
        d: "We hand-deliver in temperature-controlled transport, liaise directly with your venue, and assemble the cake for its big reveal.",
      },
    ],
    promiseNotice: "We promise clear communication at every milestone — zero stress, zero chasing.",
  },
  faq: [
    {
      q: "How far in advance should I order my cake?",
      a: "For weddings, we recommend booking 3 to 9 months in advance, especially for peak summer dates. For birthdays and celebrations, 2 to 4 weeks notice is ideal, though we will always accommodate last-minute requests if our calendar allows.",
    },
    {
      q: "Can you cater for severe allergies?",
      a: "We cater extensively for vegan, gluten-free, dairy-free, and egg-free dietary requirements. However, please note our kitchen handles wheat, dairy, eggs, and nuts. Contact us with specific allergy concerns and we will advise openly.",
    },
    {
      q: "Do you deliver and set up at the venue?",
      a: "Yes! Multi-tiered celebration and wedding cakes are hand-delivered by our team in temperature-controlled vehicles. We coordinate delivery times directly with venue coordinators so you don't have to worry about a thing.",
    },
    {
      q: "How much do bespoke cakes cost?",
      a: "Single tier celebration cakes start from £95. Two-tier designs (35–50 servings) start around £220. Three-tier wedding cakes (70–120 servings) typically range from £420 to £750 depending on complexity and floral elements.",
    },
    {
      q: "Can I try cake flavours before booking?",
      a: "Absolutely! Our signature Tasting Boxes contain six generous slices and can be ordered directly to your home. If you book your wedding cake with us, the tasting box cost is deducted from your final balance.",
    },
    {
      q: "What payment is needed to secure my booking?",
      a: "A 25% non-refundable deposit secures your event date in our calendar. The remaining balance is due 14 days before your celebration date.",
    },
  ],
  about: {
    eyebrow: "Our Story",
    title: "Baking with intention, flavour first.",
    paragraphs: [
      "Redycakes was born out of a simple observation: ordering a bespoke cake was often confusing, slow, and overly complicated — and too many showstopping cakes looked incredible on the outside but fell flat on flavour.",
      "We believe you shouldn't have to compromise. Every cake that leaves our studio is baked from scratch with the highest grade ingredients: real vanilla beans, fresh fruit compotes, and Belgian chocolate. Most importantly, we treat dietary requirements with the same passion and culinary integrity as our classic recipes.",
      "From intimate birthdays to grand country estate weddings, our joy comes from making the centerpiece of your celebration effortless, memorable, and unmistakably delicious.",
    ],
  },
  cta: {
    title: "Ready to create something memorable?",
    text: "Tell us about your celebration — we'll reply with a personalised quote and flavour guide within 24 hours.",
  },
};

const CMS_USERS = [
  {
    id: "usr_admin_01",
    email: "admin@redycakes.co.uk",
    name: "Head Baker & Admin",
    role: "superadmin",
    status: "active",
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    last_login: new Date().toISOString(),
  },
  {
    id: "usr_admin_02",
    email: "studio@redycakes.co.uk",
    name: "Studio Manager",
    role: "admin",
    status: "active",
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    last_login: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "usr_admin_03",
    email: "decorator@redycakes.co.uk",
    name: "Lead Decorator",
    role: "editor",
    status: "active",
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    last_login: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: "usr_admin_04",
    email: "orders@redycakes.co.uk",
    name: "Order Coordinator",
    role: "viewer",
    status: "active",
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    last_login: new Date().toISOString(),
  },
];

const INITIAL_ORDERS = [
  {
    id: crypto.randomUUID(),
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    name: "Sophia Martinez",
    email: "sophia.m@example.com",
    phone: "+44 7123 456789",
    occasion: "Wedding",
    event_date: "2026-11-14",
    guests: "85",
    budget: "£400–£700",
    flavours: ["Lemon & elderflower", "Vanilla bean"],
    dietary: ["Gluten-free"],
    fulfilment: "Delivery",
    notes: "Three-tier pressed flower design similar to the Highfield tier. Delivery and setup at Highfield Manor venue by 11:30 AM.",
    inspiration_paths: ["inspiration_sample_1.jpg"],
    status: "New",
  },
  {
    id: crypto.randomUUID(),
    created_at: new Date(Date.now() - 3600000 * 26).toISOString(),
    name: "Liam O'Connor",
    email: "liam.oc@example.com",
    phone: "+44 7987 654321",
    occasion: "Birthday",
    event_date: "2026-11-02",
    guests: "30",
    budget: "£100–£200",
    flavours: ["Dark chocolate", "Salted caramel"],
    dietary: ["Vegan"],
    fulfilment: "Collection",
    notes: "40th birthday celebration cake, rich glossy ganache with fresh raspberries and personalized '40' gold plaque.",
    inspiration_paths: [],
    status: "Quoted",
  },
  {
    id: crypto.randomUUID(),
    created_at: new Date(Date.now() - 3600000 * 50).toISOString(),
    name: "Hannah Watson",
    email: "hannah.watson@techco.co.uk",
    phone: "+44 7456 123456",
    occasion: "Corporate",
    event_date: "2026-11-20",
    guests: "120",
    budget: "£700+",
    flavours: ["Red velvet", "Pistachio & rose"],
    dietary: ["Nut-free", "Dairy-free"],
    fulfilment: "Delivery",
    notes: "Company 10th anniversary gala. Two side-by-side sculptural cakes with emerald green and champagne gold accents.",
    inspiration_paths: [],
    status: "Confirmed",
  },
  {
    id: crypto.randomUUID(),
    created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
    name: "Oliver & Maya Chen",
    email: "oliver.chen@example.org",
    phone: "+44 7333 888999",
    occasion: "Wedding",
    event_date: "2026-12-05",
    guests: "110",
    budget: "£700+",
    flavours: ["Madagascan Vanilla Bean", "Lemon & Wild Elderflower"],
    dietary: ["Vegetarian"],
    fulfilment: "Delivery",
    notes: "Winter botanical theme with rosemary, white wafer orchids and subtle edible shimmer.",
    inspiration_paths: [],
    status: "Baking",
  },
  {
    id: crypto.randomUUID(),
    created_at: new Date(Date.now() - 3600000 * 120).toISOString(),
    name: "Eleanor Rigby",
    email: "e.rigby@londonart.co.uk",
    phone: "+44 7555 444333",
    occasion: "Celebration",
    event_date: "2026-10-20",
    guests: "45",
    budget: "£200–£400",
    flavours: ["Salted Caramel Ganache"],
    dietary: [],
    fulfilment: "Collection",
    notes: "Gallery opening night celebration cake. Concrete stone effect finish.",
    inspiration_paths: [],
    status: "Completed",
  },
];

const INITIAL_MESSAGES = [
  {
    id: crypto.randomUUID(),
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    name: "Claire Bennett",
    email: "claire.bennett@example.com",
    message: "Hi there! Do you have availability for a small 2-tier wedding cake on December 5th in Richmond? We'd love the lemon elderflower flavour with pressed flowers.",
    status: "New",
  },
  {
    id: crypto.randomUUID(),
    created_at: new Date(Date.now() - 3600000 * 28).toISOString(),
    name: "Marcus Davies",
    email: "marcus.d@example.co.uk",
    message: "Enquiring about wedding tasting box delivery to Surrey. Are all six flavours completely nut-free, or can we request nut-free substitutes?",
    status: "Replied",
  },
  {
    id: crypto.randomUUID(),
    created_at: new Date(Date.now() - 3600000 * 64).toISOString(),
    name: "Amina Al-Mansoor",
    email: "amina@designstudio.london",
    message: "Hello! We are hosting an autumn studio launch next month and looking for 80 dessert portions of your vegan chocolate raspberry cake. Could you provide a quote?",
    status: "New",
  },
];

async function seedDatabase() {
  console.log("🌱 Starting complete Supabase database population...");

  // 1. Seed Site Content
  console.log("1. Upserting site_content...");
  const { error: contentErr } = await supabase
    .from("site_content")
    .upsert({
      id: "current_content",
      content: SITE_CONTENT,
      updated_at: new Date().toISOString(),
    });

  if (contentErr) {
    console.error("❌ site_content error:", contentErr);
  } else {
    console.log("✅ site_content successfully populated in Supabase!");
  }

  // 2. Seed CMS Users
  console.log("2. Upserting cms_users...");
  const { error: userErr } = await supabase
    .from("cms_users")
    .upsert(CMS_USERS);

  if (userErr) {
    console.error("❌ cms_users error:", userErr);
  } else {
    console.log(`✅ cms_users populated (${CMS_USERS.length} privileged users)!`);
  }

  // 3. Seed Order Requests
  console.log("3. Inserting order_requests...");
  const { error: orderErr } = await supabase
    .from("order_requests")
    .upsert(INITIAL_ORDERS);

  if (orderErr) {
    console.error("❌ order_requests error:", orderErr);
  } else {
    console.log(`✅ order_requests populated (${INITIAL_ORDERS.length} orders)!`);
  }

  // 4. Seed Contact Messages
  console.log("4. Inserting contact_messages...");
  const { error: msgErr } = await supabase
    .from("contact_messages")
    .upsert(INITIAL_MESSAGES);

  if (msgErr) {
    console.error("❌ contact_messages error:", msgErr);
  } else {
    console.log(`✅ contact_messages populated (${INITIAL_MESSAGES.length} inquiries)!`);
  }

  // 5. Seed Analytics Pageviews (past 14 days)
  console.log("5. Generating 14-day analytics pageviews...");
  const pages = ["/", "/cakes", "/order", "/dietary", "/how-it-works", "/tasting-boxes", "/about", "/contact"];
  const weights = [0.38, 0.24, 0.16, 0.08, 0.06, 0.04, 0.02, 0.02];
  const devices = ["Mobile", "Desktop", "Tablet"];
  const referrers = ["https://www.google.com", "https://instagram.com", "https://pinterest.com", "Direct", "https://facebook.com"];

  const pageviews = [];
  const now = Date.now();

  for (let i = 14; i >= 0; i--) {
    const dayDate = new Date(now - i * 86400000);
    const dayCount = Math.floor(35 + Math.sin(i) * 15 + Math.random() * 20);

    for (let j = 0; j < dayCount; j++) {
      const rand = Math.random();
      let cumulative = 0;
      let selectedPage = "/";
      for (let p = 0; p < pages.length; p++) {
        cumulative += weights[p];
        if (rand <= cumulative) {
          selectedPage = pages[p];
          break;
        }
      }

      pageviews.push({
        id: crypto.randomUUID(),
        created_at: new Date(dayDate.getTime() + Math.random() * 86400000).toISOString(),
        page_path: selectedPage,
        session_id: "sess_" + i + "_" + Math.floor(j / 3),
        device: devices[Math.floor(Math.random() * devices.length)],
        referrer: referrers[Math.floor(Math.random() * referrers.length)],
      });
    }
  }

  const { error: pvErr } = await supabase
    .from("analytics_pageviews")
    .insert(pageviews);

  if (pvErr) {
    console.error("❌ analytics_pageviews error:", pvErr);
  } else {
    console.log(`✅ analytics_pageviews populated (${pageviews.length} pageviews)!`);
  }

  // 6. Seed Analytics Events (conversions & interactions)
  console.log("6. Generating analytics events...");
  const events = [];
  for (let i = 14; i >= 0; i--) {
    const dayDate = new Date(now - i * 86400000);
    const ordersCount = Math.floor(2 + Math.random() * 3);
    for (let o = 0; o < ordersCount; o++) {
      events.push({
        id: crypto.randomUUID(),
        created_at: new Date(dayDate.getTime() + Math.random() * 86400000).toISOString(),
        event_name: "order_submitted",
        session_id: "sess_ord_" + i + "_" + o,
        metadata: { occasion: ["Wedding", "Birthday", "Celebration"][o % 3], budget: "£400–£700" },
      });
      events.push({
        id: crypto.randomUUID(),
        created_at: new Date(dayDate.getTime() + Math.random() * 86400000).toISOString(),
        event_name: "order_step_completed",
        session_id: "sess_ord_" + i + "_" + o,
        metadata: { step: 5 },
      });
    }
    events.push({
      id: crypto.randomUUID(),
      created_at: new Date(dayDate.getTime() + Math.random() * 86400000).toISOString(),
      event_name: "contact_submitted",
      session_id: "sess_contact_" + i,
      metadata: { source: "contact_page" },
    });
  }

  const { error: evErr } = await supabase
    .from("analytics_events")
    .insert(events);

  if (evErr) {
    console.error("❌ analytics_events error:", evErr);
  } else {
    console.log(`✅ analytics_events populated (${events.length} interaction events)!`);
  }

  console.log("🎉 Complete database population finished successfully!");
}

seedDatabase();
