CREATE TABLE "users" (
	"id" uuid PRIMARY KEY,
	"username" varchar(255) NOT NULL UNIQUE,
	"email" varchar(255) NOT NULL UNIQUE,
	"password" varchar(255) NOT NULL,
	"bio" text,
	"image" varchar(255),
	"created_at" timestamp,
	"updated_at" timestamp
);
