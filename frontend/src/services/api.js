const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function request(path) {
    const separator = path.includes('?') ? '&' : '?';
    const response = await fetch(`${API_BASE_URL}${path}${separator}_=${Date.now()}`, {
        cache: 'no-store'
    });

    if (!response.ok) {
        throw new Error(`Erro ${response.status} ao chamar ${path}`);
    }

    return response.json();
}

export function fetchProducts() {
    return request('/produtos?limit=50000');
}
