import {
  router,
  trpcError,
  protectedProcedure,
  publicProcedure,
} from "../../trpc/core";
import { z } from "zod";
import { schema, db } from "../../db/client";
import { eq } from "drizzle-orm";
import { checkIsAdmin } from "../auth/model";
import { proratedUpgradePriceCalculation } from "./model";

export const plans = router({
  getOne: publicProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .query(async ({ input }) => {
      const { id } = input;
      const plan = await db.query.plans.findFirst({
        where: eq(schema.plans.id, id),
      });

      if (!plan) {
        throw new trpcError({
          code: "NOT_FOUND",
          message: "plan not found",
        });
      }
      return plan;
    }),
  get: publicProcedure.query(async ({}) => {
    try {
      const plans = await db.query.plans.findMany({});
      return plans;
    } catch (error) {
      console.error("Error fetching plans", error);
      return [];
    }
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        price: z.number(),
        createdAt: z.date(),
      })
    )
    .mutation(async ({ ctx: { user }, input }) => {
      const { userId } = user;
      const isAdmin = await checkIsAdmin({ userId });

      if (isAdmin) {
        try {
          const plan = await db
            .insert(schema.plans)
            .values({
              ...input,
            })
            .returning();
          if (!plan) {
            throw new trpcError({
              code: "INTERNAL_SERVER_ERROR",
            });
          }
          return {
            success: true,
          };
        } catch (error) {
          console.error(error);
          throw new trpcError({
            code: "INTERNAL_SERVER_ERROR",
          });
        }
      } else {
        throw new trpcError({
          code: "UNAUTHORIZED",
        });
      }
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        newName: z.string().optional(),
        newPrice: z.number().optional(),
        updatedAt: z.date(),
      })
    )
    .mutation(async ({ ctx: { user }, input }) => {
      const { userId } = user;
      const { id, newName, newPrice, updatedAt } = input;
      if (await checkIsAdmin({ userId })) {
        await db
          .update(schema.plans)
          .set({ id, name: newName, price: newPrice, updatedAt: updatedAt })
          .where(eq(schema.plans.id, input.id));
        return {
          success: true,
        };
      } else {
        throw new trpcError({
          code: "UNAUTHORIZED",
        });
      }
    }),
  upgrade: protectedProcedure
    .input(
      z.object({
        currentPlanId: z.number(),
        newPlanId: z.number(),
        upgradeDate: z.date(),
      })
    )
    .mutation(async ({ input }) => {
      const { currentPlanId, newPlanId, upgradeDate } = input;
      try {
        return proratedUpgradePriceCalculation({
          currentPlanId,
          newPlanId,
          upgradeDate,
        });
      } catch {
        throw new trpcError({ code: "BAD_REQUEST" });
      }
    }),
});
