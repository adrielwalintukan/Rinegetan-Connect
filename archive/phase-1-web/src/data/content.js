export const CHURCH = {
    name: "GMAHK Rinegetan",
    fullName: "Gereja Masehi Advent Hari Ketujuh",
    entity: "Jemaat Rinegetan",
    region: "Minahasa · Sulawesi Utara",
    tagline: "Tempat Bertumbuh dalam Iman, Melayani, dan Bersama",
    address: "Jl. Rinegetan No. 7, Tondano, Kabupaten Minahasa, Sulawesi Utara 95611",
    phone: "+62 812-3456-7890",
    whatsapp: "https://wa.me/6281234567890",
    email: "halo@gmahkrinegetan.org",
    mapsQuery: "Rinegetan, Tondano, Minahasa, Sulawesi Utara",
    socials: [
        { label: "Facebook", href: "https://facebook.com/gmahkrinegetan", icon: "facebook" },
        { label: "Instagram", href: "https://instagram.com/gmahkrinegetan", icon: "instagram" },
        { label: "YouTube", href: "https://youtube.com/@gmahkrinegetan", icon: "youtube" },
    ],
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

export const EVENTS = [
    {
        id: "perjamuan-kudus-q3",
        title: "Ibadah Sabat & Perjamuan Kudus",
        date: "Sabtu, 25 Juli 2026",
        time: "08.45 WITA",
        location: "Gereja GMAHK Rinegetan",
        category: "Ibadah",
        image: IMAGES.sabbath.src,
        description:
            "Sabat istimewa dengan upacara Perjamuan Kudus — momen pembaruan komitmen dan pelayanan satu sama lain dalam kerendahan hati.",
    },
    {
        id: "ay-vesper-juli",
        title: "Kebaktian Pemuda Advent (AY)",
        date: "Sabtu, 25 Juli 2026",
        time: "16.00 WITA",
        location: "Aula Pemuda GMAHK Rinegetan",
        category: "Pemuda",
        image: IMAGES.fellowship.src,
        description:
            "Sore Sabat bersama pemuda: pujian, kesaksian, dan diskusi Alkitab yang relevan dengan kehidupan anak muda Minahasa.",
    },
    {
        id: "pelajaran-ss-triwulan-3",
        title: "Pelajaran Sekolah Sabat — Triwulan III",
        date: "Setiap Sabtu",
        time: "08.45 WITA",
        location: "Ruang kelas Sekolah Sabat",
        category: "Sekolah Sabat",
        image: IMAGES.bibleStudy.src,
        description:
            "Pendalaman Alkitab triwulan ketiga dalam kelompok kecil — anak-anak, remaja, pemuda, dan dewasa belajar sesuai kelas masing-masing.",
    },
    {
        id: "bakti-sosial-agustus",
        title: "Bakti Sosial: Pemeriksaan Kesehatan Gratis",
        date: "Minggu, 2 Agustus 2026",
        time: "09.00 WITA",
        location: "Balai Desa Rinegetan",
        category: "Sosial",
        image: IMAGES.community.src,
        description:
            "Departemen Kesehatan dan Diakonia melayani masyarakat desa: pemeriksaan tensi, gula darah, dan konsultasi gaya hidup sehat.",
    },
    {
        id: "kebaktian-doa-rabu",
        title: "Kebaktian Permintaan Doa",
        date: "Setiap Rabu",
        time: "19.00 WITA",
        location: "Gereja GMAHK Rinegetan",
        category: "Ibadah",
        image: IMAGES.bibleStudy.src,
        description:
            "Pertengahan pekan yang tenang untuk berdoa, membaca Firman, dan saling menguatkan dalam persekutuan kecil.",
    },
    {
        id: "pekan-doa-penginjilan",
        title: "Pekan Doa & Penginjilan “Harapan bagi Minahasa”",
        date: "8–15 Agustus 2026",
        time: "19.00 WITA",
        location: "Gereja GMAHK Rinegetan",
        category: "Penginjilan",
        image: IMAGES.hero.src,
        description:
            "Delapan malam pembahasan Alkitab tentang pengharapan — terbuka untuk seluruh masyarakat Rinegetan dan sekitarnya.",
    },
];

export const DEPARTMENTS = [
    {
        slug: "sekolah-sabat",
        name: "Sekolah Sabat",
        icon: "book-open",
        description: "Pendalaman Alkitab untuk segala usia, dari anak hingga dewasa, setiap Sabtu pagi.",
    },
    {
        slug: "pemuda-advent",
        name: "Pemuda Advent",
        icon: "flame",
        description: "Wadah bertumbuh anak muda — kebaktian AY, kegiatan sosial, dan kepemimpinan.",
    },
    {
        slug: "pathfinder",
        name: "Pathfinder",
        icon: "compass",
        description: "Klub remaja 10–15 tahun: keterampilan, alam, disiplin, dan iman yang hidup.",
    },
    {
        slug: "adventurer",
        name: "Adventurer",
        icon: "sun",
        description: "Klub anak 6–9 tahun belajar tentang Yesus melalui bermain, lagu, dan petualangan.",
    },
    {
        slug: "anak",
        name: "Anak",
        icon: "smile",
        description: "Pelayanan anak Sekolah Sabat dengan cerita Alkitab, lagu, dan kreativitas.",
    },
    {
        slug: "diakonia",
        name: "Diakonia",
        icon: "heart-handshake",
        description: "Kepedulian nyata: mengunjungi, menolong, dan melayani keluarga yang membutuhkan.",
    },
    {
        slug: "kesehatan",
        name: "Kesehatan",
        icon: "heart-pulse",
        description: "Pesan kesehatan Advent — hidup sehat, seminar gaya hidup, dan pelayanan medis desa.",
    },
    {
        slug: "musik",
        name: "Musik",
        icon: "music",
        description: "Paduan suara, pujian, dan musisi jemaat yang memuliakan Tuhan dalam setiap ibadah.",
    },
    {
        slug: "penginjilan",
        name: "Penginjilan",
        icon: "megaphone",
        description: "Membagikan pengharapan — pelajaran Alkitab pribadi, pekan doa, dan literatur.",
    },
];

export const MEDIA_ITEMS = [
    {
        id: "khotbah-pengharapan-teguh",
        type: "Khotbah",
        title: "Pengharapan yang Teguh di Tengah Badai",
        meta: "Pdt. J. Rantung · Sabtu, 18 Juli 2026 · 38 menit",
        image: IMAGES.sabbath.src,
        description: "Renungan khotbah Sabat dari Ibrani 6:19 — jangkar bagi jiwa yang letih.",
    },
    {
        id: "renungan-beristirahat",
        type: "Renungan",
        title: "Beristirahat dalam Janji-Nya",
        meta: "Renungan Sabat · 5 menit baca",
        image: IMAGES.nature.src,
        description: "Sabat bukan sekadar berhenti bekerja — ia adalah undangan untuk pulang.",
    },
    {
        id: "foto-sabat-juli",
        type: "Foto",
        title: "Galeri: Sabat Kedua Juli",
        meta: "24 foto · Ibadah & persekutuan",
        image: IMAGES.hero.src,
        description: "Dokumentasi ibadah, Sekolah Sabat, dan makan bersama jemaat.",
    },
    {
        id: "video-profil-pelayanan",
        type: "Video",
        title: "Profil Pelayanan Jemaat Rinegetan",
        meta: "Video · 4 menit",
        image: IMAGES.fellowship.src,
        description: "Cuplikan kehidupan jemaat: ibadah, pelayanan anak, dan bakti sosial.",
    },
    {
        id: "materi-ss-triwulan-3",
        type: "Materi",
        title: "Pelajaran Sekolah Sabat Triwulan III 2026",
        meta: "PDF · 13 pelajaran",
        image: IMAGES.bibleStudy.src,
        description: "Unduh panduan pendalaman Alkitab dewasa untuk triwulan berjalan.",
    },
];

export const MINISTRY_CARDS = [
    {
        id: "pelajari-alkitab",
        title: "Pelajari Alkitab",
        description:
            "Belajar Alkitab secara pribadi atau kelompok kecil, daring maupun tatap muka — gratis dan terbuka untuk semua.",
        icon: "book-open",
        phase: "Fase 3",
    },
    {
        id: "permohonan-doa",
        title: "Permohonan Doa",
        description:
            "Kirimkan pokok doa Anda — tim pendoa jemaat akan mendoakannya dalam kebaktian doa mingguan.",
        icon: "hands-praying",
        phase: "Fase 3",
    },
    {
        id: "pertama-kali-berkunjung",
        title: "Pertama Kali Berkunjung?",
        description:
            "Panduan ramah untuk kunjungan pertama: apa yang diharapkan, apa yang dikenakan, dan siapa yang akan menyambut Anda.",
        icon: "door-open",
        phase: "Fase 3",
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
