import { NextResponse } from 'next/server';

// Mazání je zakázané přes web – provádějte přímo v Supabase.
export async function DELETE() {
  return NextResponse.json(
    { error: 'Mazání je vypnuté. Proveďte smazání přímo v Supabase.' },
    { status: 405 }
  );
}
