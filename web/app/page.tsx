export default async function Home() {
  const res = await fetch("http://localhost:3001/health", { cache: "no-store" });
  const data = await res.json();

  return (
    <main style={{ padding: 24 }}>
      <h1>CampusMaster</h1>
      <p>API Status: {data.status}</p>
    </main>
  );
}
