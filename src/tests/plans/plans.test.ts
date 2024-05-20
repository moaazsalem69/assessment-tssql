/* eslint-disable prettier/prettier */
import { beforeAll, describe, expect, it } from "vitest";
import { db, schema } from "../../db/client";
import { createAuthenticatedCaller, createCaller } from "../helpers/utils";
import { eq } from "drizzle-orm";
import { trpcError } from "../../trpc/core";
import resetDb from "../helpers/resetDb";

describe("plans routes", async () => {
  beforeAll(async () => {
    await resetDb();
  });
  const testTime = new Date();
  const plan = {
    id: 1,
    name: "test Plan Name",
    price: 123,
    createdAt: testTime,
  };
      const id = plan.id;

  const adminUser = {
    email: "adminmail@mail.com",
    password: "P@ssw0rd",
    name: "adminTest",
    timezone: "Asia/Riyadh",
    locale: "en",
    emailVerified: true,
    isAdmin: true,
  };
  const user = {
    email: "usermail@mail.com",
    password: "P@ssw0rd",
    name: "test",
    timezone: "Asia/Riyadh",
    locale: "en",
    emailVerified: true,
  };
  describe("create Plan by admin", async () => {
    it("should return  true", async () => {
      await createCaller({}).auth.register(adminUser);
      const userInDb = await db.query.users.findFirst({
        where: eq(schema.users.email, adminUser.email),
      });
      await db
        .update(schema.users)
        .set({ isAdmin: true })
        .where(eq(schema.users.email, "adminmail@mail.com"));

      const AuthenticatedCaller = await createAuthenticatedCaller({
        userId: userInDb!.id,
      });
      const createdPlan = await AuthenticatedCaller.plans.create(plan);
      expect(createdPlan.success).toBe(true);
      const planInDb = await db.query.plans.findFirst({
        where: eq(schema.plans.name, plan.name),
      });
      expect(planInDb).toBeDefined();
      if (planInDb) {
        expect(planInDb.name).toBe(plan.name);
        expect(planInDb.price).toBe(plan.price);
        expect(planInDb.updatedAt).toBe(null);
      }
    });
  });
  describe("create Plan not admin", async () => {
    it("should not create paln if not Admin", async () => {
      await createCaller({}).auth.register(user);
      const userInDb = await db.query.users.findFirst({
        where: eq(schema.users.email, user.email),
      });

      const AuthenticatedCaller = await createAuthenticatedCaller({
        userId: userInDb!.id,
      });

      await expect(AuthenticatedCaller.plans.create(plan)).rejects.toThrowError(
        new trpcError({
          code: "UNAUTHORIZED",
        })
      );
    });
  });
   describe("get Plan by id", async () => {
     it("should return  plan", async () => {
       const planInDb = await createCaller({}).plans.getOne({id});

       expect(planInDb).toBeDefined();
       if (planInDb) {
         expect(planInDb.name).toBe(plan.name);
         expect(planInDb.price).toBe(plan.price);
         expect(planInDb.updatedAt).toBe(null);
       }
     });
   });
   describe("get all Plans ", async () => {
     it("should return list of plans", async () => {
       const getplans = await createCaller({}).plans.get();
       expect(getplans).toBeDefined();
       if (getplans[0]) {
         expect(getplans[0].name).toBe(plan.name);
         expect(getplans[0].price).toBe(plan.price);
         expect(getplans[0].updatedAt).toBe(null);
       }
     });
   });
  describe("update Plan by admin", async () => {
    it("should return  true", async () => {
      const userInDb = await db.query.users.findFirst({
        where: eq(schema.users.email, adminUser.email),
      });
      await db
        .update(schema.users)
        .set({ isAdmin: true })
        .where(eq(schema.users.email, "adminmail@mail.com"));

      const AuthenticatedCaller = await createAuthenticatedCaller({
        userId: userInDb!.id,
      });
      const planInDb = await createCaller({}).plans.getOne({ id });
      
      const newPrice = 1234;
      const newName = "new test name";
      const updatedPlan = await AuthenticatedCaller.plans.update({
        id: planInDb.id,
        newName: newName,
        newPrice: newPrice,
        updatedAt: testTime,
      });
      expect(updatedPlan.success).toBe(true);
      const updatedplanInDb = await db.query.plans.findFirst({
        where: eq(schema.plans.id, planInDb.id),
      });
      if (updatedplanInDb) {
        expect(updatedplanInDb.name).toBe(newName);
        expect(updatedplanInDb.price).toBe(newPrice);
      }
    });
  });
   describe("update Plan not admin", async () => {
     it("should not update paln if not Admin", async () => {
       const userInDb = await db.query.users.findFirst({
         where: eq(schema.users.email, user.email),
       });

       const AuthenticatedCaller = await createAuthenticatedCaller({
         userId: userInDb!.id,
       });
      const planInDb = await createCaller({}).plans.getOne({ id });
      const newPrice = 1234;
      const newName = "new test name";
       await expect(
         AuthenticatedCaller.plans.update({
           id: planInDb.id,
           newName: newName,
           newPrice: newPrice,
           updatedAt: testTime,
         })
       ).rejects.toThrowError(
         new trpcError({
           code: "UNAUTHORIZED",
         })
       );
     });
   });
});
