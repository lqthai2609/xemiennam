import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-bold tracking-tight">Xe Miền Nam</h1>
      <p className="text-muted-foreground max-w-md">
        Trang test khởi tạo dự án — Next.js App Router + TypeScript + Tailwind
        CSS + shadcn/ui. Nội dung thật sẽ được thêm ở các ngày tiếp theo.
      </p>
      <Button>Nút test shadcn/ui</Button>
    </main>
  );
}
