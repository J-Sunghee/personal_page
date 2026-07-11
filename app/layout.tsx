import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://j-sunghee.github.io/personal_page/"),
  title: "Sung-Hee Jin, Ph.D. | AI & Learning Analytics",
  description: "진성희 교수의 AI 교육, 학습분석, 교수설계 연구 아카이브와 특강·워크숍 안내",
  openGraph: {
    title: "Sung-Hee Jin, Ph.D.",
    description: "Designing the Future of Learning with AI & Data",
    images: [{ url: "https://j-sunghee.github.io/personal_page/og.png", width: 1536, height: 1024, alt: "Sung-Hee Jin research portfolio" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
