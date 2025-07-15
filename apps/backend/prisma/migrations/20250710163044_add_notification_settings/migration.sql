-- CreateTable
CREATE TABLE "notification_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "paymentNotifications" BOOLEAN NOT NULL DEFAULT true,
    "postNotifications" BOOLEAN NOT NULL DEFAULT true,
    "messageNotifications" BOOLEAN NOT NULL DEFAULT true,
    "systemNotifications" BOOLEAN NOT NULL DEFAULT true,
    "payoutNotifications" BOOLEAN NOT NULL DEFAULT true,
    "emailFrequency" TEXT NOT NULL DEFAULT 'immediate',
    "quietHoursStart" VARCHAR(5),
    "quietHoursEnd" VARCHAR(5),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_settings_userId_key" ON "notification_settings"("userId");

-- AddForeignKey
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
