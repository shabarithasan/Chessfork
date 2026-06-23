CREATE TYPE "public"."source_type" AS ENUM('pgn', 'chesscom', 'lichess');--> statement-breakpoint
CREATE TYPE "public"."subscription_tier" AS ENUM('free', 'pro', 'coach');--> statement-breakpoint
CREATE TABLE "analysis_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" varchar(120) NOT NULL,
	"imported_pgn_id" uuid,
	"cache_key" varchar(255) NOT NULL,
	"mode" varchar(32) NOT NULL,
	"depth" varchar(16) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" varchar(32) DEFAULT 'queued' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chess_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source" "source_type" NOT NULL,
	"username" varchar(120) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" varchar(120) NOT NULL,
	"user_id" uuid,
	"summary" text NOT NULL,
	"payload" jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(64) NOT NULL,
	"provider_user_id" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imported_pgns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" varchar(120) NOT NULL,
	"user_id" uuid,
	"source" "source_type" NOT NULL,
	"external_game_id" varchar(255),
	"pgn" text NOT NULL,
	"pgn_hash" varchar(64) NOT NULL,
	"job_status" varchar(32) DEFAULT 'queued' NOT NULL,
	"audit_trail" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaderboard_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board_type" varchar(32) NOT NULL,
	"rank" integer NOT NULL,
	"player" varchar(255) NOT NULL,
	"score" integer NOT NULL,
	"change" integer NOT NULL,
	"detail" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "move_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_run_id" uuid NOT NULL,
	"ply" integer NOT NULL,
	"score" integer NOT NULL,
	"cp_loss" integer NOT NULL,
	"grade" varchar(16) NOT NULL,
	"payload" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "puzzle_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"puzzle_id" uuid NOT NULL,
	"user_id" uuid,
	"correct" boolean NOT NULL,
	"elapsed_ms" integer NOT NULL,
	"rating_after" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "puzzles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" varchar(120) NOT NULL,
	"fen" varchar(255) NOT NULL,
	"prompt" text NOT NULL,
	"rating" integer NOT NULL,
	"themes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"solution" jsonb NOT NULL,
	"source_game_public_id" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tier" "subscription_tier" DEFAULT 'free' NOT NULL,
	"stripe_customer_id" varchar(255),
	"status" varchar(32) DEFAULT 'inactive' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"locale" varchar(8) DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_imported_pgn_id_imported_pgns_id_fk" FOREIGN KEY ("imported_pgn_id") REFERENCES "public"."imported_pgns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chess_accounts" ADD CONSTRAINT "chess_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_snapshots" ADD CONSTRAINT "coach_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identities" ADD CONSTRAINT "identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imported_pgns" ADD CONSTRAINT "imported_pgns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "move_evaluations" ADD CONSTRAINT "move_evaluations_analysis_run_id_analysis_runs_id_fk" FOREIGN KEY ("analysis_run_id") REFERENCES "public"."analysis_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "puzzle_attempts" ADD CONSTRAINT "puzzle_attempts_puzzle_id_puzzles_id_fk" FOREIGN KEY ("puzzle_id") REFERENCES "public"."puzzles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "puzzle_attempts" ADD CONSTRAINT "puzzle_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "analysis_runs_public_id_idx" ON "analysis_runs" USING btree ("public_id");--> statement-breakpoint
CREATE INDEX "analysis_runs_imported_pgn_id_idx" ON "analysis_runs" USING btree ("imported_pgn_id");--> statement-breakpoint
CREATE UNIQUE INDEX "coach_snapshots_public_id_idx" ON "coach_snapshots" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "imported_pgns_public_id_idx" ON "imported_pgns" USING btree ("public_id");--> statement-breakpoint
CREATE UNIQUE INDEX "imported_pgns_pgn_hash_idx" ON "imported_pgns" USING btree ("pgn_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "leaderboard_entries_type_player_idx" ON "leaderboard_entries" USING btree ("board_type","player");--> statement-breakpoint
CREATE UNIQUE INDEX "puzzles_public_id_idx" ON "puzzles" USING btree ("public_id");