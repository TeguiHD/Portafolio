-- Portfolio Database Initialization
-- This script runs automatically when PostgreSQL container starts

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for roles
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('SUPERADMIN', 'ADMIN', 'USER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- NOTE:
-- This repo intentionally does not ship a default admin user/password.
-- Create your SUPERADMIN via Prisma seed (recommended) or your own SQL.
