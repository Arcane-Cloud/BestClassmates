import assert from "node:assert/strict";
import { test } from "node:test";
import { hashPassword, hashToken, makeToken, verifyPassword, dummyPasswordHash } from "../lib/password";

test("passwords are salted, hashed and verified without storing plaintext", async () => {
  const password = "a-long-test-password-only";
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.equal(first.includes(password), false);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword("wrong-password", first), false);
  assert.equal(await verifyPassword(password, "invalid"), false);
  assert.equal(await verifyPassword(password, dummyPasswordHash), false);
});
test("session tokens have 256 bits of randomness and are stored only as hashes", () => {
  const token = makeToken();
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.notEqual(token, makeToken());
  assert.notEqual(hashToken(token), token);
  assert.equal(hashToken(token), hashToken(token));
  assert.match(hashToken(token), /^[a-f0-9]{64}$/);
});
