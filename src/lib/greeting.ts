export function getGreeting(displayName?: string | null, email?: string | null): { greeting: string; subtitle: string } {
  const hour = new Date().getHours();
  let timeGreeting: string;
  if (hour < 12) timeGreeting = "Bom dia";
  else if (hour < 18) timeGreeting = "Boa tarde";
  else timeGreeting = "Boa noite";

  const name = displayName || email?.split("@")[0] || "";
  const firstName = name.split(" ")[0] || name;
  const capitalized = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  return {
    greeting: `${timeGreeting}, ${capitalized}!`,
    subtitle: "",
  };
}
