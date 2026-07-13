CREATE TABLE "feeding_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"time" varchar(5) NOT NULL,
	"amount_grams" integer NOT NULL,
	"pet_target" varchar(100) DEFAULT 'all' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
