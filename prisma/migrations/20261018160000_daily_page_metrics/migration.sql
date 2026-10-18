CREATE TABLE "DailyPageMetric" (
    "day" DATE NOT NULL,
    "path" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DailyPageMetric_pkey" PRIMARY KEY ("day", "path")
);
