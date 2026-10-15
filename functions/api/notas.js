// GET /api/notas?aluno=Nome
// Lista as notas de um aluno na tabela notas (D1).
export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const nome = url.searchParams.get("aluno") || "";
  if (!nome) {
    return Response.json({ erro: "Informe o parametro aluno." }, { status: 400 });
  }
  const { results } = await context.env.DB
    .prepare(`SELECT * FROM notas WHERE aluno = '${nome}'`)
    .all();
  return Response.json({ aluno: nome, notas: results });
}
