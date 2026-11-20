-- «Leída» pasa a ser de cada persona: una fila por (notificación, usuario) que la leyó.
-- Solo agrega una tabla y copia datos; AdminNotification conserva isRead/readAt/readBy como respaldo.

-- CreateTable
CREATE TABLE "AdminNotificationRead" (
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminNotificationRead_pkey" PRIMARY KEY ("notificationId","userId")
);

-- CreateIndex
CREATE INDEX "AdminNotificationRead_userId_idx" ON "AdminNotificationRead"("userId");

-- AddForeignKey
ALTER TABLE "AdminNotificationRead" ADD CONSTRAINT "AdminNotificationRead_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "AdminNotification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Traspaso: la lectura global queda como lectura de quien la marcó. readBy guarda session.user.id
-- (el id de "User"); por si alguna fila vieja tuviera otra cosa, solo se copian las que calzan con un usuario.
INSERT INTO "AdminNotificationRead" ("notificationId", "userId", "readAt")
SELECT n."id", n."readBy", COALESCE(n."readAt", n."createdAt")
FROM "AdminNotification" n
WHERE n."isRead" = true
  AND n."readBy" IS NOT NULL
  AND EXISTS (SELECT 1 FROM "User" u WHERE u."id" = n."readBy")
ON CONFLICT DO NOTHING;
