import WorkGrid from "@/components/WorkGrid";

export default function Home() {
  return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Nail Visual — портфолио и референсы</h1>
        <p className="text-muted-foreground">Залей работу или найди мастера по стилю</p>
        <WorkGrid />
      </section>
  );
}
