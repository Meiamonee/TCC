import {comparisonGroups} from './comparison.js';

const API_BASE_URL = import.meta.env?.VITE_API_URL || "/api";

async function request(path, signal) {
  const separator = path.includes("?") ? "&" : "?";
  const response = await fetch(
    `${API_BASE_URL}${path}${separator}_=${Date.now()}`,
    {
      cache: "no-store",
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(`Erro ${response.status} ao chamar ${path}`);
  }

  return response.json();
}

export function fetchProducts(filters, signal) {
  const params = new URLSearchParams({page:String(filters.page),limit:'24',sort:filters.sort});
  if (filters.market) params.set('supermercado', filters.market);
  if (filters.category) params.set('categoria', filters.category);
  if (filters.query) params.set('search', filters.query);
  if (filters.minimum !== '') params.set('min', filters.minimum);
  if (filters.maximum !== '') params.set('max', filters.maximum);
  if (!filters.onlyAvailable) params.set('includeIndisponiveis','true');
  return request(`/produtos?${params}`, signal);
}

export function fetchCatalogFilters(onlyAvailable, signal) {
  return request(`/catalogo/filtros${onlyAvailable ? '' : '?includeIndisponiveis=true'}`, signal);
}

export function fetchProductComparisons(id, signal) {
  return request(`/produtos/${encodeURIComponent(id)}/comparacoes`, signal)
    .then(normalizeComparisonResponse);
}

// Mantém a tela funcional enquanto um backend iniciado antes da simplificação
// ainda devolve os quatro grupos antigos. Após reiniciar a API, o novo formato
// passa direto sem conversão.
export function normalizeComparisonResponse(response) {
  const groups = response?.groups || {};
  if ('sameProduct' in groups && 'similar' in groups && 'alternatives' in groups) return response;
  const candidates = Object.values(groups).flat();
  return {
    ...response,
    groups: comparisonGroups(response.product, candidates),
  };
}
