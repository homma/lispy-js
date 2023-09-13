/** A Lisp Symbol is implemented as a JavaScript string */
const symbol = "string";

/** A Lisp Number is implemented as a JavaScript number */
const number = "number";

/**
 * An environment: a dict of {'var': val} pairs, with an outer Env.
 */
class Env extends Map {
  outer;

  constructor(parms = [], args = [], outer = null) {
    super();

    parms.forEach((v, i) => this.set(v, args[i]));
    this.outer = outer;
  }
}

/**
 * Find the innermost Env where variable appears.
 */
Env.prototype.find = function (variable) {
  return this.has(variable) ? this : this.outer.find(variable);
};

Env.prototype.update = function (obj) {
  for (let key of Object.keys(obj)) {
    this.set(key, obj[key]);
  }
};

/**
 * A user-defined Scheme procedure.
 */
class Procedure {
  parms;
  body;
  env;

  constructor(parms, body, env) {
    this.parms = parms;
    this.body = body;
    this.env = env;

    const call = function (...args) {
      return run(body, new Env(parms, args, env));
    };
    return call;
  }
}

/**
 * Convert a string of characters into a list of tokens.
 *
 * @param { String } chars - lisp code
 * @return { String[] }
 */
const tokenize = (chars) => {
  return chars
    .replaceAll("(", " ( ")
    .replaceAll(")", " ) ")
    .trim()
    .split(/\s+/);
};

const test1 = () => {
  const program = "(begin (define r 10) (* pi (* r r)))";
  console.log(tokenize(program));
};

// test1();

/**
 * Read a Scheme expression from a string.
 */
const parse = (program) => {
  return read_from_tokens(tokenize(program));
};

/**
 * Read an expression from a sequence of tokens.
 */
const read_from_tokens = (tokens) => {
  if (tokens.length == 0) {
    throw new Error("unexpected EOF");
  }

  let token = tokens.shift();

  if (token == "(") {
    let L = [];
    while (tokens[0] != ")") {
      L.push(read_from_tokens(tokens));
    }
    tokens.shift();
    return L;
  } else if (token == ")") {
    throw new Error("unexpected )");
  } else {
    return atom(token);
  }
};

/**
 * Number become numbers; every other token is a symbol.
 */
const atom = (token) => {
  let parsed = parseFloat(token);
  if (!isNaN(parsed)) {
    return parsed;
  }

  parsed = parseInt(token);
  if (!isNaN(parsed)) {
    return parsed;
  }

  // typeof String() == 'string' while typeof new String() == 'object'
  // we use String() here
  return String(token);
};

const test2 = () => {
  const program = "(begin (define r 10) (* pi (* r r)))";
  console.log(parse(program));
};

// test2();

/**
 * An environment with some Scheme standard procedures.
 */
const standard_env = () => {
  const env = new Env();

  for (let key of Object.getOwnPropertyNames(Math)) {
    env.set(key, Math[key]);
  }

  const procedures = {
    "+": (x, y) => x + y,
    "-": (x, y) => x - y,
    "*": (x, y) => x * y,
    "/": (x, y) => x / y,
    ">": (x, y) => x > y,
    "<": (x, y) => x < y,
    ">=": (x, y) => x >= y,
    "<=": (x, y) => x <= y,
    "=": (x, y) => x == y,
    append: (x, y) => x.concat(y),
    apply: (proc, args) => proc(...args),
    begin: (...x) => x[x.length - 1],
    car: (x) => x[0],
    cdr: (x) => x.slice(1),
    cons: (x, y) => [x].concat(y),
    "eq?": (x, y) => Object.is(x, y),
    expt: Math.exp,
    // should be fiexed.
    "equal?": (x, y) => JSON.stringify(x) == JSON.stringify(y),
    length: (x) => x.length,
    list: (...x) => x,
    "list?": (x) => Array.isArray(x),
    map: (fn, lst) => lst.map(fn),
    // max: already in Math
    // min: already in Math
    not: (x) => !x,
    "null?": (x) => Array.isArray(x) && x.length == 0,
    "number?": (x) => typeof x == "number",
    print: (x) => console.log(x),
    "procedure?": (x) => typeof x == "function",
    // round: already in Math
    "symbol?": (x) => typeof x == "symbol",
    pi: Math.PI,
  };

  env.update(procedures);

  return env;
};

const global_env = standard_env();

const test4 = () => {
  console.log(global_env);
};

// test4()

/**
 * Evaluate an expression in an environment.
 */
const run = (x, env = global_env) => {
  // we cannot override eval in JavaScript hence use `run` instead

  if (typeof x == symbol) {
    return env.find(x).get(x);
  } else if (!Array.isArray(x)) {
    // constant
    return x;
  }

  const [op, ...args] = x;

  if (op == "quote") {
    return args[0];
  } else if (op == "if") {
    const [test, conseq, alt] = args;
    const exp = run(test, env) ? conseq : alt;
    return run(exp, env);
  } else if (op == "define") {
    const [sym, exp] = args;
    env.set(sym, run(exp, env));
  } else if (op == "set!") {
    const [sym, exp] = args;
    env.find(sym).set(sym, run(exp, env));
  } else if (op == "lambda") {
    const [parms, body] = args;
    return new Procedure(parms, body, env);
  } else {
    const proc = run(op, env);
    const vals = args.map((arg) => run(arg, env));
    return proc(...vals);
  }
};

const test5 = () => {
  const program = "(begin (define r 10) (* pi (* r r)))";

  console.log(run(parse(program)));
};

// test5();

import process from "node:process";
import readline from "node:readline";

/**
 * A prompt-read-run-print loop.
 */
const repl = (prompt = "lispy> ") => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: prompt,
  });

  rl.prompt();

  rl.on("line", (line) => {
    let val = run(parse(line));
    if (val != null) {
      console.log(schemestr(val));
    }
    rl.prompt();
  }).on("close", () => {
    process.exit(0);
  });
};

/**
 * Convert a Python object back into a Scheme-readable string.
 */
const schemestr = (exp) => {
  if (Array.isArray(exp)) {
    return `(${exp.map((v) => schemestr(v)).join(" ")})`;
  } else {
    return String(exp);
  }
};

repl();

const test6 = () => {
  const program1 = `(define make-account (lambda (balance) (lambda (amt) (begin (set! balance (+ balance amt)) balance))))`;
  const program2 = `(define account1 (make-account 100.00))`;
  const program3 = `(account1 -20.00)`;

  console.log(run(parse(program)));
};

// test6();
