import assert from "node:assert/strict";
import test from "node:test";
import { criarEscalaDensidade } from "../src/lib/mapa-densidade.ts";

test("normalizes using all positive totals and classifies exact thresholds", () => {
  const scale = criarEscalaDensidade([1, 34, 67, 101]);

  assert.deepEqual(scale.get(1), { intensidade: 0, nivel: "baixo" });
  assert.deepEqual(scale.get(34), { intensidade: 0.33, nivel: "baixo" });
  assert.deepEqual(scale.get(67), { intensidade: 0.66, nivel: "medio" });
  assert.deepEqual(scale.get(101), { intensidade: 1, nivel: "alto" });
});

test("gives identical totals identical normalized intensity and color", () => {
  const scale = criarEscalaDensidade([2, 5, 5, 8]);

  assert.deepEqual(scale.get(5), { intensidade: 0.5, nivel: "medio" });
  assert.equal(scale.size, 3);
});

test("assigns a consistent low intensity when all counts are equal", () => {
  const scale = criarEscalaDensidade([5, 5, 5]);

  assert.deepEqual(scale.get(5), { intensidade: 0, nivel: "baixo" });
});

test("adapts to extreme values without changing the min-max formula", () => {
  const scale = criarEscalaDensidade([2, 2, 900002]);

  assert.deepEqual(scale.get(2), { intensidade: 0, nivel: "baixo" });
  assert.deepEqual(scale.get(900002), { intensidade: 1, nivel: "alto" });
});

test("does not assign heat to zero, negative, or non-finite totals", () => {
  const scale = criarEscalaDensidade([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 4]);

  assert.equal(scale.has(0), false);
  assert.equal(scale.has(-1), false);
  assert.equal(scale.size, 1);
  assert.deepEqual(scale.get(4), { intensidade: 0, nivel: "baixo" });
});

test("returns no heat scale when there are no positive totals", () => {
  assert.equal(criarEscalaDensidade([0, -2, Number.NaN]).size, 0);
});
