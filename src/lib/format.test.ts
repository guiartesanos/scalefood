import { describe, it, expect } from "vitest";
import { brl, brlInt } from "./format";

// Fonte única da formatação de reais (ver format.ts) — antes disso, mais de
// 15 arquivos reimplementavam essa lógica à mão, e já tinha divergido de
// verdade (MetaTV/GrowthChart usavam 0 casas decimais sem ninguém decidir
// isso de propósito). Esses testes travam o comportamento num lugar só.
describe("brl", () => {
  it("formata com 2 casas decimais e separador de milhar", () => {
    expect(brl(1234.5)).toBe("R$ 1.234,50");
  });

  it("trata null/undefined/0 como R$ 0,00", () => {
    expect(brl(null)).toBe("R$ 0,00");
    expect(brl(undefined)).toBe("R$ 0,00");
    expect(brl(0)).toBe("R$ 0,00");
  });
});

describe("brlInt", () => {
  it("arredonda e não mostra casas decimais", () => {
    expect(brlInt(1234.6)).toBe("R$ 1.235");
    expect(brlInt(999.4)).toBe("R$ 999");
  });

  it("trata null/undefined como R$ 0", () => {
    expect(brlInt(null)).toBe("R$ 0");
    expect(brlInt(undefined)).toBe("R$ 0");
  });
});
