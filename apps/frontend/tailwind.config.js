/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        '../../packages/ui/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#eff6ff',
                    500: '#2563eb',
                    600: '#1d4ed8',
                    700: '#1e40af',
                },
                secondary: {
                    50: '#fff7ed',
                    500: '#f97316',
                    600: '#ea580c',
                },
                gray: {
                    50: '#f9fafb',
                    100: '#f3f4f6',
                    500: '#6b7280',
                    600: '#374151',
                    900: '#111827',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            screens: {
                sm: '640px',
                md: '768px',
                lg: '1024px',
                xl: '1280px',
            },
        },
    },
    plugins: [
        require('@tailwindcss/forms'),
        require('@tailwindcss/typography'),
    ],
}
