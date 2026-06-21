-- CreateTable
CREATE TABLE "CosmeticSelection" (
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "cosmeticId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CosmeticSelection_pkey" PRIMARY KEY ("userId","category")
);

-- AddForeignKey
ALTER TABLE "CosmeticSelection" ADD CONSTRAINT "CosmeticSelection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
