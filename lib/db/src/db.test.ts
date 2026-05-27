import test from "node:test";
import assert from "node:assert";

test("Database environment guard validation", () => {
  const checkGuard = (url: string | undefined) => {
    if (!url) {
      throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
    }
  };

  assert.throws(
    () => checkGuard(undefined),
    /DATABASE_URL must be set/
  );
  
  assert.doesNotThrow(
    () => checkGuard("postgres://localhost:5432/db")
  );
});
