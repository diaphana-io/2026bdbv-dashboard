import tls from "node:tls";
import neo4j, { type Driver, type Session } from "neo4j-driver";

export type Neo4jEnv = {
  uri?: string;
  user?: string;
  password?: string;
  /** Aura instance DB name; defaults to NEO4J_USER (instance id) or "neo4j". */
  database?: string;
};

/**
 * neo4j-driver always passes `rejectUnauthorized` into `tls.connect`.
 * Cloudflare Workers' node:tls throws if that option is present at all
 * (certs are still verified by the runtime). Strip it before connect.
 */
let tlsPatchedForWorkers = false;
function patchTlsConnectForWorkers(): void {
  if (tlsPatchedForWorkers) return;
  tlsPatchedForWorkers = true;
  const original = tls.connect.bind(tls);
  // Overloads: connect(options), connect(port, options), connect(port, host, options), …
  (tls as typeof tls & { connect: typeof tls.connect }).connect = ((
    ...args: unknown[]
  ) => {
    for (const arg of args) {
      if (arg && typeof arg === "object" && "rejectUnauthorized" in arg) {
        delete (arg as { rejectUnauthorized?: boolean }).rejectUnauthorized;
      }
    }
    return (original as (...a: unknown[]) => tls.TLSSocket)(...args);
  }) as typeof tls.connect;
}

export function readNeo4jEnv(
  source: NodeJS.ProcessEnv | Neo4jEnv = process.env,
): Neo4jEnv {
  if ("uri" in source || "user" in source || "password" in source) {
    const e = source as Neo4jEnv;
    return {
      uri: e.uri?.trim() || undefined,
      user: e.user?.trim() || undefined,
      password: e.password || undefined,
      database: e.database?.trim() || undefined,
    };
  }
  const env = source as NodeJS.ProcessEnv;
  return {
    uri: env.NEO4J_URI?.trim() || undefined,
    user: env.NEO4J_USER?.trim() || undefined,
    password: env.NEO4J_PASSWORD || undefined,
    database: env.NEO4J_DATABASE?.trim() || undefined,
  };
}

/** Aura Free names the DB after the instance id (same as NEO4J_USER). */
export function resolveNeo4jDatabase(env: Neo4jEnv = readNeo4jEnv()): string {
  return env.database || env.user || "neo4j";
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
  return `${normalizeNeo4jUri(env.uri!)}\0${env.user}\0${env.password}\0${resolveNeo4jDatabase(env)}`;
}

export function getDriver(env: Neo4jEnv = readNeo4jEnv()): Driver {
  if (!isNeo4jConfigured(env)) {
    throw new Error("neo4j_not_configured");
  }
  patchTlsConnectForWorkers();
  const key = driverCacheKey(env);
  if (!driver || driverKey !== key) {
    if (driver) {
      void driver.close().catch(() => undefined);
    }
    const uri = normalizeNeo4jUri(env.uri!);
    // Aura Free allows only a few concurrent Bolt connections; Workers
    // isolates share this driver — keep the pool tiny.
    driver = neo4j.driver(uri, neo4j.auth.basic(env.user!, env.password!), {
      maxConnectionPoolSize: 1,
      connectionAcquisitionTimeout: 10_000,
      disableLosslessIntegers: true,
    });
    driverKey = key;
  }
  return driver;
}

export async function withSession<T>(
  fn: (session: Session) => Promise<T>,
  env: Neo4jEnv = readNeo4jEnv(),
): Promise<T> {
  const session = getDriver(env).session({
    database: resolveNeo4jDatabase(env),
  });
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
