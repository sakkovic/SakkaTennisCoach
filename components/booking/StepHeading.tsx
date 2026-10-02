export function StepHeading({ title, text, as: Tag = "h2" }: { title: string; text?: string; as?: "h2" | "legend" }) {
  return (
    <Tag className="block">
      <span className="block text-2xl font-semibold tracking-tight md:text-3xl">{title}</span>
      {text && <span className="mt-1.5 block text-[0.9375rem] font-normal text-muted">{text}</span>}
    </Tag>
  );
}
