-- Jobs module: vacancies, matching analysis, CV adaptations, and applications tracking

-- Create enums
CREATE TYPE "JobSource" AS ENUM (
  'MANUAL',
  'LINKEDIN',
  'COMPUTRABAJO',
  'LABORUM',
  'FIRSTJOB',
  'CHILE_EMPLEOS',
  'INDEED',
  'OTHER'
);

CREATE TYPE "VacancyEmploymentType" AS ENUM (
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERN',
  'FREELANCE',
  'TEMPORARY',
  'OTHER'
);

CREATE TYPE "VacancyWorkMode" AS ENUM (
  'ONSITE',
  'HYBRID',
  'REMOTE',
  'UNSPECIFIED'
);

CREATE TYPE "CvAdaptationMode" AS ENUM (
  'ASSISTED',
  'AUTO'
);

CREATE TYPE "JobApplicationStatus" AS ENUM (
  'PENDING',
  'INTERVIEW',
  'CLOSED'
);

-- Create tables
CREATE TABLE "JobVacancy" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "source" "JobSource" NOT NULL DEFAULT 'MANUAL',
  "sourceExternalId" TEXT,
  "sourceUrl" TEXT,
  "title" TEXT NOT NULL,
  "company" TEXT NOT NULL,
  "location" TEXT,
  "employmentType" "VacancyEmploymentType" NOT NULL DEFAULT 'OTHER',
  "workMode" "VacancyWorkMode" NOT NULL DEFAULT 'UNSPECIFIED',
  "salaryRange" TEXT,
  "postedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "description" TEXT NOT NULL,
  "normalizedText" TEXT,
  "metadata" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "JobVacancy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VacancyAnalysis" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "vacancyId" TEXT NOT NULL,
  "cvVersionId" TEXT NOT NULL,
  "matchScore" INTEGER NOT NULL,
  "matchedSkills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "missingSkills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "recommendedSkills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "extractedKeywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "summary" TEXT,
  "recommendations" JSONB,
  "learningPlan" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "VacancyAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CvVacancyAdaptation" (
  "id" TEXT NOT NULL,
  "vacancyId" TEXT NOT NULL,
  "baseCvVersionId" TEXT NOT NULL,
  "adaptedCvVersionId" TEXT,
  "mode" "CvAdaptationMode" NOT NULL DEFAULT 'ASSISTED',
  "appliedChanges" JSONB,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CvVacancyAdaptation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JobApplication" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "vacancyId" TEXT NOT NULL,
  "analysisId" TEXT,
  "adaptationId" TEXT,
  "cvVersionId" TEXT,
  "status" "JobApplicationStatus" NOT NULL DEFAULT 'PENDING',
  "company" TEXT,
  "roleTitle" TEXT,
  "sourceUrl" TEXT,
  "notes" TEXT,
  "appliedAt" TIMESTAMP(3),
  "lastStatusAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JobApplicationEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "fromStatus" "JobApplicationStatus",
  "toStatus" "JobApplicationStatus" NOT NULL,
  "note" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "JobApplicationEvent_pkey" PRIMARY KEY ("id")
);

-- Create unique and secondary indexes
CREATE UNIQUE INDEX "JobVacancy_userId_source_sourceExternalId_key"
ON "JobVacancy"("userId", "source", "sourceExternalId");

CREATE INDEX "JobVacancy_userId_createdAt_idx"
ON "JobVacancy"("userId", "createdAt");

CREATE INDEX "JobVacancy_userId_isActive_idx"
ON "JobVacancy"("userId", "isActive");

CREATE INDEX "VacancyAnalysis_userId_createdAt_idx"
ON "VacancyAnalysis"("userId", "createdAt");

CREATE INDEX "VacancyAnalysis_vacancyId_createdAt_idx"
ON "VacancyAnalysis"("vacancyId", "createdAt");

CREATE INDEX "VacancyAnalysis_cvVersionId_idx"
ON "VacancyAnalysis"("cvVersionId");

CREATE INDEX "CvVacancyAdaptation_vacancyId_createdAt_idx"
ON "CvVacancyAdaptation"("vacancyId", "createdAt");

CREATE INDEX "CvVacancyAdaptation_baseCvVersionId_idx"
ON "CvVacancyAdaptation"("baseCvVersionId");

CREATE INDEX "CvVacancyAdaptation_adaptedCvVersionId_idx"
ON "CvVacancyAdaptation"("adaptedCvVersionId");

CREATE INDEX "JobApplication_userId_status_idx"
ON "JobApplication"("userId", "status");

CREATE INDEX "JobApplication_vacancyId_idx"
ON "JobApplication"("vacancyId");

CREATE INDEX "JobApplication_lastStatusAt_idx"
ON "JobApplication"("lastStatusAt");

CREATE INDEX "JobApplicationEvent_applicationId_createdAt_idx"
ON "JobApplicationEvent"("applicationId", "createdAt");

CREATE INDEX "JobApplicationEvent_userId_createdAt_idx"
ON "JobApplicationEvent"("userId", "createdAt");

-- Add foreign keys
ALTER TABLE "JobVacancy"
ADD CONSTRAINT "JobVacancy_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VacancyAnalysis"
ADD CONSTRAINT "VacancyAnalysis_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VacancyAnalysis"
ADD CONSTRAINT "VacancyAnalysis_vacancyId_fkey"
FOREIGN KEY ("vacancyId") REFERENCES "JobVacancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "VacancyAnalysis"
ADD CONSTRAINT "VacancyAnalysis_cvVersionId_fkey"
FOREIGN KEY ("cvVersionId") REFERENCES "CvVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CvVacancyAdaptation"
ADD CONSTRAINT "CvVacancyAdaptation_vacancyId_fkey"
FOREIGN KEY ("vacancyId") REFERENCES "JobVacancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CvVacancyAdaptation"
ADD CONSTRAINT "CvVacancyAdaptation_baseCvVersionId_fkey"
FOREIGN KEY ("baseCvVersionId") REFERENCES "CvVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CvVacancyAdaptation"
ADD CONSTRAINT "CvVacancyAdaptation_adaptedCvVersionId_fkey"
FOREIGN KEY ("adaptedCvVersionId") REFERENCES "CvVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "JobApplication"
ADD CONSTRAINT "JobApplication_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JobApplication"
ADD CONSTRAINT "JobApplication_vacancyId_fkey"
FOREIGN KEY ("vacancyId") REFERENCES "JobVacancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JobApplication"
ADD CONSTRAINT "JobApplication_analysisId_fkey"
FOREIGN KEY ("analysisId") REFERENCES "VacancyAnalysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "JobApplication"
ADD CONSTRAINT "JobApplication_adaptationId_fkey"
FOREIGN KEY ("adaptationId") REFERENCES "CvVacancyAdaptation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "JobApplication"
ADD CONSTRAINT "JobApplication_cvVersionId_fkey"
FOREIGN KEY ("cvVersionId") REFERENCES "CvVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "JobApplicationEvent"
ADD CONSTRAINT "JobApplicationEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "JobApplicationEvent"
ADD CONSTRAINT "JobApplicationEvent_applicationId_fkey"
FOREIGN KEY ("applicationId") REFERENCES "JobApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
