import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getWeekStart } from "@/lib/utils";
import { MenusResponse, DailyMenu } from "@/types/database";

export async function GET(request: NextRequest) {
  try {
    const restaurantIds = request.nextUrl.searchParams.get("ids");

    if (!restaurantIds) {
      return NextResponse.json(
        { success: false, error: "Restaurant IDs are required" },
        { status: 400 }
      );
    }

    const ids = restaurantIds.split(",");
    const weekStart = getWeekStart();

    // Fetch menus for the specified restaurants and current week
    const { data: menus, error } = await supabase
      .from("daily_menus")
      .select(
        `
        id,
        restaurant_id,
        week_start,
        data,
        created_at,
        restaurants (
          id,
          domain,
          full_url,
          name,
          created_at
        )
      `
      )
      .in("restaurant_id", ids)
      .eq("week_start", weekStart);

    if (error) {
      throw error;
    }

    const response: MenusResponse = {
      success: true,
      menus: (menus as any) as DailyMenu[],
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching menus:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
