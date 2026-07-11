-- CreateEnum
CREATE TYPE "ProjectEstado" AS ENUM ('borrador', 'entrevista', 'guion', 'storyboard', 'generando', 'qa', 'montaje', 'listo', 'error');

-- CreateEnum
CREATE TYPE "SceneEstado" AS ENUM ('pendiente', 'generando', 'qa', 'lista', 'error');

-- CreateEnum
CREATE TYPE "TakeEstado" AS ENUM ('cola', 'procesando', 'listo', 'qa_fallo', 'error');

-- CreateEnum
CREATE TYPE "AssetTipo" AS ENUM ('video', 'audio', 'frame_referencia', 'subtitulo', 'imagen', 'export_final');

-- CreateEnum
CREATE TYPE "RenderJobTipo" AS ENUM ('generar', 'tts', 'subtitulos', 'montaje');

-- CreateEnum
CREATE TYPE "RenderJobEstado" AS ENUM ('cola', 'procesando', 'listo', 'error');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "nombre" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "tema" TEXT NOT NULL,
    "formato" TEXT NOT NULL DEFAULT '9:16',
    "duracionObjetivoSeg" INTEGER NOT NULL DEFAULT 60,
    "estado" "ProjectEstado" NOT NULL DEFAULT 'borrador',
    "adnId" TEXT,
    "modoAutonomo" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "style_dna" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentId" TEXT,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "style_dna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scripts" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "guion" TEXT NOT NULL,
    "narracion" TEXT NOT NULL,
    "aprobado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenes" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "scriptId" TEXT,
    "orden" INTEGER NOT NULL,
    "descripcionVisual" TEXT NOT NULL,
    "duracionSeg" DOUBLE PRECISION NOT NULL,
    "textoNarracion" TEXT NOT NULL DEFAULT '',
    "personajes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "estado" "SceneEstado" NOT NULL DEFAULT 'pendiente',

    CONSTRAINT "scenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "takes" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "intento" INTEGER NOT NULL DEFAULT 1,
    "promptExacto" TEXT NOT NULL,
    "negativePrompt" TEXT NOT NULL DEFAULT '',
    "seed" INTEGER,
    "proveedor" TEXT NOT NULL,
    "jobIdProveedor" TEXT,
    "adnVersion" INTEGER NOT NULL,
    "estado" "TakeEstado" NOT NULL DEFAULT 'cola',
    "archivo" TEXT,
    "notasQa" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "takes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "takeId" TEXT,
    "tipo" "AssetTipo" NOT NULL,
    "ruta" TEXT NOT NULL,
    "checksum" TEXT,
    "metadatos" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "render_jobs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "tipo" "RenderJobTipo" NOT NULL,
    "estado" "RenderJobEstado" NOT NULL DEFAULT 'cola',
    "progreso" INTEGER NOT NULL DEFAULT 0,
    "datos" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "render_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providers" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "credencialCifrada" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "capacidades" JSONB,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_quota" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "cuotaRestante" INTEGER NOT NULL DEFAULT 0,
    "tasaExito" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_quota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subtitle_presets" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "esSistema" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "subtitle_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voices" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "idioma" TEXT NOT NULL,
    "motor" TEXT NOT NULL,
    "voiceId" TEXT NOT NULL,

    CONSTRAINT "voices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_logs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "agente" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "contexto" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "style_dna_nombre_version_key" ON "style_dna"("nombre", "version");

-- CreateIndex
CREATE UNIQUE INDEX "scripts_projectId_revision_key" ON "scripts"("projectId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "scenes_projectId_orden_key" ON "scenes"("projectId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "provider_quota_providerId_key" ON "provider_quota"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "subtitle_presets_nombre_key" ON "subtitle_presets"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "voices_motor_voiceId_key" ON "voices"("motor", "voiceId");

-- CreateIndex
CREATE INDEX "agent_logs_projectId_createdAt_idx" ON "agent_logs"("projectId", "createdAt");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_adnId_fkey" FOREIGN KEY ("adnId") REFERENCES "style_dna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "style_dna" ADD CONSTRAINT "style_dna_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "style_dna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scripts" ADD CONSTRAINT "scripts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "scripts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "takes" ADD CONSTRAINT "takes_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "scenes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_takeId_fkey" FOREIGN KEY ("takeId") REFERENCES "takes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "render_jobs" ADD CONSTRAINT "render_jobs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_quota" ADD CONSTRAINT "provider_quota_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_logs" ADD CONSTRAINT "agent_logs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
