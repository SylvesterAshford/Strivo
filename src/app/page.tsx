// Placeholder. The Strivo product lives in the Expo app under `mobile/`.
// This Next.js server only exposes the mobile API at /api/mobile/v1/*.
export default function Home() {
  return (
    <main style={{ padding: "48px 24px", fontFamily: "system-ui, sans-serif", maxWidth: 640 }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 16 }}>Strivo backend</h1>
      <p style={{ color: "#555", lineHeight: 1.6 }}>
        This server hosts the mobile API at <code>/api/mobile/v1/*</code>. Run the Expo
        client from <code>mobile/</code> to use the app.
      </p>
    </main>
  );
}
