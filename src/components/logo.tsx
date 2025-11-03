import Link from 'next/link';
import Image from 'next/image';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="EMS homepage">
       <Image src="/logo.png" alt="Max iT Solution Logo" width={32} height={32} className="h-8 w-auto" />
      <span className="text-2xl font-bold tracking-tight text-foreground">EMS</span>
    </Link>
  );
}
