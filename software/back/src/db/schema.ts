import { pgTable, serial, varchar, integer, boolean, timestamp, text, real } from "drizzle-orm/pg-core";

/** Tabela de agendamentos de alimentação automática */
export const feedingSchedules = pgTable("feeding_schedules", {
  id: serial("id").primaryKey(),
  time: varchar("time", { length: 5 }).notNull(),
  amountGrams: integer("amount_grams").notNull(),
  petTarget: varchar("pet_target", { length: 100 }).notNull().default("all"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Tipo inferido para SELECT */
export type FeedingSchedule = typeof feedingSchedules.$inferSelect;

/** Tipo inferido para INSERT */
export type NewFeedingSchedule = typeof feedingSchedules.$inferInsert;

/** Tabela de Pets do usuário */
export const pets = pgTable("pets", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  ageText: varchar("age_text", { length: 50 }),
  weightKg: real("weight_kg"),
  dailyGoalKcal: integer("daily_goal_kcal"),
  avatarBase64: text("avatar_base64"),
  aiStatus: varchar("ai_status", { length: 100 }).notNull().default("Sem fotos"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Tipo inferido para SELECT na tabela Pets */
export type Pet = typeof pets.$inferSelect;

/** Tipo inferido para INSERT na tabela Pets */
export type NewPet = typeof pets.$inferInsert;
