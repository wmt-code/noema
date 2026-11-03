BEGIN;

-- CreateEnum
CREATE TYPE "EpisodeStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ShotStatus" AS ENUM ('DRAFT', 'GENERATING', 'PENDING_REVIEW', 'APPROVED');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'SUBTITLE');

-- CreateEnum
CREATE TYPE "GenerationType" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO');

-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('QUEUED', 'SUBMITTING', 'SUBMISSION_UNKNOWN', 'PROCESSING', 'FAILED', 'SUCCEEDED');

-- CreateEnum
CREATE TYPE "ReviewResult" AS ENUM ('PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "ExportStatus" AS ENUM ('QUEUED', 'PROCESSING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "Project" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Episode" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "status" "EpisodeStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Episode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScriptRevision" (
    "id" UUID NOT NULL,
    "episodeId" UUID NOT NULL,
    "content" JSONB NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScriptRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Character" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scene" (
    "id" UUID NOT NULL,
    "episodeId" UUID NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shot" (
    "id" UUID NOT NULL,
    "sceneId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "duration" DECIMAL(8,3) NOT NULL,
    "prompt" TEXT NOT NULL DEFAULT '',
    "status" "ShotStatus" NOT NULL DEFAULT 'DRAFT',
    "selectedAssetId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Shot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShotAsset" (
    "shotId" UUID NOT NULL,
    "assetId" UUID NOT NULL,

    CONSTRAINT "ShotAsset_pkey" PRIMARY KEY ("shotId","assetId")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" UUID NOT NULL,
    "type" "AssetType" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "generationTaskId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationTask" (
    "id" UUID NOT NULL,
    "shotId" UUID NOT NULL,
    "type" "GenerationType" NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" "GenerationStatus" NOT NULL DEFAULT 'QUEUED',
    "request" JSONB NOT NULL,
    "providerTaskId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "error" TEXT,
    "cost" DECIMAL(12,6),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "startedAt" TIMESTAMPTZ(3),
    "finishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "GenerationTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityReview" (
    "id" UUID NOT NULL,
    "assetId" UUID NOT NULL,
    "result" "ReviewResult" NOT NULL,
    "issues" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualityReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExportRecord" (
    "id" UUID NOT NULL,
    "episodeId" UUID NOT NULL,
    "settings" JSONB NOT NULL,
    "status" "ExportStatus" NOT NULL DEFAULT 'QUEUED',
    "storageKey" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ExportRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CharacterToShot" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_CharacterToShot_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Episode_projectId_idx" ON "Episode"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ScriptRevision_episodeId_version_key" ON "ScriptRevision"("episodeId", "version");

-- CreateIndex
CREATE INDEX "Character_projectId_idx" ON "Character"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Scene_episodeId_order_key" ON "Scene"("episodeId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Shot_sceneId_order_key" ON "Shot"("sceneId", "order");

-- CreateIndex
CREATE INDEX "ShotAsset_assetId_idx" ON "ShotAsset"("assetId");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_storageKey_key" ON "Asset"("storageKey");

-- CreateIndex
CREATE INDEX "Asset_generationTaskId_idx" ON "Asset"("generationTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "GenerationTask_idempotencyKey_key" ON "GenerationTask"("idempotencyKey");

-- CreateIndex
CREATE INDEX "GenerationTask_shotId_idx" ON "GenerationTask"("shotId");

-- CreateIndex
CREATE INDEX "GenerationTask_status_createdAt_idx" ON "GenerationTask"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GenerationTask_provider_providerTaskId_key" ON "GenerationTask"("provider", "providerTaskId");

-- CreateIndex
CREATE INDEX "QualityReview_assetId_idx" ON "QualityReview"("assetId");

-- CreateIndex
CREATE INDEX "ExportRecord_episodeId_idx" ON "ExportRecord"("episodeId");

-- CreateIndex
CREATE INDEX "_CharacterToShot_B_index" ON "_CharacterToShot"("B");

-- AddForeignKey
ALTER TABLE "Episode" ADD CONSTRAINT "Episode_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptRevision" ADD CONSTRAINT "ScriptRevision_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shot" ADD CONSTRAINT "Shot_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "Scene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shot" ADD CONSTRAINT "Shot_id_selectedAssetId_fkey" FOREIGN KEY ("id", "selectedAssetId") REFERENCES "ShotAsset"("shotId", "assetId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ShotAsset" ADD CONSTRAINT "ShotAsset_shotId_fkey" FOREIGN KEY ("shotId") REFERENCES "Shot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShotAsset" ADD CONSTRAINT "ShotAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_generationTaskId_fkey" FOREIGN KEY ("generationTaskId") REFERENCES "GenerationTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationTask" ADD CONSTRAINT "GenerationTask_shotId_fkey" FOREIGN KEY ("shotId") REFERENCES "Shot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityReview" ADD CONSTRAINT "QualityReview_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExportRecord" ADD CONSTRAINT "ExportRecord_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CharacterToShot" ADD CONSTRAINT "_CharacterToShot_A_fkey" FOREIGN KEY ("A") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CharacterToShot" ADD CONSTRAINT "_CharacterToShot_B_fkey" FOREIGN KEY ("B") REFERENCES "Shot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Prisma does not represent CHECK constraints or triggers; keep these in migrations.
ALTER TABLE "ScriptRevision" ADD CONSTRAINT "ScriptRevision_version_positive" CHECK ("version" > 0);
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_order_nonnegative" CHECK ("order" >= 0);
ALTER TABLE "Shot" ADD CONSTRAINT "Shot_order_nonnegative" CHECK ("order" >= 0);
ALTER TABLE "Shot" ADD CONSTRAINT "Shot_duration_positive" CHECK ("duration" > 0);
ALTER TABLE "GenerationTask" ADD CONSTRAINT "GenerationTask_cost_nonnegative" CHECK ("cost" >= 0);

CREATE FUNCTION reject_script_revision_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'ScriptRevision is immutable; create a new version' USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER "ScriptRevision_immutable" BEFORE UPDATE ON "ScriptRevision"
FOR EACH ROW EXECUTE FUNCTION reject_script_revision_update();

CREATE FUNCTION reject_asset_content_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW."storageKey" IS DISTINCT FROM OLD."storageKey" OR NEW."type" IS DISTINCT FROM OLD."type" THEN
        RAISE EXCEPTION 'Asset content is immutable; create a new asset' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER "Asset_content_immutable" BEFORE UPDATE ON "Asset"
FOR EACH ROW EXECUTE FUNCTION reject_asset_content_update();

COMMIT;
