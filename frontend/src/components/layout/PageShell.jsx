import { GlobalNav } from "./GlobalNav";
import { GlobalFooter } from "./GlobalFooter";

export const PageShell = ({ children }) => (
    <div className="flex min-h-screen flex-col">
        <a
            href="#konten-utama"
            data-testid="skip-to-content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-navy focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-white"
        >
            Langsung ke konten utama
        </a>
        <GlobalNav />
        <main id="konten-utama" tabIndex={-1} className="flex-1">
            {children}
        </main>
        <GlobalFooter />
    </div>
);
