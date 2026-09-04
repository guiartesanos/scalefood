import { describe, it, expect } from "vitest";
import { prazoSugeridoPrimeiraReuniao, gerarDatasCadencia } from "./reunioes";

describe("prazoSugeridoPrimeiraReuniao", () => {
  it("prioriza segunda/terça/quarta mesmo pulando o domingo no meio da janela", () => {
    // fechamento numa quinta (2026-09-03): candidatos são sex/sáb (domingo
    // pulado) + segunda — a segunda (dia 1) vence por estar em [1,2,3].
    expect(prazoSugeridoPrimeiraReuniao("2026-09-03")).toBe("2026-09-07");
  });

  it("usa o primeiro dia útil já dentro de seg/ter/qua", () => {
    // fechamento numa segunda (2026-09-07): dia seguinte já é terça.
    expect(prazoSugeridoPrimeiraReuniao("2026-09-07")).toBe("2026-09-08");
  });

  it("cai no prazo de 3 dias mesmo sem cair em seg/ter/qua", () => {
    // fechamento numa quarta (2026-09-02): os 3 dias seguintes (qui/sex/sáb)
    // não têm nenhum seg/ter/qua — prevalece o prazo de 3 dias, usando o
    // primeiro candidato.
    expect(prazoSugeridoPrimeiraReuniao("2026-09-02")).toBe("2026-09-03");
  });
});

describe("gerarDatasCadencia", () => {
  it("gera datas semanais a partir da próxima ocorrência do dia pedido", () => {
    // 2026-09-03 é quinta; a próxima segunda (1) estritamente depois é 09-07.
    expect(gerarDatasCadencia("2026-09-03", 1, 3)).toEqual([
      "2026-09-07",
      "2026-09-14",
      "2026-09-21",
    ]);
  });

  it("nunca repete o próprio dia de partida — pula pra semana seguinte", () => {
    // partindo de uma segunda (2026-09-07) pedindo segunda (1), a 1ª data
    // não pode ser a própria 2026-09-07 — tem que ser a segunda seguinte.
    expect(gerarDatasCadencia("2026-09-07", 1, 1)).toEqual(["2026-09-14"]);
  });
});
