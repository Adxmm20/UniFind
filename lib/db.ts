import { DatabaseSync } from "node:sqlite";
import path from "node:path";

let readInstance: DatabaseSync | null = null;
let writeInstance: DatabaseSync | null = null;

function dbFile(): string {
  return (
    process.env.UNIFIND_DB_PATH ?? path.join(process.cwd(), "data", "unifind.db")
  );
}

// Read-only connection to the local SQLite database produced by `npm run db:seed`.
// Server-only: node:sqlite is a Node builtin, so never import this from a client.
//
// Page rendering only ever uses this handle, so a render physically cannot
// write to the database.
export function getDb(): DatabaseSync {
  if (!readInstance) {
    readInstance = new DatabaseSync(dbFile(), { readOnly: true });
  }
  return readInstance;
}

// Read-write connection, used by the three things in this app that write at
// runtime: auth (signup), bookmark toggles and posting (app/actions/posts.ts).
// Page rendering never touches it.
export function getWriteDb(): DatabaseSync {
  if (!writeInstance) {
    writeInstance = new DatabaseSync(dbFile());
  }
  return writeInstance;
}
