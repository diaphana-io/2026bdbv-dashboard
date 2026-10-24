import neo4j, { type Driver, type Session } from "neo4j-driver";

export type Neo4jEnv = {
  uri?: string;
  user?: string;
  password?: string;
};

export function readNeo4jEnv(
  source: NodeJS.ProcessEnv | Neo4jEnv = process.env,
): Neo4jEnv {
  if ("uri" in source || "user" in source || "password" in source) {
    const e = source as Neo4jEnv;
    return {
      uri: e.uri?.trim() || undefined,
      user: e.user?.trim() || undefined,
      password: e.password || undefined,
    };
  }
  const env = source as NodeJS.ProcessEnv;
  return {
    uri: env.NEO4J_URI?.trim() || undefined,
    user: env.NEO4J_USER?.trim() || undefined,
    password: env.NEO4J_PASSWORD || undefined,
  };
}

export function isNeo4jConfigured(env: Neo4jEnv = readNeo4jEnv()): boolean {
  return Boolean(env.uri && env.user && env.password);
}

/**
 * Aura Free is a single instance. Prefer direct bolt(+s) so the driver skips
 * routing-table discovery, which fails on Cloudflare Workers' TCP stack.
 */
export function normalizeNeo4jUri(uri: string): string {
  if (uri.startsWith("neo4j+s://")) return `bolt+s://${uri.slice("neo4j+s://".length)}`;
  if (uri.startsWith("neo4j://")) return `bolt://${uri.slice("neo4j://".length)}`;
  return uri;
}

let driver: Driver | null = null;
let driverKey: string | null = null;

function driverCacheKey(env: Neo4jEnv): string {
  return `${normalizeNeo4jUri(env.uri!)}\0${env.user}\0${env.password}`;
}

export function getDriver(env: Neo4jEnv = readNeo4jEnv()): Driver {
  if (!isNeo4jConfigured(env)) {
    throw new Error("neo4j_not_configured");
  }
  const key = driverCacheKey(env);
  if (!driver || driverKey !== key) {
    if (driver) {
      void driver.close().catch(() => undefined);
    }
    driver = neo4j.driver(
      normalizeNeo4jUri(env.uri!),
      neo4j.auth.basic(env.user!, env.password!),
    );
    driverKey = key;
  }
  return driver;
}

export async function withSession<T>(
  fn: (session: Session) => Promise<T>,
  env: Neo4jEnv = readNeo4jEnv(),
): Promise<T> {
  const session = getDriver(env).session();
  try {
    return await fn(session);
  } finally {
    await session.close();
  }
}

export async function verifyConnectivity(
  env: Neo4jEnv = readNeo4jEnv(),
): Promise<void> {
  const d = getDriver(env);
  await d.verifyConnectivity();
}
