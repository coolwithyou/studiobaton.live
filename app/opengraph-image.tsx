import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "studiobaton - 개발 이야기";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  const pretendardBold = await readFile(
    join(process.cwd(), "assets/fonts/Pretendard-Bold.otf")
  );

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0a0a",
          backgroundImage:
            "radial-gradient(circle at 25px 25px, #1a1a1a 2%, transparent 0%), radial-gradient(circle at 75px 75px, #1a1a1a 2%, transparent 0%)",
          backgroundSize: "100px 100px",
          fontFamily: "Pretendard",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: "#ffffff",
              marginBottom: 16,
              letterSpacing: "-0.02em",
            }}
          >
            studiobaton
          </div>
          <div
            style={{
              fontSize: 32,
              color: "#a1a1aa",
              marginBottom: 40,
            }}
          >
            개발 이야기
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "#22c55e",
              }}
            />
            <div
              style={{
                fontSize: 20,
                color: "#71717a",
              }}
            >
              매일 자동으로 생성되는 개발 블로그
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Pretendard",
          data: pretendardBold,
          style: "normal",
          weight: 700,
        },
      ],
    }
  );
}
