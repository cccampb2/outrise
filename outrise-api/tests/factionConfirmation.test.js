import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import User from "../src/models/User.js";
import Faction from "../src/models/Faction.js";
import { confirmFaction } from "../src/services/faction.service.js";

const id = () => new mongoose.Types.ObjectId();
test("faction confirmation matches the user and an unassigned faction before updating", async (t) => {
  const userId = id(),
    factionId = id();
  t.mock.method(Faction, "findOne", async () => ({
    _id: factionId,
    slug: "helix",
  }));
  t.mock.method(User, "findByIdAndUpdate", () => {
    assert.fail("Conditional updates must use findOneAndUpdate");
  });
  t.mock.method(User, "findOneAndUpdate", async (filter, update, options) => {
    assert.deepEqual(filter, { _id: userId, faction: null });
    assert.deepEqual(update, { faction: factionId });
    assert.equal(options.returnDocument, "after");
    return { _id: userId, faction: factionId };
  });
  const result = await confirmFaction({ userId, factionSlug: "helix" });
  assert.equal(result.user.faction, factionId);
});

test("a repeated confirmation cannot overwrite a faction that is already saved", async (t) => {
  const userId = id();
  t.mock.method(Faction, "findOne", async () => ({ _id: id() }));
  t.mock.method(User, "findOneAndUpdate", async () => null);
  t.mock.method(User, "findById", async () => ({ _id: userId, faction: id() }));
  await assert.rejects(
    () => confirmFaction({ userId, factionSlug: "helix" }),
    /already confirmed/,
  );
});
