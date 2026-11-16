import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Per-request auth override for MCP tool calls.
 * Only the /api/mcp route sets this (after verifying a signed bearer token),
 * so `auth()` and `sessionUserIsAdmin()` resolve to the MCP user for the
 * existing route handlers that the tools dispatch into.
 *
 * @type {AsyncLocalStorage<{ session: import('next-auth').Session, isAdmin: boolean }>}
 */
const store = new AsyncLocalStorage();

export function getMcpAuth() {
  return store.getStore() ?? null;
}

/**
 * @template T
 * @param {{ session: import('next-auth').Session, isAdmin: boolean }} value
 * @param {() => Promise<T>} fn
 */
export function runWithMcpAuth(value, fn) {
  return store.run(value, fn);
}
