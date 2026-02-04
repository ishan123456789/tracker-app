/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as activityCategories from "../activityCategories.js";
import type * as analytics from "../analytics.js";
import type * as audit from "../audit.js";
import type * as auth from "../auth.js";
import type * as automation from "../automation.js";
import type * as categoryHierarchy from "../categoryHierarchy.js";
import type * as comments from "../comments.js";
import type * as integrations from "../integrations.js";
import type * as migrations from "../migrations.js";
import type * as sections from "../sections.js";
import type * as teams from "../teams.js";
import type * as todos from "../todos.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  activityCategories: typeof activityCategories;
  analytics: typeof analytics;
  audit: typeof audit;
  auth: typeof auth;
  automation: typeof automation;
  categoryHierarchy: typeof categoryHierarchy;
  comments: typeof comments;
  integrations: typeof integrations;
  migrations: typeof migrations;
  sections: typeof sections;
  teams: typeof teams;
  todos: typeof todos;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
