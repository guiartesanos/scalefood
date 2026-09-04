import { describe, it, expect, afterEach, vi } from "vitest";
import { rankearNoticias } from "./radar";

type NoticiaComTermo = Parameters<typeof rankearNoticias>[0][number];

const AGORA = new Date("2026-09-04T15:00:00Z");

function noticia(over: Partial<NoticiaComTermo> & { termo: NoticiaComTermo["termo"] }): NoticiaComTermo {
  return {
    titulo: "Notícia genérica sobre o setor",
    fonte: "Fonte Genérica",
    link: "https://example.com/" + Math.random(),
    publicadoEm: AGORA.toISOString(),
    ...over,
  };
}

// rankearNoticias é o coração do filtro do Radar — sem isso, 100+ itens
// (com ruído de busca por palavra solta) caíam direto na tela sem
// nenhum critério (ver a explicação dos critérios dada ao usuário: peso
// por termo, recência, repercussão entre manchetes parecidas, desempate
// por fonte, blocklist).
describe("rankearNoticias", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("descarta título com termo da blocklist mesmo com peso alto", () => {
    const itens = [noticia({ termo: "ifood", titulo: "iFood anuncia parceria com Disney+" })];
    expect(rankearNoticias(itens)).toHaveLength(0);
  });

  it("descarta notícia mais velha que a janela de 72h", () => {
    vi.useFakeTimers();
    vi.setSystemTime(AGORA);
    const velha = noticia({
      termo: "ifood",
      titulo: "Notícia antiga do setor",
      publicadoEm: new Date(AGORA.getTime() - 73 * 60 * 60 * 1000).toISOString(),
    });
    expect(rankearNoticias([velha])).toHaveLength(0);
  });

  it("mantém notícia dentro da janela de 72h", () => {
    vi.useFakeTimers();
    vi.setSystemTime(AGORA);
    const recente = noticia({
      termo: "ifood",
      titulo: "Notícia recente do setor",
      publicadoEm: new Date(AGORA.getTime() - 10 * 60 * 60 * 1000).toISOString(),
    });
    expect(rankearNoticias([recente])).toHaveLength(1);
  });

  it("ranqueia termo de peso maior antes de termo de peso menor, mesma recência", () => {
    vi.useFakeTimers();
    vi.setSystemTime(AGORA);
    const generico = noticia({ termo: "restaurantes tecnologia", titulo: "Tecnologia muda restaurantes locais" });
    const direto = noticia({ termo: "ifood", titulo: "iFood bate recorde de pedidos no trimestre" });
    const resultado = rankearNoticias([generico, direto]);
    expect(resultado.map((n) => n.titulo)).toEqual([direto.titulo, generico.titulo]);
  });

  it("agrupa manchetes parecidas (mesmo fato) e mantém só a de maior pontuação", () => {
    vi.useFakeTimers();
    vi.setSystemTime(AGORA);
    const cobertura1 = noticia({
      termo: "ifood",
      titulo: "iFood aciona Cade contra Keeta por concorrência desleal",
      fonte: "Site Qualquer",
    });
    const cobertura2 = noticia({
      termo: "keeta",
      titulo: "iFood aciona Cade contra a Keeta por concorrência desleal no delivery",
      fonte: "Valor Econômico",
    });
    const resultado = rankearNoticias([cobertura1, cobertura2]);
    // mesmo fato, duas fontes — só uma entra na lista final.
    expect(resultado).toHaveLength(1);
  });

  it("corta pras 10 mais relevantes quando vem mais notícia que isso", () => {
    vi.useFakeTimers();
    vi.setSystemTime(AGORA);
    // 15 fatos genuinamente diferentes (similaridade de título baixa entre
    // todos os pares) — se fossem parecidos demais, agrupariam antes do
    // corte e o teste não estaria testando o MAX_NOTICIAS_DIA de verdade.
    const titulos = [
      "iFood adquire startup paulista de logística reversa",
      "Keeta expande operação para cidades do interior",
      "Rede de hamburguerias fecha parceria com fintech local",
      "Delivery de sobremesas cresce após campanha viral",
      "Aplicativo novo promete reduzir taxa de comissão",
      "Dark kitchen paulistana recebe aporte de investidores",
      "Marketplace de restaurantes anuncia integração com ERP",
      "Consumidor muda hábito e passa a pedir menos",
      "Rede de pizzarias testa robô para entregas rápidas",
      "Startup de comida saudável capta rodada série A",
      "Grande cadeia de fast food revisa cardápio nacional",
      "Aplicativo de entrega lança assinatura mensal nova",
      "Restaurante tradicional adota totem de autoatendimento",
      "Setor gastronômico projeta crescimento pro próximo ano",
      "Nova lei municipal regula entregadores de aplicativo",
    ];
    const itens = titulos.map((titulo) => noticia({ termo: "ifood", titulo }));
    expect(rankearNoticias(itens)).toHaveLength(10);
  });
});
