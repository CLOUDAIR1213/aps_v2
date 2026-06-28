import { getActiveModule } from "./pageHeaderLogic.js";

const cases = [
  ["/scheduling/board", "/scheduling/board"],
  ["/scheduling/board/42", "/scheduling/board"],
  ["/scheduling/orders/7", "/scheduling"],
  ["/scheduling", "/scheduling"],
  ["/dispatch", "/dispatch"],
  ["/personnel", "/personnel"],
];

for (const [pathname, expected] of cases) {
  const actual = getActiveModule(pathname);
  if (actual !== expected) {
    throw new Error(`${pathname}: expected ${expected}, got ${actual}`);
  }
}

console.log("PageHeader active module tests passed");
