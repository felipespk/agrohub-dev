import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Database, Trash2 } from "lucide-react";

interface Props {
  showLoad: boolean;
  showClean: boolean;
  loadLabel?: string;
  loadConfirmMsg: string;
  onLoad: () => Promise<void>;
  onClean: () => Promise<void>;
}

export default function ExampleDataButtons({ showLoad, showClean, loadLabel = "Carregar Dados de Exemplo", loadConfirmMsg, onLoad, onClean }: Props) {
  const [confirmLoad, setConfirmLoad] = useState(false);
  const [confirmClean, setConfirmClean] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLoad = async () => {
    setConfirmLoad(false);
    setLoading(true);
    try { await onLoad(); } finally { setLoading(false); }
  };

  const handleClean = async () => {
    setConfirmClean(false);
    setLoading(true);
    try { await onClean(); } finally { setLoading(false); }
  };

  if (!showLoad && !showClean) return null;

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {showLoad && (
          <Button variant="outline" className="border-dashed gap-2" onClick={() => setConfirmLoad(true)} disabled={loading}>
            <Database className="h-4 w-4" /> {loadLabel}
          </Button>
        )}
        {showClean && (
          <Button variant="outline" className="border-dashed gap-2 text-red-600 border-red-300 hover:bg-red-50" onClick={() => setConfirmClean(true)} disabled={loading}>
            <Trash2 className="h-4 w-4" /> Limpar Exemplos
          </Button>
        )}
      </div>

      <AlertDialog open={confirmLoad} onOpenChange={setConfirmLoad}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Carregar dados de exemplo?</AlertDialogTitle>
            <AlertDialogDescription>{loadConfirmMsg}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={handleLoad}>Sim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmClean} onOpenChange={setConfirmClean}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar dados de exemplo?</AlertDialogTitle>
            <AlertDialogDescription>Isso removerá apenas os dados de exemplo, sem afetar dados reais.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={handleClean} className="bg-red-600 hover:bg-red-700">Sim, limpar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
