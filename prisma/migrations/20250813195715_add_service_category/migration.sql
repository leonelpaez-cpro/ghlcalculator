-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Service" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'General',
    "setupPrice" INTEGER NOT NULL,
    "monthlyPrice" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Service" ("createdAt", "description", "id", "isActive", "monthlyPrice", "name", "setupPrice", "updatedAt") SELECT "createdAt", "description", "id", "isActive", "monthlyPrice", "name", "setupPrice", "updatedAt" FROM "Service";
DROP TABLE "Service";
ALTER TABLE "new_Service" RENAME TO "Service";
CREATE UNIQUE INDEX "Service_name_key" ON "Service"("name");
CREATE INDEX "Service_category_idx" ON "Service"("category");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
