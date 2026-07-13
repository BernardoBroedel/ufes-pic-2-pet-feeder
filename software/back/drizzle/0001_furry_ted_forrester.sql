CREATE TABLE "pets" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"age_text" varchar(50),
	"weight_kg" real,
	"daily_goal_kcal" integer,
	"avatar_base64" text,
	"ai_status" varchar(100) DEFAULT 'Sem fotos' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
