import test from "node:test";
import assert from "node:assert/strict";
import {
  IRIS_NAMED_INTELLIGENCE_PATHS,
  IRIS_UNIVERSAL_INTELLIGENCE_STAGES,
  getIrisNamedIntelligenceStructure,
} from "./irisIntelligenceStructure.js";
import { getIrisIntelligenceHierarchy, validateIrisIntelligenceHierarchy } from "./irisIntelligenceHierarchy.js";

test("Iris has exactly one root and eight formal Level-2 domains", () => {
  const hierarchy = getIrisIntelligenceHierarchy();
  assert.equal(hierarchy.root.name, "Iris");
  assert.equal(hierarchy.domains.length, 8);
  assert.deepEqual(validateIrisIntelligenceHierarchy(), []);
});

test("named universal intelligence stages contain real architectural names", () => {
  assert.ok(IRIS_UNIVERSAL_INTELLIGENCE_STAGES.length > 0);
  for (const stage of IRIS_UNIVERSAL_INTELLIGENCE_STAGES) {
    assert.ok(stage.id.length > 0);
    assert.ok(stage.name.length > 0);
    assert.ok(stage.purpose.length > 0);
  }
  assert.equal(IRIS_UNIVERSAL_INTELLIGENCE_STAGES.some(x => (x.name as string) === "Maximum Intelligence"), false);
});

test("named domain paths materialize recursively without creating financial data", () => {
  const structure = getIrisNamedIntelligenceStructure();
  assert.equal(structure.length, IRIS_NAMED_INTELLIGENCE_PATHS.length);
  for (const path of structure) {
    assert.ok(path.length > 0);
    for (let i = 0; i < path.length; i += 1) {
      assert.equal(path[i].level, i + 3);
      assert.ok(path[i].parent_id);
      assert.ok(path[i].name.length > 0);
      assert.equal(path[i].can_recurse, true);
    }
  }
});
