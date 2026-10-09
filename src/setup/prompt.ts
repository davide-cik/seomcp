import { createInterface, type Interface } from 'node:readline/promises';
import { Writable } from 'node:stream';

/**
 * Domande da terminale. Tutto passa da stderr, come il resto della CLI,
 * e le chiavi si digitano senza che compaiano a schermo.
 */
export class Prompter {
  private muted = false;
  private readonly rl: Interface;

  constructor(
    input: NodeJS.ReadableStream = process.stdin,
    private readonly out: NodeJS.WritableStream = process.stderr,
  ) {
    const self = this;
    const output = new Writable({
      write(chunk, encoding, cb) {
        if (!self.muted) out.write(chunk, encoding);
        cb();
      },
    });
    this.rl = createInterface({ input, output, terminal: Boolean((input as { isTTY?: boolean }).isTTY) });
  }

  say(msg = ''): void {
    this.out.write(`${msg}\n`);
  }

  async ask(question: string, def?: string): Promise<string> {
    const answer = (await this.rl.question(`${question}${def ? ` [${def}]` : ''} `)).trim();
    return answer || def || '';
  }

  /** Per chiavi e segreti: il testo digitato o incollato non compare. */
  async askSecret(question: string): Promise<string> {
    this.out.write(`${question} (non viene mostrata) `);
    this.muted = true;
    try {
      return (await this.rl.question('')).trim();
    } finally {
      this.muted = false;
      this.out.write('\n');
    }
  }

  async confirm(question: string, def = true): Promise<boolean> {
    const answer = (await this.ask(`${question} ${def ? '[S/n]' : '[s/N]'}`)).toLowerCase();
    if (!answer) return def;
    return answer.startsWith('s') || answer.startsWith('y');
  }

  /** Scelta da un elenco numerato. Restituisce l'indice, oppure -1 se l'utente preme solo Invio e c'è un'opzione di uscita. */
  async choose(question: string, options: string[], emptyLabel?: string): Promise<number> {
    this.say(question);
    options.forEach((o, i) => this.say(`  ${i + 1}) ${o}`));
    for (;;) {
      const answer = await this.ask(emptyLabel ? `Numero (Invio = ${emptyLabel}):` : 'Numero:');
      if (!answer && emptyLabel) return -1;
      const n = Number(answer);
      if (Number.isInteger(n) && n >= 1 && n <= options.length) return n - 1;
      this.say(`Scrivi un numero da 1 a ${options.length}.`);
    }
  }

  /** Scelta multipla: numeri separati da virgola o spazio. */
  async chooseMany(question: string, options: string[]): Promise<number[]> {
    this.say(question);
    options.forEach((o, i) => this.say(`  ${i + 1}) ${o}`));
    for (;;) {
      const answer = await this.ask('Numeri separati da virgola (Invio = nessuno):');
      if (!answer) return [];
      const nums = answer.split(/[\s,]+/).filter(Boolean).map(Number);
      if (nums.every((n) => Number.isInteger(n) && n >= 1 && n <= options.length)) return [...new Set(nums.map((n) => n - 1))];
      this.say(`Usa numeri da 1 a ${options.length}, per esempio 1,3.`);
    }
  }

  close(): void {
    this.rl.close();
  }
}
