import { Router } from "express";
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { pets } from "../db/schema.js";

export const petsRouter = Router();

/**
 * Retorna todos os pets cadastrados
 */
petsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const allPets = await db.select().from(pets).orderBy(pets.id);
    res.json({ success: true, data: allPets });
  } catch (error) {
    console.error("Erro ao buscar pets:", error);
    res.status(500).json({ success: false, error: "Erro interno do servidor" });
  }
});

/**
 * Cria um novo pet
 */
petsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { name, ageText, weightKg, dailyGoalKcal, avatarBase64, aiStatus } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: "Nome é obrigatório" });
    }

    const [newPet] = await db
      .insert(pets)
      .values({
        name,
        ageText,
        weightKg,
        dailyGoalKcal,
        avatarBase64,
        aiStatus: aiStatus || "Sem fotos",
      })
      .returning();

    res.json({ success: true, data: newPet });
  } catch (error) {
    console.error("Erro ao criar pet:", error);
    res.status(500).json({ success: false, error: "Erro interno do servidor" });
  }
});

/**
 * Atualiza um pet existente
 */
petsRouter.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: "ID inválido" });
    }

    const { name, ageText, weightKg, dailyGoalKcal, avatarBase64, aiStatus } = req.body;

    const [updatedPet] = await db
      .update(pets)
      .set({
        name,
        ageText,
        weightKg,
        dailyGoalKcal,
        avatarBase64,
        aiStatus,
        updatedAt: new Date(),
      })
      .where(eq(pets.id, id))
      .returning();

    if (!updatedPet) {
      return res.status(404).json({ success: false, error: "Pet não encontrado" });
    }

    res.json({ success: true, data: updatedPet });
  } catch (error) {
    console.error("Erro ao atualizar pet:", error);
    res.status(500).json({ success: false, error: "Erro interno do servidor" });
  }
});

/**
 * Deleta um pet
 */
petsRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, error: "ID inválido" });
    }

    const [deletedPet] = await db
      .delete(pets)
      .where(eq(pets.id, id))
      .returning();

    if (!deletedPet) {
      return res.status(404).json({ success: false, error: "Pet não encontrado" });
    }

    res.json({ success: true, data: deletedPet });
  } catch (error) {
    console.error("Erro ao deletar pet:", error);
    res.status(500).json({ success: false, error: "Erro interno do servidor" });
  }
});
