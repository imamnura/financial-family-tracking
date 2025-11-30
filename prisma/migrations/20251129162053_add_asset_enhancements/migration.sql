-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "depreciationRate" DOUBLE PRECISION,
ADD COLUMN     "purchasePrice" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "AssetValueHistory" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetValueHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetValueHistory_assetId_idx" ON "AssetValueHistory"("assetId");

-- CreateIndex
CREATE INDEX "AssetValueHistory_date_idx" ON "AssetValueHistory"("date");

-- AddForeignKey
ALTER TABLE "AssetValueHistory" ADD CONSTRAINT "AssetValueHistory_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
