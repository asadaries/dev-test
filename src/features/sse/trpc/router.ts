import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/lib/trpc";
import { SSEService } from "../services/sse-service";

export const sseRouter = createTRPCRouter({
  sendToClient: protectedProcedure
    .input(
      z.object({
        clientId: z.string().uuid(),
        event: z.string(),
        data: z.unknown(),
      })
    )
    .mutation(async ({ input }) => {
      const sseService = SSEService.getInstance();
      const sent = sseService.sendToClient(input.clientId, {
        event: input.event,
        data: input.data,
      });
      
      return { success: sent };
    }),

  sendToUser: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        event: z.string(),
        data: z.unknown(),
      })
    )
    .mutation(async ({ input }) => {
      const sseService = SSEService.getInstance();
      const sentCount = sseService.sendToUser(input.userId, {
        event: input.event,
        data: input.data,
      });
      
      return { success: sentCount > 0, sentCount };
    }),

  broadcast: protectedProcedure
    .input(
      z.object({
        event: z.string(),
        data: z.unknown(),
        excludeClientId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const sseService = SSEService.getInstance();
      const sentCount = sseService.broadcast(
        {
          event: input.event,
          data: input.data,
        },
        input.excludeClientId
      );
      
      return { success: sentCount > 0, sentCount };
    }),

  getActiveClients: protectedProcedure
    .query(async () => {
      const sseService = SSEService.getInstance();
      return {
        clients: sseService.getActiveClients(),
      };
    }),

  getClientsByUser: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const sseService = SSEService.getInstance();
      return {
        clients: sseService.getClientsByUser(input.userId),
      };
    }),
});