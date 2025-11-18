CREATE TABLE "brand" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"trader_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "brand_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "trader" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"last_scanned_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "trader_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "trader_brand" (
	"id" text PRIMARY KEY NOT NULL,
	"trader_id" text NOT NULL,
	"brand_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trader" ADD CONSTRAINT "trader_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trader_brand" ADD CONSTRAINT "trader_brand_trader_id_trader_id_fk" FOREIGN KEY ("trader_id") REFERENCES "public"."trader"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trader_brand" ADD CONSTRAINT "trader_brand_brand_id_brand_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brand"("id") ON DELETE cascade ON UPDATE no action;