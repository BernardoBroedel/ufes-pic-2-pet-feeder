import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Camera } from "lucide-react";
import { toast } from "sonner";
import { API_BASE_URL } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import "./MeusPets.css";

interface Pet {
  id: number;
  name: string;
  ageText: string;
  weightKg: number;
  dailyGoalKcal: number;
  avatarBase64: string | null;
  aiStatus: string;
}

export function MeusPets() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [formName, setFormName] = useState("");
  const [formAgeText, setFormAgeText] = useState("");
  const [formWeight, setFormWeight] = useState<number>(0);
  const [formKcal, setFormKcal] = useState<number>(0);
  const [formAiStatus, setFormAiStatus] = useState("Sem fotos");
  const [formAvatar, setFormAvatar] = useState<string | null>(null);

  useEffect(() => {
    fetchPets();
  }, []);

  const fetchPets = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/pets`);
      const result = await response.json();
      if (result.success) {
        setPets(result.data);
      }
    } catch (error) {
      console.error("Erro ao buscar pets:", error);
      toast.error("Erro ao carregar lista de pets.");
    }
  };

  const openModal = (pet?: Pet) => {
    if (pet) {
      setEditingId(pet.id);
      setFormName(pet.name);
      setFormAgeText(pet.ageText || "");
      setFormWeight(pet.weightKg || 0);
      setFormKcal(pet.dailyGoalKcal || 0);
      setFormAiStatus(pet.aiStatus || "Sem fotos");
      setFormAvatar(pet.avatarBase64 || null);
    } else {
      setEditingId(null);
      setFormName("");
      setFormAgeText("");
      setFormWeight(0);
      setFormKcal(0);
      setFormAiStatus("Sem fotos");
      setFormAvatar(null);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB limite
      toast.error("A imagem deve ser menor que 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("O nome do pet é obrigatório.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: formName,
        ageText: formAgeText,
        weightKg: formWeight,
        dailyGoalKcal: formKcal,
        avatarBase64: formAvatar,
        aiStatus: formAiStatus,
      };

      const url = editingId 
        ? `${API_BASE_URL}/api/pets/${editingId}`
        : `${API_BASE_URL}/api/pets`;
      
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(editingId ? "Pet atualizado!" : "Pet adicionado com sucesso!");
        await fetchPets();
        closeModal();
      } else {
        toast.error(result.error || "Erro ao salvar.");
      }
    } catch (error) {
      console.error("Erro ao salvar pet:", error);
      toast.error("Erro de conexão.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja remover este pet?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/pets/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (result.success) {
        toast.success("Pet removido!");
        setPets(prev => prev.filter(p => p.id !== id));
      } else {
        toast.error(result.error || "Erro ao excluir.");
      }
    } catch (error) {
      console.error("Erro ao excluir pet:", error);
      toast.error("Erro de conexão.");
    }
  };

  const handleManagePhotos = () => {
    toast.info("A funcionalidade de upload em massa para a IA será implementada em breve!", {
      duration: 4000,
    });
  };

  return (
    <div>
      <div className="pets-header">
        <div className="pets-header-text">
          <h1>Meus Pets</h1>
          <p>Gerencie seus pets e seus perfis de reconhecimento por IA.</p>
        </div>
        <button className="btn-add-pet" onClick={() => openModal()}>
          <Plus size={18} /> Adicionar Pet
        </button>
      </div>

      <div className="pets-grid">
        {pets.length === 0 ? (
          <div className="pets-empty">Nenhum pet cadastrado. Clique em "Adicionar Pet" para começar.</div>
        ) : (
          pets.map((pet) => (
            <div key={pet.id} className="pet-card">
              <div className="pet-card-cover">
                <div className="pet-card-actions">
                  <button className="btn-icon-bg" onClick={() => openModal(pet)}>
                    <Edit2 size={16} />
                  </button>
                  <button className="btn-icon-bg delete" onClick={() => handleDelete(pet.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="pet-card-body">
                <div className="pet-avatar-wrapper">
                  {pet.avatarBase64 ? (
                    <img src={pet.avatarBase64} alt={pet.name} className="pet-avatar" />
                  ) : (
                    <div className="pet-avatar-placeholder">{pet.name.charAt(0).toUpperCase()}</div>
                  )}
                </div>
                
                <h2 className="pet-name">{pet.name}</h2>
                <div className="pet-info-text">
                  {pet.ageText ? `${pet.ageText} • ` : ""}
                  {pet.weightKg ? `${pet.weightKg} kg` : "Peso não informado"}
                </div>

                <div className="pet-stats-grid">
                  <div className="pet-stat-box">
                    <span className="pet-stat-label">Meta Diária</span>
                    <span className="pet-stat-value">{pet.dailyGoalKcal} kcal</span>
                  </div>
                  <div className="pet-stat-box">
                    <span className="pet-stat-label">Status da IA</span>
                    <span className={`pet-stat-value ${pet.aiStatus.toLowerCase().includes("treinado") ? "success" : ""}`}>
                      {pet.aiStatus}
                    </span>
                  </div>
                </div>
              </div>
              <div className="pet-card-footer">
                <button className="btn-manage-photos" onClick={handleManagePhotos}>
                  <Camera size={16} /> Gerenciar Fotos
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent className="sm:max-w-[480px] bg-[#1a1a24] border-border">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Pet" : "Adicionar Pet"}</DialogTitle>
            <DialogDescription>
              Preencha os detalhes do pet para o monitoramento nutricional.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="avatar-upload-container mb-2">
              {formAvatar ? (
                <img src={formAvatar} alt="Preview" className="avatar-preview" />
              ) : (
                <div className="avatar-preview flex items-center justify-center text-muted-foreground">
                  <Camera size={24} />
                </div>
              )}
              <div className="flex flex-col gap-1">
                <div className="avatar-upload-btn">
                  <Button variant="outline" size="sm" type="button">Mudar Foto</Button>
                  <input type="file" accept="image/*" onChange={handleImageUpload} />
                </div>
                <span className="text-xs text-muted-foreground">Formato JPG, PNG. Máx 2MB.</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="pet-name" className="text-left text-muted-foreground">Nome do Pet</Label>
              <Input
                id="pet-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Mingau"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="pet-age" className="text-left text-muted-foreground">Idade</Label>
                <Input
                  id="pet-age"
                  value={formAgeText}
                  onChange={(e) => setFormAgeText(e.target.value)}
                  placeholder="Ex: 3 anos"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="pet-weight" className="text-left text-muted-foreground">Peso (kg)</Label>
                <Input
                  id="pet-weight"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formWeight}
                  onChange={(e) => setFormWeight(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="pet-kcal" className="text-left text-muted-foreground">Meta Diária (kcal)</Label>
                <Input
                  id="pet-kcal"
                  type="number"
                  min="0"
                  value={formKcal}
                  onChange={(e) => setFormKcal(Number(e.target.value))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="pet-ai" className="text-left text-muted-foreground">Status IA</Label>
                <Input
                  id="pet-ai"
                  value={formAiStatus}
                  onChange={(e) => setFormAiStatus(e.target.value)}
                  placeholder="Ex: Treinado (150 fotos)"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeModal}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar Pet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
