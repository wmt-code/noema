CREATE TABLE "AgentConfig" (
    "projectId" UUID NOT NULL,
    "config" JSONB NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "AgentConfig_pkey" PRIMARY KEY ("projectId"),
    CONSTRAINT "AgentConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ModelCredential" (
    "userId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "ModelCredential_pkey" PRIMARY KEY ("userId", "provider"),
    CONSTRAINT "ModelCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
