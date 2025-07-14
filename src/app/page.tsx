import MdxEditor from "@/components/mdx-editor";

export default function HomePage() {
  return (
    <main
      className="bg-neutral-900 text-white h-screen"
      style={{ padding: 24 }}
    >
      <h2 className="text-2xl font-bold text-white mb-4">
        MDX Editor (Monaco + Vim Toggle)
      </h2>
      <MdxEditor />
    </main>
  );
}
