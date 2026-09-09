import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Lenis from "lenis";
import { Toaster } from "sonner";
import "@/App.css";
import { PageShell } from "@/components/layout/PageShell";
import HomePage from "@/pages/HomePage";
import TentangKamiPage from "@/pages/TentangKamiPage";
import KegiatanPage from "@/pages/KegiatanPage";
import MediaPage from "@/pages/MediaPage";
import PelayananPage from "@/pages/PelayananPage";
import SekolahSabatPage from "@/pages/SekolahSabatPage";
import KontakPage from "@/pages/KontakPage";

const ScrollManager = () => {
    const { pathname, hash } = useLocation();
    useEffect(() => {
        if (hash) {
            const timer = setTimeout(() => {
                document
                    .getElementById(hash.slice(1))
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 120);
            return () => clearTimeout(timer);
        }
        window.scrollTo(0, 0);
    }, [pathname, hash]);
    return null;
};

function App() {
    useEffect(() => {
        const lenis = new Lenis({ duration: 1.15, smoothWheel: true });
        let rafId;
        const raf = (time) => {
            lenis.raf(time);
            rafId = requestAnimationFrame(raf);
        };
        rafId = requestAnimationFrame(raf);
        return () => {
            cancelAnimationFrame(rafId);
            lenis.destroy();
        };
    }, []);

    return (
        <div className="App">
            <BrowserRouter>
                <ScrollManager />
                <PageShell>
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/tentang-kami" element={<TentangKamiPage />} />
                        <Route path="/kegiatan" element={<KegiatanPage />} />
                        <Route path="/media" element={<MediaPage />} />
                        <Route path="/pelayanan" element={<PelayananPage />} />
                        <Route path="/sekolah-sabat" element={<SekolahSabatPage />} />
                        <Route path="/kontak" element={<KontakPage />} />
                    </Routes>
                </PageShell>
                <Toaster position="top-center" richColors />
            </BrowserRouter>
        </div>
    );
}

export default App;
