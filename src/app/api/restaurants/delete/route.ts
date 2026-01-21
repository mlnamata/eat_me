import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function DELETE(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Chybí ID restaurace' }, { status: 400 });
    }

    console.log(`🗑️ Mazání restaurace ID: ${id}`);

    // 1. Nejdřív smažeme všechna menu této restaurace
    const { error: menuError } = await supabaseAdmin
      .from('daily_menus')
      .delete()
      .eq('restaurant_id', id);

    if (menuError) {
      console.error('Chyba při mazání menu:', menuError);
      throw menuError;
    }

    // 2. Teď smažeme samotnou restauraci
    const { error: restError } = await supabaseAdmin
      .from('restaurants')
      .delete()
      .eq('id', id);

    if (restError) {
      console.error('Chyba při mazání restaurace:', restError);
      throw restError;
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
