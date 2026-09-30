async function loadSession() {
  const status = document.getElementById("status");
  try {
    const response = await fetch("/api/me", { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) {
      status.textContent = "Nenhuma sessão neste navegador.";
      return;
    }
    const user = await response.json();
    status.textContent = `Sessão de ${user.email ?? user.displayName ?? "usuário autenticado"}.`;
  } catch {
    status.textContent = "Não foi possível consultar a sessão.";
  }
}
loadSession();
