export class TemplateEngine {
  private static readonly PLACEHOLDER_RE = /\{\{(\w+)\}\}/g;

  static render(template: string, variables: Record<string, string>): string {
    return template.replace(this.PLACEHOLDER_RE, (match, key) => {
      return variables[key] ?? match;
    });
  }

  static getDefaultVariables(title: string): Record<string, string> {
    const now = new Date();
    return {
      title,
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 5),
      datetime: now.toISOString().slice(0, 16).replace('T', ' '),
    };
  }
}
