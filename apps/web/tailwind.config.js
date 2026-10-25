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
                    'gold-hover': '#ffe3a3',
                    // Difficulty stars on the mobile mini-map (Easy / Medium; Hard uses gold).
                    bronze: '#c27c46',
                    silver: '#c9cdd3',
                    text: '#ead9b7',
                    muted: '#aa9a7c',
                    disabled: '#9a8b70',
                    success: '#6f984f',
                    'success-text': '#b5d699',
                    'success-bg': '#1b2214',
                    'warning-bg': '#2a2112',
                    danger: '#b45b4e',
                    'danger-text': '#efaaa0',
                    'danger-bg': '#2b1714',
                    info: '#668ca3',
                    'info-text': '#a9cde2',
                    'info-bg': '#13202a',
                    'info-banner-text': '#cfe2ee',
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
