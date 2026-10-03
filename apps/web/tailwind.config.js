/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                rs: {
                    canvas: '#15110e',
                    surface: '#211914',
                    raised: '#2d2119',
                    inset: '#19120e',
                    border: '#705a39',
                    'border-strong': '#a88647',
                    gold: '#d4ad53',
                    'gold-bright': '#f1d487',
                    text: '#ead9b7',
                    muted: '#aa9a7c',
                    success: '#6f984f',
                    danger: '#b45b4e',
                    info: '#668ca3',
                },
            },
            fontFamily: {
                display: ['"Cinzel"', '"Georgia"', 'serif'],
                sans: ['"Inter"', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                'rs-panel': '0 14px 32px rgb(5 3 2 / 28%), inset 0 1px rgb(255 235 181 / 4%)',
            },
        },
    },
    plugins: [],
}
