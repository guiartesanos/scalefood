import { describe, it, expect, afterEach, vi } from "vitest";
import { hojeBR, hojeISOBR } from "./tz";

// Ver o comentário em tz.ts: a Vercel roda em UTC, e perto da meia-noite em
// São Paulo (UTC-3) o "dia" em UTC já virou pro dia seguinte. Esses testes
// existem justamente pra travar essa conversão — é o bug que já pegou
// pendências/DRE/MetaBar/faturamento_mes_atual nesta sessão.
describe("hojeBR / hojeISOBR", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("já é o dia seguinte em SP quando ainda são ~23h UTC do dia anterior", () => {
    // 2026-09-04T02:00:00Z = 2026-09-03T23:00:00-03:00
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-04T02:00:00Z"));
    expect(hojeBR()).toEqual({ ano: 2026, mes: 9, dia: 3 });
    expect(hojeISOBR()).toBe("2026-09-03");
  });

  it("acompanha o horário local de SP no meio do dia", () => {
    // 2026-09-04T15:00:00Z = 2026-09-04T12:00:00-03:00
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-04T15:00:00Z"));
    expect(hojeBR()).toEqual({ ano: 2026, mes: 9, dia: 4 });
    expect(hojeISOBR()).toBe("2026-09-04");
  });

  it("vira o ano corretamente na virada de 31/12 pra 01/01", () => {
    // 2026-01-01T02:00:00Z = 2025-12-31T23:00:00-03:00
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T02:00:00Z"));
    expect(hojeBR()).toEqual({ ano: 2025, mes: 12, dia: 31 });
    expect(hojeISOBR()).toBe("2025-12-31");
  });
});
