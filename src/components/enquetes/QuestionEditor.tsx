import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { TypeQuestion, TYPE_QUESTION_LABELS, QuestionOption, MatriceConfig } from "./types";

interface QuestionData {
  id?: string;
  question: string;
  type_question: TypeQuestion;
  options: QuestionOption[] | MatriceConfig | null;
  obligatoire: boolean;
  ordre: number;
  condition_question_id: string | null;
  condition_valeur: string[] | null;
}

interface QuestionEditorProps {
  question: QuestionData;
  index: number;
  allQuestions: QuestionData[];
  onUpdate: (data: QuestionData) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function QuestionEditor({
  question,
  index,
  allQuestions,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown
}: QuestionEditorProps) {
  const [expanded, setExpanded] = useState(true);
  const [options, setOptions] = useState<QuestionOption[]>(
    Array.isArray(question.options) ? question.options : []
  );
  const [matriceConfig, setMatriceConfig] = useState<MatriceConfig>(
    question.type_question === 'matrice' && question.options && !Array.isArray(question.options)
      ? question.options as MatriceConfig
      : { lignes: [''], colonnes: [''] }
  );

  const needsOptions = ['choix_unique', 'choix_multiple'].includes(question.type_question);
  const isMatrice = question.type_question === 'matrice';

  // Questions précédentes pour les conditions
  const previousQuestions = allQuestions.filter(
    (q, i) => i < index && ['choix_unique', 'choix_multiple', 'oui_non'].includes(q.type_question)
  );

  const handleTypeChange = (type: TypeQuestion) => {
    const newData = { ...question, type_question: type };
    
    if (['choix_unique', 'choix_multiple'].includes(type)) {
      const newOptions = options.length > 0 ? options : [{ label: '', value: '' }];
      setOptions(newOptions);
      newData.options = newOptions;
    } else if (type === 'matrice') {
      newData.options = matriceConfig;
    } else {
      newData.options = null;
    }
    
    onUpdate(newData);
  };

  const addOption = () => {
    const newOptions = [...options, { label: '', value: `option_${options.length + 1}` }];
    setOptions(newOptions);
    onUpdate({ ...question, options: newOptions });
  };

  const updateOption = (idx: number, field: 'label' | 'value', value: string) => {
    const newOptions = [...options];
    newOptions[idx] = { ...newOptions[idx], [field]: value };
    if (field === 'label' && !newOptions[idx].value) {
      newOptions[idx].value = value.toLowerCase().replace(/\s+/g, '_');
    }
    setOptions(newOptions);
    onUpdate({ ...question, options: newOptions });
  };

  const removeOption = (idx: number) => {
    const newOptions = options.filter((_, i) => i !== idx);
    setOptions(newOptions);
    onUpdate({ ...question, options: newOptions });
  };

  const updateMatriceLignes = (idx: number, value: string) => {
    const newConfig = { ...matriceConfig };
    newConfig.lignes[idx] = value;
    setMatriceConfig(newConfig);
    onUpdate({ ...question, options: newConfig });
  };

  const updateMatriceColonnes = (idx: number, value: string) => {
    const newConfig = { ...matriceConfig };
    newConfig.colonnes[idx] = value;
    setMatriceConfig(newConfig);
    onUpdate({ ...question, options: newConfig });
  };

  const addMatriceLigne = () => {
    const newConfig = { ...matriceConfig, lignes: [...matriceConfig.lignes, ''] };
    setMatriceConfig(newConfig);
    onUpdate({ ...question, options: newConfig });
  };

  const addMatriceColonne = () => {
    const newConfig = { ...matriceConfig, colonnes: [...matriceConfig.colonnes, ''] };
    setMatriceConfig(newConfig);
    onUpdate({ ...question, options: newConfig });
  };

  return (
    <Card className="relative">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
            <Badge variant="outline">Q{index + 1}</Badge>
            <Badge variant="secondary">{TYPE_QUESTION_LABELS[question.type_question]}</Badge>
            {question.obligatoire && <Badge variant="destructive">Obligatoire</Badge>}
          </div>
          <div className="flex items-center gap-1">
            {onMoveUp && (
              <Button variant="ghost" size="icon" onClick={onMoveUp}>
                <ChevronUp className="h-4 w-4" />
              </Button>
            )}
            {onMoveDown && (
              <Button variant="ghost" size="icon" onClick={onMoveDown}>
                <ChevronDown className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {!expanded && (
          <p className="text-sm text-muted-foreground mt-2 truncate">{question.question || "Question sans titre"}</p>
        )}
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Question</Label>
              <Textarea
                value={question.question}
                onChange={(e) => onUpdate({ ...question, question: e.target.value })}
                placeholder="Saisissez votre question..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Type de question</Label>
              <Select value={question.type_question} onValueChange={(v) => handleTypeChange(v as TypeQuestion)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_QUESTION_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Options pour choix unique/multiple */}
          {needsOptions && (
            <div className="space-y-2">
              <Label>Options de réponse</Label>
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={opt.label}
                      onChange={(e) => updateOption(idx, 'label', e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(idx)}
                      disabled={options.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addOption}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une option
                </Button>
              </div>
            </div>
          )}

          {/* Configuration matrice */}
          {isMatrice && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Lignes (éléments à évaluer)</Label>
                {matriceConfig.lignes.map((ligne, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={ligne}
                      onChange={(e) => updateMatriceLignes(idx, e.target.value)}
                      placeholder={`Ligne ${idx + 1}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newConfig = { ...matriceConfig, lignes: matriceConfig.lignes.filter((_, i) => i !== idx) };
                        setMatriceConfig(newConfig);
                        onUpdate({ ...question, options: newConfig });
                      }}
                      disabled={matriceConfig.lignes.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addMatriceLigne}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une ligne
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Colonnes (échelle)</Label>
                {matriceConfig.colonnes.map((col, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={col}
                      onChange={(e) => updateMatriceColonnes(idx, e.target.value)}
                      placeholder={`Colonne ${idx + 1}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const newConfig = { ...matriceConfig, colonnes: matriceConfig.colonnes.filter((_, i) => i !== idx) };
                        setMatriceConfig(newConfig);
                        onUpdate({ ...question, options: newConfig });
                      }}
                      disabled={matriceConfig.colonnes.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addMatriceColonne}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter une colonne
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2">
              <Switch
                checked={question.obligatoire}
                onCheckedChange={(checked) => onUpdate({ ...question, obligatoire: checked })}
              />
              <Label>Question obligatoire</Label>
            </div>

            {/* Condition d'affichage */}
            {previousQuestions.length > 0 && (
              <div className="flex items-center gap-2">
                <Label className="text-sm">Afficher si:</Label>
                <Select
                  value={question.condition_question_id || ""}
                  onValueChange={(v) => onUpdate({ 
                    ...question, 
                    condition_question_id: v || null,
                    condition_valeur: null 
                  })}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Toujours afficher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Toujours afficher</SelectItem>
                    {previousQuestions.map((q, i) => (
                      <SelectItem key={q.id || i} value={q.id || `temp_${i}`}>
                        Q{allQuestions.indexOf(q) + 1}: {q.question.slice(0, 30)}...
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
