import { ImageResponse } from "next/og";

// Icône plein cadre : le motif reste dans la zone sûre (80 %) pour les masques Android.
export function renderAppIcon(size: number) {
  const unit = size / 100;
  const plate = (height: number, width: number) => ({
    width: width * unit,
    height: height * unit,
    borderRadius: 4 * unit,
    background: "#ecfdf5",
    display: "flex",
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #059669 0%, #0f172a 85%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={plate(26, 7)} />
          <div style={{ ...plate(38, 9), marginLeft: 2 * unit }} />
          <div
            style={{
              width: 22 * unit,
              height: 6 * unit,
              background: "#a7f3d0",
              display: "flex",
              marginLeft: 2 * unit,
              marginRight: 2 * unit,
            }}
          />
          <div style={{ ...plate(38, 9), marginRight: 2 * unit }} />
          <div style={plate(26, 7)} />
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
