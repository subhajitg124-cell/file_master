import test from "node:test";
import assert from "node:assert";
import app from "./app";

test("Express app instance verification", () => {
  assert.ok(app);
  assert.strictEqual(typeof app.listen, "function");
});
