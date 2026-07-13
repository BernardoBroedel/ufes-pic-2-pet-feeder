import { Router } from "express";
import type { Request, Response } from "express";
import { eq, not } from "drizzle-orm";
import { db } from "../db/connection.js";
import { feedingSchedules } from "../db/schema.js";
import { sendToEsp32, getWsEspConnected } from "../ws/ws-server.js";

export const scheduleRouter = Router();

/**
 * GET /api/schedules
 * Retorna todos os agendamentos ordenados por horário.
 */
scheduleRouter.get("/schedules", async (_req: Request, res: Response): Promise<void> => {
  try {
    const schedules = await db
      .select()
      .from(feedingSchedules)
      .orderBy(feedingSchedules.time);

    res.json({ success: true, data: schedules });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[Schedules] Erro ao listar:", message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/schedules
 * Cria um novo agendamento de alimentação.
 * Body esperado: { time: "HH:mm", amountGrams: number, petTarget?: string }
 */
scheduleRouter.post("/schedules", async (req: Request, res: Response): Promise<void> => {
  const { time, amountGrams, petTarget } = req.body as {
    time?: string;
    amountGrams?: number;
    petTarget?: string;
  };

  if (!time || amountGrams === undefined) {
    res.status(400).json({ success: false, error: "Campos 'time' e 'amountGrams' são obrigatórios." });
    return;
  }

  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!timeRegex.test(time)) {
    res.status(400).json({ success: false, error: "Formato de horário inválido. Use HH:mm." });
    return;
  }

  if (typeof amountGrams !== "number" || amountGrams < 1 || amountGrams > 500) {
    res.status(400).json({ success: false, error: "Quantidade deve ser um número entre 1 e 500 gramas." });
    return;
  }

  try {
    const [created] = await db
      .insert(feedingSchedules)
      .values({
        time,
        amountGrams,
        petTarget: petTarget ?? "all",
      })
      .returning();

    res.status(201).json({ success: true, data: created });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[Schedules] Erro ao criar:", message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * PUT /api/schedules/:id
 * Atualiza um agendamento existente.
 */
scheduleRouter.put("/schedules/:id", async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    res.status(400).json({ success: false, error: "ID inválido." });
    return;
  }

  const { time, amountGrams, petTarget } = req.body as {
    time?: string;
    amountGrams?: number;
    petTarget?: string;
  };

  if (!time || amountGrams === undefined) {
    res.status(400).json({ success: false, error: "Campos 'time' e 'amountGrams' são obrigatórios." });
    return;
  }

  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!timeRegex.test(time)) {
    res.status(400).json({ success: false, error: "Formato de horário inválido. Use HH:mm." });
    return;
  }

  if (typeof amountGrams !== "number" || amountGrams < 1 || amountGrams > 500) {
    res.status(400).json({ success: false, error: "Quantidade deve ser um número entre 1 e 500 gramas." });
    return;
  }

  try {
    const [updated] = await db
      .update(feedingSchedules)
      .set({
        time,
        amountGrams,
        petTarget: petTarget ?? "all",
        updatedAt: new Date(),
      })
      .where(eq(feedingSchedules.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ success: false, error: "Agendamento não encontrado." });
      return;
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[Schedules] Erro ao atualizar:", message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * PATCH /api/schedules/:id/toggle
 * Alterna o campo `enabled` de um agendamento.
 */
scheduleRouter.patch("/schedules/:id/toggle", async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    res.status(400).json({ success: false, error: "ID inválido." });
    return;
  }

  try {
    const [updated] = await db
      .update(feedingSchedules)
      .set({
        enabled: not(feedingSchedules.enabled),
        updatedAt: new Date(),
      })
      .where(eq(feedingSchedules.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ success: false, error: "Agendamento não encontrado." });
      return;
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[Schedules] Erro ao alternar:", message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * DELETE /api/schedules/:id
 * Remove um agendamento.
 */
scheduleRouter.delete("/schedules/:id", async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    res.status(400).json({ success: false, error: "ID inválido." });
    return;
  }

  try {
    const [deleted] = await db
      .delete(feedingSchedules)
      .where(eq(feedingSchedules.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ success: false, error: "Agendamento não encontrado." });
      return;
    }

    res.json({ success: true, message: "Agendamento removido." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[Schedules] Erro ao remover:", message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/feed-now
 * Alimentação manual imediata — envia comando MQTT para a ESP32.
 * Body esperado: { amountGrams: number }
 */
scheduleRouter.post("/feed-now", async (req: Request, res: Response): Promise<void> => {
  const { amountGrams } = req.body as { amountGrams?: number };

  if (!amountGrams || typeof amountGrams !== "number" || amountGrams < 1) {
    res.status(400).json({ success: false, error: "Campo 'amountGrams' deve ser um número positivo." });
    return;
  }

  if (!getWsEspConnected()) {
    res.status(503).json({ success: false, error: "ESP32 não está conectado." });
    return;
  }

  sendToEsp32({
    acao: "alimentar_manual",
    gramas: amountGrams,
    timestamp: Date.now(),
  });

  console.log(`[Feed-Now] Alimentação manual: ${amountGrams}g`);
  res.json({ success: true, message: `Alimentação manual de ${amountGrams}g enviada.` });
});
