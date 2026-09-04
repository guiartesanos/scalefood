// Radar de notícias — puxa do Google News RSS (sem custo, sem API key)
// filtrado pelas palavras-chave do setor (food service/delivery), pra
// alimentar a aba Marketing > News.
//
// Fica MUITO barulho se só a palavra-chave decidir o que entra (a busca
// solta do Google News às vezes traz coisa sem nada a ver — vide o
// bloqueio abaixo) e o volume cresce sem parar se nada expira. Por isso,
// além de buscar, esse arquivo também RANQUEIA e filtra pros 10 mais
// relevantes do dia — ver rankearNoticias() pros critérios exatos.

const TERMOS = [
  "ifood",
  '"99 food"',
  "keeta",
  '"delivery de comida"',
  '"marketplace de restaurantes"',
  '"food service"',
  '"dark kitchen"',
  '"comportamento do consumidor" delivery',
  '"aplicativo de entrega"',
  "restaurantes tecnologia",
] as const;

// Peso por termo — quanto mais direto o assunto pro negócio (marketplaces
// de delivery, comportamento do consumidor), maior a prioridade. Termos
// mais genéricos (food service, dark kitchen) ainda entram, mas competem
// em desvantagem por um lugar nos 10 do dia.
const PESO_TERMO: Record<(typeof TERMOS)[number], number> = {
  ifood: 10,
  '"99 food"': 10,
  keeta: 9,
  '"delivery de comida"': 8,
  '"marketplace de restaurantes"': 8,
  '"comportamento do consumidor" delivery': 7,
  '"aplicativo de entrega"': 6,
  '"food service"': 5,
  '"dark kitchen"': 4,
  "restaurantes tecnologia": 3,
};

// Pequeno bônus pra veículo que normalmente pauta com mais rigor —
// não é filtro (não elimina ninguém), só desempate.
const FONTES_PRIORITARIAS = [
  "valor econômico",
  "estadão",
  "infomoney",
  "exame",
  "cnn brasil",
  "bloomberg línea brasil",
  "o globo",
  "folha de s.paulo",
  "uol",
];

// A busca do Google News é por palavra solta, não por assunto de
// verdade — de vez em quando isso traz coisa claramente fora do setor
// (visto na prática rodando o radar por semanas). Título com qualquer um
// desses termos é descartado antes mesmo de entrar no ranking.
const BLOQUEIO = ["disney+", "disney plus", "mobilidade urbana", "apps de corrida", "app de corrida", "streaming"];

const JANELA_MAX_HORAS = 72; // não considera nada mais velho que isso
const MAX_NOTICIAS_DIA = 10;

export interface NoticiaRSS {
  titulo: string;
  fonte: string | null;
  link: string;
  publicadoEm: string | null;
}

interface NoticiaComTermo extends NoticiaRSS {
  termo: (typeof TERMOS)[number];
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extrairTag(item: string, tag: string): string | null {
  const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return m ? decodeHtmlEntities(m[1].trim()) : null;
}

function parseRSS(xml: string): NoticiaRSS[] {
  const itens = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  return itens.map((item) => {
    const tituloBruto = extrairTag(item, "title") || "";
    const fonteMatch = item.match(/<source[^>]*>([\s\S]*?)<\/source>/);
    const fonte = fonteMatch ? decodeHtmlEntities(fonteMatch[1].trim()) : null;
    const titulo = fonte && tituloBruto.endsWith(fonte) ? tituloBruto.slice(0, -fonte.length).replace(/\s*-\s*$/, "").trim() : tituloBruto;
    return {
      titulo,
      fonte,
      link: extrairTag(item, "link") || "",
      publicadoEm: extrairTag(item, "pubDate"),
    };
  });
}

// Normaliza o título pra comparar duas manchetes de veículos diferentes
// sobre o MESMO fato (ex: 8 sites cobrindo "iFood aciona Cade contra
// Keeta") — minúsculo, sem acento/pontuação, só palavras com mais de 3
// letras (as pequenas — "de", "da", "com" — não ajudam a distinguir).
function normalizarTitulo(titulo: string): Set<string> {
  const semAcento = titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ");
  return new Set(semAcento.split(/\s+/).filter((p) => p.length > 3));
}

function similaridade(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let intersecao = 0;
  a.forEach((p) => { if (b.has(p)) intersecao++; });
  return intersecao / Math.min(a.size, b.size);
}

function horasDesde(dataISO: string | null): number | null {
  if (!dataISO) return null;
  const t = new Date(dataISO).getTime();
  if (isNaN(t)) return null;
  return (Date.now() - t) / (1000 * 60 * 60);
}

// Critérios do ranking, em ordem de peso:
// 1. Termo de busca — quão direto é o assunto pro negócio (PESO_TERMO).
// 2. Recência — só entra o que tem até 72h; dentro disso, quanto mais
//    novo, mais pontos (pensado pra favorecer "o que saiu ontem").
// 3. Repercussão — quantos veículos diferentes cobriram o mesmo fato
//    (manchetes parecidas) — mais cobertura = mais pontos, mas só o
//    MELHOR representante do grupo entra na lista final (não repete
//    a mesma notícia 8 vezes).
// 4. Fonte — pequeno bônus pra veículo mais estabelecido, só de desempate.
// Ban list (item 0, antes de tudo): título com termo da lista de
// bloqueio é descartado, não importa a pontuação.
export function rankearNoticias(noticias: NoticiaComTermo[]): NoticiaRSS[] {
  const validas = noticias.filter((n) => {
    if (!n.titulo || !n.link) return false;
    const tituloBaixo = n.titulo.toLowerCase();
    if (BLOQUEIO.some((b) => tituloBaixo.includes(b))) return false;
    const horas = horasDesde(n.publicadoEm);
    if (horas != null && horas > JANELA_MAX_HORAS) return false;
    return true;
  });

  const comScore = validas.map((n) => {
    const horas = horasDesde(n.publicadoEm);
    const recencia = horas == null ? 0 : Math.max(0, 10 - horas / 7.2); // ~72h => 0, agora => 10
    const fonteBonus = n.fonte && FONTES_PRIORITARIAS.includes(n.fonte.toLowerCase()) ? 2 : 0;
    return { ...n, score: PESO_TERMO[n.termo] + recencia + fonteBonus, palavras: normalizarTitulo(n.titulo) };
  });

  // agrupa por similaridade de título (mesmo fato, fontes diferentes) —
  // soma repercussão ao melhor item do grupo, descarta o resto.
  comScore.sort((a, b) => b.score - a.score);
  const escolhidas: (typeof comScore)[number][] = [];
  for (const candidata of comScore) {
    const grupo = escolhidas.find((e) => similaridade(e.palavras, candidata.palavras) >= 0.6);
    if (grupo) grupo.score += 0.5; // repercussão: +meio ponto por cobertura extra do mesmo fato
    else escolhidas.push(candidata);
  }

  return escolhidas
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_NOTICIAS_DIA)
    .map(({ titulo, fonte, link, publicadoEm }) => ({ titulo, fonte, link, publicadoEm }));
}

export async function buscarNoticiasRadar(): Promise<NoticiaRSS[]> {
  const todas: NoticiaComTermo[] = [];
  for (const termo of TERMOS) {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(termo)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) continue;
      const xml = await res.text();
      todas.push(...parseRSS(xml).slice(0, 8).map((n) => ({ ...n, termo })));
    } catch {
      // uma fonte fora do ar não deve derrubar o radar inteiro
    }
  }
  return rankearNoticias(todas);
}
