import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sections: defineTable({
    title: v.string(),
    columns: v.array(
      v.object({
        name: v.string(),
        type: v.string(), // "text", "number", "dropdown"
        options: v.optional(v.array(v.string())),
        allowMultiple: v.optional(v.boolean()),
      })
    ),
    entries: v.array(v.any()),
  }),
});
