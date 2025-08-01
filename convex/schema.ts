import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sections: defineTable({
    title: v.string(),
    columns: v.array(v.object({ name: v.string(), type: v.string() })),
    entries: v.array(v.any()),
  }),
});
