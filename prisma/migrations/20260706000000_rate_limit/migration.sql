-- Fixed-window rate-limit counter (NASCAR-082). Serverless-safe in-DB token
-- bucket keyed by (key, window start).
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key", "windowStart")
);
