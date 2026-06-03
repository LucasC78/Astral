-- CreateTable
CREATE TABLE "PageContent" (
    "id" SERIAL NOT NULL,
    "toolId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "normalizedUrl" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageContent_toolId_idx" ON "PageContent"("toolId");

-- CreateIndex
CREATE UNIQUE INDEX "PageContent_toolId_normalizedUrl_key" ON "PageContent"("toolId", "normalizedUrl");

-- AddForeignKey
ALTER TABLE "PageContent" ADD CONSTRAINT "PageContent_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
