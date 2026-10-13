import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const studyState = sqliteTable("study_state", {
  userId: text("user_id").primaryKey(),
  state: text("state", { mode: "json" }).notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const githubConnections = sqliteTable("github_connections", {
  userId: text("user_id").primaryKey(),
  encryptedToken: text("encrypted_token").notNull(),
  updatedAt: text("updated_at").notNull(),
});
