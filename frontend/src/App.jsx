import { useCallback, useEffect, useState } from "react";
import {
  MapPin,
  Search,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  SlidersHorizontal,
  Info,
} from "lucide-react";
import { fetchProducts, fetchCatalogFilters, fetchProductComparisons } from "./services/api";
import { supermarkets, getSupermarket } from "./services/supermarkets";
import ComparisonPage from './components/ComparisonPage';
import CatalogCard from "./components/CatalogCard";
import superPrecoLogo from "./assets/superpreco-logo.png";
import "./App.css";

function HowItWorks() {
  return (
    <main className="shell info-page">
      <a href="#/" className="back-link">
        <ArrowLeft size={17} /> Voltar aos produtos
      </a>
      <span className="eyebrow">SUPERPREÇO</span>
      <h1>
        Uma escolha melhor começa
        <br />
        com uma boa comparação.
      </h1>
      <p className="intro">
        Reunimos preços publicados pelos supermercados de Poços de Caldas para
        ajudar você a planejar suas compras.
      </p>
      <div className="steps">
        {[
          [
            "01",
            "Encontre seu produto",
            "Busque pelo nome ou marca. Use os filtros de mercado, categoria e preço para refinar os resultados.",
          ],
          [
            "02",
            "Confira as ofertas",
            "Abra “Ver ofertas” para comparar o mesmo produto em outros mercados e navegar por produtos similares ou alternativas.",
          ],
          [
            "03",
            "Visite o supermercado",
            "Confira o preço atual no site da loja. A compra acontece diretamente com o supermercado.",
          ],
        ].map(([n, title, text]) => (
          <section key={n}>
            <span>{n}</span>
            <h2>{title}</h2>
            <p>{text}</p>
          </section>
        ))}
      </div>
      <section className="info-box">
        <h2>O que considerar na comparação</h2>
        <p>
          O comparador normaliza nome, marca, categoria, quantidade e variante.
          Correspondências com 95% ou mais são certas; entre 80% e 94% são
          prováveis. Ambas aparecem em “Mesmo produto em outros mercados”.
        </p>
        <p>
          “Produtos similares” reúne variações próximas da mesma marca, enquanto
          “Alternativas” apresenta substitutos da mesma família. Esses dois grupos
          usam carrosséis e comparam o preço por kg, litro ou unidade. Promoções,
          clube e cashback aparecem separadamente e não determinam o menor preço normal.
        </p>
        <p>
          Estamos testando com uma base parcial. Nem todos os produtos e
          departamentos das lojas estão presentes.
        </p>
      </section>
      <h2>Mercados cadastrados</h2>
      <div className="market-list">
        {supermarkets.map((m) => (
          <span className="market-brand" data-market={m.id} key={m.id}>
            <img src={m.logo} alt={`Logo ${m.name}`} />
            <span>{m.name}</span>
          </span>
        ))}
      </div>
      <a className="primary-button" href="#/">
        Explorar produtos <ArrowRight size={17} />
      </a>
    </main>
  );
}

export default function App() {
  const [catalog, setCatalog] = useState({data:[],total:0,totalPages:1});
  const [facets, setFacets] = useState({categories:[],markets:{}});
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [route, setRoute] = useState(window.location.hash || "#/");
  const [query, setQuery] = useState("");
  const [market, setMarket] = useState("");
  const [category, setCategory] = useState("");
  const [minimum, setMinimum] = useState("");
  const [maximum, setMaximum] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deferredQuery, setDeferredQuery] = useState("");
  const isCatalog = route === "#/" || route === "#";
  const isInfo = route === "#/como-funciona";
  const selectedId = route.startsWith("#/produto/") ? route.slice(10) : null;
  const load = useCallback(() => { setRefreshing(true); setRefreshKey(key => key + 1); }, []);
  useEffect(() => {
    const timer = setTimeout(() => setDeferredQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    if (!isCatalog) return;
    const controller = new AbortController();
    fetchProducts({page,sort,market,category,query:deferredQuery,minimum,maximum,onlyAvailable}, controller.signal)
      .then(response => { setCatalog(response); setError(""); })
      .catch(error => { if (error.name !== 'AbortError') setError("Não foi possível carregar os produtos. Verifique se a API e o MongoDB estão ligados."); })
      .finally(() => { if (!controller.signal.aborted) { setLoading(false); setRefreshing(false); } });
    return () => controller.abort();
  }, [isCatalog,page,sort,market,category,deferredQuery,minimum,maximum,onlyAvailable,refreshKey]);
  useEffect(() => {
    if (!isCatalog) return;
    const controller = new AbortController();
    fetchCatalogFilters(onlyAvailable,controller.signal)
      .then(setFacets)
      .catch(error => { if (error.name !== 'AbortError') setError("Não foi possível carregar os filtros."); });
    return () => controller.abort();
  }, [isCatalog,onlyAvailable,refreshKey]);
  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    fetchProductComparisons(selectedId,controller.signal)
      .then(response => { setDetail(response); setError(""); })
      .catch(error => { if (error.name !== 'AbortError') { setDetail(null); setError("Não foi possível abrir este produto."); } });
    return () => controller.abort();
  }, [selectedId]);
  useEffect(() => {
    const change = () => {
      setRoute(window.location.hash || "#/");
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  const categories = facets.categories;
  const counts = facets.markets;
  const pages = Math.max(1, catalog.totalPages);
  const current = Math.min(page, pages);
  const visible = catalog.data;
  const changeFilter = (setter, value) => {
    setter(value);
    setPage(1);
  };
  const reset = () => {
    setMarket("");
    setCategory("");
    setQuery("");
    setMinimum("");
    setMaximum("");
    setOnlyAvailable(true);
    setPage(1);
  };
  const hasFilters =
    market || category || query || minimum || maximum || !onlyAvailable;
  const selected = selectedId && detail?.product.id === selectedId ? detail.product : null;
  return (
    <div className="app-layout">
      <header className="site-header">
        <div className="shell header-inner">
          <a href="#/" className="brand" aria-label="SuperPreço — início">
            <img src={superPrecoLogo} alt="SuperPreço" />
          </a>
          <nav aria-label="Navegação principal">
            <a
              href="#/"
              className={!isInfo ? "active" : ""}
              aria-current={isCatalog ? "page" : undefined}
            >
              Comparar
            </a>
            <a
              href="#/como-funciona"
              className={isInfo ? "active" : ""}
              aria-current={isInfo ? "page" : undefined}
            >
              Como funciona
            </a>
          </nav>
          <span className="location">
            <MapPin size={17} /> Poços de Caldas, MG
          </span>
        </div>
      </header>
      {isInfo ? (
        <HowItWorks />
      ) : (
        <>
          {isCatalog && (
            <>
              <section className="shell hero">
                <div className="hero-content">
                  <h1>
                    Compare preços.
                    <br />
                    Compre melhor.
                  </h1>
                  <p>Encontre ofertas nos mercados da sua cidade.</p>
                  <form
                    className="search-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      document
                        .getElementById("catalog")
                        .scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    <label className="search-input">
                      <Search size={21} />
                      <input
                        aria-label="Buscar por produto ou marca"
                        placeholder="Busque por produto ou marca"
                        value={query}
                        onChange={(e) => changeFilter(setQuery, e.target.value)}
                      />
                    </label>
                    <button className="primary-button">Buscar</button>
                  </form>
                </div>
              </section>
              <div className="market-tabs-wrap">
                <div
                  className="shell market-tabs"
                  aria-label="Filtrar por supermercado"
                >
                  <button
                    className={!market ? "active" : ""}
                    aria-pressed={!market}
                    onClick={() => changeFilter(setMarket, "")}
                  >
                    Todos
                  </button>
                  {supermarkets.map((m) => (
                    <button
                      key={m.id}
                      className={market === m.id ? "active" : ""}
                      aria-pressed={market === m.id}
                      onClick={() => changeFilter(setMarket, m.id)}
                    >
                      {m.name}
                      <span title={onlyAvailable ? "Produtos disponíveis na última coleta" : "Todos os produtos coletados"}>
                        {counts[m.id] || 0}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          {error && (
            <div className="shell error-message" role="alert">
              {error}
              <button onClick={load}>Tentar novamente</button>
            </div>
          )}
          {isCatalog && loading ? (
            <main className="shell state-panel" role="status">
              <RefreshCw className="spinning" />
              <h2>Carregando produtos</h2>
              <p>Consultando os preços coletados dos mercados.</p>
            </main>
          ) : isCatalog ? (
            <main id="catalog" className="shell catalog-layout">
              <button
                className="outline-button mobile-filter"
                aria-expanded={filtersOpen}
                onClick={() => setFiltersOpen(!filtersOpen)}
              >
                <SlidersHorizontal size={17} />
                {filtersOpen ? "Fechar filtros" : "Categorias e filtros"}
              </button>
              <aside
                className={`filters ${filtersOpen ? "open" : ""}`}
                aria-label="Filtros"
              >
                <div className="filter-title">
                  <h2>Categorias</h2>
                  {hasFilters && <button onClick={reset}>Limpar</button>}
                </div>
                <div className="category-list">
                  <button
                    className={!category ? "active" : ""}
                    aria-pressed={!category}
                    onClick={() => changeFilter(setCategory, "")}
                  >
                    Todas
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c}
                      className={category === c ? "active" : ""}
                      aria-pressed={category === c}
                      onClick={() => changeFilter(setCategory, c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <div className="price-filter">
                  <h2>Preço</h2>
                  <div>
                    <label>
                      Mínimo
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="R$ 0"
                        value={minimum}
                        onChange={(e) =>
                          changeFilter(setMinimum, e.target.value)
                        }
                      />
                    </label>
                    <label>
                      Máximo
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Sem limite"
                        value={maximum}
                        onChange={(e) =>
                          changeFilter(setMaximum, e.target.value)
                        }
                      />
                    </label>
                  </div>
                  {minimum !== "" &&
                    maximum !== "" &&
                    Number(minimum) > Number(maximum) && (
                      <p className="field-error">
                        O mínimo deve ser menor que o máximo.
                      </p>
                    )}
                </div>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={onlyAvailable}
                    onChange={(e) =>
                      changeFilter(setOnlyAvailable, e.target.checked)
                    }
                  />
                  Somente disponíveis
                </label>
                <div className="sample-note">
                  <Info size={16} />
                  <span>
                    Base parcial para testes.
                    <br />
                    Preços sujeitos a alteração.
                  </span>
                </div>
              </aside>
              <section className="catalog-results">
                <div className="section-heading">
                  <div>
                    <h2>
                      {category ||
                        (query ? "Resultados da busca" : "Explore os produtos")}
                    </h2>
                    <p className="muted small">
                      {catalog.total} produtos {onlyAvailable ? "disponíveis" : "coletados"}
                      {market
                        ? ` · ${getSupermarket(market).name}`
                        : " · mercados de Poços de Caldas"}
                    </p>
                  </div>
                  <div className="sort-controls">
                    <label>
                      <span className="sr-only">Ordenar produtos</span>
                      <select
                        value={sort}
                        onChange={(e) => changeFilter(setSort, e.target.value)}
                      >
                        <option value="name">Ordenar: nome</option>
                        <option value="low">Menor preço</option>
                        <option value="high">Maior preço</option>
                      </select>
                    </label>
                    <button
                      className="icon-button"
                      onClick={load}
                      disabled={refreshing}
                      aria-label="Atualizar produtos"
                    >
                      <RefreshCw
                        size={17}
                        className={refreshing ? "spinning" : ""}
                      />
                    </button>
                  </div>
                </div>
                {hasFilters && (
                  <div className="active-filters">
                    <span>
                      {market
                        ? getSupermarket(market).name
                        : "Todos os mercados"}
                      {category && ` / ${category}`}
                      {query && ` / “${query}”`}
                    </span>
                    <button onClick={reset}>Limpar filtros</button>
                  </div>
                )}
                {visible.length ? (
                  <div className="product-grid">
                    {visible.map((p) => (
                      <CatalogCard
                        key={p.id}
                        product={p}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="state-panel">
                    <Search size={30} />
                    <h3>Nenhum produto encontrado</h3>
                    <p>Tente outro termo ou ajuste os filtros.</p>
                    <button className="outline-button" onClick={reset}>
                      Limpar filtros
                    </button>
                  </div>
                )}
                <div className="catalog-bottom">
                  <p className="small muted">
                    Confira o preço e a disponibilidade no site do mercado.
                  </p>
                  {pages > 1 && (
                    <nav className="pagination" aria-label="Paginação">
                      <button
                        aria-label="Página anterior"
                        disabled={current === 1}
                        onClick={() => {
                          setPage(current - 1);
                          document.getElementById("catalog").scrollIntoView();
                        }}
                      >
                        <ArrowLeft size={16} />
                      </button>
                      <span>
                        Página {current} de {pages}
                      </span>
                      <button
                        aria-label="Próxima página"
                        disabled={current === pages}
                        onClick={() => {
                          setPage(current + 1);
                          document.getElementById("catalog").scrollIntoView();
                        }}
                      >
                        <ArrowRight size={16} />
                      </button>
                    </nav>
                  )}
                </div>
              </section>
            </main>
          ) : selected ? (
            <ComparisonPage product={selected} groups={detail.groups} />
          ) : selectedId && !error ? (
            <main className="shell state-panel" role="status">
              <RefreshCw className="spinning" />
              <h2>Carregando comparação</h2>
              <p>Consultando as ofertas dos outros mercados.</p>
            </main>
          ) : (
            <main className="shell state-panel">
              <h1>Página não encontrada</h1>
              <p>O produto pode não estar disponível nesta base.</p>
              <a href="#/" className="primary-button">
                Voltar ao catálogo
              </a>
            </main>
          )}
        </>
      )}
      <footer className="site-footer">
        <div className="shell footer-layout">
          <div className="footer-identity">
            <a className="footer-brand" href="#/" aria-label="Ir para o início do SuperPreço">
              <img src={superPrecoLogo} alt="SuperPreço" />
            </a>
            <p>Compare com calma.<br />Escolha melhor.</p>
          </div>

          <div className="footer-content">
            <div className="footer-top">
              <p>Comparação de preços para escolhas mais conscientes.</p>
              <nav className="footer-nav" aria-label="Links do rodapé">
                <a href="#/">Produtos</a>
                <a href="#/como-funciona">Como funciona</a>
              </nav>
            </div>

            <div className="footer-markets">
              <div className="footer-market-copy">
                <span>Mercados acompanhados</span>
                <p>Preços publicados por supermercados de Poços de Caldas.</p>
              </div>
              <div className="footer-market-logos" aria-label="Mercados acompanhados pelo SuperPreço">
                {supermarkets.map((m) => (
                  <span
                    className="footer-market-logo"
                    data-market={m.id}
                    title={m.name}
                    key={m.id}
                  >
                    <img src={m.logo} alt={m.name} />
                    <span>{m.name}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="footer-bottom">
              <div className="footer-credit">
                <span>Feito por</span>
                <strong>Pedro Lucas de Souza Faria</strong>
                <span>Instituto Federal de Poços de Caldas</span>
              </div>
              <p>Preços e disponibilidade podem mudar. Confirme sempre no site do mercado.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
