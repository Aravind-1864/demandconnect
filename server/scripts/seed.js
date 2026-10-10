/**
 * Populates the database with categories, an admin, a demo customer and a
 * set of providers (with photos) so every screen has realistic data.
 *
 *   npm run seed              # adds / refreshes demo data (safe to re-run)
 *   npm run seed -- --reset   # wipes all collections first
 */
const mongoose = require("mongoose");
const env = require("../config/env");
const connectDB = require("../config/db");
const User = require("../models/User");
const Category = require("../models/Category");
const ProviderProfile = require("../models/ProviderProfile");
const ServiceRequest = require("../models/ServiceRequest");
const Proposal = require("../models/Proposal");
const Booking = require("../models/Booking");
const Review = require("../models/Review");

const DEMO_PASSWORD = "Password123!";
const img = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=80`;

const CATEGORIES = [
  ["Photography", "Candid, traditional and cinematic event photography", "1452587925148-ce544e77e70d"],
  ["Catering", "Buffet, plated and live-counter food services", "1555244162-803834f70033"],
  ["Decoration", "Stage, mandap, floral and theme decoration", "1464366400600-7168b8af9bc3"],
  ["Makeup", "Bridal and party makeup artists", "1487412947147-5cebf100ffc2"],
  ["DJ", "DJs, sound systems and live music", "1516450360452-9312f5e86fc7"],
  ["Florist", "Bouquets, garlands and floral arrangements", "1529636798458-92182e662485"],
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

const PROVIDERS = [
  {
    name: "Arjun Reddy", email: "arjun@demo.com", businessName: "Frame & Light Studios",
    cats: ["Photography"], location: "Hyderabad", areas: ["Hyderabad", "Secunderabad", "Warangal"],
    price: 30000, skills: ["Candid photography", "Traditional photography", "Drone shots", "Wedding albums"],
    years: 8, verified: true, description: "Award-winning wedding photographers capturing candid and traditional moments, from the first look to the last dance.",
    cover: "1606216794074-735e91aa2c92", gallery: ["1606216794074-735e91aa2c92", "1519741497674-611481863552", "1465495976277-4387d4b0b4c6", "1544078751-58fee2d8a03b", "1527529482837-4698179dc6ce", "1583939003579-730e3918a45a"],
    rating: [5, 5, 4],
  },
  {
    name: "Meera Iyer", email: "meera@demo.com", businessName: "Moments by Meera",
    cats: ["Photography"], location: "Hyderabad", areas: ["Hyderabad"],
    price: 55000, skills: ["Cinematic photography", "Pre-wedding shoots", "Candid photography"],
    years: 5, verified: true, description: "Cinematic storytelling for weddings and pre-wedding shoots, edited with a soft, timeless palette.",
    cover: "1478146896981-b80fe463b330", gallery: ["1478146896981-b80fe463b330", "1583939003579-730e3918a45a", "1544078751-58fee2d8a03b", "1452587925148-ce544e77e70d"],
    rating: [4, 5],
  },
  {
    name: "Karthik Rao", email: "karthik@demo.com", businessName: "Click Craft",
    cats: ["Photography"], location: "Bengaluru", areas: ["Bengaluru", "Mysuru"],
    price: 25000, skills: ["Traditional photography", "Portraits"], years: 3, verified: false,
    description: "Affordable traditional photography and video coverage across Karnataka.",
    cover: "1558618666-fcd25c85cd64", gallery: ["1558618666-fcd25c85cd64", "1452587925148-ce544e77e70d", "1519741497674-611481863552"],
    rating: [],
  },
  {
    name: "Lakshmi Foods", email: "lakshmi@demo.com", businessName: "Lakshmi Royal Caterers",
    cats: ["Catering"], location: "Hyderabad", areas: ["Hyderabad", "Secunderabad"],
    price: 450, skills: ["South Indian buffet", "Live counters", "Vegetarian menus", "Biryani"],
    years: 12, verified: true, description: "Traditional Andhra and Hyderabadi feasts for 100 to 2000 guests, cooked fresh on site.",
    cover: "1555244162-803834f70033", gallery: ["1555244162-803834f70033", "1414235077428-338989a2e8c0", "1493770348161-369560ae357d", "1504674900247-0877df9cc836", "1555939594-58d7cb561ad1", "1540189549336-e6e99c3679fe"],
    rating: [5, 4, 4, 5],
  },
  {
    name: "Imran Sheikh", email: "imran@demo.com", businessName: "Saffron Table Catering",
    cats: ["Catering"], location: "Hyderabad", areas: ["Hyderabad"],
    price: 650, skills: ["Multi-cuisine buffet", "Live grill", "Desserts", "Plated service"],
    years: 9, verified: true, description: "Multi-cuisine catering with live grills and a dessert studio, designed for weddings and corporate events.",
    cover: "1414235077428-338989a2e8c0", gallery: ["1414235077428-338989a2e8c0", "1565299624946-b28f40a0ae38", "1567620905732-2d1ec7ab7445", "1540189549336-e6e99c3679fe"],
    rating: [5, 4],
  },
  {
    name: "Sana Khan", email: "sana@demo.com", businessName: "Glow by Sana",
    cats: ["Makeup"], location: "Hyderabad", areas: ["Hyderabad"],
    price: 15000, skills: ["Bridal makeup", "HD makeup", "Hair styling", "Airbrush"], years: 6, verified: true,
    description: "Bridal makeup artist specialising in HD and airbrush looks that last through the longest ceremonies.",
    cover: "1487412947147-5cebf100ffc2", gallery: ["1487412947147-5cebf100ffc2", "1522335789203-aabd1fc54bc9", "1596462502278-27bfdc403348"],
    rating: [5],
  },
  {
    name: "Rohit Menon", email: "rohit@demo.com", businessName: "Bloom & Petal Decor",
    cats: ["Decoration", "Florist"], location: "Hyderabad", areas: ["Hyderabad", "Vijayawada"],
    price: 40000, skills: ["Mandap decoration", "Floral stage", "Theme decor", "Garlands"],
    years: 7, verified: false, description: "Floral stage and mandap decoration that turns venues into storybook settings.",
    cover: "1464366400600-7168b8af9bc3", gallery: ["1464366400600-7168b8af9bc3", "1519225421980-715cb0215aed", "1523438885200-e635ba2c371e", "1469371670807-013ccf25f16a", "1522673607200-164d1b6ce486"],
    rating: [4],
  },
  {
    name: "Neha Kapoor", email: "neha@demo.com", businessName: "Petal Poetry Florals",
    cats: ["Florist", "Decoration"], location: "Hyderabad", areas: ["Hyderabad", "Secunderabad"],
    price: 12000, skills: ["Bridal bouquets", "Table centrepieces", "Floral arches", "Garlands"],
    years: 4, verified: true, description: "Seasonal, locally sourced flowers arranged into bouquets, centrepieces and ceremony arches.",
    cover: "1529636798458-92182e662485", gallery: ["1529636798458-92182e662485", "1457089328109-e5d9bd499191", "1561181286-d3fee7d55364", "1490750967868-88aa4486c946"],
    rating: [5, 5],
  },
  {
    name: "Vikram Sethi", email: "vikram@demo.com", businessName: "Pulse Live DJ & Sound",
    cats: ["DJ"], location: "Hyderabad", areas: ["Hyderabad", "Secunderabad", "Vijayawada"],
    price: 20000, skills: ["Wedding DJ", "Sangeet nights", "Live sound", "LED lighting"],
    years: 10, verified: true, description: "Wedding and sangeet DJ with full sound and lighting rigs. We read the room, you enjoy the party.",
    cover: "1516450360452-9312f5e86fc7", gallery: ["1516450360452-9312f5e86fc7", "1514525253161-7a46d19cd819", "1549451371-64aa98a6f660", "1429962714451-bb934ecdc4ec"],
    rating: [5, 4, 5],
  },
];

async function main() {
  if (env.NODE_ENV === "production") throw new Error("Refusing to seed demo data in production");
  await connectDB();

  if (process.argv.includes("--reset")) {
    await Promise.all(
      [User, Category, ProviderProfile, ServiceRequest, Proposal, Booking, Review].map((m) => m.deleteMany({}))
    );
    console.log("Collections cleared");
  }

  const passwordHash = await User.hashPassword(DEMO_PASSWORD);
  const upsertUser = (data) =>
    User.findOneAndUpdate({ email: data.email }, { $setOnInsert: { ...data, passwordHash } }, { upsert: true, returnDocument: "after" });

  const cats = {};
  for (const [name, description, image] of CATEGORIES) {
    cats[name] = await Category.findOneAndUpdate(
      { slug: slug(name) },
      { $setOnInsert: { name, slug: slug(name), description, active: true }, $set: { image: img(image) } },
      { upsert: true, returnDocument: "after" }
    );
  }

  await upsertUser({ name: "Platform Admin", email: "admin@demo.com", role: "ADMIN" });
  const customer = await upsertUser({ name: "Priya Sharma", email: "customer@demo.com", role: "CUSTOMER" });

  for (const p of PROVIDERS) {
    const user = await upsertUser({ name: p.name, email: p.email, role: "PROVIDER" });
    const profile = await ProviderProfile.findOneAndUpdate(
      { user: user._id },
      {
        $setOnInsert: {
          user: user._id,
          businessName: p.businessName,
          categories: p.cats.map((c) => cats[c]._id),
          description: p.description,
          location: p.location,
          serviceAreas: p.areas,
          startingPrice: p.price,
          skills: p.skills,
          experienceYears: p.years,
          verified: p.verified,
        },
        // Photos are refreshed on every run.
        $set: { coverImage: img(p.cover), portfolio: p.gallery.map(img) },
      },
      { upsert: true, returnDocument: "after" }
    );

    // Seed reviews through real (completed) bookings so data stays consistent.
    if (p.rating.length && (await Review.countDocuments({ providerProfile: profile._id })) === 0) {
      for (const [i, rating] of p.rating.entries()) {
        const reviewer = await upsertUser({ name: `Reviewer ${i + 1}`, email: `reviewer${i + 1}-${p.email}`, role: "CUSTOMER" });
        const date = new Date(Date.now() - (i + 1) * 30 * 864e5);
        const request = await ServiceRequest.create({
          customer: reviewer._id, title: `Past event ${i + 1}`, eventType: "Wedding", location: p.location,
          eventDate: date, services: [{ category: profile.categories[0], requirements: [] }], status: "COMPLETED",
        });
        const proposal = await Proposal.create({
          request: request._id, provider: user._id, providerProfile: profile._id,
          proposedPrice: p.price, status: "ACCEPTED",
        });
        const booking = await Booking.create({
          request: request._id, proposal: proposal._id, customer: reviewer._id, provider: user._id,
          providerProfile: profile._id, agreedPrice: p.price, eventDate: date, status: "COMPLETED", completedAt: date,
        });
        await Review.create({
          booking: booking._id, customer: reviewer._id, provider: user._id, providerProfile: profile._id,
          rating, comment: ["Fantastic work!", "Very professional.", "Great value.", "Would hire again."][i % 4],
        });
      }
      const avg = p.rating.reduce((a, b) => a + b, 0) / p.rating.length;
      await ProviderProfile.updateOne(
        { _id: profile._id },
        { ratingAverage: Math.round(avg * 10) / 10, ratingCount: p.rating.length }
      );
    }
  }

  console.log("\nSeed complete. Demo accounts (password for all: " + DEMO_PASSWORD + ")");
  console.log("  admin     admin@demo.com");
  console.log("  customer  " + customer.email);
  console.log("  provider  arjun@demo.com  (photography, Hyderabad)");
  console.log("  provider  lakshmi@demo.com (catering)");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
