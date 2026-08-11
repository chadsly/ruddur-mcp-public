const DEFAULT_BODY_MAX_MB = 10;

export const resolveBodyLimitMb = (
  env: NodeJS.ProcessEnv = process.env,
): number => {
  const mcpMaximum = env.RUDDUR_MCP_BODY_MAX_MB?.trim();
  const configured = mcpMaximum || env.UPLOAD_MAX_MB;
  const parsed = Number(configured ?? DEFAULT_BODY_MAX_MB);

  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_BODY_MAX_MB;
  return parsed;
};

export const resolveBodyLimit = (env: NodeJS.ProcessEnv = process.env): string =>
  `${resolveBodyLimitMb(env)}mb`;
