export const CHURCH = {
    name: "GMAHK Rinegetan",
    fullName: "Gereja Masehi Advent Hari Ketujuh",
    entity: "Jemaat Rinegetan",
    region: "Minahasa · Sulawesi Utara",
    tagline: "Tempat Bertumbuh dalam Iman, Melayani, dan Bersama",
    // Street number and postal code are not verified yet; only the area of the Maps pin is shown.
    address: "Rinegetan, Tondano, Kabupaten Minahasa, Sulawesi Utara",
    // Contact details are hidden until the church confirms them (placeholders were never real).
    phone: null,
    whatsapp: null,
    email: null,
    // Exact pin of "GMAHK Jemaat Rinegetan" (https://maps.app.goo.gl/dUfu9roHcnH5pfdn8); a name search lands on the kelurahan boundary.
    mapsQuery: "1.2980427,124.9081001",
    socials: [],
};

export const NAV_LINKS = [
    { label: "Beranda", href: "/", testId: "nav-link-beranda" },
    { label: "Tentang Kami", href: "/tentang-kami", testId: "nav-link-tentang-kami" },
    { label: "Kegiatan", href: "/kegiatan", testId: "nav-link-kegiatan" },
    { label: "Media", href: "/media", testId: "nav-link-media" },
    { label: "Pelayanan", href: "/pelayanan", testId: "nav-link-pelayanan" },
    { label: "Sekolah Sabat", href: "/sekolah-sabat", testId: "nav-link-sekolah-sabat" },
    { label: "Kontak", href: "/kontak", testId: "nav-link-kontak" },
];

export const SABBATH = {
    title: "SABAT",
    verse: "Ingatlah dan kuduskanlah hari Sabat",
    verseRef: "Keluaran 20:8",
    items: [
        {
            name: "Sekolah Sabat",
            time: "08.45 WITA",
            note: "Setiap Sabtu pagi — kelas anak, remaja, pemuda, dan dewasa",
        },
        {
            name: "Ibadah Sabat",
            time: "Setelah Sekolah Sabat",
            note: "Khotbah dan pujian bersama seluruh jemaat",
        },
    ],
    weekly: [
        { day: "Sabat (Sabtu)", name: "Sekolah Sabat", time: "08.45 WITA" },
        { day: "Sabat (Sabtu)", name: "Ibadah Sabat & Khotbah", time: "10.15 WITA" },
        { day: "Rabu", name: "Kebaktian Permintaan Doa", time: "19.00 WITA" },
        { day: "Jumat", name: "Vesper Pemuda — Menyambut Sabat", time: "18.30 WITA" },
    ],
};

export const IMAGES = {
    hero: {
        src: "https://images.unsplash.com/photo-1662151808629-029b89ce5339?crop=entropy&cs=srgb&fm=jpg&w=1600&q=80",
        alt: "Jemaat GMAHK Rinegetan beribadah bersama pada hari Sabat",
        caption: "Ibadah Sabat — Jemaat Rinegetan",
    },
    sabbath: {
        src: "https://images.unsplash.com/photo-1662151900393-97f6bc1567ef?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80",
        alt: "Suasana kebaktian Sabat dengan pujian",
    },
    bibleStudy: {
        src: "https://images.unsplash.com/photo-1621750067939-c796fe19d0f1?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80",
        alt: "Kelompok kecil mempelajari Alkitab bersama",
    },
    fellowship: {
        src: "https://images.unsplash.com/photo-1659439267688-71cc201d09db?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80",
        alt: "Persekutuan jemaat dalam kebersamaan",
    },
    community: {
        src: "https://images.unsplash.com/photo-1563902341721-029085ad9347?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80",
        alt: "Pelayanan masyarakat oleh anggota jemaat",
    },
    nature: {
        src: "https://images.unsplash.com/photo-1781094671365-5c8c45f98dde?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80",
        alt: "Alam ciptaan di sekitar Minahasa",
    },
};

export const EVENT_CATEGORIES = [
    "Ibadah",
    "Pemuda",
    "Sekolah Sabat",
    "Pelayanan",
    "Penginjilan",
    "Sosial",
];

export const MINISTRY_CARDS = [
    {
        id: "pelajari-alkitab",
        title: "Pelajari Alkitab",
        description:
            "Belajar Alkitab secara pribadi atau kelompok kecil, daring maupun tatap muka — gratis dan terbuka untuk semua.",
        icon: "book-open",
    },
    {
        id: "permohonan-doa",
        title: "Permohonan Doa",
        description:
            "Kirimkan pokok doa Anda — tim pendoa jemaat akan mendoakannya dalam kebaktian doa mingguan.",
        icon: "hands-praying",
    },
    {
        id: "pertama-kali-berkunjung",
        title: "Pertama Kali Berkunjung?",
        description:
            "Panduan ramah untuk kunjungan pertama: apa yang diharapkan, apa yang dikenakan, dan siapa yang akan menyambut Anda.",
        icon: "door-open",
    },
];

export const MARQUEE_ITEMS = [
    "Ingatlah dan kuduskanlah hari Sabat — Keluaran 20:8",
    "Sekolah Sabat · 08.45 WITA",
    "Ibadah Sabat · Setelah Sekolah Sabat",
    "GMAHK Rinegetan · Minahasa, Sulawesi Utara",
    "Datanglah kepada-Ku, semua yang letih lesu dan berbeban berat — Matius 11:28",
];

export const SABBATH_SCHOOL_CLASSES = [
    {
        name: "Kelas Anak-Anak",
        age: "0–9 tahun",
        time: "08.45 WITA",
        description: "Cerita Alkitab, lagu, dan aktivitas kreatif bersama guru-guru yang mengasihi anak.",
    },
    {
        name: "Kelas Remaja (Pathfinder)",
        age: "10–15 tahun",
        time: "08.45 WITA",
        description: "Diskusi Alkitab yang jujur dan relevan dengan dunia remaja.",
    },
    {
        name: "Kelas Pemuda",
        age: "16–25 tahun",
        time: "08.45 WITA",
        description: "Pendalaman Firman dan percakapan iman untuk mahasiswa dan profesional muda.",
    },
    {
        name: "Kelas Dewasa",
        age: "26+ tahun",
        time: "08.45 WITA",
        description: "Pelajaran triwulan Gereja Masehi Advent Hari Ketujuh sedunia, dibahas bersama.",
    },
];
