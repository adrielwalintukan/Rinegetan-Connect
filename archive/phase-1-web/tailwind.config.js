/** @type {import('tailwindcss').Config} */
module.exports = {
    blocklist: ["overline"],
    darkMode: ["class"],
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
        "./public/index.html"
    ],
    theme: {
        extend: {
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)'
            },
            fontFamily: {
                sans: ["'Advent Sans'", "'Plus Jakarta Sans'", "'Noto Sans'", "system-ui", "-apple-system", "sans-serif"],
                serif: ["'Cormorant Garamond'", "Georgia", "serif"],
                mono: ["'JetBrains Mono'", "ui-monospace", "monospace"]
            },
            colors: {
                background: 'hsl(var(--background))',
                foreground: 'hsl(var(--foreground))',
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))'
                },
                popover: {
                    DEFAULT: 'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))'
                },
                primary: {
                    DEFAULT: 'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))'
                },
                secondary: {
                    DEFAULT: 'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))'
                },
                muted: {
                    DEFAULT: 'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))'
                },
                accent: {
                    DEFAULT: 'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))'
                },
                destructive: {
                    DEFAULT: 'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))'
                },
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                navy: {
                    DEFAULT: '#0A2540',
                    50: '#F0F5FA',
                    100: '#DCE7F2',
                    200: '#B9CFE5',
                    400: '#3D6491',
                    500: '#1B4468',
                    600: '#12365C',
                    700: '#0F2E4E',
                    800: '#0A2540',
                    900: '#071B30'
                },
                sabbath: {
                    DEFAULT: '#E5A93C',
                    50: '#FDF8EE',
                    100: '#FBF0DA',
                    200: '#F6E0B4',
                    300: '#EFC97E',
                    400: '#E9B95C',
                    500: '#E5A93C',
                    600: '#C98F26',
                    700: '#A6721C'
                },
                gold: '#D4AF37',
                life: '#0D9488'
            },
            keyframes: {
                'accordion-down': {
                    from: { height: '0' },
                    to: { height: 'var(--radix-accordion-content-height)' }
                },
                'accordion-up': {
                    from: { height: 'var(--radix-accordion-content-height)' },
                    to: { height: '0' }
                },
                marquee: {
                    from: { transform: 'translateX(0)' },
                    to: { transform: 'translateX(-50%)' }
                }
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
                marquee: 'marquee 48s linear infinite'
            }
        }
    },
    plugins: [require("tailwindcss-animate")],
};
