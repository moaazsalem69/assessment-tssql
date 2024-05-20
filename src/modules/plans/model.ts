/* eslint-disable @typescript-eslint/no-unused-vars */
import { eq } from "drizzle-orm";
import { db, schema } from "../../db/client";
import { trpcError } from "../../trpc/core";

function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

function getRemainingDaysInMonth(date: Date): number {
  const today = new Date();

  // Check if the provided date is in a future month
  if (
    date.getFullYear() > today.getFullYear() ||
    (date.getFullYear() === today.getFullYear() &&
      date.getMonth() > today.getMonth())
  ) {
    throw new Error("Date cannot be in a future month.");
  }

  // Calculate remaining days based on month end
  const monthEnd = new Date(
    date.getFullYear(),
    date.getMonth(),
    getDaysInMonth(date.getMonth(), date.getFullYear())
  );
  return (monthEnd.getTime() - date.getTime()) / (1000 * 60 * 60 * 24) + 1; // Add 1 to include the current day
}

//   Calculates the prorated upgrade price for switching plans mid-cycle.

//   Args:
//       currentPlanId (number): ID of the current plan.
//       newPlanId (number): ID of the new plan to upgrade to.
//       upgradeDate (date): Date of the upgrade.

//   Returns:
//       number: The prorated upgrade price.

export const proratedUpgradePriceCalculation = async ({
  currentPlanId,
  newPlanId,
  upgradeDate,
}: {
  currentPlanId: number;
  newPlanId: number;
  upgradeDate: Date;
}) => {
  //  Get plan details
  const currentPlan = await db.query.plans.findFirst({
    where: eq(schema.plans.id, currentPlanId),
  });
  const newPlan = await db.query.plans.findFirst({
    where: eq(schema.plans.id, newPlanId),
  });
  //   Check the plans exists
  if (!currentPlan || !newPlan) {
    throw new trpcError({
      code: "BAD_REQUEST",
      message: "current plan or new plan is invalide ",
    });
  }
  //   Check for upgrade scenario (avoid downgrades)
  if (currentPlan?.price >= newPlan?.price) {
    throw new trpcError({
      code: "FORBIDDEN",
      message: "Downgrades are not supported through this method.",
    });
  }

  // Calculate remaining days in current cycle
  const daysInMonth = getDaysInMonth(
    upgradeDate.getMonth(),
    upgradeDate.getFullYear()
  );
  const remainingDays = getRemainingDaysInMonth(upgradeDate);

  // Handle upgrade on the first day (full price)
  if (remainingDays === daysInMonth) {
    return newPlan.price;
  }

  // Calculate base prorated cost based on daily price difference
  const dailyPriceDifference =
    (newPlan.price - currentPlan.price) / daysInMonth;

  // Prorated cost for remaining days
  const baseProratedCost = remainingDays * dailyPriceDifference;

  // Return the prorated cost
  return baseProratedCost;
};
