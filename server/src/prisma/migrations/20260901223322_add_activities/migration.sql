-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "corosLabelId" TEXT NOT NULL,
    "sportType" INTEGER NOT NULL,
    "sportName" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTimestamp" TIMESTAMP(3),
    "endTimestamp" TIMESTAMP(3),
    "duration" INTEGER NOT NULL,
    "distance" DOUBLE PRECISION,
    "calories" INTEGER,
    "avgHR" INTEGER,
    "maxHR" INTEGER,
    "avgPace" DOUBLE PRECISION,
    "avgSpeed" DOUBLE PRECISION,
    "avgCadence" DOUBLE PRECISION,
    "avgPower" DOUBLE PRECISION,
    "elevationGain" DOUBLE PRECISION,
    "elevationLoss" DOUBLE PRECISION,
    "trainingLoad" DOUBLE PRECISION,
    "aerobicTE" DOUBLE PRECISION,
    "anaerobicTE" DOUBLE PRECISION,
    "trainingFocus" TEXT,
    "performanceRating" TEXT,
    "startLat" DOUBLE PRECISION,
    "startLon" DOUBLE PRECISION,
    "locationName" TEXT,
    "rawSummary" TEXT,
    "detailFetched" BOOLEAN NOT NULL DEFAULT false,
    "rawDetail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Activity_userId_date_idx" ON "Activity"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_userId_corosLabelId_key" ON "Activity"("userId", "corosLabelId");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
