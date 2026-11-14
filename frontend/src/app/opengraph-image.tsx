import { ImageResponse } from "next/og";

// Brand tokens mirrored from tailwind.config.ts so the card matches the site.
const NAVY = "#0A2540";
const NAVY_500 = "#1B4468";
const SABBATH = "#E5A93C";
const SABBATH_100 = "#FBF0DA";

export const alt =
  "GMAHK Rinegetan — Tempat Bertumbuh dalam Iman, Melayani, dan Bersama";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: NAVY,
          padding: "72px 80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 12,
              height: 56,
              backgroundColor: SABBATH,
              borderRadius: 6,
            }}
          />
          <div
            style={{
              fontSize: 30,
              color: SABBATH_100,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            Gereja Masehi Advent Hari Ketujuh
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 96,
              fontWeight: 700,
              color: "#FFFFFF",
              lineHeight: 1.05,
            }}
          >
            GMAHK Rinegetan
          </div>
          <div
            style={{
              fontSize: 42,
              color: SABBATH,
              lineHeight: 1.25,
            }}
          >
            Tempat Bertumbuh dalam Iman, Melayani, dan Bersama
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: `2px solid ${NAVY_500}`,
            paddingTop: 28,
            fontSize: 28,
            color: "#B9CFE5",
          }}
        >
          <div>Minahasa, Sulawesi Utara</div>
          <div>www.gmahkrinegetan.web.id</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
