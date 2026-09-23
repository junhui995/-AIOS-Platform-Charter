/**
 * Monitoring rule condition DSL.
 *
 * Grammar (Pratt parser, sandboxed — no `eval`, no dynamic property access).
 *
 *   expr      := or
 *   or        := and ( "||" and )*
 *   and       := equality ( "&&" equality )*
 *   equality  := relational ( ("=="|"!=") relational )*
 *   relational:= additive ( (">"|">="|"<"|"<=") additive )*
 *   additive  := multiplicative ( ("+"|"-") multiplicative )*
 *   multiplicative := unary ( ("*"|"/"|"%") unary )*
 *   unary     := ("!"|"-") unary | primary
 *   primary   := number | string | "true" | "false" | ident "(" args? ")" | "@"path | "(" expr ")"
 *   path      := ident ("." ident)*          // field reference
 *
 * Field references use `@fieldName` / `@object.subfield`. Comparison between
 * two dates is by epoch millis; strings compare lexically; booleans strictly.
 */

export type Cell = number | string | boolean | Date | null | undefined;

export class RuleEvalError extends Error {}

type TokenType = 'number' | 'string' | 'ident' | 'field' | 'op' | 'lparen' | 'rparen' | 'comma' | 'eof';

interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

const OPS = ['==', '!=', '>=', '<=', '&&', '||', '>', '<', '+', '-', '*', '/', '%', '!'];

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i += 1; continue; }
    if (ch === '(') { tokens.push({ type: 'lparen', value: ch, pos: i }); i += 1; continue; }
    if (ch === ')') { tokens.push({ type: 'rparen', value: ch, pos: i }); i += 1; continue; }
    if (ch === ',') { tokens.push({ type: 'comma', value: ch, pos: i }); i += 1; continue; }
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      let out = '';
      while (j < src.length && src[j] !== quote) {
        if (src[j] === '\\' && j + 1 < src.length) { out += src[j + 1]; j += 2; } else { out += src[j]; j += 1; }
      }
      if (j >= src.length) throw new RuleEvalError(`Unterminated string at ${i}`);
      tokens.push({ type: 'string', value: out, pos: i });
      i = j + 1;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (OPS.includes(two)) { tokens.push({ type: 'op', value: two, pos: i }); i += 2; continue; }
    if (OPS.includes(ch)) { tokens.push({ type: 'op', value: ch, pos: i }); i += 1; continue; }
    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j += 1;
      const raw = src.slice(i, j);
      if (Number.isNaN(Number(raw))) throw new RuleEvalError(`Invalid number "${raw}" at ${i}`);
      tokens.push({ type: 'number', value: raw, pos: i });
      i = j;
      continue;
    }
    if (/[A-Za-z_\u4e00-\u9fa5]/.test(ch)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_\u4e00-\u9fa5]/.test(src[j])) j += 1;
      tokens.push({ type: 'ident', value: src.slice(i, j), pos: i });
      i = j;
      continue;
    }
    if (ch === '@') {
      let j = i + 1;
      if (j >= src.length || !/[A-Za-z_\u4e00-\u9fa5]/.test(src[j])) {
        throw new RuleEvalError(`Expected field name after '@' at ${i}`);
      }
      while (j < src.length && /[A-Za-z0-9_.\u4e00-\u9fa5]/.test(src[j])) j += 1;
      tokens.push({ type: 'field', value: src.slice(i + 1, j), pos: i });
      i = j;
      continue;
    }
    throw new RuleEvalError(`Unexpected character "${ch}" at ${i}`);
  }
  tokens.push({ type: 'eof', value: '', pos: src.length });
  return tokens;
}

type Ast =
  | { kind: 'num'; value: number }
  | { kind: 'str'; value: string }
  | { kind: 'bool'; value: boolean }
  | { kind: 'nul' }
  | { kind: 'field'; path: string }
  | { kind: 'fn'; name: string; args: Ast[] }
  | { kind: 'un'; op: string; operand: Ast }
  | { kind: 'bin'; op: string; left: Ast; right: Ast };

const FUNCTIONS = new Set([
  'now', 'daysUntil', 'daysSince', 'date', 'int', 'string', 'len',
  'upper', 'lower', 'contains', 'startsWith', 'endsWith', 'abs', 'round',
]);

class Parser {
  tokens: Token[];
  pos = 0;
  constructor(tokens: Token[]) { this.tokens = tokens; }
  peek(): Token { return this.tokens[this.pos]; }
  next(): Token { const t = this.tokens[this.pos]; this.pos += 1; return t; }
  isOp(v: string): boolean { const t = this.peek(); return t.type === 'op' && t.value === v; }
  matchOp(v: string): boolean { if (this.isOp(v)) { this.pos += 1; return true; } return false; }

  parse(): Ast {
    const node = this.parseOr();
    const t = this.peek();
    if (t.type !== 'eof') throw new RuleEvalError(`Unexpected token "${t.value}" at ${t.pos}`);
    return node;
  }

  parseOr(): Ast {
    let left = this.parseAnd();
    while (this.matchOp('||')) left = { kind: 'bin', op: '||', left, right: this.parseAnd() };
    return left;
  }
  parseAnd(): Ast {
    let left = this.parseEquality();
    while (this.matchOp('&&')) left = { kind: 'bin', op: '&&', left, right: this.parseEquality() };
    return left;
  }
  parseEquality(): Ast {
    let left = this.parseRelational();
    for (;;) {
      if (this.matchOp('==')) left = { kind: 'bin', op: '==', left, right: this.parseRelational() };
      else if (this.matchOp('!=')) left = { kind: 'bin', op: '!=', left, right: this.parseRelational() };
      else return left;
    }
  }
  parseRelational(): Ast {
    let left = this.parseAdditive();
    for (;;) {
      if (this.isOp('>') || this.isOp('>=') || this.isOp('<') || this.isOp('<=')) {
        const op = this.next().value;
        left = { kind: 'bin', op, left, right: this.parseAdditive() };
      } else return left;
    }
  }
  parseAdditive(): Ast {
    let left = this.parseMultiplicative();
    for (;;) {
      if (this.isOp('+') || this.isOp('-')) {
        const op = this.next().value;
        left = { kind: 'bin', op, left, right: this.parseMultiplicative() };
      } else return left;
    }
  }
  parseMultiplicative(): Ast {
    let left = this.parseUnary();
    for (;;) {
      if (this.isOp('*') || this.isOp('/') || this.isOp('%')) {
        const op = this.next().value;
        left = { kind: 'bin', op, left, right: this.parseUnary() };
      } else return left;
    }
  }
  parseUnary(): Ast {
    if (this.isOp('!') || this.isOp('-')) {
      const op = this.next().value;
      return { kind: 'un', op, operand: this.parseUnary() };
    }
    return this.parsePrimary();
  }
  parsePrimary(): Ast {
    const t = this.peek();
    if (t.type === 'number') { this.next(); return { kind: 'num', value: Number(t.value) }; }
    if (t.type === 'string') { this.next(); return { kind: 'str', value: t.value }; }
    if (t.type === 'ident') {
      if (t.value === 'true') { this.next(); return { kind: 'bool', value: true }; }
      if (t.value === 'false') { this.next(); return { kind: 'bool', value: false }; }
      if (t.value === 'null') { this.next(); return { kind: 'nul' }; }
      this.next();
      if (this.peek().type !== 'lparen') throw new RuleEvalError(`Expected '(' after "${t.value}" at ${t.pos}`);
      this.next();
      const args: Ast[] = [];
      if (this.peek().type !== 'rparen') {
        args.push(this.parseOr());
        while (this.matchOp(',') || this.peek().type === 'comma') {
          if (this.peek().type === 'comma') this.next();
          args.push(this.parseOr());
        }
      }
      if (this.peek().type !== 'rparen') throw new RuleEvalError(`Expected ')' at ${this.peek().pos}`);
      this.next();
      if (!FUNCTIONS.has(t.value)) throw new RuleEvalError(`Unknown function "${t.value}"`);
      return { kind: 'fn', name: t.value, args };
    }
    if (t.type === 'field') { this.next(); return { kind: 'field', path: t.value }; }
    if (t.type === 'lparen') {
      this.next();
      const inner = this.parseOr();
      if (this.peek().type !== 'rparen') throw new RuleEvalError(`Expected ')' at ${this.peek().pos}`);
      this.next();
      return inner;
    }
    throw new RuleEvalError(`Unexpected token "${t.value}" at ${t.pos}`);
  }
}

function getPath(obj: unknown, path: string): Cell {
  if (obj == null || typeof obj !== 'object') return undefined;
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    if (!Object.prototype.hasOwnProperty.call(cur, part)) return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur as Cell;
}

function toNumeric(v: Cell): number {
  if (typeof v === 'number') return v;
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'string') {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d.getTime();
  }
  if (typeof v === 'boolean') return v ? 1 : 0;
  throw new RuleEvalError(`Cannot coerce "${String(v)}" to number`);
}

function toDate(v: Cell): Date {
  if (v instanceof Date) return v;
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  throw new RuleEvalError(`Cannot coerce "${String(v)}" to date`);
}

function evalNode(node: Ast, env: Record<string, unknown>, nowMs: number): Cell {
  switch (node.kind) {
    case 'num': return node.value;
    case 'str': return node.value;
    case 'bool': return node.value;
    case 'nul': return null;
    case 'field': return getPath(env, node.path);
    case 'fn': return evalFn(node.name, node.args, env, nowMs);
    case 'un': {
      if (node.op === '!') return !truthy(evalNode(node.operand, env, nowMs));
      if (node.op === '-') return -toNumeric(evalNode(node.operand, env, nowMs));
      throw new RuleEvalError(`Unknown unary "${node.op}"`);
    }
    case 'bin': {
      const l = evalNode(node.left, env, nowMs);
      const r = evalNode(node.right, env, nowMs);
      switch (node.op) {
        case '&&': return truthy(l) ? truthy(evalNode(node.right, env, nowMs)) : false;
        case '||': return truthy(l) ? true : truthy(evalNode(node.right, env, nowMs));
        case '==': return compareEq(l, r);
        case '!=': return !compareEq(l, r);
        case '>': return compare(l, r) > 0;
        case '>=': return compare(l, r) >= 0;
        case '<': return compare(l, r) < 0;
        case '<=': return compare(l, r) <= 0;
        case '+': return add(l, r);
        case '-': return subtract(l, r);
        case '*': return toNumeric(l) * toNumeric(r);
        case '/': {
          const d = toNumeric(r);
          if (d === 0) throw new RuleEvalError('Division by zero');
          return toNumeric(l) / d;
        }
        case '%': return toNumeric(l) % toNumeric(r);
        default: throw new RuleEvalError(`Unknown binary "${node.op}"`);
      }
    }
  }
}

function add(l: Cell, r: Cell): number | string {
  if (typeof l === 'string' || typeof r === 'string') return `${stringOf(l)}${stringOf(r)}`;
  return toNumeric(l) + toNumeric(r);
}
function subtract(l: Cell, r: Cell): number { return toNumeric(l) - toNumeric(r); }

function compareEq(l: Cell, r: Cell): boolean {
  if (l == null && r == null) return true;
  if (l instanceof Date && r instanceof Date) return l.getTime() === r.getTime();
  if (l instanceof Date) return l.getTime() === toNumeric(r);
  if (r instanceof Date) return toNumeric(l) === r.getTime();
  return l === r;
}
function compare(l: Cell, r: Cell): number {
  if (l instanceof Date && r instanceof Date) return l.getTime() - r.getTime();
  if (l instanceof Date || r instanceof Date) return toNumeric(l) - toNumeric(r);
  if (typeof l === 'number' && typeof r === 'number') return l - r;
  if (typeof l === 'string' && typeof r === 'string') return l < r ? -1 : l > r ? 1 : 0;
  return toNumeric(l) - toNumeric(r);
}
function truthy(v: Cell): boolean {
  if (v == null) return false;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v.length > 0;
  return true;
}
function stringOf(v: Cell): string {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

function evalFn(name: string, args: Ast[], env: Record<string, unknown>, nowMs: number): Cell {
  const val = (i: number): Cell => evalNode(args[i], env, nowMs);
  switch (name) {
    case 'now': return new Date(nowMs);
    case 'daysUntil': return Math.ceil((toDate(val(0)).getTime() - nowMs) / 86400000);
    case 'daysSince': return Math.floor((nowMs - toDate(val(0)).getTime()) / 86400000);
    case 'date': return toDate(val(0));
    case 'int': return Math.trunc(toNumeric(val(0)));
    case 'string': return stringOf(val(0));
    case 'len': {
      const v = val(0);
      return v == null ? 0 : String(v).length;
    }
    case 'upper': return stringOf(val(0)).toUpperCase();
    case 'lower': return stringOf(val(0)).toLowerCase();
    case 'abs': return Math.abs(toNumeric(val(0)));
    case 'round': return Math.round(toNumeric(val(0)));
    case 'contains': return stringOf(val(0)).includes(stringOf(val(1)));
    case 'startsWith': return stringOf(val(0)).startsWith(stringOf(val(1)));
    case 'endsWith': return stringOf(val(0)).endsWith(stringOf(val(1)));
    default: throw new RuleEvalError(`Unknown function "${name}"`);
  }
}

export interface ParseResult { ok: boolean; error?: string }

export function parseCondition(expr: string): ParseResult {
  try {
    const parser = new Parser(tokenize(expr));
    parser.parse();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface FieldScanResult {
  ok: boolean;
  error?: string;
  fields: string[];
}

/**
 * Parses a condition and returns every `@field` / `@object.field` reference
 * it reads. Used to enforce the Registry whitelist at rule authoring time,
 * so a rule can never silently reference an undeclared field.
 */
export function collectConditionFields(expr: string): FieldScanResult {
  try {
    const parser = new Parser(tokenize(expr));
    const ast = parser.parse();
    const fields = new Set<string>();
    const walk = (node: Ast): void => {
      if (node.kind === 'field') fields.add(node.path);
      else if (node.kind === 'fn') node.args.forEach(walk);
      else if (node.kind === 'un') walk(node.operand);
      else if (node.kind === 'bin') { walk(node.left); walk(node.right); }
    };
    walk(ast);
    return { ok: true, fields: [...fields] };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err), fields: [] };
  }
}

export function compileCondition(expr: string): (env: Record<string, unknown>) => boolean {
  const parser = new Parser(tokenize(expr));
  const ast = parser.parse();
  return (env: Record<string, unknown>) => {
    const res = evalNode(ast, env, Date.now());
    return truthy(res);
  };
}

export function evaluateCondition(expr: string, env: Record<string, unknown>, nowMs?: number): boolean {
  const parser = new Parser(tokenize(expr));
  const ast = parser.parse();
  return truthy(evalNode(ast, env, nowMs ?? Date.now()));
}

/** Interpolate {{field.path}} placeholders in a message template. */
export function renderTemplate(template: string, env: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([A-Za-z0-9_.\u4e00-\u9fa5]+)\s*\}\}/g, (_m, key: string) => {
    const v = getPath(env, key);
    return stringOf(v) || `{{${key}}}`;
  });
}

export { getPath, stringOf };