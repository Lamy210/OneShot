-- CreateTable
CREATE TABLE "post_views" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "viewerId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_likes" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "likedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "post_views_postId_viewedAt_idx" ON "post_views"("postId", "viewedAt");

-- CreateIndex
CREATE INDEX "post_views_viewerId_viewedAt_idx" ON "post_views"("viewerId", "viewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "post_views_postId_viewerId_ipAddress_key" ON "post_views"("postId", "viewerId", "ipAddress");

-- CreateIndex
CREATE INDEX "post_likes_postId_likedAt_idx" ON "post_likes"("postId", "likedAt");

-- CreateIndex
CREATE INDEX "post_likes_userId_likedAt_idx" ON "post_likes"("userId", "likedAt");

-- CreateIndex
CREATE UNIQUE INDEX "post_likes_postId_userId_key" ON "post_likes"("postId", "userId");

-- AddForeignKey
ALTER TABLE "post_views" ADD CONSTRAINT "post_views_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_views" ADD CONSTRAINT "post_views_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
