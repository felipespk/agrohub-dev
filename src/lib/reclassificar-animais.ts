import { supabase } from "@/integrations/supabase/client";

export async function reclassificarAnimais(userId: string): Promise<number> {
  // Fetch user settings
  const { data: profile } = await supabase
    .from("profiles")
    .select("idade_bezerro_meses, idade_jovem_meses, reclassificacao_automatica, momento_troca_brinco")
    .eq("user_id", userId)
    .single();

  if (!profile) return 0;

  const auto = (profile as any).reclassificacao_automatica;
  if (auto === false) return 0;

  const idadeBezerro = (profile as any).idade_bezerro_meses ?? 8;
  const idadeJovem = (profile as any).idade_jovem_meses ?? 24;
  const momentoTroca: "desmame" | "adulto" = (profile as any).momento_troca_brinco ?? "adulto";

  // Fetch active animals with birth date
  const { data: animais } = await supabase
    .from("animais" as any)
    .select("id, sexo, categoria, data_nascimento, brinco, mae_brinco, origem, precisa_trocar_brinco")
    .eq("user_id", userId)
    .eq("status", "ativo")
    .not("data_nascimento", "is", null);

  if (!animais || animais.length === 0) return 0;

  const now = Date.now();
  let count = 0;

  // Categorias "antes" do alerta
  const CAT_BEZERRO = new Set(["bezerro", "bezerra"]);
  const CAT_JOVEM = new Set(["garrote", "novilha"]);

  for (const animal of animais as any[]) {
    // Never reclassify touros
    if (animal.categoria === "touro") continue;

    const nascimento = new Date(animal.data_nascimento + "T12:00:00").getTime();
    const idadeMeses = (now - nascimento) / (30.44 * 24 * 60 * 60 * 1000);

    let novaCategoria: string;

    if (idadeMeses < idadeBezerro) {
      novaCategoria = animal.sexo === "macho" ? "bezerro" : "bezerra";
    } else if (idadeMeses < idadeJovem) {
      novaCategoria = animal.sexo === "macho" ? "garrote" : "novilha";
    } else {
      novaCategoria = animal.sexo === "macho" ? "boi" : "vaca";
    }

    if (novaCategoria !== animal.categoria) {
      const updates: any = {
        categoria: novaCategoria,
        categoria_atualizada_em: new Date().toISOString(),
      };

      // Detecta se precisa marcar alerta de troca de brinco.
      // Só marca para nascidos na fazenda que ainda compartilham o brinco com a mãe.
      const nascido = animal.origem === "nascido";
      const compartilhaBrincoComMae =
        nascido && animal.mae_brinco && animal.brinco === animal.mae_brinco;

      if (compartilhaBrincoComMae && !animal.precisa_trocar_brinco) {
        let deveAlertar = false;
        if (momentoTroca === "desmame") {
          // Bezerro/bezerra → garrote/novilha (saiu da fase bezerro)
          if (CAT_BEZERRO.has(animal.categoria) && !CAT_BEZERRO.has(novaCategoria)) {
            deveAlertar = true;
          }
        } else {
          // adulto: virou boi/vaca
          if (novaCategoria === "boi" || novaCategoria === "vaca") {
            deveAlertar = true;
          }
        }
        if (deveAlertar) updates.precisa_trocar_brinco = true;
      }

      await supabase
        .from("animais" as any)
        .update(updates as any)
        .eq("id", animal.id);
      count++;
    }
  }

  return count;
}
