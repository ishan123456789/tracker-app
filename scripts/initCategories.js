// Script to initialize category hierarchy data
import { ConvexHttpClient } from "convex/browser";

const client = new ConvexHttpClient("https://your-convex-deployment-url.convex.cloud");

async function initializeCategories() {
  try {
    const result = await client.mutation("categoryHierarchy:initializeCategoryHierarchy", {});
    console.log("Category hierarchy initialized:", result);
  } catch (error) {
    console.error("Error initializing categories:", error);
  }
}

initializeCategories();
