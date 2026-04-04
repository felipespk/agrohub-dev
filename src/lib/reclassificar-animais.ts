import { supabase } from "@/integrations/supabase/client";

export async function reclassificarAnimais(userId: string): Promise<number> {
  // Fetch user settings
  const { data: profile } = await supabase
    .from("profiles")
    .select("idade_bezerro_meses, idade_jovem_meses, reclassificacao_automatica")
    .eq("user_id", userId)
    .single();

  if (!profile) return 0;

  const auto = (profile as any).reclassificacao_automatica;
  if (auto === false) return 0;

  const idadeBezerro = (profile as any).idade_bezerro_meses ?? 8;
  const idadeJovem = (profile as any).idade_jovem_meses ?? 24;

  // Fetch active animals with birth date
  const { data: animais } = await supabase
    .from("animais" as any)
    .select("id, sexo, categoria, data_nascimento")
    .eq("user_id", userId)
    .eq("status", "ativo")
    .not("data_nascimento", "is", null);

  if (!animais || animais.length === 0) return 0;

  const now = Date.now();
  let count = 0;

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
      await supabase
        .from("animais" as any)
        .update({ categoria: novaCategoria, categoria_atualizada_em: new Date().toISOString() } as any)
        .eq("id", animal.id);
      count++;
    }
  }

  return count;
}
