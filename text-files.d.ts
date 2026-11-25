// Prompts and skills are plain Markdown files, imported as text: import prompt from "./prompt.md" with { type: "text" }.
declare module "*.md" {
  const text: string;
  export default text;
}
