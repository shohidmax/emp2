import { Logo } from '@/components/logo';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/40 p-4">
      <div className="mb-8">
        <Logo />
      </div>
      {children}
    </div>
  );
}
