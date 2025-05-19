

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."calculate_payment_split"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Add fixed platform fee of 2.0
  NEW.platform_fee := 2.0;
  
  -- Calculate admin commission (1% of total)
  NEW.admin_commission := (NEW.amount * 0.01);
  
  -- Calculate merchant amount (total - platform fee - admin commission)
  NEW.merchant_amount := NEW.amount - NEW.platform_fee - NEW.admin_commission;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_payment_split"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    username, 
    phone_number, 
    age, 
    gender,
    is_merchant
  )
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    new.raw_user_meta_data->>'phone_number',
    (new.raw_user_meta_data->>'age')::integer,
    new.raw_user_meta_data->>'gender',
    COALESCE((new.raw_user_meta_data->>'is_merchant')::boolean, false)
  );
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_merchant_record"("user_id" "uuid", "business_name" "text", "business_email" "text", "business_phone" "text", "business_address" "text", "service_category" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into merchants (
    id,
    business_name,
    business_email,
    business_phone,
    business_address,
    service_category,
    status
  ) values (
    user_id,
    business_name,
    business_email,
    business_phone,
    business_address,
    service_category,
    'pending'
  );
end;
$$;


ALTER FUNCTION "public"."insert_merchant_record"("user_id" "uuid", "business_name" "text", "business_email" "text", "business_phone" "text", "business_address" "text", "service_category" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."insert_merchant_record"("user_id" "uuid", "b_name" "text", "b_address" "text", "b_email" "text", "b_phone" "text", "s_category" "text", "merchant_status" "text" DEFAULT 'pending'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  result JSONB;
BEGIN
  -- Insert the merchant record
  INSERT INTO public.merchants (
    id,
    business_name,
    business_address,
    business_email,
    business_phone,
    service_category,
    status
  ) VALUES (
    user_id,
    b_name,
    b_address,
    b_email,
    b_phone,
    s_category,
    merchant_status
  )
  RETURNING to_jsonb(merchants.*) INTO result;
  
  -- Ensure the profile has is_merchant set to true
  UPDATE public.profiles
  SET is_merchant = true
  WHERE id = user_id;
  
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."insert_merchant_record"("user_id" "uuid", "b_name" "text", "b_address" "text", "b_email" "text", "b_phone" "text", "s_category" "text", "merchant_status" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "merchant_id" "uuid" NOT NULL,
    "slot_id" "uuid" NOT NULL,
    "service_name" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "salon_id" "uuid",
    "salon_name" "text",
    "service_price" numeric DEFAULT 0,
    "booking_date" "date",
    "time_slot" "text",
    "customer_email" "text",
    "customer_phone" "text",
    "payment_id" "uuid",
    "service_duration" integer DEFAULT 30,
    "additional_notes" "text",
    "coins_used" integer DEFAULT 0 NOT NULL,
    "coins_earned" integer DEFAULT 0 NOT NULL,
    "worker_id" "uuid"
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."merchant_settings" (
    "merchant_id" "uuid" NOT NULL,
    "total_workers" integer DEFAULT 1 NOT NULL,
    "working_hours_start" time without time zone DEFAULT '09:00:00'::time without time zone NOT NULL,
    "working_hours_end" time without time zone DEFAULT '17:00:00'::time without time zone NOT NULL,
    "break_start" time without time zone,
    "break_end" time without time zone,
    "worker_assignment_strategy" "text" DEFAULT 'next-available'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "business_email" "text",
    "legal_business_name" "text",
    "contact_name" "text",
    "business_phone" "text",
    "business_type" "text",
    "pan" "text",
    "gst" "text",
    "registered_address" "jsonb" DEFAULT '{}'::"jsonb",
    "razorpay_id" "text",
    "ifsc_code" "text",
    "account_number" "text",
    "account_holder_name" "text",
    "bank_name" "text",
    "branch_name" "text",
    "branch" "text",
    "confirm_account_number" numeric
);


ALTER TABLE "public"."merchant_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."merchants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_name" "text" NOT NULL,
    "business_address" "text" NOT NULL,
    "business_phone" "text" NOT NULL,
    "business_email" "text" NOT NULL,
    "service_category" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "razorpay_id" "text"
);


ALTER TABLE "public"."merchants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid",
    "user_id" "uuid",
    "amount" numeric NOT NULL,
    "payment_method" "text" NOT NULL,
    "payment_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "transaction_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "coins_used" integer DEFAULT 0 NOT NULL,
    "coins_earned" integer DEFAULT 0 NOT NULL,
    "platform_fee" numeric DEFAULT 2.0 NOT NULL,
    "admin_commission" numeric DEFAULT 0.0 NOT NULL,
    "merchant_amount" numeric DEFAULT 0.0 NOT NULL,
    "merchant_id" "uuid"
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "phone_number" "text",
    "age" integer,
    "gender" "text",
    "is_merchant" boolean DEFAULT false,
    "coins" integer DEFAULT 0,
    "is_admin" boolean DEFAULT false
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "merchant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "price" numeric DEFAULT 0 NOT NULL,
    "duration" integer DEFAULT 30 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."slots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "merchant_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "is_booked" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "salon_id" "uuid",
    "service_id" "text",
    "service_name" "text",
    "service_price" numeric DEFAULT 0,
    "service_duration" integer DEFAULT 30,
    "worker_id" "uuid"
);


ALTER TABLE "public"."slots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."worker_unavailability" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "worker_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."worker_unavailability" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "merchant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "specialty" "text",
    "notes" "text"
);


ALTER TABLE "public"."workers" OWNER TO "postgres";


ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."merchant_settings"
    ADD CONSTRAINT "merchant_settings_business_email_key" UNIQUE ("business_email");



ALTER TABLE ONLY "public"."merchant_settings"
    ADD CONSTRAINT "merchant_settings_pkey" PRIMARY KEY ("merchant_id");



ALTER TABLE ONLY "public"."merchant_settings"
    ADD CONSTRAINT "merchant_settings_razorpay_id_key" UNIQUE ("razorpay_id");



ALTER TABLE ONLY "public"."merchants"
    ADD CONSTRAINT "merchants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."merchants"
    ADD CONSTRAINT "merchants_razorpay_id_key" UNIQUE ("razorpay_id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."slots"
    ADD CONSTRAINT "slots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."worker_unavailability"
    ADD CONSTRAINT "worker_unavailability_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workers"
    ADD CONSTRAINT "workers_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_merchants_status" ON "public"."merchants" USING "btree" ("status");



CREATE INDEX "idx_worker_unavailability_date" ON "public"."worker_unavailability" USING "btree" ("date");



CREATE INDEX "idx_worker_unavailability_worker_id" ON "public"."worker_unavailability" USING "btree" ("worker_id");



CREATE INDEX "idx_workers_merchant_id" ON "public"."workers" USING "btree" ("merchant_id");



CREATE OR REPLACE TRIGGER "before_payment_insert" BEFORE INSERT ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_payment_split"();



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_salon_id_fkey" FOREIGN KEY ("salon_id") REFERENCES "public"."merchants"("id");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "public"."slots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id");



ALTER TABLE ONLY "public"."merchant_settings"
    ADD CONSTRAINT "merchant_settings_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id");



ALTER TABLE ONLY "public"."merchants"
    ADD CONSTRAINT "merchants_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."slots"
    ADD CONSTRAINT "slots_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."slots"
    ADD CONSTRAINT "slots_salon_id_fkey" FOREIGN KEY ("salon_id") REFERENCES "public"."merchants"("id");



ALTER TABLE ONLY "public"."slots"
    ADD CONSTRAINT "slots_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id");



ALTER TABLE ONLY "public"."worker_unavailability"
    ADD CONSTRAINT "worker_unavailability_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id");



ALTER TABLE ONLY "public"."workers"
    ADD CONSTRAINT "workers_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id");



CREATE POLICY "Admin users can update all merchant records" ON "public"."merchants" FOR UPDATE USING (( SELECT "profiles"."is_admin"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())));



CREATE POLICY "Admin users can view all merchant records" ON "public"."merchants" FOR SELECT USING (( SELECT "profiles"."is_admin"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())));



CREATE POLICY "Admins can view all merchant profiles" ON "public"."merchants" USING ((( SELECT "profiles"."is_admin"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = true));



CREATE POLICY "Merchants can create their own services" ON "public"."services" FOR INSERT WITH CHECK (("auth"."uid"() = "merchant_id"));



CREATE POLICY "Merchants can delete their own services" ON "public"."services" FOR DELETE USING (("auth"."uid"() = "merchant_id"));



CREATE POLICY "Merchants can manage their own slots" ON "public"."slots" USING (("auth"."uid"() = "merchant_id"));



CREATE POLICY "Merchants can update their own services" ON "public"."services" FOR UPDATE USING (("auth"."uid"() = "merchant_id"));



CREATE POLICY "Merchants can view bookings for their business" ON "public"."bookings" FOR SELECT USING (("auth"."uid"() = "merchant_id"));



CREATE POLICY "Merchants can view bookings for their salon" ON "public"."bookings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_merchant" = true) AND (EXISTS ( SELECT 1
           FROM "public"."merchants"
          WHERE ("merchants"."id" = "bookings"."merchant_id")))))));



CREATE POLICY "Merchants can view their own data" ON "public"."merchants" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Merchants can view their own services" ON "public"."services" FOR SELECT USING (("auth"."uid"() = "merchant_id"));



CREATE POLICY "Public can view merchants" ON "public"."merchants" FOR SELECT USING (true);



CREATE POLICY "Public can view services" ON "public"."services" FOR SELECT USING (true);



CREATE POLICY "Public can view slots" ON "public"."slots" FOR SELECT USING (true);



CREATE POLICY "Users can create their own bookings" ON "public"."bookings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own payments" ON "public"."payments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own merchant profile" ON "public"."merchants" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert their own merchant record" ON "public"."merchants" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own bookings" ON "public"."bookings" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own merchant record" ON "public"."merchants" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view and manage their own bookings" ON "public"."bookings" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own bookings" ON "public"."bookings" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own merchant profile" ON "public"."merchants" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own merchant record" ON "public"."merchants" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view their own payments" ON "public"."payments" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."worker_unavailability" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."bookings";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




















































































































































































GRANT ALL ON FUNCTION "public"."calculate_payment_split"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_payment_split"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_payment_split"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_merchant_record"("user_id" "uuid", "business_name" "text", "business_email" "text", "business_phone" "text", "business_address" "text", "service_category" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."insert_merchant_record"("user_id" "uuid", "business_name" "text", "business_email" "text", "business_phone" "text", "business_address" "text", "service_category" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_merchant_record"("user_id" "uuid", "business_name" "text", "business_email" "text", "business_phone" "text", "business_address" "text", "service_category" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_merchant_record"("user_id" "uuid", "b_name" "text", "b_address" "text", "b_email" "text", "b_phone" "text", "s_category" "text", "merchant_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."insert_merchant_record"("user_id" "uuid", "b_name" "text", "b_address" "text", "b_email" "text", "b_phone" "text", "s_category" "text", "merchant_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_merchant_record"("user_id" "uuid", "b_name" "text", "b_address" "text", "b_email" "text", "b_phone" "text", "s_category" "text", "merchant_status" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."bookings" TO "anon";
GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT ALL ON TABLE "public"."merchant_settings" TO "anon";
GRANT ALL ON TABLE "public"."merchant_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."merchant_settings" TO "service_role";



GRANT ALL ON TABLE "public"."merchants" TO "anon";
GRANT ALL ON TABLE "public"."merchants" TO "authenticated";
GRANT ALL ON TABLE "public"."merchants" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."services" TO "anon";
GRANT ALL ON TABLE "public"."services" TO "authenticated";
GRANT ALL ON TABLE "public"."services" TO "service_role";



GRANT ALL ON TABLE "public"."slots" TO "anon";
GRANT ALL ON TABLE "public"."slots" TO "authenticated";
GRANT ALL ON TABLE "public"."slots" TO "service_role";



GRANT ALL ON TABLE "public"."worker_unavailability" TO "anon";
GRANT ALL ON TABLE "public"."worker_unavailability" TO "authenticated";
GRANT ALL ON TABLE "public"."worker_unavailability" TO "service_role";



GRANT ALL ON TABLE "public"."workers" TO "anon";
GRANT ALL ON TABLE "public"."workers" TO "authenticated";
GRANT ALL ON TABLE "public"."workers" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
