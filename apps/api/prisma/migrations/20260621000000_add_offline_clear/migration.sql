-- CreateTable
CREATE TABLE "OfflineClear" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "game" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "mask" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfflineClear_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OfflineClear_userId_game_difficulty_key" ON "OfflineClear"("userId", "game", "difficulty");

-- AddForeignKey
ALTER TABLE "OfflineClear" ADD CONSTRAINT "OfflineClear_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
