-- CreateTable
CREATE TABLE "email_configs" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(200),
    "host" VARCHAR(255) NOT NULL,
    "port" INTEGER NOT NULL,
    "secure" BOOLEAN NOT NULL DEFAULT false,
    "username" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "fromEmail" VARCHAR(255) NOT NULL,
    "fromName" VARCHAR(100),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(200),
    "subject" VARCHAR(200) NOT NULL,
    "htmlBody" TEXT NOT NULL,
    "textBody" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "category" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_configs_name_key" ON "email_configs"("name");

-- CreateIndex
CREATE UNIQUE INDEX "email_templates_name_key" ON "email_templates"("name");
