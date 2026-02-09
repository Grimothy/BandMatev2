-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ActivityRead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "activityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ActivityRead_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ActivityRead" ("activityId", "id", "readAt", "userId") SELECT "activityId", "id", "readAt", "userId" FROM "ActivityRead";
DROP TABLE "ActivityRead";
ALTER TABLE "new_ActivityRead" RENAME TO "ActivityRead";
CREATE INDEX "ActivityRead_userId_idx" ON "ActivityRead"("userId");
CREATE INDEX "ActivityRead_activityId_idx" ON "ActivityRead"("activityId");
CREATE UNIQUE INDEX "ActivityRead_activityId_userId_key" ON "ActivityRead"("activityId", "userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
