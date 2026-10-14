/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            // Identidade do SuperPreco: inspirada no encarte de supermercado
            // (verde de feira, amarelo de etiqueta, vermelho de oferta e papel creme).
            colors: {
                feira: {
                    50: '#eef6f0',
                    100: '#d5eadb',
                    200: '#a9d4b6',
                    300: '#74b88b',
                    400: '#3f9862',
                    500: '#1f7a45',
                    600: '#146136',
                    700: '#0f4d2c',
                    800: '#0c3d24',
                    900: '#082a19',
                },
                etiqueta: {
                    100: '#fff6cc',
                    200: '#ffec99',
                    300: '#ffe066',
                    400: '#ffd23f',
                    500: '#f5bd02',
                },
                oferta: {
                    100: '#fde3e4',
                    500: '#e63946',
                    600: '#c92a37',
                    700: '#a3202c',
                },
                papel: {
                    50: '#fffdf8',
                    100: '#fbf7ef',
                    200: '#f3ecdf',
                    300: '#e6dcc8',
                },
                tinta: {
                    400: '#8a8579',
                    500: '#6b665b',
                    700: '#3a372f',
                    900: '#1d1b16',
                },
            },
            fontFamily: {
                sans: ['Figtree', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
                display: ['"Bricolage Grotesque"', 'Figtree', 'system-ui', 'sans-serif'],
                preco: ['"Barlow Condensed"', '"Arial Narrow"', 'sans-serif'],
                cupom: ['"IBM Plex Mono"', 'ui-monospace', 'Consolas', 'monospace'],
            },
            boxShadow: {
                etiqueta: '0 1px 0 rgba(29,27,22,.08), 0 6px 14px -6px rgba(29,27,22,.25)',
                cartao: '0 1px 2px rgba(29,27,22,.06), 0 8px 24px -12px rgba(29,27,22,.18)',
            },
        },
    },
    plugins: [],
}
