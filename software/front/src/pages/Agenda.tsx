import { useState, useEffect, useCallback } from "react";
import { Clock, Plus, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { API_BASE_URL } from "@/lib/api";
import "./Agenda.css";

/** Tipos de resposta da API */
interface FeedingSchedule {
  id: number;
  time: string;
  amountGrams: number;
  petTarget: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/** Formata o label do pet alvo para exibição */
const formatPetTarget = (target: string): string =>
  target === "all" ? "Todos os Pets" : target;

export function Agenda() {
  const [schedules, setSchedules] = useState<FeedingSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Campos do modal
  const [formTime, setFormTime] = useState("");
  const [formAmount, setFormAmount] = useState<number | "">("");
  const [formPetTarget, setFormPetTarget] = useState("all");
  const [isSaving, setIsSaving] = useState(false);

  // Alimentação manual
  const [manualGrams, setManualGrams] = useState(20);
  const [isFeeding, setIsFeeding] = useState(false);

  /** Busca agendamentos da API */
  const fetchSchedules = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/schedules`);
      const result: ApiResponse<FeedingSchedule[]> = await response.json();
      if (result.success && result.data) {
        setSchedules(result.data);
      }
    } catch (error) {
      console.error("Erro ao buscar agendamentos:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  /** Cria ou atualiza um agendamento */
  const handleSave = async (): Promise<void> => {
    setIsSaving(true);
    try {
      const url = editingId
        ? `${API_BASE_URL}/api/schedules/${editingId}`
        : `${API_BASE_URL}/api/schedules`;

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          time: formTime,
          amountGrams: Number(formAmount),
          petTarget: formPetTarget,
        }),
      });

      const result: ApiResponse<FeedingSchedule> = await response.json();
      if (result.success) {
        toast.success(editingId ? "Horário atualizado com sucesso!" : "Horário agendado com sucesso!");
        await fetchSchedules();
        closeModal();
      } else {
        toast.error(result.error || "Erro ao salvar horário.");
      }
    } catch (error) {
      console.error("Erro ao salvar agendamento:", error);
      toast.error("Falha ao comunicar com o servidor.");
    } finally {
      setIsSaving(false);
    }
  };

  /** Alterna enabled/disabled de um agendamento */
  const handleToggle = async (id: number): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/schedules/${id}/toggle`, {
        method: "PATCH",
      });

      const result: ApiResponse<FeedingSchedule> = await response.json();
      if (result.success) {
        setSchedules((prev) =>
          prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
        );
        toast.success(result.data?.enabled ? "Horário ativado!" : "Horário desativado!");
      } else {
        toast.error("Erro ao alternar horário.");
      }
    } catch (error) {
      console.error("Erro ao alternar agendamento:", error);
      toast.error("Erro ao comunicar com o servidor.");
    }
  };

  /** Remove um agendamento */
  const handleDelete = async (id: number): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/schedules/${id}`, {
        method: "DELETE",
      });

      const result: ApiResponse<undefined> = await response.json();
      if (result.success) {
        setSchedules((prev) => prev.filter((s) => s.id !== id));
        toast.success("Horário removido com sucesso!");
      } else {
        toast.error("Erro ao remover horário.");
      }
    } catch (error) {
      console.error("Erro ao remover agendamento:", error);
      toast.error("Erro ao comunicar com o servidor.");
    }
  };

  /** Alimentação manual imediata */
  const handleFeedNow = async (): Promise<void> => {
    setIsFeeding(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/feed-now`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountGrams: manualGrams }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(`Alimentação manual enviada (${manualGrams}g)`);
      } else {
        toast.error(result.error || "Erro ao alimentar.");
      }
    } catch (error) {
      console.error("Erro na alimentação manual:", error);
      toast.error("Erro ao comunicar com a máquina.");
    } finally {
      setIsFeeding(false);
    }
  };

  const openModal = (schedule?: FeedingSchedule) => {
    if (schedule) {
      setEditingId(schedule.id);
      setFormTime(schedule.time);
      setFormAmount(schedule.amountGrams);
      setFormPetTarget(schedule.petTarget);
    } else {
      setEditingId(null);
      setFormTime("12:00");
      setFormAmount(40);
      setFormPetTarget("all");
    }
    setIsModalOpen(true);
  };

  /** Reseta e fecha o modal */
  const closeModal = (): void => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  return (
    <div>
      {/* Cabeçalho */}
      <div className="agenda-header">
        <div className="agenda-header-text">
          <h1>Cronograma de Alimentação</h1>
          <p>Configure horários e porções de alimentação automatizada.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => openModal()}
          id="btn-add-schedule"
          className="gap-2"
        >
          <Plus size={18} />
          Adicionar Horário
        </Button>
      </div>

      {/* Rotina Diária */}
      <section className="daily-routine">
        <h2 className="daily-routine-title">Rotina Diária</h2>
        <p className="daily-routine-desc">
          Seu alimentador irá liberar ração automaticamente nestes horários.
        </p>

        <div className="schedule-list">
          {isLoading ? (
            <p className="schedule-list-empty">Carregando agendamentos...</p>
          ) : schedules.length === 0 ? (
            <p className="schedule-list-empty">
              Nenhum horário agendado. Clique em &quot;Adicionar Horário&quot; para começar.
            </p>
          ) : (
            schedules.map((schedule) => (
              <div key={schedule.id} className="schedule-card">
                <div className="schedule-card-left">
                  <div className="schedule-icon">
                    <Clock size={20} />
                  </div>
                  <div>
                    <div className="schedule-info-time">{schedule.time}</div>
                    <div className="schedule-info-detail">
                      {schedule.amountGrams}g • {formatPetTarget(schedule.petTarget)}
                    </div>
                  </div>
                </div>

                <div className="schedule-card-right">
                  <Switch
                    checked={schedule.enabled}
                    onCheckedChange={() => handleToggle(schedule.id)}
                    aria-label={`Toggle ${schedule.time}`}
                    id={`toggle-schedule-${schedule.id}`}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => openModal(schedule)}
                      title="Editar horário"
                    >
                      <Edit2 size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(schedule.id)}
                      title="Remover horário"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Alimentação Manual */}
      <section className="manual-feed">
        <div className="manual-feed-text">
          <h3>Alimentação Manual</h3>
          <p>Libere ração imediatamente fora do cronograma.</p>
        </div>
        <div className="manual-feed-controls">
          <Input
            type="number"
            className="manual-feed-input w-20 text-center"
            value={manualGrams}
            min={1}
            max={500}
            onChange={(e) => setManualGrams(Number(e.target.value))}
            id="input-manual-grams"
          />
          <span className="manual-feed-unit">gramas</span>
          <Button
            onClick={handleFeedNow}
            disabled={isFeeding || manualGrams < 1}
            id="btn-feed-now"
          >
            {isFeeding ? "Enviando..." : "Liberar Agora"}
          </Button>
        </div>
      </section>

      {/* Modal — Adicionar Horário (shadcn Dialog) */}
      <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent className="sm:max-w-[440px] bg-[#1a1a24] border-border p-4 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              {editingId ? "Editar Horário" : "Adicionar Horário de Alimentação"}
            </DialogTitle>
            <DialogDescription>
              Configure um novo evento de alimentação automatizada.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="input-time" className="text-left text-muted-foreground">
                Horário
              </Label>
              <Input
                type="time"
                id="input-time"
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="input-amount" className="text-left text-muted-foreground">
                Quantidade (gramas)
              </Label>
              <Input
                type="number"
                id="input-amount"
                value={formAmount}
                min={1}
                max={500}
                onChange={(e) => setFormAmount(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="select-pet" className="text-left text-muted-foreground">
                Pet Alvo
              </Label>
              <Select value={formPetTarget} onValueChange={setFormPetTarget}>
                <SelectTrigger id="select-pet" className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Mingau">Mingau</SelectItem>
                  <SelectItem value="Luna">Luna</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeModal} id="btn-modal-cancel">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving} id="btn-modal-save">
              {isSaving ? "Salvando..." : "Salvar Horário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
