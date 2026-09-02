// Radar de notícias — puxa do Google News RSS (sem custo, sem API key)
// filtrado pelas palavras-chave do setor (food service/delivery), pra
// alimentar a aba Marketing > News.

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
];

export interface NoticiaRSS {
  titulo: string;
  fonte: string | null;
  link: string;
  publicadoEm: string | null;
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

// Uma notícia por termo de busca é suficiente pro radar — junta tudo e
// deduplica por link na hora de gravar no banco (unique constraint).
export async function buscarNoticiasRadar(): Promise<NoticiaRSS[]> {
  const todas: NoticiaRSS[] = [];
  for (const termo of TERMOS) {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(termo)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!res.ok) continue;
      const xml = await res.text();
      todas.push(...parseRSS(xml).slice(0, 8));
    } catch {
      // uma fonte fora do ar não deve derrubar o radar inteiro
    }
  }
  return todas;
}
